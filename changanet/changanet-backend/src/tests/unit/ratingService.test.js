// src/tests/unit/ratingService.test.js
const ratingService = require('../../services/ratingService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('RatingService', () => {
  let testUser, testProfessional, testService1, testService2;

  beforeEach(async () => {
    // Crear datos de prueba
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

    // Crear servicios completados
    testService1 = await prisma.servicios.create({
      data: {
        cliente_id: testUser.id,
        profesional_id: testProfessional.id,
        descripcion: 'Servicio 1',
        estado: 'completado'
      }
    });

    testService2 = await prisma.servicios.create({
      data: {
        cliente_id: testUser.id,
        profesional_id: testProfessional.id,
        descripcion: 'Servicio 2',
        estado: 'completado'
      }
    });
  });

  afterEach(async () => {
    await prisma.resenas.deleteMany({});
    await prisma.servicios.deleteMany({});
    await prisma.perfiles_profesionales.deleteMany({});
    await prisma.usuarios.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('calculateAverageRating', () => {
    it('should calculate average rating correctly', async () => {
      // Crear reseñas de prueba
      await prisma.resenas.create({
        data: {
          servicio_id: testService1.id,
          cliente_id: testUser.id,
          calificacion: 4,
          comentario: 'Buen servicio'
        }
      });

      await prisma.resenas.create({
        data: {
          servicio_id: testService2.id,
          cliente_id: testUser.id,
          calificacion: 5,
          comentario: 'Excelente servicio'
        }
      });

      const average = await ratingService.calculateAverageRating(testProfessional.id);

      expect(average).toBe(4.5);

      // Verificar que se actualizó el perfil
      const profile = await prisma.perfiles_profesionales.findUnique({
        where: { usuario_id: testProfessional.id }
      });
      expect(profile.calificacion_promedio).toBe(4.5);
    });

    it('should return 0 when no reviews exist', async () => {
      const average = await ratingService.calculateAverageRating(testProfessional.id);

      expect(average).toBe(0);

      const profile = await prisma.perfiles_profesionales.findUnique({
        where: { usuario_id: testProfessional.id }
      });
      expect(profile.calificacion_promedio).toBe(0);
    });

    it('should handle single review correctly', async () => {
      await prisma.resenas.create({
        data: {
          servicio_id: testService1.id,
          cliente_id: testUser.id,
          calificacion: 3,
          comentario: 'Servicio regular'
        }
      });

      const average = await ratingService.calculateAverageRating(testProfessional.id);

      expect(average).toBe(3);

      const profile = await prisma.perfiles_profesionales.findUnique({
        where: { usuario_id: testProfessional.id }
      });
      expect(profile.calificacion_promedio).toBe(3);
    });

    it('should handle decimal averages correctly', async () => {
      await prisma.resenas.create({
        data: {
          servicio_id: testService1.id,
          cliente_id: testUser.id,
          calificacion: 4,
          comentario: 'Buen servicio'
        }
      });

      await prisma.resenas.create({
        data: {
          servicio_id: testService2.id,
          cliente_id: testUser.id,
          calificacion: 3,
          comentario: 'Regular servicio'
        }
      });

      const average = await ratingService.calculateAverageRating(testProfessional.id);

      expect(average).toBe(3.5);

      const profile = await prisma.perfiles_profesionales.findUnique({
        where: { usuario_id: testProfessional.id }
      });
      expect(profile.calificacion_promedio).toBe(3.5);
    });

    it('should handle professional with no profile', async () => {
      // Create a user without professional profile
      const userWithoutProfile = await prisma.usuarios.create({
        data: {
          email: 'noprofile@test.com',
          hash_contrasena: 'hashedpass',
          nombre: 'User Without Profile',
          rol: 'cliente',
          esta_verificado: true
        }
      });

      await expect(ratingService.calculateAverageRating(userWithoutProfile.id))
        .rejects.toThrow('Error al calcular calificación promedio');
    });

    it('should handle database errors gracefully', async () => {
      // Mock prisma to throw error
      const originalFindMany = prisma.resenas.findMany;
      prisma.resenas.findMany = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(ratingService.calculateAverageRating(testProfessional.id))
        .rejects.toThrow('Error al calcular calificación promedio');

      // Restore original function
      prisma.resenas.findMany = originalFindMany;
    });
  });

  describe('getReviewStats', () => {
    it('should return complete statistics for professional', async () => {
      // Crear reseñas con diferentes calificaciones
      const reviewsData = [
        { service: testService1, rating: 5, comment: 'Excelente' },
        { service: testService2, rating: 4, comment: 'Muy bueno' }
      ];

      for (const review of reviewsData) {
        await prisma.resenas.create({
          data: {
            servicio_id: review.service.id,
            cliente_id: testUser.id,
            calificacion: review.rating,
            comentario: review.comment,
            creado_en: new Date('2025-11-28T10:00:00Z')
          }
        });
      }

      const stats = await ratingService.getReviewStats(testProfessional.id);

      expect(stats.professionalId).toBe(testProfessional.id);
      expect(stats.totalReviews).toBe(2);
      expect(stats.averageRating).toBe(4.5);
      expect(stats.ratingDistribution).toEqual({
        1: 0, 2: 0, 3: 0, 4: 1, 5: 1
      });
      expect(stats.positivePercentage).toBe(100);
      expect(stats.lastReviewDate).toBeDefined();
    });

    it('should return zero stats when no reviews exist', async () => {
      const stats = await ratingService.getReviewStats(testProfessional.id);

      expect(stats.professionalId).toBe(testProfessional.id);
      expect(stats.totalReviews).toBe(0);
      expect(stats.averageRating).toBe(0);
      expect(stats.ratingDistribution).toEqual({
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0
      });
      expect(stats.positivePercentage).toBe(0);
      expect(stats.lastReviewDate).toBe(null);
    });

    it('should calculate positive percentage correctly', async () => {
      // Crear reseñas: 2 positivas (4-5), 1 negativa (2)
      await prisma.resenas.create({
        data: {
          servicio_id: testService1.id,
          cliente_id: testUser.id,
          calificacion: 5,
          comentario: 'Excelente'
        }
      });

      await prisma.resenas.create({
        data: {
          servicio_id: testService2.id,
          cliente_id: testUser.id,
          calificacion: 4,
          comentario: 'Muy bueno'
        }
      });

      // Crear otro servicio para la reseña negativa
      const testService3 = await prisma.servicios.create({
        data: {
          cliente_id: testUser.id,
          profesional_id: testProfessional.id,
          descripcion: 'Servicio 3',
          estado: 'completado'
        }
      });

      await prisma.resenas.create({
        data: {
          servicio_id: testService3.id,
          cliente_id: testUser.id,
          calificacion: 2,
          comentario: 'Regular'
        }
      });

      const stats = await ratingService.getReviewStats(testProfessional.id);

      expect(stats.totalReviews).toBe(3);
      expect(stats.averageRating).toBe(3.7); // (5+4+2)/3
      expect(stats.positivePercentage).toBe(67); // 2/3 ≈ 67%
    });

    it('should handle all 5-star reviews', async () => {
      await prisma.resenas.create({
        data: {
          servicio_id: testService1.id,
          cliente_id: testUser.id,
          calificacion: 5,
          comentario: 'Perfecto'
        }
      });

      await prisma.resenas.create({
        data: {
          servicio_id: testService2.id,
          cliente_id: testUser.id,
          calificacion: 5,
          comentario: 'Excelente'
        }
      });

      const stats = await ratingService.getReviewStats(testProfessional.id);

      expect(stats.averageRating).toBe(5.0);
      expect(stats.positivePercentage).toBe(100);
      expect(stats.ratingDistribution).toEqual({
        1: 0, 2: 0, 3: 0, 4: 0, 5: 2
      });
    });

    it('should handle all 1-star reviews', async () => {
      await prisma.resenas.create({
        data: {
          servicio_id: testService1.id,
          cliente_id: testUser.id,
          calificacion: 1,
          comentario: 'Terrible'
        }
      });

      const stats = await ratingService.getReviewStats(testProfessional.id);

      expect(stats.averageRating).toBe(1.0);
      expect(stats.positivePercentage).toBe(0);
      expect(stats.ratingDistribution).toEqual({
        1: 1, 2: 0, 3: 0, 4: 0, 5: 0
      });
    });

    it('should handle database errors in getReviewStats', async () => {
      const originalFindMany = prisma.resenas.findMany;
      prisma.resenas.findMany = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(ratingService.getReviewStats(testProfessional.id))
        .rejects.toThrow('Error al obtener estadísticas de reseñas');

      prisma.resenas.findMany = originalFindMany;
    });
  });

  describe('updateAverageAfterReview', () => {
    it('should be an alias for calculateAverageRating', async () => {
      // Crear una reseña
      await prisma.resenas.create({
        data: {
          servicio_id: testService1.id,
          cliente_id: testUser.id,
          calificacion: 4,
          comentario: 'Buen servicio'
        }
      });

      const average = await ratingService.updateAverageAfterReview(testProfessional.id);

      expect(average).toBe(4);

      const profile = await prisma.perfiles_profesionales.findUnique({
        where: { usuario_id: testProfessional.id }
      });
      expect(profile.calificacion_promedio).toBe(4);
    });
  });

  describe('getTopRatedProfessionals', () => {
    let professional2, professional3;

    beforeEach(async () => {
      // Crear más profesionales para pruebas de ranking
      professional2 = await prisma.usuarios.create({
        data: {
          email: 'prof2@test.com',
          hash_contrasena: 'hashedpass',
          nombre: 'Profesional 2',
          rol: 'profesional',
          esta_verificado: true
        }
      });

      professional3 = await prisma.usuarios.create({
        data: {
          email: 'prof3@test.com',
          hash_contrasena: 'hashedpass',
          nombre: 'Profesional 3',
          rol: 'profesional',
          esta_verificado: true
        }
      });

      await prisma.perfiles_profesionales.create({
        data: {
          usuario_id: professional2.id,
          especialidad: 'Electricista',
          calificacion_promedio: 4.8,
          esta_disponible: true
        }
      });

      await prisma.perfiles_profesionales.create({
        data: {
          usuario_id: professional3.id,
          especialidad: 'Pintor',
          calificacion_promedio: 3.5,
          esta_disponible: true
        }
      });
    });

    it('should return top rated professionals ordered by rating', async () => {
      const topProfessionals = await ratingService.getTopRatedProfessionals(5);

      expect(topProfessionals.length).toBeGreaterThanOrEqual(2);
      expect(topProfessionals[0].calificacion_promedio).toBeGreaterThanOrEqual(topProfessionals[1].calificacion_promedio);
    });

    it('should respect limit parameter', async () => {
      const topProfessionals = await ratingService.getTopRatedProfessionals(2);

      expect(topProfessionals.length).toBeLessThanOrEqual(2);
    });

    it('should filter by minimum reviews', async () => {
      // Crear reseña para testProfessional
      await prisma.resenas.create({
        data: {
          servicio_id: testService1.id,
          cliente_id: testUser.id,
          calificacion: 5,
          comentario: 'Excelente'
        }
      });

      const topProfessionals = await ratingService.getTopRatedProfessionals(5, 1);

      // Debería incluir solo profesionales con al menos 1 reseña
      const hasTestProfessional = topProfessionals.some(p => p.usuario_id === testProfessional.id);
      expect(hasTestProfessional).toBe(true);
    });
  });

  describe('getRatingTrends', () => {
    it('should return trend analysis for recent reviews', async () => {
      // Crear reseñas en diferentes fechas
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      await prisma.resenas.create({
        data: {
          servicio_id: testService1.id,
          cliente_id: testUser.id,
          calificacion: 3,
          comentario: 'Regular',
          creado_en: weekAgo
        }
      });

      await prisma.resenas.create({
        data: {
          servicio_id: testService2.id,
          cliente_id: testUser.id,
          calificacion: 5,
          comentario: 'Excelente',
          creado_en: now
        }
      });

      const trends = await ratingService.getRatingTrends(testProfessional.id, 30);

      expect(trends.totalReviews).toBe(2);
      expect(trends.averageRating).toBe(4.0);
      expect(trends.reviews).toHaveLength(2);
      expect(trends.trend).toBeDefined();
    });

    it('should return stable trend for consistent ratings', async () => {
      await prisma.resenas.create({
        data: {
          servicio_id: testService1.id,
          cliente_id: testUser.id,
          calificacion: 4,
          comentario: 'Buen servicio'
        }
      });

      await prisma.resenas.create({
        data: {
          servicio_id: testService2.id,
          cliente_id: testUser.id,
          calificacion: 4,
          comentario: 'Otro buen servicio'
        }
      });

      const trends = await ratingService.getRatingTrends(testProfessional.id, 30);

      expect(trends.trend).toBe('stable');
    });

    it('should detect improving trend', async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Older reviews with lower ratings
      await prisma.resenas.create({
        data: {
          servicio_id: testService1.id,
          cliente_id: testUser.id,
          calificacion: 2,
          comentario: 'Regular',
          creado_en: weekAgo
        }
      });

      // Recent reviews with higher ratings
      await prisma.resenas.create({
        data: {
          servicio_id: testService2.id,
          cliente_id: testUser.id,
          calificacion: 5,
          comentario: 'Mucho mejor',
          creado_en: now
        }
      });

      const trends = await ratingService.getRatingTrends(testProfessional.id, 30);

      expect(trends.trend).toBe('improving');
      expect(trends.averageRating).toBe(3.5);
    });

    it('should detect declining trend', async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Older reviews with higher ratings
      await prisma.resenas.create({
        data: {
          servicio_id: testService1.id,
          cliente_id: testUser.id,
          calificacion: 5,
          comentario: 'Excelente',
          creado_en: weekAgo
        }
      });

      // Recent reviews with lower ratings
      await prisma.resenas.create({
        data: {
          servicio_id: testService2.id,
          cliente_id: testUser.id,
          calificacion: 2,
          comentario: 'Peor servicio',
          creado_en: now
        }
      });

      const trends = await ratingService.getRatingTrends(testProfessional.id, 30);

      expect(trends.trend).toBe('declining');
      expect(trends.averageRating).toBe(3.5);
    });

    it('should handle database errors in getRatingTrends', async () => {
      const originalFindMany = prisma.resenas.findMany;
      prisma.resenas.findMany = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(ratingService.getRatingTrends(testProfessional.id, 30))
        .rejects.toThrow('Error al obtener tendencias de calificación');

      prisma.resenas.findMany = originalFindMany;
    });
  });
});
