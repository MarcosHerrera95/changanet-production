/**
 * @archivo src/services/urgentService.js - Servicio de lógica de negocio para servicios urgentes
 * @descripción Implementa geo-filtrado, asignación automática, precios dinámicos y notificaciones
 * @sprint Sprint 4 – Servicios Urgentes
 * @tarjeta Servicio: Lógica de Negocio Urgente
 * @impacto Social/Económico: Sistema completo de gestión de emergencias profesionales
 */

const { PrismaClient } = require('@prisma/client');
const { sendPushNotification } = require('./pushNotificationService');
const { sendEmail } = require('./emailService');
const { sendSMS } = require('./smsService');
const { createNotification } = require('./notificationService');

const prisma = new PrismaClient();

/**
 * @función calculateDistance - Calcular distancia entre dos puntos usando fórmula de Haversine
 * @param {number} lat1 - Latitud punto 1
 * @param {number} lon1 - Longitud punto 1
 * @param {number} lat2 - Latitud punto 2
 * @param {number} lon2 - Longitud punto 2
 * @returns {number} Distancia en kilómetros
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * @función findNearbyRequests - Encontrar solicitudes urgentes cercanas
 * @param {number} profLat - Latitud del profesional
 * @param {number} profLon - Longitud del profesional
 * @param {number} radiusKm - Radio de búsqueda en km
 * @param {Object} professionalProfile - Perfil del profesional
 * @returns {Array} Lista de solicitudes urgentes cercanas
 */
async function findNearbyRequests(profLat, profLon, radiusKm, professionalProfile) {
  try {
    // Obtener todas las solicitudes urgentes activas
    const activeRequests = await prisma.urgent_requests.findMany({
      where: {
        status: { in: ['pending', 'assigned'] },
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
        }
      },
      include: {
        client: { select: { nombre: true } }
      }
    });

    // Filtrar por distancia y especialidad
    const nearbyRequests = [];

    for (const request of activeRequests) {
      const distance = calculateDistance(
        profLat, profLon,
        request.latitude, request.longitude
      );

      if (distance <= radiusKm) {
        // Verificar compatibilidad de especialidad
        const isCompatible = checkSpecialtyCompatibility(
          professionalProfile,
          request.service_category
        );

        if (isCompatible) {
          nearbyRequests.push({
            ...request,
            distance: Math.round(distance * 100) / 100, // Redondear a 2 decimales
            // No incluir candidatos ya existentes para este profesional
            is_already_candidate: await checkExistingCandidate(request.id, professionalProfile.usuario_id)
          });
        }
      }
    }

    // Ordenar por distancia y urgencia
    return nearbyRequests.sort((a, b) => {
      // Primero por urgencia (high > medium > low)
      const urgencyOrder = { high: 3, medium: 2, low: 1 };
      const urgencyDiff = urgencyOrder[b.urgency_level] - urgencyOrder[a.urgency_level];
      if (urgencyDiff !== 0) return urgencyDiff;

      // Luego por distancia
      return a.distance - b.distance;
    });

  } catch (error) {
    console.error('Error finding nearby requests:', error);
    return [];
  }
}

/**
 * @función checkSpecialtyCompatibility - Verificar compatibilidad de especialidad
 * @param {Object} professionalProfile - Perfil del profesional
 * @param {string} serviceCategory - Categoría del servicio solicitado
 * @returns {boolean} true si es compatible
 */
function checkSpecialtyCompatibility(professionalProfile, serviceCategory) {
  if (!serviceCategory) return true; // Si no se especifica categoría, asumir compatible

  const profSpecialties = professionalProfile.especialidades
    ? JSON.parse(professionalProfile.especialidades)
    : [professionalProfile.especialidad];

  // Mapeo de categorías a especialidades
  const categoryMapping = {
    'plomeria': ['plomero', 'instalador', 'fontanero'],
    'electricidad': ['electricista', 'instalador electrico'],
    'carpinteria': ['carpintero', 'ebanista'],
    'pintura': ['pintor', 'decorador'],
    'jardineria': ['jardinero', 'paisajista'],
    'limpieza': ['limpiador', 'personal de limpieza'],
    'reparaciones': ['tecnico', 'reparador']
  };

  const compatibleSpecialties = categoryMapping[serviceCategory.toLowerCase()] || [];
  return profSpecialties.some(specialty =>
    compatibleSpecialties.some(compatible =>
      specialty.toLowerCase().includes(compatible.toLowerCase())
    )
  );
}

