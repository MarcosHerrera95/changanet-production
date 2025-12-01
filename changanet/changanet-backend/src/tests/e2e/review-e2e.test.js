// src/tests/e2e/review-e2e.test.js
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const app = require('../../server');

const prisma = new PrismaClient();

describe('Review System E2E Tests', () => {
  let clientUser, professionalUser, service, clientToken;

  beforeAll(async () => {
    // Create test client user
    clientUser = await prisma.usuarios.create({
      data: {
        email: 'e2e-client@test.com',
        hash_contrasena: 'hashedpass',
        nombre: 'E2E Client',
        rol: 'cliente',
        esta_verificado: true
      }
    });

    // Create test professional user
    professionalUser = await prisma.usuarios.create({
      data: {
        email: 'e2e-professional@test.com',
        hash_contrasena: 'hashedpass',
        nombre: 'E2E Professional',
        rol: 'profesional',
        esta_verificado: true
      }
    });

    // Create professional profile
    await prisma.perfiles_profesionales.create({
      data: {
        usuario_id: professionalUser.id,
        especialidad: 'E2E Testing Specialist',
        anos_experiencia: 10,
        calificacion_promedio: 0
      }
    });

    // Create completed service
    service = await prisma.servicios.create({
      data: {
        cliente_id: clientUser.id,
        profesional_id: professionalUser.id,
        descripcion: 'E2E Test Service - Complete home cleaning',
        estado: 'completado',
        precio: 150.00,
        fecha_servicio: new Date('2025-11-25')
      }
    });

    // Generate client JWT token
    clientToken = jwt.sign(
      { id: clientUser.id, email: clientUser.email, rol: clientUser.rol },
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

  describe('Complete User Journey: Service Completion to Review', () => {
    it('should complete full review creation workflow', async () => {
      // Step 1: User checks if they can review the service
      console.log('🧪 E2E Test: Step 1 - Checking review eligibility');

      const eligibilityResponse = await request(app)
        .get(`/api/reviews/check/${service.id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(eligibilityResponse.body.canReview).toBe(true);
      console.log('✅ Service is eligible for review');

      // Step 2: User creates a review with rating and comment
      console.log('🧪 E2E Test: Step 2 - Creating review');

      const reviewData = {
        servicio_id: service.id,
        calificacion: 5,
        comentario: '¡Excelente servicio! El profesional llegó puntual, realizó una limpieza completa y dejó todo impecable. Muy recomendado.'
      };

      const reviewResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(reviewData)
        .expect(201);

      expect(reviewResponse.body.id).toBeDefined();
      expect(reviewResponse.body.calificacion).toBe(5);
      expect(reviewResponse.body.comentario).toBe(reviewData.comentario);
      expect(reviewResponse.body.servicio_id).toBe(service.id);
      expect(reviewResponse.body.cliente_id).toBe(clientUser.id);

      const reviewId = reviewResponse.body.id;
      console.log('✅ Review created successfully with ID:', reviewId);

      // Step 3: Verify professional's rating was updated
      console.log('🧪 E2E Test: Step 3 - Verifying rating calculation');

      const profileAfterReview = await prisma.perfiles_profesionales.findUnique({
        where: { usuario_id: professionalUser.id }
      });

      expect(profileAfterReview.calificacion_promedio).toBe(5.0);
      console.log('✅ Professional rating updated to:', profileAfterReview.calificacion_promedio);

      // Step 4: Check that review appears in professional's review list
      console.log('🧪 E2E Test: Step 4 - Verifying review appears in list');

      const reviewsResponse = await request(app)
        .get(`/api/reviews/professional/${professionalUser.id}`)
        .expect(200);

      expect(Array.isArray(reviewsResponse.body)).toBe(true);
      expect(reviewsResponse.body.length).toBeGreaterThan(0);

      const createdReview = reviewsResponse.body.find(r => r.id === reviewId);
      expect(createdReview).toBeDefined();
      expect(createdReview.calificacion).toBe(5);
      expect(createdReview.comentario).toBe(reviewData.comentario);
      expect(createdReview.cliente.nombre).toBe(clientUser.nombre);

      console.log('✅ Review appears in professional\'s review list');

      // Step 5: Verify statistics are updated
      console.log('🧪 E2E Test: Step 5 - Checking statistics');

      const statsResponse = await request(app)
        .get(`/api/reviews/professional/${professionalUser.id}/stats`)
        .expect(200);

      expect(statsResponse.body.professionalId).toBe(professionalUser.id);
      expect(statsResponse.body.totalReviews).toBe(1);
      expect(statsResponse.body.averageRating).toBe(5.0);
      expect(statsResponse.body.ratingDistribution['5']).toBe(1);
      expect(statsResponse.body.positivePercentage).toBe(100);

      console.log('✅ Statistics updated correctly');

      // Step 6: Verify user cannot create another review for same service
      console.log('🧪 E2E Test: Step 6 - Preventing duplicate reviews');

      const duplicateReviewData = {
        servicio_id: service.id,
        calificacion: 4,
        comentario: 'Attempting duplicate review'
      };

      const duplicateResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(duplicateReviewData)
        .expect(400);

      expect(duplicateResponse.body.error).toContain('Datos de reseña inválidos');
      console.log('✅ Duplicate review prevented');

      // Step 7: Check that eligibility is now false
      console.log('🧪 E2E Test: Step 7 - Verifying eligibility changed');

      const eligibilityAfterResponse = await request(app)
        .get(`/api/reviews/check/${service.id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(eligibilityAfterResponse.body.canReview).toBe(false);
      expect(eligibilityAfterResponse.body.reason).toContain('reseña');
      console.log('✅ Review eligibility correctly updated');

      console.log('🎉 E2E Test completed successfully!');
    });

    it('should handle review with image upload', async () => {
      // Create a new service for this test
      const imageService = await prisma.servicios.create({
        data: {
          cliente_id: clientUser.id,
          profesional_id: professionalUser.id,
          descripcion: 'E2E Test Service with Image',
          estado: 'completado'
        }
      });

      console.log('🧪 E2E Test: Review with image upload');

      // Create minimal valid JPEG buffer
      const imageBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xC0, 0x00, 0x11,
        0x08, 0x00, 0x10, 0x00, 0x10, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01,
        0x03, 0x11, 0x01, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x08, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF,
        0xDA, 0x00, 0x0C, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F,
        0x00, 0x00, 0xFF, 0xD9
      ]);

      const reviewWithImageResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .field('servicio_id', imageService.id)
        .field('calificacion', 4)
        .field('comentario', 'Great service with photo evidence')
        .attach('url_foto', imageBuffer, 'service-photo.jpg')
        .expect(201);

      expect(reviewWithImageResponse.body.calificacion).toBe(4);
      expect(reviewWithImageResponse.body.comentario).toBe('Great service with photo evidence');
      expect(reviewWithImageResponse.body.url_foto).toBeDefined();

      console.log('✅ Review with image uploaded successfully');
    });

    it('should handle multiple reviews and rating calculations', async () => {
      // Create multiple services and reviews to test rating calculations
      console.log('🧪 E2E Test: Multiple reviews and rating calculations');

      const services = [];
      const ratings = [5, 4, 3, 5, 4];

      for (let i = 0; i < ratings.length; i++) {
        const testService = await prisma.servicios.create({
          data: {
            cliente_id: clientUser.id,
            profesional_id: professionalUser.id,
            descripcion: `Multi-review test service ${i}`,
            estado: 'completado'
          }
        });
        services.push(testService);

        const reviewResponse = await request(app)
          .post('/api/reviews')
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            servicio_id: testService.id,
            calificacion: ratings[i],
            comentario: `Review ${i + 1} of ${ratings.length}`
          })
          .expect(201);

        expect(reviewResponse.body.calificacion).toBe(ratings[i]);
      }

      // Calculate expected average: (5+4+3+5+4)/5 = 21/5 = 4.2
      const expectedAverage = 4.2;

      // Check final statistics
      const finalStatsResponse = await request(app)
        .get(`/api/reviews/professional/${professionalUser.id}/stats`)
        .expect(200);

      expect(finalStatsResponse.body.totalReviews).toBe(ratings.length);
      expect(finalStatsResponse.body.averageRating).toBe(expectedAverage);

      // Verify rating distribution
      expect(finalStatsResponse.body.ratingDistribution['3']).toBe(1);
      expect(finalStatsResponse.body.ratingDistribution['4']).toBe(2);
      expect(finalStatsResponse.body.ratingDistribution['5']).toBe(2);

      // Check positive percentage: 4/5 = 80%
      expect(finalStatsResponse.body.positivePercentage).toBe(80);

      console.log('✅ Multiple reviews and calculations handled correctly');
    });

    it('should handle client reviewing multiple professionals', async () => {
      // Create another professional
      const professional2 = await prisma.usuarios.create({
        data: {
          email: 'e2e-professional2@test.com',
          hash_contrasena: 'hashedpass',
          nombre: 'E2E Professional 2',
          rol: 'profesional',
          esta_verificado: true
        }
      });

      await prisma.perfiles_profesionales.create({
        data: {
          usuario_id: professional2.id,
          especialidad: 'E2E Electrician',
          anos_experiencia: 8,
          calificacion_promedio: 0
        }
      });

      // Create service with second professional
      const service2 = await prisma.servicios.create({
        data: {
          cliente_id: clientUser.id,
          profesional_id: professional2.id,
          descripcion: 'E2E Electrical service',
          estado: 'completado'
        }
      });

      console.log('🧪 E2E Test: Client reviewing multiple professionals');

      // Review first professional
      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          servicio_id: service.id,
          calificacion: 5,
          comentario: 'Excellent plumbing work'
        })
        .expect(201);

      // Review second professional
      const review2Response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          servicio_id: service2.id,
          calificacion: 4,
          comentario: 'Good electrical work'
        })
        .expect(201);

      expect(review2Response.body.calificacion).toBe(4);

      // Check that both professionals have reviews
      const reviews1 = await request(app)
        .get(`/api/reviews/professional/${professionalUser.id}`)
        .expect(200);

      const reviews2 = await request(app)
        .get(`/api/reviews/professional/${professional2.id}`)
        .expect(200);

      expect(reviews1.body.length).toBeGreaterThan(0);
      expect(reviews2.body.length).toBeGreaterThan(0);

      console.log('✅ Client can review multiple professionals');
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle network-like errors gracefully', async () => {
      // Test with malformed data
      const malformedData = {
        servicio_id: 'not-a-uuid',
        calificacion: 'not-a-number',
        comentario: null
      };

      const errorResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(malformedData)
        .expect(400);

      expect(errorResponse.body.error).toBeDefined();
      console.log('✅ Error scenarios handled gracefully');
    });

    it('should maintain data integrity across failures', async () => {
      // Create a review successfully
      const goodService = await prisma.servicios.create({
        data: {
          cliente_id: clientUser.id,
          profesional_id: professionalUser.id,
          descripcion: 'Data integrity test service',
          estado: 'completado'
        }
      });

      const goodReview = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          servicio_id: goodService.id,
          calificacion: 4,
          comentario: 'Good service for integrity test'
        })
        .expect(201);

      // Attempt a bad review that should fail
      const badReviewResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          servicio_id: goodService.id, // Same service - should fail
          calificacion: 3,
          comentario: 'This should fail'
        })
        .expect(400);

      // Verify the good review still exists
      const reviewsAfterError = await request(app)
        .get(`/api/reviews/professional/${professionalUser.id}`)
        .expect(200);

      const goodReviewStillExists = reviewsAfterError.body.find(r => r.id === goodReview.body.id);
      expect(goodReviewStillExists).toBeDefined();
      expect(goodReviewStillExists.calificacion).toBe(4);

      console.log('✅ Data integrity maintained across error scenarios');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent requests', async () => {
      // Create multiple services for concurrent testing
      const concurrentServices = [];
      for (let i = 0; i < 5; i++) {
        const svc = await prisma.servicios.create({
          data: {
            cliente_id: clientUser.id,
            profesional_id: professionalUser.id,
            descripcion: `Concurrent test service ${i}`,
            estado: 'completado'
          }
        });
        concurrentServices.push(svc);
      }

      console.log('🧪 E2E Test: Concurrent requests');

      // Send multiple concurrent requests
      const concurrentPromises = concurrentServices.map((svc, index) =>
        request(app)
          .post('/api/reviews')
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            servicio_id: svc.id,
            calificacion: (index % 5) + 1, // Ratings 1-5
            comentario: `Concurrent review ${index + 1}`
          })
      );

      const responses = await Promise.all(concurrentPromises);

      // All should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.calificacion).toBe((index % 5) + 1);
      });

      console.log('✅ Concurrent requests handled successfully');
    });
  });
});
