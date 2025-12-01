/**
 * End-to-End Tests for Complete Booking Flow
 * Tests the entire user journey from availability configuration to booking confirmation
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

describe('Complete Booking Flow E2E Tests', () => {
  let server;
  let app;
  let clientUser;
  let professionalUser;
  let clientToken;
  let professionalToken;
  let availabilityConfig;
  let createdSlots;
  let bookedAppointment;

  beforeAll(async () => {
    // Start test server
    server = require('../../../server');
    app = server.app || server;

    // Create test users
    clientUser = await prisma.usuarios.create({
      data: {
        nombre: 'E2E Test Client',
        email: 'e2e-client@test.com',
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
        nombre: 'E2E Test Professional',
        email: 'e2e-professional@test.com',
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
  });

  afterAll(async () => {
    // Clean up test data
    if (bookedAppointment) {
      await prisma.appointments.deleteMany({
        where: { id: bookedAppointment.id }
      });
    }

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

  describe('Professional Setup Availability', () => {
    test('professional creates availability configuration', async () => {
      const configData = {
        title: 'E2E Test Availability',
        description: 'Availability for end-to-end testing',
        timezone: 'America/Buenos_Aires',
        start_time: '09:00',
        end_time: '17:00',
        duration_minutes: 60,
        recurrence_type: 'daily',
        recurrence_config: {
          weekdays: [1, 2, 3, 4, 5] // Monday to Friday
        },
        is_active: true,
        meta: {
          maxAdvanceBooking: 30,
          minAdvanceBooking: 1,
          bufferTime: 15
        }
      };

      const response = await request(app)
        .post('/api/availability/configs')
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(configData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(configData.title);
      expect(response.body.timezone).toBe(configData.timezone);
      expect(response.body.recurrence_type).toBe(configData.recurrence_type);

      availabilityConfig = response.body;
    });

    test('professional generates availability slots', async () => {
      const generationData = {
        startDate: '2024-12-02', // Future date to avoid conflicts
        endDate: '2024-12-06',   // 5 days (Mon-Fri)
      };

      const response = await request(app)
        .post(`/api/availability/configs/${availabilityConfig.id}/generate`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(generationData);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      createdSlots = response.body;

      // Verify slots were created in database
      const dbSlots = await prisma.availability_slots.findMany({
        where: {
          professional_id: professionalUser.id,
          availability_config_id: availabilityConfig.id
        }
      });

      expect(dbSlots.length).toBe(createdSlots.length);
      expect(dbSlots.every(slot => slot.status === 'available')).toBe(true);
    });

    test('professional can view their availability configurations', async () => {
      const response = await request(app)
        .get('/api/availability/configs')
        .set('Authorization', `Bearer ${professionalToken}`);

      expect(response.status).toBe(200);
      expect(response.body.configs.length).toBeGreaterThan(0);
      expect(response.body.configs[0].professional_id).toBe(professionalUser.id);
    });
  });

  describe('Client Discovers Availability', () => {
    test('client can query available slots', async () => {
      const queryParams = {
        professionalId: professionalUser.id,
        date: '2024-12-02', // Monday
        status: 'available'
      };

      const response = await request(app)
        .get('/api/availability/slots')
        .query(queryParams)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verify slots are for the correct date and available
      response.body.forEach(slot => {
        expect(slot.professional_id).toBe(professionalUser.id);
        expect(slot.status).toBe('available');
        expect(slot.start_time.startsWith('2024-12-02')).toBe(true);
      });
    });

    test('client can get detailed slot information', async () => {
      const slotId = createdSlots[0].id;

      const response = await request(app)
        .get(`/api/availability/slots/${slotId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(slotId);
      expect(response.body.professional_id).toBe(professionalUser.id);
      expect(response.body.status).toBe('available');
      expect(response.body).toHaveProperty('local_start_time');
      expect(response.body).toHaveProperty('local_end_time');
    });

    test('client can check for conflicts before booking', async () => {
      const conflictCheck = {
        entity: {
          professional_id: professionalUser.id,
          client_id: clientUser.id,
          scheduled_start: createdSlots[0].start_time,
          scheduled_end: createdSlots[0].end_time,
        },
        entityType: 'appointment',
      };

      const response = await request(app)
        .post('/api/availability/conflicts/check')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(conflictCheck);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid');
      expect(response.body).toHaveProperty('conflicts');
      expect(Array.isArray(response.body.conflicts)).toBe(true);
      // Should be valid since slot is available
      expect(response.body.valid).toBe(true);
    });
  });

  describe('Booking Process', () => {
    test('client successfully books an available slot', async () => {
      const slotId = createdSlots[0].id;
      const bookingData = {
        title: 'E2E Test Appointment',
        description: 'End-to-end testing appointment',
        appointmentType: 'consultation',
        notes: 'Testing the complete booking flow',
      };

      const response = await request(app)
        .post(`/api/availability/slots/${slotId}/book`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(bookingData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('appointment');
      expect(response.body).toHaveProperty('slot');
      expect(response.body.appointment.client_id).toBe(clientUser.id);
      expect(response.body.appointment.professional_id).toBe(professionalUser.id);
      expect(response.body.slot.status).toBe('booked');

      bookedAppointment = response.body.appointment;

      // Verify in database
      const dbAppointment = await prisma.appointments.findUnique({
        where: { id: bookedAppointment.id }
      });

      expect(dbAppointment).toBeDefined();
      expect(dbAppointment.status).toBe('scheduled');
      expect(dbAppointment.title).toBe(bookingData.title);

      const dbSlot = await prisma.availability_slots.findUnique({
        where: { id: slotId }
      });

      expect(dbSlot.status).toBe('booked');
      expect(dbSlot.booked_by).toBe(clientUser.id);
    });

    test('attempting to book the same slot again fails', async () => {
      const slotId = createdSlots[0].id;
      const bookingData = {
        title: 'Duplicate Booking Attempt',
        description: 'This should fail',
      };

      const response = await request(app)
        .post(`/api/availability/slots/${slotId}/book`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(bookingData);

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('no longer available');
    });

    test('client can view their appointments', async () => {
      const response = await request(app)
        .get('/api/availability/appointments')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const appointment = response.body.find(appt => appt.id === bookedAppointment.id);
      expect(appointment).toBeDefined();
      expect(appointment.client_id).toBe(clientUser.id);
      expect(appointment.status).toBe('scheduled');
    });

    test('professional can view client appointments', async () => {
      const response = await request(app)
        .get('/api/availability/appointments')
        .set('Authorization', `Bearer ${professionalToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      const appointment = response.body.find(appt => appt.id === bookedAppointment.id);
      expect(appointment).toBeDefined();
      expect(appointment.professional_id).toBe(professionalUser.id);
      expect(appointment.client_id).toBe(clientUser.id);
    });
  });

  describe('Appointment Management', () => {
    test('professional can update appointment details', async () => {
      const updateData = {
        title: 'Updated E2E Test Appointment',
        description: 'Updated description for E2E testing',
        notes: 'Updated notes',
      };

      const response = await request(app)
        .put(`/api/availability/appointments/${bookedAppointment.id}`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updateData.title);
      expect(response.body.description).toBe(updateData.description);

      // Verify in database
      const dbAppointment = await prisma.appointments.findUnique({
        where: { id: bookedAppointment.id }
      });

      expect(dbAppointment.title).toBe(updateData.title);
      expect(dbAppointment.description).toBe(updateData.description);
    });

    test('client cannot update appointment to conflicting time', async () => {
      // Create another slot for conflict testing
      const conflictSlot = await prisma.availability_slots.create({
        data: {
          professional_id: professionalUser.id,
          availability_config_id: availabilityConfig.id,
          start_time: new Date('2024-12-02T18:00:00Z'), // Different time
          end_time: new Date('2024-12-02T19:00:00Z'),
          local_start_time: '18:00',
          local_end_time: '19:00',
          timezone: 'America/Buenos_Aires',
          status: 'available',
          is_available: true,
        }
      });

      const conflictingUpdate = {
        scheduled_start: conflictSlot.start_time,
        scheduled_end: conflictSlot.end_time,
      };

      const response = await request(app)
        .put(`/api/availability/appointments/${bookedAppointment.id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(conflictingUpdate);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('conflicts');

      // Clean up
      await prisma.availability_slots.delete({ where: { id: conflictSlot.id } });
    });

    test('appointment status updates work correctly', async () => {
      const statusUpdate = {
        status: 'confirmed',
      };

      const response = await request(app)
        .put(`/api/availability/appointments/${bookedAppointment.id}`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(statusUpdate);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('confirmed');

      // Verify in database
      const dbAppointment = await prisma.appointments.findUnique({
        where: { id: bookedAppointment.id }
      });

      expect(dbAppointment.status).toBe('confirmed');
    });
  });

  describe('Cancellation Flow', () => {
    test('client can cancel their appointment', async () => {
      const cancellationData = {
        reason: 'E2E testing cancellation',
      };

      const response = await request(app)
        .delete(`/api/availability/appointments/${bookedAppointment.id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(cancellationData);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('cancelled');

      // Verify appointment status
      const dbAppointment = await prisma.appointments.findUnique({
        where: { id: bookedAppointment.id }
      });

      expect(dbAppointment.status).toBe('cancelled');
      expect(dbAppointment.cancel_reason).toBe(cancellationData.reason);

      // Verify slot was freed up
      const dbSlot = await prisma.availability_slots.findUnique({
        where: { id: bookedAppointment.slot_id }
      });

      expect(dbSlot.status).toBe('available');
      expect(dbSlot.booked_by).toBeNull();
    });

    test('cancelled appointment shows in history', async () => {
      const response = await request(app)
        .get('/api/availability/appointments?status=cancelled')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);

      const cancelledAppointment = response.body.find(appt => appt.id === bookedAppointment.id);
      expect(cancelledAppointment).toBeDefined();
      expect(cancelledAppointment.status).toBe('cancelled');
    });
  });

  describe('Statistics and Analytics', () => {
    test('professional can view availability statistics', async () => {
      const response = await request(app)
        .get('/api/availability/stats')
        .set('Authorization', `Bearer ${professionalToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalSlots');
      expect(response.body).toHaveProperty('bookedSlots');
      expect(response.body).toHaveProperty('availableSlots');
      expect(response.body).toHaveProperty('utilizationRate');

      expect(typeof response.body.totalSlots).toBe('number');
      expect(typeof response.body.bookedSlots).toBe('number');
      expect(typeof response.body.availableSlots).toBe('number');
      expect(typeof response.body.utilizationRate).toBe('number');
    });

    test('statistics reflect booking and cancellation activity', async () => {
      // Get initial stats
      const initialResponse = await request(app)
        .get('/api/availability/stats')
        .set('Authorization', `Bearer ${professionalToken}`);

      expect(initialResponse.status).toBe(200);

      // Create a new booking for stats testing
      const newSlot = createdSlots.find(slot => slot.status === 'available');
      if (newSlot) {
        const bookingResponse = await request(app)
          .post(`/api/availability/slots/${newSlot.id}/book`)
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            title: 'Stats Test Booking',
            description: 'Testing statistics',
          });

        expect(bookingResponse.status).toBe(200);

        // Get updated stats
        const updatedResponse = await request(app)
          .get('/api/availability/stats')
          .set('Authorization', `Bearer ${professionalToken}`);

        expect(updatedResponse.status).toBe(200);
        expect(updatedResponse.body.bookedSlots).toBe(initialResponse.body.bookedSlots + 1);
        expect(updatedResponse.body.availableSlots).toBe(initialResponse.body.availableSlots - 1);

        // Clean up the test booking
        await request(app)
          .delete(`/api/availability/appointments/${bookingResponse.body.appointment.id}`)
          .set('Authorization', `Bearer ${clientToken}`);
      }
    });
  });

  describe('Timezone Handling', () => {
    test('timezone conversion works correctly', async () => {
      const conversionData = {
        dateTime: '2024-12-02T10:00:00Z',
        fromTimezone: 'UTC',
        toTimezone: 'America/Buenos_Aires',
      };

      const response = await request(app)
        .post('/api/availability/timezone/convert')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(conversionData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('utc');
      expect(response.body).toHaveProperty('local');
      expect(response.body).toHaveProperty('timezone');
      expect(response.body.timezone).toBe('America/Buenos_Aires');
    });

    test('available timezones list is comprehensive', async () => {
      const response = await request(app)
        .get('/api/availability/timezone/list')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('timezones');
      expect(Array.isArray(response.body.timezones)).toBe(true);
      expect(response.body.timezones.length).toBeGreaterThan(10); // Should have many timezones

      // Check timezone structure
      const timezone = response.body.timezones[0];
      expect(timezone).toHaveProperty('identifier');
      expect(timezone).toHaveProperty('name');
      expect(timezone).toHaveProperty('abbreviation');
      expect(timezone).toHaveProperty('offset');
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    test('booking non-existent slot returns 404', async () => {
      const response = await request(app)
        .post('/api/availability/slots/non-existent-slot-id/book')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ title: 'Test Booking' });

      expect(response.status).toBe(404);
    });

    test('accessing other user\'s appointment returns 404', async () => {
      // Create another user
      const otherUser = await prisma.usuarios.create({
        data: {
          nombre: 'Other Test Client',
          email: 'other-e2e-client@test.com',
          password: 'hashedpassword',
          rol: 'cliente',
          esta_verificado: true,
        }
      });

      const otherToken = jwt.sign(
        { id: otherUser.id, email: otherUser.email, rol: otherUser.rol },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get(`/api/availability/appointments/${bookedAppointment.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(404);

      // Clean up
      await prisma.usuarios.delete({ where: { id: otherUser.id } });
    });

    test('invalid date ranges are rejected', async () => {
      const invalidGenerationData = {
        startDate: '2024-12-06',
        endDate: '2024-12-02', // End before start
      };

      const response = await request(app)
        .post(`/api/availability/configs/${availabilityConfig.id}/generate`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(invalidGenerationData);

      expect(response.status).toBe(500);
    });

    test('extremely long booking descriptions are handled', async () => {
      const longDescription = 'A'.repeat(10000); // Very long description
      const slotId = createdSlots.find(slot => slot.status === 'available')?.id;

      if (slotId) {
        const response = await request(app)
          .post(`/api/availability/slots/${slotId}/book`)
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            title: 'Long Description Test',
            description: longDescription,
          });

        // Should either succeed or fail gracefully with validation error
        expect([200, 400, 413]).toContain(response.status);
      }
    });
  });

  describe('Performance and Load Testing', () => {
    test('multiple concurrent availability queries perform well', async () => {
      const queryPromises = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/availability/slots')
          .query({
            professionalId: professionalUser.id,
            status: 'available'
          })
          .set('Authorization', `Bearer ${clientToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(queryPromises);
      const endTime = Date.now();

      const totalDuration = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });

      // Should complete within reasonable time (under 5 seconds for 10 concurrent requests)
      expect(totalDuration).toBeLessThan(5000);

      console.log(`Concurrent queries completed in ${totalDuration}ms`);
    });

    test('bulk availability generation handles large date ranges', async () => {
      const largeRangeData = {
        startDate: '2024-12-01',
        endDate: '2024-12-31', // 31 days
      };

      const startTime = Date.now();
      const response = await request(app)
        .post(`/api/availability/configs/${availabilityConfig.id}/generate`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(largeRangeData);
      const endTime = Date.now();

      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Should complete within reasonable time (under 10 seconds for large range)
      expect(duration).toBeLessThan(10000);

      console.log(`Large range generation completed in ${duration}ms, generated ${response.body.length} slots`);
    });
  });
});
