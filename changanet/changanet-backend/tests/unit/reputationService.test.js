/**
 * Pruebas unitarias para reputationService.js
 * Cubre: REQ-38, REQ-39 (Sistema de reputación y medallas)
 * Incluye cálculo de ranking, asignación de medallas, casos edge
 */

const { PrismaClient } = require('@prisma/client');
const reputationService = require('../../src/services/reputationService');

jest.mock('@prisma/client');

const mockPrisma = {
  usuarios: {
    findMany: jest.fn(),
  },
  servicios: {
    count: jest.fn(),
  },
  resenas: {
    findMany: jest.fn(),
  },
  reputation_scores: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  user_medals: {
    upsert: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
  },
  verification_requests: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

PrismaClient.mockImplementation(() => mockPrisma);

describe('Reputation Service - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateReputationScore', () => {
    test('debe calcular puntuación correctamente con datos completos', async () => {
      const mockServices = 25; // 25 servicios completados
      const mockReviews = [
        { calificacion: 5 },
        { calificacion: 4 },
        { calificacion: 5 },
        { calificacion: 4.5 }
      ];

      mockPrisma.servicios.count.mockResolvedValue(mockServices);
      mockPrisma.resenas.findMany.mockResolvedValue(mockReviews);

      const result = await reputationService.calculateReputationScore('user-123');

      expect(result).toEqual({
        averageRating: 4.6, // (5+4+5+4.5)/4 = 4.625 → 4.6
        completedJobs: 25,
        onTimePercentage: 85.0, // valor por defecto
        rankingScore: expect.closeTo(4.6 * 0.6 + 25 * 0.3 + 85.0 * 0.1, 1) // ≈ 2.76 + 7.5 + 8.5 = 18.76
      });
    });

    test('debe manejar caso sin reseñas', async () => {
      mockPrisma.servicios.count.mockResolvedValue(10);
      mockPrisma.resenas.findMany.mockResolvedValue([]);

      const result = await reputationService.calculateReputationScore('user-123');

      expect(result).toEqual({
        averageRating: 0,
        completedJobs: 10,
        onTimePercentage: 85.0,
        rankingScore: expect.closeTo(0 + 10 * 0.3 + 85.0 * 0.1, 1) // 3 + 8.5 = 11.5
      });
    });

    test('debe manejar caso sin servicios completados', async () => {
      mockPrisma.servicios.count.mockResolvedValue(0);
      mockPrisma.resenas.findMany.mockResolvedValue([]);

      const result = await reputationService.calculateReputationScore('user-123');

      expect(result).toEqual({
        averageRating: 0,
        completedJobs: 0,
        onTimePercentage: 0, // sin servicios = 0
        rankingScore: 0
      });
    });
  });

  describe('updateReputationScore', () => {
    test('debe actualizar puntuación exitosamente', async () => {
      const mockMetrics = {
        averageRating: 4.5,
        completedJobs: 20,
        onTimePercentage: 90.0,
        rankingScore: 16.5
      };

      const mockUpdatedScore = {
        id: 'score-123',
        usuario_id: 'user-123',
        ...mockMetrics,
        last_calculated: new Date()
      };

      // Mock calculateReputationScore
      jest.spyOn(reputationService, 'calculateReputationScore').mockResolvedValue(mockMetrics);
      jest.spyOn(reputationService, 'checkAndAssignMedals').mockResolvedValue();
      jest.spyOn(reputationService, 'updateGlobalRanking').mockResolvedValue();

      mockPrisma.reputation_scores.upsert.mockResolvedValue(mockUpdatedScore);

      const result = await reputationService.updateReputationScore('user-123');

      expect(result).toEqual(mockUpdatedScore);
      expect(reputationService.calculateReputationScore).toHaveBeenCalledWith('user-123');
      expect(reputationService.checkAndAssignMedals).toHaveBeenCalledWith('user-123', mockMetrics);
      expect(reputationService.updateGlobalRanking).toHaveBeenCalled();
    });
  });

  describe('getUserReputation', () => {
    test('debe retornar reputación existente si no necesita actualización', async () => {
      const mockReputation = {
        id: 'score-123',
        usuario_id: 'user-123',
        average_rating: 4.5,
        completed_jobs: 20,
        ranking_score: 16.5,
        last_calculated: new Date(), // reciente
        usuario: {
          nombre: 'Juan Pérez',
          perfil_profesional: {
            especialidad: 'plomero',
            zona_cobertura: 'Buenos Aires',
            calificacion_promedio: 4.5
          }
        }
      };

      mockPrisma.reputation_scores.findUnique.mockResolvedValue(mockReputation);

      const result = await reputationService.getUserReputation('user-123');

      expect(result).toEqual(mockReputation);
      expect(reputationService.updateReputationScore).not.toHaveBeenCalled();
    });

    test('debe recalcular si la reputación está desactualizada', async () => {
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 25); // más de 24 horas

      const mockOldReputation = {
        id: 'score-123',
        last_calculated: oldDate
      };

      const mockUpdatedReputation = {
        id: 'score-123',
        usuario_id: 'user-123',
        average_rating: 4.8,
        completed_jobs: 25,
        ranking_score: 18.2
      };

      mockPrisma.reputation_scores.findUnique.mockResolvedValue(mockOldReputation);
      jest.spyOn(reputationService, 'updateReputationScore').mockResolvedValue(mockUpdatedReputation);

      const result = await reputationService.getUserReputation('user-123');

      expect(result).toEqual(mockUpdatedReputation);
      expect(reputationService.updateReputationScore).toHaveBeenCalledWith('user-123');
    });

    test('debe crear reputación si no existe', async () => {
      const mockNewReputation = {
        id: 'score-new',
        usuario_id: 'user-123',
        average_rating: 0,
        completed_jobs: 0,
        ranking_score: 0
      };

      mockPrisma.reputation_scores.findUnique.mockResolvedValue(null);
      jest.spyOn(reputationService, 'updateReputationScore').mockResolvedValue(mockNewReputation);

      const result = await reputationService.getUserReputation('user-123');

      expect(result).toEqual(mockNewReputation);
      expect(reputationService.updateReputationScore).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getGlobalRanking', () => {
    test('debe retornar ranking global ordenado', async () => {
      const mockRankings = [
        {
          id: 'score-1',
          ranking_score: 20.5,
          global_ranking: 1,
          usuario: {
            nombre: 'Usuario 1',
            perfil_profesional: {
              especialidad: 'plomero',
              zona_cobertura: 'CABA',
              calificacion_promedio: 5.0,
              estado_verificacion: 'verificado'
            }
          }
        },
        {
          id: 'score-2',
          ranking_score: 18.2,
          global_ranking: 2,
          usuario: {
            nombre: 'Usuario 2',
            perfil_profesional: {
              especialidad: 'electricista',
              zona_cobertura: 'Buenos Aires',
              calificacion_promedio: 4.5,
              estado_verificacion: 'pendiente'
            }
          }
        }
      ];

      mockPrisma.reputation_scores.findMany.mockResolvedValue(mockRankings);

      const result = await reputationService.getGlobalRanking(10);

      expect(result).toEqual([
        { ...mockRankings[0], global_ranking: 1 },
        { ...mockRankings[1], global_ranking: 2 }
      ]);
      expect(mockPrisma.reputation_scores.findMany).toHaveBeenCalledWith({
        take: 10,
        orderBy: { ranking_score: 'desc' },
        include: expect.any(Object)
      });
    });

    test('debe usar límite por defecto de 100', async () => {
      mockPrisma.reputation_scores.findMany.mockResolvedValue([]);

      await reputationService.getGlobalRanking();

      expect(mockPrisma.reputation_scores.findMany).toHaveBeenCalledWith({
        take: 100,
        orderBy: { ranking_score: 'desc' },
        include: expect.any(Object)
      });
    });
  });

  describe('checkAndAssignMedals', () => {
    beforeEach(() => {
      jest.spyOn(reputationService, 'assignMedal').mockResolvedValue();
      jest.spyOn(reputationService, 'revokeMedal').mockResolvedValue();
      jest.spyOn(reputationService, 'isUserVerified').mockResolvedValue(false);
    });

    test('debe asignar medalla de puntualidad cuando cumple criterio', async () => {
      const metrics = {
        averageRating: 4.0,
        completedJobs: 10,
        onTimePercentage: 95.0
      };

      await reputationService.checkAndAssignMedals('user-123', metrics);

      expect(reputationService.assignMedal).toHaveBeenCalledWith('user-123', {
        type: 'puntualidad',
        name: 'Profesional Puntual',
        description: 'Más del 90% de trabajos completados a tiempo',
        condition: true,
        value: 95.0
      });
    });

    test('debe asignar medalla de reputación cuando cumple criterio', async () => {
      const metrics = {
        averageRating: 4.8,
        completedJobs: 5,
        onTimePercentage: 80.0
      };

      await reputationService.checkAndAssignMedals('user-123', metrics);

      expect(reputationService.assignMedal).toHaveBeenCalledWith('user-123', {
        type: 'calificaciones',
        name: 'Excelente Reputación',
        description: 'Calificación promedio superior a 4.5',
        condition: true,
        value: 4.8
      });
    });

    test('debe asignar medalla de trabajos completados', async () => {
      const metrics = {
        averageRating: 4.0,
        completedJobs: 55,
        onTimePercentage: 80.0
      };

      await reputationService.checkAndAssignMedals('user-123', metrics);

      expect(reputationService.assignMedal).toHaveBeenCalledWith('user-123', {
        type: 'trabajos_completados',
        name: 'Profesional Experto',
        description: 'Más de 50 servicios completados exitosamente',
        condition: true,
        value: 55
      });
    });

    test('debe asignar medalla de verificación cuando usuario está verificado', async () => {
      const metrics = {
        averageRating: 4.0,
        completedJobs: 5,
        onTimePercentage: 80.0
      };

      reputationService.isUserVerified.mockResolvedValue(true);

      await reputationService.checkAndAssignMedals('user-123', metrics);

      expect(reputationService.assignMedal).toHaveBeenCalledWith('user-123', {
        type: 'verificado',
        name: 'Identidad Verificada',
        description: 'Documento de identidad verificado',
        condition: true,
        value: 1
      });
    });

    test('debe revocar medalla cuando ya no cumple criterio', async () => {
      const metrics = {
        averageRating: 4.2, // debajo de 4.5
        completedJobs: 10,
        onTimePercentage: 85.0 // debajo de 90
      };

      await reputationService.checkAndAssignMedals('user-123', metrics);

      expect(reputationService.revokeMedal).toHaveBeenCalledWith('user-123', 'puntualidad');
      expect(reputationService.revokeMedal).toHaveBeenCalledWith('user-123', 'calificaciones');
    });
  });

  describe('assignMedal y revokeMedal', () => {
    test('debe asignar medalla correctamente', async () => {
      const medalData = {
        type: 'test_medal',
        name: 'Test Medal',
        description: 'Test description',
        value: 100
      };

      const mockUpsertResult = {
        id: 'medal-123',
        usuario_id: 'user-123',
        medal_type: 'test_medal',
        medal_name: 'Test Medal',
        is_active: true
      };

      mockPrisma.user_medals.upsert.mockResolvedValue(mockUpsertResult);

      await reputationService.assignMedal('user-123', medalData);

      expect(mockPrisma.user_medals.upsert).toHaveBeenCalledWith({
        where: {
          usuario_id_medal_type: {
            usuario_id: 'user-123',
            medal_type: 'test_medal'
          }
        },
        update: {
          condition_value: 100,
          is_active: true,
          awarded_at: expect.any(Date),
          revoked_at: null
        },
        create: {
          usuario_id: 'user-123',
          medal_type: 'test_medal',
          medal_name: 'Test Medal',
          medal_description: 'Test description',
          condition_value: 100,
          condition_type: 'unknown' // getConditionType retorna 'unknown' para tipos no mapeados
        }
      });
    });

    test('debe revocar medalla correctamente', async () => {
      mockPrisma.user_medals.updateMany.mockResolvedValue({ count: 1 });

      await reputationService.revokeMedal('user-123', 'test_medal');

      expect(mockPrisma.user_medals.updateMany).toHaveBeenCalledWith({
        where: {
          usuario_id: 'user-123',
          medal_type: 'test_medal',
          is_active: true
        },
        data: {
          is_active: false,
          revoked_at: expect.any(Date)
        }
      });
    });
  });

  describe('getUserMedals', () => {
    test('debe retornar medallas activas del usuario', async () => {
      const mockMedals = [
        {
          id: 'medal-1',
          medal_type: 'puntualidad',
          medal_name: 'Profesional Puntual',
          is_active: true,
          awarded_at: new Date()
        },
        {
          id: 'medal-2',
          medal_type: 'verificado',
          medal_name: 'Identidad Verificada',
          is_active: true,
          awarded_at: new Date()
        }
      ];

      mockPrisma.user_medals.findMany.mockResolvedValue(mockMedals);

      const result = await reputationService.getUserMedals('user-123');

      expect(result).toEqual(mockMedals);
      expect(mockPrisma.user_medals.findMany).toHaveBeenCalledWith({
        where: {
          usuario_id: 'user-123',
          is_active: true
        },
        orderBy: { awarded_at: 'desc' }
      });
    });
  });

  describe('isUserVerified', () => {
    test('debe retornar true si usuario está verificado', async () => {
      const mockVerification = {
        id: 'verification-123',
        estado: 'aprobado'
      };

      mockPrisma.verification_requests.findUnique.mockResolvedValue(mockVerification);

      const result = await reputationService.isUserVerified('user-123');

      expect(result).toBe(true);
    });

    test('debe retornar false si usuario no está verificado', async () => {
      mockPrisma.verification_requests.findUnique.mockResolvedValue(null);

      const result = await reputationService.isUserVerified('user-123');

      expect(result).toBe(false);
    });

    test('debe retornar false si verificación está pendiente', async () => {
      const mockVerification = {
        id: 'verification-123',
        estado: 'pendiente'
      };

      mockPrisma.verification_requests.findUnique.mockResolvedValue(mockVerification);

      const result = await reputationService.isUserVerified('user-123');

      expect(result).toBe(false);
    });
  });

  describe('updateAllReputationScores', () => {
    test('debe actualizar reputación de todos los profesionales', async () => {
      const mockProfessionals = [
        { id: 'user-1' },
        { id: 'user-2' },
        { id: 'user-3' }
      ];

      mockPrisma.usuarios.findMany.mockResolvedValue(mockProfessionals);
      jest.spyOn(reputationService, 'updateReputationScore').mockResolvedValue();

      await reputationService.updateAllReputationScores();

      expect(mockPrisma.usuarios.findMany).toHaveBeenCalledWith({
        where: { rol: 'profesional' },
        select: { id: true }
      });
      expect(reputationService.updateReputationScore).toHaveBeenCalledTimes(3);
      expect(reputationService.updateReputationScore).toHaveBeenCalledWith('user-1');
      expect(reputationService.updateReputationScore).toHaveBeenCalledWith('user-2');
      expect(reputationService.updateReputationScore).toHaveBeenCalledWith('user-3');
    });
  });

  describe('Casos Edge y Manejo de Errores', () => {
    test('debe manejar error en calculateReputationScore', async () => {
      mockPrisma.servicios.count.mockRejectedValue(new Error('Error de BD'));

      await expect(
        reputationService.calculateReputationScore('user-123')
      ).rejects.toThrow('Error de BD');
    });

    test('debe manejar error en updateReputationScore', async () => {
      jest.spyOn(reputationService, 'calculateReputationScore').mockRejectedValue(new Error('Error de cálculo'));

      await expect(
        reputationService.updateReputationScore('user-123')
      ).rejects.toThrow('Error de cálculo');
    });

    test('debe manejar error en getGlobalRanking', async () => {
      mockPrisma.reputation_scores.findMany.mockRejectedValue(new Error('Error de BD'));

      await expect(
        reputationService.getGlobalRanking()
      ).rejects.toThrow('Error de BD');
    });

    test('debe manejar error en assignMedal', async () => {
      mockPrisma.user_medals.upsert.mockRejectedValue(new Error('Error de BD'));

      await expect(
        reputationService.assignMedal('user-123', { type: 'test', name: 'Test' })
      ).rejects.toThrow('Error de BD');
    });

    test('debe continuar checkAndAssignMedals aunque falle isUserVerified', async () => {
      const metrics = {
        averageRating: 4.0,
        completedJobs: 10,
        onTimePercentage: 80.0
      };

      reputationService.isUserVerified.mockRejectedValue(new Error('Error de verificación'));
      jest.spyOn(reputationService, 'assignMedal').mockResolvedValue();
      jest.spyOn(reputationService, 'revokeMedal').mockResolvedValue();

      // No debería lanzar error
      await reputationService.checkAndAssignMedals('user-123', metrics);

      expect(reputationService.assignMedal).toHaveBeenCalled();
    });
  });
});
