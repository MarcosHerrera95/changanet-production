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
