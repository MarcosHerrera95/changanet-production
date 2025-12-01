/**
 * Controlador de cuentas bancarias
 * Implementa REQ-44: Gestión de cuentas bancarias para retiros
 * Incluye validaciones de seguridad y manejo de errores
 */

const bankAccountService = require('../services/bankAccountService');
const logger = require('../services/logger');

/**
 * Crea una nueva cuenta bancaria
 * POST /api/bank-accounts
 */
async function createBankAccount(req, res) {
  try {
    const { id: professionalId } = req.user;
    const bankData = req.body;

    // Validar campos requeridos
    const requiredFields = ['banco', 'tipo_cuenta', 'numero_cuenta', 'titular', 'documento_titular'];
    const missingFields = requiredFields.filter(field => !bankData[field]);

    if (missingFields.length > 0) {
      logger.warn('Bank account creation failed: missing required fields', {
        service: 'bank_accounts',
        userId: professionalId,
        missingFields,
        ip: req.ip
      });
      return res.status(400).json({
        error: `Faltan campos requeridos: ${missingFields.join(', ')}`,
      });
    }

    const bankAccount = await bankAccountService.createBankAccount(professionalId, bankData);

    logger.info('Bank account created via API', {
      service: 'bank_accounts',
      userId: professionalId,
      bankAccountId: bankAccount.id,
      banco: bankData.banco,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      data: bankAccount,
      message: 'Cuenta bancaria registrada exitosamente. Está pendiente de verificación.'
    });

  } catch (error) {
    logger.error('Bank account creation error', {
      service: 'bank_accounts',
      userId: req.user?.id,
      bankData: req.body,
      error: error.message,
      ip: req.ip
    });

    // Determinar código de error apropiado
    let statusCode = 500;
    if (error.message.includes('Solo los profesionales') ||
        error.message.includes('Datos bancarios inválidos') ||
        error.message.includes('Ya tienes registrada')) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Obtiene las cuentas bancarias del profesional autenticado
 * GET /api/bank-accounts
 */
async function getBankAccounts(req, res) {
  try {
    const { id: professionalId } = req.user;

    const accounts = await bankAccountService.getBankAccounts(professionalId);

    res.json({
      success: true,
      data: accounts,
    });

  } catch (error) {
    logger.error('Get bank accounts error', {
      service: 'bank_accounts',
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
 * Actualiza una cuenta bancaria
 * PUT /api/bank-accounts/:accountId
 */
async function updateBankAccount(req, res) {
  try {
    const { accountId } = req.params;
    const { id: professionalId } = req.user;
    const updateData = req.body;

    // Validar que se proporcionen datos para actualizar
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'Se deben proporcionar datos para actualizar',
      });
    }

    const updatedAccount = await bankAccountService.updateBankAccount(accountId, professionalId, updateData);

    logger.info('Bank account updated via API', {
      service: 'bank_accounts',
      userId: professionalId,
      bankAccountId: accountId,
      updatedFields: Object.keys(updateData),
      ip: req.ip
    });

    res.json({
      success: true,
      data: updatedAccount,
      message: 'Cuenta bancaria actualizada exitosamente'
    });

  } catch (error) {
    logger.error('Bank account update error', {
      service: 'bank_accounts',
      userId: req.user?.id,
      accountId: req.params.accountId,
      updateData: req.body,
      error: error.message,
      ip: req.ip
    });

    let statusCode = 500;
    if (error.message.includes('Cuenta bancaria no encontrada') ||
        error.message.includes('No se pueden modificar') ||
        error.message.includes('Datos bancarios inválidos')) {
      statusCode = 400;
    } else if (error.message.includes('No tienes permiso')) {
      statusCode = 403;
    }

    res.status(statusCode).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Elimina una cuenta bancaria
 * DELETE /api/bank-accounts/:accountId
 */
async function deleteBankAccount(req, res) {
  try {
    const { accountId } = req.params;
    const { id: professionalId } = req.user;

    await bankAccountService.deleteBankAccount(accountId, professionalId);

    logger.info('Bank account deleted via API', {
      service: 'bank_accounts',
      userId: professionalId,
      bankAccountId: accountId,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Cuenta bancaria eliminada exitosamente'
    });

  } catch (error) {
    logger.error('Bank account deletion error', {
      service: 'bank_accounts',
      userId: req.user?.id,
      accountId: req.params.accountId,
      error: error.message,
      ip: req.ip
    });

    let statusCode = 500;
    if (error.message.includes('Cuenta bancaria no encontrada') ||
        error.message.includes('No se puede eliminar') ||
        error.message.includes('No se pueden eliminar')) {
      statusCode = 400;
    } else if (error.message.includes('No tienes permiso')) {
      statusCode = 403;
    }

    res.status(statusCode).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Verifica una cuenta bancaria (solo admins)
 * POST /api/bank-accounts/:accountId/verify
 */
async function verifyBankAccount(req, res) {
  try {
    const { accountId } = req.params;
    const { id: adminId, rol } = req.user;
    const { approved, reason } = req.body;

    // Verificar que sea admin
    if (rol !== 'admin') {
      return res.status(403).json({
        error: 'Solo los administradores pueden verificar cuentas bancarias',
      });
    }

    // Validar campos requeridos
    if (typeof approved !== 'boolean') {
      return res.status(400).json({
        error: 'El campo "approved" es requerido y debe ser booleano',
      });
    }

    if (!approved && !reason) {
      return res.status(400).json({
        error: 'Se requiere un motivo cuando se rechaza una cuenta bancaria',
      });
    }

    const verifiedAccount = await bankAccountService.verifyBankAccount(accountId, adminId, approved, reason);

    logger.info('Bank account verified via API', {
      service: 'bank_accounts',
      adminId,
      bankAccountId: accountId,
      approved,
      reason,
      ip: req.ip
    });

    res.json({
      success: true,
      data: verifiedAccount,
      message: approved ? 'Cuenta bancaria verificada exitosamente' : 'Cuenta bancaria rechazada'
    });

  } catch (error) {
    logger.error('Bank account verification error', {
      service: 'bank_accounts',
      adminId: req.user?.id,
      accountId: req.params.accountId,
      approved: req.body?.approved,
      reason: req.body?.reason,
      error: error.message,
      ip: req.ip
    });

    let statusCode = 500;
    if (error.message.includes('Cuenta bancaria no encontrada')) {
      statusCode = 404;
    }

    res.status(statusCode).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Obtiene todas las cuentas bancarias pendientes de verificación (solo admins)
 * GET /api/bank-accounts/pending
 */
async function getPendingBankAccounts(req, res) {
  try {
    const { rol } = req.user;

    // Verificar que sea admin
    if (rol !== 'admin') {
      return res.status(403).json({
        error: 'Solo los administradores pueden ver cuentas pendientes',
      });
    }

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const pendingAccounts = await prisma.cuentas_bancarias.findMany({
      where: { estado: 'pendiente' },
      include: {
        profesional: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      },
      orderBy: { creado_en: 'asc' }
    });

    res.json({
      success: true,
      data: pendingAccounts,
    });

  } catch (error) {
    logger.error('Get pending bank accounts error', {
      service: 'bank_accounts',
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
  createBankAccount,
  getBankAccounts,
  updateBankAccount,
  deleteBankAccount,
  verifyBankAccount,
  getPendingBankAccounts,
};
