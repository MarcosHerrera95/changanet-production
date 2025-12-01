/**
 * @archivo src/middleware/urgentSecurity.js - Middlewares de seguridad específicos para servicios urgentes
 * @descripción Implementa validaciones avanzadas de GPS, autorización por roles, rate limiting específico y ofuscación de coordenadas
 * @sprint Sprint 4 – Servicios Urgentes
 * @tarjeta Seguridad: Validaciones Avanzadas para Servicios Urgentes
 * @impacto Social: Protección de datos sensibles y prevención de abuso en servicios críticos
 */

const Joi = require('joi');
const { rateLimit } = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const { sanitizeInput, sanitizeHtml } = require('../utils/sanitizer');

const prisma = new PrismaClient();

/**
 * @función validateGPSCoordinates - Middleware de validación avanzada de coordenadas GPS
 * @descripción Valida que las coordenadas sean reales, estén dentro de rangos geográficos válidos y no sean spoofed
 * @param {Object} req - Request con coordenadas en body o query
 * @param {Object} res - Response
 * @param {Function} next - Función para continuar
 */
const validateGPSCoordinates = (req, res, next) => {
  try {
    const { latitude, longitude } = req.body || req.query;

    // Verificar que las coordenadas estén presentes
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: 'Coordenadas GPS requeridas',
        message: 'Se requieren latitude y longitude para esta operación',
        code: 'GPS_COORDINATES_REQUIRED'
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    // Validar tipos numéricos
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        error: 'Coordenadas inválidas',
        message: 'Las coordenadas deben ser números válidos',
        code: 'GPS_INVALID_FORMAT'
      });
    }

    // Validar rangos geográficos básicos
    if (lat < -90 || lat > 90) {
      return res.status(400).json({
        error: 'Latitud fuera de rango',
        message: 'La latitud debe estar entre -90 y 90 grados',
        code: 'GPS_LATITUDE_OUT_OF_RANGE'
      });
    }

    if (lon < -180 || lon > 180) {
      return res.status(400).json({
        error: 'Longitud fuera de rango',
        message: 'La longitud debe estar entre -180 y 180 grados',
        code: 'GPS_LONGITUDE_OUT_OF_RANGE'
      });
    }

    // Validar precisión excesiva (posible spoofing)
    const latPrecision = latitude.toString().split('.')[1]?.length || 0;
    const lonPrecision = longitude.toString().split('.')[1]?.length || 0;

    if (latPrecision > 8 || lonPrecision > 8) {
      return res.status(400).json({
        error: 'Precisión GPS sospechosa',
        message: 'Las coordenadas tienen una precisión inusualmente alta',
        code: 'GPS_PRECISION_TOO_HIGH'
      });
    }

    // Validar coordenadas nulas o cero (posible error de dispositivo)
    if (lat === 0 && lon === 0) {
      return res.status(400).json({
        error: 'Coordenadas inválidas',
        message: 'Las coordenadas (0,0) no son válidas para ubicación real',
        code: 'GPS_NULL_ISLAND'
      });
    }

    // Validar que no sean coordenadas de prueba conocidas
    const testCoordinates = [
      { lat: 0, lon: 0 },
      { lat: 37.7749, lon: -122.4194 }, // San Francisco (muy común en tests)
      { lat: 40.7128, lon: -74.0060 },  // Nueva York (muy común en tests)
      { lat: -33.4489, lon: -70.6693 }  // Santiago (muy común en tests)
    ];

    const isTestCoordinate = testCoordinates.some(coord =>
      Math.abs(lat - coord.lat) < 0.001 && Math.abs(lon - coord.lon) < 0.001
    );

    if (isTestCoordinate) {
      console.warn(`⚠️ GPS Security Alert: Test coordinates detected - Lat: ${lat}, Lon: ${lon}, IP: ${req.ip}`);
      return res.status(400).json({
        error: 'Coordenadas de prueba detectadas',
        message: 'Las coordenadas parecen ser de un entorno de prueba',
        code: 'GPS_TEST_COORDINATES'
      });
    }

    // Almacenar coordenadas validadas para uso posterior
    req.validatedCoordinates = { latitude: lat, longitude: lon };

    next();
  } catch (error) {
    console.error('Error en validación GPS:', error);
    res.status(500).json({
      error: 'Error interno de validación GPS',
      code: 'GPS_VALIDATION_ERROR'
    });
  }
};

