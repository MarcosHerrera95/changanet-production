/**
 * @archivo src/services/notificationService.js - Servicio de notificaciones
 * @descripción Gestiona creación y operaciones de notificaciones (REQ-19, REQ-20)
 * @sprint Sprint 2 – Notificaciones y Comunicación
 * @tarjeta Tarjeta 4: [Backend] Implementar Servicio de Notificaciones
 * @impacto Social: Sistema de notificaciones inclusivo y accesible
 * @mejora Sistema de plantillas y prioridades implementado
 */

const { PrismaClient } = require('@prisma/client');
const { sendPushNotification, sendMulticastPushNotification } = require('../config/firebaseAdmin');
const { sendEmail } = require('./emailService');
const notificationTemplates = require('./notificationTemplatesService');
const notificationPreferences = require('./notificationPreferencesService');
const rateLimiter = require('./rateLimiterService').getInstance();
const cacheService = require('./cacheService');

const prisma = new PrismaClient();

// Cache TTL para notificaciones
const CACHE_TTL = {
  USER_NOTIFICATIONS: 300, // 5 minutos
  NOTIFICATION_COUNT: 60   // 1 minuto
};

// Instancia del WebSocket server (se inyectará desde el servidor)
let webSocketServer = null;

/**
 * Establecer la instancia del WebSocket server
 * @param {Object} wsServer - Instancia del NotificationWebSocketServer
 */
exports.setWebSocketServer = (wsServer) => {
  webSocketServer = wsServer;
};

/**
 * Broadcast notificación a un usuario específico vía WebSocket
 * @param {string} userId - ID del usuario destinatario
 * @param {Object} notification - Datos de la notificación
 */
exports.broadcastToUser = (userId, notification) => {
  if (!webSocketServer) {
    console.warn('WebSocket server no configurado para broadcasting');
    return false;
  }
  return webSocketServer.sendToUser(userId, notification);
};

/**
 * Broadcast notificación a múltiples usuarios vía WebSocket
 * @param {Array<string>} userIds - Array de IDs de usuarios
 * @param {Object} notification - Datos de la notificación
 */
exports.broadcastToUsers = (userIds, notification) => {
  if (!webSocketServer) {
    console.warn('WebSocket server no configurado para broadcasting');
    return false;
  }

  let successCount = 0;
  for (const userId of userIds) {
    if (webSocketServer.sendToUser(userId, notification)) {
      successCount++;
    }
  }
  return successCount > 0;
};

/**
 * Broadcast notificación a todos los usuarios conectados vía WebSocket
 * @param {Object} notification - Datos de la notificación
 */
exports.broadcastToAll = (notification) => {
  if (!webSocketServer) {
    console.warn('WebSocket server no configurado para broadcasting');
    return false;
  }

  // Obtener todos los usuarios conectados
  const connectedUsers = Array.from(webSocketServer.clients.keys());
  return exports.broadcastToUsers(connectedUsers, notification);
};

/**
 * Broadcast notificación de sistema a todos los usuarios
 * @param {string} title - Título de la notificación
 * @param {string} message - Mensaje de la notificación
 * @param {Object} metadata - Datos adicionales
 */
exports.broadcastSystemNotification = async (title, message, metadata = {}) => {
  if (!webSocketServer) {
    console.warn('WebSocket server no configurado para broadcasting de sistema');
    return false;
  }

  const systemNotification = {
    id: `system_${Date.now()}`,
    type: 'system_broadcast',
    priority: 'HIGH',
    title,
    message,
    metadata: { ...metadata, isSystem: true },
    createdAt: new Date()
  };

  return exports.broadcastToAll(systemNotification);
};

/**
 * Tipos de notificaciones soportados
 */
const NOTIFICATION_TYPES = {
  BIENVENIDA: 'bienvenida',
  COTIZACION: 'cotizacion',
  COTIZACION_ACEPTADA: 'cotizacion_aceptada',
  COTIZACION_RECHAZADA: 'cotizacion_rechazada',
  SERVICIO_AGENDADO: 'servicio_agendado',
  MENSAJE: 'mensaje',
  NUEVO_MENSAJE_CHAT: 'nuevo_mensaje_chat',
  TURNO_AGENDADO: 'turno_agendado',
  RESENA_RECIBIDA: 'resena_recibida',
  PAGO_LIBERADO: 'pago_liberado',
  VERIFICACION_APROBADA: 'verificacion_aprobada',
  // Advanced availability notifications
  APPOINTMENT_BOOKED: 'appointment_booked',
  APPOINTMENT_CONFIRMED: 'appointment_confirmed',
  APPOINTMENT_REMINDER_24H: 'appointment_reminder_24h',
  APPOINTMENT_REMINDER_1H: 'appointment_reminder_1h',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  APPOINTMENT_RESCHEDULED: 'appointment_rescheduled',
  NEW_APPOINTMENT: 'new_appointment',
  APPOINTMENT_COMPLETED: 'appointment_completed',
  APPOINTMENT_NO_SHOW: 'appointment_no_show',
  // Urgent services notifications
  URGENT_REQUEST_CREATED: 'urgent_request_created',
  URGENT_ASSIGNED: 'urgent_assigned',
  URGENT_ACCEPTED: 'urgent_accepted',
  URGENT_REJECTED: 'urgent_rejected',
  URGENT_CANCELLED: 'urgent_cancelled',
  URGENT_COMPLETED: 'urgent_completed',
  URGENT_NEARBY: 'urgent_nearby'
};

/**
 * Niveles de prioridad para notificaciones
 */
const NOTIFICATION_PRIORITIES = {
  CRITICAL: 'critical',     // Urgente: servicios urgentes, pagos, verificaciones
  HIGH: 'high',            // Alta: servicios agendados, cotizaciones aceptadas/rechazadas
  MEDIUM: 'medium',        // Media: mensajes, reseñas
  LOW: 'low'              // Baja: recordatorios, bienvenida
};

/**
 * Crear notificación con datos de usuario precargados (para batch processing)
 * @param {string} userId - ID del usuario destinatario
 * @param {string} type - Tipo de notificación
 * @param {string} message - Mensaje de la notificación
 * @param {Object} metadata - Datos adicionales
 * @param {Object} userData - Datos del usuario precargados
 * @param {string} priority - Prioridad
 */
