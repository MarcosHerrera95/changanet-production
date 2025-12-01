/**
 * Controlador de gestión de disponibilidad y agenda
 * Implementa sección 7.6 del PRD: Gestión de Disponibilidad y Agenda
 *
 * REQUERIMIENTOS FUNCIONALES IMPLEMENTADOS:
 * ✅ REQ-26: Calendario editable para profesionales - CRUD completo de slots
 * ✅ REQ-27: Marcar horarios disponibles/no disponibles - Campo esta_disponible
 * ✅ REQ-28: Clientes ven disponibilidad en tiempo real - Endpoint público filtrado
 * ✅ REQ-29: Agendar servicios directamente - Nueva funcionalidad bookAvailability
 * ✅ REQ-30: Confirmación automática al agendar - Notificaciones push y email
 *
 * FUNCIONALIDADES ADICIONALES:
 * - Validación de solapamiento de horarios
 * - Sistema de reservas con relación a servicios
 * - Cancelación de reservas
 * - Notificaciones automáticas para confirmaciones
 * - Validación de permisos por rol (cliente/profesional)
 *
 * ENDPOINTS DISPONIBLES:
 * POST /api/availability - Crear slot de disponibilidad (profesional)
 * GET /api/availability/:professionalId?date=YYYY-MM-DD - Ver disponibilidad (cliente)
 * PUT /api/availability/:slotId - Actualizar disponibilidad (profesional)
 * POST /api/availability/:slotId/book - Reservar slot (cliente) - REQ-29
 * DELETE /api/availability/:slotId/cancel - Cancelar reserva
 * DELETE /api/availability/:slotId - Eliminar slot (profesional)
 */

// src/controllers/availabilityController.js
const { PrismaClient } = require('@prisma/client');
const { sendNotification } = require('../services/notificationService');
const prisma = new PrismaClient();

/**
 * Crea un nuevo horario de disponibilidad para profesional
 * REQ-26: Calendario editable
 * REQ-27: Marcar horarios disponibles
 * Valida solapamiento de horarios
 */
exports.createAvailability = async (req, res) => {
  const { id: userId } = req.user;
  const { fecha, hora_inicio, hora_fin, esta_disponible } = req.body;

  try {
    const user = await prisma.usuarios.findUnique({ where: { id: userId } });
    if (user.rol !== 'profesional') {
      return res.status(403).json({ error: 'Solo los profesionales pueden gestionar disponibilidad.' });
    }

    // Validar que no haya solapamiento de horarios
    const existingSlots = await prisma.disponibilidad.findMany({
      where: {
        profesional_id: userId,
        fecha: new Date(fecha),
        OR: [
          {
            AND: [
              { hora_inicio: { lte: new Date(hora_inicio) } },
              { hora_fin: { gt: new Date(hora_inicio) } }
            ]
          },
          {
            AND: [
              { hora_inicio: { lt: new Date(hora_fin) } },
              { hora_fin: { gte: new Date(hora_fin) } }
            ]
          }
        ]
      }
    });

    if (existingSlots.length > 0) {
      return res.status(400).json({ error: 'Ya existe un horario que se solapa con el horario seleccionado.' });
    }

    const availability = await prisma.disponibilidad.create({
      data: {
        profesional_id: userId,
        fecha: new Date(fecha),
        hora_inicio: new Date(hora_inicio),
        hora_fin: new Date(hora_fin),
        esta_disponible: esta_disponible !== undefined ? esta_disponible : true
      }
    });

    res.status(201).json(availability);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear disponibilidad.' });
  }
};

/**
 * Obtiene disponibilidad de un profesional para una fecha específica
 * REQ-28: Clientes ven disponibilidad en tiempo real
 * Solo muestra horarios marcados como disponibles
 */
exports.getAvailability = async (req, res) => {
  const { professionalId } = req.params;
  const { date } = req.query;

  try {
    let startDate, endDate;
    
    if (date) {
      // Parse date properly - assuming date comes as YYYY-MM-DD
      startDate = new Date(date);
      endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1); // Next day for range
    } else {
      // If no date provided, get availability for next 7 days
      startDate = new Date();
      endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
    }

    const availabilities = await prisma.disponibilidad.findMany({
      where: {
        profesional_id: professionalId,
        fecha: {
          gte: startDate,
          lt: endDate
        },
        esta_disponible: true // Solo mostrar horarios disponibles para clientes
      },
      orderBy: { hora_inicio: 'asc' }
    });
    res.status(200).json(availabilities);
  } catch (error) {
    console.error('Error getting availability:', error);
    res.status(500).json({ error: 'Error al obtener disponibilidad.' });
  }
};

exports.updateAvailability = async (req, res) => {
  const { id: userId } = req.user;
  const { slotId } = req.params;
  const { esta_disponible } = req.body;

  try {
    const slot = await prisma.disponibilidad.findUnique({ where: { id: slotId } });
    if (!slot || slot.profesional_id !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para actualizar este horario.' });
    }

    const updatedSlot = await prisma.disponibilidad.update({
      where: { id: slotId },
      data: { esta_disponible }
    });

    res.status(200).json(updatedSlot);
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({ error: 'Error al actualizar disponibilidad.' });
  }
};

