/**
 * Servicio de pagos integrados con Mercado Pago
 * Implementa sección 7.9 del PRD: Pagos Integrados y Comisiones
 * REQ-41: Integración con pasarelas de pago
 * REQ-42: Custodia de fondos
 * REQ-43: Comisión configurable
 * REQ-44: Retiro de fondos
 * REQ-45: Comprobantes de pago
 */

const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configurar Mercado Pago con el access token
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
});

/**
 * Crea una preferencia de pago con custodia de fondos para un servicio
 * @param {Object} paymentData - Datos del pago
 * @param {string} paymentData.serviceId - ID del servicio
 * @param {number} paymentData.amount - Monto en ARS
 * @param {string} paymentData.professionalEmail - Email del profesional
 * @param {string} paymentData.specialty - Especialidad del servicio
 * @param {string} paymentData.clientId - ID del cliente (para validación)
 * @returns {Object} Preferencia de pago creada
 */
async function createPaymentPreference({ serviceId, amount, professionalEmail, specialty, clientId }) {
  try {
    // Validar que el servicio pertenece al cliente
    const service = await prisma.servicios.findUnique({
      where: { id: serviceId },
      include: {
        cliente: true,
        profesional: true,
      },
    });

    if (!service) {
      throw new Error('Servicio no encontrado');
    }

    if (service.cliente_id !== clientId) {
      throw new Error('No tienes permiso para crear un pago para este servicio');
    }

    if (service.estado !== 'PENDIENTE') {
      throw new Error('El servicio debe estar en estado pendiente para crear un pago');
    }

    // Validar que el profesional existe y está verificado
    if (!service.profesional || service.profesional.rol !== 'profesional') {
      throw new Error('El profesional asignado no es válido');
    }

    // Validar montos razonables
    const minPayment = parseFloat(process.env.MIN_PAYMENT_AMOUNT || '500'); // Mínimo $500 ARS
    const maxPayment = parseFloat(process.env.MAX_PAYMENT_AMOUNT || '500000'); // Máximo $500,000 ARS

    if (amount < minPayment) {
      throw new Error(`El monto mínimo de pago es ${minPayment} ARS`);
    }

    if (amount > maxPayment) {
      throw new Error(`El monto máximo de pago es ${maxPayment} ARS`);
    }

    // Según RB-03: La comisión se cobra solo si el servicio se completa
    // En la creación del pago, no deducimos comisión aún
    // La comisión se calculará al liberar fondos cuando el servicio se complete

    // Crear registro de pago en base de datos (sin comisión inicial)
    const paymentRecord = await prisma.pagos.create({
      data: {
        servicio_id: serviceId,
        cliente_id: clientId,
        profesional_id: service.profesional_id,
        monto_total: amount,
        comision_plataforma: 0, // Se calculará al completar el servicio
        monto_profesional: amount, // Monto completo inicialmente
        estado: 'pendiente',
        metodo_pago: 'mercado_pago',
      },
    });

    // Crear preferencia de pago
    // Según RB-03: No cobramos comisión hasta que el servicio se complete
    const preference = {
      items: [
        {
          id: serviceId,
          title: `Servicio de ${specialty}`,
          description: `Servicio de ${specialty} - Changánet`,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: amount,
        },
      ],
      payer: {
        email: professionalEmail,
      },
      binary_mode: true, // Custodia de fondos según REQ-42
      // marketplace_fee se aplicará al liberar fondos cuando el servicio se complete
      back_urls: {
        success: `${process.env.FRONTEND_URL}/payments/success?serviceId=${serviceId}`,
        failure: `${process.env.FRONTEND_URL}/payments/failure`,
        pending: `${process.env.FRONTEND_URL}/payments/pending`,
      },
      auto_return: 'approved',
      external_reference: serviceId,
      notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
    };

    const preferenceClient = new Preference(client);
    const response = await preferenceClient.create({ body: preference });

    // Actualizar registro con ID de Mercado Pago
    await prisma.pagos.update({
      where: { id: paymentRecord.id },
      data: { mercado_pago_id: response.body.id },
    });

    return {
      preferenceId: response.body.id,
      initPoint: response.body.init_point,
      sandboxInitPoint: response.body.sandbox_init_point,
      paymentRecordId: paymentRecord.id,
    };
  } catch (error) {
    console.error('Error creando preferencia de pago:', error);
    throw error;
  }
}