async function createNotificationBatch(userId, type, message, metadata = {}, userData, priority = 'LOW') {
  try {
    // Rate limiting check
    const rateLimitKey = `notification:${userId}`;
    if (!await rateLimiter.checkLimit(rateLimitKey, 100, 3600)) {
      console.warn(`Rate limit exceeded for user ${userId}, skipping notification`);
      return null;
    }

    // Obtener y cachear preferencias del usuario
    const cacheKey = `user_prefs:${userId}`;
    let userPreferences = await cacheService.get(cacheKey);

    if (!userPreferences) {
      userPreferences = await notificationPreferences.getUserPreferences(userId);
      await cacheService.set(cacheKey, userPreferences, CACHE_TTL.USER_NOTIFICATIONS);
    }

    // Verificar si debe enviarse según preferencias
    const shouldSend = await evaluateNotificationPreferences(userPreferences, type, priority);
    if (!shouldSend.send) {
      return { skipped: true, reason: shouldSend.reason };
    }

    // Generar contenido con plantillas
    const templateKey = `template:${type}`;
    let template = await cacheService.get(templateKey);

    if (!template) {
      template = await notificationTemplates.getTemplate(type, 'push');
      await cacheService.set(templateKey, template, CACHE_TTL.USER_NOTIFICATIONS);
    }

    const variables = extractVariablesFromMetadata(metadata, userData);
    const processedContent = await notificationTemplates.processTemplate(template, variables);

    // Crear registro en BD con nuevos campos
    const notification = await prisma.notificaciones.create({
      data: {
        usuario_id: userId,
        tipo: type,
        prioridad: priority,
        titulo: processedContent.title || getNotificationTitle(type),
        mensaje: processedContent.body || message,
        metadata: JSON.stringify(metadata),
        canales_enviados: JSON.stringify(shouldSend.channels),
        fecha_envio: new Date()
      }
    });

    // Enviar por canales seleccionados usando datos precargados
    await sendByChannelsBatch(userId, notification, shouldSend.channels, processedContent, userData);

    // Notificar vía WebSocket si disponible
    if (webSocketServer) {
      await webSocketServer.sendToUser(userId, {
        id: notification.id,
        type,
        priority,
        title: processedContent.title,
        message: processedContent.body,
        metadata,
        createdAt: notification.creado_en
      });
    }

    // Limpiar caché de conteo
    await cacheService.del(`unread_count:${userId}`);

    return notification;
  } catch (error) {
    console.error('❌ Error creando notificación batch:', error);
    throw error;
  }
}

/**
 * Enviar notificación por canales usando datos de usuario precargados
 * @param {string} userId - ID del usuario
 * @param {Object} notification - Notificación creada
 * @param {Array} channels - Canales a usar
 * @param {Object} content - Contenido procesado
 * @param {Object} userData - Datos del usuario precargados
 */
async function sendByChannelsBatch(userId, notification, channels, content, userData) {
  for (const channel of channels) {
    try {
      switch (channel) {
        case 'push':
          if (userData.fcm_token) {
            await sendPushNotification(userData.fcm_token, content.title, content.body || notification.mensaje);
          }
          break;

        case 'email':
          if (userData.email) {
            const emailContent = await notificationTemplates.generateNotification(notification.tipo, 'email', {});
            await sendEmail(userData.email, emailContent.subject, emailContent.html);
          }
          break;

        case 'sms':
          if (userData.sms_enabled && userData.telefono) {
            const smsContent = await notificationTemplates.generateNotification(notification.tipo, 'sms', {});
            // await sendSMS(userData.telefono, smsContent.sms);
          }
          break;

        case 'in_app':
          // Ya se maneja vía WebSocket
          break;
      }
    } catch (channelError) {
      console.warn(`Error enviando notificación por ${channel}:`, channelError);
    }
  }
}

/**
 * Crear notificación con sistema completo mejorado
 * @param {string} userId - ID del usuario destinatario
 * @param {string} type - Tipo de notificación (enum NotificationType)
 * @param {string} message - Mensaje de la notificación
 * @param {Object} metadata - Datos adicionales (opcional)
 * @param {string} priority - Prioridad (enum NotificationPriority)
 */
exports.createNotification = async (userId, type, message, metadata = {}, priority = 'MEDIUM') => {
  try {
    // Rate limiting check
    const rateLimitKey = `notification:${userId}`;
    if (!await rateLimiter.checkLimit(rateLimitKey, 100, 3600)) { // 100 por hora
      throw new Error('Rate limit exceeded for notifications');
    }

    // Validar prioridad
    const validPriorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    if (!validPriorities.includes(priority)) {
      priority = 'MEDIUM';
    }

    // Obtener y cachear preferencias del usuario
    const cacheKey = `user_prefs:${userId}`;
    let userPreferences = await cacheService.get(cacheKey);

    if (!userPreferences) {
      userPreferences = await notificationPreferences.getUserPreferences(userId);
      await cacheService.set(cacheKey, userPreferences, CACHE_TTL.USER_NOTIFICATIONS);
    }

    // Verificar si debe enviarse según preferencias
    const shouldSend = await evaluateNotificationPreferences(userPreferences, type, priority);
    if (!shouldSend.send) {
      return { skipped: true, reason: shouldSend.reason };
    }

    // Generar contenido con plantillas
    const templateKey = `template:${type}`;
    let template = await cacheService.get(templateKey);

    if (!template) {
      template = await notificationTemplates.getTemplate(type, 'push');
      await cacheService.set(templateKey, template, CACHE_TTL.USER_NOTIFICATIONS);
    }

    const variables = extractVariablesFromMetadata(metadata, userId);
    const processedContent = await notificationTemplates.processTemplate(template, variables);

    // Crear registro en BD con nuevos campos
    const notification = await prisma.notificaciones.create({
      data: {
        usuario_id: userId,
        tipo: type,
        prioridad: priority,
        titulo: processedContent.title || getNotificationTitle(type),
        mensaje: processedContent.body || message,
        metadata: JSON.stringify(metadata),
        canales_enviados: JSON.stringify(shouldSend.channels),
        fecha_envio: new Date()
      }
    });

    // Enviar por canales seleccionados
    await sendByChannels(userId, notification, shouldSend.channels, processedContent);

    // Notificar vía WebSocket si disponible
    if (webSocketServer) {
      await webSocketServer.sendToUser(userId, {
        id: notification.id,
        type,
        priority,
        title: processedContent.title,
        message: processedContent.body,
        metadata,
        createdAt: notification.creado_en
      });
    }

    // Limpiar caché de conteo
    await cacheService.del(`unread_count:${userId}`);

    console.log(`✅ Notificación creada: ${type} (${priority}) para usuario ${userId}`);
    return notification;
  } catch (error) {
    console.error('❌ Error creando notificación:', error);
    throw error;
  }
};

