/**
 * Servicio de pagos a profesionales (payouts)
 * Implementa REQ-42: Custodia de fondos y liberación a profesionales
 * Registra pagos realizados después de liberación de fondos en custodia
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();

/**
 * Crea un registro de payout cuando se liberan fondos
 * @param {string} professionalId - ID del profesional
 * @param {string} serviceId - ID del servicio (opcional)
 * @param {number} grossAmount - Monto bruto antes de deducciones
 * @param {number} commissionAmount - Comisión deducida
 * @param {number} netAmount - Monto neto pagado al profesional
 * @param {string} paymentMethod - Método de pago usado
 * @param {boolean} asyncProcessing - Si procesar de forma asíncrona (default: true)
 * @returns {Object} Payout creado
 */
async function createPayout(professionalId, serviceId, grossAmount, commissionAmount, netAmount, paymentMethod = 'bank_transfer', asyncProcessing = true) {
  try {
    // Verificar que el usuario sea profesional
    const professional = await prisma.usuarios.findUnique({
      where: { id: professionalId },
      select: { rol: true, nombre: true, email: true }
    });

    if (!professional || professional.rol !== 'profesional') {
      throw new Error('Solo se pueden crear payouts para profesionales');
    }

    // Validar montos
    if (grossAmount <= 0 || commissionAmount < 0 || netAmount <= 0) {
      throw new Error('Los montos deben ser positivos');
    }

    if (netAmount !== (grossAmount - commissionAmount)) {
      throw new Error('El monto neto debe ser igual al monto bruto menos la comisión');
    }

    // Crear registro de payout
    const payout = await prisma.payouts.create({
      data: {
        profesional_id: professionalId,
        servicio_id: serviceId,
        monto_bruto: grossAmount,
        comision_plataforma: commissionAmount,
        monto_neto: netAmount,
        metodo_pago: paymentMethod,
        estado: 'pendiente' // Inicialmente pendiente hasta que se procese
      },
      include: {
        profesional: {
          select: {
            nombre: true,
            email: true
          }
        },
        servicio: serviceId ? {
          select: {
            descripcion: true,
            cliente: {
              select: {
                nombre: true
              }
            }
          }
        } : false
      }
    });

    // Log de auditoría
    await logTransaction({
      tipo_transaccion: 'payout_created',
      entidad_tipo: 'payouts',
      entidad_id: payout.id,
      usuario_id: professionalId,
      monto: netAmount,
      detalles: {
        grossAmount,
        commissionAmount,
        netAmount,
        paymentMethod,
        serviceId
      },
      ip_address: null,
      user_agent: null
    });

    // Procesamiento asíncrono con colas si está habilitado
    if (asyncProcessing) {
      try {
        const { enqueuePayout } = require('./queueService');
        await enqueuePayout({
          id: payout.id,
          professionalId,
          serviceId,
          grossAmount,
          commissionAmount,
          netAmount,
          paymentMethod
        });
      } catch (queueError) {
        logger.warn('Error encolando payout, procesando de forma síncrona', {
          service: 'payouts',
          payoutId: payout.id,
          error: queueError.message
        });
        // Procesar inmediatamente si falla la cola
        await processPayoutImmediately(payout.id);
      }
    }

    logger.info('Payout created successfully', {
      service: 'payouts',
      professionalId,
      payoutId: payout.id,
      netAmount,
      serviceId,
      asyncProcessing
    });

    return payout;

  } catch (error) {
    logger.error('Error creating payout', {
      service: 'payouts',
      professionalId,
      serviceId,
      grossAmount,
      commissionAmount,
      netAmount,
      error: error.message
    });
    throw error;
  }
}

/**
 * Procesa un payout (marca como completado)
 * @param {string} payoutId - ID del payout
 * @param {string} adminId - ID del admin que procesa
 * @param {string} reference - Referencia bancaria opcional
 * @returns {Object} Payout procesado
 */
