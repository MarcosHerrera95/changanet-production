/**
 * Servicio de configuración de comisiones
 * Implementa REQ-43: Comisión configurable entre 5-10%
 * Incluye gestión de comisiones por tipo de servicio y auditoría
 */

const { PrismaClient } = require('@prisma/client');
const { invalidateCommissionMetrics } = require('./paymentDashboardService');
const logger = require('./logger');
const { get: redisGet, set: redisSet } = require('./cacheService');

const prisma = new PrismaClient();

// Cache TTL for commission calculations (5 minutes)
const COMMISSION_CACHE_TTL = 300;

/**
 * Obtiene todas las configuraciones de comisión activas
 * @returns {Array} Lista de configuraciones de comisión
 */
async function getCommissionSettings() {
  try {
    const settings = await prisma.commission_settings.findMany({
      where: { activo: true },
      orderBy: [
        { tipo_servicio: 'asc' }, // Global primero (null), luego por tipo
        { fecha_creacion: 'desc' }
      ]
    });

    return settings;
  } catch (error) {
    logger.error('Error getting commission settings', {
      service: 'commissions',
      error: error.message
    });
    throw error;
  }
}

/**
 * Obtiene la configuración de comisión aplicable para un tipo de servicio
 * @param {string} serviceType - Tipo de servicio (opcional)
 * @returns {Object} Configuración de comisión aplicable
 */
async function getApplicableCommission(serviceType = null) {
  try {
    // Buscar configuración específica para el tipo de servicio
    let commissionSetting = null;

    if (serviceType) {
      commissionSetting = await prisma.commission_settings.findFirst({
        where: {
          tipo_servicio: serviceType,
          activo: true
        },
        orderBy: { fecha_creacion: 'desc' }
      });
    }

    // Si no hay configuración específica, usar la global (tipo_servicio = null)
    if (!commissionSetting) {
      commissionSetting = await prisma.commission_settings.findFirst({
        where: {
          tipo_servicio: null,
          activo: true
        },
        orderBy: { fecha_creacion: 'desc' }
      });
    }

    // Si no hay configuración global, devolver configuración por defecto
    if (!commissionSetting) {
      return {
        id: null,
        nombre: 'Comisión por Defecto',
        porcentaje: 5.0, // 5% por defecto según REQ-43
        tipo_servicio: null,
        descripcion: 'Configuración por defecto del sistema',
        activo: true,
        fecha_creacion: new Date(),
        creado_por: null
      };
    }

    return commissionSetting;

  } catch (error) {
    logger.error('Error getting applicable commission', {
      service: 'commissions',
      serviceType,
      error: error.message
    });
    throw error;
  }
}

/**
 * Crea una nueva configuración de comisión
 * @param {Object} commissionData - Datos de la comisión
 * @param {string} adminId - ID del admin que crea la configuración
 * @returns {Object} Configuración creada
 */