/**
 * Obtener notificaciones de un usuario con filtros
 * @param {string} userId - ID del usuario
 * @param {string} filter - Filtro: 'all', 'unread', 'read'
 */
exports.getUserNotifications = async (userId, filter = 'all') => {
  try {
    const whereClause = { usuario_id: userId };

    if (filter === 'unread') {
      whereClause.esta_leido = false;
    } else if (filter === 'read') {
      whereClause.esta_leido = true;
    }

    const notifications = await prisma.notificaciones.findMany({
      where: whereClause,
      orderBy: { creado_en: 'desc' },
      take: 50 // Limitar a 50 notificaciones más recientes
    });

    const unreadCount = await prisma.notificaciones.count({
      where: {
        usuario_id: userId,
        esta_leido: false
      }
    });

    return {
      notifications,
      unreadCount
    };
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    throw error;
  }
};

/**
 * Obtener una notificación por ID
 * @param {string} notificationId - ID de la notificación
 */
exports.getNotificationById = async (notificationId) => {
  try {
    return await prisma.notificaciones.findUnique({
      where: { id: notificationId }
    });
  } catch (error) {
    console.error('Error obteniendo notificación:', error);
    throw error;
  }
};

/**
 * Marcar notificación como leída
 * @param {string} notificationId - ID de la notificación
 */
exports.markAsRead = async (notificationId) => {
  try {
    await prisma.notificaciones.update({
      where: { id: notificationId },
      data: { esta_leido: true }
    });
  } catch (error) {
    console.error('Error marcando notificación como leída:', error);
    throw error;
  }
};

/**
 * Marcar todas las notificaciones de un usuario como leídas
 * @param {string} userId - ID del usuario
 */
exports.markAllAsRead = async (userId) => {
  try {
    await prisma.notificaciones.updateMany({
      where: {
        usuario_id: userId,
        esta_leido: false
      },
      data: { esta_leido: true }
    });
  } catch (error) {
    console.error('Error marcando todas las notificaciones como leídas:', error);
    throw error;
  }
};

/**
 * Eliminar una notificación
 * @param {string} notificationId - ID de la notificación
 */
exports.deleteNotification = async (notificationId) => {
  try {
    await prisma.notificaciones.delete({
      where: { id: notificationId }
    });
  } catch (error) {
    console.error('Error eliminando notificación:', error);
    throw error;
  }
};

/**
 * Evaluar si debe enviarse una notificación según preferencias del usuario
 * @param {Object} userPreferences - Preferencias del usuario
 * @param {string} type - Tipo de notificación
 * @param {string} priority - Prioridad
 * @returns {Object} Resultado de evaluación
 */
async function evaluateNotificationPreferences(userPreferences, type, priority) {
  // Verificar si las notificaciones están habilitadas globalmente
  if (!userPreferences.enabled) {
    return { send: false, reason: 'notifications_disabled' };
  }

  // Verificar horarios silenciosos para prioridades no críticas
  if (priority !== 'CRITICAL' && isQuietHours(userPreferences)) {
    return { send: false, reason: 'quiet_hours', channels: [] };
  }

  // Determinar canales disponibles según preferencias
  const availableChannels = [];
  const userChannels = userPreferences.canales || {};

  if (userChannels.push) availableChannels.push('push');
  if (userChannels.email) availableChannels.push('email');
  if (userChannels.sms) availableChannels.push('sms');
  if (userChannels.in_app) availableChannels.push('in_app');

  // Para prioridades críticas, forzar envío por al menos un canal
  if (priority === 'CRITICAL' && availableChannels.length === 0) {
    availableChannels.push('push'); // Canal por defecto para críticas
  }

  return {
    send: availableChannels.length > 0,
    channels: availableChannels,
    reason: availableChannels.length > 0 ? null : 'no_channels_available'
  };
}

/**
 * Verificar si está en horario silencioso
 * @param {Object} userPreferences - Preferencias del usuario
 * @returns {boolean} Si está en horario silencioso
 */
function isQuietHours(userPreferences) {
  if (!userPreferences.quiet_hours_enabled) {
    return false;
  }

  const now = new Date();
  const currentTime = now.getHours() * 100 + now.getMinutes();
  const startTime = userPreferences.quiet_start_time ? parseTime(userPreferences.quiet_start_time) : 2200;
  const endTime = userPreferences.quiet_end_time ? parseTime(userPreferences.quiet_end_time) : 800;

  if (startTime > endTime) {
    // Cruza medianoche
    return currentTime >= startTime || currentTime <= endTime;
  } else {
    return currentTime >= startTime && currentTime <= endTime;
  }
}

/**
 * Parsear tiempo HH:MM a minutos
 * @param {string} timeStr - String de tiempo
 * @returns {number} Minutos
 */
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 100 + minutes;
}

/**
 * Enviar notificación por canales seleccionados
 * @param {string} userId - ID del usuario
 * @param {Object} notification - Notificación creada
 * @param {Array} channels - Canales a usar
 * @param {Object} content - Contenido procesado
 */