/**
 * Libera los fondos de un pago completado
 * Implementa RB-03: La comisión se cobra solo si el servicio se completa
 * @param {string} paymentId - ID del pago en Mercado Pago
 * @param {string} serviceId - ID del servicio
 * @param {string} clientId - ID del cliente (para validación)
 * @returns {Object} Resultado de la liberación
 */
async function releaseFunds(paymentId, serviceId, clientId) {
  try {
    // Validar que el servicio pertenece al cliente
    const service = await prisma.servicios.findUnique({
      where: { id: serviceId },
      include: {
        cliente: true,
        pago: true,
      },
    });

    if (!service) {
      throw new Error('Servicio no encontrado');
    }

    if (service.cliente_id !== clientId) {
      throw new Error('No tienes permiso para liberar fondos de este servicio');
    }

    if (service.estado !== 'COMPLETADO') {
      throw new Error('El servicio debe estar completado para liberar fondos');
    }

    if (!service.pago) {
      throw new Error('No se encontró el registro de pago para este servicio');
    }

    // Obtener configuración de comisión aplicable
    const { getApplicableCommission } = require('./commissionService');
    const commissionSetting = await getApplicableCommission();

    const totalAmount = service.pago.monto_total;
    const commission = Math.round(totalAmount * (commissionSetting.porcentaje / 100));
    const professionalAmount = totalAmount - commission;

    // Actualizar el registro de pago con la comisión calculada
    await prisma.pagos.update({
      where: { id: service.pago.id },
      data: {
        comision_plataforma: commission,
        monto_profesional: professionalAmount,
        estado: 'liberado',
        fecha_liberacion: new Date(),
        commission_setting_id: commissionSetting.id
      },
    });

    // Liberar fondos usando la API de Mercado Pago con marketplace_fee
    const paymentClient = new Payment(client);
    const response = await paymentClient.update({
      id: paymentId,
      updatePaymentRequest: {
        status: 'approved',
        marketplace_fee: commission, // Aplicar comisión al liberar fondos
      },
    });

    // Actualizar estado del servicio
    await prisma.servicios.update({
      where: { id: serviceId },
      data: {
        estado: 'pagado',
      },
    });

    // Crear registro de payout
    const { createPayout } = require('./payoutService');
    const payout = await createPayout(
      service.profesional_id,
      serviceId,
      totalAmount,
      commission,
      professionalAmount,
      'platform_manual_release'
    );

    // Notificar al profesional sobre la liberación de fondos
    const { createNotification } = require('./notificationService');
    await createNotification(
      service.profesional_id,
      'fondos_liberados',
      `¡Fondos liberados! Recibiste $${professionalAmount} (comisión ${commissionSetting.porcentaje * 100}% = $${commission} deducida).`,
      { serviceId, paymentId, amount: professionalAmount, commission, payoutId: payout.id }
    );

    return {
      success: true,
      paymentId,
      serviceId,
      totalAmount,
      commission,
      professionalAmount,
      releasedAt: new Date(),
    };
  } catch (error) {
    console.error('Error liberando fondos:', error);
    throw error;
  }
}

/**
 * Obtiene el estado de un pago
 * @param {string} paymentId - ID del pago en Mercado Pago
 * @returns {Object} Estado del pago
 */
async function getPaymentStatus(paymentId) {
  try {
    const paymentClient = new Payment(client);
    const response = await paymentClient.get({ id: paymentId });
    return response;
  } catch (error) {
    console.error('Error obteniendo estado del pago:', error);
    throw error;
  }
}

/**
 * Libera automáticamente fondos de pagos completados después de 24h de inactividad (RB-04)
 * Esta función debe ser ejecutada periódicamente por un cron job
 * Crea registros de payout automáticamente
 * @returns {Object} Resultado de las liberaciones automáticas
 */
