/**
 * Rutas para el sistema de rankings y reputación
 * REQ-39: Sistema de rankings basado en reputación
 */

const express = require('express');
const router = express.Router();
const rankingController = require('../controllers/rankingController');

// Rutas públicas
router.get('/professionals', rankingController.getProfessionalsRanking);
router.get('/professionals/:professionalId', rankingController.getProfessionalRanking);
router.get('/specialty/:specialty', rankingController.getTopProfessionalsBySpecialty);

module.exports = router;
