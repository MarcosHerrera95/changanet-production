/**
 * @archivo src/config/sentryConfig.js - Configuración de Sentry para frontend
 * @descripción Inicialización y configuración de monitoreo de errores y performance (REQ-40)
 * @sprint Sprint 1 – Autenticación y Perfiles
 * @tarjeta Tarjeta 1: [Frontend] Implementar Monitoreo con Sentry
 * @impacto Ambiental: Optimización de recursos mediante identificación de errores
 */

// src/config/sentryConfig.js - Configuración de Sentry para frontend
import * as Sentry from '@sentry/react';

/**
 * @función initializeSentry - Inicialización de Sentry para frontend
 * @descripción Configura monitoreo de errores, performance y sesiones de usuario (REQ-40)
 * @sprint Sprint 1 – Autenticación y Perfiles
 * @tarjeta Tarjeta 1: [Frontend] Implementar Monitoreo con Sentry
 * @impacto Ambiental: Reducción de recursos desperdiciados por errores no detectados
 */
export function initializeSentry() {
  try {
    // Verificar que tenemos el DSN configurado
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (!dsn) {
      console.warn('⚠️ VITE_SENTRY_DSN no configurado - Sentry no se inicializará');
      return;
    }

    // Verificar que el DSN tenga un formato válido
    if (!dsn.startsWith('https://') || !dsn.includes('@') || !dsn.includes('.ingest.') || !dsn.includes('.sentry.io/')) {
      console.warn('⚠️ VITE_SENTRY_DSN tiene un formato inválido - Sentry no se inicializará');
      return;
    }

    // Preparar integraciones
    const integrations = [];

    // Replay deshabilitado temporalmente por problemas de compatibilidad

    Sentry.init({
      dsn: dsn,
      environment: import.meta.env.MODE || 'development',
      release: import.meta.env.npm_package_version || '1.0.0',

      // Integraciones condicionales
      integrations,

      // Configuración de trazas (solo en producción para rendimiento)
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,

      // Configuración de replays (solo en producción)
      ...(import.meta.env.PROD && {
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      }),

      // Configuración de errores
      beforeSend(event, hint) {
        // Filtrar errores comunes que no queremos reportar
        if (event.exception) {
          const error = hint.originalException;

          // No reportar errores de red comunes
          if (error && error.message) {
            if (error.message.includes('Failed to fetch') ||
                error.message.includes('NetworkError') ||
                error.message.includes('Load failed') ||
                error.message.includes('ERR_CONNECTION_REFUSED')) {
              return null;
            }
          }

          // No reportar errores de chunk loading (comunes en desarrollo)
          if (error && error.message && error.message.includes('Loading chunk')) {
            return null;
          }

          // No reportar errores de Google Maps API
          if (error && error.message && (
            error.message.includes('googleMaps') ||
            error.message.includes('Google Maps') ||
            error.message.includes('NoApiKeys')
          )) {
            return null;
          }
        }

        return event;
      },

      // Configuración de sesiones (solo en producción)
      autoSessionTracking: import.meta.env.PROD,

      // Configuración de breadcrumbs
      maxBreadcrumbs: 50,

      // Configuración de contexto inicial
      initialScope: {
        tags: {
          service: 'changanet-frontend',
          platform: 'react-vite',
          version: import.meta.env.npm_package_version || '1.0.0'
        },
        user: {
          id: 'anonymous', // Se actualizará cuando el usuario se autentique
        }
      },

      // Configuración específica para React
      attachStacktrace: true,
      normalizeDepth: 5,
    });

    console.log('✅ Sentry inicializado correctamente en frontend');
  } catch (error) {
    console.warn('⚠️ Error al inicializar Sentry:', error.message);
    console.warn('Sentry no estará disponible, pero la aplicación continuará funcionando normalmente');
  }
}

/**
 * Actualiza el contexto del usuario en Sentry
 * @param {Object} user - Información del usuario
 */
export function setUserContext(user) {
  try {
    // Verificar que Sentry esté disponible antes de intentar configurar contexto
    if (!Sentry?.init) {
      console.warn('Sentry no disponible para configurar contexto de usuario');
      return;
    }

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
  } catch (error) {
    console.warn('Error al configurar contexto de usuario en Sentry:', error.message);
  }
}

/**
 * Captura un error manualmente en Sentry
 * @param {Error} error - El error a capturar
 * @param {Object} context - Contexto adicional
 */
export function captureError(error, context = {}) {
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
export function captureMessage(message, level = 'info', context = {}) {
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
export function startTransaction(name, op = 'navigation') {
  return Sentry.startTransaction({
    name,
    op
  });
}

/**
 * Finaliza una transacción
 * @param {Object} transaction - Transacción a finalizar
 */
export function finishTransaction(transaction) {
  if (transaction) {
    transaction.finish();
  }
}

/**
 * Envía feedback del usuario
 * @param {string} message - Mensaje de feedback
 * @param {Object} context - Contexto adicional
 */
export function captureUserFeedback(message, context = {}) {
  Sentry.captureUserFeedback({
    message,
    ...context
  });
}

/**
 * Configura el contexto de la página actual
 * @param {string} page - Nombre de la página
 * @param {Object} context - Contexto adicional
 */
export function setPageContext(page, context = {}) {
  Sentry.setTag('page', page);

  if (context.route) {
    Sentry.setTag('route', context.route);
  }

  if (context.component) {
    Sentry.setTag('component', context.component);
  }

  if (context.extra) {
    Object.keys(context.extra).forEach(key => {
      Sentry.setExtra(key, context.extra[key]);
    });
  }
}
