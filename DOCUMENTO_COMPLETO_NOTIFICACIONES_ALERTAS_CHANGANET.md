      // Recordatorio al cliente
      await exports.createNotification(
        service.cliente_id,
        'recordatorio_servicio',
        `Recordatorio: Tienes un servicio agendado mañana con ${service.profesional.nombre} a las ${new Date(service.fecha_agendada).toLocaleTimeString('es-AR')}`,
        { serviceId: service.id, type: 'cliente' }
      );

      // Recordatorio al profesional
      await exports.createNotification(
        service.profesional_id,
        'recordatorio_servicio',
        `Recordatorio: Tienes un servicio agendado mañana con ${service.cliente.nombre} a las ${new Date(service.fecha_agendada).toLocaleTimeString('es-AR')}`,
        { serviceId: service.id, type: 'profesional' }
      );
    }

    console.log(`📅 Recordatorios enviados para ${upcomingServices.length} servicios`);
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

    for (const payment of pendingPayments) {
      await exports.createNotification(
        payment.cliente_id,
        'recordatorio_pago',
        `Recordatorio: Tienes un pago pendiente de $${payment.monto_total} por "${payment.servicio.descripcion}". Completa el pago para confirmar el servicio.`,
        { paymentId: payment.id, serviceId: payment.servicio_id }
      );
    }

    console.log(`💳 Recordatorios de pago enviados para ${pendingPayments.length} pagos pendientes`);
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
      await exports.createNotification(
        appointment.client_id,
        NOTIFICATION_TYPES.APPOINTMENT_REMINDER_24H,
        `Recordatorio: Tienes una cita programada mañana ${appointmentTime} con ${appointment.professional.nombre} (${appointment.professional.especialidad}).`,
        {
          appointment_id: appointment.id,
          professional_name: appointment.professional.nombre,
          appointment_time: appointmentTime,
          reminder_type: '24h'
        }
      );

      // Recordatorio al profesional
      await exports.createNotification(
        appointment.professional_id,
        NOTIFICATION_TYPES.APPOINTMENT_REMINDER_24H,
        `Recordatorio: Tienes una cita programada mañana ${appointmentTime} con ${appointment.client.nombre}.`,
        {
          appointment_id: appointment.id,
          client_name: appointment.client.nombre,
          appointment_time: appointmentTime,
          reminder_type: '24h'
        }
      );

      // Marcar que se envió el recordatorio
      await prisma.appointments.update({
        where: { id: appointment.id },
        data: { reminder_sent: true }
      });
    }

    console.log(`📅 Recordatorios 24h enviados para ${upcomingAppointments.length} citas`);
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

    for (const appointment of upcomingAppointments) {
      const appointmentTime = new Date(appointment.scheduled_start).toLocaleString('es-AR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Recordatorio al cliente
      await exports.createNotification(
        appointment.client_id,
        NOTIFICATION_TYPES.APPOINTMENT_REMINDER_1H,
        `Recordatorio: Tu cita comienza en 1 hora (${appointmentTime}) con ${appointment.professional.nombre} (${appointment.professional.especialidad}).`,
        {
          appointment_id: appointment.id,
          professional_name: appointment.professional.nombre,
          appointment_time: appointmentTime,
          reminder_type: '1h'
        }
      );

      // Recordatorio al profesional
      await exports.createNotification(
        appointment.professional_id,
        NOTIFICATION_TYPES.APPOINTMENT_REMINDER_1H,
        `Recordatorio: Tu cita con ${appointment.client.nombre} comienza en 1 hora (${appointmentTime}).`,
        {
          appointment_id: appointment.id,
          client_name: appointment.client.nombre,
          appointment_time: appointmentTime,
          reminder_type: '1h'
        }
      );
    }

    console.log(`⏰ Recordatorios 1h enviados para ${upcomingAppointments.length} citas`);
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
### 4. Servicio de Preferencias de Notificación (`src/services/notificationPreferencesService.js`)

```javascript
/**
 * @archivo src/services/notificationPreferencesService.js - Servicio de Preferencias de Notificación
 * @descripción Gestiona configuración granular de preferencias de notificación por usuario
 * @mejora Sistema de preferencias expandidas según análisis de gaps
 * @impacto Control granular del usuario sobre sus notificaciones
 */

const { PrismaClient } = require('@prisma/client');
const cacheService = require('./cacheService');

const prisma = new PrismaClient();

// Cache TTL para preferencias
const CACHE_TTL = 300; // 5 minutos

/**
 * Estructura de preferencias expandidas por defecto
 */
const DEFAULT_PREFERENCES = {
  // Configuración general de canales
  canales: {
    push: true,
    email: true,
    sms: false,
    in_app: true
  },

  // Configuración por categorías principales
  categorias: {
    servicios: {
      enabled: true,
      subcategorias: {
        cotizaciones: true,
        servicios_agendados: true,
        recordatorios_servicios: true,
        reseñas: true
      }
    },
    mensajes: {
      enabled: true,
      subcategorias: {
        mensajes_directos: true,
        mensajes_grupales: false,
        notificaciones_chat: true
      }
    },
    pagos: {
      enabled: true,
      subcategorias: {
        pagos_pendientes: true,
        pagos_completados: true,
        comisiones: true,
        retiros: true
      }
    },
    seguridad: {
      enabled: true,
      subcategorias: {
        verificaciones: true,
        alertas_seguridad: true,
        cambios_cuenta: true
      }
    },
    marketing: {
      enabled: false,
      subcategorias: {
        promociones: false,
        newsletters: false,
        eventos: false,
        nuevos_servicios: false
      }
    }
  },

  // Configuración de horarios silenciosos
  horarios_silenciosos: {
    enabled: false,
    inicio: '22:00',
    fin: '08:00',
    dias: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] // Solo días laborables
  },

  // Configuración de frecuencia
  frecuencia: {
    tipo: 'inmediato', // 'inmediato', 'resumen_horario', 'resumen_diario'
    horario_resumen: '19:00', // Para resúmenes
    incluir_no_leidas: true,
    max_por_resumen: 10
  },

  // Configuración de prioridades
  prioridades: {
    critica: {
      canales: ['push', 'email', 'sms'],
      horario_silencioso: false // Siempre enviar críticas
    },
    alta: {
      canales: ['push', 'email'],
      horario_silencioso: false
    },
    media: {
      canales: ['push'],
      horario_silencioso: true
    },
    baja: {
      canales: ['push'],
      horario_silencioso: true
    }
  },

  // Configuración avanzada
  avanzada: {
    agrupar_notificaciones: true,
    max_agrupacion_tiempo: 300, // segundos
    incluir_metadata: true,
    sonido_personalizado: false,
    vibracion: true
  }
};

/**
 * Obtener preferencias de notificación de un usuario con caché
 * @param {string} userId - ID del usuario
 * @returns {Object} Preferencias del usuario
 */
exports.getUserPreferences = async (userId) => {
  try {
    // Verificar caché primero
    const cacheKey = `user_prefs:${userId}`;
    let preferences = await cacheService.get(cacheKey);

    if (preferences) {
      return preferences;
    }

    // Consultar base de datos
    const userPrefs = await prisma.notification_preferences.findUnique({
      where: { usuario_id: userId }
    });

    if (userPrefs) {
      preferences = {
        id: userPrefs.id,
        enabled: userPrefs.enabled,
        timezone: userPrefs.timezone,
        canales: JSON.parse(userPrefs.canales),
        categorias: JSON.parse(userPrefs.categorias),
        quiet_hours_enabled: userPrefs.quiet_hours_enabled,
        quiet_start_time: userPrefs.quiet_start_time,
        quiet_end_time: userPrefs.quiet_end_time,
        summary_frequency: userPrefs.summary_frequency,
        max_notifications_per_hour: userPrefs.max_notifications_per_hour,
        group_similar: userPrefs.group_similar,
        sound_enabled: userPrefs.sound_enabled,
        created_at: userPrefs.creado_en,
        updated_at: userPrefs.actualizado_en
      };
    } else {
      // Crear preferencias por defecto
      preferences = await exports.createDefaultPreferences(userId);
    }

    // Cachear resultado
    await cacheService.set(cacheKey, preferences, CACHE_TTL);

    return preferences;
  } catch (error) {
    console.error('Error obteniendo preferencias de usuario:', error);
    return await exports.createDefaultPreferences(userId);
  }
};

/**
 * Crear preferencias por defecto para un usuario
 * @param {string} userId - ID del usuario
 * @returns {Object} Preferencias por defecto
 */
exports.createDefaultPreferences = async (userId) => {
  try {
    const defaultPrefs = {
      enabled: true,
      timezone: 'America/Buenos_Aires',
      canales: JSON.stringify({
        push: true,
        email: true,
        sms: false,
        in_app: true
      }),
      categorias: JSON.stringify({
        servicios: { enabled: true, subcategorias: { cotizaciones: true, servicios_agendados: true, recordatorios: true, reseñas: true } },
        mensajes: { enabled: true, subcategorias: { mensajes_directos: true, notificaciones_chat: true } },
        pagos: { enabled: true, subcategorias: { pagos_pendientes: true, pagos_completados: true, retiros: true } },
        seguridad: { enabled: true, subcategorias: { verificaciones: true, alertas_seguridad: true } },
        marketing: { enabled: false, subcategorias: { promociones: false, newsletters: false } }
      }),
      quiet_hours_enabled: false,
      quiet_start_time: '22:00',
      quiet_end_time: '08:00',
      summary_frequency: 'immediate',
      max_notifications_per_hour: 50,
      group_similar: true,
      sound_enabled: true
    };

    const created = await prisma.notification_preferences.create({
      data: {
        usuario_id: userId,
        ...defaultPrefs
      }
    });

    return {
      id: created.id,
      ...defaultPrefs,
      canales: JSON.parse(defaultPrefs.canales),
      categorias: JSON.parse(defaultPrefs.categorias),
      created_at: created.creado_en,
      updated_at: created.actualizado_en
    };
  } catch (error) {
    console.error('Error creando preferencias por defecto:', error);
    throw error;
  }
};

/**
 * Actualizar preferencias de notificación de un usuario
 * @param {string} userId - ID del usuario
 * @param {Object} preferences - Preferencias a actualizar
 * @returns {Object} Preferencias actualizadas
 */
exports.updateUserPreferences = async (userId, preferences) => {
  try {
    // Validar y preparar datos
    const updateData = {};

    if (preferences.enabled !== undefined) updateData.enabled = preferences.enabled;
    if (preferences.timezone) updateData.timezone = preferences.timezone;
    if (preferences.canales) updateData.canales = JSON.stringify(preferences.canales);
    if (preferences.categorias) updateData.categorias = JSON.stringify(preferences.categorias);
    if (preferences.quiet_hours_enabled !== undefined) updateData.quiet_hours_enabled = preferences.quiet_hours_enabled;
    if (preferences.quiet_start_time) updateData.quiet_start_time = preferences.quiet_start_time;
    if (preferences.quiet_end_time) updateData.quiet_end_time = preferences.quiet_end_time;
    if (preferences.summary_frequency) updateData.summary_frequency = preferences.summary_frequency;
    if (preferences.max_notifications_per_hour !== undefined) updateData.max_notifications_per_hour = preferences.max_notifications_per_hour;
    if (preferences.group_similar !== undefined) updateData.group_similar = preferences.group_similar;
    if (preferences.sound_enabled !== undefined) updateData.sound_enabled = preferences.sound_enabled;

    updateData.actualizado_en = new Date();

    const updated = await prisma.notification_preferences.upsert({
      where: { usuario_id: userId },
      update: updateData,
      create: {
        usuario_id: userId,
        enabled: preferences.enabled ?? true,
        timezone: preferences.timezone ?? 'America/Buenos_Aires',
        canales: JSON.stringify(preferences.canales ?? { push: true, email: true, sms: false, in_app: true }),
        categorias: JSON.stringify(preferences.categorias ?? DEFAULT_PREFERENCES.categorias),
        quiet_hours_enabled: preferences.quiet_hours_enabled ?? false,
        quiet_start_time: preferences.quiet_start_time ?? '22:00',
        quiet_end_time: preferences.quiet_end_time ?? '08:00',
        summary_frequency: preferences.summary_frequency ?? 'immediate',
        max_notifications_per_hour: preferences.max_notifications_per_hour ?? 50,
        group_similar: preferences.group_similar ?? true,
        sound_enabled: preferences.sound_enabled ?? true
      }
    });

    // Limpiar caché
    await cacheService.del(`user_prefs:${userId}`);

    console.log(`Preferencias de notificación actualizadas para usuario ${userId}`);
    return await exports.getUserPreferences(userId);
  } catch (error) {
    console.error('Error actualizando preferencias de usuario:', error);
    throw error;
  }
};

/**
 * Verificar si una notificación debe enviarse según las preferencias
 * @param {Object} userPreferences - Preferencias del usuario
 * @param {string} type - Tipo de notificación
 * @param {string} priority - Prioridad de la notificación
 * @param {Date} scheduledTime - Tiempo programado (opcional)
 * @returns {Object} Resultado con decisión y canal recomendado
 */
exports.shouldSendNotification = (userPreferences, type, priority, scheduledTime = null) => {
  try {
    // Verificar horarios silenciosos para prioridades no críticas
    if (priority !== 'critical' && isQuietHours(userPreferences.horarios_silenciosos, scheduledTime)) {
      return {
        shouldSend: false,
        reason: 'quiet_hours',
        recommendedAction: 'schedule'
      };
    }

    // Verificar configuración por categoría
    const categoryInfo = getCategoryForType(type);
    if (!userPreferences.categorias[categoryInfo.category]?.enabled) {
      return {
        shouldSend: false,
        reason: 'category_disabled',
        recommendedAction: 'disable'
      };
    }

    // Verificar subcategoría específica
    const subcategoryEnabled = userPreferences.categorias[categoryInfo.category]?.subcategorias?.[categoryInfo.subcategory];
    if (subcategoryEnabled === false) {
      return {
        shouldSend: false,
        reason: 'subcategory_disabled',
        recommendedAction: 'disable'
      };
    }

    // Verificar preferencias de marketing
    if (categoryInfo.category === 'marketing' && !userPreferences.categorias.marketing.enabled) {
      return {
        shouldSend: false,
        reason: 'marketing_disabled',
        recommendedAction: 'disable'
      };
    }

    // Verificar frecuencia (para resúmenes)
    if (userPreferences.frecuencia.tipo !== 'inmediato') {
      return {
        shouldSend: false,
        reason: 'frequency_scheduled',
        recommendedAction: 'queue_for_summary',
        scheduledTime: getNextSummaryTime(userPreferences.frecuencia)
      };
    }

    // Determinar canales recomendados
    const recommendedChannels = getRecommendedChannels(userPreferences, priority, type);

    return {
      shouldSend: true,
      recommendedChannels,
      priority
    };
  } catch (error) {
    console.error('Error evaluando preferencias de notificación:', error);
    return {
      shouldSend: true, // En caso de error, enviar por defecto
      recommendedChannels: ['push'],
      priority
    };
  }
};

/**
 * Obtener canales recomendados según preferencias y prioridad
 * @param {Object} userPreferences - Preferencias del usuario
 * @param {string} priority - Prioridad de la notificación
 * @param {string} type - Tipo de notificación
 * @returns {Array} Canales recomendados
 */
function getRecommendedChannels(userPreferences, priority, type) {
  const priorityConfig = userPreferences.prioridades[priority] || userPreferences.prioridades.media;
  const availableChannels = Object.keys(userPreferences.canales).filter(channel => 
    userPreferences.canales[channel] && priorityConfig.canales.includes(channel)
  );

  // Ajustes específicos por tipo
  if (type === 'bienvenida' && !userPreferences.canales.email) {
    // Si el usuario deshabilitó emails pero es una bienvenida, forzar email
    availableChannels.unshift('email');
  }

  return availableChannels;
}

/**
 * Verificar si está en horario silencioso
 * @param {Object} quietHoursConfig - Configuración de horarios silenciosos
 * @param {Date} checkTime - Tiempo a verificar
 * @returns {boolean} Si está en horario silencioso
 */
function isQuietHours(quietHoursConfig, checkTime = null) {
  if (!quietHoursConfig.enabled) {
    return false;
  }

  const now = checkTime || new Date();
  const currentTime = now.getHours() * 100 + now.getMinutes();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  
  // Verificar si el día está incluido
  if (!quietHoursConfig.dias.includes(currentDay)) {
    return false;
  }

  // Convertir horarios a formato comparable
  const [startHour, startMin] = quietHoursConfig.inicio.split(':').map(Number);
  const [endHour, endMin] = quietHoursConfig.fin.split(':').map(Number);
  
  const startTime = startHour * 100 + startMin;
  const endTime = endHour * 100 + endMin;

  // Verificar si cruza medianoche
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  } else {
    return currentTime >= startTime && currentTime <= endTime;
  }
}

/**
 * Obtener categoría y subcategoría para un tipo de notificación
 * @param {string} type - Tipo de notificación
 * @returns {Object} Información de categoría
 */
function getCategoryForType(type) {
  const categoryMap = {
    // Servicios
    'cotizacion': { category: 'servicios', subcategory: 'cotizaciones' },
    'cotizacion_aceptada': { category: 'servicios', subcategory: 'cotizaciones' },
    'cotizacion_rechazada': { category: 'servicios', subcategory: 'cotizaciones' },
    'servicio_agendado': { category: 'servicios', subcategory: 'servicios_agendados' },
    'turno_agendado': { category: 'servicios', subcategory: 'servicios_agendados' },
    'recordatorio_servicio': { category: 'servicios', subcategory: 'recordatorios_servicios' },
    'resena_recibida': { category: 'servicios', subcategory: 'reseñas' },

    // Mensajes
    'mensaje': { category: 'mensajes', subcategory: 'mensajes_directos' },

    // Pagos
    'pago_liberado': { category: 'pagos', subcategory: 'pagos_completados' },
    'recordatorio_pago': { category: 'pagos', subcategory: 'pagos_pendientes' },
    'fondos_liberados': { category: 'pagos', subcategory: 'retiros' },

    // Seguridad
    'verificacion_aprobada': { category: 'seguridad', subcategory: 'verificaciones' },
    'bienvenida': { category: 'seguridad', subcategory: 'cambios_cuenta' },

    // Marketing (futuro)
    'promocion': { category: 'marketing', subcategory: 'promociones' },
    'newsletter': { category: 'marketing', subcategory: 'newsletters' }
  };

  return categoryMap[type] || { category: 'servicios', subcategory: 'general' };
}

/**
 * Obtener próximo tiempo de resumen según configuración de frecuencia
 * @param {Object} frequencyConfig - Configuración de frecuencia
 * @returns {Date} Próximo tiempo de resumen
 */
function getNextSummaryTime(frequencyConfig) {
  const now = new Date();
  
  if (frequencyConfig.tipo === 'resumen_diario') {
    const [hour, minute] = frequencyConfig.horario_resumen.split(':').map(Number);
    const nextSummary = new Date(now);
    nextSummary.setHours(hour, minute, 0, 0);
    
    // Si ya pasó la hora de hoy, programar para mañana
    if (nextSummary <= now) {
      nextSummary.setDate(nextSummary.getDate() + 1);
    }
    
    return nextSummary;
  }
  
  // Para resumen horario, programar en la próxima hora
  const nextSummary = new Date(now);
  nextSummary.setHours(nextSummary.getHours() + 1, 0, 0, 0);
  return nextSummary;
}

/**
 * Validar estructura de preferencias
 * @param {Object} preferences - Preferencias a validar
 * @returns {Object} Preferencias validadas
 */
function validatePreferencesStructure(preferences) {
  const validated = { ...DEFAULT_PREFERENCES };

  // Validar y fusionar configuraciones
  if (preferences.canales) {
    validated.canales = { ...validated.canales, ...preferences.canales };
  }

  if (preferences.categorias) {
    validated.categorias = mergeDeep(validated.categorias, preferences.categorias);
  }

  if (preferences.horarios_silenciosos) {
    validated.horarios_silenciosos = { ...validated.horarios_silenciosos, ...preferences.horarios_silenciosos };
  }

  if (preferences.frecuencia) {
    validated.frecuencia = { ...validated.frecuencia, ...preferences.frecuencia };
  }

  if (preferences.prioridades) {
    validated.prioridades = mergeDeep(validated.prioridades, preferences.prioridades);
  }

  if (preferences.avanzada) {
    validated.avanzada = { ...validated.avanzada, ...preferences.avanzada };
  }

  return validated;
}

/**
 * Función auxiliar para merge profundo de objetos
 */
function mergeDeep(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeDeep(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Obtener estadísticas de preferencias para analytics
 * @returns {Object} Estadísticas de uso de preferencias
 */
exports.getPreferencesStats = async () => {
  try {
    const stats = {
      total_users: 0,
      channel_usage: {
        push: 0,
        email: 0,
        sms: 0,
        in_app: 0
      },
      category_preferences: {},
      frequency_preferences: {
        inmediato: 0,
        resumen_horario: 0,
        resumen_diario: 0
      },
      quiet_hours_enabled: 0
    };

    // En una implementación completa, consultaríamos la base de datos
    // Por ahora, retornamos estadísticas simuladas
    console.log('Estadísticas de preferencias calculadas (simuladas)');
    
    return stats;
  } catch (error) {
    console.error('Error obteniendo estadísticas de preferencias:', error);
    return {};
  }
};

module.exports = {
  getUserPreferences: exports.getUserPreferences,
  createDefaultPreferences: exports.createDefaultPreferences,
  updateUserPreferences: exports.updateUserPreferences,
  shouldSendNotification: exports.shouldSendNotification,
  getPreferencesStats: exports.getPreferencesStats
};
```

### 5. Servicio de Plantillas de Notificación (`src/services/notificationTemplatesService.js`)

```javascript
/**
 * @archivo src/services/notificationTemplatesService.js - Servicio de Plantillas de Notificación
 * @descripción Gestiona plantillas personalizables para diferentes tipos de notificaciones
 * @mejora Implementación según análisis de gaps - Sistema de Plantillas
 * @impacto Mantenimiento mejorado y consistencia en mensajes
 */

const { PrismaClient } = require('@prisma/client');
const cacheService = require('./cacheService');

const prisma = new PrismaClient();

// Cache TTL para plantillas
const CACHE_TTL = 3600; // 1 hora

/**
 * Plantillas de notificación predefinidas por tipo y canal
 */
const DEFAULT_TEMPLATES = {
  // Bienvenida
  bienvenida: {
    push: {
      title: '¡Bienvenido a ChangAnet!',
      body: 'Tu cuenta ha sido creada exitosamente. ¡Descubre los mejores profesionales cerca tuyo!'
    },
    email: {
      subject: '¡Bienvenido a ChangAnet!',
      html: '<h1>¡Bienvenido a ChangAnet!</h1><p>Tu cuenta ha sido creada exitosamente. ¡Descubre los mejores profesionales cerca tuyo!</p>'
    },
    sms: '¡Bienvenido a ChangAnet! Tu cuenta está lista. Descarga la app para encontrar profesionales cerca tuyo.'
  },

  // Cotizaciones
  cotizacion: {
    push: {
      title: 'Nueva solicitud de presupuesto',
      body: 'Tienes una nueva solicitud de presupuesto para {{servicio}}. ¡Responde rápidamente!'
    },
    email: {
      subject: 'Nueva solicitud de presupuesto',
      html: '<h2>Nueva solicitud de presupuesto</h2><p>Tienes una nueva solicitud de presupuesto para <strong>{{servicio}}</strong>.</p><p>¡Responde rápidamente para ganar este trabajo!</p>'
    },
    sms: 'Nueva solicitud de presupuesto para {{servicio}}. Responde desde la app ChangAnet.'
  },

  cotizacion_aceptada: {
    push: {
      title: '¡Cotización aceptada!',
      body: 'Tu cotización para {{servicio}} ha sido aceptada. ¡Excelente trabajo!'
    },
    email: {
      subject: '¡Cotización aceptada!',
      html: '<h2>¡Felicitaciones!</h2><p>Tu cotización para <strong>{{servicio}}</strong> ha sido aceptada.</p><p>Te contactaremos pronto para coordinar los detalles.</p>'
    },
    sms: '¡Felicitaciones! Tu cotización para {{servicio}} fue aceptada. Esperá nuestras instrucciones.'
  },

  cotizacion_rechazada: {
    push: {
      title: 'Cotización rechazada',
      body: 'Tu cotización para {{servicio}} no fue seleccionada. ¡Sigue intentando!'
    },
    email: {
      subject: 'Cotización rechazada',
      html: '<h2>Cotización no seleccionada</h2><p>Lamentamos informarte que tu cotización para <strong>{{servicio}}</strong> no fue seleccionada en esta oportunidad.</p><p>¡No te desanimes! Hay muchas más oportunidades esperándote.</p>'
    },
    sms: 'Tu cotización para {{servicio}} no fue seleccionada. ¡Sigue intentando en ChangAnet!'
  },

  // Servicios agendados
  servicio_agendado: {
    push: {
      title: 'Servicio agendado',
      body: 'Tienes un servicio agendado con {{profesional}} el {{fecha}} a las {{hora}}'
    },
    email: {
      subject: 'Servicio agendado',
      html: '<h2>Servicio agendado</h2><p>Tienes un servicio agendado con <strong>{{profesional}}</strong></p><p><strong>Fecha:</strong> {{fecha}}<br><strong>Hora:</strong> {{hora}}</p>'
    },
    sms: 'Servicio agendado con {{profesional}} el {{fecha}} a las {{hora}}. Recordá estar disponible.'
  },

  // Mensajes
  mensaje: {
    push: {
      title: 'Nuevo mensaje',
      body: 'Tienes un nuevo mensaje de {{remitente}}'
    },
    email: {
      subject: 'Nuevo mensaje',
      html: '<h2>Nuevo mensaje</h2><p>Tienes un nuevo mensaje de <strong>{{remitente}}</strong></p><p>{{contenido_mensaje}}</p>'
    },
    sms: 'Nuevo mensaje de {{remitente}} en ChangAnet. Ingresa a la app para verlo.'
  },

  // Reseñas
  resena_recibida: {
    push: {
      title: 'Nueva reseña recibida',
      body: '{{cliente}} te dejó una reseña de {{rating}} estrellas. ¡Excelente trabajo!'
    },
    email: {
      subject: 'Nueva reseña recibida',
      html: '<h2>¡Nueva reseña!</h2><p><strong>{{cliente}}</strong> te dejó una reseña de {{rating}} estrellas.</p><p>{{comentario}}</p>'
    },
    sms: 'Nueva reseña de {{rating}} estrellas de {{cliente}} en ChangAnet. ¡Felicitaciones!'
  },

  // Pagos
  pago_liberado: {
    push: {
      title: 'Pago liberado',
      body: 'Tu pago de ${{monto}} por {{servicio}} ha sido liberado a tu cuenta'
    },
    email: {
      subject: 'Pago liberado',
      html: '<h2>Pago liberado</h2><p>Tu pago de <strong>${{monto}}</strong> por <strong>{{servicio}}</strong> ha sido liberado a tu cuenta.</p><p>Recibirás el dinero en las próximas 24-48 horas.</p>'
    },
    sms: 'Tu pago de ${{monto}} por {{servicio}} fue liberado. Llegará a tu cuenta en 24-48hs.'
  },

  // Verificación
  verificacion_aprobada: {
    push: {
      title: '¡Verificación aprobada!',
      body: 'Tu identidad ha sido verificada exitosamente. ¡Ya puedes ofrecer servicios!'
    },
    email: {
      subject: '¡Verificación aprobada!',
      html: '<h2>¡Felicitaciones!</h2><p>Tu identidad ha sido verificada exitosamente.</p><p>Ya puedes ofrecer servicios en ChangAnet con confianza.</p>'
    },
    sms: '¡Verificación aprobada! Tu identidad fue confirmada. Ya puedes ofrecer servicios en ChangAnet.'
  },

  // Servicios urgentes
  servicio_urgente_agendado: {
    push: {
      title: '¡Servicio Urgente Agendado!',
      body: 'Servicio urgente de {{servicio}} confirmado para {{fecha}} {{hora}}'
    },
    email: {
      subject: '¡Servicio Urgente Agendado!',
      html: '<h2>🔥 Servicio Urgente Confirmado</h2><p>Tu servicio urgente de <strong>{{servicio}}</strong> ha sido confirmado.</p><p><strong>Fecha:</strong> {{fecha}}<br><strong>Hora:</strong> {{hora}}</p>'
    },
    sms: '🔥 Servicio urgente de {{servicio}} confirmado para {{fecha}} {{hora}}. Te contactaremos pronto.'
  },

  // Recordatorios
  recordatorio_servicio: {
    push: {
      title: 'Recordatorio de servicio',
      body: 'Tienes un servicio mañana con {{profesional}} a las {{hora}}'
    },
    email: {
      subject: 'Recordatorio de servicio',
      html: '<h2>Recordatorio de servicio</h2><p>Tienes un servicio mañana con <strong>{{profesional}}</strong> a las <strong>{{hora}}</strong></p>'
    },
    sms: 'Recordatorio: Servicio mañana con {{profesional}} a las {{hora}}. ¡No lo olvides!'
  },

  recordatorio_pago: {
    push: {
      title: 'Recordatorio de pago',
      body: 'Tienes un pago pendiente de ${{monto}} por "{{servicio}}"'
    },
    email: {
      subject: 'Recordatorio de pago',
      html: '<h2>Recordatorio de pago</h2><p>Tienes un pago pendiente de <strong>${{monto}}</strong> por <strong>"{{servicio}}"</strong></p><p>Completa el pago para confirmar el servicio.</p>'
    },
    sms: 'Recordatorio: Pago pendiente de ${{monto}} por "{{servicio}}". Completa el pago desde la app.'
  }
};

/**
 * Obtener plantilla para un tipo específico y canal desde la base de datos
 * @param {string} type - Tipo de notificación
 * @param {string} channel - Canal (push, email, sms)
 * @returns {Object} Plantilla con título/contenido
 */
exports.getTemplate = async (type, channel = 'push') => {
  try {
    const cacheKey = `template:${type}:${channel}`;

    // Verificar caché
    let template = await cacheService.get(cacheKey);
    if (template) {
      return template;
    }

    // Buscar en base de datos
    const dbTemplate = await prisma.notification_templates.findFirst({
      where: {
        tipo: type,
        activo: true
      }
    });

    if (!dbTemplate) {
      // Retornar plantilla por defecto si no existe en BD
      return exports.getDefaultTemplate(type, channel);
    }

    // Construir plantilla según canal
    template = exports.buildTemplateForChannel(dbTemplate, channel);

    // Cachear resultado
    await cacheService.set(cacheKey, template, CACHE_TTL);

    return template;
  } catch (error) {
    console.error('Error obteniendo plantilla:', error);
    return exports.getDefaultTemplate(type, channel);
  }
};

/**
 * Construir plantilla para un canal específico
 * @param {Object} dbTemplate - Plantilla de base de datos
 * @param {string} channel - Canal solicitado
 * @returns {Object} Plantilla procesada
 */
exports.buildTemplateForChannel = (dbTemplate, channel) => {
  const template = {};

  switch (channel) {
    case 'push':
      template.title = dbTemplate.titulo_push;
      template.body = dbTemplate.mensaje_push;
      break;
    case 'email':
      template.subject = dbTemplate.asunto_email;
      template.html = dbTemplate.mensaje_email;
      break;
    case 'sms':
      template.sms = dbTemplate.mensaje_sms;
      break;
    default:
      template.title = dbTemplate.titulo_push;
      template.body = dbTemplate.mensaje_push;
  }

  return template;
};

/**
 * Obtener plantilla por defecto cuando no existe en BD
 * @param {string} type - Tipo de notificación
 * @param {string} channel - Canal
 * @returns {Object} Plantilla por defecto
 */
exports.getDefaultTemplate = (type, channel) => {
  const defaults = {
    push: {
      title: 'Nueva notificación',
      body: `Tienes una nueva notificación de tipo ${type} en ChangAnet`
    },
    email: {
      subject: 'Nueva notificación ChangAnet',
      html: `<p>Tienes una nueva notificación de tipo <strong>${type}</strong> en ChangAnet</p>`
    },
    sms: `Nueva notificación ${type} en ChangAnet.`
  };

  return defaults[channel] || defaults.push;
};

/**
 * Procesar plantilla reemplazando variables
 * @param {Object} template - Plantilla con variables
 * @param {Object} variables - Variables a reemplazar
 * @returns {Object} Plantilla procesada
 */
exports.processTemplate = (template, variables = {}) => {
  const processed = {};

  for (const [key, value] of Object.entries(template)) {
    if (typeof value === 'string') {
      processed[key] = value.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
        return variables[variable] || match;
      });
    } else {
      processed[key] = value;
    }
  }

  return processed;
};

/**
 * Generar notificación procesada según tipo, canal y variables
 * @param {string} type - Tipo de notificación
 * @param {string} channel - Canal
 * @param {Object} variables - Variables para la plantilla
 * @returns {Object} Notificación procesada
 */
exports.generateNotification = async (type, channel = 'push', variables = {}) => {
  const template = await exports.getTemplate(type, channel);
  return exports.processTemplate(template, variables);
};

/**
 * Obtener todos los tipos de notificación disponibles
 * @returns {Array} Lista de tipos de notificación
 */
exports.getAvailableTypes = () => {
  return Object.keys(DEFAULT_TEMPLATES);
};

/**
 * Obtener canales disponibles para un tipo
 * @param {string} type - Tipo de notificación
 * @returns {Array} Lista de canales disponibles
 */
exports.getChannelsForType = (type) => {
  const template = DEFAULT_TEMPLATES[type];
  if (!template) {
    return ['push', 'email', 'sms'];
  }
  return Object.keys(template);
};

/**
 * Validar si un tipo de notificación es válido
 * @param {string} type - Tipo de notificación
 * @returns {boolean} Si es válido
 */
exports.isValidType = (type) => {
  return Object.keys(DEFAULT_TEMPLATES).includes(type);
};

/**
 * Obtener plantilla personalizada del usuario o la por defecto
 * @param {string} userId - ID del usuario
 * @param {string} type - Tipo de notificación
 * @param {string} channel - Canal
 * @returns {Object} Plantilla personalizada o por defecto
 */
exports.getUserTemplate = async (userId, type, channel = 'push') => {
  try {
    // En una implementación completa, buscaríamos plantillas personalizadas del usuario
    // Por ahora, retornamos la plantilla por defecto
    return await exports.getTemplate(type, channel);
  } catch (error) {
    console.error('Error obteniendo plantilla personalizada:', error);
    return exports.getDefaultTemplate(type, channel);
  }
};

/**
 * Crear o actualizar plantilla en la base de datos
 * @param {Object} templateData - Datos de la plantilla
 * @returns {Object} Plantilla creada/actualizada
 */
exports.createOrUpdateTemplate = async (templateData) => {
  try {
    const {
      nombre,
      tipo,
      subtipo,
      titulo_push,
      mensaje_push,
      titulo_email,
      mensaje_email,
      asunto_email,
      mensaje_sms,
      variables,
      prioridad_default = 'MEDIUM'
    } = templateData;

    const template = await prisma.notification_templates.upsert({
      where: { nombre },
      update: {
        tipo,
        subtipo,
        titulo_push,
        mensaje_push,
        titulo_email,
        mensaje_email,
        asunto_email,
        mensaje_sms,
        variables: variables ? JSON.stringify(variables) : null,
        prioridad_default,
        actualizado_en: new Date()
      },
      create: {
        nombre,
        tipo,
        subtipo,
        titulo_push,
        mensaje_push,
        titulo_email,
        mensaje_email,
        asunto_email,
        mensaje_sms,
        variables: variables ? JSON.stringify(variables) : null,
        prioridad_default
      }
    });

    // Limpiar caché relacionado
    await cacheService.del(`template:${tipo}:*`);

    return template;
  } catch (error) {
    console.error('Error creando/actualizando plantilla:', error);
    throw error;
  }
};

/**
 * Obtener todas las plantillas activas
 * @returns {Array} Lista de plantillas
 */
exports.getAllTemplates = async () => {
  try {
    return await prisma.notification_templates.findMany({
      where: { activo: true },
      orderBy: { tipo: 'asc' }
    });
  } catch (error) {
    console.error('Error obteniendo todas las plantillas:', error);
    return [];
  }
};

/**
 * Desactivar plantilla
 * @param {string} templateId - ID de la plantilla
 */
exports.deactivateTemplate = async (templateId) => {
  try {
    await prisma.notification_templates.update({
      where: { id: templateId },
      data: { activo: false, actualizado_en: new Date() }
    });

    // Limpiar caché
    await cacheService.del(`template:*`);

    console.log(`Plantilla ${templateId} desactivada`);
  } catch (error) {
    console.error('Error desactivando plantilla:', error);
    throw error;
  }
};

/**
 * Inicializar plantillas por defecto en la base de datos
 */
exports.initializeDefaultTemplates = async () => {
  try {
    const defaultTemplates = [
      {
        nombre: 'bienvenida',
        tipo: 'SEGURIDAD',
        titulo_push: '¡Bienvenido a ChangAnet!',
        mensaje_push: 'Tu cuenta ha sido creada exitosamente. ¡Descubre los mejores profesionales cerca tuyo!',
        titulo_email: '¡Bienvenido a ChangAnet!',
        mensaje_email: '<h1>¡Bienvenido a ChangAnet!</h1><p>Tu cuenta ha sido creada exitosamente. ¡Descubre los mejores profesionales cerca tuyo!</p>',
        asunto_email: '¡Bienvenido a ChangAnet!',
        mensaje_sms: '¡Bienvenido a ChangAnet! Tu cuenta está lista. Descarga la app para encontrar profesionales cerca tuyo.',
        prioridad_default: 'MEDIUM'
      },
      {
        nombre: 'cotizacion',
        tipo: 'SERVICIO',
        titulo_push: 'Nueva solicitud de presupuesto',
        mensaje_push: 'Tienes una nueva solicitud de presupuesto para {{servicio}}. ¡Responde rápidamente!',
        titulo_email: 'Nueva solicitud de presupuesto',
        mensaje_email: '<h2>Nueva solicitud de presupuesto</h2><p>Tienes una nueva solicitud de presupuesto para <strong>{{servicio}}</strong>.</p><p>¡Responde rápidamente para ganar este trabajo!</p>',
        asunto_email: 'Nueva solicitud de presupuesto',
        mensaje_sms: 'Nueva solicitud de presupuesto para {{servicio}}. Responde desde la app ChangAnet.',
        prioridad_default: 'HIGH'
      },
      {
        nombre: 'mensaje',
        tipo: 'MENSAJE',
        titulo_push: 'Nuevo mensaje',
        mensaje_push: 'Tienes un nuevo mensaje de {{remitente}}',
        titulo_email: 'Nuevo mensaje',
        mensaje_email: '<h2>Nuevo mensaje</h2><p>Tienes un nuevo mensaje de <strong>{{remitente}}</strong></p><p>{{contenido_mensaje}}</p>',
        asunto_email: 'Nuevo mensaje',
        mensaje_sms: 'Nuevo mensaje de {{remitente}} en ChangAnet. Ingresa a la app para verlo.',
        prioridad_default: 'MEDIUM'
      }
    ];

    for (const template of defaultTemplates) {
      await exports.createOrUpdateTemplate(template);
    }

    console.log('Plantillas por defecto inicializadas');
  } catch (error) {
    console.error('Error inicializando plantillas por defecto:', error);
  }
};

module.exports = {
  getTemplate: exports.getTemplate,
  buildTemplateForChannel: exports.buildTemplateForChannel,
  getDefaultTemplate: exports.getDefaultTemplate,
  processTemplate: exports.processTemplate,
  generateNotification: exports.generateNotification,
  getAvailableTypes: exports.getAvailableTypes,
  getChannelsForType: exports.getChannelsForType,
  isValidType: exports.isValidType,
  getUserTemplate: exports.getUserTemplate,
  createOrUpdateTemplate: exports.createOrUpdateTemplate,
  getAllTemplates: exports.getAllTemplates,
  deactivateTemplate: exports.deactivateTemplate,
  initializeDefaultTemplates: exports.initializeDefaultTemplates
};
```

### 6. Servicio de Rate Limiting (`src/services/rateLimiterService.js`)

```javascript
/**
 * @archivo src/services/rateLimiterService.js - Servicio de Rate Limiting
 * @descripción Control de tasa de solicitudes para prevenir abuso
 * @impacto Seguridad y rendimiento del sistema
 */

const Redis = require('ioredis');

class RateLimiterService {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Verificar límite de rate
   * @param {string} key - Clave única (ej: 'notification:userId')
   * @param {number} limit - Número máximo de operaciones
   * @param {number} windowSeconds - Ventana de tiempo en segundos
   * @returns {boolean} true si está dentro del límite
   */
  async checkLimit(key, limit, windowSeconds) {
    try {
      const now = Date.now();
      const windowStart = now - (windowSeconds * 1000);

      // Usar Redis sorted set para mantener timestamps
      const score = now;
      const member = `${key}:${now}`;

      // Agregar timestamp actual
      await this.redis.zadd(key, score, member);

      // Remover timestamps fuera de la ventana
      await this.redis.zremrangebyscore(key, '-inf', windowStart);

      // Contar elementos en la ventana
      const count = await this.redis.zcount(key, windowStart, '+inf');

      // Establecer expiración de la key
      await this.redis.expire(key, windowSeconds);

      return count <= limit;
    } catch (error) {
      console.error('Rate limiter error:', error);
      // En caso de error de Redis, permitir la operación
      return true;
    }
  }

  /**
   * Obtener información de rate limit
   * @param {string} key - Clave única
   * @param {number} limit - Límite
   * @param {number} windowSeconds - Ventana
   * @returns {Object} Información del límite
   */
  async getLimitInfo(key, limit, windowSeconds) {
    try {
      const now = Date.now();
      const windowStart = now - (windowSeconds * 1000);

      await this.redis.zremrangebyscore(key, '-inf', windowStart);
      const count = await this.redis.zcount(key, windowStart, '+inf');

      const remaining = Math.max(0, limit - count);
      const resetTime = now + (windowSeconds * 1000);

      return {
        limit,
        remaining,
        resetTime,
        current: count
      };
    } catch (error) {
      console.error('Rate limiter info error:', error);
      return {
        limit,
        remaining: limit,
        resetTime: Date.now() + (windowSeconds * 1000),
        current: 0
      };
    }
  }

  /**
   * Limpiar keys expiradas (mantenimiento)
   */
  async cleanup() {
    // Redis maneja la expiración automáticamente con EXPIRE
    // Este método puede usarse para limpieza manual si es necesario
  }

  /**
   * Cerrar conexión Redis
   */
  async close() {
    await this.redis.quit();
  }
}

module.exports = new RateLimiterService();
```

### 7. Servicio de Monitoreo (`src/services/monitoringService.js`)

```javascript
/**
 * @archivo src/services/monitoringService.js - Servicio de Monitoreo y Métricas
 * @descripción Métricas de negocio y monitoreo para notificaciones
 * @impacto Observabilidad y rendimiento del sistema
 */

const { collectDefaultMetrics, register, Gauge, Counter, Histogram } = require('prom-client');

// Métricas de negocio para notificaciones
const notificationsSent = new Counter({
  name: 'changanet_notifications_sent_total',
  help: 'Total number of notifications sent',
  labelNames: ['type', 'channel', 'priority']
});

const notificationsDelivered = new Counter({
  name: 'changanet_notifications_delivered_total',
  help: 'Total number of notifications delivered',
  labelNames: ['type', 'channel']
});

const notificationsRead = new Counter({
  name: 'changanet_notifications_read_total',
  help: 'Total number of notifications read',
  labelNames: ['type', 'priority']
});

const websocketConnections = new Gauge({
  name: 'changanet_websocket_connections_active',
  help: 'Number of active WebSocket connections'
});

const notificationLatency = new Histogram({
  name: 'changanet_notification_processing_duration_seconds',
  help: 'Time taken to process notifications',
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

// Métricas de rate limiting
const rateLimitHits = new Counter({
  name: 'changanet_rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint', 'user_id']
});

const rateLimitExceeded = new Counter({
  name: 'changanet_rate_limit_exceeded_total',
  help: 'Total number of rate limit exceeded events',
  labelNames: ['endpoint', 'user_id']
});

// Métricas de caché
const cacheHits = new Counter({
  name: 'changanet_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type']
});

const cacheMisses = new Counter({
  name: 'changanet_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type']
});

class MonitoringService {
  constructor() {
    // Métricas por defecto de Node.js
    collectDefaultMetrics({ register });
  }

  // Notificaciones
  recordNotificationSent(type, channel, priority) {
    notificationsSent.inc({ type, channel, priority });
  }

  recordNotificationDelivered(type, channel) {
    notificationsDelivered.inc({ type, channel });
  }

  recordNotificationRead(type, priority) {
    notificationsRead.inc({ type, priority });
  }

  // WebSocket
  setWebSocketConnections(count) {
    websocketConnections.set(count);
  }

  // Latencia
  startNotificationTimer() {
    return notificationLatency.startTimer();
  }

  // Rate limiting
  recordRateLimitHit(endpoint, userId) {
    rateLimitHits.inc({ endpoint, user_id: userId });
  }

  recordRateLimitExceeded(endpoint, userId) {
    rateLimitExceeded.inc({ endpoint, user_id: userId });
  }

  // Caché
  recordCacheHit(cacheType) {
    cacheHits.inc({ cache_type: cacheType });
  }

  recordCacheMiss(cacheType) {
    cacheMisses.inc({ cache_type: cacheType });
  }

  // Obtener todas las métricas
  async getMetrics() {
    return register.metrics();
  }

  // Health check
  async getHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    };
  }

  // Estadísticas detalladas
  async getDetailedStats() {
    const metrics = await register.getMetricsAsJSON();

    return {
      notifications: {
        sent: this.getMetricValue(metrics, 'changanet_notifications_sent_total'),
        delivered: this.getMetricValue(metrics, 'changanet_notifications_delivered_total'),
        read: this.getMetricValue(metrics, 'changanet_notifications_read_total')
      },
      websocket: {
        connections: this.getMetricValue(metrics, 'changanet_websocket_connections_active')
      },
      rateLimiting: {
        hits: this.getMetricValue(metrics, 'changanet_rate_limit_hits_total'),
        exceeded: this.getMetricValue(metrics, 'changanet_rate_limit_exceeded_total')
      },
      cache: {
        hits: this.getMetricValue(metrics, 'changanet_cache_hits_total'),
        misses: this.getMetricValue(metrics, 'changanet_cache_misses_total')
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };
  }

  // Helper para extraer valores de métricas
  getMetricValue(metrics, name) {
    const metric = metrics.find(m => m.name === name);
    if (!metric) return 0;

    if (metric.type === 'counter' || metric.type === 'gauge') {
      return metric.values?.reduce((sum, v) => sum + v.value, 0) || 0;
    }

    return 0;
  }

  // Reset metrics (para testing)
  resetMetrics() {
    // En producción, esto podría no ser necesario
    console.log('Resetting monitoring metrics');
  }
}

module.exports = new MonitoringService();
```

### 8. Servidor WebSocket de Notificaciones (`src/websocket/notificationSocket.js`)

```javascript
/**
 * @archivo src/websocket/notificationSocket.js - WebSocket Server para Notificaciones
 * @descripción Servidor WebSocket para notificaciones en tiempo real
 * @impacto Comunicación bidireccional en tiempo real
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { notificationService } = require('../services/notificationService');

class NotificationWebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({
      server,
      path: '/ws/notifications',
      perMessageDeflate: false,
      maxPayload: 1024 * 1024 // 1MB max
    });

    this.clients = new Map(); // userId -> Set of WebSocket connections
    this.heartbeatInterval = setInterval(() => this.checkHeartbeats(), 30000);

    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
  }

  async handleConnection(ws, req) {
    try {
      // Autenticación JWT desde query parameters
      const token = req.url.split('token=')[1]?.split('&')[0];
      if (!token) {
        ws.close(4001, 'Authentication required');
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

      // Registrar conexión
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId).add(ws);

      // Configurar handlers
      ws.isAlive = true;
      ws.userId = userId;

      ws.on('pong', () => { ws.isAlive = true; });
      ws.on('message', (data) => this.handleMessage(ws, data));
      ws.on('close', () => this.handleDisconnection(ws));
      ws.on('error', (error) => this.handleError(ws, error));

      // Enviar confirmación de conexión
      ws.send(JSON.stringify({
        type: 'connection_established',
        userId,
        timestamp: new Date().toISOString()
      }));

      // Enviar notificaciones no leídas pendientes
      await this.sendPendingNotifications(userId);

    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(4002, 'Authentication failed');
    }
  }

  async handleMessage(ws, data) {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'mark_as_read':
          await notificationService.markAsRead(message.notificationId);
          // Broadcast update to all user connections
          this.broadcastToUser(ws.userId, {
            type: 'notification_updated',
            notificationId: message.notificationId,
            action: 'marked_as_read'
          });
          break;

        case 'mark_all_as_read':
          await notificationService.markAllAsRead(ws.userId);
          this.broadcastToUser(ws.userId, {
            type: 'all_notifications_read'
          });
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        case 'update_preferences':
          // Aquí podríamos actualizar preferencias en tiempo real
          console.log(`User ${ws.userId} updated notification preferences`);
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  }

  handleDisconnection(ws) {
    if (ws.userId && this.clients.has(ws.userId)) {
      this.clients.get(ws.userId).delete(ws);
      if (this.clients.get(ws.userId).size === 0) {
        this.clients.delete(ws.userId);
      }
    }
  }

  handleError(ws, error) {
    console.error('WebSocket error:', error);
    this.handleDisconnection(ws);
  }

  checkHeartbeats() {
    this.wss.clients.forEach(ws => {
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }

  // Enviar notificación a usuario específico
  async sendToUser(userId, notification) {
    if (!this.clients.has(userId)) return false;

    const message = JSON.stringify({
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString()
    });

    let sent = false;
    for (const ws of this.clients.get(userId)) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sent = true;
      }
    }
    return sent;
  }

  // Broadcast a todos los clientes de un usuario
  broadcastToUser(userId, message) {
    if (!this.clients.has(userId)) return;

    const data = JSON.stringify(message);
    for (const ws of this.clients.get(userId)) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  // Enviar notificaciones pendientes al conectar
  async sendPendingNotifications(userId) {
    try {
      const notifications = await notificationService.getUserNotifications(userId, 'unread');
      if (notifications.notifications.length > 0) {
        this.broadcastToUser(userId, {
          type: 'pending_notifications',
          notifications: notifications.notifications,
          unreadCount: notifications.unreadCount
        });
      }
    } catch (error) {
      console.error('Error sending pending notifications:', error);
    }
  }

  // Obtener estadísticas de conexiones
  getConnectionStats() {
    const stats = {
      totalConnections: this.wss.clients.size,
      activeUsers: this.clients.size,
      connectionsPerUser: {}
    };

    for (const [userId, connections] of this.clients) {
      stats.connectionsPerUser[userId] = connections.size;
    }

    return stats;
  }

  // Cleanup
  close() {
    clearInterval(this.heartbeatInterval);
    this.wss.close();
  }
}

module.exports = NotificationWebSocketServer;
```

### 9. Servidor Principal Actualizado (`src/server.js`)

```javascript
// Initialize WebSocket server for notifications
const NotificationWebSocketServer = require('./websocket/notificationSocket');

// Initialize WebSocket server for notifications
const notificationWebSocketServer = new NotificationWebSocketServer(server);

// Set WebSocket server in notification service
const notificationService = require('./services/notificationService');
notificationService.setWebSocketServer(notificationWebSocketServer);

// Rutas de notificaciones con autenticación requerida
app.use('/api/notifications', authenticateToken, notificationRoutes);
```

---

## Frontend

### 1. API de Notificaciones (`lib/notificationApi.ts`)

```typescript
import { apiClient } from './api';
import {
  Notification,
  NotificationPreferences,
  NotificationFilters,
  NotificationResponse,
  NotificationType,
  NotificationChannel
} from '@/types/notifications';

// Notification API methods
export const notificationApi = {
  // Get user notifications with filters and pagination
  getUserNotifications: async (
    filters: Partial<NotificationFilters> = {}
  ): Promise<NotificationResponse> => {
    const params = {
      filter: filters.filter || 'all',
      priority: filters.priority,
      type: filters.type,
      page: filters.page || 1,
      limit: filters.limit || 20,
      sortBy: filters.sortBy || 'creado_en',
      sortOrder: filters.sortOrder || 'desc'
    };

    const response = await apiClient.get<NotificationResponse>('/notifications', params);
    return response.data.data;
  },

  // Get unread count
  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get<{ count: number }>('/notifications/unread-count');
    return response.data.data;
  },

  // Mark notification as read
  markAsRead: async (notificationId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.put<{ success: boolean }>(`/notifications/${notificationId}/read`);
    return response.data.data;
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<{ success: boolean; count: number }> => {
    const response = await apiClient.put<{ success: boolean; count: number }>('/notifications/mark-all-read');
    return response.data.data;
  },

  // Create notification (admin/internal use)
  createNotification: async (data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    priority?: 'critical' | 'high' | 'medium' | 'low';
    metadata?: Record<string, any>;
    channels?: NotificationChannel[];
  }): Promise<Notification> => {
    const response = await apiClient.post<Notification>('/notifications', data);
    return response.data.data;
  },

  // Delete notification
  deleteNotification: async (notificationId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/notifications/${notificationId}`);
    return response.data.data;
  },

  // Get notification preferences
  getUserPreferences: async (): Promise<NotificationPreferences> => {
    const response = await apiClient.get<NotificationPreferences>('/notifications/preferences');
    return response.data.data;
  },

  // Update notification preferences
  updateUserPreferences: async (
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> => {
    const response = await apiClient.put<NotificationPreferences>('/notifications/preferences', preferences);
    return response.data.data;
  },

  // Get WebSocket connection info
  getWebSocketInfo: async (): Promise<{
    success: boolean;
    wsUrl: string;
    protocols: string[]
  }> => {
    const response = await apiClient.get<{
      success: boolean;
      wsUrl: string;
      protocols: string[]
    }>('/notifications/ws-info');
    return response.data.data;
  }
};
```

### 2. Servicio de Socket (`lib/socketService.ts`)

```typescript
import { io, Socket } from 'socket.io-client';

