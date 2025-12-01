/**
 * Controlador de configuración de comisiones
 * Implementa REQ-43: Comisión configurable entre 5-10%
 * Incluye validaciones de seguridad y manejo de errores
 */

const commissionService = require('../services/commissionService');
const {
  getCommissionMetrics,
  getPaymentDashboardMetrics,
  getProfessionalPendingIncome
} = require('../services/paymentDashboardService');
const logger = require('../services/logger');

/**
 * Obtiene todas las configuraciones de comisión activas
 * GET /api/commissions
 */
async function getCommissionSettings(req, res) {
  try {
    const settings = await commissionService.getCommissionSettings();

    res.json({
      success: true,
      data: settings,
    });

  } catch (error) {
    logger.error('Get commission settings error', {
      service: 'commissions',
      userId: req.user?.id,
      error: error.message,
      ip: req.ip
    });

    res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Obtiene la configuración de comisión aplicable para un tipo de servicio
 * GET /api/commissions/applicable
 */
async function getApplicableCommission(req, res) {
  try {
    const { serviceType } = req.query;

    const commission = await commissionService.getApplicableCommission(serviceType);

    res.json({
      success: true,
      data: commission,
    });

  } catch (error) {
    logger.error('Get applicable commission error', {
      service: 'commissions',
      userId: req.user?.id,
      serviceType: req.query?.serviceType,
      error: error.message,
      ip: req.ip
    });

    res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Crea una nueva configuración de comisión (solo admins)
 * POST /api/commissions
 */
async function createCommissionSetting(req, res) {
  try {
    const { id: adminId, rol } = req.user;
    const commissionData = req.body;

    // Verificar que sea admin
    if (rol !== 'admin') {
      return res.status(403).json({
        error: 'Solo los administradores pueden crear configuraciones de comisión',
      });
    }

    // Validar campos requeridos
    const requiredFields = ['nombre', 'porcentaje'];
    const missingFields = requiredFields.filter(field => !commissionData[field]);

    if (missingFields.length > 0) {
      logger.warn('Commission setting creation failed: missing required fields', {
        service: 'commissions',
        adminId,
        missingFields,
        ip: req.ip
      });
      return res.status(400).json({
        error: `Faltan campos requeridos: ${missingFields.join(', ')}`,
      });
    }

    const commissionSetting = await commissionService.createCommissionSetting(commissionData, adminId);

    logger.info('Commission setting created via API', {
      service: 'commissions',
      adminId,
      commissionId: commissionSetting.id,
      nombre: commissionData.nombre,
      porcentaje: commissionData.porcentaje,
      tipo_servicio: commissionData.tipo_servicio,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      data: commissionSetting,
      message: 'Configuración de comisión creada exitosamente'
    });

  } catch (error) {
    logger.error('Commission setting creation error', {
      service: 'commissions',
      adminId: req.user?.id,
      commissionData: req.body,
      error: error.message,
      ip: req.ip
    });

    let statusCode = 500;
    if (error.message.includes('campos requeridos') ||
        error.message.includes('entre 5% y 10%') ||
        error.message.includes('Ya existe')) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Actualiza una configuración de comisión (solo admins)
 * PUT /api/commissions/:settingId
 */
async function updateCommissionSetting(req, res) {
  try {
    const { settingId } = req.params;
    const { id: adminId, rol } = req.user;
    const updateData = req.body;

    // Verificar que sea admin
    if (rol !== 'admin') {
      return res.status(403).json({
        error: 'Solo los administradores pueden actualizar configuraciones de comisión',
      });
    }

    // Validar que se proporcionen datos para actualizar
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'Se deben proporcionar datos para actualizar',
      });
    }

    const updatedSetting = await commissionService.updateCommissionSetting(settingId, updateData, adminId);

    logger.info('Commission setting updated via API', {
      service: 'commissions',
      adminId,
      settingId,
      updatedFields: Object.keys(updateData),
      ip: req.ip
    });

    res.json({
      success: true,
      data: updatedSetting,
      message: 'Configuración de comisión actualizada exitosamente'
    });

  } catch (error) {
    logger.error('Commission setting update error', {
      service: 'commissions',
      adminId: req.user?.id,
      settingId: req.params.settingId,
      updateData: req.body,
      error: error.message,
      ip: req.ip
    });

    let statusCode = 500;
    if (error.message.includes('Configuración de comisión no encontrada') ||
        error.message.includes('entre 5% y 10%') ||
        error.message.includes('Ya existe')) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Desactiva una configuración de comisión (solo admins)
 * DELETE /api/commissions/:settingId
 */
async function deactivateCommissionSetting(req, res) {
  try {
    const { settingId } = req.params;
    const { id: adminId, rol } = req.user;

    // Verificar que sea admin
    if (rol !== 'admin') {
      return res.status(403).json({
        error: 'Solo los administradores pueden desactivar configuraciones de comisión',
      });
    }

    await commissionService.deactivateCommissionSetting(settingId, adminId);

    logger.info('Commission setting deactivated via API', {
      service: 'commissions',
      adminId,
      settingId,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Configuración de comisión desactivada exitosamente'
    });

  } catch (error) {
    logger.error('Commission setting deactivation error', {
      service: 'commissions',
      adminId: req.user?.id,
      settingId: req.params.settingId,
      error: error.message,
      ip: req.ip
    });

    let statusCode = 500;
    if (error.message.includes('Configuración de comisión no encontrada') ||
        error.message.includes('ya está desactivada') ||
        error.message.includes('última configuración global')) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Calcula la comisión para un monto dado
 * POST /api/commissions/calculate
 */
async function calculateCommission(req, res) {
  try {
    const { amount, serviceType } = req.body;

    // Validar campos requeridos
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        error: 'Se requiere un monto válido mayor a 0',
      });
    }

    const calculation = await commissionService.calculateCommission(amount, serviceType);

    res.json({
      success: true,
      data: calculation,
    });

  } catch (error) {
    logger.error('Commission calculation error', {
      service: 'commissions',
      userId: req.user?.id,
      amount: req.body?.amount,
      serviceType: req.body?.serviceType,
      error: error.message,
      ip: req.ip
    });

    res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Obtiene estadísticas de uso de comisiones con caché (solo admins)
 * GET /api/commissions/stats
 */
async function getCommissionStats(req, res) {
  try {
    const { rol } = req.user;

    // Verificar que sea admin
    if (rol !== 'admin') {
      return res.status(403).json({
        error: 'Solo los administradores pueden ver estadísticas de comisiones',
      });
    }

    // Usar servicio con caché para mejor performance
    const stats = await getCommissionMetrics();

    logger.info('Commission stats retrieved with cache', {
      service: 'commissions',
      adminId: req.user.id,
      calculatedAt: stats.calculatedAt,
      ip: req.ip
    });

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    logger.error('Get commission stats error', {
      service: 'commissions',
      adminId: req.user?.id,
      error: error.message,
      ip: req.ip
    });

    res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Actualiza la configuración global de comisiones (solo admins)
 * POST /api/admin/commission/update
 */
async function updateGlobalCommission(req, res) {
  try {
    const { id: adminId, rol } = req.user;
    const { percentage, minimumFee } = req.body;

    // Verificar que sea admin
    if (rol !== 'admin') {
      return res.status(403).json({
        error: 'Solo los administradores pueden actualizar la configuración global de comisiones',
      });
    }

    // Validar campos requeridos
    if (percentage === undefined) {
      return res.status(400).json({
        error: 'Se requiere el campo percentage',
      });
    }

    // Validar rango de porcentaje (5-10%)
    if (percentage < 5 || percentage > 10) {
      return res.status(400).json({
        error: 'El porcentaje debe estar entre 5% y 10%',
      });
    }

    const result = await commissionService.updateGlobalCommission(percentage, minimumFee, adminId);

    logger.info('Global commission updated via API', {
      service: 'commissions',
      adminId,
      oldPercentage: result.oldPercentage,
      newPercentage: percentage,
      minimumFee,
      ip: req.ip
    });

    res.json({
      success: true,
      data: result,
      message: 'Configuración global de comisión actualizada exitosamente'
    });

  } catch (error) {
    logger.error('Update global commission error', {
      service: 'commissions',
      adminId: req.user?.id,
      percentage: req.body?.percentage,
      minimumFee: req.body?.minimumFee,
      error: error.message,
      ip: req.ip
    });

    res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Obtiene métricas del dashboard de pagos (solo admins)
 * GET /api/dashboard/payment-metrics
 */
async function getPaymentDashboard(req, res) {
  try {
    const { rol } = req.user;

    // Verificar que sea admin
    if (rol !== 'admin') {
      return res.status(403).json({
        error: 'Solo los administradores pueden ver métricas del dashboard de pagos',
      });
    }

    const metrics = await getPaymentDashboardMetrics();

    logger.info('Payment dashboard metrics retrieved', {
      service: 'dashboard',
      adminId: req.user.id,
      calculatedAt: metrics.calculatedAt,
      ip: req.ip
    });

    res.json({
      success: true,
      data: metrics,
    });

  } catch (error) {
    logger.error('Get payment dashboard error', {
      service: 'dashboard',
      adminId: req.user?.id,
      error: error.message,
      ip: req.ip
    });

    res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

/**
 * Obtiene ingresos pendientes de un profesional
 * GET /api/dashboard/professional/:professionalId/pending-income
 */
async function getProfessionalPendingIncomeEndpoint(req, res) {
  try {
    const { professionalId } = req.params;
    const { id: userId, rol } = req.user;

    // Verificar permisos: solo el profesional mismo o admin pueden ver sus ingresos
    if (rol !== 'admin' && userId !== professionalId) {
      return res.status(403).json({
        error: 'No tienes permiso para ver estos ingresos',
      });
    }

    const income = await getProfessionalPendingIncome(professionalId);

    logger.info('Professional pending income retrieved', {
      service: 'dashboard',
      userId,
      professionalId,
      calculatedAt: income.calculatedAt,
      ip: req.ip
    });

    res.json({
      success: true,
      data: income,
    });

  } catch (error) {
    logger.error('Get professional pending income error', {
      service: 'dashboard',
      userId: req.user?.id,
      professionalId: req.params.professionalId,
      error: error.message,
      ip: req.ip
    });

    res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}

module.exports = {
  getCommissionSettings,
  getApplicableCommission,
  createCommissionSetting,
  updateCommissionSetting,
  deactivateCommissionSetting,
  calculateCommission,
  getCommissionStats,
  updateGlobalCommission,
  getPaymentDashboard,
  getProfessionalPendingIncomeEndpoint,
};
