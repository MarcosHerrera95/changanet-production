/**
 * Integration Tests for Concurrent Bookings
 * Tests race conditions and concurrent access to availability slots
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const concurrencyService = require('../../../services/concurrencyService');

const prisma = new PrismaClient();

describe('Concurrent Bookings Integration Tests', () => {
  let server;
  let testUser;
  let testProfessional;
  let testSlot;
  let app;

  beforeAll(async () => {
    // Start test server
    server = require('../../../server');
    app = server.app || server;

    // Create test data
    testUser = await prisma.usuarios.create({
      data: {
        nombre: 'Test Client',
        email: 'client@test.com',
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
        nombre: 'Test Professional',
        email: 'professional@test.com',
        password: 'hashedpassword',
        rol: 'profesional',
        esta_verificado: true,
        fcm_token: 'test-fcm-token',
        notificaciones_push: true,
        notificaciones_email: true,
      }
    });

    // Create availability configuration
    const availabilityConfig = await prisma.professionals_availability.create({
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

    // Create available slot
    testSlot = await prisma.availability_slots.create({
      data: {
        professional_id: testProfessional.id,
        availability_config_id: availabilityConfig.id,
        start_time: new Date('2024-12-01T10:00:00Z'),
        end_time: new Date('2024-12-01T11:00:00Z'),
        local_start_time: '10:00',
        local_end_time: '11:00',
        timezone: 'America/Buenos_Aires',
        status: 'available',
        is_available: true,
      }
    });
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
    if (server && server.close) {
      server.close();
    }
  });

  describe('Race Condition Prevention', () => {
    test('should prevent double booking with concurrent requests', async () => {
      const bookingPromises = [];

      // Create 5 concurrent booking attempts
      for (let i = 0; i < 5; i++) {
        const bookingPromise = concurrencyService.bookSlotWithLock(testSlot.id, testUser.id, {
          title: `Test Booking ${i}`,
          description: `Concurrent booking attempt ${i}`,
        });
        bookingPromises.push(bookingPromise);
      }

      const results = await Promise.allSettled(bookingPromises);

      // Only one booking should succeed
      const successfulBookings = results.filter(result =>
        result.status === 'fulfilled' && result.value.success
      );

      const failedBookings = results.filter(result =>
        result.status === 'rejected' ||
        (result.status === 'fulfilled' && !result.value.success)
      );

      expect(successfulBookings.length).toBe(1);
      expect(failedBookings.length).toBeGreaterThan(0);

      // Verify slot status
      const updatedSlot = await prisma.availability_slots.findUnique({
        where: { id: testSlot.id }
      });

      expect(updatedSlot.status).toBe('booked');
      expect(updatedSlot.booked_by).toBe(testUser.id);

      // Verify appointment was created
      const appointments = await prisma.appointments.findMany({
        where: { slot_id: testSlot.id }
      });

      expect(appointments.length).toBe(1);
      expect(appointments[0].client_id).toBe(testUser.id);
      expect(appointments[0].professional_id).toBe(testProfessional.id);
    });

    test('should handle concurrent slot queries correctly', async () => {
      // Create multiple available slots
      const slots = [];
      for (let i = 0; i < 3; i++) {
        const slot = await prisma.availability_slots.create({
          data: {
            professional_id: testProfessional.id,
            availability_config_id: testSlot.availability_config_id,
            start_time: new Date(`2024-12-01T${11 + i}:00:00Z`),
            end_time: new Date(`2024-12-01T${12 + i}:00:00Z`),
            local_start_time: `${11 + i}:00`,
            local_end_time: `${12 + i}:00`,
            timezone: 'America/Buenos_Aires',
            status: 'available',
            is_available: true,
          }
        });
        slots.push(slot);
      }

      // Query slots concurrently
      const queryPromises = Array.from({ length: 10 }, () =>
        prisma.availability_slots.findMany({
          where: {
            professional_id: testProfessional.id,
            status: 'available',
            start_time: { gte: new Date('2024-12-01T00:00:00Z') }
          }
        })
      );

      const queryResults = await Promise.all(queryPromises);

      // All queries should return the same results
      queryResults.forEach(result => {
        expect(result.length).toBe(3);
        expect(result.every(slot => slot.status === 'available')).toBe(true);
      });

      // Clean up
      await prisma.availability_slots.deleteMany({
        where: { id: { in: slots.map(s => s.id) } }
      });
    });
  });

  describe('Lock Timeout Handling', () => {
    test('should handle lock timeouts gracefully', async () => {
      // Create a long-running operation that will timeout
      const longRunningOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Shorter than timeout
        return { success: true };
      };

      const result = await concurrencyService.withLock(
        `test-resource-timeout`,
        longRunningOperation,
        { timeout: 50 } // Very short timeout
      );

      expect(result.success).toBe(true);
    });

    test('should prevent operations after lock timeout', async () => {
      let operationStarted = false;

      const timeoutOperation = async () => {
        operationStarted = true;
        await new Promise(resolve => setTimeout(resolve, 200)); // Longer than timeout
        return { success: true };
      };

      await expect(concurrencyService.withLock(
        `test-resource-timeout-fail`,
        timeoutOperation,
        { timeout: 50 }
      )).rejects.toThrow();

      // Operation should have started but been interrupted
      expect(operationStarted).toBe(true);
    });
  });

  describe('Concurrent Slot Updates', () => {
    test('should handle concurrent slot status updates', async () => {
      // Create multiple slots
      const slots = [];
      for (let i = 0; i < 5; i++) {
        const slot = await prisma.availability_slots.create({
          data: {
            professional_id: testProfessional.id,
            availability_config_id: testSlot.availability_config_id,
            start_time: new Date(`2024-12-01T${14 + i}:00:00Z`),
            end_time: new Date(`2024-12-01T${15 + i}:00:00Z`),
            local_start_time: `${14 + i}:00`,
            local_end_time: `${15 + i}:00`,
            timezone: 'America/Buenos_Aires',
            status: 'available',
            is_available: true,
          }
        });
        slots.push(slot);
      }

      // Concurrently try to book different slots
      const bookingPromises = slots.map((slot, index) =>
        concurrencyService.bookSlotWithLock(slot.id, testUser.id, {
          title: `Concurrent Booking ${index}`,
        })
      );

      const results = await Promise.allSettled(bookingPromises);

      // All bookings should succeed since they're different slots
      const successfulBookings = results.filter(result =>
        result.status === 'fulfilled' && result.value.success
      );

      expect(successfulBookings.length).toBe(5);

      // Verify all slots are booked
      const updatedSlots = await prisma.availability_slots.findMany({
        where: { id: { in: slots.map(s => s.id) } }
      });

      expect(updatedSlots.every(slot => slot.status === 'booked')).toBe(true);

      // Clean up appointments
      await prisma.appointments.deleteMany({
        where: { slot_id: { in: slots.map(s => s.id) } }
      });

      // Clean up slots
      await prisma.availability_slots.deleteMany({
        where: { id: { in: slots.map(s => s.id) } }
      });
    });
  });

  describe('Database Transaction Integrity', () => {
    test('should maintain data consistency during concurrent operations', async () => {
      const operationCount = 20;
      const operations = [];

      // Create operations that modify slot data
      for (let i = 0; i < operationCount; i++) {
        operations.push(
          prisma.$transaction(async (tx) => {
            // Check slot availability
            const slot = await tx.availability_slots.findUnique({
              where: { id: testSlot.id }
            });

            if (slot.status === 'available') {
              // Update slot status
              await tx.availability_slots.update({
                where: { id: testSlot.id },
                data: { status: 'booked', booked_by: testUser.id }
              });

              // Create appointment
              await tx.appointments.create({
                data: {
                  professional_id: testProfessional.id,
                  client_id: testUser.id,
                  slot_id: testSlot.id,
                  availability_config_id: testSlot.availability_config_id,
                  title: `Transaction Booking ${i}`,
                  scheduled_start: testSlot.start_time,
                  scheduled_end: testSlot.end_time,
                  timezone: testSlot.timezone,
                  status: 'scheduled',
                }
              });

              return { success: true, operation: i };
            }

            return { success: false, operation: i };
          })
        );
      }

      const results = await Promise.allSettled(operations);

      // Only one transaction should succeed
      const successfulTransactions = results.filter(result =>
        result.status === 'fulfilled' && result.value.success
      );

      const failedTransactions = results.filter(result =>
        result.status === 'fulfilled' && !result.value.success
      );

      expect(successfulTransactions.length).toBe(1);
      expect(failedTransactions.length).toBe(operationCount - 1);

      // Verify final state
      const finalSlot = await prisma.availability_slots.findUnique({
        where: { id: testSlot.id }
      });

      const appointments = await prisma.appointments.findMany({
        where: { slot_id: testSlot.id }
      });

      expect(finalSlot.status).toBe('booked');
      expect(appointments.length).toBe(1);

      // Reset slot for other tests
      await prisma.appointments.deleteMany({
        where: { slot_id: testSlot.id }
      });

      await prisma.availability_slots.update({
        where: { id: testSlot.id },
        data: { status: 'available', booked_by: null, booked_at: null }
      });
    });
  });

  describe('Load Testing', () => {
    test('should handle high concurrency load', async () => {
      const concurrentUsers = 10;
      const operationsPerUser = 5;
      const totalOperations = concurrentUsers * operationsPerUser;

      // Create multiple test slots
      const testSlots = [];
      for (let i = 0; i < totalOperations; i++) {
        const slot = await prisma.availability_slots.create({
          data: {
            professional_id: testProfessional.id,
            availability_config_id: testSlot.availability_config_id,
            start_time: new Date(`2024-12-02T${10 + i}:00:00Z`),
            end_time: new Date(`2024-12-02T${11 + i}:00:00Z`),
            local_start_time: `${10 + i}:00`,
            local_end_time: `${11 + i}:00`,
            timezone: 'America/Buenos_Aires',
            status: 'available',
            is_available: true,
          }
        });
        testSlots.push(slot);
      }

      // Simulate concurrent users trying to book slots
      const userOperations = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
        const userBookings = [];

        for (let opIndex = 0; opIndex < operationsPerUser; opIndex++) {
          const slotIndex = userIndex * operationsPerUser + opIndex;
          if (slotIndex < testSlots.length) {
            try {
              const result = await concurrencyService.bookSlotWithLock(
                testSlots[slotIndex].id,
                testUser.id,
                {
                  title: `Load Test Booking U${userIndex} O${opIndex}`,
                }
              );
              userBookings.push(result);
            } catch (error) {
              userBookings.push({ error: error.message });
            }
          }
        }

        return userBookings;
      });

      const startTime = Date.now();
      const userResults = await Promise.all(userOperations);
      const endTime = Date.now();

      const totalDuration = endTime - startTime;
      const successfulBookings = userResults.flat().filter(result =>
        result && result.success && !result.error
      );

      console.log(`Load test completed in ${totalDuration}ms`);
      console.log(`Successful bookings: ${successfulBookings.length}/${totalOperations}`);

      // Should handle the load without deadlocks
      expect(successfulBookings.length).toBe(totalOperations);
      expect(totalDuration).toBeLessThan(30000); // Should complete within 30 seconds

      // Clean up
      await prisma.appointments.deleteMany({
        where: { slot_id: { in: testSlots.map(s => s.id) } }
      });

      await prisma.availability_slots.deleteMany({
        where: { id: { in: testSlots.map(s => s.id) } }
      });
    }, 60000); // 60 second timeout for load test
  });
});
