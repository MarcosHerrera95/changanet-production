/**
 * @archivo src/controllers/serviceController.js - Controlador de servicios
 * @descripción Gestiona agendamiento, seguimiento y finalización de servicios (REQ-07, REQ-08, REQ-09)
 * @sprint Sprint 3 – Servicios y Transacciones
 * @tarjeta Tarjeta 5: [Backend] Implementar API de Servicios y Agendamiento
 * @impacto Económico: Transacciones seguras y formales entre usuarios
 */

const { PrismaClient } = require('@prisma/client');
const { sendNotification } = require('../services/notificationService');
const { sendSMS } = require('../services/smsService');

const prisma = new PrismaClient();

/**
 * @función scheduleService - Agendamiento de servicios
 * @descripción Crea nuevo servicio validando cotización aceptada y envía notificaciones (REQ-07)
 * @sprint Sprint 3 – Servicios y Transacciones
 * @tarjeta Tarjeta 5: [Backend] Implementar API de Servicios y Agendamiento
 * @impacto Económico: Formalización de acuerdos de servicio con seguimiento
 * @param {Object} req - Request con datos del servicio (profesional_id, descripcion, fecha_agendada)
 * @param {Object} res - Response con datos del servicio creado
 */
exports.scheduleService = async (req, res) => {
    const { id: clientId } = req.user;
    const { profesional_id, descripcion, fecha_agendada, es_urgente } = req.body;

    try {
      // Validar datos de entrada
      if (!profesional_id || !descripcion || !fecha_agendada) {
        return res.status(400).json({ error: 'Todos los campos son requeridos: profesional_id, descripcion, fecha_agendada.' });
      }

     // Validar que la fecha sea futura
     const scheduledDate = new Date(fecha_agendada);
     if (scheduledDate <= new Date()) {
       return res.status(400).json({ error: 'La fecha agendada debe ser futura.' });
     }

     // Verificar que el horario esté disponible
     const requestedDateTime = new Date(fecha_agendada);
     const availability = await prisma.disponibilidad.findFirst({
       where: {
         profesional_id: parseInt(profesional_id),
         fecha: {
           gte: new Date(requestedDateTime.toDateString()),
           lt: new Date(new Date(requestedDateTime).setDate(requestedDateTime.getDate() + 1))
         },
         hora_inicio: { lte: requestedDateTime },
         hora_fin: { gt: requestedDateTime },
         esta_disponible: true
       }
     });

     if (!availability) {
       return res.status(400).json({ error: 'El horario seleccionado no está disponible.' });
     }

     // Para Sprint 4, permitimos agendar sin cotización previa (REQ-29)
     // Los profesionales pueden rechazar si no hay cotización

     const service = await prisma.servicios.create({
       data: {
         cliente_id: clientId,
         profesional_id: parseInt(profesional_id),
         descripcion,
         estado: 'agendado',
         fecha_agendada: new Date(fecha_agendada),
         es_urgente: es_urgente || false
       }
     });

     // Crear notificaciones para ambas partes (REQ-30)
     // Notificaciones especiales para servicios urgentes - Sección 10 del PRD
     const { createNotification } = require('../services/notificationService');
     const urgentMessage = es_urgente ? ' 🔥 SERVICIO URGENTE' : '';

     await createNotification(
       clientId,
       'servicio_agendado',
       `Servicio agendado exitosamente para el ${new Date(fecha_agendada).toLocaleDateString('es-AR')}${urgentMessage}`,
       { serviceId: service.id, es_urgente: es_urgente }
     );
     await createNotification(
       parseInt(profesional_id),
       es_urgente ? 'servicio_urgente_agendado' : 'servicio_agendado',
       `Nuevo servicio${es_urgente ? ' URGENTE' : ''} agendado con cliente para el ${new Date(fecha_agendada).toLocaleDateString('es-AR')}${es_urgente ? ' ⚡ ¡Atención inmediata requerida!' : ''}`,
       { serviceId: service.id, es_urgente: es_urgente }
     );

     console.log({ event: 'service_scheduled', clientId, professionalId: profesional_id, serviceId: service.id, fecha_agendada });

     // Marcar el horario como ocupado
     await prisma.disponibilidad.update({
       where: { id: availability.id },
       data: { esta_disponible: false }
     });

     res.status(201).json(service);
   } catch (error) {
     console.error('Error scheduling service:', error);
     res.status(500).json({ error: 'Error al agendar el servicio.' });
   }
};

exports.getClientServices = async (req, res) => {
  const { id: clientId } = req.user;

  try {
    const services = await prisma.servicios.findMany({
      where: { cliente_id: clientId },
      include: {
        profesional: { select: { nombre: true, email: true } }
      },
      orderBy: { creado_en: 'desc' }
    });

    res.status(200).json(services);
  } catch (error) {
    console.error('Error getting client services:', error);
    res.status(500).json({ error: 'Error al obtener servicios.' });
  }
};

exports.getProfessionalServices = async (req, res) => {
  const { id: professionalId } = req.user;

  try {
    const services = await prisma.servicios.findMany({
      where: { profesional_id: professionalId },
      include: {
        cliente: { select: { nombre: true, email: true } }
      },
      // Priorizar servicios urgentes primero - Sección 10 del PRD
      orderBy: [
        { es_urgente: 'desc' }, // Servicios urgentes primero
        { creado_en: 'desc' }   // Luego por fecha de creación
      ]
    });

    res.status(200).json(services);
  } catch (error) {
    console.error('Error getting professional services:', error);
    res.status(500).json({ error: 'Error al obtener servicios.' });
  }
};

