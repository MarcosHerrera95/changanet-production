/**
 * Advanced Availability Controller - ChangaNet
 *
 * This controller implements the advanced availability and scheduling system
 * with recurrence patterns, conflict detection, timezone handling, and concurrency control.
 *
 * Key Features:
 * - Availability configuration management
 * - Slot generation and management
 * - Appointment booking with conflict detection
 * - Blocked time period management
 * - Calendar integration endpoints
 * - Timezone utilities
 */

const { PrismaClient } = require('@prisma/client');
const slotGenerationService = require('../services/slotGenerationService');
const conflictDetectionService = require('../services/conflictDetectionService');
const concurrencyService = require('../services/concurrencyService');
const timezoneService = require('../services/timezoneService');
const { sendNotification } = require('../services/notificationService');

const prisma = new PrismaClient();

/**
 * AVAILABILITY CONFIGURATION MANAGEMENT
 */

/**
 * Create availability configuration
 * POST /api/availability/configs
 */
exports.createAvailabilityConfig = async (req, res) => {
  const { id: userId } = req.user;
  const configData = req.body;

  try {
    // Validate user is a professional
    const user = await prisma.usuarios.findUnique({ where: { id: userId } });
    if (user.rol !== 'profesional') {
      return res.status(403).json({ error: 'Solo los profesionales pueden gestionar configuraciones de disponibilidad.' });
    }

    // Validate timezone
    const validatedTimezone = timezoneService.validateTimezone(configData.timezone);

    // Create configuration
    const config = await prisma.professionals_availability.create({
      data: {
        professional_id: userId,
        title: configData.title,
        description: configData.description,
        is_active: configData.is_active ?? true,
        recurrence_type: configData.recurrence_type || 'none',
        recurrence_config: configData.recurrence_config ? JSON.stringify(configData.recurrence_config) : null,
        start_date: new Date(configData.start_date),
        end_date: configData.end_date ? new Date(configData.end_date) : null,
        start_time: configData.start_time,
        end_time: configData.end_time,
        duration_minutes: configData.duration_minutes || 60,
        timezone: validatedTimezone,
        dst_handling: configData.dst_handling || 'auto',
        meta: configData.meta ? JSON.stringify(configData.meta) : null,
        created_by: userId
      }
    });

    res.status(201).json(config);
  } catch (error) {
    console.error('Error creating availability config:', error);
    res.status(500).json({ error: 'Error al crear configuración de disponibilidad.' });
  }
};

/**
 * List availability configurations
 * GET /api/availability/configs
 */
