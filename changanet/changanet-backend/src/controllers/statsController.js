/**
 * Controlador de estadísticas para dashboards de cliente y profesional
 * Proporciona métricas y datos agregados para los paneles de control
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtiene estadísticas del dashboard de cliente
 */
exports.getClientStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Estadísticas del cliente
    const [
      totalServices,
      pendingQuotes,
      completedServices,
      totalSpentResult
    ] = await Promise.all([
      // Total de servicios contratados
      prisma.servicios.count({
        where: { cliente_id: userId }
      }),

      // Cotizaciones pendientes
      prisma.cotizaciones.count({
        where: {
          cliente_id: userId,
          estado: 'PENDIENTE'
        }
      }),

      // Servicios completados
      prisma.servicios.count({
        where: {
          cliente_id: userId,
          estado: 'COMPLETADO'
        }
      }),

      // Total gastado (suma de precios de cotizaciones aceptadas)
      prisma.cotizaciones.aggregate({
        where: {
          cliente_id: userId,
          estado: 'ACEPTADO'
        },
        _sum: {
          precio: true
        }
      })
    ]);

    const stats = {
      totalServices,
      pendingQuotes,
      completedServices,
      totalSpent: totalSpentResult._sum.precio || 0
    };

    res.json({ data: stats });
  } catch (error) {
    console.error('Error obteniendo estadísticas del cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtiene estadísticas del dashboard de profesional
 */
exports.getProfessionalStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      totalServices,
      pendingQuotes,
      completedServices,
      totalEarningsResult,
      averageRatingResult
    ] = await Promise.all([
      // Total de servicios ofrecidos
      prisma.servicios.count({
        where: { profesional_id: userId }
      }),

      // Cotizaciones pendientes
      prisma.cotizaciones.count({
        where: {
          profesional_id: userId,
          estado: 'PENDIENTE'
        }
      }),

      // Servicios completados
      prisma.servicios.count({
        where: {
          profesional_id: userId,
          estado: 'COMPLETADO'
        }
      }),

      // Total de ganancias (suma de precios de cotizaciones aceptadas)
      prisma.cotizaciones.aggregate({
        where: {
          profesional_id: userId,
          estado: 'ACEPTADO'
        },
        _sum: {
          precio: true
        }
      }),

      // Calificación promedio
      prisma.resenas.aggregate({
        where: {
          servicio: {
            profesional_id: userId
          }
        },
        _avg: {
          calificacion: true
        }
      })
    ]);

    const stats = {
      totalServices,
      pendingQuotes,
      completedServices,
      totalEarnings: totalEarningsResult._sum.precio || 0,
      averageRating: averageRatingResult._avg.calificacion || 0
    };

    res.json({ data: stats });
  } catch (error) {
    console.error('Error obteniendo estadísticas del profesional:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtiene actividad reciente del cliente
 */
exports.getClientActivity = async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener actividad reciente (últimos 10 eventos)
    const recentActivity = await prisma.servicios.findMany({
      where: { cliente_id: userId },
      orderBy: { creado_en: 'desc' },
      take: 10,
      select: {
        id: true,
        descripcion: true,
        estado: true,
        creado_en: true,
        profesional: {
          select: {
            nombre: true
          }
        }
      }
    });

    // Formatear actividad para el frontend
    const formattedActivity = recentActivity.map(service => ({
      id: service.id,
      description: `Servicio con ${service.profesional.nombre}: ${service.descripcion}`,
      status: service.estado.toLowerCase(),
      timestamp: service.creado_en.toISOString().split('T')[0] // Solo fecha
    }));

    res.json({ data: formattedActivity });
  } catch (error) {
    console.error('Error obteniendo actividad del cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtiene actividad reciente del profesional
 */
exports.getProfessionalActivity = async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener actividad reciente (últimos 10 eventos)
    const recentActivity = await prisma.servicios.findMany({
      where: { profesional_id: userId },
      orderBy: { creado_en: 'desc' },
      take: 10,
      select: {
        id: true,
        descripcion: true,
        estado: true,
        creado_en: true,
        cliente: {
          select: {
            nombre: true
          }
        }
      }
    });

    // Formatear actividad para el frontend
    const formattedActivity = recentActivity.map(service => ({
      id: service.id,
      description: `Servicio para ${service.cliente.nombre}: ${service.descripcion}`,
      status: service.estado.toLowerCase(),
      timestamp: service.creado_en.toISOString().split('T')[0] // Solo fecha
    }));

    res.json({ data: formattedActivity });
  } catch (error) {
    console.error('Error obteniendo actividad del profesional:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getClientStats: exports.getClientStats,
  getProfessionalStats: exports.getProfessionalStats,
  getClientActivity: exports.getClientActivity,
  getProfessionalActivity: exports.getProfessionalActivity
};
