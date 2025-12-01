// src/routes/calendarSyncRoutes.js
// Calendar Synchronization API Routes

const express = require('express');
const {
  connectGoogleCalendar,
  syncGoogleCalendar,
  getICalFeed,
  disconnectCalendar,
  getCalendarConnections,
  resolveSyncConflicts,
  getGoogleAuthUrl,
  handleGoogleCallback,
  getSyncLogs
} = require('../controllers/calendarSyncController');

const { authenticateToken } = require('../middleware/authenticate');

const router = express.Router();

// Apply authentication to all routes except OAuth callback
router.use(authenticateToken);

// ===== GOOGLE CALENDAR INTEGRATION =====

// Get OAuth authorization URL
router.get('/google/auth-url', getGoogleAuthUrl);

// Handle OAuth callback (no authentication required for callback)
router.get('/google/callback', handleGoogleCallback);

// Connect Google Calendar
router.post('/google/connect', connectGoogleCalendar);

// Sync Google Calendar
router.post('/google/sync', syncGoogleCalendar);

// ===== ICAL INTEGRATION =====

// Get iCal feed (public access for calendar clients)
router.get('/ical/:userId', getICalFeed);

// ===== GENERAL CALENDAR MANAGEMENT =====

// Get calendar connections
router.get('/connections', getCalendarConnections);

// Disconnect calendar
router.delete('/disconnect/:calendarType', disconnectCalendar);

// Resolve sync conflicts
router.post('/resolve-conflicts', resolveSyncConflicts);

// Get sync logs
router.get('/logs', getSyncLogs);

module.exports = router;