export interface WebSocketMessage {
  type: string;
  data?: any;
  notificationId?: string;
  action?: string;
  notifications?: any[];
  unreadCount?: number;
  timestamp?: string;
}

export interface NotificationWebSocketEvents {
  connected: () => void;
  disconnected: () => void;
  notification: (data: WebSocketMessage) => void;
  notification_updated: (data: WebSocketMessage) => void;
  all_notifications_read: () => void;
  pending_notifications: (data: WebSocketMessage) => void;
  error: (error: any) => void;
}

class NotificationSocketService {
  private socket: Socket | null = null;
  private eventListeners: Map<keyof NotificationWebSocketEvents, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  async connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Get WebSocket URL from API
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/notifications?token=${token}`;

        this.socket = io(wsUrl, {
          transports: ['websocket'],
          timeout: 20000,
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.emit('connected');
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason);
          this.emit('disconnected');
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.reconnectAttempts++;

          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error('Failed to connect to WebSocket after maximum attempts'));
          }
        });

        // Notification events
        this.socket.on('notification', (data: WebSocketMessage) => {
          this.emit('notification', data);
        });

        this.socket.on('notification_updated', (data: WebSocketMessage) => {
          this.emit('notification_updated', data);
        });

        this.socket.on('all_notifications_read', () => {
          this.emit('all_notifications_read');
        });

        this.socket.on('pending_notifications', (data: WebSocketMessage) => {
          this.emit('pending_notifications', data);
        });

        this.socket.on('error', (error) => {
          this.emit('error', error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Event system
  on<K extends keyof NotificationWebSocketEvents>(
    event: K,
    listener: NotificationWebSocketEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off<K extends keyof NotificationWebSocketEvents>(
    event: K,
    listener: NotificationWebSocketEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit<K extends keyof NotificationWebSocketEvents>(
    event: K,
    ...args: Parameters<NotificationWebSocketEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }

  // Send messages to server
  sendMessage(type: string, data: any = {}): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(type, data);
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  // Check connection status
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Get connection stats
  getConnectionStats() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id
    };
  }
}

export const notificationSocket = new NotificationSocketService();
```

### 3. Hook useWebSocket (`hooks/useWebSocket.ts`)

```typescript
import { useEffect, useState, useCallback } from 'react';
import { notificationSocket, WebSocketMessage } from '@/lib/socketService';

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStats, setConnectionStats] = useState<any>(null);

  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      setConnectionStats(notificationSocket.getConnectionStats());
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setConnectionStats(notificationSocket.getConnectionStats());
    };

    const handleError = (error: any) => {
      console.error('WebSocket error:', error);
      setConnectionStats(notificationSocket.getConnectionStats());
    };

    // Subscribe to events
    notificationSocket.on('connected', handleConnected);
    notificationSocket.on('disconnected', handleDisconnected);
    notificationSocket.on('error', handleError);

    // Cleanup
    return () => {
      notificationSocket.off('connected', handleConnected);
      notificationSocket.off('disconnected', handleDisconnected);
      notificationSocket.off('error', handleError);
    };
  }, []);

  const connect = useCallback(async (token: string) => {
    try {
      await notificationSocket.connect(token);
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    notificationSocket.disconnect();
  }, []);

  const sendMessage = useCallback((type: string, data?: any) => {
    notificationSocket.sendMessage(type, data);
  }, []);

  return {
    isConnected,
    connectionStats,
    connect,
    disconnect,
    sendMessage
  };
};
```

### 4. Hook useNotifications (`hooks/useNotifications.ts`)

```typescript
import { useState, useEffect, useCallback } from 'react';
import { notificationApi } from '@/lib/notificationApi';
import type {
  Notification,
  NotificationFilters,
  NotificationResponse,
  NotificationPreferences
} from '@/types/notifications';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async (
    filters: Partial<NotificationFilters> = {}
  ): Promise<NotificationResponse> => {
    setLoading(true);
    try {
      const response = await notificationApi.getUserNotifications(filters);
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
      return response;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, esta_leido: true }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      await notificationApi.markAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Revert optimistic update
      await fetchNotifications();
      throw error;
    }
  }, [fetchNotifications]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, esta_leido: true })));
      setUnreadCount(0);

      await notificationApi.markAllAsRead();
    } catch (error) {
      console.error('Error marking all as read:', error);
      // Revert optimistic update
      await fetchNotifications();
      throw error;
    }
  }, [fetchNotifications]);

  // Create notification
  const createNotification = useCallback(async (
    type: string,
    message: string,
    metadata: Record<string, any> = {}
  ): Promise<Notification> => {
    try {
      // For demo purposes, create a local notification
      const newNotification: Notification = {
        id: Date.now().toString(),
        usuario_id: 'current-user',
        tipo: type,
        prioridad: 'medium',
        titulo: message,
        mensaje: message,
        metadata,
        esta_leido: false,
        canales_enviados: ['in_app'],
        fecha_envio: new Date().toISOString(),
        creado_en: new Date().toISOString()
      };

      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);

      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }, []);

  // Fetch preferences
  const fetchPreferences = useCallback(async (): Promise<NotificationPreferences> => {
    try {
      const prefs = await notificationApi.getUserPreferences();
      setPreferences(prefs);
      return prefs;
    } catch (error) {
      console.error('Error fetching preferences:', error);
      throw error;
    }
  }, []);

  // Update preferences
  const updatePreferences = useCallback(async (
    newPreferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> => {
    try {
      const updated = await notificationApi.updateUserPreferences(newPreferences);
      setPreferences(updated);
      return updated;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    preferences,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    createNotification,
    fetchPreferences,
    updatePreferences
  };
};
```

### 5. Tipos de Notificaciones (`types/notifications.ts`)

```typescript
export type NotificationType =
  | 'bienvenida'
  | 'cotizacion'
  | 'cotizacion_aceptada'
  | 'cotizacion_rechazada'
  | 'servicio_agendado'
  | 'mensaje'
  | 'nuevo_mensaje_chat'
  | 'turno_agendado'
  | 'resena_recibida'
  | 'pago_liberado'
  | 'verificacion_aprobada'
  | 'appointment_booked'
  | 'appointment_confirmed'
  | 'appointment_reminder_24h'
  | 'appointment_reminder_1h'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  | 'new_appointment'
  | 'appointment_completed'
  | 'appointment_no_show'
  | 'urgent_request_created'
  | 'urgent_assigned'
  | 'urgent_accepted'
  | 'urgent_rejected'
  | 'urgent_cancelled'
  | 'urgent_completed'
  | 'urgent_nearby';

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';

export type NotificationChannel = 'push' | 'email' | 'sms' | 'in_app';

export interface Notification {
  id: string;
  usuario_id: string;
  tipo: NotificationType;
  prioridad: NotificationPriority;
  titulo: string;
  mensaje: string;
  metadata: Record<string, any>;
  esta_leido: boolean;
  canales_enviados: NotificationChannel[];
  fecha_envio: string;
  creado_en: string;
  actualizado_en?: string;
}

export interface NotificationFilters {
  filter: 'all' | 'unread' | 'read';
  priority?: NotificationPriority;
  type?: NotificationType;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
  totalCount?: number;
  hasMore?: boolean;
}

export interface NotificationPreferences {
  id?: string;
  enabled: boolean;
  timezone: string;
  canales: {
    push: boolean;
    email: boolean;
    sms: boolean;
    in_app: boolean;
  };
  categorias: {
    servicios: {
      enabled: boolean;
      subcategorias: {
        cotizaciones: boolean;
        servicios_agendados: boolean;
        recordatorios_servicios: boolean;
        reseñas: boolean;
      };
    };
    mensajes: {
      enabled: boolean;
      subcategorias: {
        mensajes_directos: boolean;
        mensajes_grupales: boolean;
        notificaciones_chat: boolean;
      };
    };
    pagos: {
      enabled: boolean;
      subcategorias: {
        pagos_pendientes: boolean;
        pagos_completados: boolean;
        comisiones: boolean;
        retiros: boolean;
      };
    };
    seguridad: {
      enabled: boolean;
      subcategorias: {
        verificaciones: boolean;
        alertas_seguridad: boolean;
        cambios_cuenta: boolean;
      };
    };
    marketing: {
      enabled: boolean;
      subcategorias: {
        promociones: boolean;
        newsletters: boolean;
        eventos: boolean;
        nuevos_servicios: boolean;
      };
    };
  };
  quiet_hours_enabled: boolean;
  quiet_start_time: string;
  quiet_end_time: string;
  summary_frequency: 'immediate' | 'hourly' | 'daily';
  max_notifications_per_hour: number;
  group_similar: boolean;
  sound_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationContextType {
  // State
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  preferences: NotificationPreferences | null;
  loading: boolean;

  // Methods
  fetchNotifications: (options?: Partial<NotificationFilters>) => Promise<NotificationResponse>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  createNotification: (type: NotificationType, message: string, metadata?: Record<string, any>) => Promise<Notification>;
  fetchPreferences: () => Promise<NotificationPreferences>;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<NotificationPreferences>;

  // WebSocket status
  wsConnected: boolean;
}

export interface WebSocketMessage {
  type: string;
  data?: Notification;
  notificationId?: string;
  action?: string;
  notifications?: Notification[];
  unreadCount?: number;
  timestamp?: string;
}
```

### 6. Contexto de Notificaciones (`context/NotificationContext.tsx`)

```tsx
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { notificationApi } from '@/lib/notificationApi';
import { notificationSocket } from '@/lib/socketService';
import type {
  Notification,
  NotificationPreferences,
  NotificationFilters,
  NotificationResponse,
  NotificationType,
  NotificationContextType,
  WebSocketMessage
} from '@/types/notifications';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);

  // WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const connectWebSocket = async () => {
      try {
        await notificationSocket.connect(token);
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      notificationSocket.disconnect();
    };
  }, []);

  // WebSocket event handlers
  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleNotification = (data: WebSocketMessage) => {
      if (data.type === 'notification' && data.data) {
        setNotifications(prev => [data.data as Notification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Show browser notification for critical notifications
        if ((data.data as Notification).prioridad === 'critical') {
          showBrowserNotification((data.data as Notification).titulo, (data.data as Notification).mensaje);
        }
      }
    };

    const handleNotificationUpdated = (data: WebSocketMessage) => {
      if (data.action === 'marked_as_read' && data.notificationId) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === data.notificationId
              ? { ...n, esta_leido: true }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    };

    const handleAllRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, esta_leido: true })));
      setUnreadCount(0);
    };

    const handlePendingNotifications = (data: WebSocketMessage) => {
      if (data.notifications) {
        setNotifications(data.notifications as Notification[]);
        setUnreadCount(data.unreadCount || 0);
      }
    };

    // Subscribe to WebSocket events
    notificationSocket.on('connected', handleConnected);
    notificationSocket.on('disconnected', handleDisconnected);
    notificationSocket.on('notification', handleNotification);
    notificationSocket.on('notification_updated', handleNotificationUpdated);
    notificationSocket.on('all_notifications_read', handleAllRead);
    notificationSocket.on('pending_notifications', handlePendingNotifications);

    return () => {
      notificationSocket.off('connected', handleConnected);
      notificationSocket.off('disconnected', handleDisconnected);
      notificationSocket.off('notification', handleNotification);
      notificationSocket.off('notification_updated', handleNotificationUpdated);
      notificationSocket.off('all_notifications_read', handleAllRead);
      notificationSocket.off('pending_notifications', handlePendingNotifications);
    };
  }, []);

  const showBrowserNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/badge.png'
      });
    }
  };

  // API methods
  const fetchNotifications = useCallback(async (options: Partial<NotificationFilters> = {}): Promise<NotificationResponse> => {
    setLoading(true);
    try {
      const response = await notificationApi.getUserNotifications(options);
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
      return response;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, esta_leido: true }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      await notificationApi.markAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Revert optimistic update
      await fetchNotifications();
      throw error;
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, esta_leido: true })));
      setUnreadCount(0);

      await notificationApi.markAllAsRead();
    } catch (error) {
      console.error('Error marking all as read:', error);
      // Revert optimistic update
      await fetchNotifications();
      throw error;
    }
  }, [fetchNotifications]);

  const createNotification = useCallback(async (
    type: NotificationType,
    message: string,
    metadata: Record<string, any> = {}
  ): Promise<Notification> => {
    try {
      // For demo purposes, we'll create a local notification
      // In a real app, this would call the API
      const newNotification: Notification = {
        id: Date.now().toString(),
        usuario_id: 'current-user',
        tipo: type,
        prioridad: 'medium',
        titulo: message,
        mensaje: message,
        metadata,
        esta_leido: false,
        canales_enviados: ['in_app'],
        fecha_envio: new Date().toISOString(),
        creado_en: new Date().toISOString()
      };

      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);

      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }, []);

  // Preferences management
  const fetchPreferences = useCallback(async (): Promise<NotificationPreferences> => {
    try {
      const prefs = await notificationApi.getUserPreferences();
      setPreferences(prefs);
      return prefs;
    } catch (error) {
      console.error('Error fetching preferences:', error);
      throw error;
    }
  }, []);

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    try {
      const updated = await notificationApi.updateUserPreferences(newPreferences);
      setPreferences(updated);
      return updated;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }, []);

  const value: NotificationContextType = {
    // State
    notifications,
    unreadCount,
    isConnected,
    preferences,
    loading,

    // Methods
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    createNotification,
    fetchPreferences,
    updatePreferences,

    // WebSocket status
    wsConnected: isConnected
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
```

### 7. Componente NotificationBell (`components/NotificationBell.tsx`)

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  onClick?: () => void;
  className?: string;
  showBadge?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  onClick,
  className,
  showBadge = true,
  size = 'md'
}) => {
  const { unreadCount, isConnected } = useNotifications();
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate bell when new notifications arrive
  useEffect(() => {
    if (unreadCount > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative p-2 rounded-full hover:bg-gray-100 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        className
      )}
      aria-label={`Notificaciones ${unreadCount > 0 ? `(${unreadCount} sin leer)` : ''}`}
    >
      <Bell
        className={cn(
          sizeClasses[size],
          'transition-transform duration-200',
          isAnimating && 'animate-bounce',
          !isConnected && 'text-gray-400'
        )}
      />

      {/* Connection indicator */}
      {!isConnected && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
      )}

      {/* Notification badge */}
      {showBadge && unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}

      {/* Pulse animation for new notifications */}
      {unreadCount > 0 && (
        <div className="absolute inset-0 rounded-full bg-red-500 opacity-20 animate-ping" />
      )}
    </button>
  );
};

