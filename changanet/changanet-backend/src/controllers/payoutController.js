/**
 * Controlador de pagos a profesionales (payouts)
 * Implementa REQ-42: Custodia de fondos y liberación a profesionales
 * Incluye validaciones de seguridad y manejo de errores
 */

const payoutService = require('../services/payoutService');
const logger = require('../services/logger');

/**
 * Obtiene los payouts del profesional autenticado
 * GET /api/payouts
 */
async function getPayouts(req, res) {
  try {
    const { id: professionalId } = req.user;
    const { status, serviceId, dateFrom, dateTo } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (serviceId) filters.serviceId = serviceId;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const payouts = await payoutService.getPayouts(professionalId, filters);

    res.json({
      success: true,
      data: payouts,
    });

  } catch (error) {
    logger.error('Get payouts error', {
      service: 'payouts',
      userId: req.user?.id,
      filters: req.query,
      error: error.message,
      ip: req.ip
    });

    res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Obtiene un payout específico
 * GET /api/payouts/:payoutId
 */
async function getPayoutById(req, res) {
  try {
    const { payoutId } = req.params;
    const { id: professionalId } = req.user;

    const payout = await payoutService.getPayoutById(payoutId, professionalId);

    res.json({
      success: true,
      data: payout,
    });

  } catch (error) {
    logger.error('Get payout by ID error', {
      service: 'payouts',
      userId: req.user?.id,
      payoutId: req.params.payoutId,
      error: error.message,
      ip: req.ip
    });

    let statusCode = 500;
    if (error.message.includes('Payout no encontrado')) {
      statusCode = 404;
    }

    res.status(statusCode).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Obtiene estadísticas de payouts del profesional
 * GET /api/payouts/stats
 */
async function getPayoutStats(req, res) {
  try {
    const { id: professionalId } = req.user;

    const stats = await payoutService.getPayoutStats(professionalId);

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    logger.error('Get payout stats error', {
      service: 'payouts',
      userId: req.user?.id,
      error: error.message,
      ip: req.ip
    });

    res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Crea un payout (usado internamente por el sistema)
 * POST /api/payouts (solo admins para testing)
 */
async function createPayout(req, res) {
  try {
    const { id: adminId, rol } = req.user;
    const { professionalId, serviceId, grossAmount, commissionAmount, netAmount, paymentMethod } = req.body;

    // Verificar que sea admin (solo para testing manual)
    if (rol !== 'admin') {
      return res.status(403).json({
        error: 'Solo los administradores pueden crear payouts manualmente',
      });
    }

    // Validar campos requeridos
    const requiredFields = ['professionalId', 'grossAmount', 'commissionAmount', 'netAmount'];
    const missingFields = requiredFields.filter(field => req.body[field] === undefined);

    if (missingFields.length > 0) {
      logger.warn('Payout creation failed: missing required fields', {
        service: 'payouts',
        adminId,
        missingFields,
        ip: req.ip
      });
      return res.status(400).json({
        error: `Faltan campos requeridos: ${missingFields.join(', ')}`,
      });
    }

    const payout = await payoutService.createPayout(
      professionalId,
      serviceId,
      grossAmount,
      commissionAmount,
      netAmount,
      paymentMethod || 'bank_transfer'
    );

    logger.info('Payout created via API', {
      service: 'payouts',
      adminId,
      payoutId: payout.id,
      professionalId,
      netAmount,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      data: payout,
      message: 'Payout creado exitosamente'
    });

  } catch (error) {
    logger.error('Payout creation error', {
      service: 'payouts',
      adminId: req.user?.id,
      payoutData: req.body,
      error: error.message,
      ip: req.ip
    });

    let statusCode = 500;
    if (error.message.includes('Solo se pueden crear payouts') ||
        error.message.includes('Los montos deben ser positivos') ||
        error.message.includes('monto neto debe ser igual')) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Procesa un payout (solo admins)
 * POST /api/payouts/:payoutId/process
 */
async function processPayout(req, res) {
  try {
    const { payoutId } = req.params;
    const { id: adminId, rol } = req.user;
    const { reference } = req.body;

    // Verificar que sea admin
    if (rol !== 'admin') {
      return res.status(403).json({
        error: 'Solo los administradores pueden procesar payouts',
      });
    }

    const processedPayout = await payoutService.processPayout(payoutId, adminId, reference);

    logger.info('Payout processed via API', {
      service: 'payouts',
      adminId,
      payoutId,
      reference,
      ip: req.ip
    });

    res.json({
      success: true,
      data: processedPayout,
      message: 'Payout procesado exitosamente'
    });

  } catch (error) {
    logger.error('Payout processing error', {
      service: 'payouts',
      adminId: req.user?.id,
      payoutId: req.params.payoutId,
      reference: req.body?.reference,
      error: error.message,
      ip: req.ip
    });

    let statusCode = 500;
    if (error.message.includes('Payout no encontrado') ||
        error.message.includes('ya ha sido procesado')) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Obtiene todos los payouts pendientes (solo admins)
 * GET /api/payouts/pending
 */
async function getPendingPayouts(req, res) {
  try {
    const { rol } = req.user;

    // Verificar que sea admin
    if (rol !== 'admin') {
      return res.status(403).json({
        error: 'Solo los administradores pueden ver payouts pendientes',
      });
    }

    const pendingPayouts = await payoutService.getPendingPayouts();

    res.json({
      success: true,
      data: pendingPayouts,
    });

  } catch (error) {
    logger.error('Get pending payouts error', {
      service: 'payouts',
      adminId: req.user?.id,
      error: error.message,
      ip: req.ip
    });

    res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Obtiene estadísticas globales de payouts (solo admins)
 * GET /api/payouts/global-stats
 */
async function getGlobalPayoutStats(req, res) {
  try {
    const { rol } = req.user;

    // Verificar que sea admin
    if (rol !== 'admin') {
      return res.status(403).json({
        error: 'Solo los administradores pueden ver estadísticas globales',
      });
    }

    const stats = await payoutService.getGlobalPayoutStats();

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    logger.error('Get global payout stats error', {
      service: 'payouts',
      adminId: req.user?.id,
      error: error.message,
      ip: req.ip
    });

    res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

module.exports = {
  getPayouts,
  getPayoutById,
  getPayoutStats,
  createPayout,
  processPayout,
  getPendingPayouts,
  getGlobalPayoutStats,
};
