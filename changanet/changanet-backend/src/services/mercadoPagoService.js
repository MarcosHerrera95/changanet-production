/**
 * Servicio completo de integración con Mercado Pago
 * REQ-41: Integración real con pasarelas de pago
 * REQ-42: Custodia de fondos hasta liberación
 * Implementa sección 7.9 del PRD: Pagos Integrados y Comisiones
 */

const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { invalidatePaymentMetricsCache, invalidateProfessionalIncomeCache } = require('./paymentDashboardService');
const prisma = new PrismaClient();

/**
 * Función auxiliar para logging de transacciones financieras
 */
async function logTransaction(logData) {
  try {
    await prisma.transactions_log.create({
      data: logData
    });
  } catch (error) {
    console.error('Error logging transaction:', error);
  }
}

// Configurar Mercado Pago con el access token
let client = null;
let isConfigured = null;

const configureMercadoPago = () => {
  if (isConfigured !== null) return isConfigured;

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!accessToken) {
    console.warn('⚠️ MERCADO_PAGO_ACCESS_TOKEN no configurado - modo simulado activado');
    isConfigured = false;
    return false;
  }

  try {
    client = new MercadoPagoConfig({
      accessToken: accessToken
    });
    console.log('✅ Mercado Pago configurado correctamente');
    isConfigured = true;
    return true;
  } catch (error) {
    console.error('❌ Error configurando Mercado Pago:', error.message);
    isConfigured = false;
    return false;
  }
};

/**
 * Crear preferencia de pago con custodia de fondos para un servicio
 * REQ-41: Integración con pasarelas de pago
 * REQ-42: Custodia de fondos hasta aprobación
 * @param {Object} paymentData - Datos del pago
 * @param {string} paymentData.serviceId - ID del servicio
 * @param {number} paymentData.amount - Monto en ARS
 * @param {string} paymentData.description - Descripción del servicio
 * @param {Object} paymentData.client - Datos del cliente
 * @param {Object} paymentData.professional - Datos del profesional
 */
