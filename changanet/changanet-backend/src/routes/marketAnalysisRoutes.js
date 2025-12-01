/**
 * @archivo src/routes/marketAnalysisRoutes.js - Rutas de análisis de mercado
 * @descripción Endpoints para sugerencias inteligentes de precios
 * @optimización Mejora la competitividad de precios para profesionales
 */

const express = require('express');
const { authenticateToken } = require('../middleware/authenticate');
const {
  getPricingSuggestions,
  getMarketStats,
  getDemandAnalysis,
  getPriceTrends
} = require('../controllers/marketAnalysisController');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener sugerencias completas de precios
router.get('/pricing-suggestions', getPricingSuggestions);

// Obtener estadísticas de precios del mercado
router.get('/market-stats', getMarketStats);

// Obtener análisis de demanda por zona
router.get('/demand-analysis', getDemandAnalysis);

// Obtener tendencias de precios históricos
router.get('/price-trends', getPriceTrends);

module.exports = router;
