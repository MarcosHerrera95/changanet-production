/**
 * Rutas para el sistema de logros y gamificación
 * REQ-38: Sistema de medallas por logros
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authenticate');
const achievementsController = require('../controllers/achievementsController');

// Rutas públicas
router.get('/achievements', achievementsController.getAllAchievements);

// Rutas protegidas
router.get('/user/:userId/achievements', authenticateToken, achievementsController.getUserAchievements);

// Rutas de administración (solo para admins)
router.post('/achievements', authenticateToken, achievementsController.createAchievement);

module.exports = router;
