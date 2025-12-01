/**
 * End-to-End Tests for Conflict Resolution
 * Tests manual and automatic conflict resolution scenarios
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

describe('Conflict Resolution E2E Tests', () => {
  let server;
  let app;
  let clientUser;
  let professionalUser;
  let clientToken;
  let professionalToken;
  let availabilityConfig;
  let testSlots;
  let conflictingAppointment;

  beforeAll(async () => {
    // Start test server
    server = require('../../../server');
    app = server.app || server;

    // Create test users
    clientUser = await prisma.usuarios.create({
      data: {
        nombre: 'Conflict Test Client',
        email: 'conflict-client@test.com',
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
        nombre: 'Conflict Test Professional',
        email: 'conflict-professional@test.com',
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

    // Create test slots
    testSlots = [];
    for (let i = 0; i < 5; i++) {
      const slot = await prisma.availability_slots.create({
        data: {
          professional_id: professionalUser.id,
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

  describe('Slot Overlap Conflicts', () => {
    test('detects slot overlap when creating availability slots', async () => {
      // Create overlapping slot
      const overlappingSlot = await prisma.availability_slots.create({
        data: {
          professional_id: professionalUser.id,
          availability_config_id: availabilityConfig.id,
          start_time: new Date('2024-12-01T10:30:00Z'), // Overlaps with first slot
          end_time: new Date('2024-12-01T11:30:00Z'),
          local_start_time: '10:30',
          local_end_time: '11:30',
          timezone: 'America/Buenos_Aires',
          status: 'available',
          is_available: true,
        }
      });

      // Check conflicts
      const conflictCheck = {
        entity: overlappingSlot,
        entityType: 'slot',
      };

      const response = await request(app)
        .post('/api/availability/conflicts/check')
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(conflictCheck);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.conflicts.length).toBeGreaterThan(0);

      const overlapConflict = response.body.conflicts.find(c => c.type === 'slot_overlap');
      expect(overlapConflict).toBeDefined();
      expect(overlapConflict.severity).toBe('high');

      // Clean up
      await prisma.availability_slots.delete({ where: { id: overlappingSlot.id } });
    });

    test('prevents booking overlapping appointments', async () => {
      // Book first slot
      const bookingData1 = {
        title: 'First Booking',
        description: 'First appointment',
      };

      const bookingResponse1 = await request(app)
        .post(`/api/availability/slots/${testSlots[0].id}/book`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(bookingData1);

      expect(bookingResponse1.status).toBe(200);

      // Try to book overlapping slot
      const bookingData2 = {
        title: 'Overlapping Booking',
        description: 'Should conflict',
      };

      const bookingResponse2 = await request(app)
        .post(`/api/availability/slots/${testSlots[1].id}/book`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(bookingData2);

      expect(bookingResponse2.status).toBe(409);
      expect(bookingResponse2.body.error).toContain('no longer available');

      // Clean up first booking
      await request(app)
        .delete(`/api/availability/appointments/${bookingResponse1.body.appointment.id}`)
        .set('Authorization', `Bearer ${clientToken}`);
    });
  });

  describe('Double Booking Prevention', () => {
    test('prevents professional double booking', async () => {
      // Create two clients
      const client2 = await prisma.usuarios.create({
        data: {
          nombre: 'Second Client',
          email: 'second-client@test.com',
          password: 'hashedpassword',
          rol: 'cliente',
          esta_verificado: true,
          fcm_token: 'test-fcm-client2',
          notificaciones_push: true,
          notificaciones_email: true,
        }
      });

      const client2Token = jwt.sign(
        { id: client2.id, email: client2.email, rol: client2.rol },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // First client books a slot
      const bookingData1 = {
        title: 'First Client Booking',
        description: 'First client appointment',
      };

      const bookingResponse1 = await request(app)
        .post(`/api/availability/slots/${testSlots[0].id}/book`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(bookingData1);

      expect(bookingResponse1.status).toBe(200);

      // Second client tries to book the same slot
      const bookingData2 = {
        title: 'Second Client Booking',
        description: 'Should be prevented',
      };

      const bookingResponse2 = await request(app)
        .post(`/api/availability/slots/${testSlots[0].id}/book`)
        .set('Authorization', `Bearer ${client2Token}`)
        .send(bookingData2);

      expect(bookingResponse2.status).toBe(409);

      // Clean up
      await request(app)
        .delete(`/api/availability/appointments/${bookingResponse1.body.appointment.id}`)
        .set('Authorization', `Bearer ${clientToken}`);

      await prisma.usuarios.delete({ where: { id: client2.id } });
    });

    test('allows client to have multiple non-conflicting appointments', async () => {
      // Book two different slots for the same client
      const bookingData1 = {
        title: 'First Appointment',
        description: 'First slot booking',
      };

      const bookingData2 = {
        title: 'Second Appointment',
        description: 'Second slot booking',
      };

      const bookingResponse1 = await request(app)
        .post(`/api/availability/slots/${testSlots[0].id}/book`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(bookingData1);

      const bookingResponse2 = await request(app)
        .post(`/api/availability/slots/${testSlots[2].id}/book`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(bookingData2);

      expect(bookingResponse1.status).toBe(200);
      expect(bookingResponse2.status).toBe(200);

      // Both appointments should exist
      const clientAppointments = await request(app)
        .get('/api/availability/appointments')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(clientAppointments.status).toBe(200);
      expect(clientAppointments.body.length).toBe(2);

      // Clean up
      await request(app)
        .delete(`/api/availability/appointments/${bookingResponse1.body.appointment.id}`)
        .set('Authorization', `Bearer ${clientToken}`);

      await request(app)
        .delete(`/api/availability/appointments/${bookingResponse2.body.appointment.id}`)
        .set('Authorization', `Bearer ${clientToken}`);
    });
  });

  describe('Blocked Time Conflicts', () => {
    test('respects blocked time periods', async () => {
      // Create a blocked time period
      const blockedTime = await prisma.blocked_slots.create({
        data: {
          professional_id: professionalUser.id,
          title: 'Lunch Break',
          reason: 'lunch',
          description: 'Daily lunch break',
          start_time: new Date('2024-12-01T12:00:00Z'),
          end_time: new Date('2024-12-01T13:00:00Z'),
          timezone: 'America/Buenos_Aires',
          is_active: true,
          created_by: professionalUser.id,
        }
      });

      // Try to book a slot that overlaps with blocked time
      const overlappingSlot = await prisma.availability_slots.create({
        data: {
          professional_id: professionalUser.id,
          availability_config_id: availabilityConfig.id,
          start_time: new Date('2024-12-01T12:30:00Z'), // Overlaps with lunch break
          end_time: new Date('2024-12-01T13:30:00Z'),
          local_start_time: '12:30',
          local_end_time: '13:30',
          timezone: 'America/Buenos_Aires',
          status: 'available',
          is_available: true,
        }
      });

      const conflictCheck = {
        entity: overlappingSlot,
        entityType: 'slot',
      };

      const response = await request(app)
        .post('/api/availability/conflicts/check')
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(conflictCheck);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);

      const blockedConflict = response.body.conflicts.find(c => c.type === 'blocked_time');
      expect(blockedConflict).toBeDefined();
      expect(blockedConflict.severity).toBe('critical');

      // Clean up
      await prisma.availability_slots.delete({ where: { id: overlappingSlot.id } });
      await prisma.blocked_slots.delete({ where: { id: blockedTime.id } });
    });

    test('allows booking outside blocked time', async () => {
      // Create blocked time
      const blockedTime = await prisma.blocked_slots.create({
        data: {
          professional_id: professionalUser.id,
          title: 'Meeting',
          reason: 'meeting',
          description: 'Team meeting',
          start_time: new Date('2024-12-01T14:00:00Z'),
          end_time: new Date('2024-12-01T15:00:00Z'),
          timezone: 'America/Buenos_Aires',
          is_active: true,
          created_by: professionalUser.id,
        }
      });

      // Book slot outside blocked time
      const bookingData = {
        title: 'Non-conflicting Booking',
        description: 'Booking outside blocked time',
      };

      const bookingResponse = await request(app)
        .post(`/api/availability/slots/${testSlots[0].id}/book`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(bookingData);

      expect(bookingResponse.status).toBe(200);

      // Clean up
      await request(app)
        .delete(`/api/availability/appointments/${bookingResponse.body.appointment.id}`)
        .set('Authorization', `Bearer ${clientToken}`);

      await prisma.blocked_slots.delete({ where: { id: blockedTime.id } });
    });
  });

  describe('Business Rule Violations', () => {
    test('enforces minimum advance booking time', async () => {
      // Create slot for today (violates minimum advance booking)
      const todaySlot = await prisma.availability_slots.create({
        data: {
          professional_id: professionalUser.id,
          availability_config_id: availabilityConfig.id,
          start_time: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          end_time: new Date(Date.now() + 3 * 60 * 60 * 1000),   // 3 hours from now
          local_start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(11, 16),
          local_end_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(11, 16),
          timezone: 'America/Buenos_Aires',
          status: 'available',
          is_available: true,
        }
      });

      const conflictCheck = {
        entity: {
          professional_id: professionalUser.id,
          client_id: clientUser.id,
          scheduled_start: todaySlot.start_time,
          scheduled_end: todaySlot.end_time,
        },
        entityType: 'appointment',
      };

      const response = await request(app)
        .post('/api/availability/conflicts/check')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(conflictCheck);

      expect(response.status).toBe(200);

      const advanceBookingConflict = response.body.conflicts.find(
        c => c.type === 'business_rule_violation' && c.message.includes('24 hours')
      );
      expect(advanceBookingConflict).toBeDefined();
      expect(advanceBookingConflict.severity).toBe('medium');

      // Clean up
      await prisma.availability_slots.delete({ where: { id: todaySlot.id } });
    });

    test('enforces maximum advance booking time', async () => {
      // Create slot too far in the future
      const farFutureSlot = await prisma.availability_slots.create({
        data: {
          professional_id: professionalUser.id,
          availability_config_id: availabilityConfig.id,
          start_time: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000), // 100 days from now
          end_time: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
          local_start_time: '10:00',
          local_end_time: '11:00',
          timezone: 'America/Buenos_Aires',
          status: 'available',
          is_available: true,
        }
      });

      const conflictCheck = {
        entity: {
          professional_id: professionalUser.id,
          client_id: clientUser.id,
          scheduled_start: farFutureSlot.start_time,
          scheduled_end: farFutureSlot.end_time,
        },
        entityType: 'appointment',
      };

      const response = await request(app)
        .post('/api/availability/conflicts/check')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(conflictCheck);

      expect(response.status).toBe(200);

      const maxAdvanceConflict = response.body.conflicts.find(
        c => c.type === 'business_rule_violation' && c.message.includes('90 days')
      );
      expect(maxAdvanceConflict).toBeDefined();
      expect(maxAdvanceConflict.severity).toBe('low');

      // Clean up
      await prisma.availability_slots.delete({ where: { id: farFutureSlot.id } });
    });

    test('validates business hours', async () => {
      // Create slot outside business hours
      const afterHoursSlot = await prisma.availability_slots.create({
        data: {
          professional_id: professionalUser.id,
          availability_config_id: availabilityConfig.id,
          start_time: new Date('2024-12-01T22:00:00Z'), // 10 PM
          end_time: new Date('2024-12-01T23:00:00Z'),   // 11 PM
          local_start_time: '22:00',
          local_end_time: '23:00',
          timezone: 'America/Buenos_Aires',
          status: 'available',
          is_available: true,
        }
      });

      const conflictCheck = {
        entity: {
          professional_id: professionalUser.id,
          client_id: clientUser.id,
          scheduled_start: afterHoursSlot.start_time,
          scheduled_end: afterHoursSlot.end_time,
        },
        entityType: 'appointment',
      };

      const response = await request(app)
        .post('/api/availability/conflicts/check')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(conflictCheck);

      expect(response.status).toBe(200);

      const businessHoursConflict = response.body.conflicts.find(
        c => c.type === 'business_rule_violation' && c.message.includes('business hours')
      );
      expect(businessHoursConflict).toBeDefined();
      expect(businessHoursConflict.severity).toBe('medium');

      // Clean up
      await prisma.availability_slots.delete({ where: { id: afterHoursSlot.id } });
    });
  });

  describe('Conflict Resolution Strategies', () => {
    test('strict resolution blocks conflicting operations', async () => {
      // Book a slot first
      const bookingData = {
        title: 'Strict Resolution Test',
        description: 'Testing strict conflict resolution',
      };

      const bookingResponse = await request(app)
        .post(`/api/availability/slots/${testSlots[0].id}/book`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(bookingData);

      expect(bookingResponse.status).toBe(200);

      // Try to update the appointment to conflict with business rules
      const updateData = {
        scheduled_start: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
        scheduled_end: new Date(Date.now() + 2 * 60 * 60 * 1000),
      };

      const updateResponse = await request(app)
        .put(`/api/availability/appointments/${bookingResponse.body.appointment.id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(updateData);

      expect(updateResponse.status).toBe(409);
      expect(updateResponse.body).toHaveProperty('conflicts');

      // Clean up
      await request(app)
        .delete(`/api/availability/appointments/${bookingResponse.body.appointment.id}`)
        .set('Authorization', `Bearer ${clientToken}`);
    });

    test('allows valid appointment updates', async () => {
      // Book a slot
      const bookingData = {
        title: 'Valid Update Test',
        description: 'Testing valid appointment updates',
      };

      const bookingResponse = await request(app)
        .post(`/api/availability/slots/${testSlots[0].id}/book`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(bookingData);

      expect(bookingResponse.status).toBe(200);

      // Update with valid data (just change title and description)
      const updateData = {
        title: 'Updated Valid Title',
        description: 'Updated description',
      };

      const updateResponse = await request(app)
        .put(`/api/availability/appointments/${bookingResponse.body.appointment.id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(updateData);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.title).toBe(updateData.title);
      expect(updateResponse.body.description).toBe(updateData.description);

      // Clean up
      await request(app)
        .delete(`/api/availability/appointments/${bookingResponse.body.appointment.id}`)
        .set('Authorization', `Bearer ${clientToken}`);
    });
  });

  describe('Resource Constraint Conflicts', () => {
    test('handles slot availability constraints', async () => {
      // Mark a slot as booked directly in database
      await prisma.availability_slots.update({
        where: { id: testSlots[0].id },
        data: { status: 'booked', booked_by: 'external-system' }
      });

      // Try to book the same slot
      const bookingData = {
        title: 'Resource Constraint Test',
        description: 'Should fail due to resource constraint',
      };

      const bookingResponse = await request(app)
        .post(`/api/availability/slots/${testSlots[0].id}/book`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(bookingData);

      expect(bookingResponse.status).toBe(409);

      // Reset slot
      await prisma.availability_slots.update({
        where: { id: testSlots[0].id },
        data: { status: 'available', booked_by: null, booked_at: null }
      });
    });

    test('validates slot exists before booking', async () => {
      const bookingData = {
        title: 'Non-existent Slot Test',
        description: 'Should fail - slot does not exist',
      };

      const bookingResponse = await request(app)
        .post('/api/availability/slots/non-existent-slot-id/book')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(bookingData);

      expect(bookingResponse.status).toBe(404);
    });
  });

  describe('Complex Multi-Conflict Scenarios', () => {
    test('handles multiple simultaneous conflicts', async () => {
      // Create multiple conflicting conditions
      const blockedTime = await prisma.blocked_slots.create({
        data: {
          professional_id: professionalUser.id,
          title: 'Complex Conflict Test',
          reason: 'testing',
          description: 'Blocked for testing',
          start_time: new Date('2024-12-01T10:00:00Z'),
          end_time: new Date('2024-12-01T11:00:00Z'),
          timezone: 'America/Buenos_Aires',
          is_active: true,
          created_by: professionalUser.id,
        }
      });

      // Book another slot first
      const bookingData = {
        title: 'Existing Booking',
        description: 'Already booked slot',
      };

      const bookingResponse = await request(app)
        .post(`/api/availability/slots/${testSlots[1].id}/book`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(bookingData);

      expect(bookingResponse.status).toBe(200);

      // Try to create an appointment that conflicts with both blocked time and existing booking
      const conflictCheck = {
        entity: {
          professional_id: professionalUser.id,
          client_id: clientUser.id,
          scheduled_start: new Date('2024-12-01T10:30:00Z'), // Conflicts with both
          scheduled_end: new Date('2024-12-01T11:30:00Z'),
        },
        entityType: 'appointment',
      };

      const response = await request(app)
        .post('/api/availability/conflicts/check')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(conflictCheck);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.conflicts.length).toBeGreaterThan(1); // Multiple conflicts

      // Should have both blocked time and double booking conflicts
      const conflictTypes = response.body.conflicts.map(c => c.type);
      expect(conflictTypes).toContain('blocked_time');
      expect(conflictTypes).toContain('double_booking');

      // Clean up
      await request(app)
        .delete(`/api/availability/appointments/${bookingResponse.body.appointment.id}`)
        .set('Authorization', `Bearer ${clientToken}`);

      await prisma.blocked_slots.delete({ where: { id: blockedTime.id } });
    });

    test('resolves conflicts when conditions are removed', async () => {
      // Create blocked time
      const blockedTime = await prisma.blocked_slots.create({
        data: {
          professional_id: professionalUser.id,
          title: 'Temporary Block',
          reason: 'maintenance',
          description: 'Temporary maintenance block',
          start_time: new Date('2024-12-01T10:00:00Z'),
          end_time: new Date('2024-12-01T11:00:00Z'),
          timezone: 'America/Buenos_Aires',
          is_active: true,
          created_by: professionalUser.id,
        }
      });

      // Check conflicts - should fail
      const conflictCheck1 = {
        entity: {
          professional_id: professionalUser.id,
          client_id: clientUser.id,
          scheduled_start: new Date('2024-12-01T10:00:00Z'),
          scheduled_end: new Date('2024-12-01T11:00:00Z'),
        },
        entityType: 'appointment',
      };

      const conflictResponse1 = await request(app)
        .post('/api/availability/conflicts/check')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(conflictCheck1);

      expect(conflictResponse1.status).toBe(200);
      expect(conflictResponse1.body.valid).toBe(false);

      // Remove blocked time
      await prisma.blocked_slots.delete({ where: { id: blockedTime.id } });

      // Check conflicts again - should pass
      const conflictResponse2 = await request(app)
        .post('/api/availability/conflicts/check')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(conflictCheck1);

      expect(conflictResponse2.status).toBe(200);
      expect(conflictResponse2.body.valid).toBe(true);
    });
  });

  describe('Conflict Reporting and Analytics', () => {
    test('provides detailed conflict information', async () => {
      // Create a conflict scenario
      const blockedTime = await prisma.blocked_slots.create({
        data: {
          professional_id: professionalUser.id,
          title: 'Conflict Analysis',
          reason: 'analysis',
          description: 'For conflict analysis testing',
          start_time: new Date('2024-12-01T10:00:00Z'),
          end_time: new Date('2024-12-01T11:00:00Z'),
          timezone: 'America/Buenos_Aires',
          is_active: true,
          created_by: professionalUser.id,
        }
      });

      const conflictCheck = {
        entity: {
          professional_id: professionalUser.id,
          client_id: clientUser.id,
          scheduled_start: new Date('2024-12-01T10:30:00Z'),
          scheduled_end: new Date('2024-12-01T11:30:00Z'),
        },
        entityType: 'appointment',
      };

      const response = await request(app)
        .post('/api/availability/conflicts/check')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(conflictCheck);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('conflicts');
      expect(response.body).toHaveProperty('criticalConflicts');
      expect(response.body).toHaveProperty('summary');

      // Check conflict details
      const conflict = response.body.conflicts[0];
      expect(conflict).toHaveProperty('type');
      expect(conflict).toHaveProperty('severity');
      expect(conflict).toHaveProperty('message');
      expect(conflict).toHaveProperty('details');

      // Check summary
      expect(response.body.summary).toHaveProperty('totalConflicts');
      expect(response.body.summary).toHaveProperty('criticalCount');
      expect(response.body.summary).toHaveProperty('warningsCount');
      expect(response.body.summary).toHaveProperty('infoCount');

      // Clean up
      await prisma.blocked_slots.delete({ where: { id: blockedTime.id } });
    });

    test('tracks conflict resolution outcomes', async () => {
      // Create and resolve a conflict scenario
      const blockedTime = await prisma.blocked_slots.create({
        data: {
          professional_id: professionalUser.id,
          title: 'Resolution Tracking',
          reason: 'tracking',
          description: 'For resolution tracking testing',
          start_time: new Date('2024-12-01T10:00:00Z'),
          end_time: new Date('2024-12-01T11:00:00Z'),
          timezone: 'America/Buenos_Aires',
          is_active: true,
          created_by: professionalUser.id,
        }
      });

      // Initially conflicts
      const conflictCheck1 = {
        entity: {
          professional_id: professionalUser.id,
          client_id: clientUser.id,
          scheduled_start: new Date('2024-12-01T10:00:00Z'),
          scheduled_end: new Date('2024-12-01T11:00:00Z'),
        },
        entityType: 'appointment',
      };

      const response1 = await request(app)
        .post('/api/availability/conflicts/check')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(conflictCheck1);

      expect(response1.body.valid).toBe(false);

      // Remove conflict
      await prisma.blocked_slots.update({
        where: { id: blockedTime.id },
        data: { is_active: false }
      });

      // Check again - should be resolved
      const response2 = await request(app)
        .post('/api/availability/conflicts/check')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(conflictCheck1);

      expect(response2.body.valid).toBe(true);

      // Clean up
      await prisma.blocked_slots.delete({ where: { id: blockedTime.id } });
    });
  });
});
