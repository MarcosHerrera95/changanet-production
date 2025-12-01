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