exports.getAvailabilityConfigs = async (req, res) => {
  const { id: userId } = req.user;
  const { activeOnly = true, page = 1, limit = 20 } = req.query;

  try {
    const skip = (page - 1) * limit;
    const where = {
      professional_id: userId,
      ...(activeOnly === 'true' && { is_active: true })
    };

    const [configs, total] = await Promise.all([
      prisma.professionals_availability.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.professionals_availability.count({ where })
    ]);

    res.json({
      configs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting availability configs:', error);
    res.status(500).json({ error: 'Error al obtener configuraciones de disponibilidad.' });
  }
};

/**
 * Get availability configuration by ID
 * GET /api/availability/configs/:configId
 */
exports.getAvailabilityConfig = async (req, res) => {
  const { id: userId } = req.user;
  const { configId } = req.params;

  try {
    const config = await prisma.professionals_availability.findFirst({
      where: {
        id: configId,
        professional_id: userId
      }
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuración de disponibilidad no encontrada.' });
    }

    res.json(config);
  } catch (error) {
    console.error('Error getting availability config:', error);
    res.status(500).json({ error: 'Error al obtener configuración de disponibilidad.' });
  }
};

/**
 * Update availability configuration
 * PUT /api/availability/configs/:configId
 */
exports.updateAvailabilityConfig = async (req, res) => {
  const { id: userId } = req.user;
  const { configId } = req.params;
  const updateData = req.body;

  try {
    // Check ownership
    const existingConfig = await prisma.professionals_availability.findFirst({
      where: {
        id: configId,
        professional_id: userId
      }
    });

    if (!existingConfig) {
      return res.status(404).json({ error: 'Configuración de disponibilidad no encontrada.' });
    }

    // Validate timezone if provided
    if (updateData.timezone) {
      updateData.timezone = timezoneService.validateTimezone(updateData.timezone);
    }

    // Prepare update data
    const data = {
      ...updateData,
      recurrence_config: updateData.recurrence_config ? JSON.stringify(updateData.recurrence_config) : undefined,
      start_date: updateData.start_date ? new Date(updateData.start_date) : undefined,
      end_date: updateData.end_date ? new Date(updateData.end_date) : undefined,
      meta: updateData.meta ? JSON.stringify(updateData.meta) : undefined,
      updated_at: new Date()
    };

    const config = await prisma.professionals_availability.update({
      where: { id: configId },
      data
    });

    res.json(config);
  } catch (error) {
    console.error('Error updating availability config:', error);
    res.status(500).json({ error: 'Error al actualizar configuración de disponibilidad.' });
  }
};

/**
 * Delete availability configuration
 * DELETE /api/availability/configs/:configId
 */
exports.deleteAvailabilityConfig = async (req, res) => {
  const { id: userId } = req.user;
  const { configId } = req.params;

  try {
    // Check ownership
    const config = await prisma.professionals_availability.findFirst({
      where: {
        id: configId,
        professional_id: userId
      }
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuración de disponibilidad no encontrada.' });
    }

    // Delete associated slots first
    await prisma.availability_slots.deleteMany({
      where: { availability_config_id: configId }
    });

    // Delete configuration
    await prisma.professionals_availability.delete({
      where: { id: configId }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting availability config:', error);
    res.status(500).json({ error: 'Error al eliminar configuración de disponibilidad.' });
  }
};

/**
 * Generate slots from configuration
 * POST /api/availability/configs/:configId/generate
 */
exports.generateSlotsFromConfig = async (req, res) => {
  const { id: userId } = req.user;
  const { configId } = req.params;
  const { startDate, endDate, forceRegenerate = false } = req.body;

  try {
    // Validate ownership
    const config = await prisma.professionals_availability.findFirst({
      where: {
        id: configId,
        professional_id: userId
      }
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuración de disponibilidad no encontrada.' });
    }

    // Generate slots
    const slots = await slotGenerationService.generateSlotsForConfig(
      configId,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      message: 'Slots generados exitosamente',
      generated: slots.length,
      configId
    });
  } catch (error) {
    console.error('Error generating slots:', error);
    res.status(500).json({ error: 'Error al generar slots de disponibilidad.' });
  }
};

/**
 * AVAILABILITY SLOTS MANAGEMENT
 */

/**
 * Query availability slots
 * GET /api/availability/slots
 */
exports.queryAvailabilitySlots = async (req, res) => {
  const { id: userId } = req.user;
  const {
    professionalId,
    date,
    startDate,
    endDate,
    status,
    includeBooked = false,
    timezone,
    page = 1,
    limit = 20
  } = req.query;

  try {
    // Build where clause
    const where = {};

    // If querying as client, only show available slots
    // If querying as professional, show all slots for their professional ID
    const user = await prisma.usuarios.findUnique({ where: { id: userId } });

    if (user.rol === 'cliente') {
      where.status = 'available';
      if (professionalId) {
        where.professional_id = professionalId;
      }
    } else {
      // Professional can see their own slots
      where.professional_id = userId;
    }

    // Date filtering
    if (date) {
      const queryDate = new Date(date);
      const nextDay = new Date(queryDate);
      nextDay.setDate(nextDay.getDate() + 1);
      where.start_time = {
        gte: queryDate,
        lt: nextDay
      };
    } else if (startDate && endDate) {
      where.start_time = {
        gte: new Date(startDate),
        lt: new Date(endDate)
      };
    }

    // Status filtering
    if (status) {
      where.status = status;
    }

    // Include booked slots if requested (professionals only)
    if (includeBooked === 'true' && user.rol === 'profesional') {
      delete where.status;
    }

    const skip = (page - 1) * limit;

    const [slots, total] = await Promise.all([
      prisma.availability_slots.findMany({
        where,
        include: {
          professional: {
            select: { id: true, nombre: true, especialidad: true }
          },
          booked_by_user: {
            select: { id: true, nombre: true }
          }
        },
        orderBy: { start_time: 'asc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.availability_slots.count({ where })
    ]);

    // Convert times to requested timezone if specified
    let processedSlots = slots;
    if (timezone) {
      processedSlots = slots.map(slot => ({
        ...slot,
        start_time: timezoneService.formatLocalTime(slot.start_time, timezone),
        end_time: timezoneService.formatLocalTime(slot.end_time, timezone),
        timezone
      }));
    }

    res.json({
      slots: processedSlots,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error querying availability slots:', error);
    res.status(500).json({ error: 'Error al consultar slots de disponibilidad.' });
  }
};

/**
 * Get slot details
 * GET /api/availability/slots/:slotId
 */
exports.getSlotDetails = async (req, res) => {
  const { id: userId } = req.user;
  const { slotId } = req.params;

  try {
    const slot = await prisma.availability_slots.findUnique({
      where: { id: slotId },
      include: {
        professional: {
          select: { id: true, nombre: true, especialidad: true }
        },
        booked_by_user: {
          select: { id: true, nombre: true }
        },
        availability_config: true,
        appointment: {
          include: {
            client: {
              select: { id: true, nombre: true }
            }
          }
        }
      }
    });

    if (!slot) {
      return res.status(404).json({ error: 'Slot de disponibilidad no encontrado.' });
    }

    // Check permissions
    const user = await prisma.usuarios.findUnique({ where: { id: userId } });
    if (user.rol === 'cliente' && slot.professional_id !== userId && slot.booked_by !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para ver este slot.' });
    }

    res.json(slot);
  } catch (error) {
    console.error('Error getting slot details:', error);
    res.status(500).json({ error: 'Error al obtener detalles del slot.' });
  }
};

/**
 * Update slot
 * PUT /api/availability/slots/:slotId
 */
exports.updateSlot = async (req, res) => {
  const { id: userId } = req.user;
  const { slotId } = req.params;
  const { status, meta } = req.body;

  try {
    // Check ownership
    const slot = await prisma.availability_slots.findUnique({
      where: { id: slotId }
    });

    if (!slot) {
      return res.status(404).json({ error: 'Slot de disponibilidad no encontrado.' });
    }

    if (slot.professional_id !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este slot.' });
    }

    // Prepare update data
    const updateData = {
      updated_at: new Date()
    };

    if (status) {
      updateData.status = status;
    }

    if (meta !== undefined) {
      updateData.meta = meta ? JSON.stringify(meta) : null;
    }

    const updatedSlot = await prisma.availability_slots.update({
      where: { id: slotId },
      data: updateData
    });

    res.json(updatedSlot);
  } catch (error) {
    console.error('Error updating slot:', error);
    res.status(500).json({ error: 'Error al actualizar slot.' });
  }
};

/**
 * Book availability slot
 * POST /api/availability/slots/:slotId/book
 */
exports.bookSlot = async (req, res) => {
  const { id: userId } = req.user;
  const { slotId } = req.params;
  const { title, description, appointmentType, price, currency, notes, meta } = req.body;

  try {
    // Validate user is client
    const user = await prisma.usuarios.findUnique({ where: { id: userId } });
    if (user.rol !== 'cliente') {
      return res.status(403).json({ error: 'Solo los clientes pueden reservar slots.' });
    }

    // Use concurrency service to prevent race conditions
    const bookingResult = await concurrencyService.bookSlotWithLock(slotId, userId, {
      title: title || 'Service Appointment',
      description,
      appointmentType: appointmentType || 'service',
      price,
      currency: currency || 'ARS',
      notes,
      meta
    });

    // Send notifications
    const slot = bookingResult.slot;
    const appointment = bookingResult.appointment;

    // Notification to client
    await sendNotification(
      userId,
      'appointment_booked',
      `Tu cita ha sido agendada exitosamente para el ${timezoneService.formatLocalTime(slot.start_time, slot.timezone, 'yyyy-MM-dd HH:mm')}`,
      { appointment_id: appointment.id, slot_id: slotId }
    );

    // Notification to professional
    await sendNotification(
      slot.professional_id,
      'new_appointment',
      `Nueva cita agendada con ${user.nombre} para el ${timezoneService.formatLocalTime(slot.start_time, slot.timezone, 'yyyy-MM-dd HH:mm')}`,
      { appointment_id: appointment.id, slot_id: slotId }
    );

    // Send confirmation emails (via SendGrid)
    try {
      const { sendEmail } = require('../services/emailService');
      const clientEmailSubject = 'Confirmación de cita - Changánet';
      const clientEmailBody = `
        Hola ${user.nombre},

        Tu cita ha sido confirmada exitosamente.

        Detalles de la cita:
        - Profesional: ${slot.professional.nombre}
        - Fecha y hora: ${timezoneService.formatLocalTime(slot.start_time, slot.timezone, 'yyyy-MM-dd HH:mm')}
        - Duración: ${slot.end_time - slot.start_time} minutos

        Si necesitas modificar o cancelar la cita, puedes hacerlo desde tu panel de usuario.

        ¡Gracias por usar Changánet!

        Equipo Changánet
      `;

      await sendEmail(user.email, clientEmailSubject, clientEmailBody);

      // Email to professional
      const professional = await prisma.usuarios.findUnique({ where: { id: slot.professional_id } });
      const professionalEmailSubject = 'Nueva cita confirmada - Changánet';
      const professionalEmailBody = `
        Hola ${professional.nombre},

        Tienes una nueva cita confirmada.

        Detalles de la cita:
        - Cliente: ${user.nombre}
        - Fecha y hora: ${timezoneService.formatLocalTime(slot.start_time, slot.timezone, 'yyyy-MM-dd HH:mm')}
        - Duración: ${slot.end_time - slot.start_time} minutos

        Recuerda confirmar la asistencia del cliente al inicio del servicio.

        Panel profesional: [Enlace al panel]

        Equipo Changánet
      `;

      await sendEmail(professional.email, professionalEmailSubject, professionalEmailBody);
    } catch (emailError) {
      console.warn('Error enviando emails de confirmación:', emailError);
    }

    res.status(201).json(bookingResult);
  } catch (error) {
    console.error('Error booking slot:', error);

    if (error.message.includes('no longer available')) {
      return res.status(409).json({ error: 'El slot ya no está disponible.' });
    }

    res.status(500).json({ error: 'Error al reservar el slot.' });
  }
};

/**
 * APPOINTMENT MANAGEMENT
 */

/**
 * Create appointment
 * POST /api/appointments
 */
exports.createAppointment = async (req, res) => {
  const { id: userId } = req.user;
  const appointmentData = req.body;

  try {
    // Check for conflicts first
    const conflictResult = await conflictDetectionService.validateEntity(
      appointmentData,
      'appointment',
      { userId }
    );

    if (!conflictResult.valid) {
      return res.status(409).json({
        error: 'Conflicto detectado en la cita',
        conflicts: conflictResult.conflicts
      });
    }

    // Create appointment
    const appointment = await prisma.appointments.create({
      data: {
        professional_id: appointmentData.professional_id,
        client_id: userId,
        slot_id: appointmentData.slot_id,
        availability_config_id: appointmentData.availability_config_id,
        service_id: appointmentData.service_id,
        title: appointmentData.title,
        description: appointmentData.description,
        appointment_type: appointmentData.appointment_type || 'service',
        status: appointmentData.status || 'scheduled',
        priority: appointmentData.priority || 'normal',
        scheduled_start: new Date(appointmentData.scheduled_start),
        scheduled_end: new Date(appointmentData.scheduled_end),
        timezone: appointmentData.timezone || 'America/Buenos_Aires',
        notes: appointmentData.notes,
        client_notes: appointmentData.client_notes,
        price: appointmentData.price,
        currency: appointmentData.currency || 'ARS',
        meta: appointmentData.meta ? JSON.stringify(appointmentData.meta) : null,
        created_by: userId
      }
    });

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Error al crear la cita.' });
  }
};

/**
 * List appointments
 * GET /api/appointments
 */
exports.getAppointments = async (req, res) => {
  const { id: userId } = req.user;
  const {
    professionalId,
    clientId,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 20
  } = req.query;

  try {
    // Build where clause based on user role
    const user = await prisma.usuarios.findUnique({ where: { id: userId } });
    const where = {};

    if (user.rol === 'cliente') {
      where.client_id = userId;
    } else if (user.rol === 'profesional') {
      where.professional_id = userId;
    }

    // Additional filters
    if (professionalId && user.rol === 'cliente') {
      where.professional_id = professionalId;
    }
    if (clientId && user.rol === 'profesional') {
      where.client_id = clientId;
    }
    if (status) {
      where.status = status;
    }
    if (startDate && endDate) {
      where.scheduled_start = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const skip = (page - 1) * limit;

    const [appointments, total] = await Promise.all([
      prisma.appointments.findMany({
        where,
        include: {
          professional: {
            select: { id: true, nombre: true, especialidad: true }
          },
          client: {
            select: { id: true, nombre: true }
          },
          slot: true,
          service: true
        },
        orderBy: { scheduled_start: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.appointments.count({ where })
    ]);

    res.json({
      appointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting appointments:', error);
    res.status(500).json({ error: 'Error al obtener citas.' });
  }
};

/**
 * Get appointment details
 * GET /api/appointments/:appointmentId
 */
exports.getAppointment = async (req, res) => {
  const { id: userId } = req.user;
  const { appointmentId } = req.params;

  try {
    const appointment = await prisma.appointments.findUnique({
      where: { id: appointmentId },
      include: {
        professional: {
          select: { id: true, nombre: true, especialidad: true }
        },
        client: {
          select: { id: true, nombre: true }
        },
        slot: true,
        service: true,
        availability_config: true
      }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada.' });
    }

    // Check permissions
    if (appointment.client_id !== userId && appointment.professional_id !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para ver esta cita.' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error getting appointment:', error);
    res.status(500).json({ error: 'Error al obtener cita.' });
  }
};

/**
 * Update appointment
 * PUT /api/appointments/:appointmentId
 */
exports.updateAppointment = async (req, res) => {
  const { id: userId } = req.user;
  const { appointmentId } = req.params;
  const updateData = req.body;

  try {
    // Check ownership
    const appointment = await prisma.appointments.findUnique({
      where: { id: appointmentId }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada.' });
    }

    if (appointment.client_id !== userId && appointment.professional_id !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta cita.' });
    }

    // Check for conflicts if time is being changed
    if (updateData.scheduled_start || updateData.scheduled_end) {
      const conflictCheck = {
        ...appointment,
        ...updateData,
        scheduled_start: updateData.scheduled_start ? new Date(updateData.scheduled_start) : appointment.scheduled_start,
        scheduled_end: updateData.scheduled_end ? new Date(updateData.scheduled_end) : appointment.scheduled_end
      };

      const conflictResult = await conflictDetectionService.validateEntity(
        conflictCheck,
        'appointment',
        { userId }
      );

      if (!conflictResult.valid) {
        return res.status(409).json({
          error: 'Conflicto detectado en la actualización',
          conflicts: conflictResult.conflicts
        });
      }
    }

    // Prepare update data
    const data = {
      ...updateData,
      scheduled_start: updateData.scheduled_start ? new Date(updateData.scheduled_start) : undefined,
      scheduled_end: updateData.scheduled_end ? new Date(updateData.scheduled_end) : undefined,
      actual_start: updateData.actual_start ? new Date(updateData.actual_start) : undefined,
      actual_end: updateData.actual_end ? new Date(updateData.actual_end) : undefined,
      cancelled_at: updateData.cancelled_at ? new Date(updateData.cancelled_at) : undefined,
      reminder_time: updateData.reminder_time ? new Date(updateData.reminder_time) : undefined,
      meta: updateData.meta ? JSON.stringify(updateData.meta) : undefined,
      updated_at: new Date()
    };

    const updatedAppointment = await prisma.appointments.update({
      where: { id: appointmentId },
      data
    });

    res.json(updatedAppointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Error al actualizar cita.' });
  }
};

/**
 * Cancel appointment
 * DELETE /api/appointments/:appointmentId
 */
exports.cancelAppointment = async (req, res) => {
  const { id: userId } = req.user;
  const { appointmentId } = req.params;
  const { reason } = req.body;

  try {
    // Check ownership
    const appointment = await prisma.appointments.findUnique({
      where: { id: appointmentId },
      include: { slot: true }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada.' });
    }

    if (appointment.client_id !== userId && appointment.professional_id !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para cancelar esta cita.' });
    }

    // Update appointment
    const updatedAppointment = await prisma.appointments.update({
      where: { id: appointmentId },
      data: {
        status: 'cancelled',
        cancelled_at: new Date(),
        cancelled_by: userId,
        cancel_reason: reason,
        updated_at: new Date()
      }
    });

    // Free up the slot if it exists
    if (appointment.slot_id) {
      await prisma.availability_slots.update({
        where: { id: appointment.slot_id },
        data: {
          status: 'available',
          booked_by: null,
          booked_at: null,
          updated_at: new Date()
        }
      });
    }

    // Send notifications
    const otherPartyId = appointment.client_id === userId ? appointment.professional_id : appointment.client_id;
    await sendNotification(
      otherPartyId,
      'appointment_cancelled',
      `La cita programada ha sido cancelada.`,
      { appointment_id: appointmentId, cancelled_by: userId, reason }
    );

    res.json(updatedAppointment);
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ error: 'Error al cancelar cita.' });
  }
};

/**
 * CONFLICT DETECTION
 */

/**
 * Check for conflicts
 * POST /api/conflicts/check
 */
exports.checkConflicts = async (req, res) => {
  const { id: userId } = req.user;
  const { entity, entityType, options = {} } = req.body;

  try {
    const result = await conflictDetectionService.validateEntity(
      entity,
      entityType,
      { ...options, userId }
    );

    res.json(result);
  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({ error: 'Error al verificar conflictos.' });
  }
};

/**
 * TIMEZONE UTILITIES
 */

/**
 * Convert timezone
 * POST /api/timezone/convert
 */
exports.convertTimezone = async (req, res) => {
  const { dateTime, fromTimezone, toTimezone } = req.body;

  try {
    const converted = timezoneService.convertTimezone(dateTime, fromTimezone, toTimezone);
    const result = timezoneService.formatForAPI(converted);

    res.json(result);
  } catch (error) {
    console.error('Error converting timezone:', error);
    res.status(400).json({ error: 'Error al convertir zona horaria.' });
  }
};

/**
 * List available timezones
 * GET /api/timezone/list
 */
exports.listTimezones = async (req, res) => {
  try {
    const timezones = timezoneService.getAvailableTimezones().map(tz => {
      const info = timezoneService.getTimezoneInfo(tz);
      return {
        identifier: tz,
        name: info.name,
        abbreviation: info.abbreviation,
        offset: info.offset,
        offsetString: info.offsetString
      };
    });

    res.json({ timezones });
  } catch (error) {
    console.error('Error listing timezones:', error);
    res.status(500).json({ error: 'Error al obtener lista de zonas horarias.' });
  }
};

/**
 * AVAILABILITY STATISTICS
 */

/**
 * Get availability statistics
 * GET /api/availability/stats
 */
exports.getAvailabilityStats = async (req, res) => {
  const { id: userId } = req.user;
  const { professionalId, startDate, endDate } = req.query;

  try {
    // Use professional ID or current user if professional
    const targetProfessionalId = professionalId || userId;

    // Validate user can access these stats
    const user = await prisma.usuarios.findUnique({ where: { id: userId } });
    if (user.rol === 'cliente' && targetProfessionalId !== userId) {
      // Clients can only see their own stats (as clients)
      return res.status(403).json({ error: 'No tienes permiso para ver estas estadísticas.' });
    }

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.start_time = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [totalSlots, bookedSlots, blockedSlots, appointments] = await Promise.all([
      prisma.availability_slots.count({
        where: { professional_id: targetProfessionalId, ...dateFilter }
      }),
      prisma.availability_slots.count({
        where: {
          professional_id: targetProfessionalId,
          status: 'booked',
          ...dateFilter
        }
      }),
      prisma.blocked_slots.count({
        where: {
          professional_id: targetProfessionalId,
          is_active: true,
          ...dateFilter
        }
      }),
      prisma.appointments.count({
        where: {
          professional_id: targetProfessionalId,
          status: { in: ['scheduled', 'confirmed', 'completed'] },
          ...(startDate && endDate && {
            scheduled_start: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          })
        }
      })
    ]);

    const availableSlots = totalSlots - bookedSlots;
    const utilizationRate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

    res.json({
      totalSlots,
      bookedSlots,
      availableSlots,
      blockedSlots,
      appointments,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      }
    });
  } catch (error) {
    console.error('Error getting availability stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de disponibilidad.' });
  }
};
