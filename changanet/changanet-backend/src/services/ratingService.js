/**
 * Servicio de Cálculo de Calificaciones para el Sistema de Reseñas
 * Implementa lógica de cálculo de promedios y estadísticas según la arquitectura
 *
 * FUNCIONALIDADES:
 * - Cálculo de calificación promedio por profesional
 * - Actualización automática del perfil profesional
 * - Estadísticas detalladas de reseñas
 * - Cálculo de distribución por estrellas
 */

const { PrismaClient } = require('@prisma/client');
const { get, set, del } = require('./cacheService');
const prisma = new PrismaClient();

class RatingService {
  /**
    * Calcula y actualiza la calificación promedio de un profesional
    * REQ-24: Calificación promedio automática
    * Utiliza caché para optimizar cálculos repetitivos
    *
    * @param {string} professionalId - ID del profesional
    * @returns {Promise<number>} Calificación promedio calculada
    */
   async calculateAverageRating(professionalId) {
     try {
       // Intentar obtener promedio del caché
       const cacheKey = `review:average:${professionalId}`;
       const cachedAverage = await get(cacheKey);

       if (cachedAverage) {
         const averageRating = parseFloat(cachedAverage);
         console.log(`📊 Promedio cacheado para profesional ${professionalId}: ${averageRating.toFixed(2)}`);

         // Actualizar el perfil del profesional con valor cacheado
         await prisma.perfiles_profesionales.update({
           where: { usuario_id: professionalId },
           data: { calificacion_promedio: averageRating }
         });

         return averageRating;
       }

       // Si no está en caché, calcular desde la base de datos
       console.log(`🔄 Calculando promedio para profesional ${professionalId}`);

       // Obtener todas las reseñas del profesional
       const reviews = await prisma.resenas.findMany({
         where: {
           servicio: {
             profesional_id: professionalId
           }
         },
         select: {
           calificacion: true
         }
       });

       // Calcular promedio
       let averageRating = 0;
       if (reviews.length > 0) {
         const totalRating = reviews.reduce((sum, review) => sum + review.calificacion, 0);
         averageRating = totalRating / reviews.length;
       }

       // Actualizar el perfil del profesional
       await prisma.perfiles_profesionales.update({
         where: { usuario_id: professionalId },
         data: { calificacion_promedio: averageRating }
       });

       // Almacenar en caché por 10 minutos
       await set(cacheKey, averageRating.toString(), 600);

       console.log(`✅ Calificación promedio actualizada para profesional ${professionalId}: ${averageRating.toFixed(2)}`);

       return averageRating;
     } catch (error) {
       console.error('Error calculating average rating:', error);
       throw new Error('Error al calcular calificación promedio');
     }
   }

  /**
    * Obtiene estadísticas completas de reseñas para un profesional
    * Incluye promedio, distribución, porcentaje positivo, etc.
    * Utiliza caché Redis para optimizar rendimiento
    *
    * @param {string} professionalId - ID del profesional
    * @returns {Promise<Object>} Estadísticas completas
    */
   async getReviewStats(professionalId) {
     try {
       // Intentar obtener del caché primero
       const cacheKey = `review:stats:${professionalId}`;
       const cachedStats = await get(cacheKey);

       if (cachedStats) {
         console.log(`📊 Estadísticas cacheadas para profesional ${professionalId}`);
         return JSON.parse(cachedStats);
       }

       // Si no está en caché, calcular desde la base de datos
       console.log(`🔄 Calculando estadísticas para profesional ${professionalId}`);

       // Obtener todas las reseñas con fechas
       const reviews = await prisma.resenas.findMany({
         where: {
           servicio: {
             profesional_id: professionalId
           }
         },
         select: {
           calificacion: true,
           creado_en: true
         },
         orderBy: {
           creado_en: 'desc'
         }
       });

       const totalReviews = reviews.length;

       // Calcular promedio
       const averageRating = totalReviews > 0
         ? reviews.reduce((sum, review) => sum + review.calificacion, 0) / totalReviews
         : 0;

       // Calcular distribución por estrellas
       const ratingDistribution = {
         1: reviews.filter(r => r.calificacion === 1).length,
         2: reviews.filter(r => r.calificacion === 2).length,
         3: reviews.filter(r => r.calificacion === 3).length,
         4: reviews.filter(r => r.calificacion === 4).length,
         5: reviews.filter(r => r.calificacion === 5).length
       };

       // Calcular porcentaje de reseñas positivas (4-5 estrellas)
       const positiveReviews = reviews.filter(r => r.calificacion >= 4).length;
       const positivePercentage = totalReviews > 0 ? (positiveReviews / totalReviews) * 100 : 0;

       // Obtener fecha de la última reseña
       const lastReviewDate = reviews.length > 0 ? reviews[0].creado_en : null;

       const stats = {
         professionalId,
         totalReviews,
         averageRating: Math.round(averageRating * 10) / 10, // Redondear a 1 decimal
         ratingDistribution,
         positivePercentage: Math.round(positivePercentage),
         lastReviewDate
       };

       // Almacenar en caché por 15 minutos (estadísticas cambian con frecuencia)
       await set(cacheKey, JSON.stringify(stats), 900);

       return stats;
     } catch (error) {
       console.error('Error getting review stats:', error);
       throw new Error('Error al obtener estadísticas de reseñas');
     }
   }

