/**
 * Rutas de administración
 * REQ-40: Panel admin para gestión de verificaciones
 */

const express = require('express');
const adminController = require('../controllers/adminController');
const commissionController = require('../controllers/commissionController');
const { authenticateToken } = require('../middleware/authenticate');
const { validateFinancialOperation, validateFinancialAmounts, highRiskOperation } = require('../middleware/financialSecurity');

const router = express.Router();

// Middleware para verificar rol de administrador
const requireAdmin = (req, res, next) => {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Acceso denegado. Se requieren permisos de administrador.'
    });
  }
  next();
};

// Aplicar middleware de admin a todas las rutas
router.use(authenticateToken);
router.use(requireAdmin);

// Gestión de verificaciones
router.get('/verifications/pending', adminController.getPendingVerifications);
router.post('/verifications/:requestId/approve', adminController.approveVerification);
router.post('/verifications/:requestId/reject', adminController.rejectVerification);

// Estadísticas del sistema
router.get('/stats', adminController.getSystemStats);

// Gestión de usuarios
router.get('/users', adminController.getUsersList);
router.get('/users/:userId', adminController.getUserDetails);
router.put('/users/:userId/block', adminController.toggleUserBlock);
router.put('/users/:userId/role', adminController.changeUserRole);

// Gestión manual de pagos
router.post('/payments/:paymentId/release-funds', adminController.manualReleaseFunds);

// Gestión de servicios
router.get('/services', adminController.getServicesList);
router.put('/services/:serviceId/status', adminController.updateServiceStatus);

// Gestión de comisiones
router.post('/commission/update',
  validateFinancialOperation('manage_commissions'),
  validateFinancialAmounts,
  highRiskOperation,
  commissionController.updateGlobalCommission
);

// Dashboard de pagos y métricas
router.get('/dashboard/payment-metrics', commissionController.getPaymentDashboard);
router.get('/dashboard/professional/:professionalId/pending-income', commissionController.getProfessionalPendingIncomeEndpoint);

module.exports = router;