async function sendByChannels(userId, notification, channels, content) {
  // Obtener datos del usuario
  const user = await prisma.usuarios.findUnique({
    where: { id: userId },
    select: {
      fcm_token: true,
      email: true,
      nombre: true,
      telefono: true,
      sms_enabled: true
    }
  });

  if (!user) return;

  for (const channel of channels) {
    try {
      switch (channel) {
        case 'push':
          if (user.fcm_token) {
            await sendPushNotification(user.fcm_token, content.title, content.body || notification.mensaje);
          }
          break;

        case 'email':
          if (user.email) {
            const emailContent = await notificationTemplates.generateNotification(notification.tipo, 'email', {});
            await sendEmail(user.email, emailContent.subject, emailContent.html);
          }
          break;

        case 'sms':
          if (user.sms_enabled && user.telefono) {
            const smsContent = await notificationTemplates.generateNotification(notification.tipo, 'sms', {});
            // await sendSMS(user.telefono, smsContent.sms);
          }
          break;

        case 'in_app':
          // Ya se maneja vía WebSocket
          break;
      }
    } catch (channelError) {
      console.warn(`Error enviando notificación por ${channel}:`, channelError);
    }
  }
}

/**
 * Extraer variables de metadata para las plantillas
 * @param {Object} metadata - Datos adicionales de la notificación
 * @param {Object} user - Datos del usuario
 * @returns {Object} Variables procesadas para la plantilla
 */
function extractVariablesFromMetadata(metadata = {}, user = {}) {
  return {
    // Variables del usuario
    usuario: user.nombre || 'Usuario',
    
    // Variables del servicio
    servicio: metadata.servicio || metadata.serviceName || 'servicio',
    profesional: metadata.profesional || metadata.professionalName || 'profesional',
    cliente: metadata.cliente || metadata.clientName || 'cliente',
    
    // Variables de tiempo
    fecha: metadata.fecha || metadata.date || new Date().toLocaleDateString('es-AR'),
    hora: metadata.hora || metadata.time || new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    
    // Variables monetarias
    monto: metadata.monto || metadata.amount || '0',
    
    // Variables de rating
    rating: metadata.rating || '5',
    
    // Variables de contenido
    contenido_mensaje: metadata.contenido_mensaje || metadata.messageContent || '',
    
    // Variables de comentario
    comentario: metadata.comentario || metadata.comment || '',
    
    // Variables adicionales del metadata
    ...metadata
  };
}

/**
 * Enviar notificación por múltiples canales según la prioridad
 * @param {Object} user - Datos del usuario
 * @param {string} type - Tipo de notificación
 * @param {string} message - Mensaje principal
 * @param {Object} metadata - Datos adicionales
 * @param {string} priority - Prioridad de la notificación
 * @param {Object} processedNotification - Notificación procesada con plantillas
 * @param {Object} preferenceCheck - Resultado de verificación de preferencias
 */
async function sendNotificationByPreferences(user, type, message, metadata, priority, processedNotification, preferenceCheck) {
  // Usar canales recomendados por el sistema de preferencias
  const channels = preferenceCheck.recommendedChannels || ['push'];
  
  for (const channel of channels) {
    try {
      switch (channel) {
        case 'push':
          if (user.fcm_token && user.notificaciones_push) {
            await sendPushNotification(user.fcm_token, processedNotification.title || getNotificationTitle(type), message);
          }
          break;
          
        case 'email':
          if (user.notificaciones_email) {
            const emailTemplate = notificationTemplates.generateNotification(type, 'email', extractVariablesFromMetadata(metadata, user));
            await sendEmail(user.email, emailTemplate.subject, emailTemplate.html);
          }
          break;
          
        case 'sms':
          if (user.sms_enabled && user.notificaciones_sms && shouldSendSMS(user, type)) {
            const smsTemplate = notificationTemplates.generateNotification(type, 'sms', extractVariablesFromMetadata(metadata, user));
            const { sendSMS } = require('./smsService');
            await sendSMS(user.telefono, smsTemplate.sms || smsTemplate.body);
          }
          break;
      }
    } catch (channelError) {
      console.warn(`Error enviando notificación por ${channel}:`, channelError);
    }
  }
}

/**
 * Enviar notificación por múltiples canales según la prioridad (legacy)
 * @param {Object} user - Datos del usuario
 * @param {string} type - Tipo de notificación
 * @param {string} message - Mensaje principal
 * @param {Object} metadata - Datos adicionales
 * @param {string} priority - Prioridad de la notificación
 * @param {Object} processedNotification - Notificación procesada con plantillas
 */
async function sendNotificationByPriority(user, type, message, metadata, priority, processedNotification) {
  const channels = determineChannelsByPriority(priority, type);
  
  for (const channel of channels) {
    try {
      switch (channel) {
        case 'push':
          if (user.fcm_token && user.notificaciones_push) {
            await sendPushNotification(user.fcm_token, processedNotification.title || getNotificationTitle(type), message);
          }
          break;
          
        case 'email':
          if (user.notificaciones_email) {
            const emailTemplate = notificationTemplates.generateNotification(type, 'email', extractVariablesFromMetadata(metadata, user));
            await sendEmail(user.email, emailTemplate.subject, emailTemplate.html);
          }
          break;
          
        case 'sms':
          if (shouldSendSMS(user, type)) {
            const smsTemplate = notificationTemplates.generateNotification(type, 'sms', extractVariablesFromMetadata(metadata, user));
            const { sendSMS } = require('./smsService');
            await sendSMS(user.telefono, smsTemplate.sms || smsTemplate.body);
          }
          break;
      }
    } catch (channelError) {
      console.warn(`Error enviando notificación por ${channel}:`, channelError);
    }
  }
}

/**
 * Determinar qué canales usar según la prioridad
 * @param {string} priority - Prioridad de la notificación
 * @param {string} type - Tipo de notificación
 * @returns {Array} Lista de canales a usar
 */
function determineChannelsByPriority(priority, type) {
  const channelsByPriority = {
    [NOTIFICATION_PRIORITIES.CRITICAL]: ['push', 'email', 'sms'],
    [NOTIFICATION_PRIORITIES.HIGH]: ['push', 'email'],
    [NOTIFICATION_PRIORITIES.MEDIUM]: ['push'],
    [NOTIFICATION_PRIORITIES.LOW]: ['push']
  };
  
  let channels = channelsByPriority[priority] || channelsByPriority[NOTIFICATION_PRIORITIES.MEDIUM];
  
  // Ajustes específicos por tipo
  if (type === NOTIFICATION_TYPES.BIENVENIDA) {
    channels = ['email']; // Solo email para bienvenida
  }
  
  return channels;
}

