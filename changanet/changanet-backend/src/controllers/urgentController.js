/**
 * @archivo src/controllers/urgentController.js - Controlador de servicios urgentes
 * @descripción Gestiona solicitudes de servicios urgentes con asignación automática y geo-filtrado
 * @sprint Sprint 4 – Servicios Urgentes
 * @tarjeta Nueva funcionalidad: Servicios Urgentes
 * @impacto Social: Atención prioritaria para situaciones de emergencia
 */

const { PrismaClient } = require('@prisma/client');
const { sendNotification } = require('../services/notificationService');
const { sendPushNotification } = require('../services/pushNotificationService');
const { sendEmail } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');

const prisma = new PrismaClient();

/**
 * @función createUrgentRequest - Crear solicitud de servicio urgente
 * @descripción Crea una nueva solicitud urgente y inicia el proceso de asignación automática
 * @param {Object} req - Request con datos de la solicitud (description, location, urgency_level, etc.)
 * @param {Object} res - Response con datos de la solicitud creada
 */
exports.createUrgentRequest = async (req, res) => {
  const { id: clientId } = req.user;
  const {
    description,
    latitude,
    longitude,
    urgency_level = 'high',
    special_requirements,
    estimated_budget,
    service_category
  } = req.body;

  try {
    // Validar datos requeridos
    if (!description || !latitude || !longitude) {
      return res.status(400).json({
        error: 'Descripción y coordenadas (latitude, longitude) son requeridos.'
      });
    }

    // Validar coordenadas
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        error: 'Coordenadas inválidas.'
      });
    }

    // Validar nivel de urgencia
    const validUrgencyLevels = ['low', 'medium', 'high'];
    if (!validUrgencyLevels.includes(urgency_level)) {
      return res.status(400).json({
        error: 'Nivel de urgencia inválido. Valores permitidos: low, medium, high.'
      });
    }

    // Crear la solicitud urgente
    const urgentRequest = await prisma.urgent_requests.create({
      data: {
        client_id: clientId,
        description,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        urgency_level,
        special_requirements,
        estimated_budget: estimated_budget ? parseFloat(estimated_budget) : null,
        service_category,
        status: 'pending'
      }
    });

    // Iniciar proceso de asignación automática en background
    setImmediate(() => {
      require('../services/urgentService').autoAssignProfessionals(urgentRequest.id);
    });

    console.log(`🚨 Solicitud urgente creada: ${urgentRequest.id} por cliente ${clientId}`);

    res.status(201).json({
      ...urgentRequest,
      message: 'Solicitud urgente creada exitosamente. Buscando profesionales disponibles...'
    });
  } catch (error) {
    console.error('Error creando solicitud urgente:', error);
    res.status(500).json({ error: 'Error al crear la solicitud urgente.' });
  }
};

/**
 * @función getUrgentRequestStatus - Obtener estado de solicitud urgente
 * @descripción Retorna el estado actual de una solicitud urgente con información detallada
 */
exports.getUrgentRequestStatus = async (req, res) => {
  const { id: userId } = req.user;
  const { id } = req.params;

  try {
    const urgentRequest = await prisma.urgent_requests.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, nombre: true, email: true } },
        candidates: {
          include: {
            professional: { select: { id: true, nombre: true, especialidad: true } }
          }
        },
        assignments: {
          include: {
            professional: { select: { id: true, nombre: true, telefono: true } }
          }
        }
      }
    });

    if (!urgentRequest) {
      return res.status(404).json({ error: 'Solicitud urgente no encontrada.' });
    }

    // Verificar permisos (solo cliente o profesionales asignados)
    const isClient = urgentRequest.client_id === userId;
    const isAssignedProfessional = urgentRequest.assignments.some(a => a.professional_id === userId);

    if (!isClient && !isAssignedProfessional) {
      return res.status(403).json({ error: 'No tienes acceso a esta solicitud.' });
    }

    res.status(200).json(urgentRequest);
  } catch (error) {
    console.error('Error obteniendo estado de solicitud urgente:', error);
    res.status(500).json({ error: 'Error al obtener el estado de la solicitud.' });
  }
};

/**
 * @función cancelUrgentRequest - Cancelar solicitud urgente
 * @descripción Permite al cliente cancelar una solicitud urgente pendiente
 */
