/**
 * Servicio de logging estructurado para Changánet
 * Cumple con requisitos de Sección 10 (código modular) y Sección 11 (monitoreo)
 * Soporta auditoría de transacciones (REQ-42, RB-04)
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');
const sentryService = require('./sentryService');

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Función para sanitizar datos sensibles
function sanitizeData(data) {
  if (!data || typeof data !== 'object') return data;

  const sensitiveFields = [
    'password', 'token', 'jwt', 'authorization', 'bearer',
    'dni', 'document', 'cardNumber', 'cvv', 'pin',
    'secret', 'key', 'apiKey', 'privateKey'
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

// Formato JSON estructurado para producción
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'ISO' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Formato legible para desarrollo
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, service, userId, error, ...meta }) => {
    let log = `${timestamp} [${level}]`;
    if (service) log += ` [${service}]`;
    if (userId) log += ` [User:${userId}]`;
    log += `: ${message}`;
    if (error) log += ` | Error: ${error}`;
    if (Object.keys(meta).length > 0) log += ` | ${JSON.stringify(sanitizeData(meta))}`;
    return log;
  })
);

// Configuración de transportes
const transports = [
  // Consola para desarrollo
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'debug',
    format: process.env.NODE_ENV === 'production' ? jsonFormat : devFormat,
    handleExceptions: true,
    handleRejections: true
  }),

  // Archivo rotado diariamente (principal)
  new DailyRotateFile({
    filename: path.join(logsDir, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'info',
    format: jsonFormat,
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true
  }),

  // Archivo separado para errores
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: jsonFormat,
    maxSize: '20m',
    maxFiles: '30d',
    zippedArchive: true
  })
];

// Crear logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: jsonFormat,
  transports,
  exitOnError: false,
  // No silenciar en producción
  silent: process.env.NODE_ENV === 'test'
});

// Función helper para crear logs con campos obligatorios
function createLogEntry(level, message, options = {}) {
  const { service, userId, error, ...meta } = options;

  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(service && { service }),
    ...(userId && { userId }),
    ...(error && { error: error.stack || error.message }),
    ...sanitizeData(meta)
  };

  return logEntry;
}

// Métodos de logging
const originalInfo = logger.info.bind(logger);
const originalWarn = logger.warn.bind(logger);
const originalError = logger.error.bind(logger);
const originalDebug = logger.debug.bind(logger);

logger.info = function(message, options = {}) {
  const entry = createLogEntry('info', message, options);
  return originalInfo(message, entry);
};

logger.warn = function(message, options = {}) {
  const entry = createLogEntry('warn', message, options);
  return originalWarn(message, entry);
};

logger.error = function(message, options = {}) {
  const entry = createLogEntry('error', message, options);
  const result = originalError(message, entry);

  // Integrar con Sentry para errores críticos
  if (options.error || options.critical) {
    sentryService.captureError(options.error || new Error(message), {
      tags: {
        service: options.service || 'unknown',
        level: 'error'
      },
      extra: {
        userId: options.userId,
        ...sanitizeData(options)
      }
    });
  }

  return result;
};

logger.debug = function(message, options = {}) {
  const entry = createLogEntry('debug', message, options);
  return originalDebug(message, entry);
};

// Función para logging de autenticación (ejemplo de uso)
logger.auth = function(event, userId = null, meta = {}) {
  const message = userId ? `Authentication event: ${event}` : `Authentication event: ${event}`;
  this.info(message, {
    service: 'auth',
    userId,
    event,
    ...meta
  });
};

// Función para logging de pagos (ejemplo de uso)
logger.payment = function(event, userId, amount = null, meta = {}) {
  const message = `Payment event: ${event}`;
  this.info(message, {
    service: 'payments',
    userId,
    amount,
    event,
    ...meta
  });
};

module.exports = logger;
