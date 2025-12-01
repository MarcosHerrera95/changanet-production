/**
 * Utilidades de sanitización para prevenir ataques XSS y SQL injection
 * Implementa medidas de seguridad para Gestión de Perfiles Profesionales
 */

const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Configurar DOMPurify con JSDOM para server-side
const window = new JSDOM('').window;
const DOMPurifyInstance = DOMPurify(window);

/**
 * Sanitiza entrada de texto para prevenir XSS
 * @param {string} input - Texto a sanitizar
 * @returns {string} Texto sanitizado
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  // Remover caracteres potencialmente peligrosos
  let sanitized = input.trim();

  // Remover tags HTML/XML peligrosos pero permitir algunos tags seguros
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<object[^>]*>.*?<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed[^>]*>.*?<\/embed>/gi, '');

  // Remover atributos peligrosos
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/vbscript:/gi, '');
  sanitized = sanitized.replace(/data:\s*text\/html/gi, '');

  // Limitar longitud para prevenir ataques de denial of service
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000) + '...';
  }

  return sanitized;
};

/**
 * Sanitiza HTML permitiendo solo tags seguros para descripciones profesionales
 * @param {string} html - HTML a sanitizar
 * @returns {string} HTML sanitizado
 */
const sanitizeHtml = (html) => {
  if (typeof html !== 'string') return html;

  return DOMPurifyInstance.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'b', 'i', 'ul', 'ol', 'li', 'span'],
    ALLOWED_ATTR: ['style'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout', 'onkeydown', 'onkeyup', 'onkeypress']
  });
};

/**
 * Sanitiza arrays de strings
 * @param {string[]} array - Array de strings a sanitizar
 * @returns {string[]} Array sanitizado
 */
const sanitizeArray = (array) => {
  if (!Array.isArray(array)) return array;

  return array.map(item => {
    if (typeof item === 'string') {
      return sanitizeInput(item);
    }
    return item;
  });
};

/**
 * Sanitiza objetos recursivamente
 * @param {object} obj - Objeto a sanitizar
 * @returns {object} Objeto sanitizado
 */
const sanitizeObject = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = sanitizeArray(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Valida y sanitiza email
 * @param {string} email - Email a validar y sanitizar
 * @returns {string|null} Email sanitizado o null si inválido
 */
const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return null;

  const sanitized = sanitizeInput(email).toLowerCase();

  // Validación básica de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return null;
  }

  return sanitized;
};

/**
 * Sanitiza números para prevenir inyección
 * @param {any} value - Valor a sanitizar
 * @returns {number|null} Número sanitizado o null
 */
const sanitizeNumber = (value) => {
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  // Limitar rango para prevenir overflow
  if (num < -999999999 || num > 999999999) {
    return null;
  }

  return num;
};

/**
 * Sanitiza coordenadas GPS
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @returns {object} Coordenadas sanitizadas
 */
const sanitizeCoordinates = (lat, lng) => {
  const sanitizedLat = sanitizeNumber(lat);
  const sanitizedLng = sanitizeNumber(lng);

  if (sanitizedLat === null || sanitizedLng === null) {
    return null;
  }

  // Validar rangos GPS
  if (sanitizedLat < -90 || sanitizedLat > 90) {
    return null;
  }

  if (sanitizedLng < -180 || sanitizedLng > 180) {
    return null;
  }

  return {
    latitud: sanitizedLat,
    longitud: sanitizedLng
  };
};

/**
 * Sanitiza datos de perfil profesional
 * @param {object} profileData - Datos del perfil
 * @returns {object} Datos sanitizados
 */
const sanitizeProfessionalProfile = (profileData) => {
  if (!profileData || typeof profileData !== 'object') return {};

  const sanitized = { ...profileData };

  // Sanitizar campos de texto con DOMPurify para contenido HTML permitido
  if (sanitized.descripcion) {
    sanitized.descripcion = sanitizeHtml(sanitized.descripcion);
  }

  if (sanitized.zona_cobertura) {
    sanitized.zona_cobertura = sanitizeInput(sanitized.zona_cobertura);
  }

  if (sanitized.tarifa_convenio) {
    sanitized.tarifa_convenio = sanitizeInput(sanitized.tarifa_convenio);
  }

  // Sanitizar especialidades (array)
  if (sanitized.especialidades) {
    sanitized.especialidades = sanitizeArray(sanitized.especialidades);
  }

  // Sanitizar números
  if (sanitized.anos_experiencia !== undefined) {
    sanitized.anos_experiencia = sanitizeNumber(sanitized.anos_experiencia);
  }

  if (sanitized.tarifa_hora !== undefined) {
    sanitized.tarifa_hora = sanitizeNumber(sanitized.tarifa_hora);
  }

  if (sanitized.tarifa_servicio !== undefined) {
    sanitized.tarifa_servicio = sanitizeNumber(sanitized.tarifa_servicio);
  }

  // Sanitizar coordenadas
  if (sanitized.latitud !== undefined && sanitized.longitud !== undefined) {
    const coords = sanitizeCoordinates(sanitized.latitud, sanitized.longitud);
    if (coords) {
      sanitized.latitud = coords.latitud;
      sanitized.longitud = coords.longitud;
    } else {
      delete sanitized.latitud;
      delete sanitized.longitud;
    }
  }

  return sanitized;
};

module.exports = {
  sanitizeInput,
  sanitizeHtml,
  sanitizeArray,
  sanitizeObject,
  sanitizeEmail,
  sanitizeNumber,
  sanitizeCoordinates,
  sanitizeProfessionalProfile
};
