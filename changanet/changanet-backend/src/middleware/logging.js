/**
 * Middleware de logging para Express
 * Registra todas las peticiones HTTP con detalles estructurados
 * Cumple con requisitos de monitoreo (Sección 11)
 */

const logger = require('../services/logger');

/**
 * Middleware para logging de peticiones HTTP
 * Registra método, ruta, status, duración y datos relevantes
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  // Extraer userId si está disponible (de autenticación previa)
  const userId = req.user?.id || req.userId || null;

  // Log de solicitud entrante
  logger.info('Request received', {
    service: 'http',
    method,
    url: originalUrl,
    ip: req.ip || ip,
    userAgent: req.get('User-Agent'),
    userId,
    type: 'request'
  });

  // Capturar respuesta
  const originalSend = res.send;
  let responseBody = null;

  res.send = function(body) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    // Log de respuesta
    logger.info('Request completed', {
      service: 'http',
      method,
      url: originalUrl,
      statusCode,
      duration: `${duration}ms`,
      ip: req.ip || ip,
      userId,
      type: 'response',
      // No loggear body de respuesta por privacidad, solo tamaño aproximado
      responseSize: responseBody ? Buffer.byteLength(responseBody, 'utf8') : 0
    });

    // Log específico para errores HTTP
    if (statusCode >= 400) {
      const level = statusCode >= 500 ? 'error' : 'warn';
      logger[level]('HTTP error response', {
        service: 'http',
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration}ms`,
        ip: req.ip || ip,
        userId,
        type: 'http_error'
      });
    }
  });

  next();
};

/**
 * Middleware para logging de errores no manejados
 */
const errorLogger = (err, req, res, next) => {
  const { method, originalUrl, ip } = req;
  const userId = req.user?.id || req.userId || null;

  logger.error('Unhandled error in request', {
    service: 'http',
    method,
    url: originalUrl,
    ip: req.ip || ip,
    userId,
    error: err,
    type: 'unhandled_error'
  });

  next(err);
};

module.exports = {
  requestLogger,
  errorLogger
};