async function createCommissionSetting(commissionData, adminId) {
  try {
    const { nombre, porcentaje, tipo_servicio, descripcion } = commissionData;

    // Validar campos requeridos
    if (!nombre || typeof porcentaje !== 'number') {
      throw new Error('Nombre y porcentaje son campos requeridos');
    }

    // REQ-43: Validar que el porcentaje esté entre 5-10%
    if (porcentaje < 5.0 || porcentaje > 10.0) {
      throw new Error('El porcentaje de comisión debe estar entre 5% y 10% según requisitos del sistema');
    }

    // Si es configuración global (tipo_servicio = null), verificar que no exista otra global activa
    if (!tipo_servicio) {
      const existingGlobal = await prisma.commission_settings.findFirst({
        where: {
          tipo_servicio: null,
          activo: true
        }
      });

      if (existingGlobal) {
        throw new Error('Ya existe una configuración global de comisión activa. Desactívela primero.');
      }
    } else {
      // Si es configuración específica, verificar que no exista otra para el mismo tipo
      const existingSpecific = await prisma.commission_settings.findFirst({
        where: {
          tipo_servicio: tipo_servicio,
          activo: true
        }
      });

      if (existingSpecific) {
        throw new Error(`Ya existe una configuración de comisión activa para el tipo de servicio "${tipo_servicio}"`);
      }
    }

    // Crear configuración
    const commissionSetting = await prisma.commission_settings.create({
      data: {
        nombre,
        porcentaje,
        tipo_servicio,
        descripcion,
        activo: true,
        creado_por: adminId
      }
    });

    // Log de auditoría
    await logTransaction({
      tipo_transaccion: 'commission_setting_created',
      entidad_tipo: 'commission_settings',
      entidad_id: commissionSetting.id,
      usuario_id: adminId,
      detalles: {
        nombre,
        porcentaje,
        tipo_servicio,
        descripcion
      },
      ip_address: null,
      user_agent: null
    });

    // Invalidar caché de métricas de comisiones
    await invalidateCommissionMetrics();

    logger.info('Commission setting created successfully', {
      service: 'commissions',
      adminId,
      commissionId: commissionSetting.id,
      nombre,
      porcentaje,
      tipo_servicio
    });

    return commissionSetting;

  } catch (error) {
    logger.error('Error creating commission setting', {
      service: 'commissions',
      adminId,
      commissionData,
      error: error.message
    });
    throw error;
  }
}

/**
 * Actualiza una configuración de comisión
 * @param {string} settingId - ID de la configuración
 * @param {Object} updateData - Datos a actualizar
 * @param {string} adminId - ID del admin
 * @returns {Object} Configuración actualizada
 */
async function updateCommissionSetting(settingId, updateData, adminId) {
  try {
    // Verificar que la configuración existe
    const existingSetting = await prisma.commission_settings.findUnique({
      where: { id: settingId }
    });

    if (!existingSetting) {
      throw new Error('Configuración de comisión no encontrada');
    }

    // Validar porcentaje si se está actualizando
    if (updateData.porcentaje !== undefined) {
      if (typeof updateData.porcentaje !== 'number' || updateData.porcentaje < 5.0 || updateData.porcentaje > 10.0) {
        throw new Error('El porcentaje de comisión debe estar entre 5% y 10%');
      }
    }

    // Si se está cambiando el tipo_servicio, verificar conflictos
    if (updateData.tipo_servicio !== undefined && updateData.tipo_servicio !== existingSetting.tipo_servicio) {
      if (!updateData.tipo_servicio) {
        // Cambiando a global - verificar que no exista otra global
        const existingGlobal = await prisma.commission_settings.findFirst({
          where: {
            tipo_servicio: null,
            activo: true,
            id: { not: settingId }
          }
        });

        if (existingGlobal) {
          throw new Error('Ya existe una configuración global de comisión activa');
        }
      } else {
        // Cambiando a específico - verificar que no exista otra para este tipo
        const existingSpecific = await prisma.commission_settings.findFirst({
          where: {
            tipo_servicio: updateData.tipo_servicio,
            activo: true,
            id: { not: settingId }
          }
        });

        if (existingSpecific) {
          throw new Error(`Ya existe una configuración de comisión activa para el tipo de servicio "${updateData.tipo_servicio}"`);
        }
      }
    }

    const updatedSetting = await prisma.commission_settings.update({
      where: { id: settingId },
      data: updateData
    });

    // Log de auditoría
    await logTransaction({
      tipo_transaccion: 'commission_setting_updated',
      entidad_tipo: 'commission_settings',
      entidad_id: settingId,
      usuario_id: adminId,
      detalles: updateData,
      ip_address: null,
      user_agent: null
    });

    // Invalidar caché de métricas de comisiones
    await invalidateCommissionMetrics();

    logger.info('Commission setting updated successfully', {
      service: 'commissions',
      adminId,
      settingId,
      updatedFields: Object.keys(updateData)
    });

    return updatedSetting;

  } catch (error) {
    logger.error('Error updating commission setting', {
      service: 'commissions',
      adminId,
      settingId,
      updateData,
      error: error.message
    });
    throw error;
  }
}