/**
 * Verificar si se debe enviar SMS para una notificación crítica
 * @param {Object} user - Datos del usuario
 * @param {string} type - Tipo de notificación
 * @returns {boolean} Si se debe enviar SMS
 */
function shouldSendSMS(user, type) {
  // Solo enviar SMS si el usuario tiene SMS habilitado y el teléfono configurado
  if (!user.sms_enabled || !user.telefono) {
    return false;
  }

  // Tipos de notificación que justifican envío por SMS (críticos)
  const smsTypes = [
    NOTIFICATION_TYPES.SERVICIO_AGENDADO,
    NOTIFICATION_TYPES.PAGO_LIBERADO,
    'servicio_urgente_agendado', // Servicios urgentes
    'fondos_liberados'
  ];

  return smsTypes.includes(type);
}

/**
 * Función auxiliar para obtener título de notificación según tipo
 * @param {string} type - Tipo de notificación
 */
function getNotificationTitle(type) {
  const titles = {
    [NOTIFICATION_TYPES.BIENVENIDA]: '¡Bienvenido a ChangAnet!',
    [NOTIFICATION_TYPES.COTIZACION]: 'Nueva solicitud de presupuesto',
    [NOTIFICATION_TYPES.COTIZACION_ACEPTADA]: 'Cotización aceptada',
    [NOTIFICATION_TYPES.COTIZACION_RECHAZADA]: 'Cotización rechazada',
    [NOTIFICATION_TYPES.SERVICIO_AGENDADO]: 'Servicio agendado',
    [NOTIFICATION_TYPES.MENSAJE]: 'Nuevo mensaje',
    [NOTIFICATION_TYPES.TURNO_AGENDADO]: 'Servicio agendado',
    [NOTIFICATION_TYPES.RESENA_RECIBIDA]: 'Nueva reseña',
    [NOTIFICATION_TYPES.PAGO_LIBERADO]: 'Pago liberado',
    [NOTIFICATION_TYPES.VERIFICACION_APROBADA]: 'Verificación aprobada',
    // Advanced availability notifications
    [NOTIFICATION_TYPES.APPOINTMENT_BOOKED]: 'Cita agendada',
    [NOTIFICATION_TYPES.APPOINTMENT_CONFIRMED]: 'Cita confirmada',
    [NOTIFICATION_TYPES.APPOINTMENT_REMINDER_24H]: 'Recordatorio: Cita mañana',
    [NOTIFICATION_TYPES.APPOINTMENT_REMINDER_1H]: 'Recordatorio: Cita en 1 hora',
    [NOTIFICATION_TYPES.APPOINTMENT_CANCELLED]: 'Cita cancelada',
    [NOTIFICATION_TYPES.APPOINTMENT_RESCHEDULED]: 'Cita reprogramada',
    [NOTIFICATION_TYPES.NEW_APPOINTMENT]: 'Nueva cita agendada',
    [NOTIFICATION_TYPES.APPOINTMENT_COMPLETED]: 'Cita completada',
    [NOTIFICATION_TYPES.APPOINTMENT_NO_SHOW]: 'Cita no realizada',
    // Urgent services notifications
    [NOTIFICATION_TYPES.URGENT_REQUEST_CREATED]: 'Solicitud Urgente Creada',
    [NOTIFICATION_TYPES.URGENT_ASSIGNED]: 'Servicio Urgente Asignado',
    [NOTIFICATION_TYPES.URGENT_ACCEPTED]: 'Servicio Urgente Aceptado',
    [NOTIFICATION_TYPES.URGENT_REJECTED]: 'Servicio Urgente Rechazado',
    [NOTIFICATION_TYPES.URGENT_CANCELLED]: 'Servicio Urgente Cancelado',
    [NOTIFICATION_TYPES.URGENT_COMPLETED]: 'Servicio Urgente Completado',
    [NOTIFICATION_TYPES.URGENT_NEARBY]: '¡Solicitud Urgente Cerca!',
    'servicio_urgente_agendado': '¡Servicio Urgente Agendado!',
    'fondos_liberados': 'Fondos Liberados',
    'fondos_liberados_auto': 'Fondos Liberados Automáticamente'
  };
  return titles[type] || 'Nueva notificación';
}

/**
 * Obtener prioridad por defecto según el tipo de notificación
 * @param {string} type - Tipo de notificación
 * @returns {string} Prioridad recomendada
 */