/**
 * @función authorizeUrgentRoles - Middleware de autorización por roles para servicios urgentes
 * @descripción Verifica permisos específicos según el rol del usuario y la operación solicitada
 * @param {Array} allowedRoles - Roles permitidos para la operación
 * @param {Object} options - Opciones adicionales de autorización
 * @returns {Function} Middleware de autorización
 */
const authorizeUrgentRoles = (allowedRoles, options = {}) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.rol;

      if (!userId || !userRole) {
        return res.status(401).json({
          error: 'Usuario no autenticado',
          message: 'Se requiere autenticación para acceder a servicios urgentes',
          code: 'URGENT_AUTH_REQUIRED'
        });
      }

      // Verificar rol permitido
      if (!allowedRoles.includes(userRole)) {
        console.warn(`🚨 Role Authorization Failed: User ${userId} with role ${userRole} attempted access. Allowed: ${allowedRoles.join(', ')}`);
        return res.status(403).json({
          error: 'Acceso denegado',
          message: 'No tienes permisos para realizar esta operación',
          code: 'URGENT_ROLE_FORBIDDEN'
        });
      }

      // Verificaciones adicionales según opciones
      if (options.checkOwnership && req.params.id) {
        const requestId = req.params.id;
        const urgentRequest = await prisma.urgent_requests.findUnique({
          where: { id: requestId },
          select: { client_id: true }
        });

        if (!urgentRequest) {
          return res.status(404).json({
            error: 'Solicitud no encontrada',
            code: 'URGENT_REQUEST_NOT_FOUND'
          });
        }

        // Solo el cliente puede cancelar/modificar su solicitud
        if (options.checkOwnership === 'client' && urgentRequest.client_id !== userId) {
          return res.status(403).json({
            error: 'Acceso denegado',
            message: 'Solo el cliente puede modificar esta solicitud',
            code: 'URGENT_OWNERSHIP_REQUIRED'
          });
        }
      }

      // Verificar si el usuario está bloqueado específicamente para servicios urgentes
      const userProfile = await prisma.perfiles_profesionales.findUnique({
        where: { usuario_id: userId },
        select: { bloqueado_urgentes: true }
      });

      if (userProfile?.bloqueado_urgentes) {
        console.warn(`🚨 Urgent Services Block: User ${userId} is blocked from urgent services`);
        return res.status(403).json({
          error: 'Cuenta suspendida para servicios urgentes',
          message: 'Tu cuenta ha sido bloqueada para el uso de servicios urgentes',
          code: 'URGENT_SERVICES_BLOCKED'
        });
      }

      next();
    } catch (error) {
      console.error('Error en autorización de roles:', error);
      res.status(500).json({
        error: 'Error interno de autorización',
        code: 'URGENT_AUTH_ERROR'
      });
    }
  };
};

/**
 * @función createUrgentRateLimit - Rate limiting específico para servicios urgentes
 * @descripción Implementa límites de tasa más restrictivos para prevenir spam en servicios críticos
 * @param {Object} options - Configuración del rate limiting
 * @returns {Function} Middleware de rate limiting
 */
