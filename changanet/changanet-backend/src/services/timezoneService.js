/**
 * Timezone Service - Advanced Availability System
 *
 * This service provides comprehensive timezone and DST (Daylight Saving Time) handling
 * for the availability and appointment system.
 *
 * Key Features:
 * - Timezone conversion between UTC and local times
 * - DST transition detection and handling
 * - Business hours validation across timezones
 * - Recurring event timezone adjustments
 * - Holiday and special date handling
 */

const { DateTime, IANAZone } = require('luxon');

/**
 * Timezone and DST handling service
 */
class TimezoneService {
  constructor() {
    // Cache for timezone validation
    this.timezoneCache = new Map();

    // Common timezone mappings
    this.timezoneMappings = {
      'America/Buenos_Aires': 'ART', // Argentina Time
      'America/Santiago': 'CLT', // Chile Time
      'America/Lima': 'PET', // Peru Time
      'America/Bogota': 'COT', // Colombia Time
      'America/Mexico_City': 'CST', // Central Standard Time
      'Europe/Madrid': 'CET', // Central European Time
      'Europe/London': 'GMT', // Greenwich Mean Time
      'America/New_York': 'EST', // Eastern Standard Time
      'America/Los_Angeles': 'PST', // Pacific Standard Time
      'Asia/Tokyo': 'JST', // Japan Standard Time
      'Australia/Sydney': 'AEST', // Australian Eastern Standard Time
    };

    // Business hours configuration (can be customized per professional)
    this.defaultBusinessHours = {
      start: 8, // 8 AM
      end: 20,  // 8 PM
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday (ISO weekday numbers)
    };

    // DST transition rules for major timezones
    this.dstRules = {
      'America/Buenos_Aires': {
        transitions: [], // Argentina doesn't observe DST currently
        offset: -3, // UTC-3
      },
      'America/New_York': {
        transitions: [
          { month: 3, day: 'second', weekday: 7, hour: 2, offset: -4 }, // March DST start
          { month: 11, day: 'first', weekday: 7, hour: 2, offset: -5 }, // November DST end
        ],
        standardOffset: -5,
        dstOffset: -4,
      },
      'Europe/London': {
        transitions: [
          { month: 3, day: 'last', weekday: 7, hour: 1, offset: 1 }, // March DST start
          { month: 10, day: 'last', weekday: 7, hour: 2, offset: 0 }, // October DST end
        ],
        standardOffset: 0,
        dstOffset: 1,
      },
    };
  }

  /**
   * Validate and normalize a timezone identifier
   * @param {string} timezone - IANA timezone identifier
   * @returns {string} Normalized timezone identifier
   */
  validateTimezone(timezone) {
    if (!timezone) {
      return 'America/Buenos_Aires'; // Default fallback
    }

    // Check cache first
    if (this.timezoneCache.has(timezone)) {
      return this.timezoneCache.get(timezone);
    }

    try {
      const zone = new IANAZone(timezone);
      if (zone.isValid) {
        this.timezoneCache.set(timezone, timezone);
        return timezone;
      }
    } catch (error) {
      console.warn(`Invalid timezone: ${timezone}`);
    }

    // Try to find a similar valid timezone
    const fallback = this.findSimilarTimezone(timezone);
    if (fallback) {
      this.timezoneCache.set(timezone, fallback);
      return fallback;
    }

    // Ultimate fallback
    return 'America/Buenos_Aires';
  }

  /**
   * Convert a datetime from one timezone to another
   * @param {Date|string} dateTime - DateTime to convert
   * @param {string} fromTimezone - Source timezone
   * @param {string} toTimezone - Target timezone
   * @returns {DateTime} Converted DateTime
   */
  convertTimezone(dateTime, fromTimezone, toTimezone) {
    const fromZone = this.validateTimezone(fromTimezone);
    const toZone = this.validateTimezone(toTimezone);

    let dt;
    if (dateTime instanceof Date) {
      dt = DateTime.fromJSDate(dateTime, { zone: fromZone });
    } else if (typeof dateTime === 'string') {
      dt = DateTime.fromISO(dateTime, { zone: fromZone });
    } else if (dateTime instanceof DateTime) {
      dt = dateTime;
    } else {
      throw new Error('Invalid dateTime format');
    }

    return dt.setZone(toZone);
  }

