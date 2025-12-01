/**
 * Controlador para gestión de reputación y medallas.
 * Implementa sección 7.8 del PRD: Verificación de Identidad y Reputación
 * REQ-38: Medallas por logros
 * REQ-39: Ranking por reputación
 * Maneja consultas de reputación, rankings y gestión de medallas.
 */

const reputationService = require('../services/reputationService');
const { logReputationAccess, logReputationUpdate } = require('../services/auditService');

/**
 * Obtiene la reputación de un usuario específico
 * GET /api/reputation/:userId
 */
async function getUserReputation(req, res) {
  try {
    const { userId } = req.params;

    // Verificar permisos: el propio usuario o administradores
    if (req.user.id !== userId && req.user.rol !== 'admin') {
      return res.status(403).json({
        error: 'No tienes permisos para ver la reputación de este usuario'
      });
    }

    const reputation = await reputationService.getUserReputation(userId);
    const medals = await reputationService.getUserMedals(userId);

    // Registrar auditoría de acceso a reputación
    await logReputationAccess(
      req.user.id,
      userId,
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      data: {
        reputation: reputation,
        medals: medals
      }
    });
  } catch (error) {
    console.error('Error obteniendo reputación del usuario:', error);
    res.status(500).json({
      error: error.message || 'Error interno del servidor'
    });
  }
}

/**
 * Obtiene el ranking global de profesionales con paginación cursor-based
 * GET /api/reputation/ranking
 */
async function getGlobalRanking(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const cursor = req.query.cursor || null;

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        error: 'El límite debe estar entre 1 y 100'
      });
    }

    const result = await reputationService.getGlobalRanking(limit, cursor);

    res.json({
      success: true,
      data: result.rankings,
      meta: {
        total: result.rankings.length,
        limit: limit,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor
      }
    });
  } catch (error) {
    console.error('Error obteniendo ranking global:', error);
    res.status(500).json({
      error: error.message || 'Error interno del servidor'
    });
  }
}

/**
 * Actualiza la puntuación de reputación de un usuario
 * POST /api/reputation/update
 */
async function updateReputation(req, res) {
  try {
    const { userId } = req.body;

    // Verificar permisos: el propio usuario o administradores
    if (req.user.id !== userId && req.user.rol !== 'admin') {
      return res.status(403).json({
        error: 'No tienes permisos para actualizar la reputación de este usuario'
      });
    }

    const reputation = await reputationService.updateReputationScore(userId);

    // Registrar auditoría de actualización de reputación
    await logReputationUpdate(
      req.user.id,
      userId,
      {
        averageRating: reputation.average_rating,
        completedJobs: reputation.completed_jobs,
        rankingScore: reputation.ranking_score
      },
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Reputación actualizada correctamente',
      data: reputation
    });
  } catch (error) {
    console.error('Error actualizando reputación:', error);
    res.status(500).json({
      error: error.message || 'Error interno del servidor'
    });
  }
}

/**
 * Actualiza la reputación del usuario actual
 * POST /api/reputation/update-own
 */
async function updateOwnReputation(req, res) {
  try {
    const userId = req.user.id;

    const reputation = await reputationService.updateReputationScore(userId);

    res.json({
      success: true,
      message: 'Tu reputación ha sido actualizada',
      data: reputation
    });
  } catch (error) {
    console.error('Error actualizando reputación propia:', error);
    res.status(500).json({
      error: error.message || 'Error interno del servidor'
    });
  }
}

/**
 * Asigna una medalla manualmente (solo administradores)
 * POST /api/reputation/assign-medal
 */
async function assignMedal(req, res) {
  try {
    // Verificar que el usuario sea administrador
    if (req.user.rol !== 'admin') {
      return res.status(403).json({
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      });
    }

    const { userId, medalType, medalName, medalDescription } = req.body;

    if (!userId || !medalType || !medalName) {
      return res.status(400).json({
        error: 'Se requieren userId, medalType y medalName'
      });
    }

    const medalData = {
      type: medalType,
      name: medalName,
      description: medalDescription || '',
      condition: true,
      value: 1
    };

    await reputationService.assignMedal(userId, medalData);

    res.json({
      success: true,
      message: 'Medalla asignada correctamente'
    });
  } catch (error) {
    console.error('Error asignando medalla:', error);
    res.status(500).json({
      error: error.message || 'Error interno del servidor'
    });
  }
}

/**
 * Obtiene todas las medallas de un usuario
 * GET /api/reputation/:userId/medals
 */
async function getUserMedals(req, res) {
  try {
    const { userId } = req.params;

    // Verificar permisos: el propio usuario o administradores
    if (req.user.id !== userId && req.user.rol !== 'admin') {
      return res.status(403).json({
        error: 'No tienes permisos para ver las medallas de este usuario'
      });
    }

    const medals = await reputationService.getUserMedals(userId);

    res.json({
      success: true,
      data: medals
    });
  } catch (error) {
    console.error('Error obteniendo medallas del usuario:', error);
    res.status(500).json({
      error: error.message || 'Error interno del servidor'
    });
  }
}

/**
 * Fuerza la actualización de todas las puntuaciones de reputación (solo administradores)
 * POST /api/admin/reputation/update-all
 */
async function updateAllReputations(req, res) {
  try {
    // Verificar que el usuario sea administrador
    if (req.user.rol !== 'admin') {
      return res.status(403).json({
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      });
    }

    // Ejecutar en background para no bloquear la respuesta
    reputationService.updateAllReputationScores()
      .then(() => {
        console.log('Actualización masiva de reputación completada');
      })
      .catch((error) => {
        console.error('Error en actualización masiva de reputación:', error);
      });

    res.json({
      success: true,
      message: 'Actualización masiva de reputación iniciada en segundo plano'
    });
  } catch (error) {
    console.error('Error iniciando actualización masiva:', error);
    res.status(500).json({
      error: error.message || 'Error interno del servidor'
    });
  }
}

module.exports = {
  getUserReputation,
  getGlobalRanking,
  updateReputation,
  updateOwnReputation,
  assignMedal,
  getUserMedals,
  updateAllReputations
};