/**
 * @función checkExistingCandidate - Verificar si el profesional ya es candidato
 * @param {string} requestId - ID de la solicitud
 * @param {string} professionalId - ID del profesional
 * @returns {boolean} true si ya es candidato
 */
async function checkExistingCandidate(requestId, professionalId) {
  const existing = await prisma.urgent_request_candidates.findFirst({
    where: {
      urgent_request_id: requestId,
      professional_id: professionalId
    }
  });
  return !!existing;
}

/**
 * @función checkAdvancedAvailability - Verificar disponibilidad real en sistema avanzado
 * @param {string} professionalId - ID del profesional
 * @returns {boolean} true si tiene slots disponibles próximamente
 */
async function checkAdvancedAvailability(professionalId) {
  try {
    // Verificar si tiene slots disponibles en las próximas 24 horas
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const availableSlots = await prisma.availability_slots.count({
      where: {
        professional_id: professionalId,
        status: 'available',
        is_available: true,
        start_time: {
          gte: now,
          lte: tomorrow
        }
      }
    });

    return availableSlots > 0;
  } catch (error) {
    console.warn(`Error checking advanced availability for professional ${professionalId}:`, error);
    // Fallback a disponibilidad básica si hay error
    return true;
  }
}

/**
 * @función autoAssignProfessionals - Asignación automática de profesionales
 * @param {string} requestId - ID de la solicitud urgente
 * @returns {Object} Resultado de la asignación
 */
async function autoAssignProfessionals(requestId) {
  try {
    const request = await prisma.urgent_requests.findUnique({
      where: { id: requestId },
      include: {
        candidates: true,
        assignments: true
      }
    });

    if (!request) {
      throw new Error('Solicitud urgente no encontrada');
    }

    // Si ya está asignada, no hacer nada
    if (request.status === 'assigned' || request.assignments.length > 0) {
      return { success: true, message: 'Solicitud ya asignada' };
    }

    // Buscar profesionales disponibles cercanos
    const availableProfessionals = await findAvailableProfessionals(
      request.latitude,
      request.longitude,
      request.service_category,
      15 // Radio de 15km
    );

    if (availableProfessionals.length === 0) {
      console.log(`⚠️ No se encontraron profesionales disponibles para solicitud ${requestId}`);
      return { success: false, message: 'No hay profesionales disponibles' };
    }

    // Crear candidatos (máximo 5)
    const candidatesToCreate = availableProfessionals.slice(0, 5);
    const candidates = [];

    for (const prof of candidatesToCreate) {
      const candidate = await prisma.urgent_request_candidates.create({
        data: {
          urgent_request_id: requestId,
          professional_id: prof.id,
          distance: prof.distance,
          estimated_arrival_time: calculateEstimatedArrival(prof.distance),
          status: 'available'
        }
      });
      candidates.push(candidate);
    }

    // Notificar a los candidatos
    await notifyCandidates(candidates, request);

    console.log(`🤖 Asignación automática completada para solicitud ${requestId}: ${candidates.length} candidatos`);

    return {
      success: true,
      candidates_count: candidates.length,
      message: `Asignados ${candidates.length} profesionales candidatos`
    };

  } catch (error) {
    console.error('Error en auto-asignación:', error);
    return { success: false, error: error.message };
  }
}

