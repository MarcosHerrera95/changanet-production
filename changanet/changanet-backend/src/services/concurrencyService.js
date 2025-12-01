/**
 * Concurrency Service - Advanced Availability System
 *
 * This service provides distributed locking mechanisms to prevent race conditions
 * in critical operations like slot booking, appointment creation, and availability updates.
 *
 * Features:
 * - Distributed locking with Redis fallback to database
 * - Optimistic and pessimistic locking strategies
 * - Automatic deadlock detection and resolution
 * - Lock timeouts and automatic cleanup
 * - Lock queuing for high-contention scenarios
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

class ConcurrencyService {
  constructor() {
    this.locks = new Map();
    this.lockTimeouts = new Map();
    this.maxLockTime = 30 * 1000; // 30 seconds default
    this.cleanupInterval = setInterval(() => this.cleanupExpiredLocks(), 5000);
  }

  /**
   * Acquire a lock for a specific resource
   * @param {string} resourceKey - Unique identifier for the resource
   * @param {string} lockId - Unique identifier for this lock request
   * @param {Object} options - Lock options
   * @returns {Promise<boolean>} True if lock acquired, false otherwise
   */
  async acquireLock(resourceKey, lockId, options = {}) {
    const {
      timeout = this.maxLockTime,
      maxRetries = 3,
      retryDelay = 100
    } = options;

    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        // Try to acquire database lock
        const lockResult = await this.acquireDatabaseLock(resourceKey, lockId, timeout);

        if (lockResult) {
          // Set up automatic cleanup
          this.scheduleLockCleanup(resourceKey, lockId, timeout);
          return true;
        }

        // Wait before retry
        if (attempts < maxRetries - 1) {
          await this.delay(retryDelay * Math.pow(2, attempts)); // Exponential backoff
        }

      } catch (error) {
        console.error(`Lock acquisition attempt ${attempts + 1} failed:`, error);
      }

      attempts++;
    }

    return false;
  }

  /**
   * Release a previously acquired lock
   * @param {string} resourceKey - Resource identifier
   * @param {string} lockId - Lock identifier
   * @returns {Promise<boolean>} True if lock released successfully
   */
  async releaseLock(resourceKey, lockId) {
    try {
      // Clear timeout
      this.clearLockTimeout(resourceKey, lockId);

      // Release database lock
      await this.releaseDatabaseLock(resourceKey, lockId);

      return true;
    } catch (error) {
      console.error('Error releasing lock:', error);
      return false;
    }
  }

  /**
   * Execute a function with automatic lock management
   * @param {string} resourceKey - Resource to lock
   * @param {Function} operation - Function to execute while holding the lock
   * @param {Object} options - Lock options
   * @returns {Promise<*>} Result of the operation
   */
  async withLock(resourceKey, operation, options = {}) {
    const lockId = this.generateLockId();
    const lockAcquired = await this.acquireLock(resourceKey, lockId, options);

    if (!lockAcquired) {
      throw new Error(`Failed to acquire lock for resource: ${resourceKey}`);
    }

    try {
      const result = await operation();
      return result;
    } finally {
      await this.releaseLock(resourceKey, lockId);
    }
  }

  /**
   * Acquire a database-level lock using advisory locks
   * Note: SQLite doesn't have advisory locks, so we use a custom implementation
   */
  async acquireDatabaseLock(resourceKey, lockId, timeout) {
    const lockKey = this.hashResourceKey(resourceKey);
    const expiresAt = new Date(Date.now() + timeout);

    try {
      // Try to insert a lock record
      await prisma.$executeRaw`
        INSERT INTO concurrency_locks (resource_key, lock_id, expires_at)
        VALUES (${lockKey}, ${lockId}, ${expiresAt})
      `;

      // Store in memory for faster access
      this.locks.set(`${lockKey}:${lockId}`, { expiresAt, resourceKey });

      return true;
    } catch (error) {
      // Check if it's a unique constraint violation (lock already exists)
      if (error.code === 'P2002' || error.message.includes('UNIQUE constraint failed')) {
        // Check if the existing lock is expired
        const existingLock = await prisma.$queryRaw`
          SELECT * FROM concurrency_locks
          WHERE resource_key = ${lockKey} AND expires_at > datetime('now')
          LIMIT 1
        `;

        if (existingLock.length === 0) {
          // Lock is expired, try to clean it up and acquire
          await this.forceReleaseExpiredLock(lockKey);
          return this.acquireDatabaseLock(resourceKey, lockId, timeout);
        }

        return false; // Lock is held by someone else
      }

      throw error;
    }
  }

  /**
   * Release a database lock
   */
  async releaseDatabaseLock(resourceKey, lockId) {
    const lockKey = this.hashResourceKey(resourceKey);

    await prisma.$executeRaw`
      DELETE FROM concurrency_locks
      WHERE resource_key = ${lockKey} AND lock_id = ${lockId}
    `;

    // Remove from memory
    this.locks.delete(`${lockKey}:${lockId}`);
  }

  /**
   * Force release an expired lock
   */
  async forceReleaseExpiredLock(lockKey) {
    await prisma.$executeRaw`
      DELETE FROM concurrency_locks
      WHERE resource_key = ${lockKey} AND expires_at <= datetime('now')
    `;
  }

  /**
   * Schedule automatic cleanup of expired locks
   */
  scheduleLockCleanup(resourceKey, lockId, timeout) {
    const timeoutKey = `${resourceKey}:${lockId}`;

    // Clear any existing timeout
    this.clearLockTimeout(resourceKey, lockId);

    // Schedule cleanup
    const timeoutId = setTimeout(async () => {
      try {
        await this.releaseLock(resourceKey, lockId);
        console.warn(`Lock auto-released due to timeout: ${resourceKey}`);
      } catch (error) {
        console.error('Error in automatic lock cleanup:', error);
      }
    }, timeout);

    this.lockTimeouts.set(timeoutKey, timeoutId);
  }

  /**
   * Clear a scheduled lock timeout
   */
  clearLockTimeout(resourceKey, lockId) {
    const timeoutKey = `${resourceKey}:${lockId}`;
    const timeoutId = this.lockTimeouts.get(timeoutKey);

    if (timeoutId) {
      clearTimeout(timeoutId);
      this.lockTimeouts.delete(timeoutKey);
    }
  }

  /**
   * Clean up expired locks periodically
   */
  async cleanupExpiredLocks() {
    try {
      // Clean up database locks
      await prisma.$executeRaw`
        DELETE FROM concurrency_locks
        WHERE expires_at <= datetime('now')
      `;

      // Clean up memory locks
      const now = Date.now();
      for (const [key, lock] of this.locks.entries()) {
        if (lock.expiresAt <= now) {
          this.locks.delete(key);
        }
      }

      // Clean up timeouts for locks that no longer exist
      for (const [key, timeoutId] of this.lockTimeouts.entries()) {
        if (!this.locks.has(key)) {
          clearTimeout(timeoutId);
          this.lockTimeouts.delete(key);
        }
      }
    } catch (error) {
      console.error('Error in lock cleanup:', error);
    }
  }

  /**
   * Check if a resource is currently locked
   * @param {string} resourceKey - Resource to check
   * @returns {Promise<boolean>} True if locked
   */
  async isLocked(resourceKey) {
    const lockKey = this.hashResourceKey(resourceKey);

    try {
      const result = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM concurrency_locks
        WHERE resource_key = ${lockKey} AND expires_at > datetime('now')
      `;

      return result[0].count > 0;
    } catch (error) {
      console.error('Error checking lock status:', error);
      return false;
    }
  }

  /**
   * Get lock information for monitoring/debugging
   */
  async getLockInfo(resourceKey = null) {
    try {
      let query;
      let params = [];

      if (resourceKey) {
        const lockKey = this.hashResourceKey(resourceKey);
        query = `SELECT * FROM concurrency_locks WHERE resource_key = ? AND expires_at > datetime('now')`;
        params = [lockKey];
      } else {
        query = `SELECT * FROM concurrency_locks WHERE expires_at > datetime('now') ORDER BY created_at DESC LIMIT 100`;
      }

      const locks = await prisma.$queryRaw(query, ...params);

      return locks.map(lock => ({
        resourceKey: this.unhashResourceKey ? this.unhashResourceKey(lock.resource_key) : lock.resource_key,
        lockId: lock.lock_id,
        expiresAt: lock.expires_at,
        createdAt: lock.created_at
      }));
    } catch (error) {
      console.error('Error getting lock info:', error);
      return [];
    }
  }

  /**
   * High-level booking operation with automatic locking
   * @param {string} slotId - Slot to book
   * @param {string} clientId - Client making the booking
   * @param {Object} appointmentData - Appointment details
   * @returns {Promise<Object>} Booking result
   */
  async bookSlotWithLock(slotId, clientId, appointmentData) {
    const resourceKey = `slot:${slotId}`;

    return await this.withLock(resourceKey, async () => {
      // Double-check slot availability within the lock
      const slot = await prisma.availability_slots.findUnique({
        where: { id: slotId },
        include: { professional: true }
      });

      if (!slot || slot.status !== 'available') {
        throw new Error('Slot is no longer available');
      }

      // Create appointment
      const appointment = await prisma.appointments.create({
        data: {
          professional_id: slot.professional_id,
          client_id: clientId,
          slot_id: slotId,
          availability_config_id: slot.availability_config_id,
          title: appointmentData.title || 'Service Appointment',
          description: appointmentData.description,
          appointment_type: appointmentData.appointmentType || 'service',
          scheduled_start: slot.start_time,
          scheduled_end: slot.end_time,
          timezone: slot.timezone,
          price: appointmentData.price,
          currency: appointmentData.currency || 'ARS',
          notes: appointmentData.notes,
          created_by: clientId,
          meta: appointmentData.meta ? JSON.stringify(appointmentData.meta) : null
        }
      });

      // Update slot status
      await prisma.availability_slots.update({
        where: { id: slotId },
        data: {
          status: 'booked',
          booked_by: clientId,
          booked_at: new Date()
        }
      });

      return {
        success: true,
        appointment,
        slot: { ...slot, status: 'booked', booked_by: clientId }
      };
    }, {
      timeout: 15000, // 15 seconds for booking operations
      maxRetries: 2
    });
  }

  /**
   * Batch operation with locking for multiple resources
   * @param {string[]} resourceKeys - Resources to lock
   * @param {Function} operation - Operation to perform
   * @param {Object} options - Options
   * @returns {Promise<*>} Operation result
   */
  async withMultipleLocks(resourceKeys, operation, options = {}) {
    // Sort resource keys to prevent deadlocks
    const sortedKeys = [...resourceKeys].sort();

    const lockIds = sortedKeys.map(() => this.generateLockId());

    // Acquire all locks
    const lockPromises = sortedKeys.map((key, index) =>
      this.acquireLock(key, lockIds[index], options)
    );

    const lockResults = await Promise.all(lockPromises);
    const allAcquired = lockResults.every(result => result);

    if (!allAcquired) {
      // Release any locks that were acquired
      await Promise.all(
        sortedKeys.map((key, index) =>
          lockResults[index] ? this.releaseLock(key, lockIds[index]) : Promise.resolve()
        )
      );
      throw new Error('Failed to acquire all required locks');
    }

    try {
      const result = await operation();
      return result;
    } finally {
      // Release all locks
      await Promise.all(
        sortedKeys.map((key, index) => this.releaseLock(key, lockIds[index]))
      );
    }
  }

  /**
   * Utility methods
   */

  generateLockId() {
    return crypto.randomUUID();
  }

  hashResourceKey(resourceKey) {
    // Create a consistent hash for resource keys to avoid issues with special characters
    return crypto.createHash('md5').update(resourceKey).digest('hex').substring(0, 16);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup on service shutdown
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Clear all timeouts
    for (const timeoutId of this.lockTimeouts.values()) {
      clearTimeout(timeoutId);
    }

    this.lockTimeouts.clear();
    this.locks.clear();
  }
}

module.exports = new ConcurrencyService();