  /**
   * Convert to UTC from local timezone
   * @param {Date|string} localDateTime - Local datetime
   * @param {string} timezone - Local timezone
   * @returns {Date} UTC datetime
   */
  toUTC(localDateTime, timezone) {
    const converted = this.convertTimezone(localDateTime, timezone, 'UTC');
    return converted.toJSDate();
  }

  /**
   * Convert from UTC to local timezone
   * @param {Date|string} utcDateTime - UTC datetime
   * @param {string} timezone - Target timezone
   * @returns {Date} Local datetime
   */
  fromUTC(utcDateTime, timezone) {
    const converted = this.convertTimezone(utcDateTime, 'UTC', timezone);
    return converted.toJSDate();
  }

  /**
   * Get local time representation for display
   * @param {Date|string} utcDateTime - UTC datetime
   * @param {string} timezone - Target timezone
   * @param {string} format - Format string (luxon format)
   * @returns {string} Formatted local time
   */
  formatLocalTime(utcDateTime, timezone, format = 'yyyy-MM-dd HH:mm:ss') {
    const local = this.convertTimezone(utcDateTime, 'UTC', timezone);
    return local.toFormat(format);
  }

  /**
   * Check if a datetime falls within DST period
   * @param {DateTime} dateTime - DateTime to check
   * @param {string} timezone - Timezone to check
   * @returns {boolean} True if in DST
   */
  isDST(dateTime, timezone) {
    const zone = new IANAZone(timezone);
    if (!zone.isValid) return false;

    // Use luxon's built-in DST detection
    return dateTime.isInDST;
  }

  /**
   * Get DST transition dates for a timezone and year
   * @param {string} timezone - Timezone identifier
   * @param {number} year - Year to get transitions for
   * @returns {Array} DST transition dates
   */
  getDSTTransitions(timezone, year) {
    const rules = this.dstRules[timezone];
    if (!rules || !rules.transitions) return [];

    const transitions = [];

    for (const rule of rules.transitions) {
      const transition = this.calculateTransitionDate(rule, year);
      if (transition) {
        transitions.push({
          ...rule,
          date: transition,
          isDST: rule.offset === (rules.dstOffset || 0)
        });
      }
    }

    return transitions;
  }

  /**
   * Calculate the exact date of a DST transition
   */
  calculateTransitionDate(rule, year) {
    const { month, day, weekday, hour } = rule;

    let date = DateTime.fromObject({ year, month, day: 1 }, { zone: 'UTC' });

    // Find the correct day based on the rule
    if (day === 'first') {
      // First weekday of the month
      while (date.weekday !== weekday) {
        date = date.plus({ days: 1 });
      }
    } else if (day === 'second') {
      // Second weekday of the month
      let count = 0;
      while (count < 2) {
        if (date.weekday === weekday) count++;
        if (count < 2) date = date.plus({ days: 1 });
      }
    } else if (day === 'last') {
      // Last weekday of the month
      const lastDay = date.endOf('month');
      date = lastDay;
      while (date.weekday !== weekday) {
        date = date.minus({ days: 1 });
      }
    }

    return date.set({ hour });
  }

  /**
   * Check if a datetime falls within business hours
   * @param {DateTime} dateTime - DateTime to check
   * @param {Object} businessHours - Business hours configuration
   * @returns {boolean} True if within business hours
   */
  isBusinessHours(dateTime, businessHours = this.defaultBusinessHours) {
    const hour = dateTime.hour;
    const weekday = dateTime.weekday; // 1 = Monday, 7 = Sunday

    // Check if it's a working day
    if (!businessHours.workingDays.includes(weekday)) {
      return false;
    }

    // Check if it's within business hours
    return hour >= businessHours.start && hour < businessHours.end;
  }