/**
 * Marcar o desmarcar un servicio como urgente
 * Sección 10 del PRD: Servicios Urgentes
 */
exports.toggleUrgentService = async (req, res) => {
  const { id: userId } = req.user;
  const { serviceId } = req.params;
  const { es_urgente } = req.body;

  try {
    // Validar que es_urgente sea boolean
    if (typeof es_urgente !== 'boolean') {
      return res.status(400).json({ error: 'es_urgente debe ser un valor booleano.' });
    }

    const service = await prisma.servicios.findUnique({
      where: { id: serviceId },
      include: { cliente: true, profesional: true }
    });

    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado.' });
    }

    // Solo el cliente puede marcar como urgente
    if (service.cliente_id !== userId) {
      return res.status(403).json({ error: 'Solo el cliente puede modificar la urgencia del servicio.' });
    }

    // Solo servicios pendientes pueden ser marcados como urgentes
    if (service.estado !== 'PENDIENTE' && service.estado !== 'AGENDADO') {
      return res.status(400).json({ error: 'Solo servicios pendientes o agendados pueden ser marcados como urgentes.' });
    }

    const updatedService = await prisma.servicios.update({
      where: { id: serviceId },
      data: { es_urgente }
    });

    // Notificar al profesional sobre cambio de urgencia
    const { createNotification } = require('../services/notificationService');
    const urgentMessage = es_urgente ? 'ha sido marcado como URGENTE ⚡' : 'ya no es urgente';
    await createNotification(
      service.profesional_id,
      es_urgente ? 'servicio_marcado_urgente' : 'servicio_desmarcado_urgente',
      `El servicio "${service.descripcion}" ${urgentMessage}`,
      { serviceId, es_urgente }
    );

    console.log(`🔥 Servicio ${serviceId} ${es_urgente ? 'marcado' : 'desmarcado'} como urgente por cliente ${userId}`);

    res.status(200).json(updatedService);
  } catch (error) {
    console.error('Error toggling urgent service:', error);
    res.status(500).json({ error: 'Error al modificar urgencia del servicio.' });
  }
};

exports.updateServiceStatus = async (req, res) => {
   const { id: userId } = req.user;
   const { serviceId } = req.params;
   const { estado } = req.body;

   try {
     // Validar estado permitido
     const estadosPermitidos = ['agendado', 'en_progreso', 'completado', 'cancelado'];
     if (!estadosPermitidos.includes(estado)) {
       return res.status(400).json({ error: 'Estado no válido. Estados permitidos: agendado, en_progreso, completado, cancelado.' });
     }

     const service = await prisma.servicios.findUnique({
       where: { id: serviceId },
       include: { cliente: true, profesional: true }
     });

     if (!service) {
       return res.status(404).json({ error: 'Servicio no encontrado.' });
     }

     // Check permissions
     if (service.profesional_id !== userId) {
       return res.status(403).json({ error: 'No tienes permiso para actualizar este servicio.' });
     }

    const updatedService = await prisma.servicios.update({
      where: { id: serviceId },
      data: {
        estado,
        completado_en: estado === 'completado' ? new Date() : null
      }
    });

    // REGISTRAR MÉTRICA DE SERVICIO COMPLETADO
    if (estado === 'completado') {
      const { captureMessage } = require('../services/sentryService');
      captureMessage('Servicio completado en Changánet', 'info', {
        tags: {
          event: 'service_completed',
          business_metric: 'service_completion',
          user_role: 'professional'
        },
        extra: {
          service_id: serviceId,
          client_id: service.cliente_id,
          professional_id: userId,
          completed_at: new Date().toISOString(),
          business_impact: 'economic_environmental'
        }
      });

      // INCREMENTAR MÉTRICA DE PROMETHEUS PARA SERVICIO COMPLETADO
      const { incrementServiceCompleted, incrementTripleImpactActivity } = require('../services/metricsService');
      incrementServiceCompleted('general', 'economic');
      incrementTripleImpactActivity('environmental', 'servicio_completado');
    }

    // Send notification to client
    await sendNotification(service.cliente_id, 'servicio_agendado', `El estado de tu servicio ha cambiado a: ${estado}`);

    // Send SMS to client if they have SMS enabled and service is completed
    if (estado === 'completado') {
      try {
        const client = await prisma.usuarios.findUnique({
          where: { id: service.cliente_id },
          select: { telefono: true, sms_enabled: true, nombre: true }
        });

        if (client && client.telefono && client.sms_enabled) {
          const smsMessage = `Changánet: ¡Hola ${client.nombre}! Tu servicio ha sido completado exitosamente. Gracias por usar nuestra plataforma.`;
          await sendSMS(client.telefono, smsMessage);
        }
      } catch (smsError) {
        console.error('Error sending SMS notification:', smsError);
        // No fallar la operación principal por error en SMS
      }
    }

    res.status(200).json(updatedService);
  } catch (error) {
    console.error('Error updating service status:', error);
    res.status(500).json({ error: 'Error al actualizar el servicio.' });
  }
};
