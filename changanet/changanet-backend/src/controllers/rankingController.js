/**
 * Controlador de rankings y reputación
 * REQ-39: Sistema de rankings basado en reputación
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calcular el ranking de un profesional basado en múltiples factores
 */
const calculateProfessionalRanking = async (professionalId) => {
  try {
    // Obtener datos del profesional
    const professional = await prisma.perfiles_profesionales.findUnique({
      where: { usuario_id: professionalId },
      include: {
        usuario: {
          include: {
            servicios_como_profesional: {
              where: { estado: 'COMPLETADO' }
            },
            resenas_escritas: true, // Reseñas que recibió
            logros_obtenidos: { include: { logro: true } } // REQ-38: Sistema de medallas
          }
        }
      }
    });

    if (!professional) return 0;

    const user = professional.usuario;
    let score = 0;

    // Factor 1: Calificación promedio (40% del score)
    const avgRating = professional.calificacion_promedio || 0;
    score += avgRating * 40;

    // Factor 2: Número de servicios completados (20% del score)
    const completedServices = user.servicios_como_profesional.length;
    score += Math.min(completedServices * 2, 20); // Máximo 20 puntos

    // Factor 3: Verificación de identidad (15% del score)
    if (user.esta_verificado) {
      score += 15;
    }

    // Factor 4: Experiencia (10% del score)
    const experience = professional.anos_experiencia || 0;
    score += Math.min(experience * 2, 10); // Máximo 10 puntos

    // Factor 5: Logros obtenidos (10% del score) - REQ-38: Sistema de medallas
    const achievementPoints = user.logros_obtenidos.reduce((total, la) => total + la.logro.puntos, 0);
    score += Math.min(achievementPoints * 0.5, 10); // Máximo 10 puntos

    // Factor 6: Reseñas positivas (5% del score)
    const positiveReviews = user.resenas_escritas.filter(r => r.calificacion >= 4).length;
    score += Math.min(positiveReviews * 0.5, 5); // Máximo 5 puntos

    return Math.round(score * 100) / 100; // Redondear a 2 decimales
  } catch (error) {
    console.error('Error calculating professional ranking:', error);
    return 0;
  }
};

/**
 * Obtener ranking de todos los profesionales
 */
exports.getProfessionalsRanking = async (req, res) => {
  try {
    const professionals = await prisma.perfiles_profesionales.findMany({
      include: {
        usuario: {
          include: {
            servicios_como_profesional: {
              where: { estado: 'COMPLETADO' }
            },
            resenas_escritas: true,
            logros_obtenidos: { include: { logro: true } } // REQ-38: Sistema de medallas
          }
        }
      }
    });

    // Calcular rankings para todos los profesionales
    const rankings = await Promise.all(
      professionals.map(async (prof) => {
        const score = await calculateProfessionalRanking(prof.usuario_id);
        return {
          id: prof.usuario_id,
          nombre: prof.usuario.nombre,
          especialidad: prof.especialidad,
          zona_cobertura: prof.zona_cobertura,
          calificacion_promedio: prof.calificacion_promedio || 0,
          servicios_completados: prof.usuario.servicios_como_profesional.length,
          esta_verificado: prof.usuario.esta_verificado,
          anos_experiencia: prof.anos_experiencia || 0,
          score: score,
          ranking: 0 // Se asignará después del sort
        };
      })
    );

    // Ordenar por score descendente
    rankings.sort((a, b) => b.score - a.score);

    // Asignar posiciones
    rankings.forEach((ranking, index) => {
      ranking.ranking = index + 1;
    });

    res.json({
      success: true,
      data: rankings
    });
  } catch (error) {
    console.error('Error obteniendo rankings:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener ranking de un profesional específico
 */
exports.getProfessionalRanking = async (req, res) => {
  try {
    const { professionalId } = req.params;

    const score = await calculateProfessionalRanking(professionalId);

    // Obtener posición en el ranking general
    const allRankings = await getAllRankingsData();
    const position = allRankings.findIndex(r => r.id === professionalId) + 1;

    // Obtener datos detallados del profesional
    const professional = await prisma.perfiles_profesionales.findUnique({
      where: { usuario_id: professionalId },
      include: {
        usuario: {
          include: {
            servicios_como_profesional: {
              where: { estado: 'COMPLETADO' }
            },
            resenas_escritas: true,
            logros_obtenidos: { include: { logro: true } } // REQ-38: Sistema de medallas
          }
        }
      }
    });

    if (!professional) {
      return res.status(404).json({
        success: false,
        error: 'Profesional no encontrado'
      });
    }

    const user = professional.usuario;
    const achievementPoints = user.logros_obtenidos.reduce((total, la) => total + la.logro.puntos, 0); // REQ-38: Sistema de medallas
    const positiveReviews = user.resenas_escritas.filter(r => r.calificacion >= 4).length;

    res.json({
      success: true,
      data: {
        id: professionalId,
        nombre: professional.usuario.nombre,
        especialidad: professional.especialidad,
        zona_cobertura: professional.zona_cobertura,
        score: score,
        ranking: position,
        detalles: {
          calificacion_promedio: professional.calificacion_promedio || 0,
          servicios_completados: user.servicios_como_profesional.length,
          esta_verificado: user.esta_verificado,
          anos_experiencia: professional.anos_experiencia || 0,
          logros_puntos: achievementPoints,
          resenas_positivas: positiveReviews
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo ranking del profesional:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Función auxiliar para obtener datos de rankings
 */
const getAllRankingsData = async () => {
  const professionals = await prisma.perfiles_profesionales.findMany({
    include: {
      usuario: {
        include: {
          servicios_como_profesional: {
            where: { estado: 'COMPLETADO' }
          },
          resenas_escritas: true,
          logros_obtenidos: { include: { logro: true } } // REQ-38: Sistema de medallas
        }
      }
    }
  });

  const rankings = await Promise.all(
    professionals.map(async (prof) => {
      const score = await calculateProfessionalRanking(prof.usuario_id);
      return {
        id: prof.usuario_id,
        score: score
      };
    })
  );

  rankings.sort((a, b) => b.score - a.score);
  return rankings;
};

/**
 * Obtener top profesionales por especialidad
 */
exports.getTopProfessionalsBySpecialty = async (req, res) => {
  try {
    const { specialty } = req.params;

    const professionals = await prisma.perfiles_profesionales.findMany({
      where: {
        especialidad: {
          contains: specialty,
          mode: 'insensitive'
        }
      },
      include: {
        usuario: {
          include: {
            servicios_como_profesional: {
              where: { estado: 'COMPLETADO' }
            },
            resenas_escritas: true,
            logros_obtenidos: { include: { logro: true } } // REQ-38: Sistema de medallas
          }
        }
      }
    });

    const rankings = await Promise.all(
      professionals.map(async (prof) => {
        const score = await calculateProfessionalRanking(prof.usuario_id);
        return {
          id: prof.usuario_id,
          nombre: prof.usuario.nombre,
          especialidad: prof.especialidad,
          zona_cobertura: prof.zona_cobertura,
          calificacion_promedio: prof.calificacion_promedio || 0,
          score: score
        };
      })
    );

    rankings.sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      data: rankings.slice(0, 10) // Top 10
    });
  } catch (error) {
    console.error('Error obteniendo top profesionales por especialidad:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

module.exports = exports;