/**
 * @función findAvailableProfessionals - Encontrar profesionales disponibles
 * @param {number} lat - Latitud de la solicitud
 * @param {number} lon - Longitud de la solicitud
 * @param {string} serviceCategory - Categoría del servicio
 * @param {number} radiusKm - Radio de búsqueda
 * @returns {Array} Lista de profesionales disponibles ordenados por prioridad
 */
async function findAvailableProfessionals(lat, lon, serviceCategory, radiusKm) {
  try {
    // Obtener profesionales con perfiles completos y disponibilidad avanzada
    const professionals = await prisma.perfiles_profesionales.findMany({
      where: {
        esta_disponible: true,
        latitud: { not: null },
        longitud: { not: null },
        usuario: {
          rol: 'profesional',
          bloqueado: false
        }
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            fcm_token: true,
            notificaciones_push: true,
            // Incluir reputación completa
            reputation_score: {
              select: { ranking_score: true }
            },
            user_medals: {
              where: { is_active: true },
              select: { medal_type: true, medal_name: true }
            }
          }
        }
      }
    });

    // Filtrar y puntuar profesionales
    const scoredProfessionals = [];

    for (const prof of professionals) {
      const distance = calculateDistance(lat, lon, prof.latitud, prof.longitud);

      if (distance <= radiusKm) {
        // Verificar compatibilidad de especialidad
        if (!checkSpecialtyCompatibility(prof, serviceCategory)) {
          continue;
        }

        // Verificar disponibilidad real en el sistema avanzado de disponibilidad
        const hasAvailableSlots = await checkAdvancedAvailability(prof.usuario.id);
        if (!hasAvailableSlots) {
          continue; // No tiene slots disponibles, saltar
        }

        // Calcular puntuación (0-100)
        const score = calculateProfessionalScore(prof, distance);

        scoredProfessionals.push({
          ...prof,
          distance,
          score,
          reputation_score: prof.usuario.reputation_score?.ranking_score || 0,
          user_medals: prof.usuario.user_medals || []
        });
      }
    }

    // Ordenar por puntuación (descendente)
    return scoredProfessionals
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10

  } catch (error) {
    console.error('Error finding available professionals:', error);
    return [];
  }
}

/**
 * @función calculateProfessionalScore - Calcular puntuación de profesional
 * @param {Object} professional - Datos del profesional
 * @param {number} distance - Distancia en km
 * @returns {number} Puntuación de 0-100
 */
function calculateProfessionalScore(professional, distance) {
  let score = 0;

  // Factor de distancia (35%): más cerca = mejor puntuación
  const distanceScore = Math.max(0, 35 - (distance * 3.5)); // 10km = 0 puntos, 0km = 35 puntos
  score += distanceScore;

  // Factor de reputación (30%): basada en ranking_score y medallas
  const reputationScore = professional.usuario.reputation_score?.ranking_score || 0;
  const normalizedReputation = Math.min(reputationScore / 100, 1) * 25;
  score += normalizedReputation;

  // Bonus por medallas activas (5% adicional)
  const medalBonus = calculateMedalBonus(professional.usuario.user_medals || []);
  score += medalBonus;

  // Factor de completitud de perfil (15%): si tiene foto, descripción, etc.
  let profileCompleteness = 0;
  if (professional.descripcion) profileCompleteness += 3;
  if (professional.url_foto_perfil) profileCompleteness += 3;
  if (professional.anos_experiencia) profileCompleteness += 3;
  if (professional.estado_verificacion === 'verificado') profileCompleteness += 6;
  score += Math.min(profileCompleteness, 15);

  // Factor de actividad reciente (15%): bonus por estar activo y tener slots disponibles
  score += 15; // Asumir activo si llega aquí

  return Math.min(score, 100);
}

/**
 * @función calculateMedalBonus - Calcular bonus por medallas
 * @param {Array} medals - Lista de medallas del usuario
 * @returns {number} Bonus de puntuación
 */