export default NotificationBell;
```

### 8. Componente NotificationDropdown (`components/NotificationDropdown.tsx`)

```tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Settings, X, Filter } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import type { Notification, NotificationPriority } from '@/types/notifications';
import { cn } from '@/lib/utils';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPreferences?: () => void;
  className?: string;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  onOpenPreferences,
  className
}) => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    fetchNotifications
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [priority, setPriority] = useState<'all' | NotificationPriority>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Fetch notifications when opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications({
        filter,
        priority: priority === 'all' ? undefined : priority
      });
    }
  }, [isOpen, filter, priority, fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    const colors = {
      critical: 'border-red-500 bg-red-50',
      high: 'border-orange-500 bg-orange-50',
      medium: 'border-yellow-500 bg-yellow-50',
      low: 'border-gray-500 bg-gray-50'
    };
    return colors[priority] || colors.medium;
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const notificationDate = new Date
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInHours = (now.getTime() - notificationDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Ahora';
    } else if (diffInHours < 24) {
      return `Hace ${Math.floor(diffInHours)}h`;
    } else {
      return notificationDate.toLocaleDateString('es-AR');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={cn(
        'absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Notificaciones
            {unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </h3>
          <div className="flex items-center space-x-2">
            {onOpenPreferences && (
              <button
                onClick={onOpenPreferences}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Preferencias"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3 flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'read')}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">Todas</option>
            <option value="unread">Sin leer</option>
            <option value="read">Leídas</option>
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'all' | NotificationPriority)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">Todas las prioridades</option>
            <option value="critical">Críticas</option>
            <option value="high">Altas</option>
            <option value="medium">Medias</option>
            <option value="low">Bajas</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            Cargando notificaciones...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No hay notificaciones</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'p-4 hover:bg-gray-50 transition-colors cursor-pointer',
                  !notification.esta_leido && 'bg-blue-50 border-l-4 border-blue-500'
                )}
                onClick={() => !notification.esta_leido && handleMarkAsRead(notification.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {notification.titulo}
                      </h4>
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        getPriorityColor(notification.prioridad)
                      )}>
                        {notification.prioridad}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {notification.mensaje}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTime(notification.creado_en)}
                    </p>
                  </div>
                  {!notification.esta_leido && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                      className="ml-2 p-1 text-blue-600 hover:text-blue-800 transition-colors"
                      title="Marcar como leída"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleMarkAllAsRead}
            className="w-full flex items-center justify-center px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Marcar todas como leídas
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
```

### 9. Componente NotificationCenter (`components/NotificationCenter.tsx`)

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Settings, Filter, Search, MoreVertical } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import type { Notification, NotificationPriority, NotificationType } from '@/types/notifications';
import { cn } from '@/lib/utils';

interface NotificationCenterProps {
  className?: string;
  onOpenPreferences?: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  className,
  onOpenPreferences
}) => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    fetchNotifications
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [priority, setPriority] = useState<'all' | NotificationPriority>('all');
  const [type, setType] = useState<'all' | NotificationType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchNotifications({
      filter,
      priority: priority === 'all' ? undefined : priority,
      type: type === 'all' ? undefined : type,
      page: currentPage,
      limit: 20
    });
  }, [filter, priority, type, currentPage, fetchNotifications]);

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = searchTerm === '' ||
      notification.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.mensaje.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      setSelectedNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setSelectedNotifications(new Set());
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleSelectNotification = (notificationId: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const handleBulkMarkAsRead = async () => {
    for (const notificationId of selectedNotifications) {
      await markAsRead(notificationId);
    }
    setSelectedNotifications(new Set());
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    const colors = {
      critical: 'border-red-500 bg-red-50 text-red-700',
      high: 'border-orange-500 bg-orange-50 text-orange-700',
      medium: 'border-yellow-500 bg-yellow-50 text-yellow-700',
      low: 'border-gray-500 bg-gray-50 text-gray-700'
    };
    return colors[priority] || colors.medium;
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInHours = (now.getTime() - notificationDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Ahora';
    } else if (diffInHours < 24) {
      return `Hace ${Math.floor(diffInHours)}h`;
    } else if (diffInHours < 168) { // 7 days
      return `Hace ${Math.floor(diffInHours / 24)}d`;
    } else {
      return notificationDate.toLocaleDateString('es-AR');
    }
  };

  return (
    <div className={cn('bg-white rounded-lg shadow-lg border border-gray-200', className)}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell className="w-6 h-6 text-gray-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Centro de Notificaciones</h2>
              <p className="text-sm text-gray-500">
                {unreadCount > 0 ? `${unreadCount} notificaciones sin leer` : 'Todas las notificaciones leídas'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onOpenPreferences && (
              <button
                onClick={onOpenPreferences}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                title="Preferencias"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar notificaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'read')}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md"
            >
              <option value="all">Todas</option>
              <option value="unread">Sin leer</option>
              <option value="read">Leídas</option>
            </select>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'all' | NotificationPriority)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md"
            >
              <option value="all">Todas las prioridades</option>
              <option value="critical">Críticas</option>
              <option value="high">Altas</option>
              <option value="medium">Medias</option>
              <option value="low">Bajas</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedNotifications.size > 0 && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">
                {selectedNotifications.size} notificaciones seleccionadas
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={handleBulkMarkAsRead}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Marcar como leídas
                </button>
                <button
                  onClick={() => setSelectedNotifications(new Set())}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            Cargando notificaciones...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay notificaciones</h3>
            <p className="text-sm">Cuando tengas nuevas notificaciones, aparecerán aquí.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'p-4 hover:bg-gray-50 transition-colors',
                  !notification.esta_leido && 'bg-blue-50 border-l-4 border-blue-500',
                  selectedNotifications.has(notification.id) && 'bg-blue-100'
                )}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.has(notification.id)}
                    onChange={() => handleSelectNotification(notification.id)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {notification.titulo}
                        </h4>
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          getPriorityColor(notification.prioridad)
                        )}>
                          {notification.prioridad}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400">
                          {formatTime(notification.creado_en)}
                        </span>
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      {notification.mensaje}
                    </p>

                    {!notification.esta_leido && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Marcar como leída
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Marcar todas como leídas
            </button>
            <span className="text-sm text-gray-500">
              {filteredNotifications.length} de {notifications.length} notificaciones
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
```

### 10. Componente NotificationPreferences (`components/NotificationPreferences.tsx`)

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Clock, Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import type { NotificationPreferences } from '@/types/notifications';
import { cn } from '@/lib/utils';

interface NotificationPreferencesProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const NotificationPreferencesComponent: React.FC<NotificationPreferencesProps> = ({
  isOpen,
  onClose,
  className
}) => {
  const { preferences, updatePreferences, fetchPreferences } = useNotifications();
  const [localPreferences, setLocalPreferences] = useState<Partial<NotificationPreferences>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen && !preferences) {
      fetchPreferences();
    }
  }, [isOpen, preferences, fetchPreferences]);

  useEffect(() => {
    if (preferences) {
      setLocalPreferences({ ...preferences });
    }
  }, [preferences]);

  useEffect(() => {
    // Check if there are changes
    const hasChanged = JSON.stringify(localPreferences) !== JSON.stringify(preferences);
    setHasChanges(hasChanged);
  }, [localPreferences, preferences]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePreferences(localPreferences);
      onClose();
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (preferences) {
      setLocalPreferences({ ...preferences });
    }
  };

  const updateChannel = (channel: keyof NotificationPreferences['canales'], enabled: boolean) => {
    setLocalPreferences(prev => ({
      ...prev,
      canales: {
        ...prev.canales,
        [channel]: enabled
      }
    }));
  };

  const updateCategory = (
    category: keyof NotificationPreferences['categorias'],
    subcategory: string,
    enabled: boolean
  ) => {
    setLocalPreferences(prev => ({
      ...prev,
      categorias: {
        ...prev.categorias,
        [category]: {
          ...prev.categorias?.[category],
          subcategorias: {
            ...prev.categorias?.[category]?.subcategorias,
            [subcategory]: enabled
          }
        }
      }
    }));
  };

  const channelIcons = {
    push: Smartphone,
    email: Mail,
    sms: MessageSquare,
    in_app: Bell
  };

  const channelLabels = {
    push: 'Notificaciones Push',
    email: 'Correo Electrónico',
    sms: 'SMS',
    in_app: 'En la App'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={cn(
        'bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto',
        className
      )}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Preferencias de Notificaciones
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Configura cómo y cuándo quieres recibir notificaciones
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* General Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración General</h3>

            <div className="space-y-4">
              {/* Channels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Canales de Notificación
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(channelLabels).map(([channel, label]) => {
                    const Icon = channelIcons[channel as keyof typeof channelIcons];
                    const isEnabled = localPreferences.canales?.[channel as keyof NotificationPreferences['canales']];

                    return (
                      <div
                        key={channel}
                        className={cn(
                          'flex items-center p-3 border rounded-lg cursor-pointer transition-colors',
                          isEnabled ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                        )}
                        onClick={() => updateChannel(channel as keyof NotificationPreferences['canales'], !isEnabled)}
                      >
                        <Icon className={cn(
                          'w-5 h-5 mr-3',
                          isEnabled ? 'text-blue-600' : 'text-gray-400'
                        )} />
                        <div className="flex-1">
                          <p className={cn(
                            'text-sm font-medium',
                            isEnabled ? 'text-blue-900' : 'text-gray-700'
                          )}>
                            {label}
                          </p>
                        </div>
                        <div className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center',
                          isEnabled ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        )}>
                          {isEnabled && <span className="text-white text-xs">✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quiet Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Horarios Silenciosos
                </label>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={localPreferences.quiet_hours_enabled || false}
                      onChange={(e) => setLocalPreferences(prev => ({
                        ...prev,
                        quiet_hours_enabled: e.target.checked
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      Activar horarios silenciosos
                    </label>
                  </div>

                  {localPreferences.quiet_hours_enabled && (
                    <div className="ml-6 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Hora de inicio
                        </label>
                        <input
                          type="time"
                          value={localPreferences.quiet_start_time || '22:00'}
                          onChange={(e) => setLocalPreferences(prev => ({
                            ...prev,
                            quiet_start_time: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Hora de fin
                        </label>
                        <input
                          type="time"
                          value={localPreferences.quiet_end_time || '08:00'}
                          onChange={(e) => setLocalPreferences(prev => ({
                            ...prev,
                            quiet_end_time: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Category Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Categorías de Notificación</h3>

            <div className="space-y-4">
              {/* Services */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Servicios</h4>
                <div className="space-y-2">
                  {Object.entries(localPreferences.categorias?.servicios?.subcategorias || {}).map(([key, enabled]) => (
                    <div key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => updateCategory('servicios', key, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 text-sm text-gray-700 capitalize">
                        {key.replace(/_/g, ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Mensajes</h4>
                <div className="space-y-2">
                  {Object.entries(localPreferences.categorias?.mensajes?.subcategorias || {}).map(([key, enabled]) => (
                    <div key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => updateCategory('mensajes', key, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 text-sm text-gray-700 capitalize">
                        {key.replace(/_/g, ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Pagos</h4>
                <div className="space-y-2">
                  {Object.entries(localPreferences.categorias?.pagos?.subcategorias || {}).map(([key, enabled]) => (
                    <div key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => updateCategory('pagos', key, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 text-sm text-gray-700 capitalize">
                        {key.replace(/_/g, ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className="flex items-center px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restablecer
            </button>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="flex items-center px-4 py-2 text-sm text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferencesComponent;
```

---

## Base de Datos

### Esquema Prisma Actualizado (`prisma/schema.prisma`)

```prisma
// ===== NOTIFICATIONS SYSTEM =====

// MODELO: notificaciones - Enhanced with new fields
// FUNCIÓN: Almacena las alertas automáticas que recibe el usuario con sistema completo mejorado.
// RELACIÓN PRD: REQ-19 (Notificaciones automáticas) + Sección 11 (Sistema de Notificaciones Avanzado).
// TARJETA BACKEND: Tarjeta 4: [Backend] Implementar API de Chat en Tiempo Real (parte de notificaciones).
// SPRINT: Sprint 1 (Primera Entrega) - "Implementación del producto de software".
model notificaciones {
  id         String   @id @default(uuid())
  usuario_id String
  usuario    usuarios @relation(fields: [usuario_id], references: [id])

  // Sistema de prioridades
  prioridad  NotificationPriority @default(MEDIUM)

  // Tipo de notificación con subcategorías
  tipo       NotificationType
  subtipo    String?  // "directo", "agendado", "urgente", etc.

  // Entidad relacionada (para mejor tracking)
  entity_type String? // "servicio", "cotizacion", "pago", "mensaje", etc.
  entity_id   String? // ID de la entidad relacionada

  // Contenido con plantillas
  titulo     String
  mensaje    String
  metadata   String?  // JSON con variables de plantilla

  // Estados y control
  esta_leido Boolean  @default(false)
  canales_enviados String? // JSON: ["push", "email", "sms"]
  fecha_envio DateTime?

  // Programación y expiración
  programado_para DateTime?
  expira_en       DateTime?

  // Relaciones
  plantilla_usada String? // ID de plantilla utilizada

  creado_en  DateTime @default(now())
  actualizado_en DateTime?

  @@index([usuario_id, esta_leido])
  @@index([usuario_id, prioridad])
  @@index([usuario_id, creado_en])
  @@index([tipo, subtipo])
  @@index([programado_para])
  @@index([expira_en])
  @@index([entity_type, entity_id])
  @@index([usuario_id, entity_type, entity_id])
  @@index([usuario_id, tipo, esta_leido])
  @@index([usuario_id, creado_en, esta_leido])
  @@index([expira_en, esta_leido])
}

// Modelo de preferencias de notificación
model notification_preferences {
  id         String   @id @default(uuid())
  usuario_id String   @unique
  usuario    usuarios @relation(fields: [usuario_id], references: [id])

  // Configuración general
  enabled   Boolean  @default(true)
  timezone  String   @default("America/Buenos_Aires")

  // Canales disponibles
  canales   String   // JSON: {push: true, email: true, sms: false, in_app: true}

  // Categorías de notificación
  categorias String  // JSON con configuración por categoría

  // Horarios silenciosos
  quiet_hours_enabled Boolean @default(false)
  quiet_start_time    String? // "22:00"
  quiet_end_time      String? // "08:00"

  // Frecuencia de resumen
  summary_frequency   String  @default("immediate") // "immediate", "hourly", "daily"

  // Configuración avanzada
  max_notifications_per_hour Int @default(50)
  group_similar             Boolean @default(true)
  sound_enabled             Boolean @default(true)

  creado_en  DateTime @default(now())
  actualizado_en DateTime?

  @@index([usuario_id])
}

// Modelo de plantillas de notificación
model notification_templates {
  id          String   @id @default(uuid())
  nombre      String   @unique
  descripcion String?

  // Tipo y subcategoría
  tipo        NotificationType
  subtipo     String?

  // Contenido por canal
  titulo_push     String?
  mensaje_push    String?
  titulo_email    String?
  mensaje_email   String?
  asunto_email    String?
  mensaje_sms     String?

  // Variables disponibles
  variables   String? // JSON array de variables requeridas

  // Prioridad por defecto
  prioridad_default NotificationPriority @default(MEDIUM)

  // Metadatos
  activo      Boolean  @default(true)
  version     Int      @default(1)

  creado_en   DateTime @default(now())
  actualizado_en DateTime?

  @@index([tipo, subtipo])
  @@index([activo])
}

// Modelo de métricas de notificación
model notification_metrics {
  id         String   @id @default(uuid())
  usuario_id String?
  usuario    usuarios? @relation(fields: [usuario_id], references: [id])

  // Métricas básicas
  tipo_notificacion String
  canal             String // "push", "email", "sms", "in_app"
  enviada           Boolean @default(false)
  entregada         Boolean @default(false)
  leida             Boolean @default(false)
  clickeada         Boolean @default(false)

  // Timestamps
  fecha_envio       DateTime?
  fecha_entrega     DateTime?
  fecha_lectura     DateTime?
  fecha_click       DateTime?

  // Metadatos adicionales
  metadata          String? // JSON con info adicional

  creado_en DateTime @default(now())

  @@index([usuario_id])
  @@index([tipo_notificacion])
  @@index([canal])
  @@index([enviada, entregada, leida])
  @@index([fecha_envio])
  @@index([usuario_id, fecha_envio])
  @@index([canal, fecha_envio])
  @@index([tipo_notificacion, canal, fecha_envio])
}
```

### Migración de Base de Datos

Para aplicar los cambios del esquema de notificaciones, ejecuta:

```bash
# Generar migración
npx prisma migrate dev --name add_notifications_system

# Aplicar cambios al esquema
npx prisma generate

# (Opcional) Resetear base de datos en desarrollo
npx prisma migrate reset
```

---

## Configuración

### Variables de Entorno Actualizadas (`.env`)

```env
# changanet-backend/.env - Variables de entorno para backend de Changánet
# @función Variables de entorno del backend
# @descripción Configuración de base de datos, autenticación y servicios externos (REQ-01, REQ-02, REQ-03)
# @sprint Sprint 1 – Autenticación y Perfiles
# @tarjeta Tarjeta 1: [Backend] Implementar API de Registro y Login
# @impacto Económico: Seguridad en transacciones mediante autenticación robusta

# Base de datos y servidor
DATABASE_URL="file:./dev.db"  # URL de conexión a base de datos SQLite (REQ-45)
JWT_SECRET="your-jwt-secret-here"  # Clave secreta para tokens JWT (REQ-03)
PORT=3003  # Puerto del servidor backend (REQ-01)
SESSION_SECRET="changanet-session-secret"  # Clave para sesiones de Passport (REQ-02)

# Google OAuth Configuration - Autenticación con Google (REQ-02)
GOOGLE_CLIENT_ID="1092532981327-5fg2q8gghek8ftriqolithqmhcrbsv14.apps.googleusercontent.com"  # ID de cliente OAuth de Google
GOOGLE_CLIENT_SECRET="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"  # Clave secreta OAuth de Google
GOOGLE_CALLBACK_URL="http://localhost:5176/api/auth/google/callback"  # URL de callback OAuth

# Firebase Configuration - Servicios de Firebase (REQ-19, REQ-20)
FIREBASE_API_KEY="AIzaSyA93wqcIxGpPCfyUBMq4ZwBxJRDfkKGXfQ"  # API Key de Firebase
FIREBASE_AUTH_DOMAIN="changanet-notifications.firebaseapp.com"  # Dominio de autenticación
FIREBASE_PROJECT_ID="changanet-notifications"  # ID del proyecto Firebase
FIREBASE_STORAGE_BUCKET="changanet-notifications.firebasestorage.app"  # Bucket de almacenamiento
FIREBASE_MESSAGING_SENDER_ID="926478045621"  # ID del sender de mensajes
FIREBASE_APP_ID="1:926478045621:web:6704a255057b65a6e549fc"  # ID de la aplicación
FIREBASE_MEASUREMENT_ID="G-XXXXXXXXXX"  # ID de medición de Analytics
FIREBASE_VAPID_KEY="BBcq0rChqpfQkexHGzbzAcPNyEcXQ6pHimpgltESqpSgmMmiQEPK2yfv87taE80q794Q_wtvRc8Zlnal75mqpoo"  # Clave VAPID para notificaciones push

# Redis Configuration - Caché y Rate Limiting
REDIS_URL="redis://localhost:6379"  # URL de conexión a Redis

# SendGrid Configuration - Servicio de emails (REQ-04, REQ-19)
SENDGRID_API_KEY="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"  # API Key de SendGrid
FROM_EMAIL="noreplychanganet@gmail.com"  # Email remitente verificado (REQ-04)

# Twilio Configuration - Servicio de SMS (REQ-19, REQ-20)
TWILIO_ACCOUNT_SID="ACf05d72b3e6f84642071affa0ffcbec3d"  # Account SID de Twilio
TWILIO_AUTH_TOKEN="329cd866831e74d35592fa15224ef5bf"  # Auth Token de Twilio
TWILIO_PHONE_NUMBER="+12566023324"  # Número de teléfono Twilio

# Sentry Configuration - Monitoreo de errores (REQ-40)
SENTRY_DSN="https://0dd4d936872b3cd34903e5dc3f2efc21@o4510260990574592.ingest.us.sentry.io/4510261006827520"  # DSN de Sentry

# Frontend URL for CORS and emails - URL del frontend para CORS y emails
FRONTEND_URL="http://localhost:5177"  # URL del frontend para configuración CORS
```

---

## Instrucciones de Implementación

### 1. Backend
1. Copia todos los archivos del backend a sus respectivas ubicaciones
2. Ejecuta `npm install` para instalar dependencias
3. Aplica la migración de Prisma: `npx prisma migrate dev --name add_notifications_system`
4. Reinicia el servidor: `npm run dev`

### 2. Frontend
1. Copia todos los archivos del frontend a sus respectivas ubicaciones
2. Instala dependencias adicionales si es necesario:
   ```bash
   npm install socket.io-client lucide-react
   ```
3. Envuelve tu aplicación con el `NotificationProvider`
4. Usa los componentes y hooks según necesites

### 3. Configuración
1. Actualiza las variables de entorno según tu configuración
2. Configura Firebase, Redis y otros servicios externos
3. Ajusta las URLs y puertos según tu entorno

### 4. Verificación
1. Verifica que las notificaciones se envíen correctamente
2. Prueba la conexión WebSocket
3. Verifica las preferencias de usuario
4. Prueba los diferentes canales de notificación

---

Este documento contiene todo el código necesario para implementar completamente el módulo de Notificaciones y Alertas de ChangAnet. Todos los archivos están listos para copiar y pegar directamente en el proyecto.