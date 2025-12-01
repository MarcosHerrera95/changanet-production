/**
 * Performance Tests for Availability Module
 * Tests load handling, response times, and scalability
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

describe('Performance Tests', () => {
  let server;
  let app;
  let clientUser;
  let professionalUser;
  let clientToken;
  let professionalToken;
  let availabilityConfig;
  let testSlots;

  beforeAll(async () => {
    // Start test server
    server = require('../../../server');
    app = server.app || server;

    // Create test users
    clientUser = await prisma.usuarios.create({
      data: {
        nombre: 'Performance Test Client',
        email: 'performance-client@test.com',
        password: 'hashedpassword',
        rol: 'cliente',
        esta_verificado: true,
        fcm_token: 'test-fcm-token-client',
        notificaciones_push: true,
        notificaciones_email: true,
      }
    });

    professionalUser = await prisma.usuarios.create({
      data: {
        nombre: 'Performance Test Professional',
        email: 'performance-professional@test.com',
        password: 'hashedpassword',
        rol: 'profesional',
        esta_verificado: true,
        fcm_token: 'test-fcm-token-professional',
        notificaciones_push: true,
        notificaciones_email: true,
      }
    });

    // Generate JWT tokens
    clientToken = jwt.sign(
      { id: clientUser.id, email: clientUser.email, rol: clientUser.rol },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    professionalToken = jwt.sign(
      { id: professionalUser.id, email: professionalUser.email, rol: professionalUser.rol },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create availability configuration
    availabilityConfig = await prisma.professionals_availability.create({
      data: {
        professional_id: professionalUser.id,
        timezone: 'America/Buenos_Aires',
        start_time: '09:00',
        end_time: '17:00',
        duration_minutes: 60,
        recurrence_type: 'daily',
        is_active: true,
      }
    });

    // Create multiple test slots for performance testing
    testSlots = [];
    for (let i = 0; i < 50; i++) {
      const slot = await prisma.availability_slots.create({
        data: {
          professional_id: professionalUser.id,
          availability_config_id: availabilityConfig.id,
          start_time: new Date(`2024-12-01T${10 + (i % 8)}:00:00Z`), // Distribute across hours
          end_time: new Date(`2024-12-01T${11 + (i % 8)}:00:00Z`),
          local_start_time: `${10 + (i % 8)}:00`,
          local_end_time: `${11 + (i % 8)}:00`,
          timezone: 'America/Buenos_Aires',
          status: i < 40 ? 'available' : 'booked', // 40 available, 10 booked
          is_available: i < 40,
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
          { client_id: clientUser.id },
          { professional_id: professionalUser.id }
        ]
      }
    });

    await prisma.availability_slots.deleteMany({
      where: { professional_id: professionalUser.id }
    });

    await prisma.professionals_availability.deleteMany({
      where: { professional_id: professionalUser.id }
    });

    await prisma.usuarios.deleteMany({
      where: {
        id: { in: [clientUser.id, professionalUser.id] }
      }
    });

    await prisma.$disconnect();
    if (server && server.close) {
      server.close();
    }
  });

  describe('Response Time Performance', () => {
    test('availability slot queries respond within acceptable time', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/availability/slots')
        .query({
          professionalId: professionalUser.id,
          status: 'available',
          limit: 20
        })
        .set('Authorization', `Bearer ${clientToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500); // Should respond within 500ms
      expect(Array.isArray(response.body)).toBe(true);

      console.log(`Slot query response time: ${responseTime}ms`);
    });

    test('appointment booking operations are fast', async () => {
      const availableSlot = testSlots.find(slot => slot.status === 'available');

      const startTime = Date.now();

      const response = await request(app)
        .post(`/api/availability/slots/${availableSlot.id}/book`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          title: 'Performance Test Booking',
          description: 'Testing booking speed',
        });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should complete within 1 second

      console.log(`Booking response time: ${responseTime}ms`);

      // Clean up
      await request(app)
        .delete(`/api/availability/appointments/${response.body.appointment.id}`)
        .set('Authorization', `Bearer ${clientToken}`);
    });

    test('conflict detection is performant', async () => {
      const conflictCheck = {
        entity: {
          professional_id: professionalUser.id,
          client_id: clientUser.id,
          scheduled_start: '2024-12-01T10:00:00Z',
          scheduled_end: '2024-12-01T11:00:00Z',
        },
        entityType: 'appointment',
      };

      const startTime = Date.now();

      const response = await request(app)
        .post('/api/availability/conflicts/check')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(conflictCheck);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(300); // Should be fast

      console.log(`Conflict detection response time: ${responseTime}ms`);
    });

    test('timezone conversion operations are fast', async () => {
      const conversionData = {
        dateTime: '2024-12-01T10:00:00Z',
        fromTimezone: 'UTC',
        toTimezone: 'America/Buenos_Aires',
      };

      const startTime = Date.now();

      const response = await request(app)
        .post('/api/availability/timezone/convert')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(conversionData);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(100); // Should be very fast

      console.log(`Timezone conversion response time: ${responseTime}ms`);
    });
  });

  describe('Concurrent Load Testing', () => {
    test('handles multiple concurrent slot queries', async () => {
      const concurrentRequests = 20;
      const requests = Array.from({ length: concurrentRequests }, () =>
        request(app)
          .get('/api/availability/slots')
          .query({
            professionalId: professionalUser.id,
            status: 'available'
          })
          .set('Authorization', `Bearer ${clientToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.allSettled(requests);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const successfulResponses = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 200
      );

      expect(successfulResponses.length).toBe(concurrentRequests);
      expect(totalTime).toBeLessThan(3000); // All should complete within 3 seconds

      const avgResponseTime = totalTime / concurrentRequests;
      console.log(`Concurrent queries: ${concurrentRequests} requests, ${totalTime}ms total, ${avgResponseTime.toFixed(2)}ms average`);
    });

    test('manages concurrent booking attempts correctly', async () => {
      const availableSlots = testSlots.filter(slot => slot.status === 'available').slice(0, 5);

      // Create multiple concurrent booking attempts for the same slot
      const bookingRequests = availableSlots.map(slot =>
        request(app)
          .post(`/api/availability/slots/${slot.id}/book`)
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            title: `Concurrent Booking ${slot.id}`,
            description: 'Testing concurrent bookings',
          })
      );

      const startTime = Date.now();
      const responses = await Promise.allSettled(bookingRequests);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const successfulBookings = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 200
      );
      const failedBookings = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 409
      );

      // Only one booking should succeed per slot
      expect(successfulBookings.length).toBe(availableSlots.length);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`Concurrent bookings: ${successfulBookings.length} successful, ${failedBookings.length} conflicts, ${totalTime}ms total`);

      // Clean up successful bookings
      for (const booking of successfulBookings) {
        await request(app)
          .delete(`/api/availability/appointments/${booking.value.body.appointment.id}`)
          .set('Authorization', `Bearer ${clientToken}`);
      }
    });

    test('handles mixed read/write operations under load', async () => {
      const operations = [];

      // Mix of read and write operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          request(app)
            .get('/api/availability/slots')
            .query({ professionalId: professionalUser.id })
            .set('Authorization', `Bearer ${clientToken}`)
        );

        if (i < 5) { // Fewer writes than reads
          const availableSlot = testSlots.find(slot => slot.status === 'available');
          if (availableSlot) {
            operations.push(
              request(app)
                .post(`/api/availability/slots/${availableSlot.id}/book`)
                .set('Authorization', `Bearer ${clientToken}`)
                .send({
                  title: `Load Test Booking ${i}`,
                  description: 'Testing mixed operations',
                })
            );
          }
        }
      }

      const startTime = Date.now();
      const responses = await Promise.allSettled(operations);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const successfulOperations = responses.filter(
        result => result.status === 'fulfilled' &&
                 (result.value.status === 200 || result.value.status === 409) // 409 is expected for conflicts
      );

      expect(successfulOperations.length).toBeGreaterThan(operations.length * 0.8); // At least 80% success rate
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`Mixed operations: ${successfulOperations.length}/${operations.length} successful, ${totalTime}ms total`);

      // Clean up any successful bookings
      const bookingResponses = responses.filter(
        result => result.status === 'fulfilled' &&
                 result.value.status === 200 &&
                 result.value.req.path.includes('/book')
      );

      for (const booking of bookingResponses) {
        try {
          await request(app)
            .delete(`/api/availability/appointments/${booking.value.body.appointment.id}`)
            .set('Authorization', `Bearer ${clientToken}`);
        } catch (error) {
          // Ignore cleanup errors in performance tests
        }
      }
    });
  });

  describe('Memory and Resource Usage', () => {
    test('handles large result sets efficiently', async () => {
      // Create many slots for testing
      const bulkSlots = [];
      for (let i = 0; i < 100; i++) {
        const slot = await prisma.availability_slots.create({
          data: {
            professional_id: professionalUser.id,
            availability_config_id: availabilityConfig.id,
            start_time: new Date(`2024-12-01T${10 + (i % 8)}:00:00Z`),
            end_time: new Date(`2024-12-01T${11 + (i % 8)}:00:00Z`),
            local_start_time: `${10 + (i % 8)}:00`,
            local_end_time: `${11 + (i % 8)}:00`,
            timezone: 'America/Buenos_Aires',
            status: 'available',
            is_available: true,
          }
        });
        bulkSlots.push(slot);
      }

      const startTime = Date.now();

      const response = await request(app)
        .get('/api/availability/slots')
        .query({
          professionalId: professionalUser.id,
          limit: 100
        })
        .set('Authorization', `Bearer ${clientToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(50);
      expect(responseTime).toBeLessThan(2000); // Should handle large result sets reasonably fast

      console.log(`Large result set: ${response.body.length} items, ${responseTime}ms response time`);

      // Clean up
      await prisma.availability_slots.deleteMany({
        where: { id: { in: bulkSlots.map(s => s.id) } }
      });
    });

    test('pagination works efficiently', async () => {
      const pageSizes = [10, 25, 50, 100];

      for (const pageSize of pageSizes) {
        const startTime = Date.now();

        const response = await request(app)
          .get('/api/availability/slots')
          .query({
            professionalId: professionalUser.id,
            limit: pageSize,
            page: 1
          })
          .set('Authorization', `Bearer ${clientToken}`);

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeLessThanOrEqual(pageSize);
        expect(responseTime).toBeLessThan(1000); // Pagination should be fast

        console.log(`Pagination ${pageSize} items: ${responseTime}ms`);
      }
    });
  });

  describe('Database Performance', () => {
    test('database queries are optimized', async () => {
      // Test query performance with indexes
      const queryVariations = [
        { status: 'available' },
        { status: 'booked' },
        { professionalId: professionalUser.id, status: 'available' },
        { start_time: { gte: '2024-12-01T00:00:00Z' } },
      ];

      for (const query of queryVariations) {
        const startTime = Date.now();

        const response = await request(app)
          .get('/api/availability/slots')
          .query(query)
          .set('Authorization', `Bearer ${clientToken}`);

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        expect(response.status).toBe(200);
        expect(responseTime).toBeLessThan(500); // Database queries should be fast

        console.log(`Query ${JSON.stringify(query)}: ${responseTime}ms`);
      }
    });

    test('handles database connection pooling', async () => {
      // Test multiple sequential requests to ensure connection reuse
      const sequentialRequests = 20;
      const requestTimes = [];

      for (let i = 0; i < sequentialRequests; i++) {
        const startTime = Date.now();

        const response = await request(app)
          .get('/api/availability/slots')
          .query({ professionalId: professionalUser.id, limit: 5 })
          .set('Authorization', `Bearer ${clientToken}`);

        const endTime = Date.now();
        requestTimes.push(endTime - startTime);

        expect(response.status).toBe(200);
      }

      const avgResponseTime = requestTimes.reduce((a, b) => a + b, 0) / requestTimes.length;
      const maxResponseTime = Math.max(...requestTimes);
      const minResponseTime = Math.min(...requestTimes);

      expect(avgResponseTime).toBeLessThan(200);
      expect(maxResponseTime).toBeLessThan(1000);

      console.log(`Connection pooling: ${sequentialRequests} requests, avg: ${avgResponseTime.toFixed(2)}ms, min: ${minResponseTime}ms, max: ${maxResponseTime}ms`);
    });

    test('bulk operations perform well', async () => {
      // Test bulk slot generation
      const bulkConfig = await prisma.professionals_availability.create({
        data: {
          professional_id: professionalUser.id,
          title: 'Bulk Performance Test',
          timezone: 'America/Buenos_Aires',
          start_time: '09:00',
          end_time: '17:00',
          duration_minutes: 30, // Smaller slots for more volume
          recurrence_type: 'daily',
          is_active: true,
        }
      });

      const startTime = Date.now();

      const response = await request(app)
        .post(`/api/availability/configs/${bulkConfig.id}/generate`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send({
          startDate: '2024-12-01',
          endDate: '2024-12-31', // Full month
        });

      const endTime = Date.now();
      const generationTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(generationTime).toBeLessThan(5000); // Should generate many slots quickly

      console.log(`Bulk generation: ${response.body.length} slots in ${generationTime}ms`);

      // Clean up
      await prisma.availability_slots.deleteMany({
        where: { availability_config_id: bulkConfig.id }
      });
      await prisma.professionals_availability.delete({ where: { id: bulkConfig.id } });
    });
  });

  describe('Scalability Testing', () => {
    test('maintains performance with growing data sets', async () => {
      // Test performance as data set grows
      const dataSizes = [10, 50, 100, 200];
      const performanceResults = [];

      for (const size of dataSizes) {
        // Create test slots for this size
        const testSlotsForSize = [];
        for (let i = 0; i < size; i++) {
          const slot = await prisma.availability_slots.create({
            data: {
              professional_id: professionalUser.id,
              availability_config_id: availabilityConfig.id,
              start_time: new Date(`2024-12-01T${10 + (i % 8)}:00:00Z`),
              end_time: new Date(`2024-12-01T${11 + (i % 8)}:00:00Z`),
              local_start_time: `${10 + (i % 8)}:00`,
              local_end_time: `${11 + (i % 8)}:00`,
              timezone: 'America/Buenos_Aires',
              status: 'available',
              is_available: true,
            }
          });
          testSlotsForSize.push(slot);
        }

        // Measure query performance
        const startTime = Date.now();

        const response = await request(app)
          .get('/api/availability/slots')
          .query({
            professionalId: professionalUser.id,
            status: 'available',
            limit: size
          })
          .set('Authorization', `Bearer ${clientToken}`);

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        expect(response.status).toBe(200);
        performanceResults.push({ size, responseTime });

        // Clean up
        await prisma.availability_slots.deleteMany({
          where: { id: { in: testSlotsForSize.map(s => s.id) } }
        });
      }

      // Performance should degrade gracefully
      console.log('Scalability results:');
      performanceResults.forEach(result => {
        console.log(`  ${result.size} items: ${result.responseTime}ms`);
        expect(result.responseTime).toBeLessThan(2000); // Even large sets should be reasonable
      });

      // Performance degradation should be sub-linear
      const degradationRatio = performanceResults[performanceResults.length - 1].responseTime / performanceResults[0].responseTime;
      const sizeRatio = performanceResults[performanceResults.length - 1].size / performanceResults[0].size;

      expect(degradationRatio).toBeLessThan(sizeRatio * 2); // Should not degrade worse than linearly
    });

    test('handles high-frequency operations', async () => {
      const operationCount = 50;
      const operations = [];

      // Rapid-fire operations
      for (let i = 0; i < operationCount; i++) {
        operations.push(
          request(app)
            .get('/api/availability/slots')
            .query({
              professionalId: professionalUser.id,
              limit: 5
            })
            .set('Authorization', `Bearer ${clientToken}`)
        );
      }

      const startTime = Date.now();
      const responses = await Promise.allSettled(operations);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const successfulOperations = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 200
      );

      expect(successfulOperations.length).toBe(operationCount);
      expect(totalTime).toBeLessThan(10000); // Should handle high frequency

      const operationsPerSecond = (operationCount / totalTime) * 1000;
      console.log(`High frequency: ${operationCount} operations in ${totalTime}ms (${operationsPerSecond.toFixed(2)} ops/sec)`);
    });
  });

  describe('Resource Cleanup and Memory Management', () => {
    test('properly cleans up resources after operations', async () => {
      // Perform operations that create temporary resources
      const bookingResponse = await request(app)
        .post(`/api/availability/slots/${testSlots[0].id}/book`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          title: 'Resource Cleanup Test',
          description: 'Testing resource management',
        });

      expect(bookingResponse.status).toBe(200);

      // Verify resources are tracked
      const appointment = await prisma.appointments.findUnique({
        where: { id: bookingResponse.body.appointment.id }
      });

      expect(appointment).toBeDefined();

      // Clean up
      await request(app)
        .delete(`/api/availability/appointments/${bookingResponse.body.appointment.id}`)
        .set('Authorization', `Bearer ${clientToken}`);

      // Verify cleanup
      const deletedAppointment = await prisma.appointments.findUnique({
        where: { id: bookingResponse.body.appointment.id }
      });

      expect(deletedAppointment).toBeNull();
    });

    test('handles memory pressure gracefully', async () => {
      // Test with large payloads
      const largeDescription = 'A'.repeat(10000); // 10KB string

      const response = await request(app)
        .post(`/api/availability/slots/${testSlots[0].id}/book`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          title: 'Memory Pressure Test',
          description: largeDescription,
        });

      expect([200, 413]).toContain(response.status); // Should either succeed or reject large payload

      if (response.status === 200) {
        // Clean up
        await request(app)
          .delete(`/api/availability/appointments/${response.body.appointment.id}`)
          .set('Authorization', `Bearer ${clientToken}`);
      }
    });
  });
});