function calculateMedalBonus(medals) {
  let bonus = 0;

  for (const medal of medals) {
    switch (medal.medal_type) {
      case 'puntualidad':
        bonus += 2;
        break;
      case 'calificaciones':
        bonus += 2;
        break;
      case 'trabajos_completados':
        bonus += 1;
        break;
      case 'verificado':
        bonus += 3;
        break;
      default:
        bonus += 1;
    }
  }

  return Math.min(bonus, 5); // Máximo 5 puntos por medallas
}

/**
 * @función calculateEstimatedArrival - Calcular tiempo estimado de llegada
 * @param {number} distance - Distancia en km
 * @returns {number} Tiempo en minutos
 */
function calculateEstimatedArrival(distance) {
  // Estimación básica: 15 min + 2 min por km
  return Math.round(15 + (distance * 2));
}

/**
 * @función notifyCandidates - Notificar candidatos sobre solicitud urgente
 * @param {Array} candidates - Lista de candidatos
 * @param {Object} request - Datos de la solicitud
 */
async function notifyCandidates(candidates, request) {
  for (const candidate of candidates) {
    try {
      const professional = await prisma.usuarios.findUnique({
        where: { id: candidate.professional_id },
        select: { fcm_token: true, notificaciones_push: true, email: true, telefono: true, sms_enabled: true }
      });

      if (!professional) continue;

      // Notificación push
      if (professional.fcm_token && professional.notificaciones_push) {
        await sendPushNotification(
          candidate.professional_id,
          '¡Solicitud Urgente Cerca!',
          `Nueva solicitud urgente a ${candidate.distance}km de distancia`,
          {
            type: 'urgent_request',
            requestId: request.id,
            distance: candidate.distance,
            urgency: request.urgency_level
          }
        );
      }

      // Notificación en base de datos
      await createNotification(
        candidate.professional_id,
        'urgent_nearby',
        `Solicitud urgente disponible a ${candidate.distance}km`,
        {
          requestId: request.id,
          distance: candidate.distance,
          urgencyLevel: request.urgency_level,
          description: request.description.substring(0, 100)
        }
      );

      // Email opcional para urgencias altas
      if (request.urgency_level === 'high' && professional.email) {
        await sendEmail(
          professional.email,
          'Solicitud Urgente de Alta Prioridad',
          `Se ha detectado una solicitud urgente de alta prioridad cerca de tu ubicación.\n\n` +
          `Descripción: ${request.description}\n` +
          `Distancia: ${candidate.distance}km\n` +
          `Tiempo estimado de llegada: ${candidate.estimated_arrival_time} minutos\n\n` +
          `Accede a la app para aceptar o rechazar esta solicitud.`
        );
      }

    } catch (error) {
      console.error(`Error notificando candidato ${candidate.professional_id}:`, error);
    }
  }
}

/**
 * @función geoScanProfessionals - Escaneo geoespacial de profesionales
 * @param {number} centerLat - Latitud centro
 * @param {number} centerLon - Longitud centro
 * @param {number} radiusKm - Radio en km
 * @param {string} serviceCategory - Categoría de servicio
 * @returns {Object} Resultados del escaneo
 */
async function geoScanProfessionals(centerLat, centerLon, radiusKm, serviceCategory) {
  try {
    const professionals = await prisma.perfiles_profesionales.findMany({
      where: {
        esta_disponible: true,
        latitud: { not: null },
        longitud: { not: null }
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            rol: true
          }
        }
      }
    });

    const results = {
      total_professionals: professionals.length,
      in_radius: 0,
      by_distance_ranges: {
        '0-2km': 0,
        '2-5km': 0,
        '5-10km': 0,
        '10km+': 0
      },
      professionals: []
    };

    for (const prof of professionals) {
      const distance = calculateDistance(centerLat, centerLon, prof.latitud, prof.longitud);

      if (distance <= radiusKm) {
        results.in_radius++;

        // Contar por rangos
        if (distance <= 2) results.by_distance_ranges['0-2km']++;
        else if (distance <= 5) results.by_distance_ranges['2-5km']++;
        else if (distance <= 10) results.by_distance_ranges['5-10km']++;
        else results.by_distance_ranges['10km+']++;

        // Verificar especialidad si se especificó
        const specialtyMatch = serviceCategory
          ? checkSpecialtyCompatibility(prof, serviceCategory)
          : true;

        results.professionals.push({
          id: prof.usuario.id,
          nombre: prof.usuario.nombre,
          distance: Math.round(distance * 100) / 100,
          specialty_match: specialtyMatch,
          latitud: prof.latitud,
          longitud: prof.longitud
        });
      }
    }

    return results;

  } catch (error) {
    console.error('Error en geo-scan:', error);
    throw error;
  }
}

