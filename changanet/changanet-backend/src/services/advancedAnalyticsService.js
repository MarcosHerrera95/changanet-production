/**
 * @archivo src/services/advancedAnalyticsService.js - Servicio de analytics avanzados
 * @descripción Análisis avanzado de tendencias de demanda por zona geográfica
 * @optimización Ayuda a profesionales a tomar decisiones estratégicas basadas en datos
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtiene análisis completo de tendencias de demanda por zona
 * @param {string} zone - Zona geográfica a analizar
 * @param {number} months - Número de meses a analizar (default: 6)
 * @returns {Object} Análisis completo de tendencias
 */
async function getDemandTrendsByZone(zone, months = 6) {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Obtener datos históricos de servicios completados por zona
    const historicalServices = await prisma.servicios.findMany({
      where: {
        estado: 'COMPLETADO',
        profesional: {
          perfil_profesional: {
            zona_cobertura: {
              contains: zone.split(',')[0].trim()
            }
          }
        },
        completado_en: {
          gte: startDate
        }
      },
      select: {
        completado_en: true,
        profesional: {
          select: {
            perfil_profesional: {
              select: {
                especialidad: true,
                tarifa_hora: true
              }
            }
          }
        }
      },
      orderBy: {
        completado_en: 'asc'
      }
    });

    // Obtener datos de cotizaciones activas
    const activeQuotes = await prisma.cotizaciones.findMany({
      where: {
        estado: 'pendiente',
        zona_cobertura: {
          contains: zone.split(',')[0].trim()
        },
        creado_en: {
          gte: startDate
        }
      },
      select: {
        creado_en: true,
        precio: true
      }
    });

    // Obtener datos de profesionales activos en la zona
    const activeProfessionals = await prisma.perfiles_profesionales.count({
      where: {
        zona_cobertura: {
          contains: zone.split(',')[0].trim()
        },
        usuario: {
          rol: 'profesional',
          esta_verificado: true
        }
      }
    });

    // Procesar datos por mes
    const monthlyData = processMonthlyData(historicalServices, activeQuotes, months);

    // Calcular métricas de tendencia
    const trends = calculateTrends(monthlyData);

    // Generar insights y recomendaciones
    const insights = generateInsights(trends, zone, activeProfessionals);

    return {
      zone,
      period: `${months} meses`,
      monthlyData,
      trends,
      insights,
      activeProfessionals,
      totalServices: historicalServices.length,
      totalQuotes: activeQuotes.length,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error getting demand trends by zone:', error);
    throw error;
  }
}

/**
 * Procesa datos históricos en formato mensual
 * @param {Array} services - Servicios completados
 * @param {Array} quotes - Cotizaciones activas
 * @param {number} months - Número de meses
 * @returns {Array} Datos procesados por mes
 */
function processMonthlyData(services, quotes, months) {
  const monthlyData = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = date.toISOString().substring(0, 7); // YYYY-MM

    // Servicios completados en este mes
    const monthServices = services.filter(service => {
      const serviceMonth = service.completado_en.toISOString().substring(0, 7);
      return serviceMonth === monthKey;
    });

    // Cotizaciones en este mes
    const monthQuotes = quotes.filter(quote => {
      const quoteMonth = quote.creado_en.toISOString().substring(0, 7);
      return quoteMonth === monthKey;
    });

    // Calcular métricas
    const avgServicePrice = monthServices.length > 0
      ? monthServices.reduce((sum, s) => sum + s.profesional.perfil_profesional.tarifa_hora, 0) / monthServices.length
      : 0;

    const avgQuotePrice = monthQuotes.length > 0
      ? monthQuotes.reduce((sum, q) => sum + (q.precio || 0), 0) / monthQuotes.length
      : 0;

    monthlyData.push({
      month: monthKey,
      servicesCompleted: monthServices.length,
      quotesRequested: monthQuotes.length,
      avgServicePrice: Math.round(avgServicePrice),
      avgQuotePrice: Math.round(avgQuotePrice),
      specialties: getSpecialtyBreakdown(monthServices)
    });
  }

  return monthlyData;
}

/**
 * Obtiene distribución de especialidades en un conjunto de servicios
 * @param {Array} services - Servicios a analizar
 * @returns {Object} Distribución por especialidad
 */
function getSpecialtyBreakdown(services) {
  const breakdown = {};

  services.forEach(service => {
    const specialty = service.profesional.perfil_profesional.especialidad;
    breakdown[specialty] = (breakdown[specialty] || 0) + 1;
  });

  return breakdown;
}

