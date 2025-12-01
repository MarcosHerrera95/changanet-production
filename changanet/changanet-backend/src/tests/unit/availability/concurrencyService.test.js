/**
 * Unit Tests for Concurrency Service
 * Tests distributed locking mechanisms, race condition prevention, and lock management
 */

const concurrencyService = require('../../../services/concurrencyService');

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  })),
}));

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('ConcurrencyService', () => {
  let service;

  beforeEach(() => {
    service = new (require('../../../services/concurrencyService').constructor)();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('acquireLock', () => {
    test('should acquire lock successfully', async () => {
      service.acquireDatabaseLock = jest.fn().mockResolvedValue(true);
      service.scheduleLockCleanup = jest.fn();

      const result = await service.acquireLock('resource-1', 'lock-1');

      expect(result).toBe(true);
      expect(service.acquireDatabaseLock).toHaveBeenCalledWith('resource-1', 'lock-1', service.maxLockTime);
      expect(service.scheduleLockCleanup).toHaveBeenCalled();
    });

    test('should retry on failure and eventually succeed', async () => {
      service.acquireDatabaseLock
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      service.scheduleLockCleanup = jest.fn();
      service.delay = jest.fn().mockResolvedValue();

      const result = await service.acquireLock('resource-1', 'lock-1', { maxRetries: 2 });

      expect(result).toBe(true);
      expect(service.acquireDatabaseLock).toHaveBeenCalledTimes(2);
      expect(service.delay).toHaveBeenCalledTimes(1);
    });

    test('should fail after max retries', async () => {
      service.acquireDatabaseLock.mockResolvedValue(false);
      service.delay = jest.fn().mockResolvedValue();

      const result = await service.acquireLock('resource-1', 'lock-1', { maxRetries: 2 });

      expect(result).toBe(false);
      expect(service.acquireDatabaseLock).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    test('should use exponential backoff for retries', async () => {
      service.acquireDatabaseLock.mockResolvedValue(false);
      service.delay = jest.fn().mockResolvedValue();

      await service.acquireLock('resource-1', 'lock-1', { maxRetries: 2, retryDelay: 100 });

      expect(service.delay).toHaveBeenNthCalledWith(1, 100);
      expect(service.delay).toHaveBeenNthCalledWith(2, 200); // 100 * 2^1
    });
  });

  describe('releaseLock', () => {
    test('should release lock successfully', async () => {
      service.clearLockTimeout = jest.fn();
      service.releaseDatabaseLock = jest.fn().mockResolvedValue();

      const result = await service.releaseLock('resource-1', 'lock-1');

      expect(result).toBe(true);
      expect(service.clearLockTimeout).toHaveBeenCalledWith('resource-1', 'lock-1');
      expect(service.releaseDatabaseLock).toHaveBeenCalledWith('resource-1', 'lock-1');
    });

    test('should handle release errors gracefully', async () => {
      service.clearLockTimeout = jest.fn();
      service.releaseDatabaseLock = jest.fn().mockRejectedValue(new Error('DB error'));

      const result = await service.releaseLock('resource-1', 'lock-1');

      expect(result).toBe(false);
    });
  });

  describe('withLock', () => {
    test('should execute operation with lock and release afterwards', async () => {
      const operation = jest.fn().mockResolvedValue('result');
      service.acquireLock = jest.fn().mockResolvedValue(true);
      service.releaseLock = jest.fn().mockResolvedValue(true);
      service.generateLockId = jest.fn().mockReturnValue('lock-123');

      const result = await service.withLock('resource-1', operation);

      expect(result).toBe('result');
      expect(service.acquireLock).toHaveBeenCalledWith('resource-1', 'lock-123', {});
      expect(service.releaseLock).toHaveBeenCalledWith('resource-1', 'lock-123');
      expect(operation).toHaveBeenCalled();
    });

    test('should throw error if lock acquisition fails', async () => {
      const operation = jest.fn();
      service.acquireLock = jest.fn().mockResolvedValue(false);
      service.generateLockId = jest.fn().mockReturnValue('lock-123');

      await expect(service.withLock('resource-1', operation))
        .rejects.toThrow('Failed to acquire lock for resource: resource-1');

      expect(operation).not.toHaveBeenCalled();
    });

    test('should release lock even if operation throws', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      service.acquireLock = jest.fn().mockResolvedValue(true);
      service.releaseLock = jest.fn().mockResolvedValue(true);
      service.generateLockId = jest.fn().mockReturnValue('lock-123');

      await expect(service.withLock('resource-1', operation))
        .rejects.toThrow('Operation failed');

      expect(service.releaseLock).toHaveBeenCalledWith('resource-1', 'lock-123');
    });
  });

  describe('acquireDatabaseLock', () => {
    test('should acquire lock when no existing lock', async () => {
      prisma.$executeRaw.mockResolvedValue(1); // INSERT successful

      const result = await service.acquireDatabaseLock('resource-1', 'lock-1', 30000);

      expect(result).toBe(true);
      expect(prisma.$executeRaw).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO concurrency_locks'),
        expect.any(String),
        expect.any(String),
        expect.any(Date)
      );
    });

    test('should return false when lock already exists', async () => {
      const error = new Error('UNIQUE constraint failed');
      error.code = 'P2002';
      prisma.$executeRaw.mockRejectedValue(error);

      const result = await service.acquireDatabaseLock('resource-1', 'lock-1', 30000);

      expect(result).toBe(false);
    });

    test('should retry acquiring lock when expired lock is cleaned up', async () => {
      const error = new Error('UNIQUE constraint failed');
      error.code = 'P2002';

      // First attempt fails
      prisma.$executeRaw.mockRejectedValueOnce(error);
      prisma.$queryRaw.mockResolvedValueOnce([]); // SELECT returns no active locks
      prisma.$executeRaw.mockResolvedValueOnce(1); // DELETE expired lock
      prisma.$executeRaw.mockResolvedValueOnce(1); // INSERT successful

      service.forceReleaseExpiredLock = jest.fn();

      const result = await service.acquireDatabaseLock('resource-1', 'lock-1', 30000);

      expect(result).toBe(true);
      expect(service.forceReleaseExpiredLock).toHaveBeenCalled();
    });

    test('should throw unexpected errors', async () => {
      const error = new Error('Unexpected DB error');
      prisma.$executeRaw.mockRejectedValue(error);

      await expect(service.acquireDatabaseLock('resource-1', 'lock-1', 30000))
        .rejects.toThrow('Unexpected DB error');
    });
  });

  describe('releaseDatabaseLock', () => {
    test('should execute delete query', async () => {
      prisma.$executeRaw.mockResolvedValue(1);

      await service.releaseDatabaseLock('resource-1', 'lock-1');

      expect(prisma.$executeRaw).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM concurrency_locks'),
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('forceReleaseExpiredLock', () => {
    test('should delete expired locks', async () => {
      prisma.$executeRaw.mockResolvedValue(1);

      await service.forceReleaseExpiredLock('hashed-resource');

      expect(prisma.$executeRaw).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM concurrency_locks'),
        'hashed-resource',
        expect.anything()
      );
    });
  });

  describe('scheduleLockCleanup', () => {
    test('should schedule timeout for lock cleanup', () => {
      const timeoutSpy = jest.spyOn(global, 'setTimeout');

      service.scheduleLockCleanup('resource-1', 'lock-1', 5000);

      expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
      expect(service.lockTimeouts.has('resource-1:lock-1')).toBe(true);

      timeoutSpy.mockRestore();
    });

    test('should clear existing timeout before scheduling new one', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      service.lockTimeouts.set('resource-1:lock-1', 'old-timeout');

      service.scheduleLockCleanup('resource-1', 'lock-1', 5000);

      expect(clearTimeoutSpy).toHaveBeenCalledWith('old-timeout');

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('clearLockTimeout', () => {
    test('should clear existing timeout', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const mockTimeout = 'mock-timeout';
      service.lockTimeouts.set('resource-1:lock-1', mockTimeout);

      service.clearLockTimeout('resource-1', 'lock-1');

      expect(clearTimeoutSpy).toHaveBeenCalledWith(mockTimeout);
      expect(service.lockTimeouts.has('resource-1:lock-1')).toBe(false);

      clearTimeoutSpy.mockRestore();
    });

    test('should handle non-existent timeout gracefully', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      service.clearLockTimeout('resource-1', 'lock-1');

      expect(clearTimeoutSpy).not.toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('cleanupExpiredLocks', () => {
    test('should clean up expired database locks', async () => {
      prisma.$executeRaw.mockResolvedValue(1);

      await service.cleanupExpiredLocks();

      expect(prisma.$executeRaw).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM concurrency_locks')
      );
    });

    test('should clean up expired memory locks', async () => {
      const pastDate = new Date(Date.now() - 10000); // 10 seconds ago
      service.locks.set('key1', { expiresAt: pastDate });
      service.locks.set('key2', { expiresAt: new Date(Date.now() + 10000) }); // Future

      await service.cleanupExpiredLocks();

      expect(service.locks.has('key1')).toBe(false);
      expect(service.locks.has('key2')).toBe(true);
    });

    test('should clean up timeouts for non-existent locks', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      service.lockTimeouts.set('resource-1:lock-1', 'timeout-1');
      service.lockTimeouts.set('resource-2:lock-2', 'timeout-2');

      await service.cleanupExpiredLocks();

      // Should clear timeouts for locks that don't exist in memory
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);

      clearTimeoutSpy.mockRestore();
    });

    test('should handle cleanup errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      prisma.$executeRaw.mockRejectedValue(new Error('DB error'));

      await service.cleanupExpiredLocks();

      expect(consoleSpy).toHaveBeenCalledWith('Error in lock cleanup:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('isLocked', () => {
    test('should return true when resource is locked', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: 1 }]);

      const result = await service.isLocked('resource-1');

      expect(result).toBe(true);
    });

    test('should return false when resource is not locked', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: 0 }]);

      const result = await service.isLocked('resource-1');

      expect(result).toBe(false);
    });

    test('should handle query errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      prisma.$queryRaw.mockRejectedValue(new Error('Query error'));

      const result = await service.isLocked('resource-1');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('getLockInfo', () => {
    test('should return lock information for specific resource', async () => {
      const mockLocks = [
        {
          resource_key: 'hashed-key',
          lock_id: 'lock-1',
          expires_at: new Date(),
          created_at: new Date()
        }
      ];
      prisma.$queryRaw.mockResolvedValue(mockLocks);
      service.unhashResourceKey = jest.fn().mockReturnValue('resource-1');

      const result = await service.getLockInfo('resource-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('resourceKey', 'resource-1');
      expect(result[0]).toHaveProperty('lockId', 'lock-1');
    });

    test('should return all locks when no resource specified', async () => {
      const mockLocks = [
        {
          resource_key: 'key1',
          lock_id: 'lock-1',
          expires_at: new Date(),
          created_at: new Date()
        }
      ];
      prisma.$queryRaw.mockResolvedValue(mockLocks);

      const result = await service.getLockInfo();

      expect(result).toHaveLength(1);
    });

    test('should handle query errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      prisma.$queryRaw.mockRejectedValue(new Error('Query error'));

      const result = await service.getLockInfo();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('bookSlotWithLock', () => {
    test('should book slot successfully with locking', async () => {
      const mockAppointment = { id: 'appt-1' };
      const mockSlot = { id: 'slot-1', professional_id: 'prof-1' };

      service.withLock = jest.fn().mockImplementation(async (resourceKey, operation) => {
        return operation();
      });

      // Mock the operation function behavior
      prisma.availability_slots.findUnique.mockResolvedValue(mockSlot);
      prisma.appointments.create.mockResolvedValue(mockAppointment);
      prisma.availability_slots.update.mockResolvedValue({ ...mockSlot, status: 'booked' });

      const result = await service.bookSlotWithLock('slot-1', 'client-1', {
        title: 'Test appointment'
      });

      expect(service.withLock).toHaveBeenCalledWith('slot:slot-1', expect.any(Function), {
        timeout: 15000,
        maxRetries: 2
      });

      expect(result.success).toBe(true);
      expect(result.appointment).toEqual(mockAppointment);
      expect(result.slot.status).toBe('booked');
    });

    test('should throw error when slot is no longer available', async () => {
      service.withLock = jest.fn().mockImplementation(async (resourceKey, operation) => {
        return operation();
      });

      prisma.availability_slots.findUnique.mockResolvedValue({
        id: 'slot-1',
        status: 'booked'
      });

      await expect(service.bookSlotWithLock('slot-1', 'client-1', {}))
        .rejects.toThrow('Slot is no longer available');
    });
  });

  describe('withMultipleLocks', () => {
    test('should acquire multiple locks in sorted order', async () => {
      const operation = jest.fn().mockResolvedValue('result');
      service.acquireLock = jest.fn().mockResolvedValue(true);
      service.releaseLock = jest.fn().mockResolvedValue(true);
      service.generateLockId = jest.fn()
        .mockReturnValueOnce('lock-a')
        .mockReturnValueOnce('lock-b')
        .mockReturnValueOnce('lock-c');

      const result = await service.withMultipleLocks(['resource-c', 'resource-a', 'resource-b'], operation);

      expect(result).toBe('result');
      // Should acquire locks in sorted order
      expect(service.acquireLock).toHaveBeenNthCalledWith(1, 'resource-a', 'lock-a', {});
      expect(service.acquireLock).toHaveBeenNthCalledWith(2, 'resource-b', 'lock-b', {});
      expect(service.acquireLock).toHaveBeenNthCalledWith(3, 'resource-c', 'lock-c', {});
    });

    test('should release all locks even if operation fails', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      service.acquireLock = jest.fn().mockResolvedValue(true);
      service.releaseLock = jest.fn().mockResolvedValue(true);
      service.generateLockId = jest.fn().mockReturnValue('lock-1');

      await expect(service.withMultipleLocks(['resource-1', 'resource-2'], operation))
        .rejects.toThrow('Operation failed');

      expect(service.releaseLock).toHaveBeenCalledTimes(2);
    });

    test('should throw error if any lock acquisition fails', async () => {
      service.acquireLock
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false); // Second lock fails
      service.releaseLock = jest.fn().mockResolvedValue(true);
      service.generateLockId = jest.fn().mockReturnValue('lock-1');

      await expect(service.withMultipleLocks(['resource-1', 'resource-2'], () => {}))
        .rejects.toThrow('Failed to acquire all required locks');

      // Should release the successfully acquired lock
      expect(service.releaseLock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Utility methods', () => {
    describe('generateLockId', () => {
      test('should generate unique lock IDs', () => {
        const id1 = service.generateLockId();
        const id2 = service.generateLockId();

        expect(id1).not.toBe(id2);
        expect(typeof id1).toBe('string');
        expect(id1.length).toBeGreaterThan(0);
      });
    });

    describe('hashResourceKey', () => {
      test('should create consistent hash for resource keys', () => {
        const hash1 = service.hashResourceKey('resource-1');
        const hash2 = service.hashResourceKey('resource-1');

        expect(hash1).toBe(hash2);
        expect(typeof hash1).toBe('string');
        expect(hash1.length).toBe(16); // MD5 substring length
      });

      test('should create different hashes for different keys', () => {
        const hash1 = service.hashResourceKey('resource-1');
        const hash2 = service.hashResourceKey('resource-2');

        expect(hash1).not.toBe(hash2);
      });
    });

    describe('delay', () => {
      test('should delay execution', async () => {
        const start = Date.now();

        await service.delay(100);

        const end = Date.now();
        expect(end - start).toBeGreaterThanOrEqual(95); // Allow some tolerance
      });
    });
  });

  describe('shutdown', () => {
    test('should clear cleanup interval and timeouts', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      service.cleanupInterval = 'interval-id';
      service.lockTimeouts.set('key1', 'timeout1');
      service.lockTimeouts.set('key2', 'timeout2');

      service.shutdown();

      expect(clearIntervalSpy).toHaveBeenCalledWith('interval-id');
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);

      clearIntervalSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
    });
  });
});
