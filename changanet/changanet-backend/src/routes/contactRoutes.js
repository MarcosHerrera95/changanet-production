/**
 * @archivo src/routes/contactRoutes.js - Rutas de contacto
 * @descripción Define endpoints para formulario de contacto (REQ-19)
 * @sprint Sprint 1 – Soporte y Comunicación
 * @tarjeta Tarjeta 5: [Backend] Implementar API de Contacto
 * @impacto Social: Comunicación accesible para soporte al usuario
 */

const express = require('express');
const contactController = require('../controllers/contactController');

const router = express.Router();

/**
 * POST /api/contact
 * Envía un mensaje de contacto al equipo de soporte
 * No requiere autenticación para facilitar el acceso
 */
router.post('/', contactController.sendMessage);

module.exports = router;