exports.cancelUrgentRequest = async (req, res) => {
  const { id: clientId } = req.user;
  const { id } = req.params;

  try {
    const urgentRequest = await prisma.urgent_requests.findUnique({
      where: { id },
      select: { client_id: true, status: true }
    });

    if (!urgentRequest) {
      return res.status(404).json({ error: 'Solicitud urgente no encontrada.' });
    }

    if (urgentRequest.client_id !== clientId) {
      return res.status(403).json({ error: 'Solo el cliente puede cancelar la solicitud.' });
    }

    if (!['pending', 'assigned'].includes(urgentRequest.status)) {
      return res.status(400).json({ error: 'Solo se pueden cancelar solicitudes pendientes o asignadas.' });
    }

    const updatedRequest = await prisma.urgent_requests.update({
      where: { id },
      data: { status: 'cancelled' }
    });

    // Notificar a profesionales candidatos
    const candidates = await prisma.urgent_request_candidates.findMany({
      where: { urgent_request_id: id },
      select: { professional_id: true }
    });

    for (const candidate of candidates) {
      await sendNotification(
        candidate.professional_id,
        'urgent_request_cancelled',
        'La solicitud urgente ha sido cancelada por el cliente',
        { requestId: id }
      );
    }

    console.log(`❌ Solicitud urgente cancelada: ${id} por cliente ${clientId}`);

    res.status(200).json({
      ...updatedRequest,
      message: 'Solicitud urgente cancelada exitosamente.'
    });
  } catch (error) {
    console.error('Error cancelando solicitud urgente:', error);
    res.status(500).json({ error: 'Error al cancelar la solicitud.' });
  }
};

/**
 * @función getNearbyUrgentRequests - Obtener solicitudes urgentes cercanas
 * @descripción Retorna solicitudes urgentes activas cerca de la ubicación del profesional
 */
exports.getNearbyUrgentRequests = async (req, res) => {
  const { id: professionalId } = req.user;
  const { latitude, longitude, radius = 10 } = req.query; // radius en km

  try {
    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Coordenadas (latitude, longitude) son requeridas.'
      });
    }

    // Obtener perfil del profesional para verificar especialidad
    const professionalProfile = await prisma.perfiles_profesionales.findUnique({
      where: { usuario_id: professionalId },
      select: { especialidad: true, especialidades: true, esta_disponible: true }
    });

    if (!professionalProfile || !professionalProfile.esta_disponible) {
      return res.status(400).json({
        error: 'Perfil profesional no encontrado o no disponible.'
      });
    }

    // Usar geo-filtrado para encontrar solicitudes cercanas
    const urgentService = require('../services/urgentService');
    const nearbyRequests = await urgentService.findNearbyRequests(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius),
      professionalProfile
    );

    res.status(200).json(nearbyRequests);
  } catch (error) {
    console.error('Error obteniendo solicitudes urgentes cercanas:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes cercanas.' });
  }
};

/**
 * @función acceptUrgentRequest - Aceptar solicitud urgente
 * @descripción Permite a un profesional aceptar una solicitud urgente asignada
 */
exports.acceptUrgentRequest = async (req, res) => {
  const { id: professionalId } = req.user;
  const { id } = req.params;
  const { proposed_price, notes } = req.body;

  try {
    // Verificar que el profesional esté en la lista de candidatos
    const candidate = await prisma.urgent_request_candidates.findFirst({
      where: {
        urgent_request_id: id,
        professional_id: professionalId,
        status: 'available'
      }
    });

    if (!candidate) {
      return res.status(404).json({
        error: 'No estás en la lista de candidatos para esta solicitud.'
      });
    }

    // Actualizar estado del candidato
    await prisma.urgent_request_candidates.update({
      where: { id: candidate.id },
      data: {
        status: 'accepted',
        responded_at: new Date(),
        proposed_price: proposed_price ? parseFloat(proposed_price) : null,
        notes
      }
    });

    // Crear asignación
    const assignment = await prisma.urgent_assignments.create({
      data: {
        urgent_request_id: id,
        professional_id: professionalId,
        assigned_at: new Date(),
        status: 'active',
        final_price: proposed_price ? parseFloat(proposed_price) : null,
        notes
      }
    });

    // Actualizar estado de la solicitud
    await prisma.urgent_requests.update({
      where: { id },
      data: { status: 'assigned' }
    });

    // Crear registro de pago si hay precio acordado
    if (proposed_price) {
      const urgentRequest = await prisma.urgent_requests.findUnique({
        where: { id },
        select: { client_id: true, description: true }
      });

      await prisma.pagos.create({
        data: {
          servicio_id: assignment.id, // Usar assignment.id como servicio_id temporal
          cliente_id: urgentRequest.client_id,
          profesional_id: professionalId,
          monto_total: parseFloat(proposed_price),
          comision_plataforma: parseFloat(proposed_price) * 0.1, // 10% comisión
          monto_profesional: parseFloat(proposed_price) * 0.9, // 90% para profesional
          estado: 'pendiente',
          metodo_pago: 'pending',
          url_comprobante: null,
          fecha_pago: null,
          fecha_liberacion: null,
          escrow_release_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h para liberación automática
          commission_setting_id: null // Usar configuración por defecto
        }
      });
    }

    // Notificar al cliente
    const urgentRequest = await prisma.urgent_requests.findUnique({
      where: { id },
      select: { client_id: true, description: true }
    });

    const professional = await prisma.usuarios.findUnique({
      where: { id: professionalId },
      select: { nombre: true, telefono: true }
    });

    await sendNotification(
      urgentRequest.client_id,
      'urgent_request_accepted',
      `¡Tu solicitud urgente "${urgentRequest.description}" ha sido aceptada!`,
      {
        requestId: id,
        professionalName: professional.nombre,
        professionalPhone: professional.telefono,
        proposedPrice: proposed_price
      }
    );

    // Enviar push notification
    await sendPushNotification(
      urgentRequest.client_id,
      'Solicitud Urgente Aceptada',
      `Un profesional ha aceptado tu solicitud urgente`,
      { type: 'urgent_accepted', requestId: id }
    );

    console.log(`✅ Solicitud urgente aceptada: ${id} por profesional ${professionalId}`);

    res.status(200).json({
      ...assignment,
      message: 'Solicitud urgente aceptada exitosamente.'
    });
  } catch (error) {
    console.error('Error aceptando solicitud urgente:', error);
    res.status(500).json({ error: 'Error al aceptar la solicitud.' });
  }
};