function getDefaultPriority(type) {
  const priorityMap = {
      // CRÍTICO
      'servicio_urgente_agendado': NOTIFICATION_PRIORITIES.CRITICAL,
      'fondos_liberados': NOTIFICATION_PRIORITIES.CRITICAL,
      'fondos_liberados_auto': NOTIFICATION_PRIORITIES.CRITICAL,
      [NOTIFICATION_TYPES.APPOINTMENT_NO_SHOW]: NOTIFICATION_PRIORITIES.CRITICAL,
      [NOTIFICATION_TYPES.URGENT_REQUEST_CREATED]: NOTIFICATION_PRIORITIES.CRITICAL,
      [NOTIFICATION_TYPES.URGENT_ASSIGNED]: NOTIFICATION_PRIORITIES.CRITICAL,
      [NOTIFICATION_TYPES.URGENT_ACCEPTED]: NOTIFICATION_PRIORITIES.CRITICAL,
      [NOTIFICATION_TYPES.URGENT_NEARBY]: NOTIFICATION_PRIORITIES.CRITICAL,

      // ALTA
      [NOTIFICATION_TYPES.SERVICIO_AGENDADO]: NOTIFICATION_PRIORITIES.HIGH,
      [NOTIFICATION_TYPES.TURNO_AGENDADO]: NOTIFICATION_PRIORITIES.HIGH,
      [NOTIFICATION_TYPES.COTIZACION_ACEPTADA]: NOTIFICATION_PRIORITIES.HIGH,
      [NOTIFICATION_TYPES.COTIZACION_RECHAZADA]: NOTIFICATION_PRIORITIES.HIGH,
      [NOTIFICATION_TYPES.VERIFICACION_APROBADA]: NOTIFICATION_PRIORITIES.HIGH,
      [NOTIFICATION_TYPES.APPOINTMENT_BOOKED]: NOTIFICATION_PRIORITIES.HIGH,
      [NOTIFICATION_TYPES.APPOINTMENT_CONFIRMED]: NOTIFICATION_PRIORITIES.HIGH,
      [NOTIFICATION_TYPES.NEW_APPOINTMENT]: NOTIFICATION_PRIORITIES.HIGH,
      [NOTIFICATION_TYPES.APPOINTMENT_CANCELLED]: NOTIFICATION_PRIORITIES.HIGH,
      [NOTIFICATION_TYPES.APPOINTMENT_RESCHEDULED]: NOTIFICATION_PRIORITIES.HIGH,
      [NOTIFICATION_TYPES.URGENT_COMPLETED]: NOTIFICATION_PRIORITIES.HIGH,
      [NOTIFICATION_TYPES.URGENT_CANCELLED]: NOTIFICATION_PRIORITIES.HIGH,

      // MEDIA
      [NOTIFICATION_TYPES.COTIZACION]: NOTIFICATION_PRIORITIES.MEDIUM,
      [NOTIFICATION_TYPES.MENSAJE]: NOTIFICATION_PRIORITIES.MEDIUM,
      [NOTIFICATION_TYPES.RESENA_RECIBIDA]: NOTIFICATION_PRIORITIES.MEDIUM,
      [NOTIFICATION_TYPES.PAGO_LIBERADO]: NOTIFICATION_PRIORITIES.MEDIUM,
      [NOTIFICATION_TYPES.APPOINTMENT_COMPLETED]: NOTIFICATION_PRIORITIES.MEDIUM,
      [NOTIFICATION_TYPES.URGENT_REJECTED]: NOTIFICATION_PRIORITIES.MEDIUM,

      // BAJA
      [NOTIFICATION_TYPES.BIENVENIDA]: NOTIFICATION_PRIORITIES.LOW,
      'recordatorio_servicio': NOTIFICATION_PRIORITIES.LOW,
      'recordatorio_pago': NOTIFICATION_PRIORITIES.LOW,
      [NOTIFICATION_TYPES.APPOINTMENT_REMINDER_24H]: NOTIFICATION_PRIORITIES.LOW,
      [NOTIFICATION_TYPES.APPOINTMENT_REMINDER_1H]: NOTIFICATION_PRIORITIES.LOW
    };

  return priorityMap[type] || NOTIFICATION_PRIORITIES.MEDIUM;
}

/**
 * Crear notificación rápida con prioridad automática
 * @param {string} userId - ID del usuario
 * @param {string} type - Tipo de notificación
 * @param {string} message - Mensaje
 * @param {Object} metadata - Datos adicionales
 */
exports.createNotificationQuick = async (userId, type, message, metadata = {}) => {
  // Obtener prioridad automáticamente según el tipo
  const priority = getDefaultPriority(type);
  return await exports.createNotification(userId, type, message, metadata, priority);
};

/**
 * Crear notificación programada para envío futuro
 * @param {string} userId - ID del usuario
 * @param {string} type - Tipo de notificación
 * @param {string} message - Mensaje
 * @param {Date} scheduledTime - Fecha y hora programada
 * @param {Object} metadata - Datos adicionales
 * @param {string} priority - Prioridad de la notificación
 */
exports.scheduleNotification = async (userId, type, message, scheduledTime, metadata = {}, priority = 'medium') => {
  try {
    // Validar que la fecha programada sea futura
    if (new Date(scheduledTime) <= new Date()) {
      throw new Error('La fecha programada debe ser futura');
    }

    // Validar prioridad
    if (!Object.values(NOTIFICATION_PRIORITIES).includes(priority)) {
      priority = 'medium';
    }

    // Crear registro de notificación programada (podríamos crear una tabla separada)
    // Por ahora, usamos un tipo especial y metadata
    const scheduledNotification = await prisma.notificaciones.create({
      data: {
        usuario_id: userId,
        tipo: `scheduled_${type}`,
        mensaje: message,
        esta_leido: false
        // Podríamos agregar campos como scheduled_for en el futuro
      }
    });

    // En una implementación completa, aquí se programaría el envío
    // Por ahora, solo registramos la notificación programada
    console.log(`Notificación programada: ${type} (${priority}) para usuario ${userId} en ${scheduledTime}`);

    return scheduledNotification;
  } catch (error) {
    console.error('Error programando notificación:', error);
    throw error;
  }
};

/**
 * Procesar notificaciones programadas que deben enviarse ahora
 * Esta función debe ejecutarse periódicamente (ej: cada hora)
 */
exports.processScheduledNotifications = async () => {
  try {
    // En una implementación completa, buscaríamos notificaciones con scheduled_for <= now
    // y las enviaríamos. Por ahora, implementamos algunos recordatorios automáticos

    const now = new Date();

    // Recordatorios de citas (24h y 1h antes)
    await sendAppointmentReminders(now);

    // Recordatorio de servicios próximos (24 horas antes) - legacy
    await sendServiceReminders(now);

    // Recordatorio de pagos pendientes
    await sendPaymentReminders(now);

    console.log('✅ Notificaciones programadas procesadas');
  } catch (error) {
    console.error('Error procesando notificaciones programadas:', error);
    throw error;
  }
};

/**
 * Enviar recordatorios de servicios próximos
 */
