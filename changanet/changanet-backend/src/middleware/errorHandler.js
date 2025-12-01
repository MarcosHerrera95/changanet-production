/**
 * Middleware global de manejo de errores para la aplicación Changánet.
 * Proporciona manejo centralizado de errores con logging estructurado y respuestas consistentes.
 */

const logger = require('../services/logger');

/**
 * Middleware para manejar errores no capturados
 * Debe ser el último middleware en la cadena de middlewares
 */
const errorHandler = (err, req, res, next) => {
  // Obtener información del error
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Error interno del servidor';
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Logging estructurado del error
  logger.error('Error global capturado', {
    service: 'error-handler',
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      name: err.name,
      message: err.message,
      stack: isDevelopment ? err.stack : undefined,
      code: err.code,
      statusCode: statusCode
    },
    timestamp: new Date().toISOString()
  });

  // Determinar el tipo de error para respuesta apropiada
  let errorResponse = {
    error: message,
    timestamp: new Date().toISOString()
  };

  // Errores específicos de autenticación
  if (err.name === 'JsonWebTokenError') {
    errorResponse.error = 'Token de autenticación inválido';
    errorResponse.code = 'INVALID_TOKEN';
  } else if (err.name === 'TokenExpiredError') {
    errorResponse.error = 'Token de autenticación expirado';
    errorResponse.code = 'TOKEN_EXPIRED';
  } else if (err.code === 'P2002') {
    // Error de Prisma por constraint única
    errorResponse.error = 'Ya existe un registro con estos datos';
    errorResponse.code = 'DUPLICATE_ENTRY';
  } else if (err.code === 'P2025') {
    // Error de Prisma por registro no encontrado
    errorResponse.error = 'Registro no encontrado';
    errorResponse.code = 'NOT_FOUND';
  }

  // En desarrollo, incluir stack trace
  if (isDevelopment) {
    errorResponse.stack = err.stack;
    errorResponse.details = err;
  }

  // Enviar respuesta de error
  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware para manejar rutas no encontradas (404)
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Función helper para crear errores con código de estado
 */
const createError = (message, statusCode = 500, code = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) {
    error.code = code;
  }
  return error;
};

/**
 * Middleware para validar errores de Joi/validación
 */
const validationErrorHandler = (err, req, res, next) => {
  if (err.isJoi || err.name === 'ValidationError') {
    const error = new Error('Datos de entrada inválidos');
    error.statusCode = 400;
    error.details = err.details || err.errors;
    return next(error);
  }
  next(err);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  createError,
  validationErrorHandler
};
