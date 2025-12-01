/**
 * Calendar Sync Controller - Changánet
 *
 * Handles calendar synchronization endpoints for Google Calendar and iCal integration
 */

const calendarSyncService = require('../services/calendarSyncService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Connect Google Calendar
 * POST /api/sync/calendar/google/connect
 */
exports.connectGoogleCalendar = async (req, res) => {
  const { id: userId } = req.user;
  const { authCode } = req.body;

  try {
    if (!authCode) {
      return res.status(400).json({ error: 'Código de autorización requerido' });
    }

    const result = await calendarSyncService.connectGoogleCalendar(userId, authCode);

    res.json({
      message: 'Calendario de Google conectado exitosamente',
      ...result
    });

  } catch (error) {
    console.error('Error conectando Google Calendar:', error);
    res.status(500).json({ error: 'Error al conectar calendario de Google' });
  }
};

/**
 * Sync Google Calendar
 * POST /api/sync/calendar/google/sync
 */
exports.syncGoogleCalendar = async (req, res) => {
  const { id: userId } = req.user;

  try {
    await calendarSyncService.syncGoogleCalendar(userId);

    res.json({ message: 'Sincronización completada exitosamente' });

  } catch (error) {
    console.error('Error sincronizando Google Calendar:', error);
    res.status(500).json({ error: 'Error al sincronizar calendario de Google' });
  }
};

/**
 * Get iCal feed
 * GET /api/sync/calendar/ical/:userId
 */
exports.getICalFeed = async (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate } = req.query;

  try {
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 días

    const icalData = await calendarSyncService.generateICalFeed(userId, start, end);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="availability.ics"');
    res.send(icalData);

  } catch (error) {
    console.error('Error generando feed iCal:', error);
    res.status(500).json({ error: 'Error al generar calendario iCal' });
  }
};

/**
 * Disconnect calendar
 * DELETE /api/sync/calendar/disconnect/:calendarType
 */
exports.disconnectCalendar = async (req, res) => {
  const { id: userId } = req.user;
  const { calendarType } = req.params;

  try {
    await calendarSyncService.disconnectCalendar(userId, calendarType);

    res.json({ message: `Calendario ${calendarType} desconectado exitosamente` });

  } catch (error) {
    console.error('Error desconectando calendario:', error);
    res.status(500).json({ error: 'Error al desconectar calendario' });
  }
};

/**
 * Get calendar connections
 * GET /api/sync/calendar/connections
 */
exports.getCalendarConnections = async (req, res) => {
  const { id: userId } = req.user;

  try {
    const connections = await calendarSyncService.getCalendarConnections(userId);

    res.json({ connections });

  } catch (error) {
    console.error('Error obteniendo conexiones de calendario:', error);
    res.status(500).json({ error: 'Error al obtener conexiones de calendario' });
  }
};

/**
 * Resolve sync conflicts
 * POST /api/sync/calendar/resolve-conflicts
 */
exports.resolveSyncConflicts = async (req, res) => {
  const { id: userId } = req.user;
  const { conflicts } = req.body;

  try {
    if (!conflicts || !Array.isArray(conflicts)) {
      return res.status(400).json({ error: 'Lista de conflictos requerida' });
    }

    await calendarSyncService.resolveSyncConflicts(userId, conflicts);

    res.json({ message: 'Conflictos resueltos exitosamente' });

  } catch (error) {
    console.error('Error resolviendo conflictos:', error);
    res.status(500).json({ error: 'Error al resolver conflictos de sincronización' });
  }
};

/**
 * Get OAuth URL for Google Calendar
 * GET /api/sync/calendar/google/auth-url
 */
exports.getGoogleAuthUrl = async (req, res) => {
  const { google } = require('googleapis');

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3003/api/sync/calendar/google/callback'
    );

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    res.json({ authUrl });

  } catch (error) {
    console.error('Error generando URL de autenticación:', error);
    res.status(500).json({ error: 'Error al generar URL de autenticación' });
  }
};

/**
 * Handle Google OAuth callback
 * GET /api/sync/calendar/google/callback
 */
exports.handleGoogleCallback = async (req, res) => {
  const { code, state } = req.query;

  try {
    if (!code) {
      return res.status(400).json({ error: 'Código de autorización requerido' });
    }

    // En una implementación completa, aquí se manejaría el callback
    // Por ahora, redirigimos al frontend con el código
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/dashboard-profesional/calendarios?code=${code}`;

    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Error en callback de Google:', error);
    res.status(500).json({ error: 'Error en autenticación de Google' });
  }
};

/**
 * Get sync logs
 * GET /api/sync/calendar/logs
 */
exports.getSyncLogs = async (req, res) => {
  const { id: userId } = req.user;
  const { page = 1, limit = 20, status, operation } = req.query;

  try {
    const skip = (page - 1) * limit;
    const where = { user_id: userId };

    if (status) where.status = status;
    if (operation) where.operation = operation;

    const [logs, total] = await Promise.all([
      prisma.calendar_sync_logs.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.calendar_sync_logs.count({ where })
    ]);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo logs de sincronización:', error);
    res.status(500).json({ error: 'Error al obtener logs de sincronización' });
  }
};
