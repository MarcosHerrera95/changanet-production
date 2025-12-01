/**
 * Rutas para estadísticas de dashboards
 * Proporciona endpoints para métricas de cliente y profesional
 */

const express = require('express');
const { authenticateToken } = require('../middleware/authenticate');
const {
  getClientStats,
  getProfessionalStats,
  getClientActivity,
  getProfessionalActivity
} = require('../controllers/statsController');

const router = express.Router();

// Rutas protegidas para estadísticas de cliente
router.get('/client/stats', authenticateToken, getClientStats);
router.get('/client/activity', authenticateToken, getClientActivity);

// Rutas protegidas para estadísticas de profesional
router.get('/professionals/stats', authenticateToken, getProfessionalStats);
router.get('/professionals/activity', authenticateToken, getProfessionalActivity);

module.exports = router;
