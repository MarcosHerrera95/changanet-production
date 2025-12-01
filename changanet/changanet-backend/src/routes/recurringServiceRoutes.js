/**
 * @archivo src/routes/recurringServiceRoutes.js - Rutas de servicios recurrentes
 * @descripción Endpoints para gestión de programaciones recurrentes
 * @optimización Automatiza servicios recurrentes para mejor retención
 */

const express = require('express');
const { authenticateToken } = require('../middleware/authenticate');
const {
  createRecurringService,
  getUserRecurringServices,
  cancelRecurringService,
  updateRecurringService,
  getRecurringServiceDetails,
  generateRecurringServices
} = require('../controllers/recurringServiceController');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Crear servicio recurrente
router.post('/', createRecurringService);

// Obtener servicios recurrentes del usuario
router.get('/', getUserRecurringServices);

// Obtener detalles de un servicio recurrente específico
router.get('/:recurringId', getRecurringServiceDetails);

// Actualizar servicio recurrente
router.put('/:recurringId', updateRecurringService);

// Cancelar servicio recurrente
router.delete('/:recurringId', cancelRecurringService);

// Generar servicios recurrentes manualmente (solo admin)
router.post('/generate-services', generateRecurringServices);

module.exports = router;
