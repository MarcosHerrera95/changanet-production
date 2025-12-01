/**
 * Unit Tests for Timezone Service
 * Tests timezone conversion, DST handling, business hours validation, and utility functions
 */

const { DateTime, IANAZone } = require('luxon');
const timezoneService = require('../../../services/timezoneService');

describe('TimezoneService', () => {
  let service;

  beforeEach(() => {
    service = new (require('../../../services/timezoneService').constructor)();
    // Clear timezone cache before each test
    service.timezoneCache.clear();
  });

  describe('validateTimezone', () => {
    test('should validate valid IANA timezone', () => {
      const result = service.validateTimezone('America/Buenos_Aires');

      expect(result).toBe('America/Buenos_Aires');
      expect(service.timezoneCache.has('America/Buenos_Aires')).toBe(true);
    });

    test('should return default timezone for invalid input', () => {
      const result = service.validateTimezone('Invalid/Timezone');

      expect(result).toBe('America/Buenos_Aires'); // Default fallback
    });

    test('should return default timezone for null/undefined', () => {
      expect(service.validateTimezone(null)).toBe('America/Buenos_Aires');
      expect(service.validateTimezone(undefined)).toBe('America/Buenos_Aires');
    });

    test('should use cached result for repeated calls', () => {
      service.timezoneCache.set('America/New_York', 'America/New_York');

      const result = service.validateTimezone('America/New_York');

      expect(result).toBe('America/New_York');
    });

    test('should find similar timezone for common mistakes', () => {
      const result = service.findSimilarTimezone('Buenos Aires');

      expect(result).toBe('America/Buenos_Aires');
    });
  });

  describe('convertTimezone', () => {
    test('should convert DateTime between timezones', () => {
      const dateTime = DateTime.fromISO('2024-01-01T12:00:00', { zone: 'UTC' });

      const result = service.convertTimezone(dateTime, 'UTC', 'America/Buenos_Aires');

      expect(result.zoneName).toBe('America/Buenos_Aires');
      expect(result.hour).toBe(9); // UTC-3 offset
    });

    test('should convert Date object to target timezone', () => {
      const date = new Date('2024-01-01T12:00:00Z');

      const result = service.convertTimezone(date, 'UTC', 'America/New_York');

      expect(result.zoneName).toBe('America/New_York');
      expect(result.hour).toBe(7); // UTC-5 offset (standard time)
    });

    test('should convert ISO string to target timezone', () => {
      const isoString = '2024-01-01T12:00:00Z';

      const result = service.convertTimezone(isoString, 'UTC', 'Europe/London');

      expect(result.zoneName).toBe('Europe/London');
      expect(result.hour).toBe(12); // UTC+0 offset
    });

    test('should throw error for invalid dateTime format', () => {
      expect(() => service.convertTimezone(12345, 'UTC', 'America/Buenos_Aires'))
        .toThrow('Invalid dateTime format');
    });
  });

  describe('toUTC and fromUTC', () => {
    test('should convert local time to UTC', () => {
      const localDate = new Date('2024-01-01T12:00:00'); // Local time

      const result = service.toUTC(localDate, 'America/Buenos_Aires');

      expect(result).toBeInstanceOf(Date);
      // Buenos Aires is UTC-3, so 12:00 local becomes 15:00 UTC
      expect(result.getUTCHours()).toBe(15);
    });

    test('should convert UTC to local time', () => {
      const utcDate = new Date('2024-01-01T15:00:00Z'); // UTC time

      const result = service.fromUTC(utcDate, 'America/Buenos_Aires');

      expect(result).toBeInstanceOf(Date);
      // UTC 15:00 becomes 12:00 in Buenos Aires (UTC-3)
      expect(result.getHours()).toBe(12);
    });
  });

  describe('formatLocalTime', () => {
    test('should format UTC time in local timezone', () => {
      const utcDate = new Date('2024-01-01T15:00:00Z');

      const result = service.formatLocalTime(utcDate, 'America/Buenos_Aires', 'yyyy-MM-dd HH:mm');

      expect(result).toBe('2024-01-01 12:00');
    });

    test('should use default format when not specified', () => {
      const utcDate = new Date('2024-01-01T15:00:00Z');

      const result = service.formatLocalTime(utcDate, 'America/Buenos_Aires');

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('isDST', () => {
    test('should detect DST for DST timezone', () => {
      // During DST (March)
      const dstDate = DateTime.fromISO('2024-06-01T12:00:00', { zone: 'America/New_York' });

      const result = service.isDST(dstDate, 'America/New_York');

      expect(result).toBe(true);
    });

    test('should detect non-DST for standard time', () => {
      // During standard time (December)
      const standardDate = DateTime.fromISO('2024-12-01T12:00:00', { zone: 'America/New_York' });

      const result = service.isDST(standardDate, 'America/New_York');

      expect(result).toBe(false);
    });

    test('should return false for invalid timezone', () => {
      const date = DateTime.now();

      const result = service.isDST(date, 'Invalid/Timezone');

      expect(result).toBe(false);
    });
  });

  describe('getDSTTransitions', () => {
    test('should return DST transitions for supported timezone', () => {
      const transitions = service.getDSTTransitions('America/New_York', 2024);

      expect(Array.isArray(transitions)).toBe(true);
      expect(transitions.length).toBeGreaterThan(0);

      const transition = transitions[0];
      expect(transition).toHaveProperty('month');
      expect(transition).toHaveProperty('day');
      expect(transition).toHaveProperty('hour');
      expect(transition).toHaveProperty('offset');
      expect(transition).toHaveProperty('date');
      expect(transition).toHaveProperty('isDST');
    });

    test('should return empty array for unsupported timezone', () => {
      const transitions = service.getDSTTransitions('America/Buenos_Aires', 2024);

      expect(transitions).toEqual([]);
    });

    test('should return empty array for timezone without DST rules', () => {
      const transitions = service.getDSTTransitions('UTC', 2024);

      expect(transitions).toEqual([]);
    });
  });

  describe('calculateTransitionDate', () => {
    test('should calculate first weekday transition', () => {
      const rule = {
        month: 3,
        day: 'first',
        weekday: 7, // Sunday
        hour: 2
      };

      const result = service.calculateTransitionDate(rule, 2024);

      expect(result).toBeInstanceOf(DateTime);
      expect(result.month).toBe(3); // March
      expect(result.weekday).toBe(7); // Sunday
      expect(result.hour).toBe(2);
    });

    test('should calculate second weekday transition', () => {
      const rule = {
        month: 3,
        day: 'second',
        weekday: 7, // Sunday
        hour: 2
      };

      const result = service.calculateTransitionDate(rule, 2024);

      expect(result).toBeInstanceOf(DateTime);
      expect(result.month).toBe(3); // March
      expect(result.weekday).toBe(7); // Sunday
      expect(result.hour).toBe(2);
    });

    test('should calculate last weekday transition', () => {
      const rule = {
        month: 10,
        day: 'last',
        weekday: 7, // Sunday
        hour: 2
      };

      const result = service.calculateTransitionDate(rule, 2024);

      expect(result).toBeInstanceOf(DateTime);
      expect(result.month).toBe(10); // October
      expect(result.weekday).toBe(7); // Sunday
      expect(result.hour).toBe(2);
    });
  });

  describe('isBusinessHours', () => {
    test('should return true for business hours on working day', () => {
      const dateTime = DateTime.fromISO('2024-01-01T10:00:00', { zone: 'America/Buenos_Aires' }); // Monday 10 AM

      const result = service.isBusinessHours(dateTime);

      expect(result).toBe(true);
    });

    test('should return false for non-working hours', () => {
      const dateTime = DateTime.fromISO('2024-01-01T06:00:00', { zone: 'America/Buenos_Aires' }); // 6 AM

      const result = service.isBusinessHours(dateTime);

      expect(result).toBe(false);
    });

    test('should return false for weekend', () => {
      const dateTime = DateTime.fromISO('2024-01-06T10:00:00', { zone: 'America/Buenos_Aires' }); // Saturday 10 AM

      const result = service.isBusinessHours(dateTime);

      expect(result).toBe(false);
    });

    test('should use custom business hours', () => {
      const customHours = {
        start: 10,
        end: 16,
        workingDays: [1, 2, 3, 4, 5, 6] // Include Saturday
      };
      const dateTime = DateTime.fromISO('2024-01-06T12:00:00', { zone: 'America/Buenos_Aires' }); // Saturday 12 PM

      const result = service.isBusinessHours(dateTime, customHours);

      expect(result).toBe(true);
    });
  });

  describe('getNextBusinessHour', () => {
    test('should return current time if within business hours', () => {
      const current = DateTime.fromISO('2024-01-01T10:00:00', { zone: 'America/Buenos_Aires' }); // Monday 10 AM

      const result = service.getNextBusinessHour(current);

      expect(result.toISO()).toBe(current.toISO());
    });

    test('should return next business hour for non-business time', () => {
      const current = DateTime.fromISO('2024-01-01T06:00:00', { zone: 'America/Buenos_Aires' }); // Monday 6 AM

      const result = service.getNextBusinessHour(current);

      expect(result.hour).toBe(8); // Business start hour
      expect(result.minute).toBe(0);
    });

    test('should skip to next working day for weekend', () => {
      const current = DateTime.fromISO('2024-01-06T10:00:00', { zone: 'America/Buenos_Aires' }); // Saturday 10 AM

      const result = service.getNextBusinessHour(current);

      expect(result.weekday).toBe(1); // Monday
      expect(result.hour).toBe(8);
    });

    test('should handle custom business hours', () => {
      const customHours = {
        start: 10,
        end: 16,
        workingDays: [1, 2, 3, 4, 5, 6]
      };
      const current = DateTime.fromISO('2024-01-01T06:00:00', { zone: 'America/Buenos_Aires' }); // Monday 6 AM

      const result = service.getNextBusinessHour(current, customHours);

      expect(result.hour).toBe(10); // Custom start hour
    });
  });

  describe('adjustForDST', () => {
    test('should adjust slots that cross DST transition', () => {
      const slots = [
        {
          start_time: new Date('2024-03-10T01:00:00Z'), // Before DST transition
          end_time: new Date('2024-03-10T03:00:00Z'),   // After DST transition
        }
      ];

      const adjusted = service.adjustForDST(slots, 'America/New_York');

      expect(adjusted[0].end_time.getTime()).not.toBe(slots[0].end_time.getTime());
    });

    test('should not adjust slots that do not cross DST transition', () => {
      const slots = [
        {
          start_time: new Date('2024-01-01T10:00:00Z'),
          end_time: new Date('2024-01-01T11:00:00Z'),
        }
      ];

      const adjusted = service.adjustForDST(slots, 'America/New_York');

      expect(adjusted[0].end_time.getTime()).toBe(slots[0].end_time.getTime());
    });
  });

  describe('getTimezoneInfo', () => {
    test('should return timezone information', () => {
      const info = service.getTimezoneInfo('America/Buenos_Aires');

      expect(info).toHaveProperty('identifier', 'America/Buenos_Aires');
      expect(info).toHaveProperty('abbreviation');
      expect(info).toHaveProperty('offset');
      expect(info).toHaveProperty('offsetString');
      expect(info).toHaveProperty('isDST');
      expect(info).toHaveProperty('name');
    });

    test('should handle invalid timezone gracefully', () => {
      const info = service.getTimezoneInfo('Invalid/Timezone');

      expect(info.identifier).toBe('America/Buenos_Aires'); // Fallback
    });
  });

  describe('getAvailableTimezones', () => {
    test('should return array of available timezones', () => {
      const timezones = service.getAvailableTimezones();

      expect(Array.isArray(timezones)).toBe(true);
      expect(timezones.length).toBeGreaterThan(0);
      expect(timezones).toContain('America/Buenos_Aires');
      expect(timezones).toContain('Europe/London');
      expect(timezones).toContain('Asia/Tokyo');
    });
  });

  describe('calculateDuration', () => {
    test('should calculate duration between DateTimes', () => {
      const start = DateTime.fromISO('2024-01-01T10:00:00');
      const end = DateTime.fromISO('2024-01-01T12:30:00');

      const duration = service.calculateDuration(start, end);

      expect(duration.hours).toBe(2.5);
      expect(duration.minutes).toBe(150);
      expect(duration.humanReadable).toContain('2 hours');
    });
  });

  describe('validateSlotBusinessRules', () => {
    test('should validate slot duration', () => {
      const start = DateTime.fromISO('2024-01-01T10:00:00');
      const end = DateTime.fromISO('2024-01-01T10:30:00'); // 30 minutes

      const result = service.validateSlotBusinessRules(start, end, 'America/Buenos_Aires');

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    test('should detect duration too short', () => {
      const start = DateTime.fromISO('2024-01-01T10:00:00');
      const end = DateTime.fromISO('2024-01-01T10:15:00'); // 15 minutes

      const result = service.validateSlotBusinessRules(start, end, 'America/Buenos_Aires', {
        minSlotDuration: 30
      });

      expect(result.valid).toBe(false);
      expect(result.issues[0].type).toBe('duration_too_short');
    });

    test('should detect duration too long', () => {
      const start = DateTime.fromISO('2024-01-01T10:00:00');
      const end = DateTime.fromISO('2024-01-01T20:00:00'); // 10 hours

      const result = service.validateSlotBusinessRules(start, end, 'America/Buenos_Aires', {
        maxSlotDuration: 480 // 8 hours
      });

      expect(result.valid).toBe(false);
      expect(result.issues[0].type).toBe('duration_too_long');
    });

    test('should detect outside business hours', () => {
      const start = DateTime.fromISO('2024-01-01T06:00:00'); // 6 AM
      const end = DateTime.fromISO('2024-01-01T07:00:00');

      const result = service.validateSlotBusinessRules(start, end, 'America/Buenos_Aires');

      expect(result.issues.some(issue => issue.type === 'outside_business_hours')).toBe(true);
    });

    test('should detect DST transition crossing', () => {
      // Mock DST transition
      service.getDSTTransitions = jest.fn().mockReturnValue([
        {
          date: DateTime.fromISO('2024-03-10T02:00:00', { zone: 'America/New_York' }),
          isDST: true
        }
      ]);

      const start = DateTime.fromISO('2024-03-10T01:00:00', { zone: 'America/New_York' });
      const end = DateTime.fromISO('2024-03-10T03:00:00', { zone: 'America/New_York' });

      const result = service.validateSlotBusinessRules(start, end, 'America/New_York');

      expect(result.issues.some(issue => issue.type === 'dst_transition')).toBe(true);
    });
  });

  describe('crossesDSTTransition', () => {
    test('should detect DST transition crossing', () => {
      service.getDSTTransitions = jest.fn().mockReturnValue([
        {
          date: DateTime.fromISO('2024-03-10T02:00:00'),
          isDST: true
        }
      ]);

      const start = DateTime.fromISO('2024-03-10T01:00:00');
      const end = DateTime.fromISO('2024-03-10T03:00:00');

      const result = service.crossesDSTTransition(start, end, 'America/New_York');

      expect(result).toBe(true);
    });

    test('should return false when no transition crossed', () => {
      service.getDSTTransitions = jest.fn().mockReturnValue([]);

      const start = DateTime.fromISO('2024-01-01T10:00:00');
      const end = DateTime.fromISO('2024-01-01T11:00:00');

      const result = service.crossesDSTTransition(start, end, 'America/New_York');

      expect(result).toBe(false);
    });
  });

  describe('findSimilarTimezone', () => {
    test('should find exact matches', () => {
      expect(service.findSimilarTimezone('America/Buenos_Aires')).toBe('America/Buenos_Aires');
    });

    test('should find common name mappings', () => {
      expect(service.findSimilarTimezone('Buenos Aires')).toBe('America/Buenos_Aires');
      expect(service.findSimilarTimezone('New York')).toBe('America/New_York');
      expect(service.findSimilarTimezone('London')).toBe('Europe/London');
      expect(service.findSimilarTimezone('Tokyo')).toBe('Asia/Tokyo');
    });

    test('should return null for unknown timezones', () => {
      expect(service.findSimilarTimezone('Unknown City')).toBe(null);
    });
  });

  describe('formatForAPI', () => {
    test('should format DateTime for API response', () => {
      const dateTime = DateTime.fromISO('2024-01-01T12:00:00', { zone: 'America/Buenos_Aires' });

      const result = service.formatForAPI(dateTime);

      expect(result).toHaveProperty('utc');
      expect(result).toHaveProperty('local');
      expect(result).toHaveProperty('timezone');
      expect(result).toHaveProperty('offset');
      expect(result).toHaveProperty('isDST');
      expect(result).toHaveProperty('formatted');
      expect(result.formatted.date).toBe('2024-01-01');
      expect(result.formatted.time).toBe('12:00:00');
    });
  });
});