async function autoReleaseFunds() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Buscar servicios completados hace más de 24h sin liberación manual
    const servicesToRelease = await prisma.servicios.findMany({
      where: {
        estado: 'COMPLETADO',
        completado_en: {
          lt: twentyFourHoursAgo,
        },
        pago: {
          estado: 'aprobado', // Solo liberar pagos que están en custodia
          fecha_liberacion: null // Que no hayan sido liberados aún
        }
      },
      include: {
        cliente: true,
        profesional: true,
        pago: true,
      },
    });

    const results = [];

    for (const service of servicesToRelease) {
      try {
        const payment = service.pago;

        if (!payment) {
          console.warn(`No se encontró pago aprobado para servicio ${service.id}, saltando liberación automática`);
          results.push({
            serviceId: service.id,
            status: 'skipped',
            reason: 'no approved payment found'
          });
          continue;
        }

        // Verificar que no haya un escrow_release_deadline configurado que aún no haya expirado
        if (payment.escrow_release_deadline && payment.escrow_release_deadline > new Date()) {
          console.log(`Servicio ${service.id} tiene deadline de liberación pendiente, saltando`);
          results.push({
            serviceId: service.id,
            status: 'skipped',
            reason: 'escrow deadline not reached'
          });
          continue;
        }

        // Obtener configuración de comisión aplicable
        const { getApplicableCommission } = require('./commissionService');
        const commissionSetting = await getApplicableCommission();

        const totalAmount = payment.monto_total;
        const commission = Math.round(totalAmount * (commissionSetting.porcentaje / 100));
        const professionalAmount = totalAmount - commission;

        // Actualizar el pago con comisión y liberación
        await prisma.pagos.update({
          where: { id: payment.id },
          data: {
            comision_plataforma: commission,
            monto_profesional: professionalAmount,
            estado: 'liberado',
            fecha_liberacion: new Date(),
            commission_setting_id: commissionSetting.id
          },
        });

        // Actualizar estado del servicio
        await prisma.servicios.update({
          where: { id: service.id },
          data: {
            estado: 'pagado',
          },
        });

        // Crear registro de payout automáticamente
        const { createPayout } = require('./payoutService');
        const payout = await createPayout(
          service.profesional_id,
          service.id,
          totalAmount,
          commission,
          professionalAmount,
          'platform_auto_release'
        );

        // Enviar notificación al profesional
        const { createNotification } = require('./notificationService');
        await createNotification(
          service.profesional_id,
          'fondos_liberados_auto',
          `Los fondos del servicio completado han sido liberados automáticamente después de 24h. Recibiste $${professionalAmount} (comisión ${commissionSetting.porcentaje * 100}% = $${commission} deducida).`,
          {
            serviceId: service.id,
            amount: professionalAmount,
            commission,
            commissionRate: commissionSetting.porcentaje,
            payoutId: payout.id
          }
        );

        results.push({
          serviceId: service.id,
          payoutId: payout.id,
          status: 'released',
          totalAmount,
          commission,
          professionalAmount,
          commissionRate: commissionSetting.porcentaje,
          releasedAt: new Date(),
        });

        console.log(`💰 Fondos liberados automáticamente para servicio ${service.id} - Monto profesional: $${professionalAmount} - Payout ID: ${payout.id}`);
      } catch (error) {
        console.error(`Error liberando fondos para servicio ${service.id}:`, error);
        results.push({
          serviceId: service.id,
          status: 'error',
          error: error.message,
        });
      }
    }

    return {
      success: true,
      processed: results.length,
      releasedCount: results.filter(r => r.status === 'released').length,
      skippedCount: results.filter(r => r.status === 'skipped').length,
      errorCount: results.filter(r => r.status === 'error').length,
      results,
    };
  } catch (error) {
    console.error('Error en liberación automática de fondos:', error);
    throw error;
  }
}

/**
 * Permite a profesionales retirar fondos a su cuenta bancaria (REQ-44)
 * @param {string} professionalId - ID del profesional
 * @param {number} amount - Monto a retirar
 * @param {Object} bankDetails - Datos bancarios
 * @returns {Object} Resultado del retiro
 */