  /**
    * Actualiza el promedio después de crear una nueva reseña
    * Método conveniente que combina creación y actualización
    * Invalida caché de estadísticas y promedio para asegurar datos frescos
    *
    * @param {string} professionalId - ID del profesional
    * @returns {Promise<number>} Nuevo promedio
    */
   async updateAverageAfterReview(professionalId) {
     // Invalidar caché de estadísticas y promedio antes de recalcular
     const statsCacheKey = `review:stats:${professionalId}`;
     const averageCacheKey = `review:average:${professionalId}`;

     await Promise.all([
       del(statsCacheKey),
       del(averageCacheKey)
     ]);

     console.log(`🗑️ Cache invalidado para estadísticas y promedio de profesional ${professionalId}`);

     return await this.calculateAverageRating(professionalId);
   }

  /**
   * Obtiene el ranking de profesionales por calificación promedio
   * Útil para listados y búsquedas
   *
   * @param {number} limit - Número máximo de resultados (default: 10)
   * @param {number} minReviews - Mínimo de reseñas para incluir (default: 1)
   * @returns {Promise<Array>} Lista de profesionales ordenados por rating
   */
  async getTopRatedProfessionals(limit = 10, minReviews = 1) {
    try {
      // Usar vista materializada si existe, o calcular en tiempo real
      const professionals = await prisma.perfiles_profesionales.findMany({
        where: {
          calificacion_promedio: {
            not: null
          },
          esta_disponible: true
        },
        include: {
          usuario: {
            select: {
              nombre: true,
              email: true
            }
          }
        },
        orderBy: {
          calificacion_promedio: 'desc'
        },
        take: limit
      });

      // Filtrar por mínimo de reseñas (esto requiere cálculo adicional)
      const professionalsWithMinReviews = [];
      for (const prof of professionals) {
        const reviewCount = await prisma.resenas.count({
          where: {
            servicio: {
              profesional_id: prof.usuario_id
            }
          }
        });

        if (reviewCount >= minReviews) {
          professionalsWithMinReviews.push({
            ...prof,
            totalReviews: reviewCount
          });
        }
      }

      return professionalsWithMinReviews;
    } catch (error) {
      console.error('Error getting top rated professionals:', error);
      throw new Error('Error al obtener profesionales mejor calificados');
    }
  }

  /**
   * Calcula estadísticas de tendencias de calificación
   * Útil para analytics y dashboards
   *
   * @param {string} professionalId - ID del profesional
   * @param {number} days - Número de días para analizar (default: 30)
   * @returns {Promise<Object>} Estadísticas de tendencia
   */
  async getRatingTrends(professionalId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const reviews = await prisma.resenas.findMany({
        where: {
          servicio: {
            profesional_id: professionalId
          },
          creado_en: {
            gte: startDate
          }
        },
        select: {
          calificacion: true,
          creado_en: true
        },
        orderBy: {
          creado_en: 'asc'
        }
      });

      if (reviews.length === 0) {
        return {
          period: `${days} días`,
          totalReviews: 0,
          averageRating: 0,
          trend: 'stable',
          reviews: []
        };
      }

      const averageRating = reviews.reduce((sum, r) => sum + r.calificacion, 0) / reviews.length;

      // Calcular tendencia simple (comparar primera mitad vs segunda mitad)
      const midPoint = Math.floor(reviews.length / 2);
      const firstHalf = reviews.slice(0, midPoint);
      const secondHalf = reviews.slice(midPoint);

      const firstHalfAvg = firstHalf.length > 0
        ? firstHalf.reduce((sum, r) => sum + r.calificacion, 0) / firstHalf.length
        : 0;

      const secondHalfAvg = secondHalf.length > 0
        ? secondHalf.reduce((sum, r) => sum + r.calificacion, 0) / secondHalf.length
        : 0;

      let trend = 'stable';
      if (secondHalfAvg > firstHalfAvg + 0.2) trend = 'improving';
      else if (secondHalfAvg < firstHalfAvg - 0.2) trend = 'declining';

      return {
        period: `${days} días`,
        totalReviews: reviews.length,
        averageRating: Math.round(averageRating * 10) / 10,
        trend,
        reviews: reviews.map(r => ({
          rating: r.calificacion,
          date: r.creado_en
        }))
      };
    } catch (error) {
      console.error('Error getting rating trends:', error);
      throw new Error('Error al obtener tendencias de calificación');
    }
  }
}

module.exports = new RatingService();
