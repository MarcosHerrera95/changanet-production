/**
 * End-to-End Tests for Timezone Scenarios
 * Tests DST transitions, different timezones, and timezone-related edge cases
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { DateTime } = require('luxon');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

describe('Timezone Scenarios E2E Tests', () => {
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
        nombre: 'Timezone Test Client',
        email: 'timezone-client@test.com',
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
        nombre: 'Timezone Test Professional',
        email: 'timezone-professional@test.com',
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

  describe('DST Transition Handling', () => {
    test('handles DST spring forward transition correctly', async () => {
      // Create availability config for New York (observes DST)
      const nyConfig = await prisma.professionals_availability.create({
        data: {
          professional_id: professionalUser.id,
          title: 'New York DST Test',
          timezone: 'America/New_York',
          start_time: '09:00',
          end_time: '17:00',
          duration_minutes: 60,
          recurrence_type: 'daily',
          is_active: true,
        }
      });

      // Generate slots around DST transition (March 2025)
      const generationData = {
        startDate: '2025-03-08', // Saturday before DST transition
        endDate: '2025-03-12',   // Wednesday after DST transition
      };

      const response = await request(app)
        .post(`/api/availability/configs/${nyConfig.id}/generate`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(generationData);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify DST transition handling
      const dstTransitionSlots = response.body.filter(slot => {
        const slotDate = DateTime.fromJSDate(new Date(slot.start_time), { zone: 'America/New_York' });
        return slotDate.month === 3 && slotDate.day >= 9 && slotDate.day <= 11; // Around March 9, 2025 DST transition
      });

      // Should have slots that account for DST
      expect(dstTransitionSlots.length).toBeGreaterThan(0);

      // Clean up
      await prisma.professionals_availability.delete({ where: { id: nyConfig.id } });
    });

    test('handles DST fall back transition correctly', async () => {
      // Create availability config for New York (observes DST)
      const nyConfig = await prisma.professionals_availability.create({
        data: {
          professional_id: professionalUser.id,
          title: 'New York DST Fall Test',
          timezone: 'America/New_York',
          start_time: '09:00',
          end_time: '17:00',
          duration_minutes: 60,
          recurrence_type: 'daily',
          is_active: true,
        }
      });

      // Generate slots around DST fall back transition (November 2025)
      const generationData = {
        startDate: '2025-11-01', // Saturday before DST transition
        endDate: '2025-11-05',   // Wednesday after DST transition
      };

      const response = await request(app)
        .post(`/api/availability/configs/${nyConfig.id}/generate`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(generationData);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify DST transition handling
      const dstTransitionSlots = response.body.filter(slot => {
        const slotDate = DateTime.fromJSDate(new Date(slot.start_time), { zone: 'America/New_York' });
        return slotDate.month === 11 && slotDate.day >= 2 && slotDate.day <= 4; // Around November 2, 2025 DST transition
      });

      // Should have slots that account for DST
      expect(dstTransitionSlots.length).toBeGreaterThan(0);

      // Clean up
      await prisma.professionals_availability.delete({ where: { id: nyConfig.id } });
    });

    test('Argentina timezone (no DST) works correctly', async () => {
      // Create availability config for Buenos Aires (no DST)
      const baConfig = await prisma.professionals_availability.create({
        data: {
          professional_id: professionalUser.id,
          title: 'Buenos Aires No DST Test',
          timezone: 'America/Buenos_Aires',
          start_time: '09:00',
          end_time: '17:00',
          duration_minutes: 60,
          recurrence_type: 'daily',
          is_active: true,
        }
      });

      // Generate slots across a month
      const generationData = {
        startDate: '2025-03-01',
        endDate: '2025-03-31',
      };

      const response = await request(app)
        .post(`/api/availability/configs/${baConfig.id}/generate`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(generationData);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // All slots should have consistent times (no DST changes)
      const firstSlot = response.body[0];
      const lastSlot = response.body[response.body.length - 1];

      expect(firstSlot.local_start_time).toBe(lastSlot.local_start_time);
      expect(firstSlot.local_end_time).toBe(lastSlot.local_end_time);

      // Clean up
      await prisma.professionals_availability.delete({ where: { id: baConfig.id } });
    });
  });

  describe('Cross-Timezone Booking Scenarios', () => {
    let nyProfessional;
    let nyToken;
    let baClient;
    let baToken;

    beforeAll(async () => {
      // Create professional in New York timezone
      nyProfessional = await prisma.usuarios.create({
        data: {
          nombre: 'NY Professional',
          email: 'ny-professional@test.com',
          password: 'hashedpassword',
          rol: 'profesional',
          esta_verificado: true,
          fcm_token: 'test-fcm-ny',
          notificaciones_push: true,
          notificaciones_email: true,
        }
      });

      nyToken = jwt.sign(
        { id: nyProfessional.id, email: nyProfessional.email, rol: nyProfessional.rol },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Create client in Buenos Aires timezone
      baClient = await prisma.usuarios.create({
        data: {
          nombre: 'BA Client',
          email: 'ba-client@test.com',
          password: 'hashedpassword',
          rol: 'cliente',
          esta_verificado: true,
          fcm_token: 'test-fcm-ba',
          notificaciones_push: true,
          notificaciones_email: true,
        }
      });

      baToken = jwt.sign(
        { id: baClient.id, email: baClient.email, rol: baClient.rol },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Create availability config for NY professional
      const nyConfig = await prisma.professionals_availability.create({
        data: {
          professional_id: nyProfessional.id,
          title: 'NY Availability',
          timezone: 'America/New_York',
          start_time: '09:00',
          end_time: '17:00',
          duration_minutes: 60,
          recurrence_type: 'daily',
          is_active: true,
        }
      });

      // Generate slots for NY professional
      await request(app)
        .post(`/api/availability/configs/${nyConfig.id}/generate`)
        .set('Authorization', `Bearer ${nyToken}`)
        .send({
          startDate: '2025-01-15',
          endDate: '2025-01-16',
        });
    });

    afterAll(async () => {
      // Clean up cross-timezone test data
      await prisma.appointments.deleteMany({
        where: {
          OR: [
            { client_id: baClient.id },
            { professional_id: nyProfessional.id }
          ]
        }
      });

      await prisma.availability_slots.deleteMany({
        where: { professional_id: nyProfessional.id }
      });

      await prisma.professionals_availability.deleteMany({
        where: { professional_id: nyProfessional.id }
      });

      await prisma.usuarios.deleteMany({
        where: {
          id: { in: [nyProfessional.id, baClient.id] }
        }
      });
    });

    test('client in different timezone sees correct local times', async () => {
      // BA client (UTC-3) looks at NY professional's (UTC-5/UTC-4) availability
      const response = await request(app)
        .get('/api/availability/slots')
        .query({
          professionalId: nyProfessional.id,
          date: '2025-01-15',
        })
        .set('Authorization', `Bearer ${baToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Slots should show correct local times for the professional's timezone
      response.body.forEach(slot => {
        expect(slot.timezone).toBe('America/New_York');
        expect(slot.local_start_time).toMatch(/^\d{2}:\d{2}$/);
        expect(slot.local_end_time).toMatch(/^\d{2}:\d{2}$/);
      });
    });

    test('timezone conversion API works for cross-timezone scenarios', async () => {
      // Convert NY time to BA time
      const conversionData = {
        dateTime: '2025-01-15T14:00:00', // 2 PM NY time
        fromTimezone: 'America/New_York',
        toTimezone: 'America/Buenos_Aires',
      };

      const response = await request(app)
        .post('/api/availability/timezone/convert')
        .set('Authorization', `Bearer ${baToken}`)
        .send(conversionData);

      expect(response.status).toBe(200);
      expect(response.body.timezone).toBe('America/Buenos_Aires');

      // 2 PM NY time should be 4 PM BA time (2 hour difference)
      const localTime = DateTime.fromISO(response.body.local);
      expect(localTime.hour).toBe(16); // 4 PM
    });

    test('booking across timezones maintains correct times', async () => {
      // Get available slots
      const slotsResponse = await request(app)
        .get('/api/availability/slots')
        .query({
          professionalId: nyProfessional.id,
          date: '2025-01-15',
          status: 'available',
        })
        .set('Authorization', `Bearer ${baToken}`);

      expect(slotsResponse.status).toBe(200);
      const availableSlot = slotsResponse.body[0];

      // BA client books NY professional's slot
      const bookingData = {
        title: 'Cross-Timezone Booking',
        description: 'Testing booking across different timezones',
      };

      const bookingResponse = await request(app)
        .post(`/api/availability/slots/${availableSlot.id}/book`)
        .set('Authorization', `Bearer ${baToken}`)
        .send(bookingData);

      expect(bookingResponse.status).toBe(200);

      const appointment = bookingResponse.body.appointment;

      // Verify appointment maintains correct timezone information
      expect(appointment.timezone).toBe('America/New_York');
      expect(appointment.scheduled_start).toBe(availableSlot.start_time);
      expect(appointment.scheduled_end).toBe(availableSlot.end_time);

      // Verify in database
      const dbAppointment = await prisma.appointments.findUnique({
        where: { id: appointment.id }
      });

      expect(dbAppointment.timezone).toBe('America/New_York');
      expect(dbAppointment.client_id).toBe(baClient.id);
      expect(dbAppointment.professional_id).toBe(nyProfessional.id);
    });
  });

  describe('Business Hours Validation Across Timezones', () => {
    test('validates business hours for different timezones', async () => {
      // Test Tokyo timezone (significant time difference)
      const tokyoConfig = await prisma.professionals_availability.create({
        data: {
          professional_id: professionalUser.id,
          title: 'Tokyo Business Hours',
          timezone: 'Asia/Tokyo',
          start_time: '09:00',
          end_time: '17:00',
          duration_minutes: 60,
          recurrence_type: 'daily',
          is_active: true,
        }
      });

      // Generate slots
      const generationData = {
        startDate: '2025-01-15',
        endDate: '2025-01-16',
      };

      const response = await request(app)
        .post(`/api/availability/configs/${tokyoConfig.id}/generate`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(generationData);

      expect(response.status).toBe(200);

      // Check business rules validation
      const conflictCheck = {
        entity: {
          professional_id: professionalUser.id,
          start_time: '2025-01-15T02:00:00Z', // 2 AM Tokyo time (outside business hours)
          end_time: '2025-01-15T03:00:00Z',
        },
        entityType: 'slot',
      };

      const conflictResponse = await request(app)
        .post('/api/availability/conflicts/check')
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(conflictCheck);

      expect(conflictResponse.status).toBe(200);
      expect(conflictResponse.body.conflicts.length).toBeGreaterThan(0);

      // Should detect business hours violation
      const businessHoursConflict = conflictResponse.body.conflicts.find(
        c => c.type === 'business_rule_violation'
      );
      expect(businessHoursConflict).toBeDefined();

      // Clean up
      await prisma.professionals_availability.delete({ where: { id: tokyoConfig.id } });
    });

    test('handles timezone offset calculations correctly', async () => {
      // Test with multiple timezones
      const timezones = [
        'America/Los_Angeles', // UTC-8
        'America/New_York',    // UTC-5
        'Europe/London',       // UTC+0
        'Europe/Paris',        // UTC+1
        'Asia/Tokyo',          // UTC+9
        'Australia/Sydney',    // UTC+10
      ];

      for (const tz of timezones) {
        const conversionData = {
          dateTime: '2025-01-15T12:00:00Z', // Noon UTC
          fromTimezone: 'UTC',
          toTimezone: tz,
        };

        const response = await request(app)
          .post('/api/availability/timezone/convert')
          .set('Authorization', `Bearer ${clientToken}`)
          .send(conversionData);

        expect(response.status).toBe(200);
        expect(response.body.timezone).toBe(tz);
        expect(response.body).toHaveProperty('offset');
        expect(typeof response.body.offset).toBe('number');
      }
    });
  });

  describe('Recurring Events and Timezone Adjustments', () => {
    test('weekly recurring events maintain correct times across DST', async () => {
      // Create weekly recurring availability that spans DST transition
      const weeklyConfig = await prisma.professionals_availability.create({
        data: {
          professional_id: professionalUser.id,
          title: 'Weekly DST Test',
          timezone: 'America/New_York',
          start_time: '10:00',
          end_time: '16:00',
          duration_minutes: 60,
          recurrence_type: 'weekly',
          recurrence_config: JSON.stringify({
            weekdays: [1, 3, 5], // Monday, Wednesday, Friday
          }),
          is_active: true,
        }
      });

      // Generate slots spanning DST transition (March 2025)
      const generationData = {
        startDate: '2025-03-01',
        endDate: '2025-04-01',
      };

      const response = await request(app)
        .post(`/api/availability/configs/${weeklyConfig.id}/generate`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(generationData);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Group slots by weekday
      const slotsByWeekday = {};
      response.body.forEach(slot => {
        const date = DateTime.fromJSDate(new Date(slot.start_time), { zone: 'America/New_York' });
        const weekday = date.weekday;
        if (!slotsByWeekday[weekday]) {
          slotsByWeekday[weekday] = [];
        }
        slotsByWeekday[weekday].push(slot);
      });

      // Each weekday should have consistent local times
      Object.values(slotsByWeekday).forEach(weekdaySlots => {
        const firstSlot = weekdaySlots[0];
        weekdaySlots.forEach(slot => {
          expect(slot.local_start_time).toBe(firstSlot.local_start_time);
          expect(slot.local_end_time).toBe(firstSlot.local_end_time);
        });
      });

      // Clean up
      await prisma.professionals_availability.delete({ where: { id: weeklyConfig.id } });
    });

    test('custom recurring patterns work with timezone conversions', async () => {
      // Create custom recurring pattern
      const customConfig = await prisma.professionals_availability.create({
        data: {
          professional_id: professionalUser.id,
          title: 'Custom Recurrence Test',
          timezone: 'Europe/London',
          start_time: '14:00',
          end_time: '15:00',
          duration_minutes: 60,
          recurrence_type: 'custom',
          recurrence_config: JSON.stringify({
            pattern: 'biweekly', // Every two weeks
            startDate: '2025-01-01',
          }),
          is_active: true,
        }
      });

      // Generate slots
      const generationData = {
        startDate: '2025-01-01',
        endDate: '2025-02-01',
      };

      const response = await request(app)
        .post(`/api/availability/configs/${customConfig.id}/generate`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(generationData);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // All slots should have consistent local times
      response.body.forEach(slot => {
        expect(slot.local_start_time).toBe('14:00');
        expect(slot.local_end_time).toBe('15:00');
        expect(slot.timezone).toBe('Europe/London');
      });

      // Clean up
      await prisma.professionals_availability.delete({ where: { id: customConfig.id } });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles invalid timezone gracefully', async () => {
      const invalidConfigData = {
        title: 'Invalid Timezone Test',
        timezone: 'Invalid/Timezone',
        start_time: '09:00',
        end_time: '17:00',
        duration_minutes: 60,
      };

      const response = await request(app)
        .post('/api/availability/configs')
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(invalidConfigData);

      expect(response.status).toBe(201); // Should use fallback timezone
      expect(response.body.timezone).toBe('America/Buenos_Aires'); // Default fallback
    });

    test('timezone conversion handles edge dates', async () => {
      // Test with dates near DST transitions
      const edgeCases = [
        '2025-03-09T02:00:00Z', // During DST spring forward
        '2025-11-02T01:00:00Z', // During DST fall back
        '2025-12-31T23:59:59Z', // Year end
        '2025-01-01T00:00:00Z', // Year start
      ];

      for (const dateTime of edgeCases) {
        const conversionData = {
          dateTime,
          fromTimezone: 'UTC',
          toTimezone: 'America/New_York',
        };

        const response = await request(app)
          .post('/api/availability/timezone/convert')
          .set('Authorization', `Bearer ${clientToken}`)
          .send(conversionData);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('local');
        expect(response.body).toHaveProperty('utc');
      }
    });

    test('handles timezone conversion for dates far in the future', async () => {
      const futureDate = '2030-12-31T12:00:00Z';

      const conversionData = {
        dateTime: futureDate,
        fromTimezone: 'UTC',
        toTimezone: 'Pacific/Auckland',
      };

      const response = await request(app)
        .post('/api/availability/timezone/convert')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(conversionData);

      expect(response.status).toBe(200);
      expect(response.body.timezone).toBe('Pacific/Auckland');
    });

    test('timezone list includes all major timezones', async () => {
      const response = await request(app)
        .get('/api/availability/timezone/list')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(200);

      const timezones = response.body.timezones;
      expect(timezones.length).toBeGreaterThan(15);

      // Should include major timezone regions
      const timezoneIds = timezones.map(tz => tz.identifier);
      expect(timezoneIds).toContain('America/New_York');
      expect(timezoneIds).toContain('Europe/London');
      expect(timezoneIds).toContain('Asia/Tokyo');
      expect(timezoneIds).toContain('Australia/Sydney');
      expect(timezoneIds).toContain('America/Buenos_Aires');
    });

    test('DST detection works correctly for different regions', async () => {
      const testCases = [
        { timezone: 'America/New_York', date: '2025-07-15T12:00:00Z', expectedDST: true },  // Summer - DST
        { timezone: 'America/New_York', date: '2025-01-15T12:00:00Z', expectedDST: false }, // Winter - Standard
        { timezone: 'Europe/London', date: '2025-07-15T12:00:00Z', expectedDST: true },     // Summer - DST
        { timezone: 'Europe/London', date: '2025-01-15T12:00:00Z', expectedDST: false },    // Winter - Standard
        { timezone: 'America/Buenos_Aires', date: '2025-07-15T12:00:00Z', expectedDST: false }, // No DST
        { timezone: 'America/Buenos_Aires', date: '2025-01-15T12:00:00Z', expectedDST: false }, // No DST
      ];

      for (const testCase of testCases) {
        const conversionData = {
          dateTime: testCase.date,
          fromTimezone: 'UTC',
          toTimezone: testCase.timezone,
        };

        const response = await request(app)
          .post('/api/availability/timezone/convert')
          .set('Authorization', `Bearer ${clientToken}`)
          .send(conversionData);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('isDST');
        expect(response.body.isDST).toBe(testCase.expectedDST);
      }
    });
  });
});