/**
 * Calcula tendencias basadas en datos mensuales
 * @param {Array} monthlyData - Datos mensuales
 * @returns {Object} Métricas de tendencia
 */
function calculateTrends(monthlyData) {
  if (monthlyData.length < 2) {
    return {
      servicesTrend: 'insufficient_data',
      quotesTrend: 'insufficient_data',
      priceTrend: 'insufficient_data',
      growthRate: 0
    };
  }

  // Calcular tendencias usando regresión lineal simple
  const servicesTrend = calculateLinearTrend(monthlyData.map(d => d.servicesCompleted));
  const quotesTrend = calculateLinearTrend(monthlyData.map(d => d.quotesRequested));
  const priceTrend = calculateLinearTrend(monthlyData.map(d => d.avgServicePrice).filter(p => p > 0));

  // Calcular tasa de crecimiento (últimos 3 meses vs anteriores)
  const recentMonths = monthlyData.slice(-3);
  const earlierMonths = monthlyData.slice(0, -3);

  const recentAvg = recentMonths.reduce((sum, m) => sum + m.servicesCompleted, 0) / recentMonths.length;
  const earlierAvg = earlierMonths.length > 0
    ? earlierMonths.reduce((sum, m) => sum + m.servicesCompleted, 0) / earlierMonths.length
    : recentAvg;

  const growthRate = earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;

  return {
    servicesTrend,
    quotesTrend,
    priceTrend,
    growthRate: Math.round(growthRate * 100) / 100,
    recentAverage: Math.round(recentAvg * 100) / 100,
    overallAverage: Math.round(monthlyData.reduce((sum, m) => sum + m.servicesCompleted, 0) / monthlyData.length * 100) / 100
  };
}

/**
 * Calcula tendencia lineal simple
 * @param {Array} data - Datos numéricos
 * @returns {string} Dirección de la tendencia
 */
function calculateLinearTrend(data) {
  if (data.length < 2) return 'insufficient_data';

  const n = data.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = data.reduce((sum, val) => sum + val, 0);
  const sumXY = data.reduce((sum, val, idx) => sum + val * idx, 0);
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  if (slope > 0.5) return 'increasing';
  if (slope < -0.5) return 'decreasing';
  return 'stable';
}

/**
 * Genera insights y recomendaciones basadas en tendencias
 * @param {Object} trends - Datos de tendencias
 * @param {string} zone - Zona analizada
 * @param {number} activeProfessionals - Profesionales activos
 * @returns {Object} Insights y recomendaciones
 */
function generateInsights(trends, zone, activeProfessionals) {
  const insights = {
    demandLevel: getDemandLevel(trends.growthRate),
    marketOpportunity: getMarketOpportunity(trends, activeProfessionals),
    recommendations: [],
    risks: [],
    opportunities: []
  };

  // Generar recomendaciones basadas en tendencias
  if (trends.servicesTrend === 'increasing') {
    insights.recommendations.push('La demanda está creciendo - considera aumentar tu disponibilidad');
    insights.opportunities.push('Mercado en expansión con potencial de crecimiento');
  } else if (trends.servicesTrend === 'decreasing') {
    insights.recommendations.push('La demanda está disminuyendo - revisa tu estrategia de precios');
    insights.risks.push('Posible saturación del mercado local');
  }

  if (trends.growthRate > 20) {
    insights.opportunities.push('Crecimiento excepcional - oportunidad para expandir servicios');
    insights.recommendations.push('Aumenta tu visibilidad en la zona');
  } else if (trends.growthRate < -10) {
    insights.risks.push('Contracción del mercado - considera diversificar zonas');
    insights.recommendations.push('Evalúa la competencia y ajusta precios');
  }

  // Análisis de saturación
  const servicesPerProfessional = trends.overallAverage;
  if (servicesPerProfessional < 2) {
    insights.opportunities.push('Bajo nivel de saturación - buena oportunidad para nuevos profesionales');
  } else if (servicesPerProfessional > 5) {
    insights.risks.push('Alto nivel de competencia - diferencia tu oferta');
  }

  return insights;
}

/**
 * Determina nivel de demanda basado en tasa de crecimiento
 * @param {number} growthRate - Tasa de crecimiento
 * @returns {string} Nivel de demanda
 */
function getDemandLevel(growthRate) {
  if (growthRate > 30) return 'very_high';
  if (growthRate > 10) return 'high';
  if (growthRate > -10) return 'moderate';
  if (growthRate > -30) return 'low';
  return 'very_low';
}