/**
 * Reserva un slot de disponibilidad para agendar un servicio
 * REQ-29: Permitir agendar servicios directamente
 * REQ-30: Enviar confirmación automática al agendar
 */
exports.bookAvailability = async (req, res) => {
  const { id: userId } = req.user;
  const { slotId } = req.params;
  const { descripcion } = req.body;

  try {
    // Verificar que el usuario sea cliente
    const user = await prisma.usuarios.findUnique({ where: { id: userId } });
    if (user.rol !== 'cliente') {
      return res.status(403).json({ error: 'Solo los clientes pueden agendar servicios.' });
    }

    // Verificar que el slot existe y está disponible
    const slot = await prisma.disponibilidad.findUnique({
      where: { id: slotId },
      include: { profesional: true }
    });

    if (!slot) {
      return res.status(404).json({ error: 'Slot de disponibilidad no encontrado.' });
    }

    if (!slot.esta_disponible) {
      return res.status(400).json({ error: 'Este horario ya no está disponible.' });
    }

    if (slot.reservado_por) {
      return res.status(400).json({ error: 'Este horario ya ha sido reservado.' });
    }

    // Crear el servicio agendado
    const service = await prisma.servicios.create({
      data: {
        cliente_id: userId,
        profesional_id: slot.profesional_id,
        descripcion: descripcion || `Servicio agendado para ${slot.fecha.toISOString().split('T')[0]} ${slot.hora_inicio.toTimeString().slice(0, 5)}-${slot.hora_fin.toTimeString().slice(0, 5)}`,
        estado: 'AGENDADO',
        fecha_agendada: slot.fecha
      }
    });

    // Reservar el slot
    await prisma.disponibilidad.update({
      where: { id: slotId },
      data: {
        reservado_por: userId,
        reservado_en: new Date(),
        servicio_id: service.id
      }
    });

    // Enviar notificaciones - REQ-30: Confirmación automática
    const { sendNotification } = require('../services/notificationService');

    // Notificación al cliente
    await sendNotification(
      userId,
      'servicio_agendado',
      `Servicio agendado exitosamente con ${slot.profesional.nombre} para el ${slot.fecha.toISOString().split('T')[0]} a las ${slot.hora_inicio.toTimeString().slice(0, 5)}`,
      { servicio_id: service.id, slot_id: slotId }
    );

    // Notificación al profesional
    await sendNotification(
      slot.profesional_id,
      'nueva_reserva',
      `Nueva reserva de ${user.nombre} para el ${slot.fecha.toISOString().split('T')[0]} a las ${slot.hora_inicio.toTimeString().slice(0, 5)}`,
      { servicio_id: service.id, slot_id: slotId }
    );

    res.status(201).json({
      message: 'Servicio agendado exitosamente.',
      service,
      slot: {
        ...slot,
        reservado_por: userId,
        reservado_en: new Date(),
        servicio_id: service.id
      }
    });
  } catch (error) {
    console.error('Error booking availability:', error);
    res.status(500).json({ error: 'Error al agendar el servicio.' });
  }
};

/**
 * Cancela una reserva de disponibilidad
 */
exports.cancelBooking = async (req, res) => {
  const { id: userId } = req.user;
  const { slotId } = req.params;

  try {
    const slot = await prisma.disponibilidad.findUnique({
      where: { id: slotId },
      include: { servicio: true }
    });

    if (!slot) {
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }

    // Solo el cliente que reservó o el profesional pueden cancelar
    if (slot.reservado_por !== userId && slot.profesional_id !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para cancelar esta reserva.' });
    }

    // Cancelar el servicio si existe
    if (slot.servicio) {
      await prisma.servicios.update({
        where: { id: slot.servicio.id },
        data: { estado: 'CANCELADO' }
      });
    }

    // Liberar el slot
    await prisma.disponibilidad.update({
      where: { id: slotId },
      data: {
        reservado_por: null,
        reservado_en: null,
        servicio_id: null
      }
    });

    res.status(200).json({ message: 'Reserva cancelada exitosamente.' });
  } catch (error) {
    console.error('Error canceling booking:', error);
    res.status(500).json({ error: 'Error al cancelar la reserva.' });
  }
};

exports.deleteAvailability = async (req, res) => {
  const { id: userId } = req.user;
  const { slotId } = req.params;

  try {
    const slot = await prisma.disponibilidad.findUnique({ where: { id: slotId } });
    if (!slot || slot.profesional_id !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este horario.' });
    }

    // No permitir eliminar slots reservados
    if (slot.reservado_por) {
      return res.status(400).json({ error: 'No se puede eliminar un horario que tiene una reserva activa.' });
    }

    await prisma.disponibilidad.delete({
      where: { id: slotId }
    });

    res.status(200).json({ message: 'Horario eliminado exitosamente.' });
  } catch (error) {
    console.error('Error deleting availability:', error);
    res.status(500).json({ error: 'Error al eliminar disponibilidad.' });
  }
};
