/**
 * @archivo src/routes/urgentRoutes.js - Rutas de servicios urgentes
 * @descripción Define endpoints REST para gestión de servicios urgentes con geo-filtrado y asignación automática
 * @sprint Sprint 4 – Servicios Urgentes
 * @tarjeta Nueva funcionalidad: Servicios Urgentes
 * @impacto Social: Atención prioritaria para situaciones de emergencia
 */

const express = require('express');
const {
  createUrgentRequest,
  getUrgentRequestStatus,
  cancelUrgentRequest,
  getNearbyUrgentRequests,
  acceptUrgentRequest,
  rejectUrgentRequest,
  triggerAutoDispatch,
  geoScan,
  notifyNearbyProfessionals,
  getPricingRules,
  updatePricingRules,
  completeUrgentAssignment
} = require('../controllers/urgentController');
const { authenticateToken } = require('../middleware/authenticate');
const {
  validateGPSCoordinates,
  authorizeUrgentRoles,
  createUrgentRateLimit,
  validateUrgentInput,
  obfuscateProfessionalCoordinates,
  secureUrgentErrorHandler
} = require('../middleware/urgentSecurity');
const { rateLimit } = require('express-rate-limit');

const router = express.Router();

// Rate limiting específico para servicios urgentes (más restrictivo)
const urgentRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // máximo 3 solicitudes de creación por hora
  message: {
    error: 'Límite de solicitudes de servicios urgentes excedido',
    message: 'Has excedido el límite de solicitudes para servicios urgentes. Máximo 3 por hora.',
    code: 'URGENT_RATE_LIMIT_EXCEEDED',
    retryAfter: '1 hora'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting para endpoints de profesionales
const professionalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 operaciones por profesional cada 15 minutos
  message: {
    error: 'Límite de operaciones de profesional excedido',
    message: 'Has excedido el límite de operaciones. Máximo 10 cada 15 minutos.',
    code: 'PROFESSIONAL_RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting para consultas de estado (menos restrictivo)
const statusRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 30, // máximo 30 consultas de estado cada 5 minutos
  standardHeaders: true,
  legacyHeaders: false
});

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Aplicar ofuscación de coordenadas a todas las respuestas
router.use(obfuscateProfessionalCoordinates);

/**
 * @ruta POST /api/urgent-requests - Crear solicitud urgente
 * @descripción Permite a clientes crear solicitudes de servicios urgentes (REQ-Urgent-01)
 * @sprint Sprint 4 – Servicios Urgentes
 * @tarjeta Endpoint: Crear Solicitud Urgente
 * @impacto Social: Acceso rápido a servicios profesionales en emergencias
 * @seguridad Rate limiting, validación GPS, sanitización de entrada, autorización por rol
 */
router.post('/urgent-requests',
  authorizeUrgentRoles(['cliente']), // Solo clientes pueden crear solicitudes
  urgentRateLimit,
  validateGPSCoordinates,
  validateUrgentInput,
  createUrgentRequest
);

/**
 * @ruta GET /api/urgent-requests/:id/status - Obtener estado de solicitud
 * @descripción Retorna el estado actual de una solicitud urgente con detalles completos
 * @sprint Sprint 4 – Servicios Urgentes
 * @tarjeta Endpoint: Estado de Solicitud Urgente
 * @impacto Económico: Transparencia en el proceso de asignación
 * @seguridad Rate limiting moderado, autorización por propiedad
 */
router.get('/urgent-requests/:id/status',
  statusRateLimit,
  authorizeUrgentRoles(['cliente', 'profesional', 'admin'], { checkOwnership: true }),
  getUrgentRequestStatus
);

/**
 * @ruta POST /api/urgent-requests/:id/cancel - Cancelar solicitud urgente
 * @descripción Permite al cliente cancelar una solicitud urgente pendiente o asignada
 * @sprint Sprint 4 – Servicios Urgentes
 * @tarjeta Endpoint: Cancelar Solicitud Urgente
 * @impacto Social: Control del cliente sobre sus solicitudes
 * @seguridad Solo el cliente propietario puede cancelar
 */
router.post('/urgent-requests/:id/cancel',
  authorizeUrgentRoles(['cliente'], { checkOwnership: 'client' }),
  cancelUrgentRequest
);

/**
 * @ruta GET /api/urgent/nearby - Obtener solicitudes urgentes cercanas
 * @descripción Retorna solicitudes urgentes activas cerca de la ubicación del profesional
 * @sprint Sprint 4 – Servicios Urgentes
 * @tarjeta Endpoint: Solicitudes Cercanas
 * @impacto Económico: Eficiencia en la asignación de trabajos
 * @seguridad Solo profesionales, validación GPS, rate limiting específico
 */
