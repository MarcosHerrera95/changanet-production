/**
 * Rutas para configuración de comisiones
 * Implementa REQ-43: Comisión configurable entre 5-10%
 */

const express = require('express');
const commissionController = require('../controllers/commissionController');
const { authenticateToken } = require('../middleware/authenticate');
const { validateFinancialOperation, validateFinancialAmounts, highRiskOperation } = require('../middleware/financialSecurity');

const router = express.Router();

// GET /api/commissions
// Obtener configuraciones de comisión activas
router.get('/', commissionController.getCommissionSettings);

// GET /api/commissions/applicable
// Obtener configuración de comisión aplicable
router.get('/applicable', commissionController.getApplicableCommission);

// POST /api/commissions (solo admins)
// Crear nueva configuración de comisión
router.post('/',
  validateFinancialOperation('manage_commissions'),
  validateFinancialAmounts,
  highRiskOperation,
  commissionController.createCommissionSetting
);

// PUT /api/commissions/:settingId (solo admins)
// Actualizar configuración de comisión
router.put('/:settingId',
  validateFinancialOperation('manage_commissions'),
  validateFinancialAmounts,
  highRiskOperation,
  commissionController.updateCommissionSetting
);

// DELETE /api/commissions/:settingId (solo admins)
// Desactivar configuración de comisión
router.delete('/:settingId',
  validateFinancialOperation('manage_commissions'),
  highRiskOperation,
  commissionController.deactivateCommissionSetting
);

// POST /api/commissions/calculate
// Calcular comisión para un monto
router.post('/calculate',
  validateFinancialAmounts,
  commissionController.calculateCommission
);

// GET /api/commissions/stats (solo admins)
// Obtener estadísticas de comisiones
router.get('/stats',
  validateFinancialOperation('view_financial_reports'),
  commissionController.getCommissionStats
);

module.exports = router;
