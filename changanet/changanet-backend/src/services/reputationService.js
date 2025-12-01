/**
 * Servicio de gestión de reputación y medallas para profesionales.
 * Implementa sección 7.8 del PRD: Verificación de Identidad y Reputación
 * REQ-38: Medallas por logros
 * REQ-39: Ranking por reputación
 * Gestiona cálculo de puntuaciones, rankings y asignación automática de medallas.
 */

const { PrismaClient } = require('@prisma/client');
const { get, set, del } = require('./cacheService');

const prisma = new PrismaClient();

/**
 * Calcula la puntuación de reputación para un profesional
 * Fórmula: (average_rating * 0.6) + (completed_jobs * 0.3) + (on_time_percentage * 0.1)
 * @param {string} userId - ID del usuario profesional
 * @returns {Object} Métricas calculadas y puntuación
 */
async function calculateReputationScore(userId) {
  try {
    // Obtener servicios completados
    const completedServices = await prisma.servicios.count({
      where: {
        profesional_id: userId,
        estado: 'COMPLETADO'
      }
    });

    // Obtener reseñas y calcular promedio
    const reviews = await prisma.resenas.findMany({
      where: {
        servicio: {
          profesional_id: userId,
          estado: 'COMPLETADO'
        }
      },
      select: { calificacion: true }
    });

    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.calificacion, 0) / reviews.length
      : 0;

    // Calcular porcentaje de puntualidad (simplificado - servicios completados a tiempo)
    // En una implementación real, esto requeriría timestamps de completado vs agendado
    const onTimePercentage = completedServices > 0 ? 85.0 : 0; // Placeholder: 85% por defecto

    // Aplicar fórmula
    const rankingScore = (averageRating * 0.6) + (completedServices * 0.3) + (onTimePercentage * 0.1);

    return {
      averageRating: parseFloat(averageRating.toFixed(2)),
      completedJobs: completedServices,
      onTimePercentage: onTimePercentage,
      rankingScore: parseFloat(rankingScore.toFixed(2))
    };
  } catch (error) {
    console.error('Error calculando puntuación de reputación:', error);
    throw error;
  }
}

/**
 * Actualiza o crea la puntuación de reputación para un profesional
 * @param {string} userId - ID del usuario profesional
 * @returns {Object} Puntuación de reputación actualizada
 */
async function updateReputationScore(userId) {
  try {
    const metrics = await calculateReputationScore(userId);

    const reputationScore = await prisma.reputation_scores.upsert({
      where: { usuario_id: userId },
      update: {
        average_rating: metrics.averageRating,
        completed_jobs: metrics.completedJobs,
        on_time_percentage: metrics.onTimePercentage,
        ranking_score: metrics.rankingScore,
        last_calculated: new Date()
      },
      create: {
        usuario_id: userId,
        average_rating: metrics.averageRating,
        completed_jobs: metrics.completedJobs,
        on_time_percentage: metrics.onTimePercentage,
        ranking_score: metrics.rankingScore
      }
    });

    // Actualizar ranking global
    await updateGlobalRanking();

    // Invalidar caché de rankings
    await invalidateRankingCache();

    // Verificar y asignar medallas automáticamente
    await checkAndAssignMedals(userId, metrics);

    return reputationScore;
  } catch (error) {
    console.error('Error actualizando puntuación de reputación:', error);
    throw error;
  }
}

/**
 * Obtiene la reputación de un usuario específico
 * @param {string} userId - ID del usuario
 * @returns {Object} Información de reputación
 */
async function getUserReputation(userId) {
  try {
    const reputation = await prisma.reputation_scores.findUnique({
      where: { usuario_id: userId },
      include: {
        usuario: {
          select: {
            nombre: true,
            perfil_profesional: {
              select: {
                especialidad: true,
                zona_cobertura: true,
                calificacion_promedio: true
              }
            }
          }
        }
      }
    });

    if (!reputation) {
      // Si no existe, calcular y crear
      return await updateReputationScore(userId);
    }

    // Verificar si necesita actualización (diaria)
    const lastCalculated = new Date(reputation.last_calculated);
    const now = new Date();
    const hoursSinceLastCalc = (now - lastCalculated) / (1000 * 60 * 60);

    if (hoursSinceLastCalc > 24) {
      return await updateReputationScore(userId);
    }

    return reputation;
  } catch (error) {
    console.error('Error obteniendo reputación del usuario:', error);
    throw error;
  }
}

