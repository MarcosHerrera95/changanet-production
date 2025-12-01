/**
 * Servicio de logging estructurado para Changánet
 * Utiliza Winston para logging avanzado con múltiples transportes
 */

const winston = require('winston');
const path = require('path');

// Niveles de logging personalizados
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
    business: 5, // Para eventos de negocio importantes
    security: 6   // Para eventos de seguridad
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
    business: 'cyan',
    security: 'red bold'
  }
};

// Formato personalizado para logs
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.colorize({ all: true })
);

// Formato para archivos (sin colores)
const fileFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Crear directorio de logs si no existe
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configuración de transportes
const transports = [
  // Console para desarrollo
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'debug',
    format: customFormat,
    handleExceptions: true,
    handleRejections: true
  }),

  // Archivo de errores
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true
  }),

  // Archivo general
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    level: 'info',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 10,
    tailable: true
  }),

  // Archivo específico para eventos de negocio
  new winston.transports.File({
    filename: path.join(logsDir, 'business.log'),
    level: 'business',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true
  }),

  // Archivo específico para eventos de seguridad
  new winston.transports.File({
    filename: path.join(logsDir, 'security.log'),
    level: 'security',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true
  })
];

// Crear logger principal
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  transports,
  exitOnError: false
});

// Agregar colores a winston
winston.addColors(customLevels.colors);

/**
 * Funciones de logging convenientes
 */

// Logging de errores
function logError(message, meta = {}) {
  logger.error(message, {
    ...meta,
    timestamp: new Date().toISOString(),
    level: 'error'
  });
}

// Logging de advertencias
function logWarn(message, meta = {}) {
  logger.warn(message, {
    ...meta,
    timestamp: new Date().toISOString(),
    level: 'warn'
  });
}

// Logging informativo
function logInfo(message, meta = {}) {
  logger.info(message, {
    ...meta,
    timestamp: new Date().toISOString(),
    level: 'info'
  });
}

// Logging de debug
function logDebug(message, meta = {}) {
  logger.debug(message, {
    ...meta,
    timestamp: new Date().toISOString(),
    level: 'debug'
  });
}

// Logging de eventos HTTP
function logHttp(message, meta = {}) {
  logger.http(message, {
    ...meta,
    timestamp: new Date().toISOString(),
    level: 'http'
  });
}

// Logging de eventos de negocio
function logBusiness(event, data = {}) {
  logger.log('business', `📊 Evento de negocio: ${event}`, {
    event,
    ...data,
    timestamp: new Date().toISOString(),
    level: 'business'
  });
}

// Logging de eventos de seguridad
function logSecurity(event, data = {}) {
  logger.log('security', `🔐 Evento de seguridad: ${event}`, {
    event,
    ...data,
    timestamp: new Date().toISOString(),
    level: 'security'
  });
}

/**
 * Middleware de logging para Express
 */
function createLoggingMiddleware() {
  return (req, res, next) => {
    const start = Date.now();
    const { method, url, ip } = req;

    // Log de solicitud entrante
    logHttp(`📨 ${method} ${url}`, {
      method,
      url,
      ip,
      userAgent: req.get('User-Agent'),
      type: 'request'
    });

    // Log de respuesta
    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;

      logHttp(`📤 ${method} ${url} - ${statusCode}`, {
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        ip,
        type: 'response'
      });

      // Log de errores HTTP
      if (statusCode >= 400) {
        logWarn(`⚠️ Error HTTP ${statusCode} en ${method} ${url}`, {
          method,
          url,
          statusCode,
          duration: `${duration}ms`,
          ip,
          type: 'http_error'
        });
      }
    });

    next();
  };
}

/**
 * Función para log de autenticación
 */
function logAuth(event, userId = null, data = {}) {
  const message = userId ? `👤 ${event} - Usuario: ${userId}` : `👤 ${event}`;

  if (event.includes('failed') || event.includes('error')) {
    logSecurity(event, { userId, ...data });
  } else {
    logBusiness(event, { userId, ...data });
  }
}

/**
 * Función para log de servicios
 */
function logService(event, serviceId, data = {}) {
  logBusiness(`Servicio: ${event}`, {
    serviceId,
    ...data
  });
}

/**
 * Función para log de pagos
 */
function logPayment(event, amount, data = {}) {
  logBusiness(`💰 Pago: ${event}`, {
    amount,
    ...data
  });
}

/**
 * Función para log de errores críticos
 */
function logCriticalError(error, context = {}) {
  logError(`🚨 Error crítico: ${error.message}`, {
    error: error.stack,
    ...context,
    type: 'critical'
  });
}

module.exports = {
  logger,
  logError,
  logWarn,
  logInfo,
  logDebug,
  logHttp,
  logBusiness,
  logSecurity,
  createLoggingMiddleware,
  logAuth,
  logService,
  logPayment,
  logCriticalError
};