async function sendServiceReminders(now) {
  try {
    // Servicios que empiezan en las próximas 24 horas
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const upcomingServices = await prisma.servicios.findMany({
      where: {
        fecha_agendada: {
          gte: now,
          lte: tomorrow
        },
        estado: 'AGENDADO'
      },
      include: {
        cliente: { select: { id: true, nombre: true } },
        profesional: { select: { id: true, nombre: true } }
      }
    });

    if (upcomingServices.length === 0) {
      console.log('📅 No hay servicios para recordar');
      return;
    }

    // OPTIMIZACIÓN: Batch processing para evitar N+1 queries
    // 1. Recopilar todos los user IDs únicos
    const userIds = new Set();
    for (const service of upcomingServices) {
      userIds.add(service.cliente_id);
      userIds.add(service.profesional_id);
    }

    // 2. Fetch all user data in one query
    const usersData = await prisma.usuarios.findMany({
      where: {
        id: { in: Array.from(userIds) }
      },
      select: {
        id: true,
        fcm_token: true,
        email: true,
        nombre: true,
        telefono: true,
        sms_enabled: true
      }
    });

    // 3. Crear mapa de user data para acceso rápido
    const userDataMap = new Map();
    for (const user of usersData) {
      userDataMap.set(user.id, user);
    }

    // 4. Procesar notificaciones en batch
    const notificationPromises = [];

    for (const service of upcomingServices) {
      const serviceTime = new Date(service.fecha_agendada).toLocaleTimeString('es-AR');

      // Recordatorio al cliente
      notificationPromises.push(
        createNotificationBatch(
          service.cliente_id,
          'recordatorio_servicio',
          `Recordatorio: Tienes un servicio agendado mañana con ${service.profesional.nombre} a las ${serviceTime}`,
          { serviceId: service.id, type: 'cliente' },
          userDataMap.get(service.cliente_id)
        )
      );

      // Recordatorio al profesional
      notificationPromises.push(
        createNotificationBatch(
          service.profesional_id,
          'recordatorio_servicio',
          `Recordatorio: Tienes un servicio agendado mañana con ${service.cliente.nombre} a las ${serviceTime}`,
          { serviceId: service.id, type: 'profesional' },
          userDataMap.get(service.profesional_id)
        )
      );
    }

    // 5. Ejecutar todas las notificaciones en paralelo
    await Promise.all(notificationPromises);

    console.log(`📅 Recordatorios enviados para ${upcomingServices.length} servicios (optimizado con batch processing)`);
  } catch (error) {
    console.error('Error enviando recordatorios de servicios:', error);
  }
}

/**
 * Enviar recordatorios de pagos pendientes
 */
async function sendPaymentReminders(now) {
  try {
    // Pagos pendientes de más de 3 días
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const pendingPayments = await prisma.pagos.findMany({
      where: {
        estado: 'pendiente',
        creado_en: { lte: threeDaysAgo }
      },
      include: {
        cliente: { select: { id: true, nombre: true } },
        servicio: { select: { id: true, descripcion: true } }
      }
    });

    if (pendingPayments.length === 0) {
      console.log('💳 No hay pagos pendientes para recordar');
      return;
    }

    // OPTIMIZACIÓN: Batch processing para evitar N+1 queries
    // 1. Recopilar todos los user IDs únicos
    const userIds = new Set();
    for (const payment of pendingPayments) {
      userIds.add(payment.cliente_id);
    }

    // 2. Fetch all user data in one query
    const usersData = await prisma.usuarios.findMany({
      where: {
        id: { in: Array.from(userIds) }
      },
      select: {
        id: true,
        fcm_token: true,
        email: true,
        nombre: true,
        telefono: true,
        sms_enabled: true
      }
    });

    // 3. Crear mapa de user data para acceso rápido
    const userDataMap = new Map();
    for (const user of usersData) {
      userDataMap.set(user.id, user);
    }

    // 4. Procesar notificaciones en batch
    const notificationPromises = [];

    for (const payment of pendingPayments) {
      notificationPromises.push(
        createNotificationBatch(
          payment.cliente_id,
          'recordatorio_pago',
          `Recordatorio: Tienes un pago pendiente de $${payment.monto_total} por "${payment.servicio.descripcion}". Completa el pago para confirmar el servicio.`,
          { paymentId: payment.id, serviceId: payment.servicio_id },
          userDataMap.get(payment.cliente_id)
        )
      );
    }

    // 5. Ejecutar todas las notificaciones en paralelo
    await Promise.all(notificationPromises);

    console.log(`💳 Recordatorios de pago enviados para ${pendingPayments.length} pagos pendientes (optimizado con batch processing)`);
  } catch (error) {
    console.error('Error enviando recordatorios de pagos:', error);
  }
}

/**
 * Enviar recordatorios automáticos de citas
 * Se ejecuta periódicamente para enviar recordatorios 24h y 1h antes
 */
async function sendAppointmentReminders(now) {
  try {
    console.log('📅 Enviando recordatorios automáticos de citas...');

    // Recordatorios 24 horas antes
    await sendAppointmentReminders24h(now);

    // Recordatorios 1 hora antes
    await sendAppointmentReminders1h(now);

    console.log('✅ Recordatorios de citas enviados');
  } catch (error) {
    console.error('Error enviando recordatorios de citas:', error);
  }
}

/**
 * Enviar recordatorios 24 horas antes de la cita
 */