/**
 * Desactiva una configuración de comisión
 * @param {string} settingId - ID de la configuración
 * @param {string} adminId - ID del admin
 * @returns {boolean} True si se desactivó
 */
async function deactivateCommissionSetting(settingId, adminId) {
  try {
    // Verificar que la configuración existe
    const setting = await prisma.commission_settings.findUnique({
      where: { id: settingId }
    });

    if (!setting) {
      throw new Error('Configuración de comisión no encontrada');
    }

    if (!setting.activo) {
      throw new Error('La configuración ya está desactivada');
    }

    // Verificar que no sea la última configuración global activa
    if (!setting.tipo_servicio) {
      const activeGlobalCount = await prisma.commission_settings.count({
        where: {
          tipo_servicio: null,
          activo: true,
          id: { not: settingId }
        }
      });

      if (activeGlobalCount === 0) {
        throw new Error('No se puede desactivar la última configuración global de comisión');
      }
    }

    await prisma.commission_settings.update({
      where: { id: settingId },
      data: { activo: false }
    });

    // Log de auditoría
    await logTransaction({
      tipo_transaccion: 'commission_setting_deactivated',
      entidad_tipo: 'commission_settings',
      entidad_id: settingId,
      usuario_id: adminId,
      detalles: {
        nombre: setting.nombre,
        porcentaje: setting.porcentaje,
        tipo_servicio: setting.tipo_servicio
      },
      ip_address: null,
      user_agent: null
    });

    // Invalidar caché de métricas de comisiones
    await invalidateCommissionMetrics();

    logger.info('Commission setting deactivated successfully', {
      service: 'commissions',
      adminId,
      settingId,
      nombre: setting.nombre
    });

    return true;

  } catch (error) {
    logger.error('Error deactivating commission setting', {
      service: 'commissions',
      adminId,
      settingId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Calcula la comisión para un monto dado (con caché)
 * @param {number} amount - Monto base
 * @param {string} serviceType - Tipo de servicio (opcional)
 * @returns {Object} Detalles del cálculo de comisión
 */
async function calculateCommission(amount, serviceType = null) {
  try {
    // Crear clave de caché
    const cacheKey = `commission_calc:${amount}:${serviceType || 'global'}`;

    // Intentar obtener del caché
    const cachedResult = await redisGet(cacheKey);
    if (cachedResult) {
      logger.debug('Commission calculation served from cache', {
        service: 'commissions',
        amount,
        serviceType,
        cacheKey
      });
      return JSON.parse(cachedResult);
    }

    const commissionSetting = await getApplicableCommission(serviceType);

    const commissionAmount = Math.round(amount * (commissionSetting.porcentaje / 100));
    const professionalAmount = amount - commissionAmount;

    const result = {
      originalAmount: amount,
      commissionPercentage: commissionSetting.porcentaje,
      commissionAmount,
      professionalAmount,
      commissionSetting: {
        id: commissionSetting.id,
        nombre: commissionSetting.nombre,
        tipo_servicio: commissionSetting.tipo_servicio
      }
    };

    // Cachear el resultado
    await redisSet(cacheKey, JSON.stringify(result), COMMISSION_CACHE_TTL);

    logger.debug('Commission calculation computed and cached', {
      service: 'commissions',
      amount,
      serviceType,
      cacheKey
    });

    return result;

  } catch (error) {
    logger.error('Error calculating commission', {
      service: 'commissions',
      amount,
      serviceType,
      error: error.message
    });
    throw error;
  }
}

/**
 * Obtiene estadísticas de uso de comisiones
 * @returns {Object} Estadísticas de comisiones
 */
async function getCommissionStats() {
  try {
    // Total de pagos procesados
    const totalPayments = await prisma.pagos.count({
      where: { estado: 'liberado' }
    });

    // Suma total de comisiones cobradas
    const commissionResult = await prisma.pagos.aggregate({
      where: { estado: 'liberado' },
      _sum: { comision_plataforma: true }
    });

    const totalCommission = commissionResult._sum.comision_plataforma || 0;

    // Suma total de montos pagados a profesionales
    const professionalResult = await prisma.pagos.aggregate({
      where: { estado: 'liberado' },
      _sum: { monto_profesional: true }
    });

    const totalProfessionalPayments = professionalResult._sum.monto_profesional || 0;

    // Configuraciones activas
    const activeSettings = await prisma.commission_settings.count({
      where: { activo: true }
    });

    return {
      totalPayments,
      totalCommission,
      totalProfessionalPayments,
      activeCommissionSettings: activeSettings,
      averageCommissionRate: totalPayments > 0 ? (totalCommission / (totalCommission + totalProfessionalPayments)) * 100 : 0
    };

  } catch (error) {
    logger.error('Error getting commission stats', {
      service: 'commissions',
      error: error.message
    });
    throw error;
  }
}

/**
 * Actualiza la configuración global de comisiones
 * @param {number} percentage - Nuevo porcentaje de comisión (5-10%)
 * @param {number} minimumFee - Tarifa mínima opcional
 * @param {string} adminId - ID del admin que realiza el cambio
 * @returns {Object} Resultado de la actualización
 */
async function updateGlobalCommission(percentage, minimumFee, adminId) {
  try {
    // Validar porcentaje
    if (typeof percentage !== 'number' || percentage < 5.0 || percentage > 10.0) {
      throw new Error('El porcentaje debe estar entre 5% y 10%');
    }

    // Obtener la configuración global actual
    const currentGlobalSetting = await prisma.commission_settings.findFirst({
      where: {
        tipo_servicio: null,
        activo: true
      },
      orderBy: { fecha_creacion: 'desc' }
    });

    const oldPercentage = currentGlobalSetting ? currentGlobalSetting.porcentaje : null;

    let result;
    if (currentGlobalSetting) {
      // Actualizar configuración existente
      result = await prisma.commission_settings.update({
        where: { id: currentGlobalSetting.id },
        data: {
          porcentaje: percentage,
          descripcion: minimumFee ? `Comisión global ${percentage}% con tarifa mínima ${minimumFee}` : `Comisión global ${percentage}%`
        }
      });
    } else {
      // Crear nueva configuración global
      result = await prisma.commission_settings.create({
        data: {
          nombre: 'Comisión Global',
          porcentaje: percentage,
          tipo_servicio: null,
          descripcion: minimumFee ? `Comisión global ${percentage}% con tarifa mínima ${minimumFee}` : `Comisión global ${percentage}%`,
          activo: true,
          creado_por: adminId
        }
      });
    }

    // Log de auditoría
    await logTransaction({
      tipo_transaccion: 'global_commission_updated',
      entidad_tipo: 'commission_settings',
      entidad_id: result.id,
      usuario_id: adminId,
      monto: percentage,
      detalles: {
        oldPercentage,
        newPercentage: percentage,
        minimumFee
      },
      ip_address: null,
      user_agent: null
    });

    // Invalidar caché de métricas de comisiones
    await invalidateCommissionMetrics();

    logger.info('Global commission updated successfully', {
      service: 'commissions',
      adminId,
      oldPercentage,
      newPercentage: percentage,
      minimumFee
    });

    return {
      id: result.id,
      oldPercentage,
      newPercentage: percentage,
      minimumFee,
      updatedAt: result.fecha_creacion
    };

  } catch (error) {
    logger.error('Error updating global commission', {
      service: 'commissions',
      adminId,
      percentage,
      minimumFee,
      error: error.message
    });
    throw error;
  }
}

/**
 * Función auxiliar para logging de transacciones
 */
async function logTransaction(logData) {
  try {
    await prisma.transactions_log.create({
      data: logData
    });
  } catch (error) {
    logger.error('Error logging transaction', {
      service: 'commissions',
      error: error.message
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
};
