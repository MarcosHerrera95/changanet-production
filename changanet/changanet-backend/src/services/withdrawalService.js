/**
 * Servicio de solicitudes de retiro
 * Implementa REQ-44: Retiro de fondos a cuenta bancaria
 * Incluye validaciones de fondos, procesamiento de retiros y auditoría
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();

/**
 * Calcula fondos disponibles para retiro de un profesional
 * REQ-44: El profesional debe poder retirar fondos a su cuenta bancaria
 * @param {string} professionalId - ID del profesional
 * @returns {number} Fondos disponibles
 */
async function calculateAvailableFunds(professionalId) {
  try {
    // Suma de pagos liberados (con comisión ya deducida) menos retiros previos
    const payments = await prisma.pagos.findMany({
      where: {
        profesional_id: professionalId,
        estado: 'liberado'
      },
      select: { monto_profesional: true }
    });

    const totalEarned = payments.reduce((sum, payment) => sum + payment.monto_profesional, 0);

    // Restar retiros completados
    const completedWithdrawals = await prisma.retiros.findMany({
      where: {
        profesional_id: professionalId,
        estado: 'completado'
      },
      select: { monto: true }
    });

    const totalWithdrawn = completedWithdrawals.reduce((sum, withdrawal) => sum + withdrawal.monto, 0);

    const availableFunds = totalEarned - totalWithdrawn;

    return Math.max(0, availableFunds); // No permitir fondos negativos
  } catch (error) {
    logger.error('Error calculating available funds', {
      service: 'withdrawals',
      professionalId,
      error: error.message
    });
    return 0;
  }
}

/**
 * Crea una solicitud de retiro
 * @param {string} professionalId - ID del profesional
 * @param {string} bankAccountId - ID de la cuenta bancaria
 * @param {number} amount - Monto a retirar
 * @returns {Object} Solicitud de retiro creada
 */
async function createWithdrawalRequest(professionalId, bankAccountId, amount) {
  try {
    // Verificar que el usuario sea profesional
    const professional = await prisma.usuarios.findUnique({
      where: { id: professionalId },
      select: { rol: true, nombre: true, email: true }
    });

    if (!professional || professional.rol !== 'profesional') {
      throw new Error('Solo los profesionales pueden solicitar retiros');
    }

    // Verificar que la cuenta bancaria pertenezca al profesional y esté verificada
    const bankAccount = await prisma.cuentas_bancarias.findFirst({
      where: {
        id: bankAccountId,
        profesional_id: professionalId,
        estado: 'activa',
        verificado: true
      }
    });

    if (!bankAccount) {
      throw new Error('Cuenta bancaria no encontrada o no verificada');
    }

    // REQ-44: Validar límites de retiro
    const minWithdrawal = parseFloat(process.env.MIN_WITHDRAWAL_AMOUNT || '100'); // Mínimo $100 ARS
    const maxWithdrawal = parseFloat(process.env.MAX_WITHDRAWAL_AMOUNT || '50000'); // Máximo $50,000 ARS

    if (amount < minWithdrawal) {
      throw new Error(`El monto mínimo de retiro es ${minWithdrawal} ARS`);
    }

    if (amount > maxWithdrawal) {
      throw new Error(`El monto máximo de retiro es ${maxWithdrawal} ARS`);
    }

    // Calcular fondos disponibles
    const availableFunds = await calculateAvailableFunds(professionalId);

    if (availableFunds < amount) {
      throw new Error(`Fondos insuficientes. Disponible: ${availableFunds} ARS`);
    }

    // Verificar que no haya retiros pendientes
    const pendingWithdrawal = await prisma.retiros.findFirst({
      where: {
        profesional_id: professionalId,
        estado: { in: ['pendiente', 'procesando'] }
      }
    });

    if (pendingWithdrawal) {
      throw new Error('Ya tienes un retiro pendiente de procesamiento');
    }

    // Crear solicitud de retiro
    const withdrawal = await prisma.retiros.create({
      data: {
        profesional_id: professionalId,
        cuenta_bancaria_id: bankAccountId,
        monto: amount,
        estado: 'pendiente'
      },
      include: {
        cuenta_bancaria: {
          select: {
            banco: true,
            tipo_cuenta: true,
            alias: true,
            titular: true
          }
        }
      }
    });

    // Log de auditoría
    await logTransaction({
      tipo_transaccion: 'withdrawal_requested',
      entidad_tipo: 'retiros',
      entidad_id: withdrawal.id,
      usuario_id: professionalId,
      monto: amount,
      detalles: {
        banco: bankAccount.banco,
        tipo_cuenta: bankAccount.tipo_cuenta,
        availableFunds
      },
      ip_address: null, // Se obtendría del request
      user_agent: null
    });

    // Notificar al profesional
    const { createNotification } = require('./notificationService');
    await createNotification(
      professionalId,
      'retiro_solicitado',
      `Tu solicitud de retiro de ${amount} ARS ha sido registrada y está siendo procesada.`,
      {
        withdrawalId: withdrawal.id,
        amount,
        banco: bankAccount.banco,
        alias: bankAccount.alias
      }
    );

    logger.info('Withdrawal request created successfully', {
      service: 'withdrawals',
      userId: professionalId,
      withdrawalId: withdrawal.id,
      amount,
      banco: bankAccount.banco
    });

    return {
      id: withdrawal.id,
      monto: withdrawal.monto,
      estado: withdrawal.estado,
      fecha_solicitud: withdrawal.fecha_solicitud,
      cuenta_bancaria: withdrawal.cuenta_bancaria
    };

  } catch (error) {
    logger.error('Error creating withdrawal request', {
      service: 'withdrawals',
      userId: professionalId,
      bankAccountId,
      amount,
      error: error.message
    });
    throw error;
  }
}

