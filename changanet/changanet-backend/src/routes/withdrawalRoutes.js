/**
 * Rutas para solicitudes de retiro
 * Implementa REQ-44: Retiro de fondos a cuenta bancaria
 */

const express = require('express');
const withdrawalController = require('../controllers/withdrawalController');
const { authenticateToken } = require('../middleware/authenticate');
const { validateFinancialOperation, validateFinancialAmounts, highRiskOperation } = require('../middleware/financialSecurity');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /api/withdrawals
// Obtener solicitudes de retiro del profesional autenticado
router.get('/', withdrawalController.getWithdrawalRequests);

// POST /api/withdrawals
// Crear solicitud de retiro
router.post('/',
  validateFinancialOperation('create_withdrawal'),
  validateFinancialAmounts,
  highRiskOperation,
  withdrawalController.createWithdrawalRequest
);

// GET /api/withdrawals/available-funds
// Obtener fondos disponibles para retiro
router.get('/available-funds',
  validateFinancialOperation('create_withdrawal'),
  withdrawalController.getAvailableFunds
);

// POST /api/withdrawals/:withdrawalId/process (solo admins)
// Procesar solicitud de retiro
router.post('/:withdrawalId/process',
  validateFinancialOperation('process_withdrawals'),
  highRiskOperation,
  withdrawalController.processWithdrawal
);

// POST /api/withdrawals/:withdrawalId/complete (solo admins)
// Completar retiro procesado
router.post('/:withdrawalId/complete',
  validateFinancialOperation('process_withdrawals'),
  highRiskOperation,
  withdrawalController.completeWithdrawal
);

// GET /api/withdrawals/pending (solo admins)
// Obtener retiros pendientes de procesamiento
router.get('/pending',
  validateFinancialOperation('process_withdrawals'),
  withdrawalController.getPendingWithdrawals
);

module.exports = router;