async function processPayout(payoutId, adminId, reference = null) {
  try {
    // Verificar que el payout existe
    const payout = await prisma.payouts.findUnique({
      where: { id: payoutId },
      include: {
        profesional: {
          select: {
            nombre: true,
            email: true
          }
        }
      }
    });

    if (!payout) {
      throw new Error('Payout no encontrado');
    }

    if (payout.estado !== 'pendiente') {
      throw new Error('El payout ya ha sido procesado');
    }

    // Actualizar payout como completado
    const processedPayout = await prisma.payouts.update({
      where: { id: payoutId },
      data: {
        estado: 'completado',
        referencia_pago: reference,
        fecha_pago: new Date(),
        procesado_en: new Date()
      },
      include: {
        profesional: {
          select: {
            nombre: true,
            email: true
          }
        },
        servicio: payout.servicio_id ? {
          select: {
            descripcion: true
          }
        } : false
      }
    });

    // Log de auditoría
    await logTransaction({
      tipo_transaccion: 'payout_processed',
      entidad_tipo: 'payouts',
      entidad_id: payoutId,
      usuario_id: adminId,
      monto: payout.monto_neto,
      detalles: {
        reference,
        professionalName: payout.profesional.nombre
      },
      ip_address: null,
      user_agent: null
    });

    // Notificar al profesional
    const { createNotification } = require('./notificationService');
    await createNotification(
      payout.profesional_id,
      'pago_recibido',
      `Has recibido un pago de ${payout.monto_neto} ARS. ${reference ? `Referencia: ${reference}` : ''}`,
      {
        payoutId,
        amount: payout.monto_neto,
        reference,
        serviceId: payout.servicio_id
      }
    );

    logger.info('Payout processed successfully', {
      service: 'payouts',
      adminId,
      payoutId,
      amount: payout.monto_neto,
      professionalId: payout.profesional_id
    });

    return processedPayout;

  } catch (error) {
    logger.error('Error processing payout', {
      service: 'payouts',
      adminId,
      payoutId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Obtiene payouts de un profesional
 * @param {string} professionalId - ID del profesional
 * @param {Object} filters - Filtros opcionales
 * @returns {Array} Lista de payouts
 */
async function getPayouts(professionalId, filters = {}) {
  try {
    const whereClause = {
      profesional_id: professionalId
    };

    // Aplicar filtros
    if (filters.status) {
      whereClause.estado = filters.status;
    }

    if (filters.serviceId) {
      whereClause.servicio_id = filters.serviceId;
    }

    if (filters.dateFrom) {
      whereClause.fecha_pago = {
        ...whereClause.fecha_pago,
        gte: new Date(filters.dateFrom)
      };
    }

    if (filters.dateTo) {
      whereClause.fecha_pago = {
        ...whereClause.fecha_pago,
        lte: new Date(filters.dateTo)
      };
    }

    const payouts = await prisma.payouts.findMany({
      where: whereClause,
      include: {
        servicio: {
          select: {
            descripcion: true,
            cliente: {
              select: {
                nombre: true
              }
            }
          }
        }
      },
      orderBy: { creado_en: 'desc' }
    });

    return payouts;

  } catch (error) {
    logger.error('Error getting payouts', {
      service: 'payouts',
      professionalId,
      filters,
      error: error.message
    });
    throw error;
  }
}

/**
 * Obtiene un payout específico
 * @param {string} payoutId - ID del payout
 * @param {string} professionalId - ID del profesional (para verificación)
 * @returns {Object} Payout encontrado
 */
async function getPayoutById(payoutId, professionalId) {
  try {
    const payout = await prisma.payouts.findFirst({
      where: {
        id: payoutId,
        profesional_id: professionalId
      },
      include: {
        servicio: {
          select: {
            descripcion: true,
            cliente: {
              select: {
                nombre: true
              }
            }
          }
        }
      }
    });

    if (!payout) {
      throw new Error('Payout no encontrado');
    }

    return payout;

  } catch (error) {
    logger.error('Error getting payout by ID', {
      service: 'payouts',
      payoutId,
      professionalId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Obtiene todos los payouts pendientes (solo admins)
 * @returns {Array} Lista de payouts pendientes
 */
async function getPendingPayouts() {
  try {
    const pendingPayouts = await prisma.payouts.findMany({
      where: { estado: 'pendiente' },
      include: {
        profesional: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        servicio: {
          select: {
            descripcion: true,
            cliente: {
              select: {
                nombre: true
              }
            }
          }
        }
      },
      orderBy: { creado_en: 'asc' }
    });

    return pendingPayouts;

  } catch (error) {
    logger.error('Error getting pending payouts', {
      service: 'payouts',
      error: error.message
    });
    throw error;
  }
}

/**
 * Calcula estadísticas de payouts para un profesional
 * @param {string} professionalId - ID del profesional
 * @returns {Object} Estadísticas de payouts
 */
async function getPayoutStats(professionalId) {
  try {
    // Total de payouts completados
    const completedPayouts = await prisma.payouts.count({
      where: {
        profesional_id: professionalId,
        estado: 'completado'
      }
    });

    // Suma total de montos netos pagados
    const totalResult = await prisma.payouts.aggregate({
      where: {
        profesional_id: professionalId,
        estado: 'completado'
      },
      _sum: {
        monto_neto: true,
        comision_plataforma: true
      }
    });

    const totalPaid = totalResult._sum.monto_neto || 0;
    const totalCommission = totalResult._sum.comision_plataforma || 0;

    // Payout más reciente
    const latestPayout = await prisma.payouts.findFirst({
      where: {
        profesional_id: professionalId,
        estado: 'completado'
      },
      orderBy: { fecha_pago: 'desc' },
      select: {
        fecha_pago: true,
        monto_neto: true
      }
    });

    // Payouts pendientes
    const pendingPayouts = await prisma.payouts.count({
      where: {
        profesional_id: professionalId,
        estado: 'pendiente'
      }
    });

    return {
      totalPayouts: completedPayouts,
      totalPaid,
      totalCommission,
      pendingPayouts,
      latestPayout: latestPayout ? {
        date: latestPayout.fecha_pago,
        amount: latestPayout.monto_neto
      } : null,
      averagePayout: completedPayouts > 0 ? totalPaid / completedPayouts : 0
    };

  } catch (error) {
    logger.error('Error getting payout stats', {
      service: 'payouts',
      professionalId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Obtiene estadísticas globales de payouts (solo admins)
 * @returns {Object} Estadísticas globales
 */
async function getGlobalPayoutStats() {
  try {
    // Total de payouts completados
    const totalCompleted = await prisma.payouts.count({
      where: { estado: 'completado' }
    });

    // Suma total de pagos realizados
    const totalResult = await prisma.payouts.aggregate({
      where: { estado: 'completado' },
      _sum: {
        monto_neto: true,
        comision_plataforma: true
      }
    });

    const totalPaid = totalResult._sum.monto_neto || 0;
    const totalCommission = totalResult._sum.comision_plataforma || 0;

    // Payouts pendientes
    const pendingCount = await prisma.payouts.count({
      where: { estado: 'pendiente' }
    });

    // Payouts fallidos
    const failedCount = await prisma.payouts.count({
      where: { estado: 'fallido' }
    });

    return {
      totalCompleted,
      totalPaid,
      totalCommission,
      pendingCount,
      failedCount,
      averagePayout: totalCompleted > 0 ? totalPaid / totalCompleted : 0
    };

  } catch (error) {
    logger.error('Error getting global payout stats', {
      service: 'payouts',
      error: error.message
    });
    throw error;
  }
}

/**
 * Procesa un payout inmediatamente (para fallback cuando falla la cola)
 * @param {string} payoutId - ID del payout
 */
async function processPayoutImmediately(payoutId) {
  try {
    // Marcar payout como procesando
    await prisma.payouts.update({
      where: { id: payoutId },
      data: { estado: 'procesando' }
    });

    // Simular procesamiento (en producción aquí iría la integración bancaria)
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay

    // Marcar como completado
    const processedPayout = await prisma.payouts.update({
      where: { id: payoutId },
      data: {
        estado: 'completado',
        fecha_pago: new Date(),
        procesado_en: new Date(),
        referencia_pago: `AUTO_${Date.now()}`
      },
      include: {
        profesional: {
          select: {
            nombre: true,
            email: true
          }
        }
      }
    });

    // Log de transacción
    await logTransaction({
      tipo_transaccion: 'payout_processed_auto',
      entidad_tipo: 'payouts',
      entidad_id: payoutId,
      usuario_id: processedPayout.profesional_id,
      monto: processedPayout.monto_neto,
      detalles: {
        automatic: true,
        reference: processedPayout.referencia_pago
      },
      ip_address: null,
      user_agent: null
    });

    // Notificar al profesional
    const { createNotification } = require('./notificationService');
    await createNotification(
      processedPayout.profesional_id,
      'pago_recibido_auto',
      `Tu payout por $${processedPayout.monto_neto} ha sido procesado automáticamente.`,
      {
        payoutId,
        amount: processedPayout.monto_neto,
        reference: processedPayout.referencia_pago
      }
    );

    logger.info('Payout processed immediately (fallback)', {
      service: 'payouts',
      payoutId,
      amount: processedPayout.monto_neto
    });

  } catch (error) {
    // Marcar como fallido
    await prisma.payouts.update({
      where: { id: payoutId },
      data: { estado: 'fallido' }
    });

    logger.error('Error processing payout immediately', {
      service: 'payouts',
      payoutId,
      error: error.message
    });
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
      service: 'payouts',
      error: error.message
    });
  }
}

module.exports = {
  createPayout,
  processPayout,
  getPayouts,
  getPayoutById,
  getPendingPayouts,
  getPayoutStats,
  getGlobalPayoutStats,
};
