/**
 * Controlador de solicitudes de retiro
 * Implementa REQ-44: Retiro de fondos a cuenta bancaria
 * Incluye validaciones de seguridad y manejo de errores
 */

const withdrawalService = require('../services/withdrawalService');
const logger = require('../services/logger');

/**
 * Crea una solicitud de retiro
 * POST /api/withdrawals
 */
async function createWithdrawalRequest(req, res) {
  try {
    const { id: professionalId } = req.user;
    const { bankAccountId, amount } = req.body;

    // Validar campos requeridos
    if (!bankAccountId || !amount) {
      logger.warn('Withdrawal request creation failed: missing required fields', {
        service: 'withdrawals',
        userId: professionalId,
        bankAccountId,
        amount,
        ip: req.ip
      });
      return res.status(400).json({
        error: 'Faltan campos requeridos: bankAccountId, amount',
      });
    }

    // Validar que amount sea un número positivo
    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      return res.status(400).json({
        error: 'El monto debe ser un número positivo',
      });
    }

    const withdrawal = await withdrawalService.createWithdrawalRequest(professionalId, bankAccountId, withdrawalAmount);

    logger.info('Withdrawal request created via API', {
      service: 'withdrawals',
      userId: professionalId,
      withdrawalId: withdrawal.id,
      amount: withdrawalAmount,
      bankAccountId,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      data: withdrawal,
      message: 'Solicitud de retiro registrada exitosamente'
    });

  } catch (error) {
    logger.error('Withdrawal request creation error', {
      service: 'withdrawals',
      userId: req.user?.id,
      bankAccountId: req.body?.bankAccountId,
      amount: req.body?.amount,
      error: error.message,
      ip: req.ip
    });

    let statusCode = 500;
    if (error.message.includes('Solo los profesionales') ||
        error.message.includes('Cuenta bancaria no encontrada') ||
        error.message.includes('monto mínimo') ||
        error.message.includes('monto máximo') ||
        error.message.includes('Fondos insuficientes') ||
        error.message.includes('Ya tienes un retiro pendiente')) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Obtiene las solicitudes de retiro del profesional autenticado
 * GET /api/withdrawals
 */
async function getWithdrawalRequests(req, res) {
  try {
    const { id: professionalId } = req.user;

    const withdrawals = await withdrawalService.getWithdrawalRequests(professionalId);

    res.json({
      success: true,
      data: withdrawals,
    });

  } catch (error) {
    logger.error('Get withdrawal requests error', {
      service: 'withdrawals',
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
 * Obtiene fondos disponibles para retiro
 * GET /api/withdrawals/available-funds
 */
async function getAvailableFunds(req, res) {
  try {
    const { id: professionalId } = req.user;

    const availableFunds = await withdrawalService.calculateAvailableFunds(professionalId);

    res.json({
      success: true,
      data: {
        availableFunds,
        currency: 'ARS'
      },
    });

  } catch (error) {
    logger.error('Get available funds error', {
      service: 'withdrawals',
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
 * Procesa una solicitud de retiro (solo admins)
 * POST /api/withdrawals/:withdrawalId/process
 */
async function processWithdrawal(req, res) {
  try {
    const { withdrawalId } = req.params;
    const { id: adminId, rol } = req.user;
    const { action, reason } = req.body;

    // Verificar que sea admin
    if (rol !== 'admin') {
      return res.status(403).json({
        error: 'Solo los administradores pueden procesar retiros',
      });
    }

    // Validar campos requeridos
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        error: 'El campo "action" es requerido y debe ser "approve" o "reject"',
      });
    }

    if (action === 'reject' && !reason) {
      return res.status(400).json({
        error: 'Se requiere un motivo cuando se rechaza un retiro',
      });
    }

    const processedWithdrawal = await withdrawalService.processWithdrawal(withdrawalId, adminId, action, reason);

    logger.info('Withdrawal processed via API', {
      service: 'withdrawals',
      adminId,
      withdrawalId,
      action,
      reason,
      ip: req.ip
    });

    res.json({
      success: true,
      data: processedWithdrawal,
      message: action === 'approve' ? 'Retiro aprobado y en proceso' : 'Retiro rechazado'
    });

  } catch (error) {
    logger.error('Withdrawal processing error', {
      service: 'withdrawals',
      adminId: req.user?.id,
      withdrawalId: req.params.withdrawalId,
      action: req.body?.action,
      reason: req.body?.reason,
      error: error.message,
      ip: req.ip
    });

    let statusCode = 500;
    if (error.message.includes('Solicitud de retiro no encontrada') ||
        error.message.includes('ya ha sido procesada') ||
        error.message.includes('Acción inválida') ||
        error.message.includes('Fondos insuficientes') ||
        error.message.includes('Se requiere un motivo')) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Completa un retiro procesado (solo admins)
 * POST /api/withdrawals/:withdrawalId/complete
 */
async function completeWithdrawal(req, res) {
  try {
    const { withdrawalId } = req.params;
    const { id: adminId, rol } = req.user;

    // Verificar que sea admin
    if (rol !== 'admin') {
      return res.status(403).json({
        error: 'Solo los administradores pueden completar retiros',
      });
    }

    const completedWithdrawal = await withdrawalService.completeWithdrawal(withdrawalId, adminId);

    logger.info('Withdrawal completed via API', {
      service: 'withdrawals',
      adminId,
      withdrawalId,
      ip: req.ip
    });

    res.json({
      success: true,
      data: completedWithdrawal,
      message: 'Retiro completado exitosamente'
    });

  } catch (error) {
    logger.error('Withdrawal completion error', {
      service: 'withdrawals',
      adminId: req.user?.id,
      withdrawalId: req.params.withdrawalId,
      error: error.message,
      ip: req.ip
    });

    let statusCode = 500;
    if (error.message.includes('Solicitud de retiro no encontrada') ||
        error.message.includes('debe estar en estado')) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Obtiene todas las solicitudes de retiro pendientes (solo admins)
 * GET /api/withdrawals/pending
 */
async function getPendingWithdrawals(req, res) {
  try {
    const { rol } = req.user;

    // Verificar que sea admin
    if (rol !== 'admin') {
      return res.status(403).json({
        error: 'Solo los administradores pueden ver retiros pendientes',
      });
    }

    const pendingWithdrawals = await withdrawalService.getPendingWithdrawals();

    res.json({
      success: true,
      data: pendingWithdrawals,
    });

  } catch (error) {
    logger.error('Get pending withdrawals error', {
      service: 'withdrawals',
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
  createWithdrawalRequest,
  getWithdrawalRequests,
  getAvailableFunds,
  processWithdrawal,
  completeWithdrawal,
  getPendingWithdrawals,
};