const createUrgentRateLimit = (options = {}) => {
  const defaultOptions = {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5, // máximo 5 solicitudes por hora por usuario
    message: {
      error: 'Límite de solicitudes excedido',
      message: 'Has excedido el límite de solicitudes para servicios urgentes. Inténtalo de nuevo más tarde.',
      code: 'URGENT_RATE_LIMIT_EXCEEDED',
      retryAfter: '1 hora'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Usar ID de usuario en lugar de IP para rate limiting más preciso
    // Nota: Removiendo keyGenerator personalizado para evitar problemas con IPv6
    // El rate limiting se basa en IP por defecto, pero se puede mejorar con Redis en producción
    // Skip successful requests, only count failed/suspicious ones
    skipSuccessfulRequests: false,
    // Skip failed requests to avoid blocking legitimate retries
    skipFailedRequests: false
  };

  const config = { ...defaultOptions, ...options };

  return rateLimit(config);
};

/**
 * @función validateUrgentInput - Middleware de validación de entrada para solicitudes urgentes
 * @descripción Sanitiza y valida todos los campos de entrada para prevenir inyección y datos malformados
 * @param {Object} req - Request con datos a validar
 * @param {Object} res - Response
 * @param {Function} next - Función para continuar
 */
const validateUrgentInput = (req, res, next) => {
  try {
    // Esquema de validación para solicitudes urgentes
    const urgentRequestSchema = Joi.object({
      description: Joi.string()
        .min(10)
        .max(500)
        .required()
        .messages({
          'string.min': 'La descripción debe tener al menos 10 caracteres',
          'string.max': 'La descripción no puede exceder 500 caracteres',
          'any.required': 'La descripción es obligatoria'
        }),

      latitude: Joi.number()
        .min(-90)
        .max(90)
        .required()
        .messages({
          'number.min': 'Latitud inválida',
          'number.max': 'Latitud inválida',
          'any.required': 'La latitud es obligatoria'
        }),

      longitude: Joi.number()
        .min(-180)
        .max(180)
        .required()
        .messages({
          'number.min': 'Longitud inválida',
          'number.max': 'Longitud inválida',
          'any.required': 'La longitud es obligatoria'
        }),

      urgency_level: Joi.string()
        .valid('low', 'medium', 'high')
        .default('high')
        .messages({
          'any.only': 'El nivel de urgencia debe ser: low, medium, o high'
        }),

      special_requirements: Joi.string()
        .max(1000)
        .optional()
        .allow('')
        .messages({
          'string.max': 'Los requisitos especiales no pueden exceder 1000 caracteres'
        }),

      estimated_budget: Joi.number()
        .min(0)
        .max(100000)
        .optional()
        .messages({
          'number.min': 'El presupuesto estimado debe ser mayor a 0',
          'number.max': 'El presupuesto estimado no puede exceder $100,000'
        }),

      service_category: Joi.string()
        .max(100)
        .optional()
        .messages({
          'string.max': 'La categoría de servicio no puede exceder 100 caracteres'
        })
    });

    // Sanitizar datos de entrada
    const sanitizedBody = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        // Sanitizar campos de texto
        if (key === 'description' || key === 'special_requirements') {
          sanitizedBody[key] = sanitizeHtml(value);
        } else {
          sanitizedBody[key] = sanitizeInput(value);
        }
      } else {
        sanitizedBody[key] = value;
      }
    }

    // Validar con Joi
    const { error, value } = urgentRequestSchema.validate(sanitizedBody, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return res.status(400).json({
        error: 'Datos de validación incorrectos',
        details: errors,
        code: 'URGENT_VALIDATION_ERROR'
      });
    }

    // Almacenar datos validados y sanitizados
    req.validatedUrgentData = value;
    next();

  } catch (error) {
    console.error('Error en validación de entrada urgente:', error);
    res.status(500).json({
      error: 'Error interno de validación',
      code: 'URGENT_VALIDATION_INTERNAL_ERROR'
    });
  }
};

/**
 * @función obfuscateProfessionalCoordinates - Middleware para ofuscar coordenadas de profesionales
 * @descripción Oculta las coordenadas exactas de profesionales, mostrando solo aproximación para clientes
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @param {Function} next - Función para continuar
 */
const obfuscateProfessionalCoordinates = (req, res, next) => {
  // Guardar referencia a la función original de envío JSON
  const originalJson = res.json;

  // Reemplazar la función json para interceptar respuestas
  res.json = function(data) {
    try {
      // Solo ofuscar si el usuario es cliente (no profesional ni admin)
      if (req.user?.rol === 'cliente') {
        const obfuscatedData = obfuscateCoordinatesInResponse(data);
        return originalJson.call(this, obfuscatedData);
      }

      // Para profesionales y admins, devolver datos completos
      return originalJson.call(this, data);
    } catch (error) {
      console.error('Error en ofuscación de coordenadas:', error);
      // En caso de error, devolver datos sin ofuscación para evitar romper la funcionalidad
      return originalJson.call(this, data);
    }
  };

  next();
};

/**
 * @función obfuscateCoordinatesInResponse - Función helper para ofuscar coordenadas en respuestas
 * @descripción Recursivamente busca y ofusca coordenadas GPS en objetos de respuesta
 * @param {any} data - Datos de respuesta
 * @returns {any} Datos con coordenadas ofuscadas
 */
