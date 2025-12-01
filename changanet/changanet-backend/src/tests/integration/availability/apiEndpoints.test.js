/**
 * Integration Tests for Availability API Endpoints
 * Tests CRUD operations, validations, and error handling
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

describe('Availability API Endpoints Integration Tests', () => {
  let server;
  let app;
  let testUser;
  let testProfessional;
  let testToken;
  let professionalToken;
  let availabilityConfig;
  let testSlot;

  beforeAll(async () => {
    // Start test server
    server = require('../../../server');
    app = server.app || server;

    // Create test users
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

    // Generate JWT tokens
    testToken = jwt.sign(
      { id: testUser.id, email: testUser.email, rol: testUser.rol },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    professionalToken = jwt.sign(
      { id: testProfessional.id, email: testProfessional.email, rol: testProfessional.rol },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create availability configuration for professional
    availabilityConfig = await prisma.professionals_availability.create({
      data: {
        professional_id: testProfessional.id,
        title: 'Test Availability',
        timezone: 'America/Buenos_Aires',
        start_time: '09:00',
        end_time: '17:00',
        duration_minutes: 60,
        recurrence_type: 'daily',
        is_active: true,
      }
    });

    // Create test slot
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

  describe('Availability Configuration Endpoints', () => {
    describe('POST /api/availability/configs', () => {
      test('should create availability configuration for professional', async () => {
        const configData = {
          title: 'New Test Config',
          description: 'Test configuration',
          timezone: 'America/Buenos_Aires',
          start_time: '08:00',
          end_time: '18:00',
          duration_minutes: 30,
          recurrence_type: 'weekly',
          recurrence_config: { weekdays: [1, 3, 5] },
          is_active: true,
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
      });

      test('should reject creation by non-professional user', async () => {
        const configData = {
          title: 'Client Config',
          timezone: 'America/Buenos_Aires',
          start_time: '09:00',
          end_time: '17:00',
          duration_minutes: 60,
        };

        const response = await request(app)
          .post('/api/availability/configs')
          .set('Authorization', `Bearer ${testToken}`)
          .send(configData);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('Solo los profesionales');
      });

      test('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/availability/configs')
          .set('Authorization', `Bearer ${professionalToken}`)
          .send({});

        expect(response.status).toBe(500); // Prisma validation error
      });

      test('should validate timezone', async () => {
        const configData = {
          title: 'Invalid Timezone Config',
          timezone: 'Invalid/Timezone',
          start_time: '09:00',
          end_time: '17:00',
          duration_minutes: 60,
        };

        const response = await request(app)
          .post('/api/availability/configs')
          .set('Authorization', `Bearer ${professionalToken}`)
          .send(configData);

        expect(response.status).toBe(201); // Should use fallback timezone
        expect(response.body.timezone).toBe('America/Buenos_Aires');
      });
    });

    describe('GET /api/availability/configs', () => {
      test('should list availability configurations for professional', async () => {
        const response = await request(app)
          .get('/api/availability/configs')
          .set('Authorization', `Bearer ${professionalToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('configs');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.configs)).toBe(true);
        expect(response.body.configs.length).toBeGreaterThan(0);
      });

      test('should filter active configurations', async () => {
        const response = await request(app)
          .get('/api/availability/configs?activeOnly=true')
          .set('Authorization', `Bearer ${professionalToken}`);

        expect(response.status).toBe(200);
        expect(response.body.configs.every(config => config.is_active)).toBe(true);
      });

      test('should support pagination', async () => {
        const response = await request(app)
          .get('/api/availability/configs?page=1&limit=10')
          .set('Authorization', `Bearer ${professionalToken}`);

        expect(response.status).toBe(200);
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.limit).toBe(10);
      });
    });

    describe('GET /api/availability/configs/:configId', () => {
      test('should get specific availability configuration', async () => {
        const response = await request(app)
          .get(`/api/availability/configs/${availabilityConfig.id}`)
          .set('Authorization', `Bearer ${professionalToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(availabilityConfig.id);
        expect(response.body.professional_id).toBe(testProfessional.id);
      });

      test('should return 404 for non-existent configuration', async () => {
        const response = await request(app)
          .get('/api/availability/configs/non-existent-id')
          .set('Authorization', `Bearer ${professionalToken}`);

        expect(response.status).toBe(404);
        expect(response.body.error).toContain('no encontrada');
      });

      test('should prevent access to other professional\'s configurations', async () => {
        const response = await request(app)
          .get(`/api/availability/configs/${availabilityConfig.id}`)
          .set('Authorization', `Bearer ${testToken}`); // Client token

        expect(response.status).toBe(404); // Should not find config
      });
    });

    describe('PUT /api/availability/configs/:configId', () => {
      test('should update availability configuration', async () => {
        const updateData = {
          title: 'Updated Config',
          description: 'Updated description',
          duration_minutes: 45,
        };

        const response = await request(app)
          .put(`/api/availability/configs/${availabilityConfig.id}`)
          .set('Authorization', `Bearer ${professionalToken}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.title).toBe(updateData.title);
        expect(response.body.description).toBe(updateData.description);
        expect(response.body.duration_minutes).toBe(updateData.duration_minutes);
      });

      test('should validate timezone on update', async () => {
        const updateData = {
          timezone: 'Europe/Madrid',
        };

        const response = await request(app)
          .put(`/api/availability/configs/${availabilityConfig.id}`)
          .set('Authorization', `Bearer ${professionalToken}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.timezone).toBe('Europe/Madrid');
      });
    });

    describe('DELETE /api/availability/configs/:configId', () => {
      test('should delete availability configuration', async () => {
        const configToDelete = await prisma.professionals_availability.create({
          data: {
            professional_id: testProfessional.id,
            title: 'Config to Delete',
            timezone: 'America/Buenos_Aires',
            start_time: '09:00',
            end_time: '17:00',
            duration_minutes: 60,
            is_active: true,
          }
        });

        const response = await request(app)
          .delete(`/api/availability/configs/${configToDelete.id}`)
          .set('Authorization', `Bearer ${professionalToken}`);

        expect(response.status).toBe(200);

        // Verify deletion
        const deletedConfig = await prisma.professionals_availability.findUnique({
          where: { id: configToDelete.id }
        });
        expect(deletedConfig).toBeNull();
      });
    });
  });

  describe('Slot Generation Endpoint', () => {
    describe('POST /api/availability/configs/:configId/generate', () => {
      test('should generate slots from configuration', async () => {
        const generationData = {
          startDate: '2024-12-01',
          endDate: '2024-12-02',
        };

        const response = await request(app)
          .post(`/api/availability/configs/${availabilityConfig.id}/generate`)
          .set('Authorization', `Bearer ${professionalToken}`)
          .send(generationData);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });

      test('should validate date range', async () => {
        const invalidData = {
          startDate: '2024-12-02',
          endDate: '2024-12-01', // End before start
        };

        const response = await request(app)
          .post(`/api/availability/configs/${availabilityConfig.id}/generate`)
          .set('Authorization', `Bearer ${professionalToken}`)
          .send(invalidData);

        expect(response.status).toBe(500); // Should throw validation error
      });

      test('should validate date range limits', async () => {
        const largeRangeData = {
          startDate: '2024-01-01',
          endDate: '2025-01-01', // Too large range
        };

        const response = await request(app)
          .post(`/api/availability/configs/${availabilityConfig.id}/generate`)
          .set('Authorization', `Bearer ${professionalToken}`)
          .send(largeRangeData);

        expect(response.status).toBe(500); // Should throw range error
      });
    });
  });

  describe('Availability Slots Endpoints', () => {
    describe('GET /api/availability/slots', () => {
      test('should query availability slots', async () => {
        const queryParams = {
          professionalId: testProfessional.id,
          date: '2024-12-01',
        };

        const response = await request(app)
          .get('/api/availability/slots')
          .query(queryParams)
          .set('Authorization', `Bearer ${testToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });

      test('should filter by date range', async () => {
        const queryParams = {
          professionalId: testProfessional.id,
          startDate: '2024-12-01',
          endDate: '2024-12-02',
        };

        const response = await request(app)
          .get('/api/availability/slots')
          .query(queryParams)
          .set('Authorization', `Bearer ${testToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });

      test('should filter by status', async () => {
        const queryParams = {
          professionalId: testProfessional.id,
          status: 'available',
        };

        const response = await request(app)
          .get('/api/availability/slots')
          .query(queryParams)
          .set('Authorization', `Bearer ${testToken}`);

        expect(response.status).toBe(200);
        expect(response.body.every(slot => slot.status === 'available')).toBe(true);
      });
    });

    describe('GET /api/availability/slots/:slotId', () => {
      test('should get slot details', async () => {
        const response = await request(app)
          .get(`/api/availability/slots/${testSlot.id}`)
          .set('Authorization', `Bearer ${testToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testSlot.id);
        expect(response.body.professional_id).toBe(testProfessional.id);
      });

      test('should return 404 for non-existent slot', async () => {
        const response = await request(app)
          .get('/api/availability/slots/non-existent-id')
          .set('Authorization', `Bearer ${testToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('PUT /api/availability/slots/:slotId', () => {
      test('should update slot', async () => {
        const updateData = {
          status: 'blocked',
          meta: { reason: 'Maintenance' },
        };

        const response = await request(app)
          .put(`/api/availability/slots/${testSlot.id}`)
          .set('Authorization', `Bearer ${professionalToken}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe(updateData.status);
      });
    });

    describe('POST /api/availability/slots/:slotId/book', () => {
      test('should book available slot', async () => {
        // Reset slot to available
        await prisma.availability_slots.update({
          where: { id: testSlot.id },
          data: { status: 'available', booked_by: null, booked_at: null }
        });

        const bookingData = {
          title: 'Test Appointment',
          description: 'Integration test booking',
          appointmentType: 'service',
        };

        const response = await request(app)
          .post(`/api/availability/slots/${testSlot.id}/book`)
          .set('Authorization', `Bearer ${testToken}`)
          .send(bookingData);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('appointment');
        expect(response.body).toHaveProperty('slot');
        expect(response.body.slot.status).toBe('booked');
      });

      test('should prevent double booking', async () => {
        const bookingData = {
          title: 'Double Booking Attempt',
        };

        const response = await request(app)
          .post(`/api/availability/slots/${testSlot.id}/book`)
          .set('Authorization', `Bearer ${testToken}`)
          .send(bookingData);

        expect(response.status).toBe(409); // Conflict
        expect(response.body.error).toContain('no longer available');
      });
    });
  });

  describe('Appointment Endpoints', () => {
    let testAppointment;

    beforeAll(async () => {
      // Create a test appointment
      testAppointment = await prisma.appointments.create({
        data: {
          professional_id: testProfessional.id,
          client_id: testUser.id,
          slot_id: testSlot.id,
          availability_config_id: availabilityConfig.id,
          title: 'Test Appointment',
          scheduled_start: testSlot.start_time,
          scheduled_end: testSlot.end_time,
          timezone: testSlot.timezone,
          status: 'scheduled',
        }
      });
    });

    describe('GET /api/availability/appointments', () => {
      test('should list appointments for user', async () => {
        const response = await request(app)
          .get('/api/availability/appointments')
          .set('Authorization', `Bearer ${testToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });

      test('should filter by status', async () => {
        const response = await request(app)
          .get('/api/availability/appointments?status=scheduled')
          .set('Authorization', `Bearer ${testToken}`);

        expect(response.status).toBe(200);
        expect(response.body.every(appt => appt.status === 'scheduled')).toBe(true);
      });
    });

    describe('GET /api/availability/appointments/:appointmentId', () => {
      test('should get appointment details', async () => {
        const response = await request(app)
          .get(`/api/availability/appointments/${testAppointment.id}`)
          .set('Authorization', `Bearer ${testToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testAppointment.id);
        expect(response.body.client_id).toBe(testUser.id);
      });

      test('should prevent access to other user\'s appointments', async () => {
        // Create another user
        const otherUser = await prisma.usuarios.create({
          data: {
            nombre: 'Other Client',
            email: 'other@test.com',
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
          .get(`/api/availability/appointments/${testAppointment.id}`)
          .set('Authorization', `Bearer ${otherToken}`);

        expect(response.status).toBe(404);

        // Clean up
        await prisma.usuarios.delete({ where: { id: otherUser.id } });
      });
    });

    describe('PUT /api/availability/appointments/:appointmentId', () => {
      test('should update appointment', async () => {
        const updateData = {
          title: 'Updated Appointment',
          description: 'Updated description',
        };

        const response = await request(app)
          .put(`/api/availability/appointments/${testAppointment.id}`)
          .set('Authorization', `Bearer ${testToken}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.title).toBe(updateData.title);
      });

      test('should detect conflicts on update', async () => {
        const conflictingTime = {
          scheduled_start: new Date('2024-12-01T11:00:00Z'), // Overlaps with another slot
          scheduled_end: new Date('2024-12-01T12:00:00Z'),
        };

        const response = await request(app)
          .put(`/api/availability/appointments/${testAppointment.id}`)
          .set('Authorization', `Bearer ${testToken}`)
          .send(conflictingTime);

        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty('conflicts');
      });
    });

    describe('DELETE /api/availability/appointments/:appointmentId', () => {
      test('should cancel appointment', async () => {
        const response = await request(app)
          .delete(`/api/availability/appointments/${testAppointment.id}`)
          .set('Authorization', `Bearer ${testToken}`);

        expect(response.status).toBe(200);

        // Verify appointment status
        const updatedAppointment = await prisma.appointments.findUnique({
          where: { id: testAppointment.id }
        });
        expect(updatedAppointment.status).toBe('cancelled');
      });
    });
  });

  describe('Conflict Detection Endpoint', () => {
    describe('POST /api/availability/conflicts/check', () => {
      test('should check for conflicts', async () => {
        const conflictCheck = {
          entity: {
            professional_id: testProfessional.id,
            start_time: new Date('2024-12-01T14:00:00Z'),
            end_time: new Date('2024-12-01T15:00:00Z'),
          },
          entityType: 'slot',
        };

        const response = await request(app)
          .post('/api/availability/conflicts/check')
          .set('Authorization', `Bearer ${testToken}`)
          .send(conflictCheck);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('valid');
        expect(response.body).toHaveProperty('conflicts');
        expect(Array.isArray(response.body.conflicts)).toBe(true);
      });

      test('should detect appointment conflicts', async () => {
        const conflictCheck = {
          entity: {
            professional_id: testProfessional.id,
            client_id: testUser.id,
            scheduled_start: new Date('2024-12-01T10:00:00Z'), // Conflicts with testSlot
            scheduled_end: new Date('2024-12-01T11:00:00Z'),
          },
          entityType: 'appointment',
        };

        const response = await request(app)
          .post('/api/availability/conflicts/check')
          .set('Authorization', `Bearer ${testToken}`)
          .send(conflictCheck);

        expect(response.status).toBe(200);
        expect(response.body.valid).toBe(false);
        expect(response.body.conflicts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Timezone Endpoints', () => {
    describe('POST /api/availability/timezone/convert', () => {
      test('should convert timezone', async () => {
        const conversionData = {
          dateTime: '2024-01-01T12:00:00Z',
          fromTimezone: 'UTC',
          toTimezone: 'America/Buenos_Aires',
        };

        const response = await request(app)
          .post('/api/availability/timezone/convert')
          .set('Authorization', `Bearer ${testToken}`)
          .send(conversionData);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('utc');
        expect(response.body).toHaveProperty('local');
        expect(response.body).toHaveProperty('timezone');
        expect(response.body.timezone).toBe('America/Buenos_Aires');
      });

      test('should handle invalid timezone', async () => {
        const conversionData = {
          dateTime: '2024-01-01T12:00:00Z',
          fromTimezone: 'Invalid/Timezone',
          toTimezone: 'America/Buenos_Aires',
        };

        const response = await request(app)
          .post('/api/availability/timezone/convert')
          .set('Authorization', `Bearer ${testToken}`)
          .send(conversionData);

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/availability/timezone/list', () => {
      test('should list available timezones', async () => {
        const response = await request(app)
          .get('/api/availability/timezone/list')
          .set('Authorization', `Bearer ${testToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('timezones');
        expect(Array.isArray(response.body.timezones)).toBe(true);
        expect(response.body.timezones.length).toBeGreaterThan(0);

        // Check timezone structure
        const timezone = response.body.timezones[0];
        expect(timezone).toHaveProperty('identifier');
        expect(timezone).toHaveProperty('name');
        expect(timezone).toHaveProperty('abbreviation');
        expect(timezone).toHaveProperty('offset');
      });
    });
  });

  describe('Statistics Endpoint', () => {
    describe('GET /api/availability/stats', () => {
      test('should get availability statistics', async () => {
        const response = await request(app)
          .get('/api/availability/stats')
          .set('Authorization', `Bearer ${professionalToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('totalSlots');
        expect(response.body).toHaveProperty('bookedSlots');
        expect(response.body).toHaveProperty('availableSlots');
        expect(response.body).toHaveProperty('utilizationRate');
        expect(typeof response.body.utilizationRate).toBe('number');
      });

      test('should filter by date range', async () => {
        const queryParams = {
          startDate: '2024-12-01',
          endDate: '2024-12-31',
        };

        const response = await request(app)
          .get('/api/availability/stats')
          .query(queryParams)
          .set('Authorization', `Bearer ${professionalToken}`);

        expect(response.status).toBe(200);
        expect(response.body.period.startDate).toBe('2024-12-01');
        expect(response.body.period.endDate).toBe('2024-12-31');
      });
    });
  });

  describe('Authentication and Authorization', () => {
    test('should require authentication for all endpoints', async () => {
      const endpoints = [
        { method: 'GET', path: '/api/availability/configs' },
        { method: 'POST', path: '/api/availability/configs' },
        { method: 'GET', path: '/api/availability/slots' },
        { method: 'POST', path: `/api/availability/slots/${testSlot.id}/book` },
        { method: 'GET', path: '/api/availability/appointments' },
        { method: 'POST', path: '/api/availability/conflicts/check' },
        { method: 'GET', path: '/api/availability/timezone/list' },
        { method: 'GET', path: '/api/availability/stats' },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method.toLowerCase()](endpoint.path);
        expect(response.status).toBe(401);
      }
    });

    test('should handle malformed JWT tokens', async () => {
      const response = await request(app)
        .get('/api/availability/configs')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    test('should handle expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        { id: testUser.id, email: testUser.email, rol: testUser.rol },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Already expired
      );

      const response = await request(app)
        .get('/api/availability/configs')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // Temporarily disconnect prisma to simulate DB error
      const originalClient = prisma;
      prisma.$disconnect();

      const response = await request(app)
        .get('/api/availability/configs')
        .set('Authorization', `Bearer ${professionalToken}`);

      expect(response.status).toBe(500);

      // Restore connection (this won't work in real scenario, but for test structure)
      // In real implementation, you'd need proper DB mocking
    });

    test('should handle malformed request bodies', async () => {
      const response = await request(app)
        .post('/api/availability/configs')
        .set('Authorization', `Bearer ${professionalToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    test('should handle extremely large request bodies', async () => {
      const largeData = {
        title: 'A'.repeat(10000), // Very long title
        description: 'B'.repeat(50000), // Very long description
      };

      const response = await request(app)
        .post('/api/availability/configs')
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(largeData);

      // Should either succeed (if limits allow) or fail with validation error
      expect([200, 201, 400, 413]).toContain(response.status);
    });
  });
});
