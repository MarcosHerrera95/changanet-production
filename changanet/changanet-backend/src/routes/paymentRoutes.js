/**
 * Rutas para sistema de pagos integrados
 * Implementa sección 7.9 del PRD: Pagos Integrados y Comisiones
 */

const express = require('express');
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/authenticate');
const { validateFinancialOperation, validateFinancialAmounts } = require('../middleware/financialSecurity');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// POST /api/payments/create-preference
// Crea una preferencia de pago con custodia de fondos
router.post('/create-preference',
  validateFinancialOperation('create_payment'),
  validateFinancialAmounts,
  paymentController.createPaymentPreference
);

// POST /api/payments/release-funds
// Libera los fondos de un pago completado
router.post('/release-funds',
  validateFinancialOperation('release_funds'),
  validateFinancialAmounts,
  paymentController.releaseFunds
);

// GET /api/payments/status/:paymentId
// Obtiene el estado de un pago
router.get('/status/:paymentId', authenticateToken, paymentController.getPaymentStatus);

// POST /api/payments/webhook
// Webhook para notificaciones de Mercado Pago (sin autenticación)
router.post('/webhook', paymentController.handleWebhook);

// POST /api/payments/withdraw
// Permite a profesionales retirar fondos a su cuenta bancaria
router.post('/withdraw',
  validateFinancialOperation('create_withdrawal'),
  validateFinancialAmounts,
  paymentController.withdrawFunds
);

// GET /api/payments/receipt/:paymentId
// Genera y obtiene comprobante de pago
router.get('/receipt/:paymentId', authenticateToken, paymentController.generateReceipt);

// GET /api/payments/receipts/:fileName
// Descarga un comprobante de pago
router.get('/receipts/:fileName', authenticateToken, paymentController.downloadReceipt);

// GET /api/payments/:clientId
// Obtener pagos de un cliente específico
router.get('/:clientId',
  paymentController.getClientPayments
);

// GET /api/payments/received/:professionalId
// Obtener pagos recibidos por un profesional
router.get('/received/:professionalId',
  paymentController.getProfessionalPayments
);

// GET /api/admin/payments
// Obtener todos los pagos (solo admins)
router.get('/admin/payments',
  validateFinancialOperation('view_financial_reports'),
  paymentController.getAllPayments
);

// POST /api/payments/auto-release
// Liberación automática de fondos (para cron jobs - sin autenticación requerida)
router.post('/auto-release', async (req, res) => {
  try {
    const { autoReleaseFunds } = require('../services/mercadoPagoService');
    const result = await autoReleaseFunds();
    res.json(result);
  } catch (error) {
    console.error('Error en auto-release:', error);
    res.status(500).json({ error: 'Error en liberación automática' });
  }
});

module.exports = router;
