/**
 * Conflict Detection Service - Advanced Availability System
 *
 * This service handles detection and resolution of various types of conflicts
 * in the availability and appointment system, including:
 * - Slot overlaps
 * - Double bookings
 * - Blocked time conflicts
 * - Business rule violations
 * - Resource constraints
 */

const { PrismaClient } = require('@prisma/client');
const { DateTime } = require('luxon');
const prisma = new PrismaClient();

/**
 * Conflict types enumeration
 */
const CONFLICT_TYPES = {
  SLOT_OVERLAP: 'slot_overlap',
  DOUBLE_BOOKING: 'double_booking',
  BLOCKED_TIME: 'blocked_time',
  BUSINESS_RULE_VIOLATION: 'business_rule_violation',
  RESOURCE_CONSTRAINT: 'resource_constraint',
  TIMEZONE_CONFLICT: 'timezone_conflict'
};

/**
 * Conflict severity levels
 */
const CONFLICT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

class ConflictDetectionService {
  constructor() {
    this.conflictCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Main conflict detection method
   * @param {Object} entity - The entity to check for conflicts (slot, appointment, etc.)
   * @param {string} entityType - Type of entity ('slot', 'appointment', 'block')
   * @param {Object} options - Additional options for conflict detection
   * @returns {Promise<Array>} Array of detected conflicts
   */
  async detectConflicts(entity, entityType, options = {}) {
    const conflicts = [];

    try {
      switch (entityType) {
        case 'slot':
          conflicts.push(...await this.detectSlotConflicts(entity, options));
          break;
        case 'appointment':
          conflicts.push(...await this.detectAppointmentConflicts(entity, options));
          break;
        case 'block':
          conflicts.push(...await this.detectBlockConflicts(entity, options));
          break;
        default:
          throw new Error(`Unknown entity type: ${entityType}`);
      }

      // Apply conflict resolution strategies
      return await this.resolveConflicts(conflicts, options);

    } catch (error) {
      console.error('Error detecting conflicts:', error);
      throw error;
    }
  }

  /**
   * Detect conflicts for availability slots
   */
  async detectSlotConflicts(slot, options = {}) {
    const conflicts = [];
    const professionalId = slot.professional_id;
    const startTime = DateTime.fromJSDate(slot.start_time);
    const endTime = DateTime.fromJSDate(slot.end_time);

    // 1. Check for overlapping slots from same professional
    const overlappingSlots = await prisma.availability_slots.findMany({
      where: {
        professional_id: professionalId,
        id: { not: slot.id }, // Exclude current slot if updating
        OR: [
          {
            AND: [
              { start_time: { lte: startTime.toJSDate() } },
              { end_time: { gt: startTime.toJSDate() } }
            ]
          },
          {
            AND: [
              { start_time: { lt: endTime.toJSDate() } },
              { end_time: { gte: endTime.toJSDate() } }
            ]
          }
        ]
      }
    });

    if (overlappingSlots.length > 0) {
      conflicts.push({
        type: CONFLICT_TYPES.SLOT_OVERLAP,
        severity: CONFLICT_SEVERITY.HIGH,
        message: `Slot overlaps with ${overlappingSlots.length} existing slot(s)`,
        details: {
          overlappingSlots: overlappingSlots.map(s => ({ id: s.id, start: s.start_time, end: s.end_time })),
          resolution: 'Consider adjusting the time or removing overlapping slots'
        }
      });
    }

    // 2. Check for blocked time conflicts
    const blockedTimes = await prisma.blocked_slots.findMany({
      where: {
        professional_id: professionalId,
        is_active: true,
        OR: [
          {
            AND: [
              { start_time: { lte: startTime.toJSDate() } },
              { end_time: { gt: startTime.toJSDate() } }
            ]
          },
          {
            AND: [
              { start_time: { lt: endTime.toJSDate() } },
              { end_time: { gte: endTime.toJSDate() } }
            ]
          }
        ]
      }
    });

    if (blockedTimes.length > 0) {
      conflicts.push({
        type: CONFLICT_TYPES.BLOCKED_TIME,
        severity: CONFLICT_SEVERITY.CRITICAL,
        message: `Slot conflicts with ${blockedTimes.length} blocked time period(s)`,
        details: {
          blockedTimes: blockedTimes.map(b => ({
            id: b.id,
            reason: b.reason,
            start: b.start_time,
            end: b.end_time
          })),
          resolution: 'Remove or modify the blocked time periods first'
        }
      });
    }

    // 3. Check business rule violations
    const businessRuleConflicts = await this.checkBusinessRuleViolations(slot, 'slot', options);
    conflicts.push(...businessRuleConflicts);

    return conflicts;
  }

  /**
   * Detect conflicts for appointments
   */
  async detectAppointmentConflicts(appointment, options = {}) {
    const conflicts = [];
    const professionalId = appointment.professional_id;
    const clientId = appointment.client_id;
    const startTime = DateTime.fromJSDate(appointment.scheduled_start);
    const endTime = DateTime.fromJSDate(appointment.scheduled_end);

    // 1. Check for double booking (professional conflict)
    const professionalConflicts = await prisma.appointments.findMany({
      where: {
        professional_id: professionalId,
        id: { not: appointment.id }, // Exclude current appointment if updating
        status: { in: ['scheduled', 'confirmed', 'in_progress'] },
        OR: [
          {
            AND: [
              { scheduled_start: { lte: startTime.toJSDate() } },
              { scheduled_end: { gt: startTime.toJSDate() } }
            ]
          },
          {
            AND: [
              { scheduled_start: { lt: endTime.toJSDate() } },
              { scheduled_end: { gte: endTime.toJSDate() } }
            ]
          }
        ]
      }
    });

    if (professionalConflicts.length > 0) {
      conflicts.push({
        type: CONFLICT_TYPES.DOUBLE_BOOKING,
        severity: CONFLICT_SEVERITY.CRITICAL,
        message: `Professional has ${professionalConflicts.length} conflicting appointment(s)`,
        details: {
          conflictingAppointments: professionalConflicts.map(a => ({
            id: a.id,
            title: a.title,
            start: a.scheduled_start,
            end: a.scheduled_end,
            client: a.client.nombre
          })),
          resolution: 'Reschedule one of the conflicting appointments'
        }
      });
    }

    // 2. Check for client conflicts (if client can't have multiple appointments)
    if (options.checkClientConflicts !== false) {
      const clientConflicts = await prisma.appointments.findMany({
        where: {
          client_id: clientId,
          id: { not: appointment.id },
          status: { in: ['scheduled', 'confirmed', 'in_progress'] },
          OR: [
            {
              AND: [
                { scheduled_start: { lte: startTime.toJSDate() } },
                { scheduled_end: { gt: startTime.toJSDate() } }
              ]
            },
            {
              AND: [
                { scheduled_start: { lt: endTime.toJSDate() } },
                { scheduled_end: { gte: endTime.toJSDate() } }
              ]
            }
          ]
        }
      });

      if (clientConflicts.length > 0) {
        conflicts.push({
          type: CONFLICT_TYPES.DOUBLE_BOOKING,
          severity: CONFLICT_SEVERITY.MEDIUM,
          message: `Client has ${clientConflicts.length} overlapping appointment(s)`,
          details: {
            conflictingAppointments: clientConflicts.map(a => ({
              id: a.id,
              title: a.title,
              start: a.scheduled_start,
              end: a.scheduled_end,
              professional: a.professional.nombre
            })),
            resolution: 'Client may need to choose between appointments'
          }
        });
      }
    }

    // 3. Check if slot is still available
    if (appointment.slot_id) {
      const slot = await prisma.availability_slots.findUnique({
        where: { id: appointment.slot_id }
      });

      if (!slot || slot.status !== 'available') {
        conflicts.push({
          type: CONFLICT_TYPES.RESOURCE_CONSTRAINT,
          severity: CONFLICT_SEVERITY.CRITICAL,
          message: 'Selected time slot is no longer available',
          details: {
            slotId: appointment.slot_id,
            slotStatus: slot?.status || 'not_found',
            resolution: 'Choose a different time slot'
          }
        });
      }
    }

    // 4. Check business rule violations
    const businessRuleConflicts = await this.checkBusinessRuleViolations(appointment, 'appointment', options);
    conflicts.push(...businessRuleConflicts);

    return conflicts;
  }

  /**
   * Detect conflicts for blocked time periods
   */
  async detectBlockConflicts(block, options = {}) {
    const conflicts = [];
    const professionalId = block.professional_id;
    const startTime = DateTime.fromJSDate(block.start_time);
    const endTime = DateTime.fromJSDate(block.end_time);

    // 1. Check for existing appointments in blocked period
    const affectedAppointments = await prisma.appointments.findMany({
      where: {
        professional_id: professionalId,
        status: { in: ['scheduled', 'confirmed', 'in_progress'] },
        OR: [
          {
            AND: [
              { scheduled_start: { lte: startTime.toJSDate() } },
              { scheduled_end: { gt: startTime.toJSDate() } }
            ]
          },
          {
            AND: [
              { scheduled_start: { lt: endTime.toJSDate() } },
              { scheduled_end: { gte: endTime.toJSDate() } }
            ]
          }
        ]
      }
    });

    if (affectedAppointments.length > 0) {
      conflicts.push({
        type: CONFLICT_TYPES.DOUBLE_BOOKING,
        severity: options.allowOverride ? CONFLICT_SEVERITY.MEDIUM : CONFLICT_SEVERITY.CRITICAL,
        message: `Block conflicts with ${affectedAppointments.length} existing appointment(s)`,
        details: {
          affectedAppointments: affectedAppointments.map(a => ({
            id: a.id,
            title: a.title,
            start: a.scheduled_start,
            end: a.scheduled_end,
            client: a.client.nombre
          })),
          resolution: options.allowOverride
            ? 'Blocking will cancel affected appointments'
            : 'Cancel or reschedule appointments before blocking time'
        }
      });
    }

    // 2. Check for available slots in blocked period
    const affectedSlots = await prisma.availability_slots.findMany({
      where: {
        professional_id: professionalId,
        status: 'available',
        OR: [
          {
            AND: [
              { start_time: { lte: startTime.toJSDate() } },
              { end_time: { gt: startTime.toJSDate() } }
            ]
          },
          {
            AND: [
              { start_time: { lt: endTime.toJSDate() } },
              { end_time: { gte: endTime.toJSDate() } }
            ]
          }
        ]
      }
    });

    if (affectedSlots.length > 0) {
      conflicts.push({
        type: CONFLICT_TYPES.RESOURCE_CONSTRAINT,
        severity: CONFLICT_SEVERITY.MEDIUM,
        message: `Block will remove ${affectedSlots.length} available time slot(s)`,
        details: {
          affectedSlots: affectedSlots.map(s => ({
            id: s.id,
            start: s.start_time,
            end: s.end_time
          })),
          resolution: 'Available slots will be automatically removed'
        }
      });
    }

    return conflicts;
  }

  /**
   * Check business rule violations
   */
  async checkBusinessRuleViolations(entity, entityType, options = {}) {
    const conflicts = [];

    // Common business rules
    const now = DateTime.now();
    let entityStart, entityEnd;

    if (entityType === 'appointment') {
      entityStart = DateTime.fromJSDate(entity.scheduled_start);
      entityEnd = DateTime.fromJSDate(entity.scheduled_end);
    } else if (entityType === 'slot') {
      entityStart = DateTime.fromJSDate(entity.start_time);
      entityEnd = DateTime.fromJSDate(entity.end_time);
    }

    if (entityStart && entityEnd) {
      // 1. Check minimum advance booking time
      const hoursUntilStart = entityStart.diff(now, 'hours').hours;
      if (hoursUntilStart < 24) { // Less than 24 hours
        conflicts.push({
          type: CONFLICT_TYPES.BUSINESS_RULE_VIOLATION,
          severity: CONFLICT_SEVERITY.MEDIUM,
          message: 'Appointment/slot is too soon (less than 24 hours advance notice)',
          details: {
            hoursUntilStart: Math.round(hoursUntilStart),
            resolution: 'Schedule further in advance'
          }
        });
      }

      // 2. Check maximum advance booking time
      const daysUntilStart = entityStart.diff(now, 'days').days;
      if (daysUntilStart > 90) { // More than 90 days
        conflicts.push({
          type: CONFLICT_TYPES.BUSINESS_RULE_VIOLATION,
          severity: CONFLICT_SEVERITY.LOW,
          message: 'Appointment/slot is too far in advance (more than 90 days)',
          details: {
            daysUntilStart: Math.round(daysUntilStart),
            resolution: 'Consider scheduling closer to the desired date'
          }
        });
      }

      // 3. Check business hours (assuming 8 AM - 8 PM)
      const startHour = entityStart.hour;
      const endHour = entityEnd.hour;
      if (startHour < 8 || endHour > 20) {
        conflicts.push({
          type: CONFLICT_TYPES.BUSINESS_RULE_VIOLATION,
          severity: CONFLICT_SEVERITY.MEDIUM,
          message: 'Appointment/slot is outside typical business hours (8 AM - 8 PM)',
          details: {
            startHour,
            endHour,
            resolution: 'Consider scheduling during business hours'
          }
        });
      }

      // 4. Check duration limits
      const durationHours = entityEnd.diff(entityStart, 'hours').hours;
      if (durationHours > 8) {
        conflicts.push({
          type: CONFLICT_TYPES.BUSINESS_RULE_VIOLATION,
          severity: CONFLICT_SEVERITY.HIGH,
          message: 'Appointment/slot duration exceeds 8 hours',
          details: {
            durationHours: Math.round(durationHours * 10) / 10,
            resolution: 'Break into smaller sessions or reduce duration'
          }
        });
      }
    }

    // Entity-specific rules
    if (entityType === 'appointment') {
      // Check appointment-specific rules
      if (entity.price && entity.price < 0) {
        conflicts.push({
          type: CONFLICT_TYPES.BUSINESS_RULE_VIOLATION,
          severity: CONFLICT_SEVERITY.HIGH,
          message: 'Appointment price cannot be negative',
          details: {
            price: entity.price,
            resolution: 'Set a valid positive price'
          }
        });
      }
    }

    return conflicts;
  }

  /**
   * Resolve conflicts based on resolution strategies
   */
  async resolveConflicts(conflicts, options = {}) {
    if (conflicts.length === 0) return conflicts;

    const resolvedConflicts = [];

    for (const conflict of conflicts) {
      // Apply resolution strategy based on conflict type and options
      const resolution = await this.applyResolutionStrategy(conflict, options);

      if (resolution.action !== 'ignore') {
        resolvedConflicts.push({
          ...conflict,
          resolution
        });
      }
    }

    return resolvedConflicts;
  }

  /**
   * Apply resolution strategy for a specific conflict
   */
  async applyResolutionStrategy(conflict, options) {
    const strategy = options.resolutionStrategy || 'strict';

    switch (strategy) {
      case 'strict':
        return {
          action: 'block',
          message: 'Conflict must be resolved before proceeding'
        };

      case 'warn':
        return {
          action: conflict.severity === CONFLICT_SEVERITY.CRITICAL ? 'block' : 'warn',
          message: conflict.severity === CONFLICT_SEVERITY.CRITICAL
            ? 'Critical conflict must be resolved'
            : 'Conflict detected, but proceeding with warning'
        };

      case 'auto_resolve':
        return await this.autoResolveConflict(conflict, options);

      default:
        return {
          action: 'block',
          message: 'Unknown resolution strategy'
        };
    }
  }

  /**
   * Attempt to automatically resolve conflicts
   */
  async autoResolveConflict(conflict, options) {
    switch (conflict.type) {
      case CONFLICT_TYPES.SLOT_OVERLAP:
        // Could automatically adjust slot times or remove overlapping slots
        return {
          action: 'auto_adjust',
          message: 'Automatically adjusted overlapping slots',
          adjustments: conflict.details.overlappingSlots
        };

      case CONFLICT_TYPES.BLOCKED_TIME:
        // Could automatically remove conflicting slots
        return {
          action: 'auto_remove',
          message: 'Automatically removed conflicting slots',
          removedItems: conflict.details.blockedTimes
        };

      default:
        return {
          action: 'block',
          message: 'Cannot automatically resolve this conflict type'
        };
    }
  }

  /**
   * Check if an entity can be created/modified without conflicts
   * @param {Object} entity - Entity to validate
   * @param {string} entityType - Type of entity
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result with conflicts and canProceed flag
   */
  async validateEntity(entity, entityType, options = {}) {
    const conflicts = await this.detectConflicts(entity, entityType, options);

    const criticalConflicts = conflicts.filter(c => c.severity === CONFLICT_SEVERITY.CRITICAL);
    const canProceed = criticalConflicts.length === 0 || options.allowCriticalConflicts;

    return {
      valid: canProceed,
      conflicts,
      criticalConflicts,
      canProceed,
      summary: {
        totalConflicts: conflicts.length,
        criticalCount: criticalConflicts.length,
        warningsCount: conflicts.filter(c => c.severity === CONFLICT_SEVERITY.MEDIUM).length,
        infoCount: conflicts.filter(c => c.severity === CONFLICT_SEVERITY.LOW).length
      }
    };
  }

  /**
   * Get conflict statistics for a professional
   */
  async getConflictStatistics(professionalId, dateRange = {}) {
    const startDate = dateRange.start || DateTime.now().minus({ days: 30 }).toJSDate();
    const endDate = dateRange.end || DateTime.now().plus({ days: 30 }).toJSDate();

    // Count various conflict types
    const [slotConflicts, appointmentConflicts, blockConflicts] = await Promise.all([
      // Slot conflicts (overlaps)
      prisma.availability_slots.findMany({
        where: {
          professional_id: professionalId,
          created_at: { gte: startDate, lte: endDate }
        }
      }),

      // Appointment conflicts
      prisma.appointments.findMany({
        where: {
          professional_id: professionalId,
          created_at: { gte: startDate, lte: endDate },
          status: { in: ['scheduled', 'confirmed'] }
        }
      }),

      // Block conflicts
      prisma.blocked_slots.findMany({
        where: {
          professional_id: professionalId,
          created_at: { gte: startDate, lte: endDate }
        }
      })
    ]);

    return {
      period: { startDate, endDate },
      statistics: {
        totalSlots: slotConflicts.length,
        totalAppointments: appointmentConflicts.length,
        totalBlocks: blockConflicts.length,
        // Add more detailed statistics as needed
      }
    };
  }

  /**
   * Clear conflict cache
   */
  clearCache() {
    this.conflictCache.clear();
  }
}

module.exports = new ConflictDetectionService();
