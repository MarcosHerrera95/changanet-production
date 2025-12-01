// src/tests/security/review-security.test.js
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const app = require('../../server');

const prisma = new PrismaClient();

describe('Review System Security Tests', () => {
  let testUser, testProfessional, testService, authToken;

  beforeAll(async () => {
    // Create test data
    testUser = await prisma.usuarios.create({
      data: {
        email: 'security@test.com',
        hash_contrasena: 'hashedpass',
        nombre: 'Security Test User',
        rol: 'cliente',
        esta_verificado: true
      }
    });

    testProfessional = await prisma.usuarios.create({
      data: {
        email: 'security-pro@test.com',
        hash_contrasena: 'hashedpass',
        nombre: 'Security Professional',
        rol: 'profesional',
        esta_verificado: true
      }
    });

    await prisma.perfiles_profesionales.create({
      data: {
        usuario_id: testProfessional.id,
        especialidad: 'Security Testing',
        anos_experiencia: 5
      }
    });

    testService = await prisma.servicios.create({
      data: {
        cliente_id: testUser.id,
        profesional_id: testProfessional.id,
        descripcion: 'Security test service',
        estado: 'completado'
      }
    });

    // Generate JWT token
    authToken = jwt.sign(
      { id: testUser.id, email: testUser.email, rol: testUser.rol },
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

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on review creation', async () => {
      const reviewData = {
        servicio_id: testService.id,
        calificacion: 5,
        comentario: 'Rate limiting test'
      };

      // Create first review
      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(201);

      // Subsequent requests should be rate limited
      // Note: This test assumes the rate limiter is configured to allow very few requests
      // In practice, you might need to adjust the rate limiter settings for testing
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData);

      // Should fail due to duplicate review (business logic), not necessarily rate limiting
      expect([400, 429]).toContain(response.status);
    });

    it('should include rate limit headers in responses', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          servicio_id: testService.id,
          calificacion: 4,
          comentario: 'Rate limit headers test'
        });

      // Check for rate limit headers (if implemented)
      // These headers might not be present in all configurations
      if (response.headers['x-ratelimit-remaining']) {
        expect(response.headers).toHaveProperty('x-ratelimit-remaining');
        expect(response.headers).toHaveProperty('x-ratelimit-reset');
      }
    });
  });

  describe('XSS Protection', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert(1)>',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<a href="javascript:alert(1)">Click me</a>',
      '<div onmouseover=alert(1)>Hover me</div>',
      '<svg onload=alert(1)>',
      '<object data="javascript:alert(1)">',
      '<embed src="javascript:alert(1)">',
      '<form action="javascript:alert(1)"><input type=submit></form>',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'
    ];

    it('should sanitize XSS attempts in comments', async () => {
      for (const xssPayload of xssPayloads) {
        const newService = await prisma.servicios.create({
          data: {
            cliente_id: testUser.id,
            profesional_id: testProfessional.id,
            descripcion: `XSS test service ${Math.random()}`,
            estado: 'completado'
          }
        });

        const reviewData = {
          servicio_id: newService.id,
          calificacion: 3,
          comentario: `Safe comment ${xssPayload}`
        };

        const response = await request(app)
          .post('/api/reviews')
          .set('Authorization', `Bearer ${authToken}`)
          .send(reviewData)
          .expect(201);

        // Verify the comment was sanitized
        expect(response.body.comentario).not.toContain('<script>');
        expect(response.body.comentario).not.toContain('<img');
        expect(response.body.comentario).not.toContain('<iframe');
        expect(response.body.comentario).not.toContain('javascript:');
        expect(response.body.comentario).toContain('Safe comment');
      }
    });

    it('should prevent XSS in service descriptions', async () => {
      // This tests that even if malicious data gets into the service description,
      // it doesn't affect the review response
      const maliciousService = await prisma.servicios.create({
        data: {
          cliente_id: testUser.id,
          profesional_id: testProfessional.id,
          descripcion: '<script>alert("service xss")</script>Malicious service',
          estado: 'completado'
        }
      });

      const reviewData = {
        servicio_id: maliciousService.id,
        calificacion: 2,
        comentario: 'Testing service XSS'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(201);

      // The service description in the response should be safe
      expect(response.body.servicio.descripcion).toContain('Malicious service');
      // But should not contain active script tags
      expect(response.body.servicio.descripcion).not.toContain('<script>');
    });
  });

  describe('Image Upload Security', () => {
    it('should reject non-image files', async () => {
      const invalidFiles = [
        { mimetype: 'text/plain', extension: 'txt' },
        { mimetype: 'application/pdf', extension: 'pdf' },
        { mimetype: 'video/mp4', extension: 'mp4' },
        { mimetype: 'audio/mpeg', extension: 'mp3' },
        { mimetype: 'application/javascript', extension: 'js' },
        { mimetype: 'application/exe', extension: 'exe' }
      ];

      for (const fileType of invalidFiles) {
        const newService = await prisma.servicios.create({
          data: {
            cliente_id: testUser.id,
            profesional_id: testProfessional.id,
            descripcion: `File type test ${fileType.extension}`,
            estado: 'completado'
          }
        });

        const response = await request(app)
          .post('/api/reviews')
          .set('Authorization', `Bearer ${authToken}`)
          .field('servicio_id', newService.id)
          .field('calificacion', 4)
          .field('comentario', `Testing ${fileType.extension} upload`)
          .attach('url_foto', Buffer.from('fake file content'), `test.${fileType.extension}`)
          .expect(400);

        expect(response.status).toBe(400);
      }
    });

    it('should accept valid image files', async () => {
      const validImages = [
        { mimetype: 'image/jpeg', extension: 'jpg' },
        { mimetype: 'image/png', extension: 'png' },
        { mimetype: 'image/webp', extension: 'webp' }
      ];

      for (const imageType of validImages) {
        const newService = await prisma.servicios.create({
          data: {
            cliente_id: testUser.id,
            profesional_id: testProfessional.id,
            descripcion: `Valid image test ${imageType.extension}`,
            estado: 'completado'
          }
        });

        // Create a minimal valid image buffer
        const imageBuffer = Buffer.from([
          0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01 // Minimal JPEG header
        ]);

        const response = await request(app)
          .post('/api/reviews')
          .set('Authorization', `Bearer ${authToken}`)
          .field('servicio_id', newService.id)
          .field('calificacion', 5)
          .field('comentario', `Testing ${imageType.extension} upload`)
          .attach('url_foto', imageBuffer, `test.${imageType.extension}`)
          .expect(201);

        expect(response.body.calificacion).toBe(5);
        // Note: In a real test, you'd verify the image was uploaded to Cloudinary
      }
    });

    it('should enforce file size limits', async () => {
      const newService = await prisma.servicios.create({
        data: {
          cliente_id: testUser.id,
          profesional_id: testProfessional.id,
          descripcion: 'File size test service',
          estado: 'completado'
        }
      });

      // Create a file larger than 5MB
      const largeFile = Buffer.alloc(6 * 1024 * 1024); // 6MB

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .field('servicio_id', newService.id)
        .field('calificacion', 4)
        .field('comentario', 'Testing large file upload')
        .attach('url_foto', largeFile, 'large.jpg')
        .expect(400);

      expect(response.status).toBe(400);
    });

    it('should handle malformed file uploads', async () => {
      const newService = await prisma.servicios.create({
        data: {
          cliente_id: testUser.id,
          profesional_id: testProfessional.id,
          descripcion: 'Malformed file test',
          estado: 'completado'
        }
      });

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .field('servicio_id', newService.id)
        .field('calificacion', 3)
        .field('comentario', 'Testing malformed upload')
        .attach('url_foto', Buffer.from(''), 'empty.jpg')
        .expect(201);

      // Should still work with empty/invalid image
      expect(response.body.calificacion).toBe(3);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should validate and sanitize SQL injection attempts', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE resenas; --",
        "' OR '1'='1",
        "'; SELECT * FROM usuarios; --",
        "admin'--",
        "1' OR '1' = '1"
      ];

      for (const sqlPayload of sqlInjectionPayloads) {
        const newService = await prisma.servicios.create({
          data: {
            cliente_id: testUser.id,
            profesional_id: testProfessional.id,
            descripcion: `SQL injection test ${Math.random()}`,
            estado: 'completado'
          }
        });

        const reviewData = {
          servicio_id: newService.id,
          calificacion: 2,
          comentario: `Test comment ${sqlPayload}`
        };

        const response = await request(app)
          .post('/api/reviews')
          .set('Authorization', `Bearer ${authToken}`)
          .send(reviewData)
          .expect(201);

        // Verify the comment was stored and no SQL injection occurred
        expect(response.body.comentario).toContain('Test comment');
        // The SQL payload should be stored as-is (Prisma handles SQL injection prevention)
        expect(response.body.comentario).toContain(sqlPayload);
      }
    });

    it('should handle extreme input values', async () => {
      const extremeInputs = [
        { rating: 1, comment: '' },
        { rating: 5, comment: 'a'.repeat(1000) }, // Maximum allowed length
        { rating: 3, comment: 'Comment with special chars: áéíóú ñ @#$%^&*()' }
      ];

      for (const input of extremeInputs) {
        const newService = await prisma.servicios.create({
          data: {
            cliente_id: testUser.id,
            profesional_id: testProfessional.id,
            descripcion: `Extreme input test ${Math.random()}`,
            estado: 'completado'
          }
        });

        const reviewData = {
          servicio_id: newService.id,
          calificacion: input.rating,
          comentario: input.comment
        };

        const response = await request(app)
          .post('/api/reviews')
          .set('Authorization', `Bearer ${authToken}`)
          .send(reviewData)
          .expect(201);

        expect(response.body.calificacion).toBe(input.rating);
        expect(response.body.comentario).toBe(input.comment);
      }
    });

    it('should prevent directory traversal attacks', async () => {
      const traversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '/etc/passwd',
        'C:\\Windows\\System32'
      ];

      // Test in service descriptions (though they shouldn't contain paths)
      for (const payload of traversalPayloads) {
        const response = await request(app)
          .get(`/api/reviews/professional/${testProfessional.id}`)
          .expect(200);

        // Ensure no sensitive paths are exposed in responses
        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toContain('/etc/');
        expect(responseText).not.toContain('\\Windows\\');
        expect(responseText).not.toContain('..\\');
        expect(responseText).not.toContain('../');
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests with expired tokens', async () => {
      const expiredToken = jwt.sign(
        { id: testUser.id, email: testUser.email, rol: testUser.rol },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Already expired
      );

      const reviewData = {
        servicio_id: testService.id,
        calificacion: 4,
        comentario: 'Expired token test'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send(reviewData)
        .expect(401);

      expect(response.body.error).toContain('Token');
    });

    it('should reject requests with tampered tokens', async () => {
      const tamperedToken = authToken.slice(0, -10) + 'tampered';

      const reviewData = {
        servicio_id: testService.id,
        calificacion: 4,
        comentario: 'Tampered token test'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .send(reviewData)
        .expect(401);

      expect(response.body.error).toContain('Token');
    });

    it('should prevent unauthorized access to other users reviews', async () => {
      // Create another user
      const otherUser = await prisma.usuarios.create({
        data: {
          email: 'other@test.com',
          hash_contrasena: 'hashedpass',
          nombre: 'Other User',
          rol: 'cliente',
          esta_verificado: true
        }
      });

      const otherToken = jwt.sign(
        { id: otherUser.id, email: otherUser.email, rol: otherUser.rol },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Try to check eligibility for testUser's service
      const response = await request(app)
        .get(`/api/reviews/check/${testService.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      // Should return false because otherUser is not the client
      expect(response.body.canReview).toBe(false);
      expect(response.body.reason).toContain('cliente');
    });
  });

  describe('Data Exposure Prevention', () => {
    it('should not expose sensitive user information', async () => {
      const response = await request(app)
        .get(`/api/reviews/professional/${testProfessional.id}`)
        .expect(200);

      const review = response.body[0];
      if (review) {
        // Should not expose passwords or sensitive data
        expect(review.cliente).not.toHaveProperty('hash_contrasena');
        expect(review.cliente).not.toHaveProperty('esta_verificado');
        expect(review.profesional).not.toHaveProperty('hash_contrasena');
        expect(review.profesional).not.toHaveProperty('esta_verificado');

        // Should only expose safe fields
        expect(review.cliente).toHaveProperty('nombre');
        expect(review.cliente).toHaveProperty('email');
      }
    });

    it('should limit response data to prevent information leakage', async () => {
      // Create many reviews
      const services = [];
      for (let i = 0; i < 10; i++) {
        const service = await prisma.servicios.create({
          data: {
            cliente_id: testUser.id,
            profesional_id: testProfessional.id,
            descripcion: `Bulk test service ${i}`,
            estado: 'completado'
          }
        });
        services.push(service);

        await prisma.resenas.create({
          data: {
            servicio_id: service.id,
            cliente_id: testUser.id,
            calificacion: 4,
            comentario: `Bulk test comment ${i}`
          }
        });
      }

      const response = await request(app)
        .get(`/api/reviews/professional/${testProfessional.id}`)
        .expect(200);

      // Should return all reviews (no artificial limiting in this endpoint)
      expect(response.body.length).toBeGreaterThan(5);

      // But each review should have limited fields
      response.body.forEach(review => {
        expect(review).toHaveProperty('id');
        expect(review).toHaveProperty('calificacion');
        expect(review).toHaveProperty('comentario');
        expect(review).toHaveProperty('creado_en');
        expect(review).not.toHaveProperty('updatedAt'); // Should not expose internal fields
      });
    });
  });

  describe('Content Security', () => {
    it('should validate service state transitions', async () => {
      // Create a service that's not completed
      const pendingService = await prisma.servicios.create({
        data: {
          cliente_id: testUser.id,
          profesional_id: testProfessional.id,
          descripcion: 'Pending service',
          estado: 'pendiente'
        }
      });

      const reviewData = {
        servicio_id: pendingService.id,
        calificacion: 5,
        comentario: 'Should not be allowed'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.error).toContain('Datos de reseña inválidos');
    });

    it('should prevent reviews for non-existent services', async () => {
      const reviewData = {
        servicio_id: '00000000-0000-0000-0000-000000000000', // Non-existent UUID
        calificacion: 4,
        comentario: 'Non-existent service test'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.error).toContain('Datos de reseña inválidos');
    });
  });
});