/**
 * @función rejectUrgentRequest - Rechazar solicitud urgente
 * @descripción Permite a un profesional rechazar una solicitud urgente
 */
exports.rejectUrgentRequest = async (req, res) => {
  const { id: professionalId } = req.user;
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const candidate = await prisma.urgent_request_candidates.findFirst({
      where: {
        urgent_request_id: id,
        professional_id: professionalId,
        status: 'available'
      }
    });

    if (!candidate) {
      return res.status(404).json({
        error: 'No estás en la lista de candidatos para esta solicitud.'
      });
    }

    // Actualizar estado del candidato
    await prisma.urgent_request_candidates.update({
      where: { id: candidate.id },
      data: {
        status: 'declined',
        responded_at: new Date(),
        notes: reason
      }
    });

    // Intentar reasignar automáticamente
    setImmediate(() => {
      require('../services/urgentService').autoAssignProfessionals(id);
    });

    console.log(`❌ Solicitud urgente rechazada: ${id} por profesional ${professionalId}`);

    res.status(200).json({
      message: 'Solicitud urgente rechazada. Buscando otro profesional...'
    });
  } catch (error) {
    console.error('Error rechazando solicitud urgente:', error);
    res.status(500).json({ error: 'Error al rechazar la solicitud.' });
  }
};

/**
 * @función triggerAutoDispatch - Disparar asignación automática
 * @descripción Endpoint administrativo para forzar re-asignación automática
 */
exports.triggerAutoDispatch = async (req, res) => {
  const { id: userId } = req.user;
  const { requestId } = req.body;

  try {
    // Verificar permisos de admin
    const user = await prisma.usuarios.findUnique({
      where: { id: userId },
      select: { rol: true }
    });

    if (user.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden usar esta función.' });
    }

    const urgentService = require('../services/urgentService');
    const result = await urgentService.autoAssignProfessionals(requestId);

    res.status(200).json({
      message: 'Asignación automática ejecutada.',
      result
    });
  } catch (error) {
    console.error('Error en auto-dispatch:', error);
    res.status(500).json({ error: 'Error al ejecutar asignación automática.' });
  }
};

/**
 * @función geoScan - Escaneo geoespacial
 * @descripción Escanea área específica en busca de profesionales disponibles
 */
exports.geoScan = async (req, res) => {
  const { latitude, longitude, radius = 5, service_category } = req.body;

  try {
    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Coordenadas (latitude, longitude) son requeridas.'
      });
    }

    const urgentService = require('../services/urgentService');
    const scanResult = await urgentService.geoScanProfessionals(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius),
      service_category
    );

    res.status(200).json(scanResult);
  } catch (error) {
    console.error('Error en geo-scan:', error);
    res.status(500).json({ error: 'Error al realizar escaneo geoespacial.' });
  }
};

/**
 * @función notifyNearbyProfessionals - Notificar profesionales cercanos
 * @descripción Envía notificaciones push a profesionales cercanos sobre solicitud urgente
 */
