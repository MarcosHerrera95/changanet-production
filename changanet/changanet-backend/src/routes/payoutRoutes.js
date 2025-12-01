/**
 * Rutas para pagos a profesionales (payouts)
 * Implementa REQ-42: Custodia de fondos y liberación a profesionales
 */

const express = require('express');
const payoutController = require('../controllers/payoutController');
const { authenticateToken } = require('../middleware/authenticate');
const { validateFinancialOperation, validateFinancialAmounts, highRiskOperation } = require('../middleware/financialSecurity');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /api/payouts
// Obtener payouts del profesional autenticado
router.get('/', payoutController.getPayouts);

// GET /api/payouts/:payoutId
// Obtener payout específico
router.get('/:payoutId', payoutController.getPayoutById);

// GET /api/payouts/stats
// Obtener estadísticas de payouts
router.get('/stats', payoutController.getPayoutStats);

// POST /api/payouts (solo admins para testing)
// Crear payout manualmente
router.post('/',
  validateFinancialOperation('manage_commissions'), // Usar permisos de admin
  validateFinancialAmounts,
  highRiskOperation,
  payoutController.createPayout
);

// POST /api/payouts/:payoutId/process (solo admins)
// Procesar payout
router.post('/:payoutId/process',
  validateFinancialOperation('process_withdrawals'),
  highRiskOperation,
  payoutController.processPayout
);

// GET /api/payouts/pending (solo admins)
// Obtener payouts pendientes
router.get('/pending',
  validateFinancialOperation('process_withdrawals'),
  payoutController.getPendingPayouts
);

// GET /api/payouts/global-stats (solo admins)
// Obtener estadísticas globales de payouts
router.get('/global-stats',
  validateFinancialOperation('view_financial_reports'),
  payoutController.getGlobalPayoutStats
);

module.exports = router;
