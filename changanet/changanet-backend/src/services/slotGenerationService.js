/**
 * Slot Generation Service - Advanced Availability System
 *
 * This service handles the generation of availability slots based on recurrence patterns,
 * taking into account timezones, DST transitions, business rules, and conflict resolution.
 *
 * Key Features:
 * - Recurrence pattern processing (daily, weekly, monthly, custom)
 * - Timezone and DST handling
 * - Business rule validation
 * - Conflict detection and resolution
 * - Bulk slot generation with optimization
 * - Exception handling for holidays/special dates
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Timezone and DST utilities
const { DateTime } = require('luxon');

/**
 * Main slot generation service class
 */
class SlotGenerationService {
  constructor() {
    this.timezoneCache = new Map();
    this.businessRules = {
      maxSlotsPerDay: 8,
      minSlotDuration: 30, // minutes
      maxSlotDuration: 480, // minutes (8 hours)
      bufferTime: 15, // minutes between slots
      maxAdvanceBooking: 90, // days
      minAdvanceBooking: 1, // day
    };
  }

  /**
   * Generate slots for a professional availability configuration
   * @param {string} availabilityConfigId - ID of the professionals_availability record
   * @param {Date} startDate - Start date for generation
   * @param {Date} endDate - End date for generation
   * @returns {Promise<Array>} Generated slots
   */
  async generateSlotsForConfig(availabilityConfigId, startDate, endDate) {
    try {
      // Get the availability configuration
      const config = await prisma.professionals_availability.findUnique({
        where: { id: availabilityConfigId }
      });

      if (!config || !config.is_active) {
        throw new Error('Invalid or inactive availability configuration');
      }

      // Validate date range
      this.validateDateRange(startDate, endDate);

      // Generate slots based on recurrence type
      const slots = await this.generateSlotsByRecurrence(config, startDate, endDate);

      // Apply business rules and filters
      const filteredSlots = await this.applyBusinessRules(slots, config);

      // Remove existing slots in the date range to avoid duplicates
      await this.cleanupExistingSlots(config.professional_id, startDate, endDate);

      // Bulk insert new slots
      const createdSlots = await this.bulkInsertSlots(filteredSlots);

      return createdSlots;
    } catch (error) {
      console.error('Error generating slots for config:', error);
      throw error;
    }
  }

  /**
   * Generate slots based on recurrence pattern
   */
  async generateSlotsByRecurrence(config, startDate, endDate) {
    const slots = [];

    switch (config.recurrence_type) {
      case 'none':
        // Single occurrence
        slots.push(...this.generateSingleSlots(config, startDate));
        break;

      case 'daily':
        slots.push(...this.generateDailySlots(config, startDate, endDate));
        break;

      case 'weekly':
        slots.push(...this.generateWeeklySlots(config, startDate, endDate));
        break;

      case 'monthly':
        slots.push(...this.generateMonthlySlots(config, startDate, endDate));
        break;

      case 'custom':
        slots.push(...this.generateCustomSlots(config, startDate, endDate));
        break;

      default:
        throw new Error(`Unsupported recurrence type: ${config.recurrence_type}`);
    }

    return slots;
  }

  /**
   * Generate slots for single occurrence
   */
  generateSingleSlots(config, targetDate) {
    const slots = [];
    const configStart = DateTime.fromJSDate(config.start_date, { zone: config.timezone });
    const targetStart = DateTime.fromJSDate(targetDate, { zone: config.timezone });

    // Only generate if target date matches config date
    if (configStart.hasSame(targetStart, 'day')) {
      const slotStart = targetStart.set({
        hour: parseInt(config.start_time.split(':')[0]),
        minute: parseInt(config.start_time.split(':')[1])
      });

      const slotEnd = targetStart.set({
        hour: parseInt(config.end_time.split(':')[0]),
        minute: parseInt(config.end_time.split(':')[1])
      });

      slots.push(this.createSlotObject(config, slotStart, slotEnd));
    }

    return slots;
  }

  /**
   * Generate daily recurring slots
   */
  generateDailySlots(config, startDate, endDate) {
    const slots = [];
    const recurrenceConfig = this.parseRecurrenceConfig(config.recurrence_config);

    let currentDate = DateTime.fromJSDate(startDate, { zone: config.timezone });
    const endDateTime = DateTime.fromJSDate(endDate, { zone: config.timezone });

    while (currentDate <= endDateTime) {
      // Check if this day should be included (skip weekends, holidays, etc.)
      if (this.shouldIncludeDate(currentDate, recurrenceConfig)) {
        const daySlots = this.generateSlotsForDay(config, currentDate);
        slots.push(...daySlots);
      }

      currentDate = currentDate.plus({ days: 1 });
    }

    return slots;
  }

