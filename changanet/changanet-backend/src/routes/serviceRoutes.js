/**
 * @archivo src/routes/serviceRoutes.js - Rutas de servicios
 * @descripción Define endpoints REST para gestión de servicios y agendamiento (REQ-07, REQ-08, REQ-09)
 * @sprint Sprint 3 – Servicios y Transacciones
 * @tarjeta Tarjeta 5: [Backend] Implementar API de Servicios y Agendamiento
 * @impacto Económico: Formalización de contratos de servicio con seguimiento digital
 */

const express = require('express');
const { scheduleService, getClientServices, getProfessionalServices, updateServiceStatus, toggleUrgentService } = require('../controllers/serviceController');
const { authenticateToken } = require('../middleware/authenticate');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @ruta POST / - Agendar nuevo servicio
 * @descripción Permite a clientes agendar servicios con profesionales verificados (REQ-07)
 * @sprint Sprint 3 – Servicios y Transacciones
 * @tarjeta Tarjeta 5: [Backend] Implementar API de Servicios y Agendamiento
 * @impacto Social: Acceso organizado a servicios profesionales para todos
 */
router.post('/', scheduleService);

/**
 * @ruta GET /client - Obtener servicios del cliente
 * @descripción Lista todos los servicios contratados por el cliente (REQ-08)
 * @sprint Sprint 3 – Servicios y Transacciones
 * @tarjeta Tarjeta 5: [Backend] Implementar API de Servicios y Agendamiento
 * @impacto Económico: Transparencia en el historial de servicios contratados
 */
router.get('/client', getClientServices);

/**
 * @ruta GET /professional - Obtener servicios del profesional
 * @descripción Lista todos los servicios asignados al profesional (REQ-09)
 * @sprint Sprint 3 – Servicios y Transacciones
 * @tarjeta Tarjeta 5: [Backend] Implementar API de Servicios y Agendamiento
 * @impacto Económico: Gestión eficiente del trabajo profesional
 */
router.get('/professional', getProfessionalServices);

/**
 * @ruta PUT /:serviceId/status - Actualizar estado del servicio
 * @descripción Permite a profesionales actualizar el estado de servicios (REQ-09)
 * @sprint Sprint 3 – Servicios y Transacciones
 * @tarjeta Tarjeta 5: [Backend] Implementar API de Servicios y Agendamiento
 * @impacto Social: Comunicación clara del progreso del trabajo
 */
router.put('/:serviceId/status', updateServiceStatus);

/**
 * @ruta PUT /:serviceId/urgent - Marcar/desmarcar servicio como urgente
 * @descripción Permite a clientes marcar servicios como urgentes (Sección 10 del PRD)
 * @sprint Sprint 4 – Servicios Urgentes
 * @tarjeta Nueva funcionalidad: Servicios Urgentes
 * @impacto Social: Atención prioritaria para situaciones de emergencia
 */
router.put('/:serviceId/urgent', toggleUrgentService);

module.exports = router;
