/**
 * Pruebas unitarias para reputationController.js
 * Cubre: REQ-38, REQ-39 (Controlador de reputación y rankings)
 * Incluye manejo de requests HTTP, validación de permisos, respuestas
 */

const reputationController = require('../../src/controllers/reputationController');
const reputationService = require('../../src/services/reputationService');
const { logReputationAccess, logReputationUpdate } = require('../../src/services/auditService');

jest.mock('../../src/services/reputationService');
jest.mock('../../src/services/auditService');

describe('Reputation Controller - Unit Tests', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: { id: 'user-123', rol: 'profesional' },
      body: {},
      params: {},
      query: {},
      ip: '127.0.0.1',
      get: jest.fn(() => 'Mozilla/5.0')
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('getUserReputation', () => {
    beforeEach(() => {
      mockReq.params.userId = 'user-456';
    });

    test('debe retornar reputación del propio usuario', async () => {
      mockReq.params.userId = 'user-123'; // mismo usuario
      const mockReputation = {
        id: 'score-123',
        average_rating: 4.5,
        ranking_score: 16.5
      };
      const mockMedals = [
        { medal_type: 'puntualidad', medal_name: 'Profesional Puntual' }
      ];

      reputationService.getUserReputation.mockResolvedValue(mockReputation);
      reputationService.getUserMedals.mockResolvedValue(mockMedals);

      await reputationController.getUserReputation(mockReq, mockRes);

      expect(reputationService.getUserReputation).toHaveBeenCalledWith('user-123');
      expect(reputationService.getUserMedals).toHaveBeenCalledWith('user-123');
      expect(logReputationAccess).toHaveBeenCalledWith(
        'user-123',
        'user-123',
        '127.0.0.1',
        'Mozilla/5.0'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          reputation: mockReputation,
          medals: mockMedals
        }
      });
    });

    test('debe permitir acceso de administradores a reputación de otros usuarios', async () => {
      mockReq.user.rol = 'admin';
      const mockReputation = {
        id: 'score-456',
        average_rating: 4.2,
        ranking_score: 14.8
      };
      const mockMedals = [];

      reputationService.getUserReputation.mockResolvedValue(mockReputation);
      reputationService.getUserMedals.mockResolvedValue(mockMedals);

      await reputationController.getUserReputation(mockReq, mockRes);

      expect(reputationService.getUserReputation).toHaveBeenCalledWith('user-456');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          reputation: mockReputation,
          medals: mockMedals
        }
      });
    });

    test('debe rechazar acceso de usuarios no autorizados', async () => {
      await reputationController.getUserReputation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No tienes permisos para ver la reputación de este usuario'
      });
    });

    test('debe manejar errores del servicio', async () => {
      mockReq.params.userId = 'user-123';
      reputationService.getUserReputation.mockRejectedValue(new Error('Error de BD'));

      await reputationController.getUserReputation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Error de BD'
      });
    });
  });

  describe('getGlobalRanking', () => {
    test('debe retornar ranking global con límite por defecto', async () => {
      const mockRanking = [
        { global_ranking: 1, ranking_score: 20.5 },
        { global_ranking: 2, ranking_score: 18.2 }
      ];

      reputationService.getGlobalRanking.mockResolvedValue(mockRanking);

      await reputationController.getGlobalRanking(mockReq, mockRes);

      expect(reputationService.getGlobalRanking).toHaveBeenCalledWith(100);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockRanking,
        meta: {
          total: 2,
          limit: 100
        }
      });
    });

    test('debe usar límite personalizado del query', async () => {
      mockReq.query.limit = '50';
      const mockRanking = Array(50).fill({}).map((_, i) => ({ global_ranking: i + 1 }));

      reputationService.getGlobalRanking.mockResolvedValue(mockRanking);

      await reputationController.getGlobalRanking(mockReq, mockRes);

      expect(reputationService.getGlobalRanking).toHaveBeenCalledWith(50);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockRanking,
        meta: {
          total: 50,
          limit: 50
        }
      });
    });

    test('debe rechazar límite inválido (menor a 1)', async () => {
      mockReq.query.limit = '0';

      await reputationController.getGlobalRanking(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'El límite debe estar entre 1 y 1000'
      });
    });

    test('debe rechazar límite inválido (mayor a 1000)', async () => {
      mockReq.query.limit = '1500';

      await reputationController.getGlobalRanking(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'El límite debe estar entre 1 y 1000'
      });
    });
  });

  describe('updateReputation', () => {
    beforeEach(() => {
      mockReq.body.userId = 'user-456';
    });

    test('debe permitir actualización por administradores', async () => {
      mockReq.user.rol = 'admin';
      const mockReputation = {
        id: 'score-456',
        average_rating: 4.5,
        ranking_score: 16.5
      };

      reputationService.updateReputationScore.mockResolvedValue(mockReputation);

      await reputationController.updateReputation(mockReq, mockRes);

      expect(reputationService.updateReputationScore).toHaveBeenCalledWith('user-456');
      expect(logReputationUpdate).toHaveBeenCalledWith(
        'user-123',
        'user-456',
        {
          averageRating: 4.5,
          completedJobs: undefined,
          rankingScore: 16.5
        },
        '127.0.0.1',
        'Mozilla/5.0'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Reputación actualizada correctamente',
        data: mockReputation
      });
    });

    test('debe rechazar actualización de usuarios no autorizados', async () => {
      await reputationController.updateReputation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No tienes permisos para actualizar la reputación de este usuario'
      });
    });
  });

  describe('updateOwnReputation', () => {
    test('debe actualizar reputación del propio usuario', async () => {
      const mockReputation = {
        id: 'score-123',
        average_rating: 4.5,
        ranking_score: 16.5
      };

      reputationService.updateReputationScore.mockResolvedValue(mockReputation);

      await reputationController.updateOwnReputation(mockReq, mockRes);

      expect(reputationService.updateReputationScore).toHaveBeenCalledWith('user-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Tu reputación ha sido actualizada',
        data: mockReputation
      });
    });

    test('debe manejar errores del servicio', async () => {
      reputationService.updateReputationScore.mockRejectedValue(new Error('Error de cálculo'));

      await reputationController.updateOwnReputation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Error de cálculo'
      });
    });
  });

  describe('assignMedal', () => {
    beforeEach(() => {
      mockReq.user.rol = 'admin';
      mockReq.body = {
        userId: 'user-456',
        medalType: 'custom_medal',
        medalName: 'Medalla Personalizada',
        medalDescription: 'Descripción personalizada'
      };
    });

    test('debe asignar medalla exitosamente', async () => {
      reputationService.assignMedal.mockResolvedValue();

      await reputationController.assignMedal(mockReq, mockRes);

      expect(reputationService.assignMedal).toHaveBeenCalledWith('user-456', {
        type: 'custom_medal',
        name: 'Medalla Personalizada',
        description: 'Descripción personalizada',
        condition: true,
        value: 1
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Medalla asignada correctamente'
      });
    });

    test('debe rechazar acceso a no administradores', async () => {
      mockReq.user.rol = 'profesional';

      await reputationController.assignMedal(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      });
    });

    test('debe rechazar solicitud sin parámetros requeridos', async () => {
      mockReq.body.userId = undefined;

      await reputationController.assignMedal(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Se requieren userId, medalType y medalName'
      });
    });
  });

  describe('getUserMedals', () => {
    beforeEach(() => {
      mockReq.params.userId = 'user-456';
    });

    test('debe retornar medallas del propio usuario', async () => {
      mockReq.params.userId = 'user-123';
      const mockMedals = [
        { medal_type: 'puntualidad', medal_name: 'Profesional Puntual' }
      ];

      reputationService.getUserMedals.mockResolvedValue(mockMedals);

      await reputationController.getUserMedals(mockReq, mockRes);

      expect(reputationService.getUserMedals).toHaveBeenCalledWith('user-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockMedals
      });
    });

    test('debe permitir acceso de administradores a medallas de otros usuarios', async () => {
      mockReq.user.rol = 'admin';
      const mockMedals = [];

      reputationService.getUserMedals.mockResolvedValue(mockMedals);

      await reputationController.getUserMedals(mockReq, mockRes);

      expect(reputationService.getUserMedals).toHaveBeenCalledWith('user-456');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockMedals
      });
    });

    test('debe rechazar acceso de usuarios no autorizados', async () => {
      await reputationController.getUserMedals(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No tienes permisos para ver las medallas de este usuario'
      });
    });
  });

  describe('updateAllReputations', () => {
    test('debe iniciar actualización masiva para administradores', async () => {
      mockReq.user.rol = 'admin';

      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await reputationController.updateAllReputations(mockReq, mockRes);

      expect(reputationService.updateAllReputationScores).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Actualización masiva de reputación iniciada en segundo plano'
      });

      consoleSpy.mockRestore();
    });

    test('debe rechazar acceso a no administradores', async () => {
      mockReq.user.rol = 'profesional';

      await reputationController.updateAllReputations(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      });
    });

    test('debe manejar errores al iniciar actualización', async () => {
      mockReq.user.rol = 'admin';
      reputationService.updateAllReputationScores.mockRejectedValue(new Error('Error de inicialización'));

      await reputationController.updateAllReputations(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Error de inicialización'
      });
    });
  });
});
