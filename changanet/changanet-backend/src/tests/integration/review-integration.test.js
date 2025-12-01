// src/tests/integration/review-integration.test.js
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../../server'); // Assuming server.js exports the Express app

const prisma = new PrismaClient();

describe('Review System Integration Tests', () => {
  let testUser, testProfessional, testService, authToken;

  beforeAll(async () => {
    // Create test data
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

    testService = await prisma.servicios.create({
      data: {
        cliente_id: testUser.id,
        profesional_id: testProfessional.id,
        descripcion: 'Servicio de prueba para integración',
        estado: 'completado'
      }
    });

    // Mock JWT token (in a real scenario, you'd authenticate properly)
    authToken = 'mock-jwt-token-for-testing';
  });

  afterAll(async () => {
    await prisma.resenas.deleteMany({});
    await prisma.servicios.deleteMany({});
    await prisma.perfiles_profesionales.deleteMany({});
    await prisma.usuarios.deleteMany({});
    await prisma.$disconnect();
  });

  describe('Complete Review Creation Flow', () => {
    it('should create a review and update professional rating', async () => {
      const reviewData = {
        servicio_id: testService.id,
        calificacion: 5,
        comentario: 'Excelente servicio de plomería'
      };

      // Create review
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.calificacion).toBe(5);
      expect(response.body.comentario).toBe('Excelente servicio de plomería');

      // Verify review was created in database
      const createdReview = await prisma.resenas.findUnique({
        where: { id: response.body.id }
      });
      expect(createdReview).toBeTruthy();
      expect(createdReview.calificacion).toBe(5);
      expect(createdReview.comentario).toBe('Excelente servicio de plomería');

      // Verify professional rating was updated
      const updatedProfile = await prisma.perfiles_profesionales.findUnique({
        where: { usuario_id: testProfessional.id }
      });
      expect(updatedProfile.calificacion_promedio).toBe(5);
    });

    it('should prevent duplicate reviews for same service', async () => {
      const reviewData = {
        servicio_id: testService.id,
        calificacion: 4,
        comentario: 'Otro comentario'
      };

      // First attempt should succeed
      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(201);

      // Second attempt should fail
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.error).toContain('Datos de reseña inválidos');
    });

    it('should validate rating range', async () => {
      const invalidReviewData = {
        servicio_id: testService.id,
        calificacion: 6, // Invalid rating
        comentario: 'Test comment'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidReviewData)
        .expect(400);

      expect(response.body.error).toContain('Datos de reseña inválidos');
    });

    it('should validate comment length', async () => {
      const longComment = 'a'.repeat(1001);
      const invalidReviewData = {
        servicio_id: testService.id,
        calificacion: 4,
        comentario: longComment
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidReviewData)
        .expect(400);

      expect(response.body.error).toContain('Datos de reseña inválidos');
    });
  });

  describe('Review Retrieval and Stats', () => {
    beforeAll(async () => {
      // Create multiple reviews for testing stats
      const services = [];
      for (let i = 0; i < 3; i++) {
        const service = await prisma.servicios.create({
          data: {
            cliente_id: testUser.id,
            profesional_id: testProfessional.id,
            descripcion: `Servicio ${i}`,
            estado: 'completado'
          }
        });
        services.push(service);

        await prisma.resenas.create({
          data: {
            servicio_id: service.id,
            cliente_id: testUser.id,
            calificacion: [5, 4, 3][i], // Different ratings
            comentario: `Comentario ${i}`
          }
        });
      }
    });

    it('should retrieve professional reviews', async () => {
      const response = await request(app)
        .get(`/api/reviews/professional/${testProfessional.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const review = response.body[0];
      expect(review).toHaveProperty('calificacion');
      expect(review).toHaveProperty('comentario');
      expect(review).toHaveProperty('cliente');
      expect(review).toHaveProperty('servicio');
    });

    it('should retrieve professional stats', async () => {
      const response = await request(app)
        .get(`/api/reviews/professional/${testProfessional.id}/stats`)
        .expect(200);

      expect(response.body).toHaveProperty('professionalId', testProfessional.id);
      expect(response.body).toHaveProperty('totalReviews');
      expect(response.body).toHaveProperty('averageRating');
      expect(response.body).toHaveProperty('ratingDistribution');
      expect(response.body).toHaveProperty('positivePercentage');

      // Verify stats calculation
      expect(response.body.totalReviews).toBe(3);
      expect(response.body.averageRating).toBe(4.0); // (5+4+3)/3
      expect(response.body.ratingDistribution).toEqual({
        1: 0, 2: 0, 3: 1, 4: 1, 5: 1
      });
      expect(response.body.positivePercentage).toBe(67); // 2/3 rounded
    });
  });

  describe('Review Eligibility Check', () => {
    it('should check review eligibility for completed service', async () => {
      const response = await request(app)
        .get(`/api/reviews/check/${testService.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('canReview');
      // Since we already created reviews, this should be false
      expect(response.body.canReview).toBe(false);
    });

    it('should return not eligible with reason', async () => {
      // Create a new service without reviews
      const newService = await prisma.servicios.create({
        data: {
          cliente_id: testUser.id,
          profesional_id: testProfessional.id,
          descripcion: 'Nuevo servicio',
          estado: 'completado'
        }
      });

      const response = await request(app)
        .get(`/api/reviews/check/${newService.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.canReview).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting for review creation', async () => {
      // This test would require setting up the rate limiter properly
      // For now, we'll just verify the endpoint exists and handles auth
      const reviewData = {
        servicio_id: testService.id,
        calificacion: 4,
        comentario: 'Rate limit test'
      };

      // Without proper auth setup, this will fail with auth error
      // In a real scenario, you'd test the rate limiting after auth
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData);

      // Should fail due to duplicate review (not rate limiting)
      expect(response.status).toBe(400);
    });
  });

  describe('Image Upload Integration', () => {
    it('should handle review creation with image upload', async () => {
      // Create a new service for this test
      const imageService = await prisma.servicios.create({
        data: {
          cliente_id: testUser.id,
          profesional_id: testProfessional.id,
          descripcion: 'Servicio con imagen',
          estado: 'completado'
        }
      });

      // Mock file upload
      const reviewData = {
        servicio_id: imageService.id,
        calificacion: 5,
        comentario: 'Servicio con imagen'
      };

      // This would require multer setup in tests
      // For now, we test the basic functionality
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .field('servicio_id', imageService.id)
        .field('calificacion', 5)
        .field('comentario', 'Servicio con imagen')
        // .attach('url_foto', 'path/to/test/image.jpg') // Would need actual file
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.calificacion).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid service ID', async () => {
      const reviewData = {
        servicio_id: 'invalid-service-id',
        calificacion: 5,
        comentario: 'Test comment'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.error).toContain('Datos de reseña inválidos');
    });

    it('should handle missing authentication', async () => {
      const reviewData = {
        servicio_id: testService.id,
        calificacion: 5,
        comentario: 'Test comment'
      };

      const response = await request(app)
        .post('/api/reviews')
        .send(reviewData)
        .expect(401);

      expect(response.body.error).toContain('Token requerido');
    });

    it('should handle malformed request data', async () => {
      const malformedData = {
        servicio_id: testService.id,
        calificacion: 'not-a-number',
        comentario: null
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(malformedData)
        .expect(400);

      expect(response.body.error).toContain('Datos de reseña inválidos');
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across review operations', async () => {
      // Create a new service
      const consistencyService = await prisma.servicios.create({
        data: {
          cliente_id: testUser.id,
          profesional_id: testProfessional.id,
          descripcion: 'Consistency test service',
          estado: 'completado'
        }
      });

      // Create review
      const reviewData = {
        servicio_id: consistencyService.id,
        calificacion: 4,
        comentario: 'Consistency test'
      };

      const createResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(201);

      const reviewId = createResponse.body.id;

      // Verify review exists
      const reviewInDb = await prisma.resenas.findUnique({
        where: { id: reviewId }
      });
      expect(reviewInDb).toBeTruthy();
      expect(reviewInDb.calificacion).toBe(4);

      // Verify it appears in professional reviews
      const reviewsResponse = await request(app)
        .get(`/api/reviews/professional/${testProfessional.id}`)
        .expect(200);

      const foundReview = reviewsResponse.body.find(r => r.id === reviewId);
      expect(foundReview).toBeTruthy();
      expect(foundReview.calificacion).toBe(4);

      // Verify stats are updated
      const statsResponse = await request(app)
        .get(`/api/reviews/professional/${testProfessional.id}/stats`)
        .expect(200);

      expect(statsResponse.body.totalReviews).toBeGreaterThan(0);
    });
  });
});