exports.notifyNearbyProfessionals = async (req, res) => {
  const { requestId } = req.body;

  try {
    const urgentService = require('../services/urgentService');
    const result = await urgentService.notifyNearbyProfessionals(requestId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error notificando profesionales:', error);
    res.status(500).json({ error: 'Error al notificar profesionales.' });
  }
};

/**
 * @función getPricingRules - Obtener reglas de precios
 * @descripción Retorna las reglas de precios dinámicos para servicios urgentes
 */
exports.getPricingRules = async (req, res) => {
  try {
    const pricingRules = await prisma.urgent_pricing_rules.findMany({
      where: { active: true },
      orderBy: { service_category: 'asc' }
    });

    res.status(200).json(pricingRules);
  } catch (error) {
    console.error('Error obteniendo reglas de precios:', error);
    res.status(500).json({ error: 'Error al obtener reglas de precios.' });
  }
};

/**
 * @función updatePricingRules - Actualizar reglas de precios
 * @descripción Endpoint administrativo para actualizar reglas de precios dinámicos
 */
exports.updatePricingRules = async (req, res) => {
  const { id: userId } = req.user;
  const { service_category, urgency_level, base_price, urgency_multiplier } = req.body;

  try {
    // Verificar permisos de admin
    const user = await prisma.usuarios.findUnique({
      where: { id: userId },
      select: { rol: true }
    });

    if (user.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden actualizar precios.' });
    }

    // Validar datos
    if (!service_category || !urgency_level || !base_price) {
      return res.status(400).json({
        error: 'service_category, urgency_level y base_price son requeridos.'
      });
    }

    const updatedRule = await prisma.urgent_pricing_rules.upsert({
      where: {
        service_category_urgency_level: {
          service_category,
          urgency_level
        }
      },
      update: {
        base_price: parseFloat(base_price),
        urgency_multiplier: urgency_multiplier ? parseFloat(urgency_multiplier) : 1.0,
        updated_at: new Date()
      },
      create: {
        service_category,
        urgency_level,
        base_price: parseFloat(base_price),
        urgency_multiplier: urgency_multiplier ? parseFloat(urgency_multiplier) : 1.0
      }
    });

    console.log(`💰 Regla de precios actualizada: ${service_category} - ${urgency_level}`);

    res.status(200).json({
      ...updatedRule,
      message: 'Regla de precios actualizada exitosamente.'
    });
  } catch (error) {
    console.error('Error actualizando reglas de precios:', error);
    res.status(500).json({ error: 'Error al actualizar reglas de precios.' });
  }
};

/**
 * @función completeUrgentAssignment - Completar asignación urgente
 * @descripción Permite marcar una asignación urgente como completada y liberar fondos
 */
exports.completeUrgentAssignment = async (req, res) => {
  const { id: professionalId } = req.user;
  const { assignmentId } = req.params;

  try {
    // Verificar que la asignación pertenece al profesional
    const assignment = await prisma.urgent_assignments.findFirst({
      where: {
        id: assignmentId,
        professional_id: professionalId,
        status: 'active'
      },
      include: {
        urgent_request: {
          select: { client_id: true, description: true }
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Asignación no encontrada o no autorizada.' });
    }

    // Marcar asignación como completada
    await prisma.urgent_assignments.update({
      where: { id: assignmentId },
      data: {
        status: 'completed',
        completed_at: new Date(),
        completion_time: Math.round((new Date().getTime() - new Date(assignment.assigned_at).getTime()) / (1000 * 60)) // minutos
      }
    });

    // Actualizar estado de la solicitud urgente
    await prisma.urgent_requests.update({
      where: { id: assignment.urgent_request_id },
      data: { status: 'completed' }
    });

    // Liberar fondos si hay pago pendiente
    const payment = await prisma.pagos.findFirst({
      where: {
        servicio_id: assignmentId,
        estado: 'pendiente'
      }
    });

    if (payment) {
      await prisma.pagos.update({
        where: { id: payment.id },
        data: {
          estado: 'aprobado',
          fecha_liberacion: new Date()
        }
      });

      // Notificar liberación de fondos
      await sendNotification(
        professionalId,
        'fondos_liberados',
        `¡Fondos liberados! Has recibido $${payment.monto_profesional} por el servicio urgente completado.`,
        { paymentId: payment.id, amount: payment.monto_profesional }
      );
    }

    // Notificar al cliente
    await sendNotification(
      assignment.urgent_request.client_id,
      'urgent_completed',
      `Tu solicitud urgente "${assignment.urgent_request.description}" ha sido completada exitosamente.`,
      { requestId: assignment.urgent_request_id, assignmentId }
    );

    console.log(`✅ Asignación urgente completada: ${assignmentId} por profesional ${professionalId}`);

    res.status(200).json({
      message: 'Asignación urgente completada exitosamente.',
      assignment: { ...assignment, status: 'completed', completed_at: new Date() }
    });
  } catch (error) {
    console.error('Error completando asignación urgente:', error);
    res.status(500).json({ error: 'Error al completar la asignación.' });
  }
};
