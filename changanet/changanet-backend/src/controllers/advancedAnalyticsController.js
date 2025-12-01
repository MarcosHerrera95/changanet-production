/**
 * @archivo src/controllers/advancedAnalyticsController.js - Controlador de analytics avanzados
 * @descripción Endpoints para análisis avanzado de tendencias de demanda
 * @optimización Proporciona insights estratégicos a profesionales
 */

const advancedAnalyticsService = require('../services/advancedAnalyticsService');

/**
 * Obtiene tendencias de demanda por zona
 */
async function getDemandTrends(req, res) {
  try {
    const { zone, months } = req.query;

    if (!zone) {
      return res.status(400).json({
        error: 'Se requiere especificar la zona geográfica'
      });
    }

    const trends = await advancedAnalyticsService.getDemandTrendsByZone(
      zone,
      months ? parseInt(months) : 6
    );

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Error getting demand trends:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Obtiene análisis competitivo por especialidad
 */
async function getCompetitiveAnalysis(req, res) {
  try {
    const { zone, specialty } = req.query;

    if (!zone || !specialty) {
      return res.status(400).json({
        error: 'Se requieren zona y especialidad'
      });
    }

    const analysis = await advancedAnalyticsService.getCompetitiveAnalysis(zone, specialty);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error getting competitive analysis:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Obtiene predicciones de demanda
 */
async function getDemandPredictions(req, res) {
  try {
    const { zone, months } = req.query;

    if (!zone) {
      return res.status(400).json({
        error: 'Se requiere especificar la zona geográfica'
      });
    }

    const predictions = await advancedAnalyticsService.getDemandPredictions(
      zone,
      months ? parseInt(months) : 3
    );

    res.json({
      success: true,
      data: predictions
    });
  } catch (error) {
    console.error('Error getting demand predictions:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Obtiene dashboard completo de analytics para profesionales
 */
async function getProfessionalAnalyticsDashboard(req, res) {
  try {
    const { id: professionalId } = req.user;

    // Obtener perfil del profesional
    const profile = await require('../services/profileService').getProfile(professionalId);

    if (!profile || profile.rol !== 'profesional') {
      return res.status(403).json({
        error: 'Solo disponible para profesionales'
      });
    }

    const zone = profile.perfil_profesional?.zona_cobertura;
    const specialty = profile.perfil_profesional?.especialidad;

    if (!zone || !specialty) {
      return res.status(400).json({
        error: 'Completa tu perfil profesional para ver analytics'
      });
    }

    // Obtener múltiples análisis en paralelo
    const [demandTrends, competitiveAnalysis, marketStats] = await Promise.all([
      advancedAnalyticsService.getDemandTrendsByZone(zone, 6),
      advancedAnalyticsService.getCompetitiveAnalysis(zone, specialty),
      require('../services/marketAnalysisService').getMarketPriceStats(specialty, zone)
    ]);

    // Calcular métricas personalizadas del profesional
    const personalMetrics = await getPersonalProfessionalMetrics(professionalId, zone, specialty);

    res.json({
      success: true,
      data: {
        zone,
        specialty,
        demandTrends,
        competitiveAnalysis,
        marketStats,
        personalMetrics,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting professional analytics dashboard:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Calcula métricas personalizadas del profesional
 * @param {string} professionalId - ID del profesional
 * @param {string} zone - Zona del profesional
 * @param {string} specialty - Especialidad del profesional
 * @returns {Object} Métricas personalizadas
 */
async function getPersonalProfessionalMetrics(professionalId, zone, specialty) {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Servicios completados en los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentServices = await prisma.servicios.count({
      where: {
        profesional_id: professionalId,
        estado: 'COMPLETADO',
        completado_en: {
          gte: thirtyDaysAgo
        }
      }
    });

    // Cotizaciones activas
    const activeQuotes = await prisma.cotizaciones.count({
      where: {
        profesional_id: professionalId,
        estado: 'pendiente'
      }
    });

    // Calificación promedio
    const avgRating = await prisma.resenas.aggregate({
      where: {
        servicio: {
          profesional_id: professionalId
        }
      },
      _avg: {
        calificacion: true
      }
    });

    // Posición en el ranking local
    const localRanking = await getLocalRanking(professionalId, zone, specialty);

    return {
      recentServices,
      activeQuotes,
      avgRating: avgRating._avg.calificacion || 0,
      localRanking,
      marketPosition: getMarketPosition(avgRating._avg.calificacion || 0, localRanking)
    };

  } catch (error) {
    console.error('Error calculating personal metrics:', error);
    return {
      recentServices: 0,
      activeQuotes: 0,
      avgRating: 0,
      localRanking: null,
      marketPosition: 'unknown'
    };
  }
}

/**
 * Obtiene ranking local del profesional
 * @param {string} professionalId - ID del profesional
 * @param {string} zone - Zona
 * @param {string} specialty - Especialidad
 * @returns {number|null} Posición en ranking
 */
async function getLocalRanking(professionalId, zone, specialty) {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const localProfessionals = await prisma.perfiles_profesionales.findMany({
      where: {
        zona_cobertura: {
          contains: zone.split(',')[0].trim()
        },
        especialidad: specialty,
        usuario: {
          rol: 'profesional',
          esta_verificado: true
        }
      },
      select: {
        usuario_id: true,
        calificacion_promedio: true
      },
      orderBy: {
        calificacion_promedio: 'desc'
      }
    });

    const position = localProfessionals.findIndex(p => p.usuario_id === professionalId);
    return position >= 0 ? position + 1 : null;

  } catch (error) {
    console.error('Error getting local ranking:', error);
    return null;
  }
}

/**
 * Determina posición en el mercado basada en rating y ranking
 * @param {number} rating - Calificación promedio
 * @param {number} ranking - Posición en ranking
 * @returns {string} Posición en el mercado
 */
function getMarketPosition(rating, ranking) {
  if (rating >= 4.5 && ranking <= 3) return 'leader';
  if (rating >= 4.0 && ranking <= 10) return 'top_performer';
  if (rating >= 3.5) return 'solid_performer';
  if (rating >= 3.0) return 'developing';
  return 'needs_improvement';
}

module.exports = {
  getDemandTrends,
  getCompetitiveAnalysis,
  getDemandPredictions,
  getProfessionalAnalyticsDashboard
};