/**
 * Obtiene las solicitudes de retiro de un profesional
 * @param {string} professionalId - ID del profesional
 * @returns {Array} Lista de solicitudes de retiro
 */
async function getWithdrawalRequests(professionalId) {
  try {
    const withdrawals = await prisma.retiros.findMany({
      where: { profesional_id: professionalId },
      include: {
        cuenta_bancaria: {
          select: {
            banco: true,
            tipo_cuenta: true,
            alias: true,
            titular: true
          }
        }
      },
      orderBy: { fecha_solicitud: 'desc' }
    });

    return withdrawals;
  } catch (error) {
    logger.error('Error getting withdrawal requests', {
      service: 'withdrawals',
      userId: professionalId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Procesa una solicitud de retiro (solo admins)
 * @param {string} withdrawalId - ID del retiro
 * @param {string} adminId - ID del admin
 * @param {string} action - 'approve' o 'reject'
 * @param {string} reason - Motivo si se rechaza
 * @returns {Object} Retiro procesado
 */
async function processWithdrawal(withdrawalId, adminId, action, reason = null) {
  try {
    // Verificar que el retiro existe
    const withdrawal = await prisma.retiros.findUnique({
      where: { id: withdrawalId },
      include: {
        profesional: { select: { nombre: true, email: true } },
        cuenta_bancaria: {
          select: {
            banco: true,
            tipo_cuenta: true,
            alias: true,
            titular: true
          }
        }
      }
    });

    if (!withdrawal) {
      throw new Error('Solicitud de retiro no encontrada');
    }

    if (withdrawal.estado !== 'pendiente') {
      throw new Error('Esta solicitud de retiro ya ha sido procesada');
    }

    const updateData = {
      procesado_por: adminId,
      procesado_en: new Date()
    };

    let notificationType, notificationMessage;

    if (action === 'approve') {
      // Verificar fondos disponibles nuevamente
      const availableFunds = await calculateAvailableFunds(withdrawal.profesional_id);

      if (availableFunds < withdrawal.monto) {
        throw new Error('Fondos insuficientes para procesar el retiro');
      }

      updateData.estado = 'procesando';
      updateData.fecha_procesamiento = new Date();
      // En producción aquí se integraría con el sistema bancario
      updateData.referencia_bancaria = `REF_${Date.now()}`;

      notificationType = 'retiro_aprobado';
      notificationMessage = `Tu retiro de ${withdrawal.monto} ARS ha sido aprobado y está siendo procesado.`;

    } else if (action === 'reject') {
      if (!reason) {
        throw new Error('Se requiere un motivo para rechazar el retiro');
      }

      updateData.estado = 'cancelado';
      updateData.motivo_rechazo = reason;

      notificationType = 'retiro_rechazado';
      notificationMessage = `Tu retiro de ${withdrawal.monto} ARS ha sido rechazado. Motivo: ${reason}`;

    } else {
      throw new Error('Acción inválida. Debe ser "approve" o "reject"');
    }

    const processedWithdrawal = await prisma.retiros.update({
      where: { id: withdrawalId },
      data: updateData,
      include: {
        cuenta_bancaria: {
          select: {
            banco: true,
            tipo_cuenta: true,
            alias: true,
            titular: true
          }
        }
      }
    });

    // Log de auditoría
    await logTransaction({
      tipo_transaccion: action === 'approve' ? 'withdrawal_approved' : 'withdrawal_rejected',
      entidad_tipo: 'retiros',
      entidad_id: withdrawalId,
      usuario_id: adminId,
      monto: withdrawal.monto,
      detalles: {
        action,
        reason,
        banco: withdrawal.cuenta_bancaria.banco,
        profesional: withdrawal.profesional.nombre
      },
      ip_address: null,
      user_agent: null
    });

    // Notificar al profesional
    const { createNotification } = require('./notificationService');
    await createNotification(
      withdrawal.profesional_id,
      notificationType,
      notificationMessage,
      {
        withdrawalId,
        amount: withdrawal.monto,
        action,
        reason,
        banco: withdrawal.cuenta_bancaria.banco
      }
    );

    logger.info('Withdrawal processed successfully', {
      service: 'withdrawals',
      adminId,
      withdrawalId,
      action,
      amount: withdrawal.monto
    });

    return processedWithdrawal;

  } catch (error) {
    logger.error('Error processing withdrawal', {
      service: 'withdrawals',
      adminId,
      withdrawalId,
      action,
      error: error.message
    });
    throw error;
  }
}

/**
 * Completa un retiro procesado (simula recepción bancaria)
 * @param {string} withdrawalId - ID del retiro
 * @param {string} adminId - ID del admin
 * @returns {Object} Retiro completado
 */
async function completeWithdrawal(withdrawalId, adminId) {
  try {
    const withdrawal = await prisma.retiros.findUnique({
      where: { id: withdrawalId },
      include: {
        profesional: { select: { nombre: true, email: true } },
        cuenta_bancaria: {
          select: {
            banco: true,
            alias: true
          }
        }
      }
    });

    if (!withdrawal) {
      throw new Error('Solicitud de retiro no encontrada');
    }

    if (withdrawal.estado !== 'procesando') {
      throw new Error('El retiro debe estar en estado "procesando" para completarse');
    }

    const completedWithdrawal = await prisma.retiros.update({
      where: { id: withdrawalId },
      data: {
        estado: 'completado',
        procesado_por: adminId,
        procesado_en: new Date()
      }
    });

    // Log de auditoría
    await logTransaction({
      tipo_transaccion: 'withdrawal_completed',
      entidad_tipo: 'retiros',
      entidad_id: withdrawalId,
      usuario_id: adminId,
      monto: withdrawal.monto,
      detalles: {
        banco: withdrawal.cuenta_bancaria.banco,
        profesional: withdrawal.profesional.nombre
      },
      ip_address: null,
      user_agent: null
    });

    // Notificar al profesional
    const { createNotification } = require('./notificationService');
    await createNotification(
      withdrawal.profesional_id,
      'retiro_completado',
      `Tu retiro de ${withdrawal.monto} ARS a ${withdrawal.cuenta_bancaria.banco} (${withdrawal.cuenta_bancaria.alias}) ha sido completado exitosamente.`,
      {
        withdrawalId,
        amount: withdrawal.monto,
        banco: withdrawal.cuenta_bancaria.banco,
        alias: withdrawal.cuenta_bancaria.alias
      }
    );

    logger.info('Withdrawal completed successfully', {
      service: 'withdrawals',
      adminId,
      withdrawalId,
      amount: withdrawal.monto
    });

    return completedWithdrawal;

  } catch (error) {
    logger.error('Error completing withdrawal', {
      service: 'withdrawals',
      adminId,
      withdrawalId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Obtiene todas las solicitudes de retiro pendientes (solo admins)
 * @returns {Array} Lista de retiros pendientes
 */
async function getPendingWithdrawals() {
  try {
    const pendingWithdrawals = await prisma.retiros.findMany({
      where: { estado: 'pendiente' },
      include: {
        profesional: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        cuenta_bancaria: {
          select: {
            banco: true,
            tipo_cuenta: true,
            alias: true,
            titular: true
          }
        }
      },
      orderBy: { fecha_solicitud: 'asc' }
    });

    return pendingWithdrawals;
  } catch (error) {
    logger.error('Error getting pending withdrawals', {
      service: 'withdrawals',
      error: error.message
    });
    throw error;
  }
}

/**
 * Función auxiliar para logging de transacciones
 */
async function logTransaction(logData) {
  try {
    await prisma.transactions_log.create({
      data: logData
    });
  } catch (error) {
    logger.error('Error logging transaction', {
      service: 'withdrawals',
      error: error.message
    });
  }
}

module.exports = {
  createWithdrawalRequest,
  getWithdrawalRequests,
  processWithdrawal,
  completeWithdrawal,
  getPendingWithdrawals,
  calculateAvailableFunds,
};
