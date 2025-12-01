/**
 * @archivo src/routes/budgetRequestRoutes.js - Rutas de Solicitudes de Presupuestos
 * @descripción Define endpoints REST para el módulo de solicitudes de presupuestos (budget requests)
 * @sprint Sprint de Solicitudes de Presupuestos
 * @tarjeta Implementar backend completo para módulo de Solicitudes de Presupuestos
 * @impacto Económico: Sistema completo de solicitudes de presupuestos con distribución automática
 */

const express = require('express');
const multer = require('multer');
const { createBudgetRequest, getClientBudgetRequests, getBudgetRequestOffers, getProfessionalInbox, createOffer } = require('../controllers/budgetRequestController');
const { authenticateToken } = require('../middleware/authenticate');
const { reviewRateLimit } = require('../middleware/reviewRateLimit');
const rateLimit = require('rate-limiter-flexible');

// Configuración de multer para fotos de solicitudes de presupuesto
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

const router = express.Router();

// Rate limiter para creación de solicitudes de presupuesto (máximo 3 por hora por usuario)
const budgetRequestLimiter = new rateLimit.RateLimiterMemory({
  keyPrefix: 'budget_request_limit',
  points: 3, // Número de solicitudes permitidas
  duration: 60 * 60, // Ventana de tiempo en segundos (1 hora)
});

// Middleware de rate limiting para creación de solicitudes
const budgetRequestRateLimit = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    await budgetRequestLimiter.consume(userId);
    next();
  } catch (rejRes) {
    const msBeforeNext = rejRes.msBeforeNext / 1000;
    const minutesLeft = Math.ceil(msBeforeNext / 60);

    return res.status(429).json({
      error: 'Demasiadas solicitudes',
      message: `Has alcanzado el límite de solicitudes de presupuesto. Inténtalo de nuevo en ${minutesLeft} minuto${minutesLeft !== 1 ? 's' : ''}.`,
      retryAfter: msBeforeNext
    });
  }
};

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @ruta POST / - Crear solicitud de presupuesto
 * @descripción Permite a clientes crear solicitudes de presupuesto para profesionales
 * @sprint Sprint de Solicitudes de Presupuestos
 * @tarjeta Implementar backend completo para módulo de Solicitudes de Presupuestos
 * @impacto Económico: Conexión eficiente entre demanda y oferta de servicios profesionales
 */
router.post('/', budgetRequestRateLimit, upload.array('fotos', 5), createBudgetRequest);

/**
 * @ruta GET /client/:clientId - Obtener solicitudes de presupuesto del cliente
 * @descripción Lista todas las solicitudes de presupuesto enviadas por el cliente
 * @sprint Sprint de Solicitudes de Presupuestos
 * @tarjeta Implementar backend completo para módulo de Solicitudes de Presupuestos
 * @impacto Social: Seguimiento transparente de solicitudes enviadas
 */
router.get('/client/:clientId', getClientBudgetRequests);

/**
 * @ruta GET /:id/offers - Obtener ofertas para una solicitud específica
 * @descripción Proporciona vista detallada de todas las ofertas para una solicitud
 * @sprint Sprint de Solicitudes de Presupuestos
 * @tarjeta Implementar backend completo para módulo de Solicitudes de Presupuestos
 * @impacto Social: Toma de decisiones informada para consumidores
 */
router.get('/:id/offers', getBudgetRequestOffers);

/**
 * @ruta GET /inbox/:professionalId - Obtener bandeja de entrada del profesional
 * @descripción Lista solicitudes de presupuesto pendientes para el profesional
 * @sprint Sprint de Solicitudes de Presupuestos
 * @tarjeta Implementar backend completo para módulo de Solicitudes de Presupuestos
 * @impacto Económico: Acceso a oportunidades de trabajo para profesionales
 */
router.get('/inbox/:professionalId', getProfessionalInbox);

/**
 * @ruta POST /:id/offers - Crear oferta para una solicitud
 * @descripción Permite a profesionales enviar ofertas con precios y comentarios
 * @sprint Sprint de Solicitudes de Presupuestos
 * @tarjeta Implementar backend completo para módulo de Solicitudes de Presupuestos
 * @impacto Económico: Negociación directa y eficiente de precios
 */
router.post('/:id/offers', reviewRateLimit, createOffer);

module.exports = router;
