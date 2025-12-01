/**
 * Controlador de pagos integrados
 * Implementa sección 7.9 del PRD: Pagos Integrados y Comisiones
 * REQ-41: Integración con pasarelas de pago
 * REQ-42: Custodia de fondos hasta aprobación
 * REQ-43: Comisión configurable (5-10%)
 * REQ-44: Retiro de fondos por profesionales
 * REQ-45: Generación de comprobantes
 */

const mercadoPagoService = require('../services/mercadoPagoService');
const receiptService = require('../services/receiptService');
const logger = require('../services/logger');
const {
  incrementPaymentProcessed,
  recordPaymentProcessingDuration,
  recordPaymentAmount,
  incrementPaymentError,
  incrementWebhookProcessed
} = require('../services/metricsService');

/**
 * Crea una preferencia de pago con custodia de fondos
 * REQ-41: Integración con pasarelas de pago
 * REQ-42: Custodia de fondos hasta aprobación
 * REQ-43: Comisión configurable (10%)
 */
async function createPaymentPreference(req, res) {
  const startTime = Date.now();
  try {
    const { serviceId } = req.body;
    const clientId = req.user.id; // Obtenido del middleware de autenticación

    // Validar campos requeridos
    if (!serviceId) {
      logger.warn('Payment preference creation failed: missing serviceId', {
        service: 'payments',
        userId: clientId,
        serviceId,
        ip: req.ip
      });
      incrementPaymentError('missing_service_id', 'payment_controller');
      return res.status(400).json({
        error: 'Falta campo requerido: serviceId',
      });
    }

    // Obtener detalles del servicio
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const service = await prisma.servicios.findUnique({
      where: { id: serviceId },
      include: {
        cliente: true,
        profesional: {
          include: {
            perfil_profesional: true
          }
        },
        pago: true
      }
    });

    if (!service) {
      return res.status(404).json({
        error: 'Servicio no encontrado',
      });
    }

    // Verificar que el cliente sea el propietario del servicio
    if (service.cliente_id !== clientId) {
      return res.status(403).json({
        error: 'No tienes permiso para pagar este servicio',
      });
    }

    // Verificar que no haya un pago ya creado
    if (service.pago) {
      return res.status(400).json({
        error: 'Ya existe un pago para este servicio',
      });
    }

    // Calcular monto total (debe venir del frontend o calcularse)
    let amount = req.body.amount || service.profesional.perfil_profesional?.tarifa_hora || 1000;

    // Aplicar recargo por servicio urgente - Sección 10 del PRD
    if (service.es_urgente) {
      const urgentSurcharge = parseFloat(process.env.URGENT_SERVICE_SURCHARGE || '0.2'); // 20% por defecto
      amount = amount * (1 + urgentSurcharge);
      console.log(`🔥 Servicio urgente detectado - Aplicando recargo del ${urgentSurcharge * 100}%: $${amount}`);
    }

    // Crear preferencia de pago con Mercado Pago
    const preference = await mercadoPagoService.createPaymentPreference({
      serviceId,
      amount,
      description: service.descripcion,
      client: {
        id: service.cliente.id,
        nombre: service.cliente.nombre,
        email: service.cliente.email
      },
      professional: {
        id: service.profesional.id,
        nombre: service.profesional.nombre,
        email: service.profesional.email
      }
    });

    // Crear registro de pago en custodia
    // Según RB-03: Comisión se calcula al liberar fondos, no aquí
    const commission = 0; // Se calculará al completar el servicio
    const professionalAmount = amount; // Monto completo inicialmente

    const payment = await prisma.pagos.create({
      data: {
        servicio_id: serviceId,
        cliente_id: clientId,
        profesional_id: service.profesional.id,
        monto_total: amount,
        comision_plataforma: commission,
        monto_profesional: professionalAmount,
        estado: 'pendiente',
        mercado_pago_preference_id: preference.id
      }
    });

    // Log de transacción financiera
    const prismaLog = new PrismaClient();
    await prismaLog.transactions_log.create({
      data: {
        tipo_transaccion: 'payment_preference_created',
        entidad_tipo: 'pagos',
        entidad_id: payment.id,
        usuario_id: clientId,
        monto: amount,
        detalles: {
          serviceId,
          mercadoPagoPreferenceId: preference.id,
          simulated: preference.simulated || false
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      }
    });

    // Registrar métricas de éxito
    const duration = (Date.now() - startTime) / 1000;
    recordPaymentProcessingDuration('create_preference', true, duration);
    recordPaymentAmount(amount, 'servicio');
    incrementPaymentProcessed('pendiente', 'mercadopago', 'general');

    logger.info('Payment preference created successfully', {
      service: 'payments',
      userId: clientId,
      serviceId,
      amount,
      preferenceId: preference.id,
      paymentId: payment.id,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      data: {
        ...preference,
        paymentId: payment.id
      },
    });
  } catch (error) {
    // Registrar métricas de error
    const duration = (Date.now() - startTime) / 1000;
    recordPaymentProcessingDuration('create_preference', false, duration);
    incrementPaymentError('create_preference_failed', 'payment_controller');

    logger.error('Payment preference creation error', {
      service: 'payments',
      userId: req.user?.id,
      serviceId: req.body.serviceId,
      error,
      ip: req.ip
    });
    res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Libera los fondos de un pago completado
 */
async function releaseFunds(req, res) {
  try {
    const { paymentId, serviceId } = req.body;
    const clientId = req.user.id; // Obtenido del middleware de autenticación

    // Validar campos requeridos
    if (!paymentId || !serviceId) {
      logger.warn('Funds release failed: missing required fields', {
        service: 'payments',
        userId: clientId,
        paymentId,
        serviceId,
        ip: req.ip
      });
      return res.status(400).json({
        error: 'Faltan campos requeridos: paymentId, serviceId',
      });
    }

    const result = await mercadoPagoService.releaseFunds(paymentId, serviceId, clientId);

    logger.info('Funds released successfully', {
      service: 'payments',
      userId: clientId,
      paymentId,
      serviceId,
      amount: result.amount,
      ip: req.ip
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Funds release error', {
      service: 'payments',
      userId: req.user?.id,
      paymentId: req.body.paymentId,
      serviceId: req.body.serviceId,
      error,
      ip: req.ip
    });
    res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Obtiene el estado de un pago
 */
async function getPaymentStatus(req, res) {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({
        error: 'Se requiere el paymentId',
      });
    }

    const status = await mercadoPagoService.getPaymentStatus(paymentId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error en getPaymentStatus:', error);
    res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Maneja webhooks de Mercado Pago con validación de firma
 * REQ-41: Integración real con Mercado Pago
 */
async function handleWebhook(req, res) {
  try {
    const { type, data } = req.body;

    logger.info('Payment webhook received', {
      service: 'payments',
      type,
      paymentId: data?.id,
      ip: req.ip,
      hasSignature: !!req.headers['x-signature'],
      hasRequestId: !!req.headers['x-request-id']
    });

    // Verificar que sea una notificación de pago
    if (type === 'payment') {
      const paymentId = data.id;

      // Procesar webhook con validación de firma
      const result = await mercadoPagoService.processPaymentWebhook(req.headers, data);

      // Registrar métricas de webhook
      incrementWebhookProcessed('payment', 'success', 'mercadopago');

      logger.info('Payment webhook processed successfully', {
        service: 'payments',
        paymentId,
        status: result.status,
        ip: req.ip
      });
    }

    // Responder a Mercado Pago
    res.status(200).send('OK');
  } catch (error) {
    // Registrar métricas de error de webhook
    incrementWebhookProcessed('payment', 'error', 'mercadopago');

    logger.error('Payment webhook processing error', {
      service: 'payments',
      type: req.body?.type,
      paymentId: req.body?.data?.id,
      error: error.message,
      ip: req.ip
    });
    res.status(500).send('Error procesando webhook');
  }
}

/**
 * Permite a profesionales retirar fondos
 * REQ-44: Retiro de fondos a cuenta bancaria
 */
async function withdrawFunds(req, res) {
  try {
    const { id: professionalId } = req.user;
    const { amount, bankDetails } = req.body;

    // Validar campos requeridos
    if (!amount || !bankDetails) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: amount, bankDetails',
      });
    }

    const result = await mercadoPagoService.withdrawFunds(professionalId, amount, bankDetails);

    logger.info('Funds withdrawal successful', {
      service: 'payments',
      userId: professionalId,
      amount,
      ip: req.ip
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Funds withdrawal error', {
      service: 'payments',
      userId: req.user?.id,
      amount: req.body?.amount,
      error,
      ip: req.ip
    });
    res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Genera comprobante de pago
 * REQ-45: Generación de comprobantes de pago
 */
async function generateReceipt(req, res) {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({
        error: 'Se requiere paymentId',
      });
    }

    // Generar comprobante de pago
    const receiptResult = await mercadoPagoService.generatePaymentReceipt(paymentId);
    const receiptUrl = receiptResult.receiptUrl;

    logger.info('Receipt generated successfully', {
      service: 'payments',
      paymentId,
      receiptUrl,
      userId: req.user?.id,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        receiptUrl,
        message: 'Comprobante generado exitosamente'
      },
    });
  } catch (error) {
    logger.error('Error generating receipt', {
      service: 'payments',
      paymentId: req.params.paymentId,
      error,
      userId: req.user?.id,
      ip: req.ip
    });
    res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Descarga un comprobante de pago
 */
async function downloadReceipt(req, res) {
  try {
    const { fileName } = req.params;

    if (!fileName) {
      return res.status(400).json({
        error: 'Se requiere nombre de archivo',
      });
    }

    const fileBuffer = await receiptService.getReceiptFile(fileName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(fileBuffer);

  } catch (error) {
    console.error('Error descargando comprobante:', error);
    res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Obtiene todos los pagos de un cliente
 * GET /api/payments/:clientId
 */
async function getClientPayments(req, res) {
  try {
    const { clientId } = req.params;
    const { id: userId, rol } = req.user;

    // Verificar permisos: solo el cliente mismo o admin pueden ver sus pagos
    if (rol !== 'admin' && userId !== clientId) {
      return res.status(403).json({
        error: 'No tienes permiso para ver estos pagos',
      });
    }

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const payments = await prisma.pagos.findMany({
      where: { cliente_id: clientId },
      include: {
        servicio: {
          include: {
            profesional: {
              include: {
                perfil_profesional: true
              }
            }
          }
        },
        commission_setting: true
      },
      orderBy: { creado_en: 'desc' }
    });

    logger.info('Client payments retrieved', {
      service: 'payments',
      userId,
      clientId,
      count: payments.length,
      ip: req.ip
    });

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    logger.error('Get client payments error', {
      service: 'payments',
      userId: req.user?.id,
      clientId: req.params.clientId,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Obtiene todos los pagos recibidos por un profesional
 * GET /api/payments/received/:professionalId
 */
async function getProfessionalPayments(req, res) {
  try {
    const { professionalId } = req.params;
    const { id: userId, rol } = req.user;

    // Verificar permisos: solo el profesional mismo o admin pueden ver sus pagos
    if (rol !== 'admin' && userId !== professionalId) {
      return res.status(403).json({
        error: 'No tienes permiso para ver estos pagos',
      });
    }

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const payments = await prisma.pagos.findMany({
      where: { profesional_id: professionalId },
      include: {
        servicio: {
          include: {
            cliente: true
          }
        },
        commission_setting: true,
        payouts: true
      },
      orderBy: { creado_en: 'desc' }
    });

    logger.info('Professional payments retrieved', {
      service: 'payments',
      userId,
      professionalId,
      count: payments.length,
      ip: req.ip
    });

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    logger.error('Get professional payments error', {
      service: 'payments',
      userId: req.user?.id,
      professionalId: req.params.professionalId,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Obtiene todos los pagos del sistema con paginación cursor-based (solo admins)
 * GET /api/admin/payments
 */
async function getAllPayments(req, res) {
  try {
    const { rol } = req.user;

    // Verificar que sea admin
    if (rol !== 'admin') {
      return res.status(403).json({
        error: 'Solo los administradores pueden ver todos los pagos',
      });
    }

    const { status, clientId, professionalId, dateFrom, dateTo, cursor, limit = 50, direction = 'next' } = req.query;

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Construir filtros
    const where = {};
    if (status) where.estado = status;
    if (clientId) where.cliente_id = clientId;
    if (professionalId) where.profesional_id = professionalId;
    if (dateFrom || dateTo) {
      where.creado_en = {};
      if (dateFrom) where.creado_en.gte = new Date(dateFrom);
      if (dateTo) where.creado_en.lte = new Date(dateTo);
    }

    const take = parseInt(limit);
    const orderDirection = direction === 'prev' ? 'asc' : 'desc';

    // Cursor-based pagination logic
    let cursorCondition = {};
    if (cursor) {
      try {
        const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString());
        const { id, created_at } = decodedCursor;

        if (direction === 'next') {
          // Para next: obtener registros después del cursor
          cursorCondition = {
            OR: [
              { creado_en: { lt: new Date(created_at) } },
              {
                AND: [
                  { creado_en: { equals: new Date(created_at) } },
                  { id: { lt: id } }
                ]
              }
            ]
          };
        } else {
          // Para prev: obtener registros antes del cursor
          cursorCondition = {
            OR: [
              { creado_en: { gt: new Date(created_at) } },
              {
                AND: [
                  { creado_en: { equals: new Date(created_at) } },
                  { id: { gt: id } }
                ]
              }
            ]
          };
        }
      } catch (error) {
        return res.status(400).json({
          error: 'Cursor inválido',
        });
      }
    }

    // Combinar filtros con condición del cursor
    const finalWhere = {
      ...where,
      ...cursorCondition
    };

    const payments = await prisma.pagos.findMany({
      where: finalWhere,
      include: {
        servicio: {
          include: {
            cliente: true,
            profesional: {
              include: {
                perfil_profesional: true
              }
            }
          }
        },
        commission_setting: true,
        payouts: true
      },
      orderBy: [
        { creado_en: orderDirection },
        { id: orderDirection }
      ],
      take: take + 1 // Obtener un registro extra para determinar si hay más páginas
    });

    // Determinar si hay más registros
    const hasMore = payments.length > take;
    const actualPayments = hasMore ? payments.slice(0, take) : payments;

    // Si direction es 'prev', necesitamos revertir el orden para mantener consistencia
    if (direction === 'prev') {
      actualPayments.reverse();
    }

    // Generar cursores para navegación
    let nextCursor = null;
    let prevCursor = null;

    if (actualPayments.length > 0) {
      if (hasMore || cursor) {
        // Next cursor: último elemento de la página actual
        const lastItem = actualPayments[actualPayments.length - 1];
        nextCursor = Buffer.from(JSON.stringify({
          id: lastItem.id,
          created_at: lastItem.creado_en.toISOString()
        })).toString('base64');
      }

      if (cursor) {
        // Prev cursor: primer elemento de la página actual
        const firstItem = actualPayments[0];
        prevCursor = Buffer.from(JSON.stringify({
          id: firstItem.id,
          created_at: firstItem.creado_en.toISOString()
        })).toString('base64');
      }
    }

    logger.info('All payments retrieved by admin with cursor pagination', {
      service: 'payments',
      adminId: req.user.id,
      filters: req.query,
      count: actualPayments.length,
      hasMore,
      cursor,
      direction,
      limit: take,
      ip: req.ip
    });

    res.json({
      success: true,
      data: actualPayments,
      pagination: {
        hasMore,
        nextCursor,
        prevCursor,
        limit: take,
        direction
      }
    });
  } catch (error) {
    logger.error('Get all payments error', {
      service: 'payments',
      adminId: req.user?.id,
      filters: req.query,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

module.exports = {
  createPaymentPreference,
  releaseFunds,
  getPaymentStatus,
  handleWebhook,
  withdrawFunds,
  generateReceipt,
  downloadReceipt,
  getClientPayments,
  getProfessionalPayments,
  getAllPayments,
};