  /**
   * Find the next business hour datetime
   * @param {DateTime} fromDateTime - Starting datetime
   * @param {Object} businessHours - Business hours configuration
   * @returns {DateTime} Next business hour
   */
  getNextBusinessHour(fromDateTime, businessHours = this.defaultBusinessHours) {
    let current = fromDateTime;

    // If current time is within business hours, return it
    if (this.isBusinessHours(current, businessHours)) {
      return current;
    }

    // Find next business day
    while (!businessHours.workingDays.includes(current.weekday)) {
      current = current.plus({ days: 1 }).startOf('day');
    }

    // Set to business hours start
    current = current.set({ hour: businessHours.start, minute: 0, second: 0 });

    // If we're still in the past, move to tomorrow
    if (current <= fromDateTime) {
      current = current.plus({ days: 1 });
      // Find next business day again
      while (!businessHours.workingDays.includes(current.weekday)) {
        current = current.plus({ days: 1 });
      }
      current = current.set({ hour: businessHours.start, minute: 0, second: 0 });
    }

    return current;
  }

  /**
   * Adjust recurring events for DST transitions
   * @param {Array} slots - Array of time slots
   * @param {string} timezone - Timezone of the slots
   * @returns {Array} Adjusted slots
   */
  adjustForDST(slots, timezone) {
    const adjustedSlots = [];
    const transitions = this.getDSTTransitions(timezone, new Date().getFullYear());

    for (const slot of slots) {
      let adjustedSlot = { ...slot };

      // Check if slot crosses a DST transition
      for (const transition of transitions) {
        const slotStart = DateTime.fromJSDate(slot.start_time);
        const slotEnd = DateTime.fromJSDate(slot.end_time);
        const transitionTime = transition.date;

        if (slotStart <= transitionTime && slotEnd >= transitionTime) {
          // Slot crosses DST transition - adjust end time
          const duration = slotEnd.diff(slotStart);
          const adjustedEnd = transitionTime.plus(duration);
          adjustedSlot.end_time = adjustedEnd.toJSDate();
          break;
        }
      }

      adjustedSlots.push(adjustedSlot);
    }

    return adjustedSlots;
  }

  /**
   * Get timezone information for a given timezone
   * @param {string} timezone - Timezone identifier
   * @returns {Object} Timezone information
   */
  getTimezoneInfo(timezone) {
    const validatedTimezone = this.validateTimezone(timezone);
    const now = DateTime.now().setZone(validatedTimezone);

    return {
      identifier: validatedTimezone,
      abbreviation: this.timezoneMappings[validatedTimezone] || validatedTimezone,
      offset: now.offset,
      offsetString: now.toFormat('Z'),
      isDST: now.isInDST,
      name: validatedTimezone.split('/').pop().replace('_', ' '),
    };
  }

  /**
   * List all available timezones
   * @returns {Array} Array of available timezone identifiers
   */
  getAvailableTimezones() {
    // Return common timezones for the application
    return [
      'America/Buenos_Aires',
      'America/Santiago',
      'America/Lima',
      'America/Bogota',
      'America/Mexico_City',
      'America/New_York',
      'America/Los_Angeles',
      'Europe/Madrid',
      'Europe/London',
      'Europe/Paris',
      'Asia/Tokyo',
      'Australia/Sydney',
      'Pacific/Auckland',
    ];
  }

  /**
   * Calculate duration between two datetimes in different timezones
   * @param {DateTime} start - Start datetime
   * @param {DateTime} end - End datetime
   * @returns {Object} Duration information
   */
  calculateDuration(start, end) {
    const duration = end.diff(start);

    return {
      milliseconds: duration.milliseconds,
      seconds: duration.seconds,
      minutes: duration.minutes,
      hours: duration.hours,
      days: duration.days,
      weeks: duration.weeks,
      months: duration.months,
      years: duration.years,
      humanReadable: duration.toHuman(),
    };
  }

