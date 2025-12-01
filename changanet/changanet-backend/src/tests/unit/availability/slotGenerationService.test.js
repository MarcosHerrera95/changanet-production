/**
 * Unit Tests for Slot Generation Service
 * Tests recurrence patterns, validations, business rules, and conflict detection
 */

const { DateTime } = require('luxon');
const slotGenerationService = require('../../../services/slotGenerationService');

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    professionals_availability: {
      findUnique: jest.fn(),
    },
    availability_slots: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    appointments: {
      findMany: jest.fn(),
    },
    blocked_slots: {
      findMany: jest.fn(),
    },
  })),
}));

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('SlotGenerationService', () => {
  let service;

  beforeEach(() => {
    service = new (require('../../../services/slotGenerationService').constructor)();
    jest.clearAllMocks();
  });

  describe('validateDateRange', () => {
    test('should validate valid date range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-15');

      expect(() => service.validateDateRange(startDate, endDate)).not.toThrow();
    });

    test('should throw error for date range too large', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-02-15'); // 46 days

      expect(() => service.validateDateRange(startDate, endDate)).toThrow('Date range too large');
    });

    test('should throw error for invalid date order', () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-01');

      expect(() => service.validateDateRange(startDate, endDate)).toThrow('Start date must be before end date');
    });
  });

  describe('generateSlotsByRecurrence', () => {
    const baseConfig = {
      id: 'config-1',
      professional_id: 'prof-1',
      timezone: 'America/Buenos_Aires',
      start_time: '09:00',
      end_time: '17:00',
      duration_minutes: 60,
      recurrence_type: 'daily',
      recurrence_config: JSON.stringify({}),
    };

    test('should generate single occurrence slots', () => {
      const config = { ...baseConfig, recurrence_type: 'none' };
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');

      const slots = service.generateSlotsByRecurrence(config, startDate, endDate);

      expect(slots).toHaveLength(1);
      expect(slots[0].professional_id).toBe('prof-1');
    });

    test('should generate daily recurring slots', () => {
      const config = { ...baseConfig, recurrence_type: 'daily' };
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      const slots = service.generateSlotsByRecurrence(config, startDate, endDate);

      expect(slots.length).toBeGreaterThan(1);
      expect(slots[0].start_time.toISODate()).toBe('2024-01-01');
    });

    test('should generate weekly recurring slots', () => {
      const config = {
        ...baseConfig,
        recurrence_type: 'weekly',
        recurrence_config: JSON.stringify({ weekdays: [1, 3, 5] }) // Mon, Wed, Fri
      };
      const startDate = new Date('2024-01-01'); // Monday
      const endDate = new Date('2024-01-08');

      const slots = service.generateSlotsByRecurrence(config, startDate, endDate);

      expect(slots.length).toBeGreaterThan(0);
      // Should only include Mon, Wed, Fri
      const weekdays = slots.map(slot => slot.start_time.weekday);
      expect(weekdays.every(day => [1, 3, 5].includes(day))).toBe(true);
    });

    test('should generate monthly recurring slots', () => {
      const config = { ...baseConfig, recurrence_type: 'monthly' };
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-03-01');

      const slots = service.generateSlotsByRecurrence(config, startDate, endDate);

      expect(slots.length).toBeGreaterThan(0);
      // Should have slots in January and February
    });

    test('should throw error for unsupported recurrence type', () => {
      const config = { ...baseConfig, recurrence_type: 'unsupported' };
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');

      expect(() => service.generateSlotsByRecurrence(config, startDate, endDate))
        .toThrow('Unsupported recurrence type: unsupported');
    });
  });

  describe('generateSlotsForDay', () => {
    const config = {
      id: 'config-1',
      professional_id: 'prof-1',
      timezone: 'America/Buenos_Aires',
      start_time: '09:00',
      end_time: '17:00',
      duration_minutes: 60,
    };

    test('should generate slots for a full day', () => {
      const date = DateTime.fromISO('2024-01-01', { zone: 'America/Buenos_Aires' });

      const slots = service.generateSlotsForDay(config, date);

      expect(slots.length).toBe(8); // 9 AM to 5 PM = 8 hours
      expect(slots[0].start_time.hour).toBe(9);
      expect(slots[slots.length - 1].start_time.hour).toBe(16); // Last slot starts at 4 PM
    });

    test('should respect buffer time between slots', () => {
      const date = DateTime.fromISO('2024-01-01', { zone: 'America/Buenos_Aires' });

      const slots = service.generateSlotsForDay(config, date);

      // Check that slots don't overlap (considering buffer time)
      for (let i = 1; i < slots.length; i++) {
        const previousEnd = slots[i - 1].end_time;
        const currentStart = slots[i].start_time;
        const bufferMs = service.businessRules.bufferTime * 60 * 1000;

        expect(currentStart.toMillis() - previousEnd.toMillis()).toBeGreaterThanOrEqual(bufferMs);
      }
    });

    test('should not create slots that extend beyond end time', () => {
      const config = {
        ...config,
        start_time: '16:00', // Late start
        end_time: '17:30',   // Short window
        duration_minutes: 120, // 2 hours
      };
      const date = DateTime.fromISO('2024-01-01', { zone: 'America/Buenos_Aires' });

      const slots = service.generateSlotsForDay(config, date);

      expect(slots.length).toBe(0); // No slots should be created as they would extend beyond end time
    });
  });

  describe('applyBusinessRules', () => {
    const config = {
      id: 'config-1',
      professional_id: 'prof-1',
      meta: JSON.stringify({
        maxAdvanceBooking: 30, // days
        minAdvanceBooking: 1,  // day
      })
    };

    beforeEach(() => {
      // Mock conflict checking methods
      service.checkSlotConflicts = jest.fn().mockResolvedValue(false);
      service.checkBlockedSlots = jest.fn().mockResolvedValue(false);
      service.applyCustomBusinessRules = jest.fn().mockReturnValue(true);
    });

    test('should apply maximum slots per day rule', async () => {
      const slots = Array.from({ length: 10 }, (_, i) => ({
        start_time: DateTime.now().plus({ days: 1, hours: i }),
        end_time: DateTime.now().plus({ days: 1, hours: i + 1 }),
        professional_id: 'prof-1',
        availability_config_id: 'config-1',
      }));

      const filteredSlots = await service.applyBusinessRules(slots, config);

      expect(filteredSlots.length).toBeLessThanOrEqual(service.businessRules.maxSlotsPerDay);
    });

    test('should filter out slots with conflicts', async () => {
      const slots = [
        {
          start_time: DateTime.now().plus({ days: 1 }),
          end_time: DateTime.now().plus({ days: 1, hours: 1 }),
          professional_id: 'prof-1',
          availability_config_id: 'config-1',
        }
      ];

      service.checkSlotConflicts.mockResolvedValueOnce(true);

      const filteredSlots = await service.applyBusinessRules(slots, config);

      expect(filteredSlots.length).toBe(0);
    });

    test('should filter out blocked slots', async () => {
      const slots = [
        {
          start_time: DateTime.now().plus({ days: 1 }),
          end_time: DateTime.now().plus({ days: 1, hours: 1 }),
          professional_id: 'prof-1',
          availability_config_id: 'config-1',
        }
      ];

      service.checkBlockedSlots.mockResolvedValueOnce(true);

      const filteredSlots = await service.applyBusinessRules(slots, config);

      expect(filteredSlots.length).toBe(0);
    });

    test('should apply custom business rules from meta', async () => {
      const slots = [
        {
          start_time: DateTime.now().plus({ days: 40 }), // Beyond max advance booking
          end_time: DateTime.now().plus({ days: 40, hours: 1 }),
          professional_id: 'prof-1',
          availability_config_id: 'config-1',
        }
      ];

      service.applyCustomBusinessRules.mockReturnValueOnce(false);

      const filteredSlots = await service.applyBusinessRules(slots, config);

      expect(filteredSlots.length).toBe(0);
    });
  });

  describe('checkSlotConflicts', () => {
    test('should detect overlapping appointments', async () => {
      const slot = {
        start_time: new Date('2024-01-01T10:00:00Z'),
        end_time: new Date('2024-01-01T11:00:00Z'),
      };

      prisma.appointments.findMany.mockResolvedValueOnce([
        {
          id: 'appt-1',
          scheduled_start: new Date('2024-01-01T10:30:00Z'),
          scheduled_end: new Date('2024-01-01T11:30:00Z'),
        }
      ]);

      const hasConflict = await service.checkSlotConflicts(slot, 'prof-1');

      expect(hasConflict).toBe(true);
      expect(prisma.appointments.findMany).toHaveBeenCalledWith({
        where: {
          professional_id: 'prof-1',
          status: { in: ['scheduled', 'confirmed', 'in_progress'] },
          scheduled_start: { lt: slot.end_time },
          scheduled_end: { gt: slot.start_time }
        }
      });
    });

    test('should return false when no conflicts', async () => {
      const slot = {
        start_time: new Date('2024-01-01T10:00:00Z'),
        end_time: new Date('2024-01-01T11:00:00Z'),
      };

      prisma.appointments.findMany.mockResolvedValueOnce([]);

      const hasConflict = await service.checkSlotConflicts(slot, 'prof-1');

      expect(hasConflict).toBe(false);
    });
  });

  describe('checkBlockedSlots', () => {
    test('should detect blocked time overlaps', async () => {
      const slot = {
        start_time: new Date('2024-01-01T10:00:00Z'),
        end_time: new Date('2024-01-01T11:00:00Z'),
      };

      prisma.blocked_slots.findMany.mockResolvedValueOnce([
        {
          id: 'block-1',
          start_time: new Date('2024-01-01T09:00:00Z'),
          end_time: new Date('2024-01-01T12:00:00Z'),
        }
      ]);

      const isBlocked = await service.checkBlockedSlots(slot, 'prof-1');

      expect(isBlocked).toBe(true);
    });

    test('should return false when no blocked slots', async () => {
      const slot = {
        start_time: new Date('2024-01-01T10:00:00Z'),
        end_time: new Date('2024-01-01T11:00:00Z'),
      };

      prisma.blocked_slots.findMany.mockResolvedValueOnce([]);

      const isBlocked = await service.checkBlockedSlots(slot, 'prof-1');

      expect(isBlocked).toBe(false);
    });
  });

  describe('applyCustomBusinessRules', () => {
    test('should apply max advance booking rule', () => {
      const config = {
        meta: JSON.stringify({
          maxAdvanceBooking: 30
        })
      };

      const slot = {
        start_time: DateTime.now().plus({ days: 40 }) // Beyond limit
      };

      const result = service.applyCustomBusinessRules(slot, config);

      expect(result).toBe(false);
    });

    test('should apply min advance booking rule', () => {
      const config = {
        meta: JSON.stringify({
          minAdvanceBooking: 2
        })
      };

      const slot = {
        start_time: DateTime.now().plus({ hours: 1 }) // Too soon
      };

      const result = service.applyCustomBusinessRules(slot, config);

      expect(result).toBe(false);
    });

    test('should return true for valid slots', () => {
      const config = {
        meta: JSON.stringify({
          maxAdvanceBooking: 30,
          minAdvanceBooking: 1
        })
      };

      const slot = {
        start_time: DateTime.now().plus({ days: 7 }) // Within limits
      };

      const result = service.applyCustomBusinessRules(slot, config);

      expect(result).toBe(true);
    });

    test('should handle invalid JSON in meta', () => {
      const config = {
        meta: 'invalid json'
      };

      const slot = {
        start_time: DateTime.now().plus({ days: 7 })
      };

      const result = service.applyCustomBusinessRules(slot, config);

      expect(result).toBe(true); // Default to allowing
    });
  });

  describe('parseRecurrenceConfig', () => {
    test('should parse valid JSON string', () => {
      const configString = '{"weekdays": [1, 2, 3]}';

      const result = service.parseRecurrenceConfig(configString);

      expect(result).toEqual({ weekdays: [1, 2, 3] });
    });

    test('should return empty object for null/undefined', () => {
      expect(service.parseRecurrenceConfig(null)).toEqual({});
      expect(service.parseRecurrenceConfig(undefined)).toEqual({});
    });

    test('should return empty object for invalid JSON', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = service.parseRecurrenceConfig('invalid json');

      expect(result).toEqual({});
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('shouldIncludeDate', () => {
    test('should exclude dates in excludeDates array', () => {
      const date = DateTime.fromISO('2024-01-01');
      const recurrenceConfig = {
        excludeDates: ['2024-01-01']
      };

      const result = service.shouldIncludeDate(date, recurrenceConfig);

      expect(result).toBe(false);
    });

    test('should include dates in includeDates array', () => {
      const date = DateTime.fromISO('2024-01-01');
      const recurrenceConfig = {
        excludeDates: ['2024-01-01'],
        includeDates: ['2024-01-01']
      };

      const result = service.shouldIncludeDate(date, recurrenceConfig);

      expect(result).toBe(true); // includeDates overrides excludeDates
    });

    test('should include dates by default', () => {
      const date = DateTime.fromISO('2024-01-01');
      const recurrenceConfig = {};

      const result = service.shouldIncludeDate(date, recurrenceConfig);

      expect(result).toBe(true);
    });
  });

  describe('generateSlotsForConfig', () => {
    const mockConfig = {
      id: 'config-1',
      professional_id: 'prof-1',
      is_active: true,
      timezone: 'America/Buenos_Aires',
      recurrence_type: 'daily',
    };

    beforeEach(() => {
      prisma.professionals_availability.findUnique.mockResolvedValue(mockConfig);
      service.generateSlotsByRecurrence = jest.fn().mockReturnValue([]);
      service.applyBusinessRules = jest.fn().mockResolvedValue([]);
      service.cleanupExistingSlots = jest.fn().mockResolvedValue();
      service.bulkInsertSlots = jest.fn().mockResolvedValue([]);
    });

    test('should throw error for inactive config', async () => {
      prisma.professionals_availability.findUnique.mockResolvedValue({
        ...mockConfig,
        is_active: false
      });

      await expect(service.generateSlotsForConfig('config-1', new Date(), new Date()))
        .rejects.toThrow('Invalid or inactive availability configuration');
    });

    test('should validate date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');

      await service.generateSlotsForConfig('config-1', startDate, endDate);

      expect(service.validateDateRange).toHaveBeenCalledWith(startDate, endDate);
    });

    test('should call all generation steps', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');

      await service.generateSlotsForConfig('config-1', startDate, endDate);

      expect(service.generateSlotsByRecurrence).toHaveBeenCalled();
      expect(service.applyBusinessRules).toHaveBeenCalled();
      expect(service.cleanupExistingSlots).toHaveBeenCalled();
      expect(service.bulkInsertSlots).toHaveBeenCalled();
    });

    test('should return created slots', async () => {
      const expectedSlots = [{ id: 'slot-1' }];
      service.bulkInsertSlots.mockResolvedValue(expectedSlots);

      const result = await service.generateSlotsForConfig('config-1', new Date(), new Date());

      expect(result).toEqual(expectedSlots);
    });
  });

  describe('bulkInsertSlots', () => {
    test('should return empty array for no slots', async () => {
      const result = await service.bulkInsertSlots([]);

      expect(result).toEqual([]);
      expect(prisma.availability_slots.createMany).not.toHaveBeenCalled();
    });

    test('should convert DateTime objects and insert slots', async () => {
      const slots = [
        {
          professional_id: 'prof-1',
          availability_config_id: 'config-1',
          start_time: DateTime.fromISO('2024-01-01T10:00:00'),
          end_time: DateTime.fromISO('2024-01-01T11:00:00'),
          local_start_time: '10:00',
          local_end_time: '11:00',
          timezone: 'America/Buenos_Aires',
          status: 'available',
          is_available: true,
          meta: null
        }
      ];

      prisma.availability_slots.createMany.mockResolvedValue({ count: 1 });

      const result = await service.bulkInsertSlots(slots);

      expect(prisma.availability_slots.createMany).toHaveBeenCalledWith({
        data: [
          {
            professional_id: 'prof-1',
            availability_config_id: 'config-1',
            start_time: expect.any(Date),
            end_time: expect.any(Date),
            local_start_time: '10:00',
            local_end_time: '11:00',
            timezone: 'America/Buenos_Aires',
            status: 'available',
            is_available: true,
            meta: null
          }
        ],
        skipDuplicates: true
      });

      expect(result).toEqual({ count: 1 });
    });
  });

  describe('cleanupExistingSlots', () => {
    test('should delete existing available slots in date range', async () => {
      const professionalId = 'prof-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');

      await service.cleanupExistingSlots(professionalId, startDate, endDate);

      expect(prisma.availability_slots.deleteMany).toHaveBeenCalledWith({
        where: {
          professional_id: professionalId,
          start_time: {
            gte: startDate,
            lt: endDate
          },
          status: 'available'
        }
      });
    });
  });

  describe('createSlotObject', () => {
    test('should create properly formatted slot object', () => {
      const config = {
        id: 'config-1',
        professional_id: 'prof-1',
        timezone: 'America/Buenos_Aires'
      };

      const startDateTime = DateTime.fromISO('2024-01-01T10:00:00', { zone: 'America/Buenos_Aires' });
      const endDateTime = DateTime.fromISO('2024-01-01T11:00:00', { zone: 'America/Buenos_Aires' });

      const slot = service.createSlotObject(config, startDateTime, endDateTime);

      expect(slot).toEqual({
        professional_id: 'prof-1',
        availability_config_id: 'config-1',
        start_time: startDateTime,
        end_time: endDateTime,
        local_start_time: '10:00',
        local_end_time: '11:00',
        timezone: 'America/Buenos_Aires',
        status: 'available',
        is_available: true,
        meta: null
      });
    });
  });

  describe('Helper methods', () => {
    describe('parseTime', () => {
      test('should parse time string correctly', () => {
        const result = service.parseTime('14:30');

        expect(result).toEqual({ hours: 14, minutes: 30 });
      });
    });

    describe('addMinutes', () => {
      test('should add minutes without hour overflow', () => {
        const time = { hours: 10, minutes: 30 };
        const result = service.addMinutes(time, 30);

        expect(result).toEqual({ hours: 11, minutes: 0 });
      });

      test('should handle minute overflow correctly', () => {
        const time = { hours: 10, minutes: 45 };
        const result = service.addMinutes(time, 30);

        expect(result).toEqual({ hours: 11, minutes: 15 });
      });
    });
  });
});
