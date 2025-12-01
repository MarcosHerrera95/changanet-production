// src/services/sentryService.js - Servicio de Sentry para backend
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

/**
 * Inicializa Sentry para el backend de Changánet
 * Debe ser llamado ANTES de cualquier middleware o rutas
 */
function initializeSentry() {
  // Verificar que tenemos el DSN configurado
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn('⚠️ SENTRY_DSN no configurado - Sentry no se inicializará');
    return;
  }

  Sentry.init({
    dsn: dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '1.0.0',

    // Integraciones para Node.js/Express
    integrations: [
      // Profiling para análisis de rendimiento detallado
      nodeProfilingIntegration(),
    ],

    // Configuración de trazas
    tracesSampleRate: 0.1, // 10% de las transacciones
    profilesSampleRate: 0.1, // 10% de los perfiles

    // Configuración de errores
    beforeSend(event, hint) {
      // Filtrar errores sensibles o de desarrollo
      if (event.exception) {
        const error = hint.originalException;
        if (error && error.message && error.message.includes('ECONNREFUSED')) {
          // No reportar errores de conexión de base de datos en desarrollo
          if (process.env.NODE_ENV !== 'production') {
            return null;
          }
        }
      }
      return event;
    },

    // Configuración de sesiones
    autoSessionTracking: true,

    // Configuración de breadcrumbs
    maxBreadcrumbs: 50,

    // Configuración de contexto
    initialScope: {
      tags: {
        service: 'changanet-backend',
        platform: 'node-express',
        version: process.env.npm_package_version || '1.0.0'
      },
      user: {
        id: 'system', // Se actualizará con el usuario autenticado
      }
    }
  });

  console.log('✅ Sentry inicializado correctamente en backend');
}

/**
 * Middleware de Sentry para Express
 * Debe ser usado DESPUÉS de Sentry.init()
 */
function sentryRequestHandler() {
  return (req, res, next) => {
    // Middleware vacío para compatibilidad
    next();
  };
}

/**
 * Middleware de trazas de Sentry para Express
 */
function sentryTracingHandler() {
  return (req, res, next) => {
    // Middleware vacío para compatibilidad
    next();
  };
}

/**
 * Middleware de manejo de errores de Sentry
 * Debe ser el ÚLTIMO middleware de error
 */
function sentryErrorHandler() {
  return Sentry.expressErrorHandler();
}

/**
 * Actualiza el contexto del usuario en Sentry
 * @param {Object} user - Información del usuario
 */
function setUserContext(user) {
  if (user && user.id) {
    Sentry.setUser({
      id: user.id.toString(),
      email: user.email,
      username: user.nombre || user.username,
      role: user.rol || 'user'
    });

    // Agregar tags adicionales
    Sentry.setTag('user_role', user.rol || 'user');
    Sentry.setTag('user_id', user.id.toString());
  } else {
    // Limpiar contexto si no hay usuario
    Sentry.setUser(null);
  }
}

/**
 * Captura un error manualmente en Sentry
 * @param {Error} error - El error a capturar
 * @param {Object} context - Contexto adicional
 */
function captureError(error, context = {}) {
  Sentry.withScope((scope) => {
    if (context.tags) {
      Object.keys(context.tags).forEach(key => {
        scope.setTag(key, context.tags[key]);
      });
    }

    if (context.extra) {
      Object.keys(context.extra).forEach(key => {
        scope.setExtra(key, context.extra[key]);
      });
    }

    if (context.level) {
      scope.setLevel(context.level);
    }

    Sentry.captureException(error);
  });
}

/**
 * Captura un mensaje en Sentry
 * @param {string} message - El mensaje a capturar
 * @param {string} level - Nivel del mensaje (info, warning, error)
 * @param {Object} context - Contexto adicional
 */
function captureMessage(message, level = 'info', context = {}) {
  Sentry.withScope((scope) => {
    if (context.tags) {
      Object.keys(context.tags).forEach(key => {
        scope.setTag(key, context.tags[key]);
      });
    }

    if (context.extra) {
      Object.keys(context.extra).forEach(key => {
        scope.setExtra(key, context.extra[key]);
      });
    }

    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
}

/**
 * Inicia una transacción personalizada
 * @param {string} name - Nombre de la transacción
 * @param {string} op - Operación
 * @returns {Object} Transacción de Sentry
 */
function startTransaction(name, op = 'function') {
  return Sentry.startTransaction({
    name,
    op
  });
}

/**
 * Finaliza una transacción
 * @param {Object} transaction - Transacción a finalizar
 */
function finishTransaction(transaction) {
  if (transaction) {
    transaction.finish();
  }
}

module.exports = {
  initializeSentry,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  setUserContext,
  captureError,
  captureMessage,
  startTransaction,
  finishTransaction
};