  /**
   * Validate if a time slot respects business rules across timezones
   * @param {DateTime} start - Slot start time
   * @param {DateTime} end - Slot end time
   * @param {string} timezone - Slot timezone
   * @param {Object} rules - Business rules
   * @returns {Object} Validation result
   */
  validateSlotBusinessRules(start, end, timezone, rules = {}) {
    const issues = [];

    // Check minimum duration
    const minDuration = rules.minSlotDuration || 30; // 30 minutes default
    const duration = end.diff(start, 'minutes').minutes;
    if (duration < minDuration) {
      issues.push({
        type: 'duration_too_short',
        message: `Slot duration (${duration} min) is less than minimum (${minDuration} min)`,
        severity: 'error'
      });
    }

    // Check maximum duration
    const maxDuration = rules.maxSlotDuration || 480; // 8 hours default
    if (duration > maxDuration) {
      issues.push({
        type: 'duration_too_long',
        message: `Slot duration (${duration} min) exceeds maximum (${maxDuration} min)`,
        severity: 'warning'
      });
    }

    // Check business hours
    if (!this.isBusinessHours(start, rules.businessHours)) {
      issues.push({
        type: 'outside_business_hours',
        message: 'Slot starts outside business hours',
        severity: 'warning'
      });
    }

    if (!this.isBusinessHours(end, rules.businessHours)) {
      issues.push({
        type: 'outside_business_hours',
        message: 'Slot ends outside business hours',
        severity: 'warning'
      });
    }

    // Check DST transitions
    if (this.crossesDSTTransition(start, end, timezone)) {
      issues.push({
        type: 'dst_transition',
        message: 'Slot crosses DST transition - time may be affected',
        severity: 'info'
      });
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      warnings: issues.filter(i => i.severity === 'warning'),
      errors: issues.filter(i => i.severity === 'error'),
    };
  }

  /**
   * Check if a time range crosses a DST transition
   */
  crossesDSTTransition(start, end, timezone) {
    const transitions = this.getDSTTransitions(timezone, start.year);

    for (const transition of transitions) {
      if (start <= transition.date && end >= transition.date) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find a similar valid timezone for invalid input
   */
  findSimilarTimezone(invalidTimezone) {
    // Simple fuzzy matching for common mistakes
    const commonMappings = {
      'Buenos Aires': 'America/Buenos_Aires',
      'Buenos_Aires': 'America/Buenos_Aires',
      'Argentina': 'America/Buenos_Aires',
      'Santiago': 'America/Santiago',
      'Chile': 'America/Santiago',
      'Lima': 'America/Lima',
      'Peru': 'America/Lima',
      'Bogota': 'America/Bogota',
      'Colombia': 'America/Bogota',
      'Mexico City': 'America/Mexico_City',
      'Mexico': 'America/Mexico_City',
      'New York': 'America/New_York',
      'NYC': 'America/New_York',
      'Los Angeles': 'America/Los_Angeles',
      'LA': 'America/Los_Angeles',
      'Madrid': 'Europe/Madrid',
      'Spain': 'Europe/Madrid',
      'London': 'Europe/London',
      'UK': 'Europe/London',
      'Tokyo': 'Asia/Tokyo',
      'Japan': 'Asia/Tokyo',
      'Sydney': 'Australia/Sydney',
      'Australia': 'Australia/Sydney',
    };

    return commonMappings[invalidTimezone] || null;
  }

  /**
   * Get holidays for a specific country/year
   * @param {string} country - Country code (e.g., 'AR', 'CL', 'US')
   * @param {number} year - Year
   * @returns {Array} Array of holiday dates
   */
  getHolidays(country, year) {
    // This would integrate with a holiday API or library
    // For now, return empty array
    console.warn('Holiday integration not implemented yet');
    return [];
  }

  /**
   * Format a datetime for API responses
   * @param {DateTime} dateTime - DateTime to format
   * @returns {Object} Formatted datetime object
   */
  formatForAPI(dateTime) {
    return {
      utc: dateTime.toUTC().toISO(),
      local: dateTime.toISO(),
      timezone: dateTime.zoneName,
      offset: dateTime.offset,
      isDST: dateTime.isInDST,
      formatted: {
        date: dateTime.toFormat('yyyy-MM-dd'),
        time: dateTime.toFormat('HH:mm:ss'),
        datetime: dateTime.toFormat('yyyy-MM-dd HH:mm:ss'),
        human: dateTime.toRelative() || dateTime.toFormat('DDD t'),
      }
    };
  }
}

module.exports = new TimezoneService();
