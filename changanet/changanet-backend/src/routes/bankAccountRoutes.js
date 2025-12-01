/**
 * Rutas para gestión de cuentas bancarias
 * Implementa REQ-44: Gestión de cuentas bancarias para retiros
 */

const express = require('express');
const bankAccountController = require('../controllers/bankAccountController');
const { authenticateToken } = require('../middleware/authenticate');
const { validateFinancialOperation, validateFinancialAmounts, highRiskOperation } = require('../middleware/financialSecurity');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /api/bank-accounts
// Obtener cuentas bancarias del profesional autenticado
router.get('/', bankAccountController.getBankAccounts);

// POST /api/bank-accounts
// Crear nueva cuenta bancaria
router.post('/',
  validateFinancialOperation('manage_bank_accounts'),
  validateFinancialAmounts,
  highRiskOperation,
  bankAccountController.createBankAccount
);

// PUT /api/bank-accounts/:accountId
// Actualizar cuenta bancaria
router.put('/:accountId',
  validateFinancialOperation('manage_bank_accounts'),
  validateFinancialAmounts,
  highRiskOperation,
  bankAccountController.updateBankAccount
);

// DELETE /api/bank-accounts/:accountId
// Eliminar cuenta bancaria
router.delete('/:accountId',
  validateFinancialOperation('manage_bank_accounts'),
  highRiskOperation,
  bankAccountController.deleteBankAccount
);

// POST /api/bank-accounts/:accountId/verify (solo admins)
// Verificar cuenta bancaria
router.post('/:accountId/verify',
  validateFinancialOperation('manage_bank_accounts'),
  highRiskOperation,
  bankAccountController.verifyBankAccount
);

// GET /api/bank-accounts/pending (solo admins)
// Obtener cuentas pendientes de verificación
router.get('/pending',
  validateFinancialOperation('manage_bank_accounts'),
  bankAccountController.getPendingBankAccounts
);

module.exports = router;