/**
 * Obtiene el ranking global de profesionales con paginación cursor-based
 * @param {number} limit - Número máximo de resultados (máx 100)
 * @param {string} cursor - Cursor para paginación (ranking_score:id)
 * @returns {Object} Lista ordenada por ranking con nextCursor
 */
async function getGlobalRanking(limit = 100, cursor = null) {
  try {
    // Limitar a máximo 100 por página
    const actualLimit = Math.min(limit, 100);

    const cacheKey = `ranking:cursor:${cursor || 'start'}:${actualLimit}`;

    // Intentar obtener del caché primero
    const cachedRanking = await get(cacheKey);
    if (cachedRanking) {
      return JSON.parse(cachedRanking);
    }

    let whereClause = {};
    if (cursor) {
      const [cursorScore, cursorId] = cursor.split(':');
      whereClause = {
        OR: [
          { ranking_score: { lt: parseFloat(cursorScore) } },
          {
            AND: [
              { ranking_score: { equals: parseFloat(cursorScore) } },
              { id: { gt: cursorId } }
            ]
          }
        ]
      };
    }

    const rankings = await prisma.reputation_scores.findMany({
      where: whereClause,
      take: actualLimit,
      orderBy: [
        { ranking_score: 'desc' },
        { id: 'asc' }
      ],
      include: {
        usuario: {
          select: {
            nombre: true,
            perfil_profesional: {
              select: {
                especialidad: true,
                zona_cobertura: true,
                calificacion_promedio: true,
                estado_verificacion: true
              }
            }
          }
        }
      }
    });

    // Asignar posiciones (esto es aproximado, no preciso para paginación)
    const rankingWithPositions = rankings.map((rank, index) => ({
      ...rank,
      global_ranking: cursor ? 'N/A' : index + 1 // Para paginación, posición no precisa
    }));

    // Generar nextCursor
    const nextCursor = rankings.length === actualLimit
      ? `${rankings[rankings.length - 1].ranking_score}:${rankings[rankings.length - 1].id}`
      : null;

    const result = {
      rankings: rankingWithPositions,
      nextCursor,
      hasMore: rankings.length === actualLimit
    };

    // Cachear el resultado por 7 minutos (420 segundos)
    await set(cacheKey, JSON.stringify(result), 420);

    return result;
  } catch (error) {
    console.error('Error obteniendo ranking global:', error);
    throw error;
  }
}

/**
 * Actualiza las posiciones del ranking global
 */
async function updateGlobalRanking() {
  try {
    const allScores = await prisma.reputation_scores.findMany({
      orderBy: { ranking_score: 'desc' },
      select: { id: true, ranking_score: true }
    });

    // Actualizar posiciones en batch
    const updates = allScores.map((score, index) =>
      prisma.reputation_scores.update({
        where: { id: score.id },
        data: { global_ranking: index + 1 }
      })
    );

    await prisma.$transaction(updates);
  } catch (error) {
    console.error('Error actualizando ranking global:', error);
    throw error;
  }
}

/**
 * Verifica y asigna medallas automáticamente basadas en criterios
 * @param {string} userId - ID del usuario
 * @param {Object} metrics - Métricas calculadas
 */
async function checkAndAssignMedals(userId, metrics) {
  try {
    const medalCriteria = [
      {
        type: 'puntualidad',
        name: 'Profesional Puntual',
        description: 'Más del 90% de trabajos completados a tiempo',
        condition: metrics.onTimePercentage >= 90,
        value: metrics.onTimePercentage
      },
      {
        type: 'calificaciones',
        name: 'Excelente Reputación',
        description: 'Calificación promedio superior a 4.5',
        condition: metrics.averageRating >= 4.5,
        value: metrics.averageRating
      },
      {
        type: 'trabajos_completados',
        name: 'Profesional Experto',
        description: 'Más de 50 servicios completados exitosamente',
        condition: metrics.completedJobs >= 50,
        value: metrics.completedJobs
      },
      {
        type: 'verificado',
        name: 'Identidad Verificada',
        description: 'Documento de identidad verificado',
        condition: await isUserVerified(userId),
        value: 1
      }
    ];

    for (const criteria of medalCriteria) {
      if (criteria.condition) {
        await assignMedal(userId, criteria);
      } else {
        // Si no cumple, revocar medalla si existe
        await revokeMedal(userId, criteria.type);
      }
    }
  } catch (error) {
    console.error('Error verificando medallas:', error);
    // No lanzar error para no interrumpir el flujo principal
  }
}

/**
 * Asigna una medalla a un usuario
 * @param {string} userId - ID del usuario
 * @param {Object} medalData - Datos de la medalla
 */
