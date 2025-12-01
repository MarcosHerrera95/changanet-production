// src/routes/availabilityRoutes.js
// Rutas para gestión de disponibilidad y agenda
// Implementa sección 7.6 del PRD: Gestión de Disponibilidad y Agenda
//
// FUNCIONALIDADES IMPLEMENTADAS:
// - Gestión completa de calendario para profesionales
// - Visualización de disponibilidad para clientes
// - Sistema de reservas y agendamiento directo
// - Cancelación de reservas
// - Validaciones de permisos y conflictos
//
// AUTENTICACIÓN:
// - Todas las rutas requieren autenticación JWT
// - Validación de roles (cliente vs profesional)
//
// ENDPOINTS:
// POST /api/availability - Crear slot disponible (profesional)
// GET /api/availability/:professionalId?date=YYYY-MM-DD - Ver disponibilidad (cliente)
// PUT /api/availability/:slotId - Cambiar estado disponible/no disponible (profesional)
// POST /api/availability/:slotId/book - Reservar slot y crear servicio (cliente)
// DELETE /api/availability/:slotId/cancel - Cancelar reserva
// DELETE /api/availability/:slotId - Eliminar slot (profesional)

const express = require('express');
const { createAvailability, getAvailability, updateAvailability, deleteAvailability, bookAvailability, cancelBooking } = require('../controllers/availabilityController');
const { authenticateToken } = require('../middleware/authenticate');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

router.post('/', createAvailability);
router.get('/:professionalId', getAvailability);
router.put('/:slotId', updateAvailability);
router.post('/:slotId/book', bookAvailability); // REQ-29: Agendar servicios directamente
router.delete('/:slotId/cancel', cancelBooking); // Cancelar reserva
router.delete('/:slotId', deleteAvailability);

module.exports = router;
