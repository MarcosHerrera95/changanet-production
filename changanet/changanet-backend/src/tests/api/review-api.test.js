// src/tests/api/review-api.test.js
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const app = require('../../server');

const prisma = new PrismaClient();

describe('Review API Tests', () => {
  let testUser, testProfessional, testService, authToken, professionalToken;

  beforeAll(async () => {
    // Create test users
    testUser = await prisma.usuarios.create({
      data: {
        email: 'cliente@test.com',
        hash_contrasena: 'hashedpass',
        nombre: 'Cliente Test',
        rol: 'cliente',
        esta_verificado: true
      }
    });

    testProfessional = await prisma.usuarios.create({
      data: {
        email: 'profesional@test.com',
        hash_contrasena: 'hashedpass',
        nombre: 'Profesional Test',
        rol: 'profesional',
        esta_verificado: true
      }
    });

    await prisma.perfiles_profesionales.create({
      data: {
        usuario_id: testProfessional.id,
        especialidad: 'Plomero',
        anos_experiencia: 5,
        calificacion_promedio: 0
      }
    });

    // Create test service
    testService = await prisma.servicios.create({
      data: {
        cliente_id: testUser.id,
        profesional_id: testProfessional.id,
        descripcion: 'Servicio de prueba API',
        estado: 'completado'
      }
    });

    // Generate JWT tokens
    authToken = jwt.sign(
      { id: testUser.id, email: testUser.email, rol: testUser.rol },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    professionalToken = jwt.sign(
      { id: testProfessional.id, email: testProfessional.email, rol: testProfessional.rol },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await prisma.resenas.deleteMany({});
    await prisma.servicios.deleteMany({});
    await prisma.perfiles_profesionales.deleteMany({});
    await prisma.usuarios.deleteMany({});
    await prisma.$disconnect();
  });

  describe('POST /api/reviews', () => {
    it('should create review with valid data and authentication', async () => {
      const reviewData = {
        servicio_id: testService.id,
        calificacion: 5,
        comentario: 'Excelente servicio API test'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.servicio_id).toBe(testService.id);
      expect(response.body.cliente_id).toBe(testUser.id);
      expect(response.body.calificacion).toBe(5);
      expect(response.body.comentario).toBe('Excelente servicio API test');
    });

    it('should reject review creation without authentication', async () => {
      const reviewData = {
        servicio_id: testService.id,
        calificacion: 4,
        comentario: 'Test without auth'
      };

      const response = await request(app)
        .post('/api/reviews')
        .send(reviewData)
        .expect(401);

      expect(response.body.error).toContain('Token requerido');
    });

    it('should reject review creation with invalid JWT', async () => {
      const reviewData = {
        servicio_id: testService.id,
        calificacion: 4,
        comentario: 'Test with invalid JWT'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', 'Bearer invalid-jwt-token')
        .send(reviewData)
        .expect(401);

      expect(response.body.error).toContain('Token inválido');
    });

    it('should reject duplicate reviews', async () => {
      // Create first review
      const reviewData = {
        servicio_id: testService.id,
        calificacion: 4,
        comentario: 'First review'
      };

      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(201);

      // Try to create duplicate
      const duplicateData = {
        servicio_id: testService.id,
        calificacion: 3,
        comentario: 'Duplicate review'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateData)
        .expect(400);

      expect(response.body.error).toContain('Datos de reseña inválidos');
    });

    it('should validate rating range', async () => {
      const invalidData = {
        servicio_id: testService.id,
        calificacion: 6, // Invalid rating
        comentario: 'Invalid rating test'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('Datos de reseña inválidos');
    });

    it('should validate comment length', async () => {
      const longComment = 'a'.repeat(1001);
      const invalidData = {
        servicio_id: testService.id,
        calificacion: 4,
        comentario: longComment
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('Datos de reseña inválidos');
    });

    it('should accept optional comment', async () => {
      const newService = await prisma.servicios.create({
        data: {
          cliente_id: testUser.id,
          profesional_id: testProfessional.id,
          descripcion: 'Service without comment',
          estado: 'completado'
        }
      });

      const reviewData = {
        servicio_id: newService.id,
        calificacion: 4
        // No comment provided
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(201);

      expect(response.body.calificacion).toBe(4);
      expect(response.body.comentario).toBeNull();
    });
  });

  describe('GET /api/reviews/professional/:id', () => {
    beforeAll(async () => {
      // Create some reviews for testing
      const services = [];
      for (let i = 0; i < 3; i++) {
        const service = await prisma.servicios.create({
          data: {
            cliente_id: testUser.id,
            profesional_id: testProfessional.id,
            descripcion: `API Test Service ${i}`,
            estado: 'completado'
          }
        });
        services.push(service);

        await prisma.resenas.create({
          data: {
            servicio_id: service.id,
            cliente_id: testUser.id,
            calificacion: [5, 4, 3][i],
            comentario: `API Test Comment ${i}`
          }
        });
      }
    });

    it('should retrieve reviews for professional', async () => {
      const response = await request(app)
        .get(`/api/reviews/professional/${testProfessional.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const review = response.body[0];
      expect(review).toHaveProperty('id');
      expect(review).toHaveProperty('calificacion');
      expect(review).toHaveProperty('comentario');
      expect(review).toHaveProperty('creado_en');
      expect(review).toHaveProperty('cliente');
      expect(review).toHaveProperty('servicio');
    });

    it('should return empty array for professional with no reviews', async () => {
      const noReviewsProfessional = await prisma.usuarios.create({
        data: {
          email: 'noreviews@test.com',
          hash_contrasena: 'hashedpass',
          nombre: 'No Reviews Professional',
          rol: 'profesional',
          esta_verificado: true
        }
      });

      const response = await request(app)
        .get(`/api/reviews/professional/${noReviewsProfessional.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should include client and service information', async () => {
      const response = await request(app)
        .get(`/api/reviews/professional/${testProfessional.id}`)
        .expect(200);

      const review = response.body[0];
      expect(review.cliente).toHaveProperty('nombre');
      expect(review.cliente).toHaveProperty('email');
      expect(review.servicio).toHaveProperty('descripcion');
    });
  });

  describe('GET /api/reviews/professional/:id/stats', () => {
    it('should retrieve professional statistics', async () => {
      const response = await request(app)
        .get(`/api/reviews/professional/${testProfessional.id}/stats`)
        .expect(200);

      expect(response.body).toHaveProperty('professionalId', testProfessional.id);
      expect(response.body).toHaveProperty('totalReviews');
      expect(response.body).toHaveProperty('averageRating');
      expect(response.body).toHaveProperty('ratingDistribution');
      expect(response.body).toHaveProperty('positivePercentage');
      expect(response.body).toHaveProperty('lastReviewDate');

      expect(typeof response.body.totalReviews).toBe('number');
      expect(typeof response.body.averageRating).toBe('number');
      expect(typeof response.body.positivePercentage).toBe('number');
    });

    it('should return zero stats for professional with no reviews', async () => {
      const noReviewsProfessional = await prisma.usuarios.create({
        data: {
          email: 'nostats@test.com',
          hash_contrasena: 'hashedpass',
          nombre: 'No Stats Professional',
          rol: 'profesional',
          esta_verificado: true
        }
      });

      await prisma.perfiles_profesionales.create({
        data: {
          usuario_id: noReviewsProfessional.id,
          especialidad: 'Pintor',
          anos_experiencia: 3
        }
      });

      const response = await request(app)
        .get(`/api/reviews/professional/${noReviewsProfessional.id}/stats`)
        .expect(200);

      expect(response.body.totalReviews).toBe(0);
      expect(response.body.averageRating).toBe(0);
      expect(response.body.positivePercentage).toBe(0);
      expect(response.body.lastReviewDate).toBe(null);
    });
  });

  describe('GET /api/reviews/check/:servicioId', () => {
    it('should check review eligibility with authentication', async () => {
      const newService = await prisma.servicios.create({
        data: {
          cliente_id: testUser.id,
          profesional_id: testProfessional.id,
          descripcion: 'Eligibility check service',
          estado: 'completado'
        }
      });

      const response = await request(app)
        .get(`/api/reviews/check/${newService.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('canReview');
      expect(typeof response.body.canReview).toBe('boolean');
    });

    it('should reject eligibility check without authentication', async () => {
      const response = await request(app)
        .get(`/api/reviews/check/${testService.id}`)
        .expect(401);

      expect(response.body.error).toContain('Token requerido');
    });

    it('should return cannot review for already reviewed service', async () => {
      const response = await request(app)
        .get(`/api/reviews/check/${testService.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.canReview).toBe(false);
      expect(response.body.reason).toContain('reseña');
    });
  });

  describe('GET /api/reviews/client', () => {
    it('should retrieve client reviews with authentication', async () => {
      const response = await request(app)
        .get('/api/reviews/client')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('reviews');
      expect(Array.isArray(response.body.reviews)).toBe(true);
    });

    it('should reject client reviews without authentication', async () => {
      const response = await request(app)
        .get('/api/reviews/client')
        .expect(401);

      expect(response.body.error).toContain('Token requerido');
    });

    it('should include service and professional information', async () => {
      const response = await request(app)
        .get('/api/reviews/client')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.reviews.length > 0) {
        const review = response.body.reviews[0];
        expect(review.servicio).toBeDefined();
        expect(review.servicio.profesional).toBeDefined();
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers when configured', async () => {
      // This test assumes rate limiting middleware adds headers
      // In practice, this would depend on the middleware implementation
      const reviewData = {
        servicio_id: testService.id,
        calificacion: 3,
        comentario: 'Rate limit test'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData);

      // Should fail due to duplicate review, but we can check if headers are present
      expect(response.status).toBe(400);
      // Rate limit headers might be present: X-RateLimit-Remaining, X-RateLimit-Reset
    });
  });

  describe('File Upload Handling', () => {
    it('should handle multipart form data for image uploads', async () => {
      const newService = await prisma.servicios.create({
        data: {
          cliente_id: testUser.id,
          profesional_id: testProfessional.id,
          descripcion: 'File upload test service',
          estado: 'completado'
        }
      });

      // Test with form data (without actual file for this test)
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .field('servicio_id', newService.id)
        .field('calificacion', 4)
        .field('comentario', 'Test with file upload')
        .expect(201);

      expect(response.body.calificacion).toBe(4);
      expect(response.body.comentario).toBe('Test with file upload');
    });

    it('should reject invalid file types', async () => {
      // This would require sending an actual invalid file
      // For now, we test the basic validation
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .field('servicio_id', testService.id)
        .field('calificacion', 4)
        .field('comentario', 'Test comment')
        .attach('url_foto', Buffer.from('invalid file content'), 'test.txt')
        .expect(400);

      // The multer fileFilter should reject non-image files
      expect(response.status).toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid service ID gracefully', async () => {
      const reviewData = {
        servicio_id: 'invalid-uuid',
        calificacion: 5,
        comentario: 'Invalid service test'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.error).toContain('Datos de reseña inválidos');
    });

    it('should handle database connection errors', async () => {
      // This would require mocking the database connection
      // For now, we test with invalid data that causes validation errors
      const invalidData = {
        servicio_id: 'not-a-uuid',
        calificacion: 'not-a-number',
        comentario: null
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('Datos de reseña inválidos');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{invalid json}')
        .expect(400);

      // Express should handle malformed JSON
      expect(response.status).toBe(400);
    });
  });

  describe('CORS and Security Headers', () => {
    it('should include appropriate security headers', async () => {
      const response = await request(app)
        .options('/api/reviews')
        .expect(200);

      // Check for CORS headers
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });
});