exports.createPaymentPreference = async (paymentData) => {
  try {
    const { serviceId, amount, description, client, professional } = paymentData;

    if (!configureMercadoPago()) {
      // Modo simulado para desarrollo
      console.log('🧪 MODO SIMULADO: Creando preferencia de pago simulada');
      return {
        id: `sim_${Date.now()}`,
        init_point: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payments/success?serviceId=${serviceId}`,
        sandbox_init_point: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payments/success?serviceId=${serviceId}`,
        simulated: true
      };
    }

    // Validar montos razonables
    const minPayment = parseFloat(process.env.MIN_PAYMENT_AMOUNT || '500');
    const maxPayment = parseFloat(process.env.MAX_PAYMENT_AMOUNT || '500000');

    if (amount < minPayment) {
      throw new Error(`El monto mínimo de pago es ${minPayment} ARS`);
    }

    if (amount > maxPayment) {
      throw new Error(`El monto máximo de pago es ${maxPayment} ARS`);
    }

    // Según RB-03: La comisión se cobra solo si el servicio se completa
    // En la creación del pago, no deducimos comisión aún
    // La comisión se calculará al liberar fondos cuando el servicio se complete

    // Crear preferencia de pago con custodia de fondos
    const preference = {
      items: [
        {
          id: serviceId,
          title: `Servicio: ${description}`,
          description: `Servicio profesional en Changánet: ${description}`,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: amount
        }
      ],
      payer: {
        name: client.nombre,
        email: client.email,
        identification: {
          type: 'DNI',
          number: client.dni || '12345678'
        }
      },
      binary_mode: true, // Custodia de fondos según REQ-42
      back_urls: {
        success: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payments/success?serviceId=${serviceId}`,
        failure: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payments/failure`,
        pending: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payments/pending`
      },
      auto_return: 'approved',
      external_reference: serviceId,
      notification_url: `${process.env.BACKEND_URL || 'http://localhost:3003'}/api/payments/webhook`,
      metadata: {
        service_id: serviceId,
        client_id: client.id,
        professional_id: professional.id,
        amount: amount,
        created_at: new Date().toISOString()
      }
    };

    const preferenceClient = new Preference(client);
    const response = await preferenceClient.create({ body: preference });

    console.log(`💳 Preferencia de pago creada: ${response.id} para servicio ${serviceId} - Monto: $${amount}`);

    return {
      id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      simulated: false
    };

  } catch (error) {
    console.error('Error creando preferencia de pago:', error);
    throw new Error(`No se pudo crear la preferencia de pago: ${error.message}`);
  }
};

/**
 * Validar firma del webhook de Mercado Pago
 * @param {string} xSignature - Firma del webhook
 * @param {string} xRequestId - ID de la solicitud
 * @param {Object} body - Cuerpo de la solicitud
 * @returns {boolean} True si la firma es válida
 */
const validateWebhookSignature = (xSignature, xRequestId, body) => {
  try {
    if (!xSignature || !xRequestId) {
      console.warn('⚠️ Webhook sin firma o request ID');
      return false;
    }

    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    if (!secret) {
      console.warn('⚠️ MERCADO_PAGO_WEBHOOK_SECRET no configurado - validación de firma omitida');
      return true; // En desarrollo, permitir sin validación
    }

    // Extraer ts y hash de la firma
    const [ts, hash] = xSignature.split(',');
    const timestamp = ts.replace('ts=', '');
    const signature = hash.replace('v1=', '');

    // Crear el payload para verificar
    const payload = `${xRequestId}${JSON.stringify(body)}${timestamp}`;

    // Crear HMAC con SHA256
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const isValid = signature === expectedSignature;

    if (!isValid) {
      console.error('❌ Firma del webhook inválida');
    }

    return isValid;
  } catch (error) {
    console.error('Error validando firma del webhook:', error);
    return false;
  }
};

/**
 * Procesar webhook de Mercado Pago con validación de firma
 * Maneja todos los estados de pago: pending, approved, failed, cancelled, charged_back
 * @param {Object} headers - Headers de la solicitud
 * @param {Object} paymentData - Datos del pago desde webhook
 */
exports.processPaymentWebhook = async (headers, paymentData) => {
  try {
    const { id, status, external_reference, transaction_amount, status_detail } = paymentData;

    // Validar firma del webhook
    const xSignature = headers['x-signature'];
    const xRequestId = headers['x-request-id'];

    if (!validateWebhookSignature(xSignature, xRequestId, paymentData)) {
      throw new Error('Firma del webhook inválida');
    }

    console.log(`💳 Webhook recibido - Pago ${id}: ${status} (${status_detail}) - Servicio: ${external_reference}`);

    // Buscar el pago en la base de datos
    const payment = await prisma.pagos.findFirst({
      where: {
        OR: [
          { mercado_pago_id: id.toString() },
          { servicio_id: external_reference }
        ]
      },
      include: {
        servicio: {
          include: {
            cliente: true,
            profesional: true
          }
        }
      }
    });

    if (!payment) {
      console.warn(`⚠️ Pago no encontrado para Mercado Pago ID: ${id} o servicio: ${external_reference}`);
      return { success: true, message: 'Pago no encontrado en base de datos' };
    }

    const { createNotification } = require('./notificationService');

    // Procesar según el estado del pago
    switch (status) {
      case 'pending':
        await prisma.pagos.update({
          where: { id: payment.id },
          data: {
            estado: 'pendiente',
            mercado_pago_id: id.toString(),
            fecha_pago: new Date(),
            metodo_pago: 'mercadopago'
          }
        });

        // Notificar al cliente que el pago está pendiente
        await createNotification(
          payment.cliente_id,
          'pago_pendiente',
          `Tu pago está siendo procesado. Te notificaremos cuando se complete. Monto: $${payment.monto_total}`,
          { payment_id: payment.id, service_id: external_reference }
        );

        console.log(`⏳ Pago pendiente: ${payment.id}`);
        break;

      case 'approved': {
        await prisma.pagos.update({
          where: { id: payment.id },
          data: {
            estado: 'aprobado',
            mercado_pago_id: id.toString(),
            fecha_pago: new Date(),
            metodo_pago: 'mercadopago'
          }
        });

        // Programar liberación automática de fondos en 24 horas (RB-04)
        const releaseDate = new Date();
        releaseDate.setHours(releaseDate.getHours() + 24);

        await prisma.pagos.update({
          where: { id: payment.id },
          data: {
            fecha_liberacion: releaseDate
          }
        });

        // Notificar al cliente y profesional
        await createNotification(
          payment.cliente_id,
          'pago_aprobado_cliente',
          `¡Pago aprobado! El servicio comenzará pronto. Monto: $${payment.monto_total}`,
          { payment_id: payment.id, service_id: external_reference }
        );

        await createNotification(
          payment.profesional_id,
          'pago_aprobado_profesional',
          `¡Pago aprobado! Los fondos estarán disponibles automáticamente en 24 horas. Monto total: $${payment.monto_total}`,
          { payment_id: payment.id, release_date: releaseDate, service_id: external_reference }
        );

        // Invalidar caché de métricas de pagos y del profesional
        await Promise.all([
          invalidatePaymentMetricsCache(),
          invalidateProfessionalIncomeCache(payment.profesional_id)
        ]);

        console.log(`✅ Pago aprobado y programado para liberación automática en 24h: ${payment.id}`);
        break;
      }

      case 'rejected':
      case 'cancelled':
        await prisma.pagos.update({
          where: { id: payment.id },
          data: {
            estado: 'fallido',
            mercado_pago_id: id.toString(),
            fecha_pago: new Date(),
            metodo_pago: 'mercadopago'
          }
        });

        // Notificar al cliente del fallo
        await createNotification(
          payment.cliente_id,
          'pago_fallido',
          `El pago fue rechazado o cancelado. Por favor, intenta nuevamente. Monto: $${payment.monto_total}`,
          { payment_id: payment.id, service_id: external_reference, reason: status_detail }
        );

        console.log(`❌ Pago fallido: ${payment.id} - Razón: ${status_detail}`);
        break;

      case 'charged_back':
        await prisma.pagos.update({
          where: { id: payment.id },
          data: {
            estado: 'reembolsado',
            mercado_pago_id: id.toString(),
            fecha_pago: new Date(),
            metodo_pago: 'mercadopago'
          }
        });

        // Notificar del contracargo
        await createNotification(
          payment.profesional_id,
          'pago_contracargo',
          `Se ha procesado un contracargo en tu pago. Monto: $${payment.monto_total}`,
          { payment_id: payment.id, service_id: external_reference }
        );

        console.log(`🔄 Contracargo procesado: ${payment.id}`);
        break;

      default:
        console.log(`ℹ️ Estado de pago no manejado: ${status} para pago ${payment.id}`);
        break;
    }

    return { success: true, status: status, paymentId: payment.id };

  } catch (error) {
    console.error('Error procesando webhook de pago:', error);
    throw error;
  }
};

/**
 * Obtener estado de un pago
 * @param {string} paymentId - ID del pago en Mercado Pago
 */
exports.getPaymentStatus = async (paymentId) => {
  try {
    if (!configureMercadoPago()) {
      return { status: 'simulated', simulated: true };
    }

    const paymentClient = new Payment(client);
    const response = await paymentClient.get({ id: paymentId });

    return {
      id: response.id,
      status: response.status,
      status_detail: response.status_detail,
      transaction_amount: response.transaction_amount,
      date_approved: response.date_approved,
      simulated: false
    };

  } catch (error) {
    console.error('Error obteniendo estado del pago:', error);
    throw error;
  }
};

/**
 * Reembolsar un pago
 * @param {string} paymentId - ID del pago a reembolsar
 */
exports.refundPayment = async (paymentId) => {
  try {
    if (!configureMercadoPago()) {
      console.log('🧪 MODO SIMULADO: Reembolso simulado');
      return { success: true, simulated: true };
    }

    const paymentClient = new Payment(client);
    const response = await paymentClient.refund({ id: paymentId });

    // Actualizar estado en base de datos
    await prisma.pagos.updateMany({
      where: { mercado_pago_id: paymentId },
      data: { estado: 'reembolsado' }
    });

    console.log(`💸 Reembolso procesado: ${paymentId}`);
    return { success: true, refund_id: response.id };

  } catch (error) {
    console.error('Error procesando reembolso:', error);
    throw error;
  }
};

/**
 * Liberar fondos de un pago completado
 * Implementa RB-03: Comisión se cobra solo si el servicio se completa
 * @param {string} paymentId - ID del pago en Mercado Pago
 * @param {string} serviceId - ID del servicio
 * @param {string} clientId - ID del cliente (para validación)
 * @returns {Object} Resultado de la liberación
 */
exports.releaseFunds = async (paymentId, serviceId, clientId) => {
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
    const commissionPercentage = commissionSetting.porcentaje / 100;
    const calculatedCommission = totalAmount * commissionPercentage;

    // Aplicar lógica: max(amount * percentage, minimum_fee)
    const minimumFee = parseFloat(process.env.MINIMUM_COMMISSION_FEE || '0');
    const commission = Math.max(Math.round(calculatedCommission), minimumFee);
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
    if (configureMercadoPago()) {
      const paymentClient = new Payment(client);
      await paymentClient.update({
        id: paymentId,
        updatePaymentRequest: {
          status: 'approved',
          marketplace_fee: commission, // Aplicar comisión al liberar fondos
        },
      });
    }

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

    // Log de transacción financiera
    await logTransaction({
      tipo_transaccion: 'funds_released',
      entidad_tipo: 'pagos',
      entidad_id: service.pago.id,
      usuario_id: service.profesional_id,
      monto: professionalAmount,
      detalles: {
        serviceId,
        paymentId,
        totalAmount,
        commission,
        commissionRate: commissionSetting.porcentaje,
        payoutId: payout.id
      },
      ip_address: null,
      user_agent: null
    });

    // Invalidar caché de métricas de pagos y del profesional
    await Promise.all([
      invalidatePaymentMetricsCache(),
      invalidateProfessionalIncomeCache(service.profesional_id)
    ]);

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
};

/**
 * Liberar automáticamente fondos de pagos completados después de 24h de inactividad (RB-04)
 * Esta función debe ser ejecutada periódicamente por un cron job
 * @returns {Object} Resultado de las liberaciones automáticas
 */
exports.autoReleaseFunds = async () => {
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
        const commissionPercentage = commissionSetting.porcentaje / 100;
        const calculatedCommission = totalAmount * commissionPercentage;

        // Aplicar lógica: max(amount * percentage, minimum_fee)
        const minimumFee = parseFloat(process.env.MINIMUM_COMMISSION_FEE || '0');
        const commission = Math.max(Math.round(calculatedCommission), minimumFee);
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

        // Invalidar caché del profesional específico
        await invalidateProfessionalIncomeCache(service.profesional_id);

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
};

/**
 * Permite a profesionales retirar fondos a su cuenta bancaria (REQ-44)
 * @param {string} professionalId - ID del profesional
 * @param {number} amount - Monto a retirar
 * @param {Object} bankDetails - Datos bancarios
 * @returns {Object} Resultado del retiro
 */
exports.withdrawFunds = async (professionalId, amount, bankDetails) => {
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
    const minWithdrawal = parseFloat(process.env.MIN_WITHDRAWAL_AMOUNT || '100');
    const maxWithdrawal = parseFloat(process.env.MAX_WITHDRAWAL_AMOUNT || '50000');

    if (amount < minWithdrawal) {
      throw new Error(`El monto mínimo de retiro es ${minWithdrawal} ARS`);
    }

    if (amount > maxWithdrawal) {
      throw new Error(`El monto máximo de retiro es ${maxWithdrawal} ARS`);
    }

    // Calcular fondos disponibles (pagos liberados menos retiros previos)
    const availableFunds = await this.calculateAvailableFunds(professionalId);

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
};

/**
 * Genera comprobante de pago (REQ-45)
 * @param {string} paymentId - ID del pago
 * @returns {Object} URL del comprobante generado
 */
exports.generatePaymentReceipt = async (paymentId) => {
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
};

/**
 * Calcula fondos disponibles para retiro de un profesional
 * REQ-44: El profesional debe poder retirar fondos a su cuenta bancaria
 * @param {string} professionalId - ID del profesional
 * @returns {number} Fondos disponibles
 */
exports.calculateAvailableFunds = async (professionalId) => {
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
};

module.exports = exports;