/**
 * @función notifyNearbyProfessionals - Notificar profesionales cercanos
 * @param {string} requestId - ID de la solicitud
 * @returns {Object} Resultado de las notificaciones
 */
async function notifyNearbyProfessionals(requestId) {
  try {
    const request = await prisma.urgent_requests.findUnique({
      where: { id: requestId },
      include: { candidates: true }
    });

    if (!request) {
      throw new Error('Solicitud no encontrada');
    }

    // Obtener candidatos existentes
    const existingCandidateIds = request.candidates.map(c => c.professional_id);

    // Buscar más profesionales si hay menos de 3 candidatos
    if (existingCandidateIds.length < 3) {
      const additionalProfessionals = await findAvailableProfessionals(
        request.latitude,
        request.longitude,
        request.service_category,
        20 // Radio mayor
      );

      // Filtrar profesionales que no son candidatos aún
      const newCandidates = additionalProfessionals
        .filter(p => !existingCandidateIds.includes(p.usuario.id))
        .slice(0, 3 - existingCandidateIds.length);

      // Crear nuevos candidatos
      for (const prof of newCandidates) {
        await prisma.urgent_request_candidates.create({
          data: {
            urgent_request_id: requestId,
            professional_id: prof.usuario.id,
            distance: prof.distance,
            estimated_arrival_time: calculateEstimatedArrival(prof.distance),
            status: 'available'
          }
        });
      }

      // Notificar a los nuevos candidatos
      if (newCandidates.length > 0) {
        const newCandidateRecords = newCandidates.map(prof => ({
          professional_id: prof.usuario.id,
          distance: prof.distance,
          estimated_arrival_time: calculateEstimatedArrival(prof.distance)
        }));
        await notifyCandidates(newCandidateRecords, request);
      }
    }

    return {
      success: true,
      notified_count: Math.max(0, 3 - existingCandidateIds.length),
      message: 'Notificaciones enviadas a profesionales cercanos'
    };

  } catch (error) {
    console.error('Error notificando profesionales cercanos:', error);
    throw error;
  }
}

/**
 * @función calculateDynamicPrice - Calcular precio dinámico
 * @param {string} serviceCategory - Categoría del servicio
 * @param {string} urgencyLevel - Nivel de urgencia
 * @param {number} basePrice - Precio base opcional
 * @returns {number} Precio calculado
 */
async function calculateDynamicPrice(serviceCategory, urgencyLevel, basePrice = null) {
  try {
    // Buscar regla de precios
    const pricingRule = await prisma.urgent_pricing_rules.findFirst({
      where: {
        service_category: serviceCategory,
        urgency_level: urgencyLevel,
        active: true
      }
    });

    if (pricingRule) {
      return pricingRule.base_price * pricingRule.urgency_multiplier;
    }

    // Fallback a precio base si no hay regla
    const defaultBasePrice = basePrice || 500; // $500 ARS por defecto
    const urgencyMultipliers = {
      low: 1.0,
      medium: 1.3,
      high: 1.8
    };

    return defaultBasePrice * (urgencyMultipliers[urgencyLevel] || 1.0);

  } catch (error) {
    console.error('Error calculating dynamic price:', error);
    return basePrice || 500;
  }
}

module.exports = {
  findNearbyRequests,
  autoAssignProfessionals,
  geoScanProfessionals,
  notifyNearbyProfessionals,
  calculateDynamicPrice,
  calculateDistance
};
