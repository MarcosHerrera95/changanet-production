/**
 * Unit Tests for Conflict Detection Service
 * Tests overlap detection, double booking prevention, blocked slots, and business rule validation
 */

const { DateTime } = require('luxon');
const conflictDetectionService = require('../../../services/conflictDetectionService');

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    availability_slots: {
      findMany: jest.fn(),
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

describe('ConflictDetectionService', () => {
  let service;

  beforeEach(() => {
    service = new (require('../../../services/conflictDetectionService').constructor)();
    jest.clearAllMocks();
  });

  describe('detectConflicts', () => {
    test('should detect slot conflicts', async () => {
      const entity = { id: 'slot-1', professional_id: 'prof-1' };
      service.detectSlotConflicts = jest.fn().mockResolvedValue(['conflict1']);

      const result = await service.detectConflicts(entity, 'slot');

      expect(result).toEqual(['conflict1']);
      expect(service.detectSlotConflicts).toHaveBeenCalledWith(entity, {});
    });

    test('should detect appointment conflicts', async () => {
      const entity = { id: 'appt-1', professional_id: 'prof-1' };
      service.detectAppointmentConflicts = jest.fn().mockResolvedValue(['conflict1']);

      const result = await service.detectConflicts(entity, 'appointment');

      expect(result).toEqual(['conflict1']);
      expect(service.detectAppointmentConflicts).toHaveBeenCalledWith(entity, {});
    });

    test('should detect block conflicts', async () => {
      const entity = { id: 'block-1', professional_id: 'prof-1' };
      service.detectBlockConflicts = jest.fn().mockResolvedValue(['conflict1']);

      const result = await service.detectConflicts(entity, 'block');

      expect(result).toEqual(['conflict1']);
      expect(service.detectBlockConflicts).toHaveBeenCalledWith(entity, {});
    });

    test('should throw error for unknown entity type', async () => {
      const entity = { id: 'unknown-1' };

      await expect(service.detectConflicts(entity, 'unknown'))
        .rejects.toThrow('Unknown entity type: unknown');
    });

    test('should apply conflict resolution', async () => {
      const entity = { id: 'slot-1', professional_id: 'prof-1' };
      const conflicts = ['conflict1'];
      service.detectSlotConflicts = jest.fn().mockResolvedValue(conflicts);
      service.resolveConflicts = jest.fn().mockResolvedValue(['resolved1']);

      const result = await service.detectConflicts(entity, 'slot');

      expect(service.resolveConflicts).toHaveBeenCalledWith(conflicts, {});
      expect(result).toEqual(['resolved1']);
    });
  });

  describe('detectSlotConflicts', () => {
    const slot = {
      id: 'slot-1',
      professional_id: 'prof-1',
      start_time: new Date('2024-01-01T10:00:00Z'),
      end_time: new Date('2024-01-01T11:00:00Z'),
    };

    beforeEach(() => {
      service.checkBusinessRuleViolations = jest.fn().mockResolvedValue([]);
    });

    test('should detect overlapping slots', async () => {
      prisma.availability_slots.findMany.mockResolvedValueOnce([
        {
          id: 'slot-2',
          start_time: new Date('2024-01-01T10:30:00Z'),
          end_time: new Date('2024-01-01T11:30:00Z'),
        }
      ]);

      const conflicts = await service.detectSlotConflicts(slot);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('slot_overlap');
      expect(conflicts[0].severity).toBe('high');
    });

    test('should detect blocked time conflicts', async () => {
      prisma.availability_slots.findMany.mockResolvedValueOnce([]);
      prisma.blocked_slots.findMany.mockResolvedValueOnce([
        {
          id: 'block-1',
          reason: 'Meeting',
          start_time: new Date('2024-01-01T09:00:00Z'),
          end_time: new Date('2024-01-01T12:00:00Z'),
        }
      ]);

      const conflicts = await service.detectSlotConflicts(slot);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('blocked_time');
      expect(conflicts[0].severity).toBe('critical');
    });

    test('should include business rule violations', async () => {
      prisma.availability_slots.findMany.mockResolvedValueOnce([]);
      prisma.blocked_slots.findMany.mockResolvedValueOnce([]);
      service.checkBusinessRuleViolations.mockResolvedValueOnce([
        {
          type: 'business_rule_violation',
          severity: 'medium',
          message: 'Test violation'
        }
      ]);

      const conflicts = await service.detectSlotConflicts(slot);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('business_rule_violation');
    });

    test('should return empty array when no conflicts', async () => {
      prisma.availability_slots.findMany.mockResolvedValueOnce([]);
      prisma.blocked_slots.findMany.mockResolvedValueOnce([]);

      const conflicts = await service.detectSlotConflicts(slot);

      expect(conflicts).toEqual([]);
    });
  });

  describe('detectAppointmentConflicts', () => {
    const appointment = {
      id: 'appt-1',
      professional_id: 'prof-1',
      client_id: 'client-1',
      scheduled_start: new Date('2024-01-01T10:00:00Z'),
      scheduled_end: new Date('2024-01-01T11:00:00Z'),
      slot_id: 'slot-1',
    };

    beforeEach(() => {
      service.checkBusinessRuleViolations = jest.fn().mockResolvedValue([]);
    });

    test('should detect professional double booking', async () => {
      prisma.appointments.findMany
        .mockResolvedValueOnce([
          {
            id: 'appt-2',
            title: 'Existing appointment',
            scheduled_start: new Date('2024-01-01T10:30:00Z'),
            scheduled_end: new Date('2024-01-01T11:30:00Z'),
            client: { nombre: 'Client 2' }
          }
        ])
        .mockResolvedValueOnce([]); // Client conflicts

      const conflicts = await service.detectAppointmentConflicts(appointment);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('double_booking');
      expect(conflicts[0].severity).toBe('critical');
    });

    test('should detect client conflicts when checkClientConflicts is true', async () => {
      prisma.appointments.findMany
        .mockResolvedValueOnce([]) // Professional conflicts
        .mockResolvedValueOnce([
          {
            id: 'appt-2',
            title: 'Client conflict',
            scheduled_start: new Date('2024-01-01T10:30:00Z'),
            scheduled_end: new Date('2024-01-01T11:30:00Z'),
            professional: { nombre: 'Professional 2' }
          }
        ]);

      const conflicts = await service.detectAppointmentConflicts(appointment);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('double_booking');
      expect(conflicts[0].severity).toBe('medium');
    });

    test('should skip client conflicts when checkClientConflicts is false', async () => {
      prisma.appointments.findMany
        .mockResolvedValueOnce([]) // Professional conflicts
        .mockResolvedValueOnce([
          {
            id: 'appt-2',
            title: 'Client conflict',
            scheduled_start: new Date('2024-01-01T10:30:00Z'),
            scheduled_end: new Date('2024-01-01T11:30:00Z'),
            professional: { nombre: 'Professional 2' }
          }
        ]);

      const conflicts = await service.detectAppointmentConflicts(appointment, { checkClientConflicts: false });

      expect(conflicts).toEqual([]);
    });

    test('should detect unavailable slot', async () => {
      prisma.appointments.findMany
        .mockResolvedValueOnce([]) // Professional conflicts
        .mockResolvedValueOnce([]); // Client conflicts

      prisma.availability_slots.findUnique.mockResolvedValueOnce({
        id: 'slot-1',
        status: 'booked'
      });

      const conflicts = await service.detectAppointmentConflicts(appointment);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('resource_constraint');
      expect(conflicts[0].severity).toBe('critical');
    });

    test('should handle non-existent slot', async () => {
      prisma.appointments.findMany
        .mockResolvedValueOnce([]) // Professional conflicts
        .mockResolvedValueOnce([]); // Client conflicts

      prisma.availability_slots.findUnique.mockResolvedValueOnce(null);

      const conflicts = await service.detectAppointmentConflicts(appointment);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('resource_constraint');
      expect(conflicts[0].message).toContain('not_found');
    });
  });

  describe('detectBlockConflicts', () => {
    const block = {
      id: 'block-1',
      professional_id: 'prof-1',
      start_time: new Date('2024-01-01T10:00:00Z'),
      end_time: new Date('2024-01-01T12:00:00Z'),
    };

    test('should detect affected appointments', async () => {
      prisma.appointments.findMany.mockResolvedValueOnce([
        {
          id: 'appt-1',
          title: 'Test appointment',
          scheduled_start: new Date('2024-01-01T10:30:00Z'),
          scheduled_end: new Date('2024-01-01T11:30:00Z'),
          client: { nombre: 'Client 1' }
        }
      ]);

      const conflicts = await service.detectBlockConflicts(block);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('double_booking');
      expect(conflicts[0].severity).toBe('critical');
    });

    test('should use medium severity when allowOverride is true', async () => {
      prisma.appointments.findMany.mockResolvedValueOnce([
        {
          id: 'appt-1',
          title: 'Test appointment',
          scheduled_start: new Date('2024-01-01T10:30:00Z'),
          scheduled_end: new Date('2024-01-01T11:30:00Z'),
          client: { nombre: 'Client 1' }
        }
      ]);

      const conflicts = await service.detectBlockConflicts(block, { allowOverride: true });

      expect(conflicts[0].severity).toBe('medium');
    });

    test('should detect affected available slots', async () => {
      prisma.appointments.findMany.mockResolvedValueOnce([]);
      prisma.availability_slots.findMany.mockResolvedValueOnce([
        {
          id: 'slot-1',
          start_time: new Date('2024-01-01T10:00:00Z'),
          end_time: new Date('2024-01-01T11:00:00Z'),
        },
        {
          id: 'slot-2',
          start_time: new Date('2024-01-01T11:00:00Z'),
          end_time: new Date('2024-01-01T12:00:00Z'),
        }
      ]);

      const conflicts = await service.detectBlockConflicts(block);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('resource_constraint');
      expect(conflicts[0].severity).toBe('medium');
    });
  });

  describe('checkBusinessRuleViolations', () => {
    test('should detect too soon appointments', async () => {
      const entity = {
        scheduled_start: DateTime.now().plus({ hours: 1 }).toJSDate(), // Less than 24 hours
        scheduled_end: DateTime.now().plus({ hours: 2 }).toJSDate(),
      };

      const conflicts = await service.checkBusinessRuleViolations(entity, 'appointment');

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('business_rule_violation');
      expect(conflicts[0].severity).toBe('medium');
      expect(conflicts[0].message).toContain('too soon');
    });

    test('should detect too far advance bookings', async () => {
      const entity = {
        scheduled_start: DateTime.now().plus({ days: 100 }).toJSDate(), // More than 90 days
        scheduled_end: DateTime.now().plus({ days: 100, hours: 1 }).toJSDate(),
      };

      const conflicts = await service.checkBusinessRuleViolations(entity, 'appointment');

      expect(conflicts.some(c => c.message.includes('too far in advance'))).toBe(true);
    });

    test('should detect outside business hours', async () => {
      const entity = {
        scheduled_start: DateTime.now().set({ hour: 6 }).toJSDate(), // 6 AM
        scheduled_end: DateTime.now().set({ hour: 7 }).toJSDate(),
      };

      const conflicts = await service.checkBusinessRuleViolations(entity, 'appointment');

      expect(conflicts.some(c => c.message.includes('outside business hours'))).toBe(true);
    });

    test('should detect duration too long', async () => {
      const entity = {
        scheduled_start: DateTime.now().plus({ days: 1 }).toJSDate(),
        scheduled_end: DateTime.now().plus({ days: 1, hours: 10 }).toJSDate(), // 10 hours
      };

      const conflicts = await service.checkBusinessRuleViolations(entity, 'appointment');

      expect(conflicts.some(c => c.message.includes('duration exceeds 8 hours'))).toBe(true);
    });

    test('should detect negative price', async () => {
      const entity = {
        price: -100,
      };

      const conflicts = await service.checkBusinessRuleViolations(entity, 'appointment');

      expect(conflicts.some(c => c.message.includes('cannot be negative'))).toBe(true);
    });

    test('should handle slot entities', async () => {
      const entity = {
        start_time: DateTime.now().plus({ hours: 1 }).toJSDate(),
        end_time: DateTime.now().plus({ hours: 2 }).toJSDate(),
      };

      const conflicts = await service.checkBusinessRuleViolations(entity, 'slot');

      expect(conflicts.some(c => c.message.includes('too soon'))).toBe(true);
    });
  });

  describe('resolveConflicts', () => {
    test('should apply resolution strategies', async () => {
      const conflicts = [
        { type: 'slot_overlap', severity: 'high' },
        { type: 'blocked_time', severity: 'critical' }
      ];

      service.applyResolutionStrategy = jest.fn()
        .mockResolvedValueOnce({ action: 'warn', message: 'Warning applied' })
        .mockResolvedValueOnce({ action: 'block', message: 'Blocking' });

      const resolved = await service.resolveConflicts(conflicts);

      expect(resolved).toHaveLength(2);
      expect(resolved[0].resolution.action).toBe('warn');
      expect(resolved[1].resolution.action).toBe('block');
    });

    test('should ignore conflicts with ignore action', async () => {
      const conflicts = [
        { type: 'slot_overlap', severity: 'low' }
      ];

      service.applyResolutionStrategy = jest.fn()
        .mockResolvedValue({ action: 'ignore', message: 'Ignored' });

      const resolved = await service.resolveConflicts(conflicts);

      expect(resolved).toHaveLength(0);
    });
  });

  describe('applyResolutionStrategy', () => {
    test('should block critical conflicts in strict mode', async () => {
      const conflict = { type: 'blocked_time', severity: 'critical' };

      const resolution = await service.applyResolutionStrategy(conflict, { resolutionStrategy: 'strict' });

      expect(resolution.action).toBe('block');
      expect(resolution.message).toContain('must be resolved');
    });

    test('should warn for medium severity in warn mode', async () => {
      const conflict = { type: 'business_rule_violation', severity: 'medium' };

      const resolution = await service.applyResolutionStrategy(conflict, { resolutionStrategy: 'warn' });

      expect(resolution.action).toBe('warn');
    });

    test('should block critical conflicts even in warn mode', async () => {
      const conflict = { type: 'double_booking', severity: 'critical' };

      const resolution = await service.applyResolutionStrategy(conflict, { resolutionStrategy: 'warn' });

      expect(resolution.action).toBe('block');
    });

    test('should auto-resolve slot overlaps', async () => {
      const conflict = {
        type: 'slot_overlap',
        details: { overlappingSlots: ['slot1', 'slot2'] }
      };

      service.autoResolveConflict = jest.fn().mockResolvedValue({
        action: 'auto_adjust',
        message: 'Auto-adjusted'
      });

      const resolution = await service.applyResolutionStrategy(conflict, { resolutionStrategy: 'auto_resolve' });

      expect(service.autoResolveConflict).toHaveBeenCalledWith(conflict, { resolutionStrategy: 'auto_resolve' });
      expect(resolution.action).toBe('auto_adjust');
    });

    test('should handle unknown strategy', async () => {
      const conflict = { type: 'unknown', severity: 'low' };

      const resolution = await service.applyResolutionStrategy(conflict, { resolutionStrategy: 'unknown' });

      expect(resolution.action).toBe('block');
      expect(resolution.message).toContain('Unknown resolution strategy');
    });
  });

  describe('autoResolveConflict', () => {
    test('should auto-adjust slot overlaps', async () => {
      const conflict = {
        type: 'slot_overlap',
        details: { overlappingSlots: ['slot1', 'slot2'] }
      };

      const resolution = await service.autoResolveConflict(conflict);

      expect(resolution.action).toBe('auto_adjust');
      expect(resolution.message).toContain('Automatically adjusted');
      expect(resolution.adjustments).toEqual(['slot1', 'slot2']);
    });

    test('should auto-remove blocked time conflicts', async () => {
      const conflict = {
        type: 'blocked_time',
        details: { blockedTimes: ['block1', 'block2'] }
      };

      const resolution = await service.autoResolveConflict(conflict);

      expect(resolution.action).toBe('auto_remove');
      expect(resolution.message).toContain('Automatically removed');
      expect(resolution.removedItems).toEqual(['block1', 'block2']);
    });

    test('should not auto-resolve unknown conflict types', async () => {
      const conflict = {
        type: 'unknown_conflict'
      };

      const resolution = await service.autoResolveConflict(conflict);

      expect(resolution.action).toBe('block');
      expect(resolution.message).toContain('Cannot automatically resolve');
    });
  });

  describe('validateEntity', () => {
    test('should validate entity and return result', async () => {
      const entity = { id: 'test-entity' };
      const conflicts = [
        { type: 'test', severity: 'low' },
        { type: 'critical', severity: 'critical' }
      ];

      service.detectConflicts = jest.fn().mockResolvedValue(conflicts);

      const result = await service.validateEntity(entity, 'slot');

      expect(result.valid).toBe(false);
      expect(result.conflicts).toEqual(conflicts);
      expect(result.criticalConflicts).toHaveLength(1);
      expect(result.canProceed).toBe(false);
      expect(result.summary.totalConflicts).toBe(2);
      expect(result.summary.criticalCount).toBe(1);
    });

    test('should allow proceeding when allowCriticalConflicts is true', async () => {
      const entity = { id: 'test-entity' };
      const conflicts = [
        { type: 'critical', severity: 'critical' }
      ];

      service.detectConflicts = jest.fn().mockResolvedValue(conflicts);

      const result = await service.validateEntity(entity, 'slot', { allowCriticalConflicts: true });

      expect(result.valid).toBe(true);
      expect(result.canProceed).toBe(true);
    });

    test('should return valid result when no conflicts', async () => {
      const entity = { id: 'test-entity' };

      service.detectConflicts = jest.fn().mockResolvedValue([]);

      const result = await service.validateEntity(entity, 'slot');

      expect(result.valid).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.conflicts).toEqual([]);
    });
  });

  describe('getConflictStatistics', () => {
    test('should return conflict statistics', async () => {
      const professionalId = 'prof-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      prisma.availability_slots.findMany.mockResolvedValue([
        { id: 'slot-1' }, { id: 'slot-2' }, { id: 'slot-3' }
      ]);
      prisma.appointments.findMany.mockResolvedValue([
        { id: 'appt-1' }, { id: 'appt-2' }
      ]);
      prisma.blocked_slots.findMany.mockResolvedValue([
        { id: 'block-1' }
      ]);

      const result = await service.getConflictStatistics(professionalId, { start: startDate, end: endDate });

      expect(result.period.startDate).toEqual(startDate);
      expect(result.period.endDate).toEqual(endDate);
      expect(result.statistics.totalSlots).toBe(3);
      expect(result.statistics.totalAppointments).toBe(2);
      expect(result.statistics.totalBlocks).toBe(1);
    });

    test('should use default date range when not provided', async () => {
      const professionalId = 'prof-1';

      prisma.availability_slots.findMany.mockResolvedValue([]);
      prisma.appointments.findMany.mockResolvedValue([]);
      prisma.blocked_slots.findMany.mockResolvedValue([]);

      const result = await service.getConflictStatistics(professionalId);

      expect(result.period.startDate).toBeInstanceOf(Date);
      expect(result.period.endDate).toBeInstanceOf(Date);
      expect(result.period.endDate > result.period.startDate).toBe(true);
    });
  });

  describe('clearCache', () => {
    test('should clear conflict cache', () => {
      // Add some mock data to cache
      service.conflictCache.set('key1', 'value1');
      service.conflictCache.set('key2', 'value2');

      service.clearCache();

      expect(service.conflictCache.size).toBe(0);
    });
  });
});
