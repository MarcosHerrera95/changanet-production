/**
 * Controlador de administración corregido
 * REQ-40: Panel admin para gestión de verificaciones
 * Incluye validaciones de seguridad críticas, auditoría completa, rate limiting, caché y lógica de negocio robusta
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../services/logger');
const auditService = require('../services/auditService');
const rateLimiterService = require('../services/rateLimiterService').getInstance();
const cacheService = require('../services/cacheService');

// Constantes de seguridad
const ADMIN_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxRequests: 100, // máximo 100 requests por ventana
  skipSuccessfulRequests: false,
  skipFailedRequests: false
};

const SENSITIVE_ACTIONS_RATE_LIMIT = {
  windowMs: 60 * 60 * 1000, // 1 hora
  maxRequests: 10, // máximo 10 acciones sensibles por hora
  skipSuccessfulRequests: false,
  skipFailedRequests: false
};

// Middlewares se exportan al final del archivo

// Middleware para verificar permisos de administrador
const requireAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Autenticación requerida'
      });
    }

    if (req.user.rol !== 'admin') {
      // Log intento de acceso no autorizado
      auditService.logAdminAction({
        adminId: req.user.id,
        accion: 'unauthorized_access_attempt',
        modulo: 'admin',
        entidad_tipo: 'endpoint',
        entidad_id: req.originalUrl,
        descripcion: `Intento de acceso no autorizado a endpoint administrativo: ${req.method} ${req.originalUrl}`,
        detalles: {
          userRole: req.user.rol,
          userId: req.user.id,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        exito: false,
        error_mensaje: 'Usuario no tiene rol de administrador'
      });

      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      });
    }

    next();
  } catch (error) {
    logger.error('Error en middleware requireAdmin', {
      service: 'admin',
      error,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Middleware para rate limiting de acciones administrativas
const adminRateLimit = async (req, res, next) => {
  try {
    const key = `admin:${req.user.id}:${req.originalUrl}`;
    const allowed = await rateLimiterService.checkLimit(key, ADMIN_RATE_LIMIT.maxRequests, ADMIN_RATE_LIMIT.windowMs);

    if (!allowed) {
      // Log rate limit excedido
      auditService.logAdminAction({
        adminId: req.user.id,
        accion: 'rate_limit_exceeded',
        modulo: 'admin',
        entidad_tipo: 'endpoint',
        entidad_id: req.originalUrl,
        descripcion: `Límite de rate alcanzado para endpoint administrativo: ${req.method} ${req.originalUrl}`,
        detalles: {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        exito: false,
        error_mensaje: 'Rate limit excedido'
      });

      return res.status(429).json({
        success: false,
        error: 'Demasiadas solicitudes. Intente nuevamente más tarde.'
      });
    }

    next();
  } catch (error) {
    logger.error('Error en middleware adminRateLimit', {
      service: 'admin',
      error,
      userId: req.user?.id
    });
    // En caso de error en rate limiting, permitir continuar pero loggear
    next();
  }
};

// Middleware para acciones sensibles (bloquear usuarios, cambiar roles, etc.)
const sensitiveActionRateLimit = async (req, res, next) => {
  try {
    const key = `sensitive:${req.user.id}`;
    const allowed = await rateLimiterService.checkLimit(key, SENSITIVE_ACTIONS_RATE_LIMIT.maxRequests, SENSITIVE_ACTIONS_RATE_LIMIT.windowMs);

    if (!allowed) {
      auditService.logAdminAction({
        adminId: req.user.id,
        accion: 'sensitive_action_rate_limit_exceeded',
        modulo: 'admin',
        entidad_tipo: 'endpoint',
        entidad_id: req.originalUrl,
        descripcion: `Límite de acciones sensibles alcanzado: ${req.method} ${req.originalUrl}`,
        detalles: {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        exito: false,
        error_mensaje: 'Rate limit de acciones sensibles excedido'
      });

      return res.status(429).json({
        success: false,
        error: 'Demasiadas acciones sensibles realizadas. Contacte a soporte si necesita realizar más acciones.'
      });
    }

    next();
  } catch (error) {
    logger.error('Error en middleware sensitiveActionRateLimit', {
      service: 'admin',
      error,
      userId: req.user?.id
    });
    next();
  }
};

// Función auxiliar para validar y sanitizar entrada
const validateAndSanitizeInput = (data, schema) => {
  // Implementar validación básica de entrada
  const sanitized = {};

  for (const [key, rules] of Object.entries(schema)) {
    if (data[key] !== undefined) {
      let value = data[key];

      // Trim strings
      if (typeof value === 'string') {
        value = value.trim();
      }

      // Validar tipo
      if (rules.type && typeof value !== rules.type) {
        throw new Error(`Campo ${key} debe ser de tipo ${rules.type}`);
      }

      // Validar longitud máxima
      if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        throw new Error(`Campo ${key} excede la longitud máxima de ${rules.maxLength} caracteres`);
      }

      // Validar rango numérico
      if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          throw new Error(`Campo ${key} debe ser mayor o igual a ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          throw new Error(`Campo ${key} debe ser menor o igual a ${rules.max}`);
        }
      }

      // Validar valores permitidos
      if (rules.allowedValues && !rules.allowedValues.includes(value)) {
        throw new Error(`Campo ${key} debe ser uno de: ${rules.allowedValues.join(', ')}`);
      }

      sanitized[key] = value;
    } else if (rules.required) {
      throw new Error(`Campo ${key} es requerido`);
    }
  }

  return sanitized;
};

// Función para validar límites de comisiones
const validateCommissionLimits = (percentage) => {
  const MIN_COMMISSION = 5.0;
  const MAX_COMMISSION = 10.0;

  if (percentage < MIN_COMMISSION) {
    throw new Error(`La comisión no puede ser menor al ${MIN_COMMISSION}%`);
  }

  if (percentage > MAX_COMMISSION) {
    throw new Error(`La comisión no puede ser mayor al ${MAX_COMMISSION}%`);
  }

  return true;
};

/**
 * Obtener solicitudes de verificación pendientes
 * Incluye caché para mejorar performance
 */