async function sendAppointmentReminders24h(now) {
  try {
    // Citas que empiezan en exactamente 24 horas (±30 minutos)
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const upcomingAppointments = await prisma.appointments.findMany({
      where: {
        scheduled_start: {
          gte: tomorrow,
          lte: tomorrowEnd
        },
        status: { in: ['scheduled', 'confirmed'] },
        reminder_sent: false // Solo enviar si no se ha enviado ya
      },
      include: {
        client: { select: { id: true, nombre: true } },
        professional: { select: { id: true, nombre: true, especialidad: true } },
        slot: true
      }
    });

    if (upcomingAppointments.length === 0) {
      console.log('📅 No hay citas para recordar en 24h');
      return;
    }

    // OPTIMIZACIÓN: Batch processing para evitar N+1 queries
    // 1. Recopilar todos los user IDs únicos
    const userIds = new Set();
    for (const appointment of upcomingAppointments) {
      userIds.add(appointment.client_id);
      userIds.add(appointment.professional_id);
    }

    // 2. Fetch all user data in one query
    const usersData = await prisma.usuarios.findMany({
      where: {
        id: { in: Array.from(userIds) }
      },
      select: {
        id: true,
        fcm_token: true,
        email: true,
        nombre: true,
        telefono: true,
        sms_enabled: true
      }
    });

    // 3. Crear mapa de user data para acceso rápido
    const userDataMap = new Map();
    for (const user of usersData) {
      userDataMap.set(user.id, user);
    }

    // 4. Procesar notificaciones en batch
    const notificationPromises = [];
    const appointmentUpdates = [];

    for (const appointment of upcomingAppointments) {
      const appointmentTime = new Date(appointment.scheduled_start).toLocaleString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Recordatorio al cliente
      notificationPromises.push(
        createNotificationBatch(
          appointment.client_id,
          NOTIFICATION_TYPES.APPOINTMENT_REMINDER_24H,
          `Recordatorio: Tienes una cita programada mañana ${appointmentTime} con ${appointment.professional.nombre} (${appointment.professional.especialidad}).`,
          {
            appointment_id: appointment.id,
            professional_name: appointment.professional.nombre,
            appointment_time: appointmentTime,
            reminder_type: '24h'
          },
          userDataMap.get(appointment.client_id)
        )
      );

      // Recordatorio al profesional
      notificationPromises.push(
        createNotificationBatch(
          appointment.professional_id,
          NOTIFICATION_TYPES.APPOINTMENT_REMINDER_24H,
          `Recordatorio: Tienes una cita programada mañana ${appointmentTime} con ${appointment.client.nombre}.`,
          {
            appointment_id: appointment.id,
            client_name: appointment.client.nombre,
            appointment_time: appointmentTime,
            reminder_type: '24h'
          },
          userDataMap.get(appointment.professional_id)
        )
      );

      // Preparar actualización de appointment
      appointmentUpdates.push(
        prisma.appointments.update({
          where: { id: appointment.id },
          data: { reminder_sent: true }
        })
      );
    }

    // 5. Ejecutar todas las notificaciones en paralelo
    await Promise.all(notificationPromises);

    // 6. Actualizar appointments
    await Promise.all(appointmentUpdates);

    console.log(`📅 Recordatorios 24h enviados para ${upcomingAppointments.length} citas (optimizado con batch processing)`);
  } catch (error) {
    console.error('Error enviando recordatorios 24h:', error);
  }
}

/**
 * Enviar recordatorios 1 hora antes de la cita
 */
async function sendAppointmentReminders1h(now) {
  try {
    // Citas que empiezan en exactamente 1 hora (±10 minutos)
    const oneHourFromNow = new Date(now);
    oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

    const oneHourWindowStart = new Date(oneHourFromNow);
    oneHourWindowStart.setMinutes(oneHourWindowStart.getMinutes() - 10);

    const oneHourWindowEnd = new Date(oneHourFromNow);
    oneHourWindowEnd.setMinutes(oneHourWindowEnd.getMinutes() + 10);

    const upcomingAppointments = await prisma.appointments.findMany({
      where: {
        scheduled_start: {
          gte: oneHourWindowStart,
          lte: oneHourWindowEnd
        },
        status: { in: ['scheduled', 'confirmed'] }
      },
      include: {
        client: { select: { id: true, nombre: true } },
        professional: { select: { id: true, nombre: true, especialidad: true } },
        slot: true
      }
    });

    if (upcomingAppointments.length === 0) {
      console.log('⏰ No hay citas para recordar en 1h');
      return;
    }

    // OPTIMIZACIÓN: Batch processing para evitar N+1 queries
    // 1. Recopilar todos los user IDs únicos
    const userIds = new Set();
    for (const appointment of upcomingAppointments) {
      userIds.add(appointment.client_id);
      userIds.add(appointment.professional_id);
    }

    // 2. Fetch all user data in one query
    const usersData = await prisma.usuarios.findMany({
      where: {
        id: { in: Array.from(userIds) }
      },
      select: {
        id: true,
        fcm_token: true,
        email: true,
        nombre: true,
        telefono: true,
        sms_enabled: true
      }
    });

    // 3. Crear mapa de user data para acceso rápido
    const userDataMap = new Map();
    for (const user of usersData) {
      userDataMap.set(user.id, user);
    }

    // 4. Procesar notificaciones en batch
    const notificationPromises = [];

    for (const appointment of upcomingAppointments) {
      const appointmentTime = new Date(appointment.scheduled_start).toLocaleString('es-AR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Recordatorio al cliente
      notificationPromises.push(
        createNotificationBatch(
          appointment.client_id,
          NOTIFICATION_TYPES.APPOINTMENT_REMINDER_1H,
          `Recordatorio: Tu cita comienza en 1 hora (${appointmentTime}) con ${appointment.professional.nombre} (${appointment.professional.especialidad}).`,
          {
            appointment_id: appointment.id,
            professional_name: appointment.professional.nombre,
            appointment_time: appointmentTime,
            reminder_type: '1h'
          },
          userDataMap.get(appointment.client_id)
        )
      );

      // Recordatorio al profesional
      notificationPromises.push(
        createNotificationBatch(
          appointment.professional_id,
          NOTIFICATION_TYPES.APPOINTMENT_REMINDER_1H,
          `Recordatorio: Tu cita con ${appointment.client.nombre} comienza en 1 hora (${appointmentTime}).`,
          {
            appointment_id: appointment.id,
            client_name: appointment.client.nombre,
            appointment_time: appointmentTime,
            reminder_type: '1h'
          },
          userDataMap.get(appointment.professional_id)
        )
      );
    }

    // 5. Ejecutar todas las notificaciones en paralelo
    await Promise.all(notificationPromises);

    console.log(`⏰ Recordatorios 1h enviados para ${upcomingAppointments.length} citas (optimizado con batch processing)`);
  } catch (error) {
    console.error('Error enviando recordatorios 1h:', error);
  }
}

module.exports = {
  setWebSocketServer: exports.setWebSocketServer,
  createNotification: exports.createNotification,
  createNotificationQuick: exports.createNotificationQuick,
  getUserNotifications: exports.getUserNotifications,
  getNotificationById: exports.getNotificationById,
  markAsRead: exports.markAsRead,
  markAllAsRead: exports.markAllAsRead,
  deleteNotification: exports.deleteNotification,
  scheduleNotification: exports.scheduleNotification,
  processScheduledNotifications: exports.processScheduledNotifications,
  broadcastToUser: exports.broadcastToUser,
  broadcastToUsers: exports.broadcastToUsers,
  broadcastToAll: exports.broadcastToAll,
  broadcastSystemNotification: exports.broadcastSystemNotification,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES
};
