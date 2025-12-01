/**
 * @archivo src/services/marketAnalysisService.js - Servicio de análisis de mercado
 * @descripción Proporciona sugerencias inteligentes de precios basadas en datos del mercado
 * @optimización Mejora la competitividad de precios para profesionales
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtiene estadísticas de precios por especialidad y zona
 * @param {string} specialty - Especialidad del profesional
 * @param {string} zone - Zona de cobertura
 * @returns {Object} Estadísticas de precios del mercado
 */
async function getMarketPriceStats(specialty, zone = null) {
  try {
    const whereClause = {
      usuario: {
        rol: 'profesional'
      }
    };

    if (specialty) {
      whereClause.especialidad = specialty;
    }

    if (zone) {
      whereClause.zona_cobertura = {
        contains: zone.split(',')[0].trim() // Primera parte de la zona
      };
    }

    const professionals = await prisma.perfiles_profesionales.findMany({
      where: whereClause,
      select: {
        tarifa_hora: true,
        especialidad: true,
        zona_cobertura: true,
        calificacion_promedio: true,
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
      return getDefaultPricing(specialty);
    }

    // Calcular estadísticas
    const prices = professionals
      .map(p => p.tarifa_hora)
      .filter(price => price > 0)
      .sort((a, b) => a - b);

    if (prices.length === 0) {
      return getDefaultPricing(specialty);
    }

    const stats = {
      count: prices.length,
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((sum, price) => sum + price, 0) / prices.length,
      median: prices.length % 2 === 0
        ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
        : prices[Math.floor(prices.length / 2)],
      percentiles: {
        p25: prices[Math.floor(prices.length * 0.25)],
        p75: prices[Math.floor(prices.length * 0.75)],
        p90: prices[Math.floor(prices.length * 0.90)]
      }
    };

    // Calcular precios sugeridos basados en percentiles
    stats.suggestions = {
      competitive: Math.round(stats.percentiles.p25), // Precio competitivo (25% más bajo)
      market: Math.round(stats.avg), // Precio de mercado promedio
      premium: Math.round(stats.percentiles.p75), // Precio premium (25% más alto)
      recommended: Math.round(stats.median) // Recomendado (mediana)
    };

    return stats;
  } catch (error) {
    console.error('Error getting market price stats:', error);
    return getDefaultPricing(specialty);
  }
}

/**
 * Obtiene precios por defecto cuando no hay datos suficientes
 * @param {string} specialty - Especialidad
 * @returns {Object} Precios por defecto
 */
function getDefaultPricing(specialty) {
  const defaultPrices = {
    'Plomero': { base: 2500, range: [1800, 3500] },
    'Electricista': { base: 2800, range: [2000, 4000] },
    'Pintor': { base: 2200, range: [1600, 3000] },
    'Carpintero': { base: 2600, range: [1900, 3800] },
    'Jardinero': { base: 2000, range: [1500, 2800] },
    'Mecánico': { base: 2400, range: [1700, 3500] },
    'Técnico': { base: 2300, range: [1600, 3200] },
    'Otro': { base: 2000, range: [1500, 3000] }
  };

  const pricing = defaultPrices[specialty] || defaultPrices['Otro'];

  return {
    count: 0,
    min: pricing.range[0],
    max: pricing.range[1],
    avg: pricing.base,
    median: pricing.base,
    percentiles: {
      p25: pricing.range[0],
      p75: pricing.range[1],
      p90: pricing.range[1]
    },
    suggestions: {
      competitive: Math.round(pricing.range[0] * 0.9),
      market: pricing.base,
      premium: Math.round(pricing.range[1] * 1.1),
      recommended: pricing.base
    },
    isDefault: true
  };
}

/**
 * Obtiene análisis de demanda por zona
 * @param {string} zone - Zona geográfica
 * @returns {Object} Análisis de demanda
 */
async function getDemandAnalysis(zone) {
  try {
    // Contar servicios completados en la zona
    const servicesInZone = await prisma.servicios.groupBy({
      by: ['estado'],
      where: {
        estado: 'COMPLETADO',
        profesional: {
          perfil_profesional: {
            zona_cobertura: {
              contains: zone.split(',')[0].trim()
            }
          }
        }
      },
      _count: { id: true }
    });

    // Contar profesionales activos en la zona
    const professionalsInZone = await prisma.perfiles_profesionales.count({
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

    const completedServices = servicesInZone.find(s => s.estado === 'COMPLETADO')?._count?.id || 0;

    // Calcular ratio demanda/supply
    const demandRatio = professionalsInZone > 0 ? completedServices / professionalsInZone : 0;

    return {
      zone,
      completedServices,
      activeProfessionals: professionalsInZone,
      demandRatio,
      demandLevel: getDemandLevel(demandRatio),
      recommendation: getPricingRecommendation(demandRatio)
    };
  } catch (error) {
    console.error('Error getting demand analysis:', error);
    return {
      zone,
      completedServices: 0,
      activeProfessionals: 0,
      demandRatio: 0,
      demandLevel: 'unknown',
      recommendation: 'Mantén precios competitivos'
    };
  }
}

/**
 * Determina el nivel de demanda basado en el ratio
 * @param {number} ratio - Ratio demanda/supply
 * @returns {string} Nivel de demanda
 */
function getDemandLevel(ratio) {
  if (ratio >= 10) return 'very_high';
  if (ratio >= 5) return 'high';
  if (ratio >= 2) return 'medium';
  if (ratio >= 0.5) return 'low';
  return 'very_low';
}

/**
 * Genera recomendación de precios basada en demanda
 * @param {number} ratio - Ratio demanda/supply
 * @returns {string} Recomendación
 */
function getPricingRecommendation(ratio) {
  if (ratio >= 10) return 'Alta demanda - puedes cobrar precios premium';
  if (ratio >= 5) return 'Buena demanda - precios de mercado recomendados';
  if (ratio >= 2) return 'Demanda moderada - precios competitivos';
  if (ratio >= 0.5) return 'Demanda baja - considera precios más bajos';
  return 'Demanda muy baja - revisa tu zona de cobertura';
}

/**
 * Obtiene sugerencias completas de precios para un profesional
 * @param {string} specialty - Especialidad
 * @param {string} zone - Zona
 * @param {number} experience - Años de experiencia
 * @returns {Object} Sugerencias completas de precios
 */
async function getPricingSuggestions(specialty, zone, experience = 0) {
  try {
    const marketStats = await getMarketPriceStats(specialty, zone);
    const demandAnalysis = await getDemandAnalysis(zone);

    // Ajustar precios basado en experiencia
    const experienceMultiplier = Math.min(1 + (experience * 0.02), 1.5); // Máximo 50% extra

    // Ajustar basado en demanda
    const demandMultiplier = {
      'very_high': 1.3,
      'high': 1.15,
      'medium': 1.0,
      'low': 0.9,
      'very_low': 0.8,
      'unknown': 1.0
    }[demandAnalysis.demandLevel] || 1.0;

    const adjustedSuggestions = {};
    Object.keys(marketStats.suggestions).forEach(key => {
      adjustedSuggestions[key] = Math.round(
        marketStats.suggestions[key] * experienceMultiplier * demandMultiplier
      );
    });

    return {
      marketStats,
      demandAnalysis,
      experienceAdjustment: experienceMultiplier,
      demandAdjustment: demandMultiplier,
      finalSuggestions: adjustedSuggestions,
      recommendedPrice: adjustedSuggestions.recommended,
      reasoning: generatePricingReasoning(marketStats, demandAnalysis, experience)
    };
  } catch (error) {
    console.error('Error getting pricing suggestions:', error);
    return {
      error: 'No se pudieron generar sugerencias de precios',
      fallbackPrice: getDefaultPricing(specialty).suggestions.recommended
    };
  }
}

/**
 * Genera explicación de las sugerencias de precios
 * @param {Object} marketStats - Estadísticas del mercado
 * @param {Object} demandAnalysis - Análisis de demanda
 * @param {number} experience - Años de experiencia
 * @returns {string} Explicación detallada
 */
function generatePricingReasoning(marketStats, demandAnalysis, experience) {
  let reasoning = '';

  if (marketStats.isDefault) {
    reasoning += 'Usando precios estándar del mercado ya que hay pocos datos disponibles. ';
  } else {
    reasoning += `Basado en ${marketStats.count} profesionales similares en tu zona. `;
  }

  reasoning += `La demanda en ${demandAnalysis.zone} es ${demandAnalysis.demandLevel.replace('_', ' ')}. `;

  if (experience > 0) {
    reasoning += `Con ${experience} años de experiencia, puedes cobrar un ${Math.round((experience * 2))}% más. `;
  }

  reasoning += demandAnalysis.recommendation;

  return reasoning;
}

/**
 * Obtiene tendencias de precios históricos
 * @param {string} specialty - Especialidad
 * @param {number} months - Meses a analizar
 * @returns {Object} Tendencias de precios
 */
async function getPriceTrends(specialty, months = 6) {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const trends = await prisma.perfiles_profesionales.findMany({
      where: {
        especialidad: specialty,
        usuario: {
          rol: 'profesional',
          creado_en: {
            gte: startDate
          }
        }
      },
      select: {
        tarifa_hora: true,
        usuario: {
          select: {
            creado_en: true
          }
        }
      },
      orderBy: {
        usuario: {
          creado_en: 'asc'
        }
      }
    });

    // Agrupar por mes
    const monthlyTrends = {};
    trends.forEach(trend => {
      const month = trend.usuario.creado_en.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyTrends[month]) {
        monthlyTrends[month] = [];
      }
      monthlyTrends[month].push(trend.tarifa_hora);
    });

    // Calcular promedios mensuales
    const monthlyAverages = Object.keys(monthlyTrends).map(month => ({
      month,
      avgPrice: monthlyTrends[month].reduce((sum, price) => sum + price, 0) / monthlyTrends[month].length,
      count: monthlyTrends[month].length
    }));

    return {
      specialty,
      period: `${months} meses`,
      monthlyAverages,
      trend: calculateTrend(monthlyAverages),
      recommendation: generateTrendRecommendation(monthlyAverages)
    };
  } catch (error) {
    console.error('Error getting price trends:', error);
    return { error: 'No se pudieron obtener tendencias de precios' };
  }
}

/**
 * Calcula la tendencia de precios
 * @param {Array} monthlyData - Datos mensuales
 * @returns {string} Tendencia
 */
function calculateTrend(monthlyData) {
  if (monthlyData.length < 2) return 'insufficient_data';

  const firstHalf = monthlyData.slice(0, Math.floor(monthlyData.length / 2));
  const secondHalf = monthlyData.slice(Math.floor(monthlyData.length / 2));

  const firstAvg = firstHalf.reduce((sum, item) => sum + item.avgPrice, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, item) => sum + item.avgPrice, 0) / secondHalf.length;

  const change = ((secondAvg - firstAvg) / firstAvg) * 100;

  if (change > 5) return 'increasing';
  if (change < -5) return 'decreasing';
  return 'stable';
}

/**
 * Genera recomendación basada en tendencias
 * @param {Array} monthlyData - Datos mensuales
 * @returns {string} Recomendación
 */
function generateTrendRecommendation(monthlyData) {
  const trend = calculateTrend(monthlyData);

  switch (trend) {
    case 'increasing':
      return 'Los precios están subiendo - considera aumentar tus tarifas gradualmente';
    case 'decreasing':
      return 'Los precios están bajando - mantén tarifas competitivas';
    case 'stable':
      return 'Los precios se mantienen estables - buena oportunidad para posicionarte';
    default:
      return 'Datos insuficientes para determinar tendencia';
  }
}

module.exports = {
  getMarketPriceStats,
  getDemandAnalysis,
  getPricingSuggestions,
  getPriceTrends,
  getDefaultPricing
};
