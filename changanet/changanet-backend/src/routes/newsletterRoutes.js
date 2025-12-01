/**
 * @archivo src/routes/newsletterRoutes.js - Rutas del newsletter
 * @descripción Define endpoints para suscripción al newsletter (REQ-19)
 * @sprint Sprint 1 – Comunicación y Engagement
 * @tarjeta Tarjeta 6: [Backend] Implementar API de Newsletter
 * @impacto Social: Captura de leads para contenido educativo
 */

const express = require('express');
const newsletterController = require('../controllers/newsletterController');

const router = express.Router();

/**
 * POST /api/newsletter/subscribe
 * Suscribe un email al newsletter
 * No requiere autenticación para facilitar la captación
 */
router.post('/subscribe', newsletterController.subscribe);

module.exports = router;
