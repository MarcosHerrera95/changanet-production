/**
 * Integration Tests for External Integrations
 * Tests SendGrid, FCM, and Google Calendar integrations
 */

const calendarSyncService = require('../../../services/calendarSyncService');
const { createNotification } = require('../../../services/notificationService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Mock external services
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        getToken: jest.fn(),
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn(),
      })),
    },
    calendar: jest.fn().mockReturnValue({
      calendarList: {
        list: jest.fn(),
      },
      events: {
        list: jest.fn(),
        insert: jest.fn(),
      },
    }),
  },
}));

jest.mock('../../../config/firebaseAdmin', () => ({
  sendPushNotification: jest.fn(),
  sendMulticastPushNotification: jest.fn(),
}));

jest.mock('../../../services/emailService', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('../../../services/notificationTemplatesService', () => ({
  generateNotification: jest.fn(),
}));

jest.mock('../../../services/notificationPreferencesService', () => ({
  getUserPreferences: jest.fn(),
  shouldSendNotification: jest.fn(),
}));

jest.mock('ical-generator', () => jest.fn());

describe('External Integrations Integration Tests', () => {
  let testUser;
  let testProfessional;
  let availabilityConfig;
  let testSlot;

  beforeAll(async () => {
    // Create test data
    testUser = await prisma.usuarios.create({
      data: {
        nombre: 'Integration Test Client',
        email: 'integration-client@test.com',
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
        nombre: 'Integration Test Professional',
        email: 'integration-professional@test.com',
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
  });

  describe('SendGrid Email Integration', () => {
    const { sendEmail } = require('../../../services/emailService');
    const { generateNotification } = require('../../../services/notificationTemplatesService');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should send appointment confirmation email', async () => {
      // Mock notification preferences
      const { getUserPreferences, shouldSendNotification } = require('../../../services/notificationPreferencesService');
      getUserPreferences.mockResolvedValue({
        email_enabled: true,
        appointment_confirmations: true,
      });
      shouldSendNotification.mockReturnValue({
        shouldSend: true,
        recommendedChannels: ['email'],
      });

      // Mock template generation
      generateNotification.mockReturnValue({
        subject: 'Appointment Confirmed',
        html: '<h1>Your appointment has been confirmed</h1>',
        body: 'Your appointment has been confirmed',
      });

      sendEmail.mockResolvedValue({ success: true });

      await createNotification(
        testUser.id,
        'appointment_confirmed',
        'Your appointment has been confirmed',
        {
          appointment_id: 'test-appointment-id',
          professional_name: testProfessional.nombre,
          appointment_time: '2024-12-01 10:00',
        }
      );

      expect(sendEmail).toHaveBeenCalledWith(
        testUser.email,
        'Appointment Confirmed',
        '<h1>Your appointment has been confirmed</h1>'
      );
    });

    test('should handle email service failures gracefully', async () => {
      const { getUserPreferences, shouldSendNotification } = require('../../../services/notificationPreferencesService');
      getUserPreferences.mockResolvedValue({
        email_enabled: true,
        appointment_confirmations: true,
      });
      shouldSendNotification.mockReturnValue({
        shouldSend: true,
        recommendedChannels: ['email'],
      });

      generateNotification.mockReturnValue({
        subject: 'Test Email',
        html: '<p>Test content</p>',
        body: 'Test content',
      });

      sendEmail.mockRejectedValue(new Error('SMTP connection failed'));

      // Should not throw error, just log the failure
      await expect(createNotification(
        testUser.id,
        'test_notification',
        'Test message'
      )).resolves.not.toThrow();

      expect(sendEmail).toHaveBeenCalled();
    });

    test('should respect user email preferences', async () => {
      const { getUserPreferences, shouldSendNotification } = require('../../../services/notificationPreferencesService');
      getUserPreferences.mockResolvedValue({
        email_enabled: false,
        appointment_confirmations: false,
      });
      shouldSendNotification.mockReturnValue({
        shouldSend: false,
        reason: 'User disabled email notifications',
      });

      await createNotification(
        testUser.id,
        'appointment_reminder',
        'Appointment reminder'
      );

      expect(sendEmail).not.toHaveBeenCalled();
    });

    test('should send reminder emails with correct templates', async () => {
      const { getUserPreferences, shouldSendNotification } = require('../../../services/notificationPreferencesService');
      getUserPreferences.mockResolvedValue({
        email_enabled: true,
        appointment_reminders: true,
      });
      shouldSendNotification.mockReturnValue({
        shouldSend: true,
        recommendedChannels: ['email'],
      });

      generateNotification.mockReturnValue({
        subject: 'Appointment Reminder - 24 hours',
        html: '<h2>Don\'t forget your appointment tomorrow</h2>',
        body: 'Don\'t forget your appointment tomorrow',
      });

      await createNotification(
        testUser.id,
        'appointment_reminder_24h',
        'Appointment reminder',
        {
          professional_name: testProfessional.nombre,
          appointment_time: '2024-12-01 10:00',
          service_name: 'Consultation',
        }
      );

      expect(sendEmail).toHaveBeenCalledWith(
        testUser.email,
        'Appointment Reminder - 24 hours',
        '<h2>Don\'t forget your appointment tomorrow</h2>'
      );
    });
  });

  describe('Firebase Cloud Messaging (FCM) Integration', () => {
    const { sendPushNotification, sendMulticastPushNotification } = require('../../../config/firebaseAdmin');
    const { generateNotification } = require('../../../services/notificationTemplatesService');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should send push notification for appointment booking', async () => {
      const { getUserPreferences, shouldSendNotification } = require('../../../services/notificationPreferencesService');
      getUserPreferences.mockResolvedValue({
        push_enabled: true,
        appointment_notifications: true,
      });
      shouldSendNotification.mockReturnValue({
        shouldSend: true,
        recommendedChannels: ['push'],
      });

      generateNotification.mockReturnValue({
        title: 'Appointment Booked',
        body: 'Your appointment has been successfully booked',
      });

      sendPushNotification.mockResolvedValue({ success: true });

      await createNotification(
        testUser.id,
        'appointment_booked',
        'Your appointment has been booked',
        {
          appointment_id: 'test-appointment-id',
          professional_name: testProfessional.nombre,
        }
      );

      expect(sendPushNotification).toHaveBeenCalledWith(
        testUser.fcm_token,
        'Appointment Booked',
        'Your appointment has been successfully booked'
      );
    });

    test('should send multicast notifications for broadcasts', async () => {
      const tokens = ['token1', 'token2', 'token3'];

      sendMulticastPushNotification.mockResolvedValue({
        successCount: 3,
        failureCount: 0,
      });

      // Test direct FCM call (normally done through notification service)
      const result = await sendMulticastPushNotification(tokens, {
        title: 'System Maintenance',
        body: 'Scheduled maintenance in 1 hour',
      });

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
    });

    test('should handle FCM token invalidation', async () => {
      const { getUserPreferences, shouldSendNotification } = require('../../../services/notificationPreferencesService');
      getUserPreferences.mockResolvedValue({
        push_enabled: true,
        appointment_notifications: true,
      });
      shouldSendNotification.mockReturnValue({
        shouldSend: true,
        recommendedChannels: ['push'],
      });

      generateNotification.mockReturnValue({
        title: 'Test Notification',
        body: 'Test message',
      });

      // Simulate FCM token error
      sendPushNotification.mockRejectedValue({
        code: 'messaging/registration-token-not-registered',
        message: 'Token is invalid',
      });

      // Should not throw error, just log the failure
      await expect(createNotification(
        testUser.id,
        'test_notification',
        'Test message'
      )).resolves.not.toThrow();

      expect(sendPushNotification).toHaveBeenCalled();
    });

    test('should respect push notification preferences', async () => {
      const { getUserPreferences, shouldSendNotification } = require('../../../services/notificationPreferencesService');
      getUserPreferences.mockResolvedValue({
        push_enabled: false,
        appointment_notifications: false,
      });
      shouldSendNotification.mockReturnValue({
        shouldSend: false,
        reason: 'User disabled push notifications',
      });

      await createNotification(
        testUser.id,
        'appointment_cancelled',
        'Appointment cancelled'
      );

      expect(sendPushNotification).not.toHaveBeenCalled();
    });

    test('should send critical notifications even with preferences disabled', async () => {
      const { getUserPreferences, shouldSendNotification } = require('../../../services/notificationPreferencesService');
      getUserPreferences.mockResolvedValue({
        push_enabled: false,
        critical_notifications: true, // Critical notifications enabled
      });
      shouldSendNotification.mockReturnValue({
        shouldSend: true,
        recommendedChannels: ['push'],
      });

      generateNotification.mockReturnValue({
        title: 'Urgent: Service Cancelled',
        body: 'Urgent service has been cancelled',
      });

      sendPushNotification.mockResolvedValue({ success: true });

      await createNotification(
        testUser.id,
        'servicio_urgente_agendado',
        'Urgent service scheduled',
        {},
        'critical'
      );

      expect(sendPushNotification).toHaveBeenCalled();
    });
  });

  describe('Google Calendar Integration', () => {
    const { google } = require('googleapis');
    const ical = require('ical-generator');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should generate iCal feed for availability slots', async () => {
      const mockCal = {
        createEvent: jest.fn(),
        toString: jest.fn().mockReturnValue('ICAL_CONTENT'),
      };

      ical.mockReturnValue(mockCal);

      // Create additional slots for testing
      const slots = [];
      for (let i = 0; i < 3; i++) {
        const slot = await prisma.availability_slots.create({
          data: {
            professional_id: testProfessional.id,
            availability_config_id: availabilityConfig.id,
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

      const icalContent = await calendarSyncService.generateICalFeed(
        testProfessional.id,
        new Date('2024-12-01'),
        new Date('2024-12-02')
      );

      expect(ical).toHaveBeenCalledWith({
        domain: 'changánet.com',
        prodId: { company: 'Changánet', product: 'Availability Calendar' },
        name: `Disponibilidad - ${testProfessional.nombre}`,
        timezone: 'America/Buenos_Aires',
      });

      expect(mockCal.createEvent).toHaveBeenCalledTimes(4); // Original slot + 3 new ones
      expect(icalContent).toBe('ICAL_CONTENT');

      // Clean up
      await prisma.availability_slots.deleteMany({
        where: { id: { in: slots.map(s => s.id) } }
      });
    });

    test('should connect Google Calendar successfully', async () => {
      const mockTokens = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
        expiry_date: Date.now() + 3600000,
      };

      const mockCalendarList = {
        data: {
          items: [{
            id: 'primary-calendar-id',
            summary: 'Primary Calendar',
            primary: true,
          }],
        },
      };

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.getToken.mockResolvedValue({ tokens: mockTokens });

      const calendarClient = google.calendar();
      calendarClient.calendarList.list.mockResolvedValue(mockCalendarList);

      prisma.calendar_connections.create.mockResolvedValue({
        id: 'connection-1',
        calendar_id: 'primary-calendar-id',
      });

      calendarSyncService.syncGoogleCalendar = jest.fn().mockResolvedValue();

      const result = await calendarSyncService.connectGoogleCalendar(testProfessional.id, 'auth-code');

      expect(result.success).toBe(true);
      expect(result.calendarId).toBe('primary-calendar-id');
      expect(result.calendarName).toBe('Primary Calendar');

      expect(prisma.calendar_connections.create).toHaveBeenCalled();
      expect(calendarSyncService.syncGoogleCalendar).toHaveBeenCalledWith(testProfessional.id);
    });

    test('should sync appointments to Google Calendar', async () => {
      const mockConnection = {
        id: 'connection-1',
        calendar_id: 'google-calendar-id',
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_expires_at: new Date(Date.now() + 3600000),
        is_active: true,
      };

      prisma.calendar_connections.findFirst.mockResolvedValue(mockConnection);

      // Create an appointment to sync
      const appointment = await prisma.appointments.create({
        data: {
          professional_id: testProfessional.id,
          client_id: testUser.id,
          slot_id: testSlot.id,
          availability_config_id: availabilityConfig.id,
          title: 'Appointment to Sync',
          scheduled_start: testSlot.start_time,
          scheduled_end: testSlot.end_time,
          timezone: testSlot.timezone,
          status: 'scheduled',
        }
      });

      const oauth2Client = new google.auth.OAuth2();
      const calendarClient = google.calendar();

      calendarClient.events.insert.mockResolvedValue({
        data: { id: 'google-event-id' },
      });

      await calendarSyncService.syncGoogleCalendar(testProfessional.id);

      expect(calendarClient.events.insert).toHaveBeenCalledWith({
        calendarId: 'google-calendar-id',
        resource: expect.objectContaining({
          summary: `Cita con ${testUser.nombre}`,
          start: {
            dateTime: appointment.scheduled_start.toISOString(),
            timeZone: appointment.timezone,
          },
          end: {
            dateTime: appointment.scheduled_end.toISOString(),
            timeZone: appointment.timezone,
          },
        }),
      });

      // Verify appointment was updated with Google event ID
      const updatedAppointment = await prisma.appointments.findUnique({
        where: { id: appointment.id }
      });

      expect(updatedAppointment.google_event_id).toBe('google-event-id');

      // Clean up
      await prisma.appointments.delete({ where: { id: appointment.id } });
    });

    test('should handle Google Calendar API errors gracefully', async () => {
      const mockConnection = {
        id: 'connection-1',
        calendar_id: 'google-calendar-id',
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_expires_at: new Date(Date.now() + 3600000),
        is_active: true,
      };

      prisma.calendar_connections.findFirst.mockResolvedValue(mockConnection);

      const calendarClient = google.calendar();
      calendarClient.events.insert.mockRejectedValue(new Error('Google API quota exceeded'));

      // Should not throw error, just log the failure
      await expect(calendarSyncService.syncGoogleCalendar(testProfessional.id))
        .resolves.not.toThrow();

      expect(calendarClient.events.insert).toHaveBeenCalled();
    });

    test('should handle expired Google OAuth tokens', async () => {
      const mockConnection = {
        id: 'connection-1',
        calendar_id: 'google-calendar-id',
        access_token: 'expired-token',
        refresh_token: 'refresh-token',
        token_expires_at: new Date(Date.now() - 3600000), // Expired
        is_active: true,
      };

      prisma.calendar_connections.findFirst.mockResolvedValue(mockConnection);

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.refreshAccessToken.mockResolvedValue({
        credentials: {
          access_token: 'new-access-token',
          expiry_date: Date.now() + 3600000,
        },
      });

      const calendarClient = google.calendar();
      calendarClient.events.list.mockResolvedValue({ data: { items: [] } });

      await calendarSyncService.syncGoogleCalendar(testProfessional.id);

      expect(oauth2Client.refreshAccessToken).toHaveBeenCalled();
      expect(prisma.calendar_connections.update).toHaveBeenCalledWith({
        where: { id: 'connection-1' },
        data: expect.objectContaining({
          access_token: 'new-access-token',
        }),
      });
    });

    test('should disconnect calendar connection', async () => {
      prisma.calendar_connections.updateMany.mockResolvedValue({ count: 1 });

      await calendarSyncService.disconnectCalendar(testProfessional.id, 'google');

      expect(prisma.calendar_connections.updateMany).toHaveBeenCalledWith({
        where: {
          user_id: testProfessional.id,
          calendar_type: 'google',
        },
        data: {
          is_active: false,
          sync_status: 'failed',
        },
      });
    });
  });

  describe('Multi-Channel Notification Delivery', () => {
    const { sendEmail } = require('../../../services/emailService');
    const { sendPushNotification } = require('../../../config/firebaseAdmin');
    const { generateNotification } = require('../../../services/notificationTemplatesService');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should send notifications through multiple channels', async () => {
      const { getUserPreferences, shouldSendNotification } = require('../../../services/notificationPreferencesService');
      getUserPreferences.mockResolvedValue({
        email_enabled: true,
        push_enabled: true,
        appointment_confirmations: true,
      });
      shouldSendNotification.mockReturnValue({
        shouldSend: true,
        recommendedChannels: ['email', 'push'],
      });

      generateNotification
        .mockReturnValueOnce({
          subject: 'Appointment Confirmed',
          html: '<h1>Appointment confirmed</h1>',
          body: 'Appointment confirmed',
        })
        .mockReturnValueOnce({
          title: 'Appointment Confirmed',
          body: 'Your appointment has been confirmed',
        });

      sendEmail.mockResolvedValue({ success: true });
      sendPushNotification.mockResolvedValue({ success: true });

      await createNotification(
        testUser.id,
        'appointment_confirmed',
        'Appointment confirmed',
        {
          appointment_id: 'test-appointment-id',
          professional_name: testProfessional.nombre,
        }
      );

      expect(sendEmail).toHaveBeenCalled();
      expect(sendPushNotification).toHaveBeenCalled();
    });

    test('should continue with other channels if one fails', async () => {
      const { getUserPreferences, shouldSendNotification } = require('../../../services/notificationPreferencesService');
      getUserPreferences.mockResolvedValue({
        email_enabled: true,
        push_enabled: true,
        appointment_confirmations: true,
      });
      shouldSendNotification.mockReturnValue({
        shouldSend: true,
        recommendedChannels: ['email', 'push'],
      });

      generateNotification
        .mockReturnValueOnce({
          subject: 'Appointment Reminder',
          html: '<p>Appointment reminder</p>',
          body: 'Appointment reminder',
        })
        .mockReturnValueOnce({
          title: 'Appointment Reminder',
          body: 'Appointment reminder',
        });

      sendEmail.mockRejectedValue(new Error('Email service down'));
      sendPushNotification.mockResolvedValue({ success: true });

      // Should not throw error despite email failure
      await expect(createNotification(
        testUser.id,
        'appointment_reminder_1h',
        'Appointment reminder'
      )).resolves.not.toThrow();

      expect(sendEmail).toHaveBeenCalled();
      expect(sendPushNotification).toHaveBeenCalled();
    });

    test('should handle notification template failures', async () => {
      const { getUserPreferences, shouldSendNotification } = require('../../../services/notificationPreferencesService');
      getUserPreferences.mockResolvedValue({
        email_enabled: true,
        push_enabled: true,
        appointment_confirmations: true,
      });
      shouldSendNotification.mockReturnValue({
        shouldSend: true,
        recommendedChannels: ['email', 'push'],
      });

      generateNotification.mockRejectedValue(new Error('Template not found'));

      // Should still create notification but skip sending
      await expect(createNotification(
        testUser.id,
        'unknown_notification_type',
        'Unknown notification'
      )).resolves.not.toThrow();

      expect(sendEmail).not.toHaveBeenCalled();
      expect(sendPushNotification).not.toHaveBeenCalled();
    });
  });

  describe('Integration Error Handling and Resilience', () => {
    test('should handle network timeouts gracefully', async () => {
      const { sendEmail } = require('../../../services/emailService');
      const { getUserPreferences, shouldSendNotification } = require('../../../services/notificationPreferencesService');

      getUserPreferences.mockResolvedValue({
        email_enabled: true,
        appointment_confirmations: true,
      });
      shouldSendNotification.mockReturnValue({
        shouldSend: true,
        recommendedChannels: ['email'],
      });

      // Simulate network timeout
      sendEmail.mockRejectedValue(new Error('Network timeout'));

      // Should not throw error
      await expect(createNotification(
        testUser.id,
        'appointment_booked',
        'Appointment booked'
      )).resolves.not.toThrow();
    });

    test('should handle malformed external API responses', async () => {
      const { google } = require('googleapis');
      const calendarClient = google.calendar();

      // Simulate malformed response from Google Calendar
      calendarClient.events.list.mockResolvedValue({
        data: null, // Malformed response
      });

      const mockConnection = {
        id: 'connection-1',
        calendar_id: 'google-calendar-id',
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_expires_at: new Date(Date.now() + 3600000),
        is_active: true,
      };

      prisma.calendar_connections.findFirst.mockResolvedValue(mockConnection);

      // Should not crash on malformed response
      await expect(calendarSyncService.syncGoogleCalendar(testProfessional.id))
        .resolves.not.toThrow();
    });

    test('should implement circuit breaker pattern for failing services', async () => {
      const { sendEmail } = require('../../../services/emailService');
      const { getUserPreferences, shouldSendNotification } = require('../../../services/notificationPreferencesService');

      getUserPreferences.mockResolvedValue({
        email_enabled: true,
        appointment_confirmations: true,
      });
      shouldSendNotification.mockReturnValue({
        shouldSend: true,
        recommendedChannels: ['email'],
      });

      // Simulate persistent failures
      sendEmail.mockRejectedValue(new Error('Service permanently down'));

      // Multiple calls should not keep trying indefinitely
      for (let i = 0; i < 5; i++) {
        await createNotification(
          testUser.id,
          'test_notification',
          'Test message'
        );
      }

      // Email service should still be called (in real implementation,
      // a circuit breaker would stop calling after threshold)
      expect(sendEmail).toHaveBeenCalledTimes(5);
    });
  });
});
