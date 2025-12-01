/**
 * Middleware de validación profunda para Gestión de Perfiles Profesionales
 * Implementa validaciones completas para REQ-06 a REQ-10 según PRD
 */

const Joi = require('joi');
const { sanitizeInput, sanitizeHtml } = require('../utils/sanitizer');

/**
 * Esquema de validación para perfiles profesionales
 * REQ-06: Subir foto de perfil y portada
 * REQ-07: Seleccionar especialidades múltiples
 * REQ-08: Ingresar años de experiencia
 * REQ-09: Definir zona de cobertura geográfica
 * REQ-10: Indicar tarifas flexibles
 */
const professionalProfileSchema = Joi.object({
  // REQ-07: Especialidades múltiples (array JSON)
  especialidades: Joi.array()
    .items(Joi.string().min(2).max(100).trim())
    .min(1)
    .max(10)
    .required()
    .messages({
      'array.min': 'Debe seleccionar al menos una especialidad',
      'array.max': 'No puede seleccionar más de 10 especialidades',
      'any.required': 'Las especialidades son obligatorias'
    }),

  // REQ-08: Años de experiencia
  anos_experiencia: Joi.number()
    .integer()
    .min(0)
    .max(50)
    .required()
    .messages({
      'number.min': 'Los años de experiencia deben ser mayor o igual a 0',
      'number.max': 'Los años de experiencia no pueden exceder 50 años',
      'any.required': 'Los años de experiencia son obligatorios'
    }),

  // REQ-09: Zona de cobertura geográfica
  zona_cobertura: Joi.string()
    .min(3)
    .max(255)
    .required()
    .messages({
      'string.min': 'La zona de cobertura debe tener al menos 3 caracteres',
      'string.max': 'La zona de cobertura no puede exceder 255 caracteres',
      'any.required': 'La zona de cobertura es obligatoria'
    }),

  // Coordenadas GPS opcionales para REQ-09
  latitud: Joi.number()
    .min(-90)
    .max(90)
    .optional()
    .messages({
      'number.min': 'La latitud debe estar entre -90 y 90',
      'number.max': 'La latitud debe estar entre -90 y 90'
    }),

  longitud: Joi.number()
    .min(-180)
    .max(180)
    .optional()
    .messages({
      'number.min': 'La longitud debe estar entre -180 y 180',
      'number.max': 'La longitud debe estar entre -180 y 180'
    }),

  // REQ-10: Sistema de tarifas flexibles
  tipo_tarifa: Joi.string()
    .valid('hora', 'servicio', 'convenio')
    .default('hora')
    .required()
    .messages({
      'any.only': 'El tipo de tarifa debe ser: hora, servicio o convenio',
      'any.required': 'El tipo de tarifa es obligatorio'
    }),

  tarifa_hora: Joi.number()
    .min(0)
    .max(100000)
    .when('tipo_tarifa', {
      is: 'hora',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'number.min': 'La tarifa por hora debe ser mayor a 0',
      'number.max': 'La tarifa por hora no puede exceder $100,000',
      'any.required': 'La tarifa por hora es obligatoria cuando el tipo es "hora"'
    }),

  tarifa_servicio: Joi.number()
    .min(0)
    .max(1000000)
    .when('tipo_tarifa', {
      is: 'servicio',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'number.min': 'La tarifa por servicio debe ser mayor a 0',
      'number.max': 'La tarifa por servicio no puede exceder $1,000,000',
      'any.required': 'La tarifa por servicio es obligatoria cuando el tipo es "servicio"'
    }),

  tarifa_convenio: Joi.string()
    .min(3)
    .max(500)
    .when('tipo_tarifa', {
      is: 'convenio',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.min': 'La descripción del convenio debe tener al menos 3 caracteres',
      'string.max': 'La descripción del convenio no puede exceder 500 caracteres',
      'any.required': 'La descripción del convenio es obligatoria cuando el tipo es "convenio"'
    }),

  // Descripción del perfil
  descripcion: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.min': 'La descripción debe tener al menos 10 caracteres',
      'string.max': 'La descripción no puede exceder 1000 caracteres',
      'any.required': 'La descripción es obligatoria'
    }),

  // Disponibilidad general
  esta_disponible: Joi.boolean()
    .default(true)
    .optional()
});

/**
 * Esquema de validación para subida de fotos
 * REQ-06: Subir foto de perfil y portada
 */
const photoUploadSchema = Joi.object({
  foto_tipo: Joi.string()
    .valid('perfil', 'portada')
    .required()
    .messages({
      'any.only': 'El tipo de foto debe ser "perfil" o "portada"',
      'any.required': 'El tipo de foto es obligatorio'
    })
});

/**
 * Middleware de validación para perfiles profesionales
 * Sanitiza datos y valida según esquema
 */
