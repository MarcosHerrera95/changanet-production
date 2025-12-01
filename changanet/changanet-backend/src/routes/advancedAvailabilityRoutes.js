// src/routes/advancedAvailabilityRoutes.js
// Advanced Availability & Scheduling API Routes
// Implements the comprehensive availability management system

const express = require('express');
const {
  // Availability Configuration
  createAvailabilityConfig,
  getAvailabilityConfigs,
  getAvailabilityConfig,
  updateAvailabilityConfig,
  deleteAvailabilityConfig,
  generateSlotsFromConfig,

  // Availability Slots
  queryAvailabilitySlots,
  getSlotDetails,
  updateSlot,
  bookSlot,

  // Appointments
  createAppointment,
  getAppointments,
  getAppointment,
  updateAppointment,
  cancelAppointment,

  // Conflict Detection
  checkConflicts,

  // Timezone Utilities
  convertTimezone,
  listTimezones,

  // Statistics
  getAvailabilityStats
} = require('../controllers/advancedAvailabilityController');

const { authenticateToken } = require('../middleware/authenticate');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// ===== AVAILABILITY CONFIGURATION MANAGEMENT =====

// Create availability configuration
router.post('/configs', createAvailabilityConfig);

// List availability configurations
router.get('/configs', getAvailabilityConfigs);

// Get specific configuration
router.get('/configs/:configId', getAvailabilityConfig);

// Update configuration
router.put('/configs/:configId', updateAvailabilityConfig);

// Delete configuration
router.delete('/configs/:configId', deleteAvailabilityConfig);

// Generate slots from configuration
router.post('/configs/:configId/generate', generateSlotsFromConfig);

// ===== AVAILABILITY SLOTS MANAGEMENT =====

// Query availability slots (replaces old GET /api/availability/:professionalId)
router.get('/slots', queryAvailabilitySlots);

// Get slot details
router.get('/slots/:slotId', getSlotDetails);

// Update slot
router.put('/slots/:slotId', updateSlot);

// Book slot (replaces old POST /api/availability/:slotId/book)
router.post('/slots/:slotId/book', bookSlot);

// ===== APPOINTMENT MANAGEMENT =====

// Create appointment
router.post('/appointments', createAppointment);

// List appointments
router.get('/appointments', getAppointments);

// Get appointment details
router.get('/appointments/:appointmentId', getAppointment);

// Update appointment
router.put('/appointments/:appointmentId', updateAppointment);

// Cancel appointment
router.delete('/appointments/:appointmentId', cancelAppointment);

// ===== CONFLICT DETECTION =====

// Check for conflicts
router.post('/conflicts/check', checkConflicts);

// ===== TIMEZONE UTILITIES =====

// Convert timezone
router.post('/timezone/convert', convertTimezone);

// List available timezones
router.get('/timezone/list', listTimezones);

// ===== STATISTICS AND ANALYTICS =====

// Get availability statistics
router.get('/stats', getAvailabilityStats);

// ===== BACKWARD COMPATIBILITY ROUTES =====
// These routes maintain compatibility with existing frontend code

// Legacy availability routes (redirect to new endpoints)
const { getAvailability, createAvailability, updateAvailability, deleteAvailability, bookAvailability, cancelBooking } = require('../controllers/availabilityController');

// Legacy: Get availability (redirects to new query endpoint)
router.get('/:professionalId', async (req, res) => {
  const { professionalId } = req.params;
  const { date } = req.query;

  // Redirect to new endpoint with query parameters
  req.query.professionalId = professionalId;
  if (date) req.query.date = date;

  return queryAvailabilitySlots(req, res);
});

// Legacy: Create availability slot
router.post('/', createAvailability);

// Legacy: Update availability slot
router.put('/:slotId', updateAvailability);

// Legacy: Delete availability slot
router.delete('/:slotId', deleteAvailability);

// Legacy: Book availability slot
router.post('/:slotId/book', bookAvailability);

// Legacy: Cancel booking
router.delete('/:slotId/cancel', cancelBooking);

module.exports = router;
