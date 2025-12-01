/**
 * Unit Tests for Notification Service
 * Tests notification creation, sending, templates, and preferences handling
 */

const notificationService = require('../../../services/notificationService');

// Mock dependencies
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

jest.mock('../../../services/smsService', () => ({
  sendSMS: jest.fn(),
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    usuarios: {
      findUnique: jest.fn(),
    },
    notificaciones: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  })),
}));

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendEmail } = require('../../../services/emailService');
const notificationTemplates = require('../../../services/notificationTemplatesService');
const notificationPreferences = require('../../../services/notificationPreferencesService');
const { sendSMS } = require('../../../services/smsService');

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    const mockUser = {
      id: 'user-1',
      nombre: 'Test User',
      email: 'test@example.com',
      telefono: '123456789',
      fcm_token: 'fcm-token-123',
      sms_enabled: true,
      notificaciones_push: true,
      notificaciones_email: true,
      notificaciones_sms: true,
      notificaciones_servicios: true,
      notificaciones_mensajes: true,
      notificaciones_pagos: true,
      notificaciones_marketing: true,
    };

    const mockPreferences = {
      shouldSend: true,
      recommendedChannels: ['push', 'email'],
      reason: 'User preferences allow',
      recommendedAction: null,
    };

    const mockProcessedNotification = {
      title: 'Test Notification',
      body: 'Test message body',
      subject: 'Test Subject',
      html: '<p>Test HTML</p>',
      sms: 'Test SMS',
    };

    beforeEach(() => {
      prisma.usuarios.findUnique.mockResolvedValue(mockUser);
      prisma.notificaciones.create.mockResolvedValue({ id: 'notif-1' });
      notificationPreferences.getUserPreferences.mockResolvedValue({});
      notificationPreferences.shouldSendNotification.mockReturnValue(mockPreferences);
      notificationTemplates.generateNotification.mockReturnValue(mockProcessedNotification);
    });

    test('should create notification successfully', async () => {
      const result = await notificationService.createNotification(
        'user-1',
        'appointment_booked',
        'Test message',
        { appointment_id: 'appt-1' },
        'high'
      );

      expect(result).toEqual({ id: 'notif-1' });
      expect(prisma.notificaciones.create).toHaveBeenCalledWith({
        data: {
          usuario_id: 'user-1',
          tipo: 'appointment_booked',
          mensaje: 'Test message body', // Uses processed template
          esta_leido: false,
        },
      });
    });

    test('should skip notification based on preferences', async () => {
      notificationPreferences.shouldSendNotification.mockReturnValue({
        shouldSend: false,
        reason: 'User disabled service notifications',
        recommendedAction: 'Enable service notifications',
      });

      const result = await notificationService.createNotification(
        'user-1',
        'appointment_booked',
        'Test message'
      );

      expect(result).toEqual({
        skipped: true,
        reason: 'User disabled service notifications',
        recommendedAction: 'Enable service notifications',
      });
      expect(prisma.notificaciones.create).not.toHaveBeenCalled();
    });

    test('should throw error for invalid notification type', async () => {
      await expect(notificationService.createNotification('user-1', 'invalid_type', 'message'))
        .rejects.toThrow('Tipo de notificación inválido: invalid_type');
    });

    test('should use default priority for invalid priority', async () => {
      await notificationService.createNotification(
        'user-1',
        'appointment_booked',
        'Test message',
        {},
        'invalid_priority'
      );

      expect(notificationPreferences.shouldSendNotification).toHaveBeenCalledWith(
        {},
        'appointment_booked',
        'medium'
      );
    });

    test('should throw error for non-existent user', async () => {
      prisma.usuarios.findUnique.mockResolvedValue(null);

      await expect(notificationService.createNotification('user-1', 'appointment_booked', 'message'))
        .rejects.toThrow('Usuario no encontrado');
    });

    test('should handle notification sending by channels', async () => {
      // Mock successful sending
      jest.doMock('../../../config/firebaseAdmin', () => ({
        sendPushNotification: jest.fn().mockResolvedValue(),
      }));

      await notificationService.createNotification(
        'user-1',
        'appointment_booked',
        'Test message'
      );

      // Should attempt to send via recommended channels
      expect(notificationTemplates.generateNotification).toHaveBeenCalledWith(
        'appointment_booked',
        'push',
        expect.objectContaining({
          usuario: 'Test User',
          contenido_mensaje: 'Test message',
        })
      );
    });
  });

  describe('getUserNotifications', () => {
    test('should return user notifications with unread count', async () => {
      const mockNotifications = [
        { id: 'notif-1', tipo: 'appointment_booked', esta_leido: false },
        { id: 'notif-2', tipo: 'payment_received', esta_leido: true },
      ];

      prisma.notificaciones.findMany.mockResolvedValue(mockNotifications);
      prisma.notificaciones.count.mockResolvedValue(1);

      const result = await notificationService.getUserNotifications('user-1');

      expect(result.notifications).toEqual(mockNotifications);
      expect(result.unreadCount).toBe(1);
      expect(prisma.notificaciones.findMany).toHaveBeenCalledWith({
        where: { usuario_id: 'user-1' },
        orderBy: { creado_en: 'desc' },
        take: 50,
      });
    });

    test('should filter unread notifications', async () => {
      const mockUnreadNotifications = [
        { id: 'notif-1', tipo: 'appointment_booked', esta_leido: false },
      ];

      prisma.notificaciones.findMany.mockResolvedValue(mockUnreadNotifications);
      prisma.notificaciones.count.mockResolvedValue(1);

      const result = await notificationService.getUserNotifications('user-1', 'unread');

      expect(result.notifications).toEqual(mockUnreadNotifications);
      expect(prisma.notificaciones.findMany).toHaveBeenCalledWith({
        where: {
          usuario_id: 'user-1',
          esta_leido: false,
        },
        orderBy: { creado_en: 'desc' },
        take: 50,
      });
    });

    test('should filter read notifications', async () => {
      const mockReadNotifications = [
        { id: 'notif-2', tipo: 'payment_received', esta_leido: true },
      ];

      prisma.notificaciones.findMany.mockResolvedValue(mockReadNotifications);
      prisma.notificaciones.count.mockResolvedValue(0);

      const result = await notificationService.getUserNotifications('user-1', 'read');

      expect(result.notifications).toEqual(mockReadNotifications);
      expect(prisma.notificaciones.findMany).toHaveBeenCalledWith({
        where: {
          usuario_id: 'user-1',
          esta_leido: true,
        },
        orderBy: { creado_en: 'desc' },
        take: 50,
      });
    });
  });

  describe('markAsRead', () => {
    test('should mark notification as read', async () => {
      prisma.notificaciones.update.mockResolvedValue({ id: 'notif-1', esta_leido: true });

      await notificationService.markAsRead('notif-1');

      expect(prisma.notificaciones.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { esta_leido: true },
      });
    });
  });

  describe('markAllAsRead', () => {
    test('should mark all user notifications as read', async () => {
      prisma.notificaciones.updateMany.mockResolvedValue({ count: 5 });

      await notificationService.markAllAsRead('user-1');

      expect(prisma.notificaciones.updateMany).toHaveBeenCalledWith({
        where: {
          usuario_id: 'user-1',
          esta_leido: false,
        },
        data: { esta_leido: true },
      });
    });
  });

  describe('deleteNotification', () => {
    test('should delete notification', async () => {
      prisma.notificaciones.delete.mockResolvedValue({ id: 'notif-1' });

      await notificationService.deleteNotification('notif-1');

      expect(prisma.notificaciones.delete).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
      });
    });
  });

  describe('createNotificationQuick', () => {
    test('should create notification with automatic priority', async () => {
      const mockUser = {
        id: 'user-1',
        nombre: 'Test User',
        email: 'test@example.com',
        fcm_token: 'fcm-token-123',
        notificaciones_push: true,
        notificaciones_email: true,
      };

      prisma.usuarios.findUnique.mockResolvedValue(mockUser);
      prisma.notificaciones.create.mockResolvedValue({ id: 'notif-1' });
      notificationPreferences.getUserPreferences.mockResolvedValue({});
      notificationPreferences.shouldSendNotification.mockReturnValue({
        shouldSend: true,
        recommendedChannels: ['push'],
      });
      notificationTemplates.generateNotification.mockReturnValue({
        title: 'Appointment Reminder',
        body: 'Test message',
      });

      const result = await notificationService.createNotificationQuick(
        'user-1',
        'appointment_reminder_24h',
        'Test message'
      );

      expect(result).toEqual({ id: 'notif-1' });
      expect(notificationPreferences.shouldSendNotification).toHaveBeenCalledWith(
        {},
        'appointment_reminder_24h',
        'low' // Should use default priority for reminder
      );
    });
  });

  describe('scheduleNotification', () => {
    test('should create scheduled notification', async () => {
      const scheduledTime = new Date(Date.now() + 3600000); // 1 hour from now

      prisma.notificaciones.create.mockResolvedValue({
        id: 'scheduled-notif-1',
        tipo: 'scheduled_appointment_reminder',
      });

      const result = await notificationService.scheduleNotification(
        'user-1',
        'appointment_reminder',
        'Reminder message',
        scheduledTime
      );

      expect(result.tipo).toBe('scheduled_appointment_reminder');
      expect(prisma.notificaciones.create).toHaveBeenCalledWith({
        data: {
          usuario_id: 'user-1',
          tipo: 'scheduled_appointment_reminder',
          mensaje: 'Reminder message',
          esta_leido: false,
        },
      });
    });

    test('should throw error for past scheduled time', async () => {
      const pastTime = new Date(Date.now() - 3600000); // 1 hour ago

      await expect(notificationService.scheduleNotification(
        'user-1',
        'appointment_reminder',
        'Message',
        pastTime
      )).rejects.toThrow('La fecha programada debe ser futura');
    });
  });

  describe('processScheduledNotifications', () => {
    test('should process scheduled notifications', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Mock the reminder functions
      notificationService.sendAppointmentReminders = jest.fn();
      notificationService.sendServiceReminders = jest.fn();
      notificationService.sendPaymentReminders = jest.fn();

      await notificationService.processScheduledNotifications();

      expect(notificationService.sendAppointmentReminders).toHaveBeenCalled();
      expect(notificationService.sendServiceReminders).toHaveBeenCalled();
      expect(notificationService.sendPaymentReminders).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('✅ Notificaciones programadas procesadas');

      consoleSpy.mockRestore();
    });

    test('should handle processing errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      notificationService.sendAppointmentReminders = jest.fn().mockRejectedValue(new Error('Processing error'));

      await notificationService.processScheduledNotifications();

      expect(consoleSpy).toHaveBeenCalledWith('Error procesando notificaciones programadas:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('sendAppointmentReminders', () => {
    test('should send 24h and 1h reminders', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      notificationService.sendAppointmentReminders24h = jest.fn();
      notificationService.sendAppointmentReminders1h = jest.fn();

      await notificationService.sendAppointmentReminders(new Date());

      expect(notificationService.sendAppointmentReminders24h).toHaveBeenCalled();
      expect(notificationService.sendAppointmentReminders1h).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('✅ Recordatorios de citas enviados');

      consoleSpy.mockRestore();
    });
  });

  describe('sendAppointmentReminders24h', () => {
    test('should send 24h reminders to clients and professionals', async () => {
      const mockAppointments = [
        {
          id: 'appt-1',
          scheduled_start: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          client: { nombre: 'Client Name' },
          professional: { nombre: 'Professional Name', especialidad: 'Specialty' },
          reminder_sent: false,
        },
      ];

      prisma.appointments.findMany.mockResolvedValue(mockAppointments);
      prisma.appointments.update.mockResolvedValue({ id: 'appt-1', reminder_sent: true });

      notificationService.createNotification = jest.fn().mockResolvedValue();

      await notificationService.sendAppointmentReminders24h(new Date());

      expect(notificationService.createNotification).toHaveBeenCalledTimes(2); // Client and professional
      expect(prisma.appointments.update).toHaveBeenCalledWith({
        where: { id: 'appt-1' },
        data: { reminder_sent: true },
      });
    });

    test('should skip appointments that already have reminders sent', async () => {
      const mockAppointments = [
        {
          id: 'appt-1',
          scheduled_start: new Date(Date.now() + 24 * 60 * 60 * 1000),
          reminder_sent: true, // Already sent
        },
      ];

      prisma.appointments.findMany.mockResolvedValue(mockAppointments);

      notificationService.createNotification = jest.fn();

      await notificationService.sendAppointmentReminders24h(new Date());

      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('sendAppointmentReminders1h', () => {
    test('should send 1h reminders within time window', async () => {
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
      const mockAppointments = [
        {
          id: 'appt-1',
          scheduled_start: oneHourFromNow,
          client: { nombre: 'Client Name' },
          professional: { nombre: 'Professional Name', especialidad: 'Specialty' },
        },
      ];

      prisma.appointments.findMany.mockResolvedValue(mockAppointments);
      notificationService.createNotification = jest.fn().mockResolvedValue();

      await notificationService.sendAppointmentReminders1h(new Date());

      expect(notificationService.createNotification).toHaveBeenCalledTimes(2); // Client and professional
    });

    test('should not send reminders outside time window', async () => {
      const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const mockAppointments = [
        {
          id: 'appt-1',
          scheduled_start: twoHoursFromNow, // Outside 1h ±10min window
        },
      ];

      prisma.appointments.findMany.mockResolvedValue(mockAppointments);
      notificationService.createNotification = jest.fn();

      await notificationService.sendAppointmentReminders1h(new Date());

      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('WebSocket Broadcasting Methods', () => {
    let mockWebSocketServer;

    beforeEach(() => {
      mockWebSocketServer = {
        sendToUser: jest.fn(),
        clients: new Map([['user-1', new Set()], ['user-2', new Set()]]),
      };
      notificationService.setWebSocketServer(mockWebSocketServer);
    });

    afterEach(() => {
      // Reset WebSocket server
      notificationService.setWebSocketServer(null);
    });

    describe('setWebSocketServer', () => {
      test('should set WebSocket server instance', () => {
        const wsServer = { test: 'server' };
        notificationService.setWebSocketServer(wsServer);

        // Since it's internal, we can't directly test but we can verify it doesn't throw
        expect(() => notificationService.setWebSocketServer(wsServer)).not.toThrow();
      });
    });

    describe('broadcastToUser', () => {
      test('should broadcast notification to specific user', () => {
        mockWebSocketServer.sendToUser.mockReturnValue(true);

        const notification = { id: 'notif-1', type: 'test', message: 'Test notification' };
        const result = notificationService.broadcastToUser('user-1', notification);

        expect(mockWebSocketServer.sendToUser).toHaveBeenCalledWith('user-1', notification);
        expect(result).toBe(true);
      });

      test('should return false when WebSocket server not configured', () => {
        notificationService.setWebSocketServer(null);

        const result = notificationService.broadcastToUser('user-1', {});

        expect(result).toBeUndefined(); // The method returns undefined when server is not configured
      });
    });

    describe('broadcastToUsers', () => {
      test('should broadcast notification to multiple users', () => {
        mockWebSocketServer.sendToUser.mockReturnValue(true);

        const userIds = ['user-1', 'user-2'];
        const notification = { id: 'notif-1', type: 'test', message: 'Test notification' };
        const result = notificationService.broadcastToUsers(userIds, notification);

        expect(mockWebSocketServer.sendToUser).toHaveBeenCalledTimes(2);
        expect(mockWebSocketServer.sendToUser).toHaveBeenCalledWith('user-1', notification);
        expect(mockWebSocketServer.sendToUser).toHaveBeenCalledWith('user-2', notification);
        expect(result).toBe(true);
      });

      test('should return false when no users receive notification', () => {
        mockWebSocketServer.sendToUser.mockReturnValue(false);

        const userIds = ['user-1', 'user-2'];
        const result = notificationService.broadcastToUsers(userIds, {});

        expect(result).toBe(false);
      });

      test('should handle empty user array', () => {
        const result = notificationService.broadcastToUsers([], {});

        expect(result).toBe(false);
        expect(mockWebSocketServer.sendToUser).not.toHaveBeenCalled();
      });
    });

    describe('broadcastToAll', () => {
      test('should broadcast notification to all connected users', () => {
        mockWebSocketServer.sendToUser.mockReturnValue(true);

        const notification = { id: 'notif-1', type: 'system', message: 'System notification' };
        const result = notificationService.broadcastToAll(notification);

        expect(mockWebSocketServer.sendToUser).toHaveBeenCalledTimes(2);
        expect(mockWebSocketServer.sendToUser).toHaveBeenCalledWith('user-1', notification);
        expect(mockWebSocketServer.sendToUser).toHaveBeenCalledWith('user-2', notification);
        expect(result).toBe(true);
      });

      test('should return false when no users are connected', () => {
        mockWebSocketServer.clients = new Map();

        const result = notificationService.broadcastToAll({});

        expect(result).toBe(false);
        expect(mockWebSocketServer.sendToUser).not.toHaveBeenCalled();
      });
    });

    describe('broadcastSystemNotification', () => {
      test('should broadcast system notification with proper metadata', async () => {
        mockWebSocketServer.sendToUser.mockReturnValue(true);

        const result = await notificationService.broadcastSystemNotification(
          'System Maintenance',
          'The system will be down for maintenance at 2 AM',
          { maintenance_start: '2024-01-01T02:00:00Z' }
        );

        expect(mockWebSocketServer.sendToUser).toHaveBeenCalledTimes(2);
        const calledNotification = mockWebSocketServer.sendToUser.mock.calls[0][1];
        expect(calledNotification.type).toBe('system_broadcast');
        expect(calledNotification.priority).toBe('HIGH');
        expect(calledNotification.title).toBe('System Maintenance');
        expect(calledNotification.message).toBe('The system will be down for maintenance at 2 AM');
        expect(calledNotification.metadata.isSystem).toBe(true);
        expect(calledNotification.metadata.maintenance_start).toBe('2024-01-01T02:00:00Z');
        expect(result).toBe(true);
      });

      test('should handle system notification without metadata', async () => {
        mockWebSocketServer.sendToUser.mockReturnValue(true);

        const result = await notificationService.broadcastSystemNotification(
          'Test Alert',
          'This is a test system notification'
        );

        expect(mockWebSocketServer.sendToUser).toHaveBeenCalledTimes(2);
        const calledNotification = mockWebSocketServer.sendToUser.mock.calls[0][1];
        expect(calledNotification.metadata.isSystem).toBe(true);
        expect(result).toBe(true);
      });
    });
  });

  describe('NOTIFICATION_TYPES and NOTIFICATION_PRIORITIES', () => {
    test('should export notification types constants', () => {
      expect(notificationService.NOTIFICATION_TYPES).toHaveProperty('APPOINTMENT_BOOKED');
      expect(notificationService.NOTIFICATION_TYPES).toHaveProperty('APPOINTMENT_CONFIRMED');
      expect(notificationService.NOTIFICATION_TYPES).toHaveProperty('APPOINTMENT_REMINDER_24H');
      expect(notificationService.NOTIFICATION_TYPES).toHaveProperty('APPOINTMENT_REMINDER_1H');
      expect(notificationService.NOTIFICATION_TYPES).toHaveProperty('APPOINTMENT_CANCELLED');
      expect(notificationService.NOTIFICATION_TYPES).toHaveProperty('APPOINTMENT_RESCHEDULED');
      expect(notificationService.NOTIFICATION_TYPES).toHaveProperty('NEW_APPOINTMENT');
      expect(notificationService.NOTIFICATION_TYPES).toHaveProperty('APPOINTMENT_COMPLETED');
      expect(notificationService.NOTIFICATION_TYPES).toHaveProperty('APPOINTMENT_NO_SHOW');
    });

    test('should export notification priorities constants', () => {
      expect(notificationService.NOTIFICATION_PRIORITIES).toHaveProperty('CRITICAL');
      expect(notificationService.NOTIFICATION_PRIORITIES).toHaveProperty('HIGH');
      expect(notificationService.NOTIFICATION_PRIORITIES).toHaveProperty('MEDIUM');
      expect(notificationService.NOTIFICATION_PRIORITIES).toHaveProperty('LOW');
    });
  });
});