async function withdrawFunds(professionalId, amount, bankDetails) {
  try {
    // Verificar que el usuario sea profesional
    const professional = await prisma.usuarios.findUnique({
      where: { id: professionalId },
      select: { rol: true, nombre: true, email: true }
    });

    if (!professional || professional.rol !== 'profesional') {
      throw new Error('Solo los profesionales pueden retirar fondos');
    }

    // REQ-44: Validar límites de retiro según configuración del sistema
    const minWithdrawal = parseFloat(process.env.MIN_WITHDRAWAL_AMOUNT || '100'); // Mínimo $100 ARS
    const maxWithdrawal = parseFloat(process.env.MAX_WITHDRAWAL_AMOUNT || '50000'); // Máximo $50,000 ARS

    if (amount < minWithdrawal) {
      throw new Error(`El monto mínimo de retiro es ${minWithdrawal} ARS`);
    }

    if (amount > maxWithdrawal) {
      throw new Error(`El monto máximo de retiro es ${maxWithdrawal} ARS`);
    }

    // Calcular fondos disponibles (pagos liberados menos retiros previos)
    const availableFunds = await calculateAvailableFunds(professionalId);

    if (availableFunds < amount) {
      throw new Error('Fondos insuficientes para el retiro solicitado');
    }

    // REQ-44: Validar datos bancarios requeridos
    if (!bankDetails || !bankDetails.cvu || !bankDetails.alias) {
      throw new Error('Se requieren datos bancarios completos (CVU y alias)');
    }

    // Validar formato básico del CVU (22 dígitos numéricos)
    const cvuRegex = /^[0-9]{22}$/;
    if (!cvuRegex.test(bankDetails.cvu)) {
      throw new Error('El CVU debe tener exactamente 22 dígitos');
    }

    // Validar alias bancario
    if (!bankDetails.alias || bankDetails.alias.length < 3) {
      throw new Error('El alias bancario es requerido y debe tener al menos 3 caracteres');
    }

    // En una implementación real, aquí se integraría con el sistema bancario
    // Por ahora, simulamos el retiro y registramos la transacción

    // Crear registro de retiro (en producción se guardaría en tabla de retiros)
    const withdrawalId = `wd_${Date.now()}`;
    
    // Para trazabilidad, podríamos agregar una tabla retiros:
    // await prisma.retiros.create({
    //   data: {
    //     id: withdrawalId,
    //     profesional_id: professionalId,
    //     monto: amount,
    //     cvu: bankDetails.cvu,
    //     alias: bankDetails.alias,
    //     estado: 'procesando',
    //     creado_en: new Date()
    //   }
    // });

    // Enviar notificación de retiro exitoso
    const { createNotification } = require('./notificationService');
    await createNotification(
      professionalId,
      'retiro_exitoso',
      `Se ha procesado tu retiro de ${amount} a tu cuenta bancaria (alias: ${bankDetails.alias}).`,
      { 
        withdrawalId, 
        amount, 
        bankDetails: { 
          ...bankDetails, 
          cvu: `***${bankDetails.cvu.slice(-4)}`, // Solo mostrar últimos 4 dígitos
          masked: true 
        } 
      }
    );

    console.log(`💳 Retiro procesado: ${withdrawalId} - Profesional: ${professionalId} - Monto: ${amount}`);

    return {
      success: true,
      withdrawalId,
      amount,
      processedAt: new Date(),
      estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 días hábiles
      bankDetails: {
        alias: bankDetails.alias,
        cvuMasked: `***${bankDetails.cvu.slice(-4)}`
      }
    };
  } catch (error) {
    console.error('Error en retiro de fondos:', error);
    throw error;
  }
}

/**
 * Genera comprobante de pago (REQ-45)
 * @param {string} paymentId - ID del pago
 * @returns {Object} URL del comprobante generado
 */
async function generatePaymentReceipt(paymentId) {
  try {
    // Buscar el pago
    const payment = await prisma.pagos.findUnique({
      where: { id: paymentId },
      include: {
        servicio: {
          include: {
            cliente: { select: { nombre: true, email: true } },
            profesional: { select: { nombre: true, email: true } }
          }
        }
      }
    });

    if (!payment) {
      throw new Error('Pago no encontrado');
    }

    // En una implementación real, aquí se generaría un PDF con los detalles
    // Por ahora, devolvemos una URL simulada

    const receiptUrl = `${process.env.FRONTEND_URL}/receipts/${paymentId}`;

    // Actualizar el pago con la URL del comprobante
    await prisma.pagos.update({
      where: { id: paymentId },
      data: { url_comprobante: receiptUrl }
    });

    return {
      success: true,
      receiptUrl,
      paymentId,
      generatedAt: new Date(),
    };
  } catch (error) {
    console.error('Error generando comprobante:', error);
    throw error;
  }
}

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

    // En una implementación completa, restaríamos retiros previos desde una tabla de retiros
    // Por ahora, devolvemos el total disponible para retiro
    return totalEarned;
  } catch (error) {
    console.error('Error calculando fondos disponibles:', error);
    return 0;
  }
}

module.exports = {
  createPaymentPreference,
  releaseFunds,
  getPaymentStatus,
  autoReleaseFunds,
  withdrawFunds,
  generatePaymentReceipt,
  calculateAvailableFunds,
};
