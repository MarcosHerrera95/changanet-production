/**
 * Servicio de dashboard de pagos con caché Redis
 * Implementa métricas optimizadas para dashboards de ingresos pendientes/liberados y comisiones
 * Utiliza Redis para cache de alto rendimiento y reducción de carga en base de datos
 */

const { PrismaClient } = require('@prisma/client');
const {
  cachePaymentDashboardMetrics,
  getCachedPaymentDashboardMetrics,
  invalidatePaymentDashboardMetrics,
  cacheCommissionMetrics,
  getCachedCommissionMetrics,
  invalidateCommissionMetrics,
  cacheProfessionalPendingIncome,
  getCachedProfessionalPendingIncome,
  invalidateProfessionalPendingIncome
} = require('./cacheService');

const prisma = new PrismaClient();

/**
 * Obtiene métricas generales del dashboard de pagos con caché
 * @returns {Promise<Object>} Métricas del dashboard
 */
async function getPaymentDashboardMetrics() {
  try {
    // Intentar obtener del caché primero
    const cached = await getCachedPaymentDashboardMetrics();
    if (cached) {
      console.log('📊 Métricas de dashboard obtenidas del caché');
      return cached;
    }

    console.log('📊 Calculando métricas de dashboard desde base de datos');

    // Calcular métricas desde la base de datos
    const [
      totalPayments,
      pendingPayments,
      approvedPayments,
      releasedPayments,
      failedPayments,
      totalRevenue,
      pendingRevenue,
      releasedRevenue,
      commissionRevenue
    ] = await Promise.all([
      // Total de pagos
      prisma.pagos.count(),

      // Pagos pendientes
      prisma.pagos.count({ where: { estado: 'pendiente' } }),

      // Pagos aprobados
      prisma.pagos.count({ where: { estado: 'aprobado' } }),

      // Pagos liberados
      prisma.pagos.count({ where: { estado: 'liberado' } }),

      // Pagos fallidos
      prisma.pagos.count({ where: { estado: 'fallido' } }),

      // Ingresos totales
      prisma.pagos.aggregate({
        _sum: { monto_total: true },
        where: { estado: { in: ['aprobado', 'liberado'] } }
      }),

      // Ingresos pendientes
      prisma.pagos.aggregate({
        _sum: { monto_total: true },
        where: { estado: 'aprobado' }
      }),

      // Ingresos liberados
      prisma.pagos.aggregate({
        _sum: { monto_profesional: true },
        where: { estado: 'liberado' }
      }),

      // Comisiones totales
      prisma.pagos.aggregate({
        _sum: { comision_plataforma: true },
        where: { estado: 'liberado' }
      })
    ]);

    const metrics = {
      payments: {
        total: totalPayments,
        pending: pendingPayments,
        approved: approvedPayments,
        released: releasedPayments,
        failed: failedPayments
      },
      revenue: {
        total: totalRevenue._sum.monto_total || 0,
        pending: pendingRevenue._sum.monto_total || 0,
        released: releasedRevenue._sum.monto_profesional || 0,
        commissions: commissionRevenue._sum.comision_plataforma || 0
      },
      calculatedAt: new Date().toISOString()
    };

    // Cachear las métricas por 5 minutos
    await cachePaymentDashboardMetrics(metrics);

    return metrics;

  } catch (error) {
    console.error('Error obteniendo métricas del dashboard de pagos:', error);
    throw error;
  }
}

/**
 * Obtiene métricas de comisiones con caché
 * @returns {Promise<Object>} Métricas de comisiones
 */
async function getCommissionMetrics() {
  try {
    // Intentar obtener del caché primero
    const cached = await getCachedCommissionMetrics();
    if (cached) {
      console.log('💰 Métricas de comisiones obtenidas del caché');
      return cached;
    }

    console.log('💰 Calculando métricas de comisiones desde base de datos');

    // Calcular métricas de comisiones
    const [
      activeCommissionSettings,
      totalCommissionCollected,
      averageCommissionRate,
      commissionByServiceType,
      monthlyCommissionTrend
    ] = await Promise.all([
      // Configuraciones activas
      prisma.commission_settings.count({ where: { activo: true } }),

      // Total de comisiones cobradas
      prisma.pagos.aggregate({
        _sum: { comision_plataforma: true },
        where: { estado: 'liberado' }
      }),

      // Tasa promedio de comisión
      prisma.pagos.findMany({
        where: { estado: 'liberado', comision_plataforma: { not: null } },
        select: {
          monto_total: true,
          comision_plataforma: true
        }
      }).then(payments => {
        if (payments.length === 0) return 0;
        const totalAmount = payments.reduce((sum, p) => sum + p.monto_total, 0);
        const totalCommission = payments.reduce((sum, p) => sum + p.comision_plataforma, 0);
        return totalAmount > 0 ? (totalCommission / totalAmount) * 100 : 0;
      }),

      // Comisiones por tipo de servicio
      prisma.pagos.groupBy({
        by: ['commission_setting_id'],
        where: { estado: 'liberado' },
        _sum: { comision_plataforma: true },
        _count: true
      }).then(groups => {
        return Promise.all(groups.map(async group => {
          const setting = await prisma.commission_settings.findUnique({
            where: { id: group.commission_setting_id },
            select: { nombre: true, tipo_servicio: true, porcentaje: true }
          });
          return {
            setting: setting || { nombre: 'Sin configuración', tipo_servicio: null, porcentaje: 0 },
            totalCommission: group._sum.comision_plataforma || 0,
            paymentCount: group._count
          };
        }));
      }),

      // Tendencia mensual de comisiones (últimos 6 meses)
      prisma.$queryRaw`
        SELECT
          strftime('%Y-%m', fecha_liberacion) as month,
          SUM(comision_plataforma) as total_commission,
          COUNT(*) as payment_count
        FROM pagos
        WHERE estado = 'liberado'
          AND fecha_liberacion >= date('now', '-6 months')
        GROUP BY strftime('%Y-%m', fecha_liberacion)
        ORDER BY month DESC
      `
    ]);

    const metrics = {
      activeSettings: activeCommissionSettings,
      totalCollected: totalCommissionCollected._sum.comision_plataforma || 0,
      averageRate: Math.round(averageCommissionRate * 100) / 100,
      byServiceType: commissionByServiceType,
      monthlyTrend: monthlyCommissionTrend,
      calculatedAt: new Date().toISOString()
    };

    // Cachear las métricas por 10 minutos
    await cacheCommissionMetrics(metrics);

    return metrics;

  } catch (error) {
    console.error('Error obteniendo métricas de comisiones:', error);
    throw error;
  }
}

