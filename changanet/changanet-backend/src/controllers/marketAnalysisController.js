/**
 * @archivo src/controllers/marketAnalysisController.js - Controlador de análisis de mercado
 * @descripción Endpoints para obtener sugerencias inteligentes de precios
 * @optimización Mejora la competitividad de precios para profesionales
 */

const marketAnalysisService = require('../services/marketAnalysisService');

/**
 * Obtiene sugerencias de precios para un profesional
 */
async function getPricingSuggestions(req, res) {
  try {
    const { specialty, zone, experience } = req.query;

    if (!specialty) {
      return res.status(400).json({
        error: 'Se requiere especificar la especialidad'
      });
    }

    const suggestions = await marketAnalysisService.getPricingSuggestions(
      specialty,
      zone || null,
      experience ? parseInt(experience) : 0
    );

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Error getting pricing suggestions:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Obtiene estadísticas de precios del mercado
 */
async function getMarketStats(req, res) {
  try {
    const { specialty, zone } = req.query;

    if (!specialty) {
      return res.status(400).json({
        error: 'Se requiere especificar la especialidad'
      });
    }

    const stats = await marketAnalysisService.getMarketPriceStats(specialty, zone);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting market stats:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Obtiene análisis de demanda por zona
 */
async function getDemandAnalysis(req, res) {
  try {
    const { zone } = req.query;

    if (!zone) {
      return res.status(400).json({
        error: 'Se requiere especificar la zona'
      });
    }

    const analysis = await marketAnalysisService.getDemandAnalysis(zone);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error getting demand analysis:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Obtiene tendencias de precios históricos
 */
async function getPriceTrends(req, res) {
  try {
    const { specialty, months } = req.query;

    if (!specialty) {
      return res.status(400).json({
        error: 'Se requiere especificar la especialidad'
      });
    }

    const trends = await marketAnalysisService.getPriceTrends(
      specialty,
      months ? parseInt(months) : 6
    );

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Error getting price trends:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
}

module.exports = {
  getPricingSuggestions,
  getMarketStats,
  getDemandAnalysis,
  getPriceTrends
};
