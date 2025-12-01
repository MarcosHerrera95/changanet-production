/**
 * Unit Tests for Calendar Sync Service
 * Tests Google Calendar OAuth, bidirectional sync, conflict resolution, and iCal generation
 */

const calendarSyncService = require('../../../services/calendarSyncService');

// Mock dependencies
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

jest.mock('ical-generator', () => jest.fn());
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
  },
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    usuarios: {
      findUnique: jest.fn(),
    },
    calendar_connections: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    calendar_sync_logs: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    availability_slots: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    appointments: {
      findMany: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    blocked_slots: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  })),
}));

const { google } = require('googleapis');
const ical = require('ical-generator');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('CalendarSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('connectGoogleCalendar', () => {
    const mockUser = {
      id: 'user-1',
      rol: 'profesional',
      esta_verificado: true,
    };

    const mockTokens = {
      access_token: 'access-token-123',
      refresh_token: 'refresh-token-456',
      expiry_date: Date.now() + 3600000,
    };

    const mockCalendarList = {
      data: {
        items: [
          { id: 'calendar-1', summary: 'My Calendar', primary: false },
          { id: 'primary-calendar', summary: 'Primary Calendar', primary: true },
        ],
      },
    };

    beforeEach(() => {
      prisma.usuarios.findUnique.mockResolvedValue(mockUser);
      prisma.calendar_connections.findFirst.mockResolvedValue(null); // No existing connection
    });

    test('should connect Google Calendar successfully', async () => {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.getToken.mockResolvedValue({ tokens: mockTokens });
      const calendarClient = google.calendar();
      calendarClient.calendarList.list.mockResolvedValue(mockCalendarList);

      prisma.calendar_connections.create.mockResolvedValue({
        id: 'connection-1',
        calendar_id: 'primary-calendar',
        calendar_name: 'Primary Calendar',
      });

      // Mock syncGoogleCalendar to avoid actual sync
      calendarSyncService.syncGoogleCalendar = jest.fn().mockResolvedValue();

      const result = await calendarSyncService.connectGoogleCalendar('user-1', 'auth-code-123');

      expect(result.success).toBe(true);
      expect(result.calendarId).toBe('primary-calendar');
      expect(result.calendarName).toBe('Primary Calendar');

      expect(prisma.calendar_connections.create).toHaveBeenCalledWith({
        data: {
          user_id: 'user-1',
          calendar_type: 'google',
          calendar_id: 'primary-calendar',
          calendar_name: 'Primary Calendar',
          access_token: 'access-token-123',
          refresh_token: 'refresh-token-456',
          token_expires_at: expect.any(Date),
          is_active: true,
          last_sync_at: expect.any(Date),
          sync_status: 'completed',
        },
      });

      expect(calendarSyncService.syncGoogleCalendar).toHaveBeenCalledWith('user-1');
    });

    test('should throw error for non-professional user', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({
        ...mockUser,
        rol: 'cliente',
      });

      await expect(calendarSyncService.connectGoogleCalendar('user-1', 'auth-code'))
        .rejects.toThrow('Solo los profesionales pueden conectar calendarios externos');
    });

    test('should throw error for unverified user', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({
        ...mockUser,
        esta_verificado: false,
      });

      await expect(calendarSyncService.connectGoogleCalendar('user-1', 'auth-code'))
        .rejects.toThrow('El usuario debe estar verificado para conectar calendarios externos');
    });

    test('should throw error for existing active connection', async () => {
      prisma.calendar_connections.findFirst.mockResolvedValue({
        id: 'existing-connection',
        is_active: true,
      });

      await expect(calendarSyncService.connectGoogleCalendar('user-1', 'auth-code'))
        .rejects.toThrow('Ya existe una conexión activa de google para este usuario');
    });

    test('should throw error for invalid auth code', async () => {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.getToken.mockRejectedValue(new Error('Invalid auth code'));

      await expect(calendarSyncService.connectGoogleCalendar('user-1', 'invalid-code'))
        .rejects.toThrow('Invalid auth code');
    });

    test('should throw error when no primary calendar found', async () => {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.getToken.mockResolvedValue({ tokens: mockTokens });
      const calendarClient = google.calendar();
      calendarClient.calendarList.list.mockResolvedValue({
        data: {
          items: [{ id: 'calendar-1', summary: 'My Calendar', primary: false }],
        },
      });

      await expect(calendarSyncService.connectGoogleCalendar('user-1', 'auth-code'))
        .rejects.toThrow('No se pudo encontrar el calendario principal');
    });
  });

  describe('syncGoogleCalendar', () => {
    const mockConnection = {
      id: 'connection-1',
      user_id: 'user-1',
      calendar_id: 'calendar-123',
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      token_expires_at: new Date(Date.now() + 3600000),
      is_active: true,
    };

    beforeEach(() => {
      prisma.calendar_connections.findFirst.mockResolvedValue(mockConnection);
      prisma.calendar_connections.update.mockResolvedValue();
    });

    test('should perform bidirectional sync successfully', async () => {
      // Mock OAuth2 setup
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials = jest.fn();
      const calendarClient = google.calendar();

      // Mock sync functions
      calendarSyncService.pushAppointmentsToGoogleCalendar = jest.fn().mockResolvedValue();
      calendarSyncService.pullGoogleCalendarEvents = jest.fn().mockResolvedValue();

      await calendarSyncService.syncGoogleCalendar('user-1');

      expect(calendarSyncService.pushAppointmentsToGoogleCalendar).toHaveBeenCalled();
      expect(calendarSyncService.pullGoogleCalendarEvents).toHaveBeenCalled();

      expect(prisma.calendar_connections.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'connection-1' },
        data: { sync_status: 'in_progress' },
      });

      expect(prisma.calendar_connections.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'connection-1' },
        data: {
          sync_status: 'completed',
          last_sync_at: expect.any(Date),
        },
      });
    });

    test('should refresh token when expired', async () => {
      const expiredConnection = {
        ...mockConnection,
        token_expires_at: new Date(Date.now() - 3600000), // Expired
      };

      prisma.calendar_connections.findFirst.mockResolvedValue(expiredConnection);

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials = jest.fn();
      oauth2Client.refreshAccessToken = jest.fn().mockResolvedValue({
        credentials: {
          access_token: 'new-access-token',
          expiry_date: Date.now() + 3600000,
        },
      });

      calendarSyncService.pushAppointmentsToGoogleCalendar = jest.fn().mockResolvedValue();
      calendarSyncService.pullGoogleCalendarEvents = jest.fn().mockResolvedValue();

      await calendarSyncService.syncGoogleCalendar('user-1');

      expect(oauth2Client.refreshAccessToken).toHaveBeenCalled();
      expect(prisma.calendar_connections.update).toHaveBeenCalledWith({
        where: { id: 'connection-1' },
        data: {
          access_token: 'new-access-token',
          token_expires_at: expect.any(Date),
        },
      });
    });

    test('should handle sync errors and update status', async () => {
      calendarSyncService.pushAppointmentsToGoogleCalendar = jest.fn().mockRejectedValue(new Error('Sync failed'));

      await expect(calendarSyncService.syncGoogleCalendar('user-1'))
        .rejects.toThrow('Sync failed');

      expect(prisma.calendar_connections.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { sync_status: 'failed' },
        })
      );
    });

    test('should throw error when no active connection found', async () => {
      prisma.calendar_connections.findFirst.mockResolvedValue(null);

      await expect(calendarSyncService.syncGoogleCalendar('user-1'))
        .rejects.toThrow('No hay conexión activa de Google Calendar');
    });
  });

  describe('pushAppointmentsToGoogleCalendar', () => {
    const mockAppointments = [
      {
        id: 'appt-1',
        professional_id: 'user-1',
        client: { nombre: 'Client Name' },
        scheduled_start: new Date('2024-01-01T10:00:00Z'),
        scheduled_end: new Date('2024-01-01T11:00:00Z'),
        description: 'Test appointment',
        google_event_id: null,
      },
    ];

    test('should push unsynchronized appointments to Google Calendar', async () => {
      prisma.appointments.findMany.mockResolvedValue(mockAppointments);

      const calendarClient = {
        events: {
          insert: jest.fn().mockResolvedValue({
            data: { id: 'google-event-123' },
          }),
        },
      };

      prisma.appointments.update.mockResolvedValue();

      await calendarSyncService.pushAppointmentsToGoogleCalendar(
        'user-1',
        calendarClient,
        'calendar-123',
        'connection-1'
      );

      expect(calendarClient.events.insert).toHaveBeenCalledWith({
        calendarId: 'calendar-123',
        resource: {
          summary: 'Cita con Client Name',
          description: expect.stringContaining('Test appointment'),
          start: {
            dateTime: '2024-01-01T10:00:00.000Z',
            timeZone: undefined,
          },
          end: {
            dateTime: '2024-01-01T11:00:00.000Z',
            timeZone: undefined,
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 30 },
              { method: 'email', minutes: 60 },
            ],
          },
        },
      });

      expect(prisma.appointments.update).toHaveBeenCalledWith({
        where: { id: 'appt-1' },
        data: { google_event_id: 'google-event-123' },
      });
    });

    test('should skip appointments that already have Google event IDs', async () => {
      const syncedAppointments = [
        {
          ...mockAppointments[0],
          google_event_id: 'existing-event-id',
        },
      ];

      prisma.appointments.findMany.mockResolvedValue(syncedAppointments);

      const calendarClient = {
        events: { insert: jest.fn() },
      };

      await calendarSyncService.pushAppointmentsToGoogleCalendar(
        'user-1',
        calendarClient,
        'calendar-123',
        'connection-1'
      );

      expect(calendarClient.events.insert).not.toHaveBeenCalled();
    });

    test('should handle push errors gracefully', async () => {
      prisma.appointments.findMany.mockResolvedValue(mockAppointments);

      const calendarClient = {
        events: {
          insert: jest.fn().mockRejectedValue(new Error('Google API error')),
        },
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await calendarSyncService.pushAppointmentsToGoogleCalendar(
        'user-1',
        calendarClient,
        'calendar-123',
        'connection-1'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error creando evento para cita appt-1:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('pullGoogleCalendarEvents', () => {
    const mockGoogleEvents = [
      {
        id: 'google-event-1',
        summary: 'Meeting with Team',
        description: 'Team meeting',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' },
      },
    ];

    test('should pull and create blocked slots for Google events', async () => {
      const calendarClient = {
        events: {
          list: jest.fn().mockResolvedValue({
            data: { items: mockGoogleEvents },
          }),
        },
      };

      // Mock no conflicts and no existing blocks
      calendarSyncService.checkCalendarConflicts = jest.fn().mockResolvedValue({ hasConflict: false });
      prisma.blocked_slots.findFirst.mockResolvedValue(null);
      prisma.blocked_slots.create.mockResolvedValue();

      await calendarSyncService.pullGoogleCalendarEvents(
        'user-1',
        calendarClient,
        'calendar-123',
        'connection-1'
      );

      expect(prisma.blocked_slots.create).toHaveBeenCalledWith({
        data: {
          professional_id: 'user-1',
          title: 'Google Calendar: Meeting with Team',
          reason: 'external_calendar_event',
          description: 'Evento sincronizado desde Google Calendar',
          start_time: new Date('2024-01-01T10:00:00Z'),
          end_time: new Date('2024-01-01T11:00:00Z'),
          timezone: undefined,
          is_active: true,
          created_by: 'user-1',
          meta: JSON.stringify({
            google_event_id: 'google-event-1',
            source: 'google_calendar_sync',
          }),
        },
      });
    });

    test('should skip events that already have blocked slots', async () => {
      const calendarClient = {
        events: {
          list: jest.fn().mockResolvedValue({
            data: { items: mockGoogleEvents },
          }),
        },
      };

      calendarSyncService.checkCalendarConflicts = jest.fn().mockResolvedValue({ hasConflict: false });
      prisma.blocked_slots.findFirst.mockResolvedValue({ id: 'existing-block' });

      await calendarSyncService.pullGoogleCalendarEvents(
        'user-1',
        calendarClient,
        'calendar-123',
        'connection-1'
      );

      expect(prisma.blocked_slots.create).not.toHaveBeenCalled();
    });

    test('should skip events that conflict with existing appointments', async () => {
      const calendarClient = {
        events: {
          list: jest.fn().mockResolvedValue({
            data: { items: mockGoogleEvents },
          }),
        },
      };

      calendarSyncService.checkCalendarConflicts = jest.fn().mockResolvedValue({
        hasConflict: true,
        conflictingAppointments: [{ id: 'appt-1' }],
      });

      await calendarSyncService.pullGoogleCalendarEvents(
        'user-1',
        calendarClient,
        'calendar-123',
        'connection-1'
      );

      expect(prisma.blocked_slots.create).not.toHaveBeenCalled();
    });
  });

  describe('generateICalFeed', () => {
    test('should generate iCal feed with availability slots', async () => {
      const mockSlots = [
        {
          start_time: new Date('2024-01-01T10:00:00Z'),
          end_time: new Date('2024-01-01T11:00:00Z'),
          professional: {
            nombre: 'Dr. Smith',
            especialidad: 'Cardiology',
          },
        },
      ];

      prisma.availability_slots.findMany.mockResolvedValue(mockSlots);

      const mockCal = {
        createEvent: jest.fn(),
        toString: jest.fn().mockReturnValue('ICAL_CONTENT'),
      };

      ical.mockReturnValue(mockCal);

      const result = await calendarSyncService.generateICalFeed('user-1', new Date(), new Date());

      expect(ical).toHaveBeenCalledWith({
        domain: 'changánet.com',
        prodId: { company: 'Changánet', product: 'Availability Calendar' },
        name: 'Disponibilidad - Dr. Smith',
        timezone: 'America/Buenos_Aires',
      });

      expect(mockCal.createEvent).toHaveBeenCalledWith({
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        summary: 'Horario disponible',
        description: expect.stringContaining('Dr. Smith'),
        location: 'Changánet Platform',
        url: expect.stringContaining('/book/user-1'),
        organizer: {
          name: 'Dr. Smith',
          email: 'no-reply@changánet.com',
        },
      });

      expect(result).toBe('ICAL_CONTENT');
    });
  });

  describe('disconnectCalendar', () => {
    test('should deactivate calendar connection', async () => {
      prisma.calendar_connections.updateMany.mockResolvedValue({ count: 1 });

      await calendarSyncService.disconnectCalendar('user-1', 'google');

      expect(prisma.calendar_connections.updateMany).toHaveBeenCalledWith({
        where: {
          user_id: 'user-1',
          calendar_type: 'google',
        },
        data: {
          is_active: false,
          sync_status: 'failed',
        },
      });
    });
  });

  describe('getCalendarConnections', () => {
    test('should return formatted calendar connections', async () => {
      const mockConnections = [
        {
          id: 'conn-1',
          calendar_type: 'google',
          calendar_name: 'My Calendar',
          is_active: true,
          last_sync_at: new Date(),
          sync_status: 'completed',
        },
      ];

      prisma.calendar_connections.findMany.mockResolvedValue(mockConnections);

      const result = await calendarSyncService.getCalendarConnections('user-1');

      expect(result).toEqual([
        {
          id: 'conn-1',
          type: 'google',
          name: 'My Calendar',
          isActive: true,
          lastSync: expect.any(Date),
          status: 'completed',
        },
      ]);
    });
  });

  describe('resolveSyncConflicts', () => {
    test('should resolve conflicts by keeping local events', async () => {
      const conflicts = [
        {
          id: 'conflict-1',
          resolution: 'keep_local',
        },
      ];

      const mockLogEntry = {
        id: 'conflict-1',
        user_id: 'user-1',
        connection_id: 'conn-1',
        conflict_data: JSON.stringify({
          googleEvent: {
            id: 'google-event-1',
            summary: 'Meeting',
            start: { dateTime: '2024-01-01T10:00:00Z' },
            end: { dateTime: '2024-01-01T11:00:00Z' },
          },
        }),
      };

      prisma.calendar_sync_logs.findUnique.mockResolvedValue(mockLogEntry);
      prisma.blocked_slots.create.mockResolvedValue();
      prisma.calendar_sync_logs.update.mockResolvedValue();

      await calendarSyncService.resolveSyncConflicts('user-1', conflicts);

      expect(prisma.blocked_slots.create).toHaveBeenCalled();
      expect(prisma.calendar_sync_logs.update).toHaveBeenCalledWith({
        where: { id: 'conflict-1' },
        data: {
          resolved: true,
          resolved_at: expect.any(Date),
          resolution: 'keep_local',
        },
      });
    });

    test('should resolve conflicts by keeping remote events', async () => {
      const conflicts = [
        {
          id: 'conflict-1',
          resolution: 'keep_remote',
        },
      ];

      const mockLogEntry = {
        id: 'conflict-1',
        user_id: 'user-1',
        connection_id: 'conn-1',
        conflict_data: JSON.stringify({
          conflictingAppointments: [
            { id: 'appt-1', client_id: 'client-1' },
          ],
        }),
      };

      prisma.calendar_sync_logs.findUnique.mockResolvedValue(mockLogEntry);
      prisma.appointments.update.mockResolvedValue();
      calendarSyncService.createNotification = jest.fn();
      prisma.calendar_sync_logs.update.mockResolvedValue();

      await calendarSyncService.resolveSyncConflicts('user-1', conflicts);

      expect(prisma.appointments.update).toHaveBeenCalledWith({
        where: { id: 'appt-1' },
        data: {
          status: 'cancelled',
          cancelled_at: expect.any(Date),
          cancelled_by: 'user-1',
          cancel_reason: 'Conflicto con calendario externo - resolución automática',
        },
      });
    });

    test('should handle manual resolution', async () => {
      const conflicts = [
        {
          id: 'conflict-1',
          resolution: 'manual',
        },
      ];

      prisma.calendar_sync_logs.findUnique.mockResolvedValue({
        id: 'conflict-1',
        user_id: 'user-1',
        connection_id: 'conn-1',
      });
      prisma.calendar_sync_logs.update.mockResolvedValue();

      await calendarSyncService.resolveSyncConflicts('user-1', conflicts);

      expect(prisma.calendar_sync_logs.update).toHaveBeenCalledWith({
        where: { id: 'conflict-1' },
        data: {
          resolved: true,
          resolved_at: expect.any(Date),
          resolution: 'manual',
        },
      });
    });
  });

  describe('Constants', () => {
    test('should export correct constants', () => {
      expect(calendarSyncService.CALENDAR_TYPES).toEqual({
        GOOGLE: 'google',
        ICAL: 'ical',
      });

      expect(calendarSyncService.SYNC_STATUS).toEqual({
        PENDING: 'pending',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
        FAILED: 'failed',
        CONFLICT: 'conflict',
      });
    });
  });
});