  /**
   * Generate weekly recurring slots
   */
  generateWeeklySlots(config, startDate, endDate) {
    const slots = [];
    const recurrenceConfig = this.parseRecurrenceConfig(config.recurrence_config);

    let currentDate = DateTime.fromJSDate(startDate, { zone: config.timezone });
    const endDateTime = DateTime.fromJSDate(endDate, { zone: config.timezone });

    // Find the first occurrence
    const targetWeekdays = recurrenceConfig.weekdays || [1, 2, 3, 4, 5]; // Default to weekdays
    while (currentDate <= endDateTime) {
      const weekday = currentDate.weekday; // 1 = Monday, 7 = Sunday

      if (targetWeekdays.includes(weekday) && this.shouldIncludeDate(currentDate, recurrenceConfig)) {
        const daySlots = this.generateSlotsForDay(config, currentDate);
        slots.push(...daySlots);
      }

      currentDate = currentDate.plus({ days: 1 });
    }

    return slots;
  }

  /**
   * Generate monthly recurring slots
   */
  generateMonthlySlots(config, startDate, endDate) {
    const slots = [];
    const recurrenceConfig = this.parseRecurrenceConfig(config.recurrence_config);

    let currentDate = DateTime.fromJSDate(startDate, { zone: config.timezone });
    const endDateTime = DateTime.fromJSDate(endDate, { zone: config.timezone });

    while (currentDate <= endDateTime) {
      if (this.shouldIncludeDate(currentDate, recurrenceConfig)) {
        const daySlots = this.generateSlotsForDay(config, currentDate);
        slots.push(...daySlots);
      }

      currentDate = currentDate.plus({ months: 1 });
    }

    return slots;
  }

  /**
   * Generate custom recurring slots based on complex rules
   */
  generateCustomSlots(config, startDate, endDate) {
    const slots = [];
    const recurrenceConfig = this.parseRecurrenceConfig(config.recurrence_config);

    // Custom logic based on recurrence_config
    // This could include complex patterns like "every 2 weeks on Tuesday and Thursday"
    // or "first Monday of each month" etc.

    let currentDate = DateTime.fromJSDate(startDate, { zone: config.timezone });
    const endDateTime = DateTime.fromJSDate(endDate, { zone: config.timezone });

    while (currentDate <= endDateTime) {
      if (this.evaluateCustomRule(currentDate, recurrenceConfig) && this.shouldIncludeDate(currentDate, recurrenceConfig)) {
        const daySlots = this.generateSlotsForDay(config, currentDate);
        slots.push(...daySlots);
      }

      currentDate = currentDate.plus({ days: 1 });
    }

    return slots;
  }

  /**
   * Generate slots for a specific day
   */
  generateSlotsForDay(config, date) {
    const slots = [];
    const startTime = this.parseTime(config.start_time);
    const endTime = this.parseTime(config.end_time);
    const duration = config.duration_minutes;

    let currentTime = startTime;

    while (currentTime < endTime) {
      const slotEnd = this.addMinutes(currentTime, duration);

      // Don't create slots that extend beyond the end time
      if (slotEnd > endTime) break;

      const slotStart = date.set({
        hour: currentTime.hours,
        minute: currentTime.minutes
      });

      const slotEndDateTime = date.set({
        hour: slotEnd.hours,
        minute: slotEnd.minutes
      });

      slots.push(this.createSlotObject(config, slotStart, slotEndDateTime));

      // Add buffer time between slots
      currentTime = this.addMinutes(slotEnd, this.businessRules.bufferTime);
    }

    return slots;
  }

  /**
   * Apply business rules and filters to generated slots
   */
  async applyBusinessRules(slots, config) {
    const filteredSlots = [];

    for (const slot of slots) {
      // Check maximum slots per day
      const daySlots = filteredSlots.filter(s =>
        s.start_time.toISODate() === slot.start_time.toISODate()
      );

      if (daySlots.length >= this.businessRules.maxSlotsPerDay) {
        continue;
      }

      // Check for conflicts with existing appointments
      const hasConflict = await this.checkSlotConflicts(slot, config.professional_id);
      if (hasConflict) {
        continue;
      }

      // Check blocked slots
      const isBlocked = await this.checkBlockedSlots(slot, config.professional_id);
      if (isBlocked) {
        continue;
      }

      // Apply custom business rules from meta
      if (!this.applyCustomBusinessRules(slot, config)) {
        continue;
      }

      filteredSlots.push(slot);
    }

    return filteredSlots;
  }

  /**
   * Check for conflicts with existing appointments
   */
  async checkSlotConflicts(slot, professionalId) {
    const conflicts = await prisma.appointments.findMany({
      where: {
        professional_id: professionalId,
        status: { in: ['scheduled', 'confirmed', 'in_progress'] },
        scheduled_start: { lt: slot.end_time.toJSDate() },
        scheduled_end: { gt: slot.start_time.toJSDate() }
      }
    });

    return conflicts.length > 0;
  }