/**
 * Evalúa oportunidad de mercado
 * @param {Object} trends - Tendencias
 * @param {number} activeProfessionals - Profesionales activos
 * @returns {string} Evaluación de oportunidad
 */
function getMarketOpportunity(trends, activeProfessionals) {
  const servicesPerProfessional = trends.overallAverage;

  if (trends.growthRate > 15 && servicesPerProfessional < 3) {
    return 'excellent';
  } else if (trends.growthRate > 5 && servicesPerProfessional < 4) {
    return 'good';
  } else if (trends.growthRate > -5) {
    return 'moderate';
  } else {
    return 'challenging';
  }
}

/**
 * Obtiene análisis competitivo por especialidad en una zona
 * @param {string} zone - Zona geográfica
 * @param {string} specialty - Especialidad específica
 * @returns {Object} Análisis competitivo
 */
async function getCompetitiveAnalysis(zone, specialty) {
  try {
    const professionals = await prisma.perfiles_profesionales.findMany({
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
        tarifa_hora: true,
        calificacion_promedio: true,
        anos_experiencia: true,
        usuario: {
          select: {
            servicios_como_profesional: {
              where: { estado: 'COMPLETADO' },
              select: { id: true }
            }
          }
        }
      }
    });

    if (professionals.length === 0) {
      return { error: 'No hay suficientes datos para análisis competitivo' };
    }

    // Calcular métricas competitivas
    const prices = professionals.map(p => p.tarifa_hora).sort((a, b) => a - b);
    const ratings = professionals.map(p => p.calificacion_promedio || 0);
    const experiences = professionals.map(p => p.anos_experiencia || 0);
    const services = professionals.map(p => p.usuario.servicios_como_profesional.length);

    return {
      zone,
      specialty,
      competitorCount: professionals.length,
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices),
        median: prices.length % 2 === 0
          ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
          : prices[Math.floor(prices.length / 2)],
        avg: prices.reduce((sum, p) => sum + p, 0) / prices.length
      },
      ratingStats: {
        avg: ratings.reduce((sum, r) => sum + r, 0) / ratings.length,
        max: Math.max(...ratings),
        min: Math.min(...ratings)
      },
      experienceStats: {
        avg: experiences.reduce((sum, e) => sum + e, 0) / experiences.length,
        max: Math.max(...experiences)
      },
      activityStats: {
        avgServices: services.reduce((sum, s) => sum + s, 0) / services.length,
        maxServices: Math.max(...services)
      }
    };

  } catch (error) {
    console.error('Error getting competitive analysis:', error);
    throw error;
  }
}

/**
 * Obtiene predicciones de demanda para los próximos meses
 * @param {string} zone - Zona geográfica
 * @param {number} months - Meses a predecir
 * @returns {Object} Predicciones de demanda
 */
async function getDemandPredictions(zone, months = 3) {
  try {
    const historicalData = await getDemandTrendsByZone(zone, 12); // Usar 12 meses de historia

    if (historicalData.monthlyData.length < 3) {
      return { error: 'Insuficientes datos históricos para predicción' };
    }

    // Predicción simple basada en tendencia lineal
    const servicesData = historicalData.monthlyData.map(d => d.servicesCompleted);
    const slope = calculateLinearTrend(servicesData);

    const predictions = [];
    const lastValue = servicesData[servicesData.length - 1];

    for (let i = 1; i <= months; i++) {
      let predictedValue;
      if (slope === 'increasing') {
        predictedValue = Math.round(lastValue * (1 + 0.1 * i)); // 10% crecimiento mensual
      } else if (slope === 'decreasing') {
        predictedValue = Math.round(lastValue * (1 - 0.05 * i)); // 5% disminución mensual
      } else {
        predictedValue = Math.round(lastValue * 0.98); // Ligeramente estable
      }

      const date = new Date();
      date.setMonth(date.getMonth() + i);

      predictions.push({
        month: date.toISOString().substring(0, 7),
        predictedServices: Math.max(0, predictedValue),
        confidence: slope === 'stable' ? 'medium' : 'low'
      });
    }

    return {
      zone,
      predictions,
      basedOn: `${historicalData.monthlyData.length} meses de datos`,
      methodology: 'linear_trend_extrapolation',
      disclaimer: 'Predicciones basadas en tendencias históricas, no garantizadas'
    };

  } catch (error) {
    console.error('Error getting demand predictions:', error);
    throw error;
  }
}

module.exports = {
  getDemandTrendsByZone,
  getCompetitiveAnalysis,
  getDemandPredictions
};
