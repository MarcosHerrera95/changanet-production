/**
 * @archivo src/routes/advancedAnalyticsRoutes.js - Rutas de analytics avanzados
 * @descripción Endpoints para análisis avanzado de tendencias de demanda
 * @optimización Proporciona insights estratégicos a profesionales
 */

const express = require('express');
const { authenticateToken } = require('../middleware/authenticate');
const {
  getDemandTrends,
  getCompetitiveAnalysis,
  getDemandPredictions,
  getProfessionalAnalyticsDashboard
} = require('../controllers/advancedAnalyticsController');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener tendencias de demanda por zona
router.get('/demand-trends', getDemandTrends);

// Obtener análisis competitivo
router.get('/competitive-analysis', getCompetitiveAnalysis);

// Obtener predicciones de demanda
router.get('/demand-predictions', getDemandPredictions);

// Obtener dashboard completo de analytics para profesionales
router.get('/professional-dashboard', getProfessionalAnalyticsDashboard);

module.exports = router;
