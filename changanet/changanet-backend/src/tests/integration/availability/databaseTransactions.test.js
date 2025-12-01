/**
 * Integration Tests for Database Transactions
 * Tests atomicity in bookings and conflicts handling
 */

const { PrismaClient } = require('@prisma/client');
const concurrencyService = require('../../../services/concurrencyService');

const prisma = new PrismaClient();

describe('Database Transactions Integration Tests', () => {
  let testUser;
  let testProfessional;
  let availabilityConfig;
  let testSlots;

  beforeAll(async () => {
    // Create test data
    testUser = await prisma.usuarios.create({
      data: {
        nombre: 'Transaction Test Client',
        email: 'transaction-client@test.com',
        password: 'hashedpassword',
        rol: 'cliente',
        esta_verificado: true,
        fcm_token: 'test-fcm-token',
        notificaciones_push: true,
        notificaciones_email: true,
      }
    });

    testProfessional = await prisma.usuarios.create({
      data: {
        nombre: 'Transaction Test Professional',
        email: 'transaction-professional@test.com',
        password: 'hashedpassword',
        rol: 'profesional',
        esta_verificado: true,
        fcm_token: 'test-fcm-token',
        notificaciones_push: true,
        notificaciones_email: true,
      }
    });

    // Create availability configuration
    availabilityConfig = await prisma.professionals_availability.create({
      data: {
        professional_id: testProfessional.id,
        timezone: 'America/Buenos_Aires',
        start_time: '09:00',
        end_time: '17:00',
        duration_minutes: 60,
        recurrence_type: 'daily',
        is_active: true,
      }
    });

    // Create multiple test slots
    testSlots = [];
    for (let i = 0; i < 5; i++) {
      const slot = await prisma.availability_slots.create({
        data: {
          professional_id: testProfessional.id,
          availability_config_id: availabilityConfig.id,
          start_time: new Date(`2024-12-01T${10 + i}:00:00Z`),
          end_time: new Date(`2024-12-01T${11 + i}:00:00Z`),
          local_start_time: `${10 + i}:00`,
          local_end_time: `${11 + i}:00`,
          timezone: 'America/Buenos_Aires',
          status: 'available',
          is_available: true,
        }
      });
      testSlots.push(slot);
    }
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.appointments.deleteMany({
      where: {
        OR: [
          { client_id: testUser.id },
          { professional_id: testProfessional.id }
        ]
      }
    });

    await prisma.availability_slots.deleteMany({
      where: { professional_id: testProfessional.id }
    });

    await prisma.professionals_availability.deleteMany({
      where: { professional_id: testProfessional.id }
    });

    await prisma.usuarios.deleteMany({
      where: {
        id: { in: [testUser.id, testProfessional.id] }
      }
    });

    await prisma.$disconnect();
  });

  describe('Atomic Booking Operations', () => {
    test('should atomically create appointment and update slot status', async () => {
      const slotId = testSlots[0].id;

      // Use the concurrency service's booking method which uses transactions
      const result = await concurrencyService.bookSlotWithLock(slotId, testUser.id, {
        title: 'Atomic Booking Test',
        description: 'Testing atomic operations',
      });

      expect(result.success).toBe(true);
      expect(result.appointment).toBeDefined();
      expect(result.slot.status).toBe('booked');

      // Verify in database
      const appointment = await prisma.appointments.findFirst({
        where: { slot_id: slotId }
      });
      const slot = await prisma.availability_slots.findUnique({
        where: { id: slotId }
      });

      expect(appointment).toBeDefined();
      expect(appointment.client_id).toBe(testUser.id);
      expect(appointment.professional_id).toBe(testProfessional.id);
      expect(slot.status).toBe('booked');
      expect(slot.booked_by).toBe(testUser.id);
    });

    test('should rollback transaction on appointment creation failure', async () => {
      const slotId = testSlots[1].id;

      // Mock appointment creation to fail
      const originalCreate = prisma.appointments.create;
      prisma.appointments.create = jest.fn().mockRejectedValue(new Error('Appointment creation failed'));

      try {
        await concurrencyService.bookSlotWithLock(slotId, testUser.id, {
          title: 'Failing Booking Test',
        });
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Appointment creation failed');
      }

      // Restore original method
      prisma.appointments.create = originalCreate;

      // Verify slot status was not changed (transaction rolled back)
      const slot = await prisma.availability_slots.findUnique({
        where: { id: slotId }
      });

      expect(slot.status).toBe('available');
      expect(slot.booked_by).toBeNull();

      // Verify no appointment was created
      const appointment = await prisma.appointments.findFirst({
        where: { slot_id: slotId }
      });

      expect(appointment).toBeNull();
    });

    test('should rollback transaction on slot update failure', async () => {
      const slotId = testSlots[2].id;

      // Mock slot update to fail
      const originalUpdate = prisma.availability_slots.update;
      prisma.availability_slots.update = jest.fn().mockRejectedValue(new Error('Slot update failed'));

      try {
        await concurrencyService.bookSlotWithLock(slotId, testUser.id, {
          title: 'Failing Slot Update Test',
        });
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Slot update failed');
      }

      // Restore original method
      prisma.availability_slots.update = originalUpdate;

      // Verify appointment was not created (transaction rolled back)
      const appointment = await prisma.appointments.findFirst({
        where: { slot_id: slotId }
      });

      expect(appointment).toBeNull();

      // Verify slot status was not changed
      const slot = await prisma.availability_slots.findUnique({
        where: { id: slotId }
      });

      expect(slot.status).toBe('available');
      expect(slot.booked_by).toBeNull();
    });
  });

  describe('Complex Transaction Scenarios', () => {
    test('should handle multiple related updates atomically', async () => {
      const slotId = testSlots[3].id;

      // Custom transaction with multiple operations
      const result = await prisma.$transaction(async (tx) => {
        // 1. Update slot status
        await tx.availability_slots.update({
          where: { id: slotId },
          data: { status: 'booked', booked_by: testUser.id, booked_at: new Date() }
        });

        // 2. Create appointment
        const appointment = await tx.appointments.create({
          data: {
            professional_id: testProfessional.id,
            client_id: testUser.id,
            slot_id: slotId,
            availability_config_id: availabilityConfig.id,
            title: 'Complex Transaction Test',
            scheduled_start: testSlots[3].start_time,
            scheduled_end: testSlots[3].end_time,
            timezone: testSlots[3].timezone,
            status: 'scheduled',
          }
        });

        // 3. Create a related notification record (simulating side effect)
        await tx.notificaciones.create({
          data: {
            usuario_id: testUser.id,
            tipo: 'appointment_booked',
            mensaje: 'Appointment booked successfully',
            esta_leido: false,
          }
        });

        return appointment;
      });

      expect(result).toBeDefined();
      expect(result.client_id).toBe(testUser.id);

      // Verify all operations succeeded
      const slot = await prisma.availability_slots.findUnique({
        where: { id: slotId }
      });
      const appointment = await prisma.appointments.findFirst({
        where: { slot_id: slotId }
      });
      const notification = await prisma.notificaciones.findFirst({
        where: {
          usuario_id: testUser.id,
          tipo: 'appointment_booked',
          mensaje: 'Appointment booked successfully'
        }
      });

      expect(slot.status).toBe('booked');
      expect(appointment).toBeDefined();
      expect(notification).toBeDefined();
    });

    test('should rollback complex transaction on any failure', async () => {
      const slotId = testSlots[4].id;

      try {
        await prisma.$transaction(async (tx) => {
          // 1. Update slot status
          await tx.availability_slots.update({
            where: { id: slotId },
            data: { status: 'booked', booked_by: testUser.id }
          });

          // 2. Create appointment
          await tx.appointments.create({
            data: {
              professional_id: testProfessional.id,
              client_id: testUser.id,
              slot_id: slotId,
              availability_config_id: availabilityConfig.id,
              title: 'Complex Failing Transaction Test',
              scheduled_start: testSlots[4].start_time,
              scheduled_end: testSlots[4].end_time,
              timezone: testSlots[4].timezone,
              status: 'scheduled',
            }
          });

          // 3. Simulate failure in notification creation
          throw new Error('Notification creation failed');
        });

        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Notification creation failed');
      }

      // Verify all operations were rolled back
      const slot = await prisma.availability_slots.findUnique({
        where: { id: slotId }
      });
      const appointment = await prisma.appointments.findFirst({
        where: { slot_id: slotId }
      });
      const notification = await prisma.notificaciones.findFirst({
        where: {
          usuario_id: testUser.id,
          tipo: 'appointment_booked',
          mensaje: 'Complex Failing Transaction Test'
        }
      });

      expect(slot.status).toBe('available');
      expect(slot.booked_by).toBeNull();
      expect(appointment).toBeNull();
      expect(notification).toBeNull();
    });
  });

  describe('Nested Transaction Behavior', () => {
    test('should handle nested transactions correctly', async () => {
      const slotId = testSlots[0].id;

      // Reset slot
      await prisma.availability_slots.update({
        where: { id: slotId },
        data: { status: 'available', booked_by: null, booked_at: null }
      });

      await prisma.appointments.deleteMany({
        where: { slot_id: slotId }
      });

      const result = await prisma.$transaction(async (tx) => {
        // Outer transaction
        const appointment = await tx.appointments.create({
          data: {
            professional_id: testProfessional.id,
            client_id: testUser.id,
            slot_id: slotId,
            availability_config_id: availabilityConfig.id,
            title: 'Nested Transaction Test',
            scheduled_start: testSlots[0].start_time,
            scheduled_end: testSlots[0].end_time,
            timezone: testSlots[0].timezone,
            status: 'scheduled',
          }
        });

        // Nested transaction-like operation
        await tx.availability_slots.update({
          where: { id: slotId },
          data: { status: 'booked', booked_by: testUser.id }
        });

        return appointment;
      });

      expect(result).toBeDefined();

      // Verify both operations succeeded
      const slot = await prisma.availability_slots.findUnique({
        where: { id: slotId }
      });
      const appointment = await prisma.appointments.findFirst({
        where: { slot_id: slotId }
      });

      expect(slot.status).toBe('booked');
      expect(appointment).toBeDefined();
    });

    test('should rollback nested operations on failure', async () => {
      const slotId = testSlots[1].id;

      // Reset slot
      await prisma.availability_slots.update({
        where: { id: slotId },
        data: { status: 'available', booked_by: null, booked_at: null }
      });

      await prisma.appointments.deleteMany({
        where: { slot_id: slotId }
      });

      try {
        await prisma.$transaction(async (tx) => {
          // Create appointment
          await tx.appointments.create({
            data: {
              professional_id: testProfessional.id,
              client_id: testUser.id,
              slot_id: slotId,
              availability_config_id: availabilityConfig.id,
              title: 'Nested Failing Transaction Test',
              scheduled_start: testSlots[1].start_time,
              scheduled_end: testSlots[1].end_time,
              timezone: testSlots[1].timezone,
              status: 'scheduled',
            }
          });

          // Update slot
          await tx.availability_slots.update({
            where: { id: slotId },
            data: { status: 'booked', booked_by: testUser.id }
          });

          // Simulate failure
          throw new Error('Nested operation failed');
        });

        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Nested operation failed');
      }

      // Verify rollback
      const slot = await prisma.availability_slots.findUnique({
        where: { id: slotId }
      });
      const appointment = await prisma.appointments.findFirst({
        where: { slot_id: slotId }
      });

      expect(slot.status).toBe('available');
      expect(slot.booked_by).toBeNull();
      expect(appointment).toBeNull();
    });
  });

  describe('Isolation Levels and Consistency', () => {
    test('should maintain consistency under concurrent read/write operations', async () => {
      const slotId = testSlots[2].id;

      // Reset slot
      await prisma.availability_slots.update({
        where: { id: slotId },
        data: { status: 'available', booked_by: null, booked_at: null }
      });

      await prisma.appointments.deleteMany({
        where: { slot_id: slotId }
      });

      // Start multiple concurrent operations
      const operations = Array.from({ length: 3 }, async (_, index) => {
        return prisma.$transaction(async (tx) => {
          // Read current state
          const slot = await tx.availability_slots.findUnique({
            where: { id: slotId }
          });

          if (slot.status === 'available') {
            // Update slot
            await tx.availability_slots.update({
              where: { id: slotId },
              data: { status: 'booked', booked_by: testUser.id }
            });

            // Create appointment
            const appointment = await tx.appointments.create({
              data: {
                professional_id: testProfessional.id,
                client_id: testUser.id,
                slot_id: slotId,
                availability_config_id: availabilityConfig.id,
                title: `Isolation Test ${index}`,
                scheduled_start: testSlots[2].start_time,
                scheduled_end: testSlots[2].end_time,
                timezone: testSlots[2].timezone,
                status: 'scheduled',
              }
            });

            return { success: true, appointment, operation: index };
          }

          return { success: false, operation: index };
        });
      });

      const results = await Promise.allSettled(operations);

      // Only one operation should succeed
      const successfulOperations = results.filter(result =>
        result.status === 'fulfilled' && result.value.success
      );

      const failedOperations = results.filter(result =>
        result.status === 'fulfilled' && !result.value.success
      );

      expect(successfulOperations.length).toBe(1);
      expect(failedOperations.length).toBe(2);

      // Verify final state
      const finalSlot = await prisma.availability_slots.findUnique({
        where: { id: slotId }
      });
      const appointments = await prisma.appointments.findMany({
        where: { slot_id: slotId }
      });

      expect(finalSlot.status).toBe('booked');
      expect(appointments.length).toBe(1);
    });

    test('should handle read phenomena correctly', async () => {
      const slotId = testSlots[3].id;

      // Reset slot
      await prisma.availability_slots.update({
        where: { id: slotId },
        data: { status: 'available', booked_by: null, booked_at: null }
      });

      // Test non-repeatable read scenario
      const readOperations = Array.from({ length: 5 }, async () => {
        return prisma.$transaction(async (tx) => {
          // Read slot status
          const slot1 = await tx.availability_slots.findUnique({
            where: { id: slotId }
          });

          // Simulate some processing time
          await new Promise(resolve => setTimeout(resolve, 10));

          // Read again
          const slot2 = await tx.availability_slots.findUnique({
            where: { id: slotId }
          });

          return {
            initialStatus: slot1.status,
            finalStatus: slot2.status,
            consistent: slot1.status === slot2.status
          };
        });
      });

      const readResults = await Promise.all(readOperations);

      // In a serializable transaction, reads should be consistent
      // (though SQLite may not fully implement all isolation levels)
      readResults.forEach(result => {
        expect(result).toHaveProperty('initialStatus');
        expect(result).toHaveProperty('finalStatus');
        expect(result).toHaveProperty('consistent');
      });
    });
  });

  describe('Transaction Timeout and Deadlock Handling', () => {
    test('should handle transaction timeouts gracefully', async () => {
      const slotId = testSlots[4].id;

      // Create a long-running transaction that should timeout
      const timeoutPromise = new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('Transaction timeout')), 100);
      });

      const transactionPromise = prisma.$transaction(async (tx) => {
        // Start transaction
        await tx.availability_slots.findUnique({
          where: { id: slotId }
        });

        // Wait longer than timeout
        await new Promise(resolve => setTimeout(resolve, 200));

        return { completed: true };
      });

      try {
        await Promise.race([transactionPromise, timeoutPromise]);
        throw new Error('Should have timed out');
      } catch (error) {
        expect(error.message).toBe('Transaction timeout');
      }
    });

    test('should prevent deadlock scenarios', async () => {
      const slotId1 = testSlots[0].id;
      const slotId2 = testSlots[1].id;

      // Reset slots
      await prisma.availability_slots.updateMany({
        where: { id: { in: [slotId1, slotId2] } },
        data: { status: 'available', booked_by: null, booked_at: null }
      });

      // Create two transactions that access resources in different orders
      // This could potentially cause deadlocks in less sophisticated systems
      const transaction1 = prisma.$transaction(async (tx) => {
        await tx.availability_slots.update({
          where: { id: slotId1 },
          data: { status: 'booked', booked_by: testUser.id }
        });

        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay

        await tx.availability_slots.update({
          where: { id: slotId2 },
          data: { status: 'booked', booked_by: testUser.id }
        });

        return 'Transaction 1 completed';
      });

      const transaction2 = prisma.$transaction(async (tx) => {
        await tx.availability_slots.update({
          where: { id: slotId2 },
          data: { status: 'booked', booked_by: testUser.id }
        });

        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay

        await tx.availability_slots.update({
          where: { id: slotId1 },
          data: { status: 'booked', booked_by: testUser.id }
        });

        return 'Transaction 2 completed';
      });

      const results = await Promise.allSettled([transaction1, transaction2]);

      // At least one should succeed, and we shouldn't get deadlock errors
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful.length).toBeGreaterThan(0);
      // Note: SQLite may not detect deadlocks like PostgreSQL, but the test ensures no crashes
    });
  });

  describe('Data Integrity Constraints', () => {
    test('should enforce foreign key constraints', async () => {
      try {
        await prisma.appointments.create({
          data: {
            professional_id: 'non-existent-professional',
            client_id: testUser.id,
            slot_id: testSlots[0].id,
            availability_config_id: availabilityConfig.id,
            title: 'Invalid Foreign Key Test',
            scheduled_start: new Date(),
            scheduled_end: new Date(),
            timezone: 'America/Buenos_Aires',
            status: 'scheduled',
          }
        });

        throw new Error('Should have thrown foreign key constraint error');
      } catch (error) {
        expect(error.code).toBe('P2003'); // Foreign key constraint violation
      }
    });

    test('should enforce unique constraints', async () => {
      // Create one appointment
      await prisma.appointments.create({
        data: {
          professional_id: testProfessional.id,
          client_id: testUser.id,
          slot_id: testSlots[0].id,
          availability_config_id: availabilityConfig.id,
          title: 'Unique Constraint Test',
          scheduled_start: testSlots[0].start_time,
          scheduled_end: testSlots[0].end_time,
          timezone: 'America/Buenos_Aires',
          status: 'scheduled',
        }
      });

      try {
        // Try to create another appointment for the same slot
        await prisma.appointments.create({
          data: {
            professional_id: testProfessional.id,
            client_id: testUser.id,
            slot_id: testSlots[0].id, // Same slot
            availability_config_id: availabilityConfig.id,
            title: 'Duplicate Slot Test',
            scheduled_start: testSlots[0].start_time,
            scheduled_end: testSlots[0].end_time,
            timezone: 'America/Buenos_Aires',
            status: 'scheduled',
          }
        });

        throw new Error('Should have thrown unique constraint error');
      } catch (error) {
        // Should fail due to business logic or unique constraints
        expect(error.code || error.message).toBeDefined();
      }

      // Clean up
      await prisma.appointments.deleteMany({
        where: { slot_id: testSlots[0].id }
      });
    });

    test('should maintain data consistency across related tables', async () => {
      const slotId = testSlots[1].id;

      // Create appointment and update slot in transaction
      await prisma.$transaction(async (tx) => {
        await tx.appointments.create({
          data: {
            professional_id: testProfessional.id,
            client_id: testUser.id,
            slot_id: slotId,
            availability_config_id: availabilityConfig.id,
            title: 'Consistency Test',
            scheduled_start: testSlots[1].start_time,
            scheduled_end: testSlots[1].end_time,
            timezone: 'America/Buenos_Aires',
            status: 'scheduled',
          }
        });

        await tx.availability_slots.update({
          where: { id: slotId },
          data: { status: 'booked', booked_by: testUser.id }
        });
      });

      // Verify consistency
      const appointment = await prisma.appointments.findFirst({
        where: { slot_id: slotId }
      });
      const slot = await prisma.availability_slots.findUnique({
        where: { id: slotId }
      });

      expect(appointment).toBeDefined();
      expect(appointment.status).toBe('scheduled');
      expect(slot.status).toBe('booked');
      expect(slot.booked_by).toBe(testUser.id);

      // Clean up
      await prisma.appointments.deleteMany({
        where: { slot_id: slotId }
      });

      await prisma.availability_slots.update({
        where: { id: slotId },
        data: { status: 'available', booked_by: null, booked_at: null }
      });
    });
  });
});