function obfuscateCoordinatesInResponse(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => obfuscateCoordinatesInResponse(item));
  }

  const obfuscated = { ...data };

  // Ofuscar coordenadas directas
  if (obfuscated.latitude !== undefined && obfuscated.longitude !== undefined) {
    const { latitude, longitude } = obfuscated;
    const obfuscatedCoords = obfuscateCoordinates(latitude, longitude);
    obfuscated.latitude = obfuscatedCoords.latitude;
    obfuscated.longitude = obfuscatedCoords.longitude;
  }

  // Ofuscar en objetos anidados
  for (const key in obfuscated) {
    if (typeof obfuscated[key] === 'object') {
      obfuscated[key] = obfuscateCoordinatesInResponse(obfuscated[key]);
    }
  }

  return obfuscated;
}

/**
 * @función obfuscateCoordinates - Función para ofuscar coordenadas GPS
 * @descripción Añade un offset aleatorio pequeño para ocultar la ubicación exacta
 * @param {number} lat - Latitud original
 * @param {number} lon - Longitud original
 * @returns {Object} Coordenadas ofuscadas
 */
function obfuscateCoordinates(lat, lon) {
  // Offset aleatorio entre -0.01 y 0.01 grados (aproximadamente 1-2 km)
  const maxOffset = 0.01;
  const latOffset = (Math.random() - 0.5) * 2 * maxOffset;
  const lonOffset = (Math.random() - 0.5) * 2 * maxOffset;

  return {
    latitude: Math.round((lat + latOffset) * 10000) / 10000, // 4 decimales de precisión
    longitude: Math.round((lon + lonOffset) * 10000) / 10000
  };
}

/**
 * @función secureUrgentErrorHandler - Manejador de errores específico para servicios urgentes
 * @descripción Maneja errores de forma segura sin exponer información sensible
 * @param {Error} err - Error capturado
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @param {Function} next - Función para continuar
 */
const secureUrgentErrorHandler = (err, req, res, next) => {
  // Log detallado del error para debugging interno
  console.error('🚨 Urgent Service Error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Determinar tipo de error y respuesta apropiada
  let statusCode = 500;
  let errorResponse = {
    error: 'Error interno del servidor',
    message: 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.',
    code: 'URGENT_INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  };

  // Errores específicos de validación
  if (err.code === 'URGENT_VALIDATION_ERROR' || err.isJoi) {
    statusCode = 400;
    errorResponse = {
      error: 'Datos inválidos',
      message: 'Los datos proporcionados no cumplen con los requisitos.',
      code: 'URGENT_VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    };
  }

  // Errores de autorización
  else if (err.code === 'URGENT_ROLE_FORBIDDEN' || err.code === 'URGENT_AUTH_REQUIRED') {
    statusCode = 403;
    errorResponse = {
      error: 'Acceso denegado',
      message: 'No tienes permisos para realizar esta operación.',
      code: 'URGENT_ACCESS_DENIED',
      timestamp: new Date().toISOString()
    };
  }

  // Errores de rate limiting
  else if (err.code === 'URGENT_RATE_LIMIT_EXCEEDED') {
    statusCode = 429;
    errorResponse = {
      error: 'Límite de solicitudes excedido',
      message: 'Has realizado demasiadas solicitudes. Espera un momento antes de continuar.',
      code: 'URGENT_RATE_LIMIT',
      retryAfter: '1 hora',
      timestamp: new Date().toISOString()
    };
  }

  // Errores de GPS
  else if (err.code && err.code.startsWith('GPS_')) {
    statusCode = 400;
    errorResponse = {
      error: 'Coordenadas GPS inválidas',
      message: 'Las coordenadas proporcionadas no son válidas.',
      code: 'URGENT_GPS_ERROR',
      timestamp: new Date().toISOString()
    };
  }

  // Errores de base de datos (no exponer detalles)
  else if (err.code && err.code.startsWith('P')) {
    statusCode = 500;
    errorResponse = {
      error: 'Error de base de datos',
      message: 'Ha ocurrido un error al procesar tu solicitud.',
      code: 'URGENT_DATABASE_ERROR',
      timestamp: new Date().toISOString()
    };
  }

  // Enviar respuesta de error segura
  res.status(statusCode).json(errorResponse);
};

module.exports = {
  validateGPSCoordinates,
  authorizeUrgentRoles,
  createUrgentRateLimit,
  validateUrgentInput,
  obfuscateProfessionalCoordinates,
  secureUrgentErrorHandler,
  obfuscateCoordinates // Exportar para testing
};
