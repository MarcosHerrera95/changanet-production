/**
 * Rutas para el sistema de reputación y medallas.
 * Implementa sección 7.8 del PRD: Verificación de Identidad y Reputación
 * Define endpoints para consulta de reputación, rankings y gestión de medallas.
 */

const express = require('express');
const reputationController = require('../controllers/reputationController');
const { authenticateToken } = require('../middleware/authenticate');
const { canAccessReputation } = require('../middleware/verificationAuth');

const router = express.Router();

// GET /api/reputation/:userId
// Obtener reputación de un usuario específico
router.get('/:userId', authenticateToken, canAccessReputation, reputationController.getUserReputation);

// GET /api/reputation/ranking
// Obtener ranking global de profesionales
router.get('/ranking', authenticateToken, reputationController.getGlobalRanking);

// POST /api/reputation/update
// Actualizar puntuación de reputación (usuario específico)
router.post('/update', authenticateToken, canAccessReputation, reputationController.updateReputation);

// POST /api/reputation/update-own
// Actualizar puntuación de reputación del usuario actual
router.post('/update-own', authenticateToken, reputationController.updateOwnReputation);

// POST /api/reputation/assign-medal
// Asignar medalla manualmente (solo administradores)
router.post('/assign-medal', authenticateToken, reputationController.assignMedal);

// GET /api/reputation/:userId/medals
// Obtener medallas de un usuario
router.get('/:userId/medals', authenticateToken, canAccessReputation, reputationController.getUserMedals);

// POST /api/admin/reputation/update-all
// Actualizar todas las puntuaciones de reputación (solo administradores)
router.post('/admin/update-all', authenticateToken, reputationController.updateAllReputations);

module.exports = router;