  /**
   * Check if slot overlaps with blocked slots
   */
  async checkBlockedSlots(slot, professionalId) {
    const blocks = await prisma.blocked_slots.findMany({
      where: {
        professional_id: professionalId,
        is_active: true,
        start_time: { lt: slot.end_time.toJSDate() },
        end_time: { gt: slot.start_time.toJSDate() }
      }
    });

    return blocks.length > 0;
  }

  /**
   * Apply custom business rules from configuration meta
   */
  applyCustomBusinessRules(slot, config) {
    if (!config.meta) return true;

    try {
      const rules = JSON.parse(config.meta);

      // Example custom rules
      if (rules.maxAdvanceBooking) {
        const maxDate = DateTime.now().plus({ days: rules.maxAdvanceBooking });
        if (slot.start_time > maxDate) return false;
      }

      if (rules.minAdvanceBooking) {
        const minDate = DateTime.now().plus({ days: rules.minAdvanceBooking });
        if (slot.start_time < minDate) return false;
      }

      // Add more custom rules as needed

      return true;
    } catch (error) {
      console.warn('Error parsing custom business rules:', error);
      return true; // Default to allowing the slot
    }
  }

  /**
   * Clean up existing slots in the date range
   */
  async cleanupExistingSlots(professionalId, startDate, endDate) {
    await prisma.availability_slots.deleteMany({
      where: {
        professional_id: professionalId,
        start_time: {
          gte: startDate,
          lt: endDate
        },
        status: 'available' // Only remove available slots, keep booked ones
      }
    });
  }

  /**
   * Bulk insert slots with optimization
   */
  async bulkInsertSlots(slots) {
    if (slots.length === 0) return [];

    // Convert DateTime objects to JS Dates for Prisma
    const slotData = slots.map(slot => ({
      professional_id: slot.professional_id,
      availability_config_id: slot.availability_config_id,
      start_time: slot.start_time.toJSDate(),
      end_time: slot.end_time.toJSDate(),
      local_start_time: slot.local_start_time,
      local_end_time: slot.local_end_time,
      timezone: slot.timezone,
      status: slot.status,
      is_available: slot.is_available,
      meta: slot.meta ? JSON.stringify(slot.meta) : null
    }));

    // Bulk insert
    const createdSlots = await prisma.availability_slots.createMany({
      data: slotData,
      skipDuplicates: true
    });

    return createdSlots;
  }

  /**
   * Helper methods
   */

  validateDateRange(startDate, endDate) {
    const maxRange = 90; // days
    const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    if (diffDays > maxRange) {
      throw new Error(`Date range too large. Maximum allowed: ${maxRange} days`);
    }

    if (startDate >= endDate) {
      throw new Error('Start date must be before end date');
    }
  }

  parseRecurrenceConfig(configString) {
    if (!configString) return {};

    try {
      return JSON.parse(configString);
    } catch (error) {
      console.warn('Error parsing recurrence config:', error);
      return {};
    }
  }

  shouldIncludeDate(date, recurrenceConfig) {
    // Check for excluded dates
    if (recurrenceConfig.excludeDates) {
      const excludeDates = recurrenceConfig.excludeDates.map(d => DateTime.fromISO(d));
      if (excludeDates.some(excludeDate => date.hasSame(excludeDate, 'day'))) {
        return false;
      }
    }

    // Check for included dates (overrides exclusions)
    if (recurrenceConfig.includeDates) {
      const includeDates = recurrenceConfig.includeDates.map(d => DateTime.fromISO(d));
      if (includeDates.some(includeDate => date.hasSame(includeDate, 'day'))) {
        return true;
      }
    }

    // Default to include
    return true;
  }

  evaluateCustomRule(date, recurrenceConfig) {
    // Implement custom rule evaluation logic
    // This is a placeholder for complex custom recurrence patterns
    return true;
  }

  parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours, minutes };
  }

  addMinutes(time, minutes) {
    const totalMinutes = time.hours * 60 + time.minutes + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;

    return { hours: newHours, minutes: newMinutes };
  }

  createSlotObject(config, startDateTime, endDateTime) {
    return {
      professional_id: config.professional_id,
      availability_config_id: config.id,
      start_time: startDateTime,
      end_time: endDateTime,
      local_start_time: startDateTime.toFormat('HH:mm'),
      local_end_time: endDateTime.toFormat('HH:mm'),
      timezone: config.timezone,
      status: 'available',
      is_available: true,
      meta: null
    };
  }
}

module.exports = new SlotGenerationService();