async function assignMedal(userId, medalData) {
  try {
    await prisma.user_medals.upsert({
      where: {
        usuario_id_medal_type: {
          usuario_id: userId,
          medal_type: medalData.type
        }
      },
      update: {
        condition_value: medalData.value,
        is_active: true,
        awarded_at: new Date(),
        revoked_at: null
      },
      create: {
        usuario_id: userId,
        medal_type: medalData.type,
        medal_name: medalData.name,
        medal_description: medalData.description,
        condition_value: medalData.value,
        condition_type: getConditionType(medalData.type)
      }
    });

    // Invalidar caché de medallas
    await del(`medals:user:${userId}`);
  } catch (error) {
    console.error('Error asignando medalla:', error);
    throw error;
  }
}

/**
 * Revoca una medalla de un usuario
 * @param {string} userId - ID del usuario
 * @param {string} medalType - Tipo de medalla
 */
async function revokeMedal(userId, medalType) {
  try {
    await prisma.user_medals.updateMany({
      where: {
        usuario_id: userId,
        medal_type: medalType,
        is_active: true
      },
      data: {
        is_active: false,
        revoked_at: new Date()
      }
    });

    // Invalidar caché de medallas
    await del(`medals:user:${userId}`);
  } catch (error) {
    console.error('Error revocando medalla:', error);
    throw error;
  }
}

/**
 * Verifica si un usuario está verificado
 * @param {string} userId - ID del usuario
 * @returns {boolean} True si está verificado
 */
async function isUserVerified(userId) {
  try {
    const verification = await prisma.verification_requests.findUnique({
      where: { usuario_id: userId }
    });
    return verification && verification.estado === 'aprobado';
  } catch (error) {
    console.error('Error verificando estado de usuario:', error);
    return false;
  }
}

/**
 * Obtiene el tipo de condición basado en el tipo de medalla
 * @param {string} medalType - Tipo de medalla
 * @returns {string} Tipo de condición
 */
function getConditionType(medalType) {
  const typeMap = {
    'puntualidad': 'percentage',
    'calificaciones': 'rating',
    'trabajos_completados': 'count',
    'verificado': 'boolean'
  };
  return typeMap[medalType] || 'unknown';
}

/**
 * Obtiene todas las medallas de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Array} Lista de medallas activas
 */
async function getUserMedals(userId) {
  try {
    const cacheKey = `medals:user:${userId}`;

    // Intentar obtener del caché
    const cachedMedals = await get(cacheKey);
    if (cachedMedals) {
      return JSON.parse(cachedMedals);
    }

    const medals = await prisma.user_medals.findMany({
      where: {
        usuario_id: userId,
        is_active: true
      },
      orderBy: { awarded_at: 'desc' }
    });

    // Cachear por 15 minutos
    await set(cacheKey, JSON.stringify(medals), 900);

    return medals;
  } catch (error) {
    console.error('Error obteniendo medallas del usuario:', error);
    throw error;
  }
}

/**
 * Fuerza la actualización de todas las puntuaciones de reputación (tarea programada)
 */
async function updateAllReputationScores() {
  try {
    const professionals = await prisma.usuarios.findMany({
      where: { rol: 'profesional' },
      select: { id: true }
    });

    console.log(`Actualizando reputación para ${professionals.length} profesionales...`);

    for (const professional of professionals) {
      await updateReputationScore(professional.id);
    }

    console.log('Actualización de reputación completada');
  } catch (error) {
    console.error('Error actualizando todas las puntuaciones de reputación:', error);
    throw error;
  }
}

/**
 * Invalida el caché de rankings globales
 */
async function invalidateRankingCache() {
  try {
    // Nota: En Redis real, usaríamos KEYS ranking:* pero aquí invalidamos manualmente
    // Para simplificar, invalidamos las claves más comunes
    const cacheKeys = [
      'ranking:cursor:start:50',
      'ranking:cursor:start:100',
      'ranking:cursor:start:200'
    ];
    for (const key of cacheKeys) {
      await del(key);
    }
  } catch (error) {
    console.error('Error invalidando caché de rankings:', error);
    // No lanzar error para no interrumpir el flujo principal
  }
}

module.exports = {
  calculateReputationScore,
  updateReputationScore,
  getUserReputation,
  getGlobalRanking,
  updateGlobalRanking,
  checkAndAssignMedals,
  assignMedal,
  revokeMedal,
  getUserMedals,
  updateAllReputationScores,
  invalidateRankingCache
};