const validateProfessionalProfile = (req, res, next) => {
  try {
    // Sanitizar datos de entrada para prevenir XSS
    if (req.body) {
      req.body = sanitizeRequestBody(req.body);
    }

    // Validar con Joi
    const { error, value } = professionalProfileSchema.validate(req.body, {
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
        code: 'VALIDATION_ERROR'
      });
    }

    // Asignar datos validados y sanitizados
    req.validatedData = value;
    next();
  } catch (err) {
    console.error('Error en validación de perfil profesional:', err);
    res.status(500).json({
      error: 'Error interno de validación',
      code: 'VALIDATION_INTERNAL_ERROR'
    });
  }
};

/**
 * Middleware de validación para subida de fotos
 */
const validatePhotoUpload = (req, res, next) => {
  try {
    // Validar tipo de foto
    const { error } = photoUploadSchema.validate(req.body, {
      abortEarly: false
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Datos de validación incorrectos para subida de foto',
        details: errors,
        code: 'PHOTO_UPLOAD_VALIDATION_ERROR'
      });
    }

    next();
  } catch (err) {
    console.error('Error en validación de subida de foto:', err);
    res.status(500).json({
      error: 'Error interno de validación',
      code: 'PHOTO_UPLOAD_VALIDATION_INTERNAL_ERROR'
    });
  }
};

/**
 * Función para sanitizar el cuerpo de la petición
 * Previene XSS y ataques de inyección
 */
const sanitizeRequestBody = (body) => {
  const sanitized = {};

  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') {
      // Usar sanitización HTML para campos que pueden contener formato
      if (key === 'descripcion' || key === 'tarifa_convenio') {
        sanitized[key] = sanitizeHtml(value);
      } else {
        // Sanitizar strings para prevenir XSS básico
        sanitized[key] = sanitizeInput(value);
      }
    } else if (Array.isArray(value)) {
      // Sanitizar arrays de strings
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeInput(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      // Recursivamente sanitizar objetos anidados
      sanitized[key] = sanitizeRequestBody(value);
    } else {
      // Mantener otros tipos de datos
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Middleware de validación de archivos de imagen con análisis de contenido
 * Verifica tipo, tamaño y contenido del archivo para prevenir ataques
 */
const validateImageFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'No se encontró archivo de imagen',
      code: 'NO_FILE_UPLOADED'
    });
  }

  const file = req.file;

  // Verificar tipo MIME
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({
      error: 'Tipo de archivo no permitido. Solo se aceptan imágenes JPG, PNG y WebP',
      code: 'INVALID_FILE_TYPE'
    });
  }

  // Verificar tamaño (5MB máximo)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return res.status(400).json({
      error: 'El archivo es demasiado grande. Máximo 5MB permitido',
      code: 'FILE_TOO_LARGE'
    });
  }

  // Verificar que el buffer existe
  if (!file.buffer || file.buffer.length === 0) {
    return res.status(400).json({
      error: 'Archivo de imagen inválido o vacío',
      code: 'INVALID_IMAGE_FILE'
    });
  }

  // Análisis de contenido: verificar magic bytes para confirmar tipo real
  const buffer = file.buffer;
  let isValidImage = false;

  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    isValidImage = true;
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  else if (buffer.length >= 8 &&
           buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E &&
           buffer[3] === 0x47 && buffer[4] === 0x0D && buffer[5] === 0x0A &&
           buffer[6] === 0x1A && buffer[7] === 0x0A) {
    isValidImage = true;
  }
  // WebP: RIFF xxxx WEBP
  else if (buffer.length >= 12 &&
           buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 &&
           buffer[3] === 0x46 && buffer[8] === 0x57 && buffer[9] === 0x45 &&
           buffer[10] === 0x42 && buffer[11] === 0x50) {
    isValidImage = true;
  }

  if (!isValidImage) {
    return res.status(400).json({
      error: 'El archivo no es una imagen válida. Contenido corrupto o tipo incorrecto',
      code: 'INVALID_IMAGE_CONTENT'
    });
  }

  // Verificar que no contenga código ejecutable embebido (básico)
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /<%/i,  // ASP
    /<?php/i,  // PHP
    /<%!/i   // JSP
  ];

  // Convertir buffer a string para análisis (solo primeros 1KB para rendimiento)
  const sampleSize = Math.min(buffer.length, 1024);
  const bufferString = buffer.slice(0, sampleSize).toString('utf8', 0, sampleSize);

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(bufferString)) {
      return res.status(400).json({
        error: 'Archivo sospechoso detectado. No se permiten archivos con contenido ejecutable',
        code: 'MALICIOUS_FILE_DETECTED'
      });
    }
  }

  // Verificar dimensiones mínimas (prevenir imágenes demasiado pequeñas que podrían ser pixels de tracking)
  // Esto requiere análisis más complejo, por ahora solo verificamos que no sea extremadamente pequeño
  if (buffer.length < 100) {
    return res.status(400).json({
      error: 'Imagen demasiado pequeña o inválida',
      code: 'IMAGE_TOO_SMALL'
    });
  }

  next();
};

module.exports = {
  validateProfessionalProfile,
  validatePhotoUpload,
  validateImageFile,
  professionalProfileSchema,
  photoUploadSchema
};