router.get('/urgent/nearby',
  authorizeUrgentRoles(['profesional']),
  professionalRateLimit,
  validateGPSCoordinates,
  getNearbyUrgentRequests
);

/**
 * @ruta POST /api/urgent/:id/accept - Aceptar solicitud urgente
 * @descripción Permite a un profesional aceptar una solicitud urgente asignada
 * @sprint Sprint 4 – Servicios Urgentes
 * @tarjeta Endpoint: Aceptar Solicitud Urgente
 * @impacto Social: Respuesta rápida a necesidades urgentes
 * @seguridad Solo profesionales, rate limiting específico
 */
router.post('/urgent/:id/accept',
  authorizeUrgentRoles(['profesional']),
  professionalRateLimit,
  acceptUrgentRequest
);

/**
 * @ruta POST /api/urgent/:id/reject - Rechazar solicitud urgente
 * @descripción Permite a un profesional rechazar una solicitud urgente
 * @sprint Sprint 4 – Servicios Urgentes
 * @tarjeta Endpoint: Rechazar Solicitud Urgente
 * @impacto Social: Redistribución automática a otros profesionales
 * @seguridad Solo profesionales, rate limiting específico
 */
router.post('/urgent/:id/reject',
  authorizeUrgentRoles(['profesional']),
  professionalRateLimit,
  rejectUrgentRequest
);

/**
 * @ruta POST /api/urgent/autodispatch - Disparar asignación automática
 * @descripción Endpoint administrativo para forzar re-asignación automática de solicitudes
 * @sprint Sprint 4 – Servicios Urgentes
 * @tarjeta Endpoint: Auto-dispatch Administrativo
 * @impacto Económico: Optimización del sistema de asignación
 * @seguridad Solo administradores pueden acceder
 */
router.post('/urgent/autodispatch',
  authorizeUrgentRoles(['admin']),
  triggerAutoDispatch
);

/**
 * @ruta POST /api/urgent/geoscan - Escaneo geoespacial
 * @descripción Escanea área específica en busca de profesionales disponibles
 * @sprint Sprint 4 – Servicios Urgentes
 * @tarjeta Endpoint: Geo-Scan
 * @impacto Económico: Análisis geoespacial para optimización de servicios
 * @seguridad Validación GPS, autorización por rol
 */
router.post('/urgent/geoscan',
  authorizeUrgentRoles(['admin', 'profesional']),
  validateGPSCoordinates,
  geoScan
);

/**
 * @ruta POST /api/urgent/notify-professionals - Notificar profesionales
 * @descripción Envía notificaciones push a profesionales cercanos sobre solicitud urgente
 * @sprint Sprint 4 – Servicios Urgentes
 * @tarjeta Endpoint: Notificación Masiva
 * @impacto Social: Alcance rápido a profesionales disponibles
 * @seguridad Solo administradores pueden enviar notificaciones masivas
 */
router.post('/urgent/notify-professionals',
  authorizeUrgentRoles(['admin']),
  notifyNearbyProfessionals
);

/**
 * @ruta GET /api/urgent/pricing - Obtener reglas de precios
 * @descripción Retorna las reglas de precios dinámicos para servicios urgentes
 * @sprint Sprint 4 – Servicios Urgentes
 * @tarjeta Endpoint: Consulta de Precios
 * @impacto Económico: Transparencia en precios dinámicos
 */
router.get('/urgent/pricing', getPricingRules);

/**
 * @ruta POST /api/urgent/pricing/update - Actualizar reglas de precios
 * @descripción Endpoint administrativo para actualizar reglas de precios dinámicos
 * @sprint Sprint 4 – Servicios Urgentes
 * @tarjeta Endpoint: Actualización de Precios
 * @impacto Económico: Control administrativo de precios
 * @seguridad Solo administradores pueden acceder
 */
router.post('/urgent/pricing/update',
  authorizeUrgentRoles(['admin']),
  updatePricingRules
);

/**
 * @ruta POST /api/urgent/assignments/:assignmentId/complete - Completar asignación urgente
 * @descripción Permite a un profesional marcar una asignación urgente como completada
 * @sprint Sprint 4 – Servicios Urgentes
 * @tarjeta Endpoint: Completar Asignación Urgente
 * @impacto Económico: Liberación automática de fondos en custodia
 * @seguridad Solo el profesional asignado puede completar
 */
router.post('/urgent/assignments/:assignmentId/complete',
  authorizeUrgentRoles(['profesional']),
  completeUrgentAssignment
);

module.exports = router;
