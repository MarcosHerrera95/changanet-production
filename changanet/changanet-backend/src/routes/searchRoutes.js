// src/routes/searchRoutes.js
// Rutas para sistema de búsqueda de profesionales
// Implementa sección 7.3 del PRD: Sistema de Búsqueda y Filtros
//
// ENDPOINTS IMPLEMENTADOS:
// - GET /: Búsqueda principal con filtros avanzados
// - GET /autocomplete: Autocompletado para especialidades y ubicaciones

const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { searchProfessionals, autocomplete } = require('../controllers/searchController');
const { sanitizeInput, sanitizeObject } = require('../utils/sanitizer');

const router = express.Router();

// Middleware de seguridad avanzada para endpoints de búsqueda
const securityMiddleware = (req, res, next) => {
  try {
    // Sanitizar todos los parámetros de query
    req.query = sanitizeObject(req.query);

    // Validaciones específicas para parámetros de búsqueda
    const { q, specialty, city, district, lat, lng, radius, minPrice, maxPrice } = req.query;

    // Validar y sanitizar términos de búsqueda
    if (q && (typeof q !== 'string' || q.length > 200)) {
      return res.status(400).json({
        error: 'Término de búsqueda inválido',
        code: 'INVALID_SEARCH_TERM'
      });
    }

    // Validar coordenadas GPS
    if (lat !== undefined) {
      const latNum = parseFloat(lat);
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        return res.status(400).json({
          error: 'Latitud inválida',
          code: 'INVALID_LATITUDE'
        });
      }
    }

    if (lng !== undefined) {
      const lngNum = parseFloat(lng);
      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        return res.status(400).json({
          error: 'Longitud inválida',
          code: 'INVALID_LONGITUDE'
        });
      }
    }

    // Validar radio geográfico
    if (radius !== undefined) {
      const radiusNum = parseFloat(radius);
      if (isNaN(radiusNum) || radiusNum < 0 || radiusNum > 100) {
        return res.status(400).json({
          error: 'Radio geográfico inválido (0-100 km)',
          code: 'INVALID_RADIUS'
        });
      }
    }

    // Validar precios
    if (minPrice !== undefined) {
      const minPriceNum = parseFloat(minPrice);
      if (isNaN(minPriceNum) || minPriceNum < 0 || minPriceNum > 100000) {
        return res.status(400).json({
          error: 'Precio mínimo inválido',
          code: 'INVALID_MIN_PRICE'
        });
      }
    }

    if (maxPrice !== undefined) {
      const maxPriceNum = parseFloat(maxPrice);
      if (isNaN(maxPriceNum) || maxPriceNum < 0 || maxPriceNum > 100000) {
        return res.status(400).json({
          error: 'Precio máximo inválido',
          code: 'INVALID_MAX_PRICE'
        });
      }
    }

    // Headers de seguridad
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'none'; object-src 'none'"
    });

    next();
  } catch (error) {
    console.error('Error en middleware de seguridad:', error);
    res.status(500).json({
      error: 'Error de validación de seguridad',
      code: 'SECURITY_VALIDATION_ERROR'
    });
  }
};

// Rate limiting avanzado para búsquedas - basado en rol de usuario
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: (req) => {
    // Límite basado en rol de usuario
    if (req.user?.role === 'admin') return 1000; // Admins: 1000 búsquedas/15min
    if (req.user?.role === 'profesional') return 300; // Profesionales: 300 búsquedas/15min
    return 100; // Clientes/anon: 100 búsquedas/15min
  },
  message: {
    error: 'Demasiadas búsquedas. Intente nuevamente en 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60 // segundos
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting para autocompletado - permisivo pero con límites
const autocompleteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: (req) => {
    if (req.user?.role === 'admin') return 500;
    return 200; // 200 autocompletados/5min para buena UX
  },
  message: {
    error: 'Demasiadas solicitudes de autocompletado. Intente en 5 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting estricto para endpoints de alta carga
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // Máximo 10 solicitudes/minuto
  message: {
    error: 'Demasiadas solicitudes. Reduzca la frecuencia.',
    code: 'STRICT_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware para optimizaciones de load balancing y CDN
const loadBalancingMiddleware = (req, res, next) => {
  // Headers para load balancing y CDN
  res.set({
    'X-Request-ID': req.id || require('crypto').randomUUID(),
    'X-Server-Timing': `start;dur=${Date.now() - req.startTime || 0}`,
    'X-API-Version': 'v2',
    'X-Rate-Limit-Remaining': res.get('X-RateLimit-Remaining') || 'unknown',
    'X-Rate-Limit-Reset': res.get('X-RateLimit-Reset') || 'unknown',
    // Cache hints para CDN
    'Cache-Control': 'public, max-age=300, s-maxage=600', // 5min browser, 10min CDN
    'Vary': 'Accept-Encoding, User-Agent',
    // Connection optimization
    'Connection': 'keep-alive',
    'Keep-Alive': 'timeout=30, max=1000'
  });

  // Timing para monitoreo
  req.startTime = Date.now();

  next();
};

// Ruta principal para buscar profesionales con filtros avanzados
// REQ-11,12,13,14,15: Implementa búsqueda completa según PRD
// Parámetros: q, specialty, city, district, radius, minPrice, maxPrice, orderBy, page, limit, lat, lng
router.get('/', securityMiddleware, searchLimiter, loadBalancingMiddleware, searchProfessionals);

// Ruta de autocompletado para mejorar UX
// Parámetros: q (requerido, min 2 chars), type (all/specialties/cities/districts), limit (max 20)
router.get('/autocomplete', securityMiddleware, autocompleteLimiter, loadBalancingMiddleware, autocomplete);

module.exports = router;