exports.getPendingVerifications = async (req, res) => {
  try {
    const cacheKey = 'admin:pending_verifications';
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      // Log acceso a caché
      auditService.logAdminAction({
        adminId: req.user.id,
        accion: 'view_pending_verifications',
        modulo: 'admin',
        entidad_tipo: 'verification_requests',
        descripcion: 'Visualización de solicitudes de verificación pendientes (desde caché)',
        detalles: { cached: true, count: cached.length },
        exito: true
      });

      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }

    const pendingRequests = await prisma.verification_requests.findMany({
      where: {
        estado: 'pendiente'
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            rol: true,
            creado_en: true
          }
        }
      },
      orderBy: {
        creado_en: 'asc'
      }
    });

    // Cache por 5 minutos
    await cacheService.set(cacheKey, pendingRequests, 300);

    // Log acción administrativa
    auditService.logAdminAction({
      adminId: req.user.id,
      accion: 'view_pending_verifications',
      modulo: 'admin',
      entidad_tipo: 'verification_requests',
      descripcion: 'Visualización de solicitudes de verificación pendientes',
      detalles: { count: pendingRequests.length },
      exito: true
    });

    res.json({
      success: true,
      data: pendingRequests,
      cached: false
    });
  } catch (error) {
    logger.error('Error obteniendo verificaciones pendientes', {
      service: 'admin',
      error,
      userId: req.user?.id
    });

    // Log error en auditoría
    auditService.logAdminAction({
      adminId: req.user?.id,
      accion: 'view_pending_verifications',
      modulo: 'admin',
      entidad_tipo: 'verification_requests',
      descripcion: 'Error al obtener solicitudes de verificación pendientes',
      detalles: { error: error.message },
      exito: false,
      error_mensaje: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Aprobar una solicitud de verificación
 * Incluye validaciones de seguridad, transacciones y auditoría completa
 */
exports.approveVerification = async (req, res) => {
  const transaction = await prisma.$transaction(async (tx) => {
    try {
      const { requestId } = req.params;
      const adminId = req.user.id;

      // Validar entrada
      const sanitizedInput = validateAndSanitizeInput(
        { requestId },
        {
          requestId: { type: 'string', required: true, maxLength: 36 }
        }
      );

      // Obtener la solicitud con lock para evitar race conditions
      const request = await tx.verification_requests.findUnique({
        where: { id: sanitizedInput.requestId },
        include: { usuario: true }
      });

      if (!request) {
        await auditService.logAdminAction({
          adminId,
          accion: 'approve_verification_not_found',
          modulo: 'admin',
          entidad_tipo: 'verification_requests',
          entidad_id: sanitizedInput.requestId,
          descripcion: 'Intento de aprobar solicitud de verificación inexistente',
          detalles: { requestId: sanitizedInput.requestId },
          exito: false,
          error_mensaje: 'Solicitud no encontrada'
        });

        throw new Error('Solicitud de verificación no encontrada');
      }

      if (request.estado !== 'pendiente') {
        await auditService.logAdminAction({
          adminId,
          accion: 'approve_verification_already_processed',
          modulo: 'admin',
          entidad_tipo: 'verification_requests',
          entidad_id: sanitizedInput.requestId,
          descripcion: 'Intento de aprobar solicitud ya procesada',
          detalles: { currentStatus: request.estado },
          exito: false,
          error_mensaje: 'Solicitud ya procesada'
        });

        throw new Error('Esta solicitud ya ha sido procesada');
      }

      // Verificar que el admin no se esté aprobando a sí mismo
      if (request.usuario_id === adminId) {
        await auditService.logAdminAction({
          adminId,
          accion: 'approve_own_verification_attempt',
          modulo: 'admin',
          entidad_tipo: 'verification_requests',
          entidad_id: sanitizedInput.requestId,
          descripcion: 'Intento de auto-aprobación de verificación',
          detalles: { userId: request.usuario_id },
          exito: false,
          error_mensaje: 'No se puede auto-aprobar'
        });

        throw new Error('No puedes aprobar tu propia solicitud de verificación');
      }

      // Actualizar solicitud
      await tx.verification_requests.update({
        where: { id: sanitizedInput.requestId },
        data: {
          estado: 'aprobado',
          revisado_por: adminId,
          revisado_en: new Date()
        }
      });

      // Actualizar usuario como verificado
      await tx.usuarios.update({
        where: { id: request.usuario_id },
        data: {
          esta_verificado: true,
          verificado_en: new Date()
        }
      });

      // Limpiar caché relacionado
      await cacheService.delete('admin:pending_verifications');

      // Log acción exitosa
      await auditService.logAdminAction({
        adminId,
        accion: 'approve_verification',
        modulo: 'admin',
        entidad_tipo: 'verification_requests',
        entidad_id: sanitizedInput.requestId,
        descripcion: 'Aprobación exitosa de solicitud de verificación',
        detalles: {
          userId: request.usuario_id,
          userEmail: request.usuario.email
        },
        exito: true
      });

      // Otorgar logro de verificación (fuera de transacción por ser opcional)
      try {
        const { checkAndAwardAchievements } = require('./achievementsController');
        await checkAndAwardAchievements(request.usuario_id, 'verification_approved');
      } catch (achievementError) {
        logger.warn('Error otorgando logro de verificación', {
          service: 'admin',
          userId: request.usuario_id,
          error: achievementError.message
        });
      }

      return { request, adminId };

    } catch (error) {
      // Re-throw para que la transacción haga rollback
      throw error;
    }
  });

  try {
    // Notificar al usuario (fuera de transacción)
    const { createNotification } = require('../services/notificationService');
    await createNotification(
      transaction.request.usuario_id,
      'verificacion_aprobada',
      '¡Felicitaciones! Tu identidad ha sido verificada exitosamente.',
      { verification_request_id: transaction.request.id }
    );

    logger.info('Verification approved successfully', {
      service: 'admin',
      adminId: transaction.adminId,
      userId: transaction.request.usuario_id,
      requestId: transaction.request.id
    });

    res.json({
      success: true,
      message: 'Verificación aprobada exitosamente',
      data: {
        userId: transaction.request.usuario_id,
        userName: transaction.request.usuario.nombre
      }
    });

  } catch (notificationError) {
    // La aprobación fue exitosa, solo falló la notificación
    logger.warn('Verification approved but notification failed', {
      service: 'admin',
      adminId: transaction.adminId,
      userId: transaction.request.usuario_id,
      error: notificationError.message
    });

    res.json({
      success: true,
      message: 'Verificación aprobada exitosamente (notificación pendiente)',
      warning: 'La notificación al usuario pudo no enviarse'
    });
  }
};

/**
 * Rechazar una solicitud de verificación
 */
exports.rejectVerification = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { motivo_rechazo } = req.body;
    const adminId = req.user.id;

    // Obtener la solicitud
    const request = await prisma.verification_requests.findUnique({
      where: { id: requestId },
      include: { usuario: true }
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de verificación no encontrada'
      });
    }

    if (request.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        error: 'Esta solicitud ya ha sido procesada'
      });
    }

    // Actualizar solicitud
    await prisma.verification_requests.update({
      where: { id: requestId },
      data: {
        estado: 'rechazado',
        motivo_rechazo: motivo_rechazo || 'Documentación insuficiente',
        revisado_por: adminId,
        fecha_revision: new Date()
      }
    });

    // Notificar al usuario
    const { createNotification } = require('../services/notificationService');
    await createNotification(
      request.usuario_id,
      'verificacion_rechazada',
      `Tu solicitud de verificación ha sido rechazada. Motivo: ${motivo_rechazo || 'Documentación insuficiente'}`,
      { verification_request_id: requestId }
    );

    logger.info('Verification rejected', {
      service: 'admin',
      adminId,
      userId: request.usuario_id,
      requestId,
      reason: motivo_rechazo
    });

    res.json({
      success: true,
      message: 'Verificación rechazada'
    });

  } catch (error) {
    logger.error('Error rechazando verificación', {
      service: 'admin',
      error,
      requestId: req.params.requestId,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener estadísticas del sistema
 */
exports.getSystemStats = async (req, res) => {
  try {
    const [
      totalUsers,
      verifiedUsers,
      pendingVerifications,
      totalServices,
      completedServices,
      totalPayments
    ] = await Promise.all([
      prisma.usuarios.count(),
      prisma.usuarios.count({ where: { esta_verificado: true } }),
      prisma.verification_requests.count({ where: { estado: 'pendiente' } }),
      prisma.servicios.count(),
      prisma.servicios.count({ where: { estado: 'COMPLETADO' } }),
      prisma.pagos.count({ where: { estado: 'liberado' } })
    ]);

    // Calcular ingresos totales
    const paymentsResult = await prisma.pagos.aggregate({
      where: { estado: 'liberado' },
      _sum: { comision_plataforma: true }
    });

    const totalRevenue = paymentsResult._sum.comision_plataforma || 0;

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          verified: verifiedUsers,
          pendingVerifications: pendingVerifications
        },
        services: {
          total: totalServices,
          completed: completedServices,
          completionRate: totalServices > 0 ? (completedServices / totalServices * 100).toFixed(1) : 0
        },
        payments: {
          totalProcessed: totalPayments,
          totalRevenue: totalRevenue
        }
      }
    });

  } catch (error) {
    logger.error('Error obteniendo estadísticas del sistema', {
      service: 'admin',
      error,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Liberar fondos manualmente con doble confirmación (para administradores)
 */
exports.manualReleaseFunds = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { confirmation, reason } = req.body;
    const adminId = req.user.id;

    // Validar entrada
    const sanitizedInput = validateAndSanitizeInput(
      { paymentId, confirmation, reason },
      {
        paymentId: { type: 'string', required: true, maxLength: 36 },
        confirmation: { type: 'string', required: true },
        reason: { type: 'string', required: true, maxLength: 500 }
      }
    );

    // Verificar doble confirmación
    const expectedConfirmation = `CONFIRM_RELEASE_${paymentId}`;
    if (sanitizedInput.confirmation !== expectedConfirmation) {
      await auditService.logAdminAction({
        adminId,
        accion: 'manual_funds_release_failed_confirmation',
        modulo: 'admin',
        entidad_tipo: 'pagos',
        entidad_id: sanitizedInput.paymentId,
        descripcion: 'Intento de liberación manual de fondos sin confirmación correcta',
        detalles: {
          providedConfirmation: sanitizedInput.confirmation,
          expectedConfirmation: expectedConfirmation
        },
        exito: false,
        error_mensaje: 'Confirmación incorrecta para liberación de fondos'
      });

      return res.status(400).json({
        success: false,
        error: 'Confirmación incorrecta. Operación de liberación de fondos requiere doble confirmación.',
        requiresConfirmation: true,
        confirmationCode: expectedConfirmation,
        message: 'Para liberar fondos manualmente, debe proporcionar la confirmación exacta del código de seguridad.'
      });
    }

    // Obtener información del pago para análisis de impacto
    const payment = await prisma.pagos.findUnique({
      where: { id: sanitizedInput.paymentId },
      include: {
        servicio: {
          include: {
            cliente: { select: { id: true, nombre: true, email: true } },
            profesional: { select: { id: true, nombre: true, email: true } }
          }
        }
      }
    });

    if (!payment) {
      await auditService.logAdminAction({
        adminId,
        accion: 'manual_funds_release_payment_not_found',
        modulo: 'admin',
        entidad_tipo: 'pagos',
        entidad_id: sanitizedInput.paymentId,
        descripcion: 'Intento de liberación de fondos para pago inexistente',
        detalles: { paymentId: sanitizedInput.paymentId },
        exito: false,
        error_mensaje: 'Pago no encontrado'
      });

      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      });
    }

    if (payment.estado === 'liberado') {
      await auditService.logAdminAction({
        adminId,
        accion: 'manual_funds_release_already_released',
        modulo: 'admin',
        entidad_tipo: 'pagos',
        entidad_id: sanitizedInput.paymentId,
        descripcion: 'Intento de liberación de fondos ya liberados',
        detalles: { currentStatus: payment.estado },
        exito: false,
        error_mensaje: 'Los fondos ya han sido liberados'
      });

      return res.status(400).json({
        success: false,
        error: 'Los fondos de este pago ya han sido liberados'
      });
    }

    // Log acción iniciada
    await auditService.logAdminAction({
      adminId,
      accion: 'manual_funds_release_initiated',
      modulo: 'admin',
      entidad_tipo: 'pagos',
      entidad_id: sanitizedInput.paymentId,
      descripcion: 'Inicio de liberación manual de fondos',
      detalles: {
        paymentInfo: {
          id: payment.id,
          monto_total: payment.monto_total,
          estado: payment.estado,
          cliente: payment.servicio?.cliente,
          profesional: payment.servicio?.profesional
        },
        reason: sanitizedInput.reason,
        confirmation: sanitizedInput.confirmation
      },
      exito: true
    });

    // Ejecutar liberación de fondos
    const { releaseFunds } = require('../services/mercadoPagoService');
    await releaseFunds(sanitizedInput.paymentId);

    // Actualizar estado del pago
    await prisma.pagos.update({
      where: { id: sanitizedInput.paymentId },
      data: {
        estado: 'liberado',
        fecha_liberacion: new Date(),
        liberado_por: adminId,
        notas_liberacion: sanitizedInput.reason
      }
    });

    // Log liberación exitosa
    await auditService.logAdminAction({
      adminId,
      accion: 'manual_funds_release_completed',
      modulo: 'admin',
      entidad_tipo: 'pagos',
      entidad_id: sanitizedInput.paymentId,
      descripcion: 'Liberación manual de fondos completada exitosamente',
      detalles: {
        paymentAmount: payment.monto_total,
        clientId: payment.servicio?.cliente?.id,
        professionalId: payment.servicio?.profesional?.id,
        reason: sanitizedInput.reason,
        timestamp: new Date().toISOString()
      },
      exito: true
    });

    // Notificar al profesional
    if (payment.servicio?.profesional) {
      const { createNotification } = require('../services/notificationService');
      await createNotification(
        payment.servicio.profesional.id,
        'fondos_liberados_admin',
        `Los fondos de $${payment.monto_total} han sido liberados manualmente por un administrador.`,
        {
          paymentId: sanitizedInput.paymentId,
          amount: payment.monto_total,
          adminId,
          reason: sanitizedInput.reason,
          timestamp: new Date().toISOString()
        }
      );
    }

    logger.info('Manual funds release with double confirmation completed', {
      service: 'admin',
      adminId,
      paymentId: sanitizedInput.paymentId,
      amount: payment.monto_total,
      reason: sanitizedInput.reason
    });

    res.json({
      success: true,
      message: 'Fondos liberados manualmente con doble confirmación',
      data: {
        paymentId: sanitizedInput.paymentId,
        amount: payment.monto_total,
        releasedAt: new Date().toISOString(),
        releasedBy: adminId
      }
    });

  } catch (error) {
    // Log error en auditoría
    await auditService.logAdminAction({
      adminId: req.user?.id,
      accion: 'manual_funds_release_error',
      modulo: 'admin',
      entidad_tipo: 'pagos',
      entidad_id: req.params?.paymentId,
      descripcion: 'Error durante liberación manual de fondos',
      detalles: {
        error: error.message,
        paymentId: req.params?.paymentId,
        reason: req.body?.reason
      },
      exito: false,
      error_mensaje: error.message
    });

    logger.error('Error liberando fondos manualmente', {
      service: 'admin',
      error,
      paymentId: req.params?.paymentId,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

/**
 * Obtener lista de usuarios con filtros
 */
exports.getUsersList = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, verified, search, blocked } = req.query;

    const where = {};
    if (role) where.rol = role;
    if (verified !== undefined) where.esta_verificado = verified === 'true';
    if (blocked !== undefined) where.bloqueado = blocked === 'true';
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.usuarios.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        esta_verificado: true,
        bloqueado: true,
        creado_en: true,
        ultima_conexion: true,
        _count: {
          select: {
            servicios_como_cliente: true,
            servicios_como_profesional: true
          }
        }
      },
      orderBy: { creado_en: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    const total = await prisma.usuarios.count({ where });

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Error obteniendo lista de usuarios', {
      service: 'admin',
      error,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Bloquear o desbloquear un usuario con validaciones de impacto
 */
exports.toggleUserBlock = async (req, res) => {
  try {
    const { userId } = req.params;
    const { blocked, reason, confirmation } = req.body;
    const adminId = req.user.id;

    // Validar entrada
    const sanitizedInput = validateAndSanitizeInput(
      { userId, blocked, reason },
      {
        userId: { type: 'string', required: true, maxLength: 36 },
        blocked: { type: 'boolean', required: true },
        reason: { type: 'string', required: blocked, maxLength: 500 }
      }
    );

    // Verificar que no se está bloqueando a sí mismo
    if (sanitizedInput.userId === adminId) {
      await auditService.logAdminAction({
        adminId,
        accion: 'self_block_attempt',
        modulo: 'admin',
        entidad_tipo: 'usuarios',
        entidad_id: sanitizedInput.userId,
        descripcion: 'Intento de auto-bloqueo detectado y bloqueado',
        detalles: { attemptedBlock: sanitizedInput.blocked },
        exito: false,
        error_mensaje: 'No se permite auto-bloqueo'
      });

      return res.status(400).json({
        success: false,
        error: 'No puedes bloquear tu propia cuenta'
      });
    }

    // Obtener usuario con información completa para análisis de impacto
    const user = await prisma.usuarios.findUnique({
      where: { id: sanitizedInput.userId },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        bloqueado: true,
        esta_verificado: true,
        servicios_como_cliente: {
          where: { estado: { in: ['PENDIENTE', 'AGENDADO', 'EN_PROCESO'] } },
          select: { id: true, estado: true }
        },
        servicios_como_profesional: {
          where: { estado: { in: ['PENDIENTE', 'AGENDADO', 'EN_PROCESO'] } },
          select: { id: true, estado: true }
        },
        _count: {
          select: {
            servicios_como_cliente: true,
            servicios_como_profesional: true
          }
        }
      }
    });

    if (!user) {
      await auditService.logAdminAction({
        adminId,
        accion: 'block_user_not_found',
        modulo: 'admin',
        entidad_tipo: 'usuarios',
        entidad_id: sanitizedInput.userId,
        descripcion: 'Intento de bloqueo en usuario inexistente',
        detalles: { requestedUserId: sanitizedInput.userId },
        exito: false,
        error_mensaje: 'Usuario no encontrado'
      });

      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Análisis de impacto del bloqueo
    const impactAnalysis = {
      currentStatus: user.bloqueado,
      newStatus: sanitizedInput.blocked,
      userRole: user.rol,
      isVerified: user.esta_verificado,
      activeServicesAsClient: user.servicios_como_cliente.length,
      activeServicesAsProfessional: user.servicios_como_profesional.length,
      totalServices: user._count.servicios_como_cliente + user._count.servicios_como_profesional,
      hasActiveServices: user.servicios_como_cliente.length > 0 || user.servicios_como_profesional.length > 0
    };

    // Validaciones de impacto para bloqueo
    if (sanitizedInput.blocked) {
      // Si el usuario tiene servicios activos, requerir confirmación especial
      if (impactAnalysis.hasActiveServices) {
        if (!confirmation || confirmation !== 'CONFIRM_BLOCK_ACTIVE_SERVICES') {
          return res.status(400).json({
            success: false,
            error: 'Este usuario tiene servicios activos. Confirme la acción.',
            requiresConfirmation: true,
            confirmationCode: 'CONFIRM_BLOCK_ACTIVE_SERVICES',
            impactAnalysis: {
              activeServicesCount: impactAnalysis.activeServicesAsClient + impactAnalysis.activeServicesAsProfessional,
              message: `El usuario tiene ${impactAnalysis.activeServicesCount} servicio(s) activo(s) que podrían verse afectados.`
            }
          });
        }
      }

      // Si es un admin, requerir confirmación especial
      if (user.rol === 'admin') {
        if (!confirmation || confirmation !== 'CONFIRM_BLOCK_ADMIN') {
          return res.status(400).json({
            success: false,
            error: 'Está intentando bloquear a un administrador. Confirme la acción.',
            requiresConfirmation: true,
            confirmationCode: 'CONFIRM_BLOCK_ADMIN',
            impactAnalysis: {
              message: 'Bloquear a un administrador puede afectar operaciones críticas del sistema.'
            }
          });
        }
      }
    }

    // Log acción iniciada
    await auditService.logAdminAction({
      adminId,
      accion: sanitizedInput.blocked ? 'block_user_initiated' : 'unblock_user_initiated',
      modulo: 'admin',
      entidad_tipo: 'usuarios',
      entidad_id: sanitizedInput.userId,
      descripcion: `${sanitizedInput.blocked ? 'Bloqueo' : 'Desbloqueo'} de usuario iniciado`,
      detalles: {
        userInfo: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
          bloqueado_actual: user.bloqueado
        },
        impactAnalysis,
        reason: sanitizedInput.reason,
        confirmation: confirmation
      },
      exito: true
    });

    // Actualizar estado de bloqueo con transacción
    const updatedUser = await prisma.$transaction(async (tx) => {
      return await tx.usuarios.update({
        where: { id: sanitizedInput.userId },
        data: {
          bloqueado: sanitizedInput.blocked,
          bloqueado_en: sanitizedInput.blocked ? new Date() : null,
          bloqueado_por: sanitizedInput.blocked ? adminId : null,
          motivo_bloqueo: sanitizedInput.blocked ? sanitizedInput.reason : null
        }
      });
    });

    // Log cambio completado
    await auditService.logAdminAction({
      adminId,
      accion: sanitizedInput.blocked ? 'user_blocked' : 'user_unblocked',
      modulo: 'admin',
      entidad_tipo: 'usuarios',
      entidad_id: sanitizedInput.userId,
      descripcion: `Usuario ${sanitizedInput.blocked ? 'bloqueado' : 'desbloqueado'} exitosamente`,
      detalles: {
        before: { bloqueado: user.bloqueado },
        after: { bloqueado: updatedUser.bloqueado },
        impactAnalysis,
        reason: sanitizedInput.reason,
        timestamp: new Date().toISOString()
      },
      exito: true
    });

    // Notificar al usuario
    const { createNotification } = require('../services/notificationService');
    const action = sanitizedInput.blocked ? 'bloqueada' : 'desbloqueada';
    await createNotification(
      sanitizedInput.userId,
      sanitizedInput.blocked ? 'cuenta_bloqueada' : 'cuenta_desbloqueada',
      `Tu cuenta ha sido ${action}${sanitizedInput.blocked ? `. Motivo: ${sanitizedInput.reason}` : ''}`,
      {
        adminId,
        reason: sanitizedInput.reason,
        blocked: sanitizedInput.blocked,
        impactAnalysis,
        timestamp: new Date().toISOString()
      }
    );

    logger.info('User block status changed with impact validation', {
      service: 'admin',
      adminId,
      userId: sanitizedInput.userId,
      blocked: sanitizedInput.blocked,
      reason: sanitizedInput.reason,
      impactAnalysis
    });

    res.json({
      success: true,
      message: `Usuario ${sanitizedInput.blocked ? 'bloqueado' : 'desbloqueado'} exitosamente`,
      data: {
        userId: sanitizedInput.userId,
        blocked: sanitizedInput.blocked,
        changedAt: new Date().toISOString(),
        impactAnalysis
      }
    });

  } catch (error) {
    // Log error en auditoría
    await auditService.logAdminAction({
      adminId: req.user?.id,
      accion: 'block_toggle_error',
      modulo: 'admin',
      entidad_tipo: 'usuarios',
      entidad_id: req.params?.userId,
      descripcion: 'Error durante cambio de estado de bloqueo',
      detalles: {
        error: error.message,
        requestedBlock: req.body?.blocked,
        reason: req.body?.reason
      },
      exito: false,
      error_mensaje: error.message
    });

    logger.error('Error cambiando estado de bloqueo del usuario', {
      service: 'admin',
      error,
      userId: req.params?.userId,
      adminId: req.user?.id,
      requestedBlock: req.body?.blocked
    });

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Cambiar rol de un usuario con auditoría completa
 */
exports.changeUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newRole, reason } = req.body;
    const adminId = req.user.id;

    // Validar entrada
    const sanitizedInput = validateAndSanitizeInput(
      { userId, newRole, reason },
      {
        userId: { type: 'string', required: true, maxLength: 36 },
        newRole: { type: 'string', required: true, allowedValues: ['cliente', 'profesional', 'admin'] },
        reason: { type: 'string', required: true, maxLength: 500 }
      }
    );

    // Verificar que no se esté cambiando el propio rol
    if (userId === adminId) {
      await auditService.logAdminAction({
        adminId,
        accion: 'self_role_change_attempt',
        modulo: 'admin',
        entidad_tipo: 'usuarios',
        entidad_id: userId,
        descripcion: 'Intento de auto-cambio de rol detectado y bloqueado',
        detalles: { attemptedRole: sanitizedInput.newRole },
        exito: false,
        error_mensaje: 'No se permite auto-cambio de rol'
      });

      return res.status(400).json({
        success: false,
        error: 'No puedes cambiar tu propio rol'
      });
    }

    // Obtener usuario actual con información completa para auditoría
    const user = await prisma.usuarios.findUnique({
      where: { id: sanitizedInput.userId },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        esta_verificado: true,
        bloqueado: true,
        servicios_como_cliente: { select: { id: true } },
        servicios_como_profesional: { select: { id: true } }
      }
    });

    if (!user) {
      await auditService.logAdminAction({
        adminId,
        accion: 'role_change_user_not_found',
        modulo: 'admin',
        entidad_tipo: 'usuarios',
        entidad_id: sanitizedInput.userId,
        descripcion: 'Intento de cambio de rol en usuario inexistente',
        detalles: { requestedUserId: sanitizedInput.userId },
        exito: false,
        error_mensaje: 'Usuario no encontrado'
      });

      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Verificar impacto del cambio de rol
    const impactAnalysis = {
      currentRole: user.rol,
      newRole: sanitizedInput.newRole,
      hasActiveServices: (user.servicios_como_cliente.length > 0 || user.servicios_como_profesional.length > 0),
      isVerified: user.esta_verificado,
      isBlocked: user.bloqueado,
      serviceCount: user.servicios_como_cliente.length + user.servicios_como_profesional.length
    };

    // Log acción de cambio de rol iniciada
    await auditService.logAdminAction({
      adminId,
      accion: 'role_change_initiated',
      modulo: 'admin',
      entidad_tipo: 'usuarios',
      entidad_id: sanitizedInput.userId,
      descripcion: `Inicio de cambio de rol: ${user.rol} → ${sanitizedInput.newRole}`,
      detalles: {
        userInfo: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol_actual: user.rol,
          esta_verificado: user.esta_verificado,
          bloqueado: user.bloqueado
        },
        impactAnalysis,
        reason: sanitizedInput.reason
      },
      exito: true
    });

    // Actualizar rol con transacción
    const updatedUser = await prisma.$transaction(async (tx) => {
      return await tx.usuarios.update({
        where: { id: sanitizedInput.userId },
        data: {
          rol: sanitizedInput.newRole,
          rol_cambiado_en: new Date(),
          rol_cambiado_por: adminId
        }
      });
    });

    // Log cambio exitoso
    await auditService.logAdminAction({
      adminId,
      accion: 'role_change_completed',
      modulo: 'admin',
      entidad_tipo: 'usuarios',
      entidad_id: sanitizedInput.userId,
      descripcion: `Cambio de rol completado exitosamente: ${user.rol} → ${sanitizedInput.newRole}`,
      detalles: {
        before: { rol: user.rol },
        after: { rol: updatedUser.rol },
        impactAnalysis,
        reason: sanitizedInput.reason,
        timestamp: new Date().toISOString()
      },
      exito: true
    });

    // Notificar al usuario
    const { createNotification } = require('../services/notificationService');
    await createNotification(
      sanitizedInput.userId,
      'rol_cambiado',
      `Tu rol ha sido cambiado a: ${sanitizedInput.newRole}`,
      {
        adminId,
        oldRole: user.rol,
        newRole: sanitizedInput.newRole,
        reason: sanitizedInput.reason,
        timestamp: new Date().toISOString()
      }
    );

    logger.info('User role changed with complete audit', {
      service: 'admin',
      adminId,
      userId: sanitizedInput.userId,
      oldRole: user.rol,
      newRole: sanitizedInput.newRole,
      reason: sanitizedInput.reason,
      impactAnalysis
    });

    res.json({
      success: true,
      message: `Rol del usuario cambiado exitosamente a ${sanitizedInput.newRole}`,
      data: {
        userId: sanitizedInput.userId,
        oldRole: user.rol,
        newRole: sanitizedInput.newRole,
        changedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    // Log error en auditoría
    await auditService.logAdminAction({
      adminId: req.user?.id,
      accion: 'role_change_error',
      modulo: 'admin',
      entidad_tipo: 'usuarios',
      entidad_id: req.params?.userId,
      descripcion: 'Error durante cambio de rol de usuario',
      detalles: {
        error: error.message,
        requestedRole: req.body?.newRole,
        reason: req.body?.reason
      },
      exito: false,
      error_mensaje: error.message
    });

    logger.error('Error cambiando rol del usuario', {
      service: 'admin',
      error,
      userId: req.params?.userId,
      adminId: req.user?.id,
      requestedRole: req.body?.newRole
    });

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener detalles completos de un usuario
 */
exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.usuarios.findUnique({
      where: { id: userId },
      include: {
        perfil_profesional: true,
        verification_requests: {
          orderBy: { fecha_solicitud: 'desc' },
          take: 5
        },
        servicios_como_cliente: {
          take: 10,
          orderBy: { creado_en: 'desc' },
          include: {
            profesional: { select: { nombre: true } }
          }
        },
        servicios_como_profesional: {
          take: 10,
          orderBy: { creado_en: 'desc' },
          include: {
            cliente: { select: { nombre: true } }
          }
        },
        _count: {
          select: {
            servicios_como_cliente: true,
            servicios_como_profesional: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    logger.error('Error obteniendo detalles del usuario', {
      service: 'admin',
      error,
      userId: req.params.userId,
      adminId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener lista de servicios con filtros para administración
 */
exports.getServicesList = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, urgent, search } = req.query;

    const where = {};
    if (status) where.estado = status;
    if (urgent !== undefined) where.es_urgente = urgent === 'true';
    if (search) {
      where.OR = [
        { descripcion: { contains: search, mode: 'insensitive' } },
        { cliente: { nombre: { contains: search, mode: 'insensitive' } } },
        { profesional: { nombre: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const services = await prisma.servicios.findMany({
      where,
      include: {
        cliente: { select: { id: true, nombre: true, email: true } },
        profesional: { select: { id: true, nombre: true, email: true } },
        pago: { select: { id: true, monto_total: true, estado: true } }
      },
      orderBy: [
        { es_urgente: 'desc' },
        { creado_en: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    const total = await prisma.servicios.count({ where });

    res.json({
      success: true,
      data: services,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Error obteniendo lista de servicios', {
      service: 'admin',
      error,
      adminId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Actualizar estado de un servicio (para administradores)
 */
exports.updateServiceStatus = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { status, notes } = req.body;
    const adminId = req.user.id;

    // Validar estado
    const validStatuses = ['PENDIENTE', 'AGENDADO', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Estado inválido'
      });
    }

    // Obtener servicio
    const service = await prisma.servicios.findUnique({
      where: { id: serviceId },
      include: { cliente: true, profesional: true }
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Servicio no encontrado'
      });
    }

    const oldStatus = service.estado;

    // Actualizar servicio
    await prisma.servicios.update({
      where: { id: serviceId },
      data: {
        estado: status,
        completado_en: status === 'COMPLETADO' ? new Date() : undefined,
        cancelado_en: status === 'CANCELADO' ? new Date() : undefined
      }
    });

    // Notificar a ambas partes
    const { createNotification } = require('../services/notificationService');

    const statusMessages = {
      'COMPLETADO': 'ha sido marcado como completado',
      'CANCELADO': 'ha sido cancelado',
      'EN_PROCESO': 'está en proceso'
    };

    if (statusMessages[status]) {
      await createNotification(
        service.cliente_id,
        'servicio_actualizado_admin',
        `El servicio "${service.descripcion}" ${statusMessages[status]} por un administrador.`,
        { serviceId, oldStatus, newStatus: status, adminId, notes }
      );

      await createNotification(
        service.profesional_id,
        'servicio_actualizado_admin',
        `El servicio "${service.descripcion}" ${statusMessages[status]} por un administrador.`,
        { serviceId, oldStatus, newStatus: status, adminId, notes }
      );
    }

    logger.info('Service status updated by admin', {
      service: 'admin',
      adminId,
      serviceId,
      oldStatus,
      newStatus: status,
      notes
    });

    res.json({
      success: true,
      message: `Estado del servicio actualizado a ${status}`
    });

  } catch (error) {
    logger.error('Error actualizando estado del servicio', {
      service: 'admin',
      error,
      serviceId: req.params.serviceId,
      adminId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

module.exports = exports;

// Exportar middlewares para uso en rutas
module.exports.requireAdmin = requireAdmin;
module.exports.adminRateLimit = adminRateLimit;
module.exports.sensitiveActionRateLimit = sensitiveActionRateLimit;