/**
 * Obtiene ingresos pendientes de un profesional con caché
 * @param {string} professionalId - ID del profesional
 * @returns {Promise<Object>} Ingresos pendientes del profesional
 */
async function getProfessionalPendingIncome(professionalId) {
  try {
    // Intentar obtener del caché primero
    const cached = await getCachedProfessionalPendingIncome(professionalId);
    if (cached) {
      console.log(`💵 Ingresos pendientes de profesional ${professionalId} obtenidos del caché`);
      return cached;
    }

    console.log(`💵 Calculando ingresos pendientes de profesional ${professionalId}`);

    // Calcular ingresos pendientes
    const [
      pendingPayments,
      totalPendingAmount,
      nextReleaseDate,
      pendingServices
    ] = await Promise.all([
      // Número de pagos pendientes
      prisma.pagos.count({
        where: {
          profesional_id: professionalId,
          estado: 'aprobado' // En custodia, esperando liberación
        }
      }),

      // Monto total pendiente
      prisma.pagos.aggregate({
        _sum: { monto_profesional: true },
        where: {
          profesional_id: professionalId,
          estado: 'aprobado'
        }
      }),

      // Próxima fecha de liberación automática
      prisma.pagos.findFirst({
        where: {
          profesional_id: professionalId,
          estado: 'aprobado'
        },
        select: { fecha_liberacion: true },
        orderBy: { fecha_liberacion: 'asc' }
      }),

      // Servicios pendientes de liberación
      prisma.pagos.findMany({
        where: {
          profesional_id: professionalId,
          estado: 'aprobado'
        },
        include: {
          servicio: {
            select: {
              descripcion: true,
              cliente: {
                select: { nombre: true }
              }
            }
          }
        },
        orderBy: { fecha_liberacion: 'asc' },
        take: 5 // Solo los próximos 5
      })
    ]);

    const income = {
      professionalId,
      pendingPayments,
      totalPendingAmount: totalPendingAmount._sum.monto_profesional || 0,
      nextReleaseDate: nextReleaseDate?.fecha_liberacion || null,
      pendingServices: pendingServices.map(p => ({
        serviceId: p.servicio_id,
        description: p.servicio.descripcion,
        clientName: p.servicio.cliente.nombre,
        amount: p.monto_profesional,
        releaseDate: p.fecha_liberacion
      })),
      calculatedAt: new Date().toISOString()
    };

    // Cachear por 3 minutos
    await cacheProfessionalPendingIncome(professionalId, income);

    return income;

  } catch (error) {
    console.error(`Error obteniendo ingresos pendientes de profesional ${professionalId}:`, error);
    throw error;
  }
}

/**
 * Invalida todo el caché de métricas de pagos
 * Se debe llamar cuando se realicen cambios en pagos
 */
async function invalidatePaymentMetricsCache() {
  try {
    await Promise.all([
      invalidatePaymentDashboardMetrics(),
      invalidateCommissionMetrics()
    ]);
    console.log('🗑️ Caché de métricas de pagos invalidado');
  } catch (error) {
    console.error('Error invalidando caché de métricas de pagos:', error);
  }
}

/**
 * Invalida caché de ingresos pendientes de un profesional específico
 * @param {string} professionalId - ID del profesional
 */
async function invalidateProfessionalIncomeCache(professionalId) {
  try {
    await invalidateProfessionalPendingIncome(professionalId);
    console.log(`🗑️ Caché de ingresos pendientes invalidado para profesional ${professionalId}`);
  } catch (error) {
    console.error('Error invalidando caché de ingresos del profesional:', error);
  }
}

module.exports = {
  getPaymentDashboardMetrics,
  getCommissionMetrics,
  getProfessionalPendingIncome,
  invalidatePaymentMetricsCache,
  invalidateProfessionalIncomeCache
};
