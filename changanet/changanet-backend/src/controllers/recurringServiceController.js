/**
 * @archivo src/controllers/recurringServiceController.js - Controlador de servicios recurrentes
 * @descripción Endpoints para gestión de programaciones de servicios recurrentes
 * @optimización Mejora retención de clientes con servicios automáticos
 */

const recurringServiceScheduler = require('../services/recurringServiceScheduler');

/**
 * Crea una nueva programación de servicios recurrentes
 */
async function createRecurringService(req, res) {
  try {
    const { id: userId } = req.user;
    const data = req.body;

    // Validar datos requeridos
    if (!data.profesional_id || !data.descripcion || !data.frecuencia ||
        !data.hora_inicio || !data.duracion_horas || !data.tarifa_base || !data.fecha_inicio) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: profesional_id, descripcion, frecuencia, hora_inicio, duracion_horas, tarifa_base, fecha_inicio'
      });
    }

    // Validar frecuencia
    const validFrequencies = ['semanal', 'quincenal', 'mensual', 'bimestral', 'trimestral'];
    if (!validFrequencies.includes(data.frecuencia)) {
      return res.status(400).json({
        error: 'Frecuencia inválida. Opciones: semanal, quincenal, mensual, bimestral, trimestral'
      });
    }

    // Validar que el usuario sea cliente
    if (req.user.rol !== 'cliente') {
      return res.status(403).json({
        error: 'Solo los clientes pueden crear servicios recurrentes'
      });
    }

    const recurringData = {
      cliente_id: userId,
      profesional_id: data.profesional_id,
      descripcion: data.descripcion,
      frecuencia: data.frecuencia,
      dia_semana: data.dia_semana,
      dia_mes: data.dia_mes,
      hora_inicio: data.hora_inicio,
      duracion_horas: parseFloat(data.duracion_horas),
      tarifa_base: parseFloat(data.tarifa_base),
      descuento_recurrencia: data.descuento_recurrencia ? parseFloat(data.descuento_recurrencia) : 0,
      fecha_inicio: data.fecha_inicio,
      fecha_fin: data.fecha_fin || null
    };

    const recurring = await recurringServiceScheduler.createRecurringService(recurringData);

    res.status(201).json({
      success: true,
      message: 'Servicio recurrente creado exitosamente',
      data: recurring
    });
  } catch (error) {
    console.error('Error creando servicio recurrente:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Obtiene servicios recurrentes del usuario
 */
async function getUserRecurringServices(req, res) {
  try {
    const { id: userId } = req.user;
    const role = req.user.rol;

    const recurringServices = await recurringServiceScheduler.getUserRecurringServices(userId, role);

    res.json({
      success: true,
      data: recurringServices
    });
  } catch (error) {
    console.error('Error obteniendo servicios recurrentes:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Cancela un servicio recurrente
 */
async function cancelRecurringService(req, res) {
  try {
    const { id: userId } = req.user;
    const { recurringId } = req.params;

    await recurringServiceScheduler.cancelRecurringService(recurringId, userId);

    res.json({
      success: true,
      message: 'Servicio recurrente cancelado exitosamente'
    });
  } catch (error) {
    console.error('Error cancelando servicio recurrente:', error);

    if (error.message.includes('permiso') || error.message.includes('encontrada')) {
      return res.status(403).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Actualiza una programación recurrente
 */
async function updateRecurringService(req, res) {
  try {
    const { id: userId } = req.user;
    const { recurringId } = req.params;
    const updates = req.body;

    // Verificar que el usuario tenga acceso
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const recurring = await prisma.servicios_recurrrentes.findUnique({
      where: { id: recurringId }
    });

    if (!recurring) {
      return res.status(404).json({
        error: 'Servicio recurrente no encontrado'
      });
    }

    if (recurring.cliente_id !== userId && recurring.profesional_id !== userId) {
      return res.status(403).json({
        error: 'No tienes permiso para modificar este servicio recurrente'
      });
    }

    // Actualizar
    const updatedRecurring = await prisma.servicios_recurrrentes.update({
      where: { id: recurringId },
      data: {
        ...updates,
        actualizado_en: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Servicio recurrente actualizado exitosamente',
      data: updatedRecurring
    });
  } catch (error) {
    console.error('Error actualizando servicio recurrente:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Obtiene detalles de un servicio recurrente específico
 */
async function getRecurringServiceDetails(req, res) {
  try {
    const { recurringId } = req.params;
    const { id: userId } = req.user;

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const recurring = await prisma.servicios_recurrrentes.findUnique({
      where: { id: recurringId },
      include: {
        cliente: { select: { nombre: true, email: true } },
        profesional: { select: { nombre: true, email: true } },
        servicios_generados: {
          orderBy: { fecha_agendada: 'asc' },
          take: 10 // Últimos 10 servicios
        }
      }
    });

    if (!recurring) {
      return res.status(404).json({
        error: 'Servicio recurrente no encontrado'
      });
    }

    // Verificar acceso
    if (recurring.cliente_id !== userId && recurring.profesional_id !== userId) {
      return res.status(403).json({
        error: 'No tienes acceso a este servicio recurrente'
      });
    }

    res.json({
      success: true,
      data: recurring
    });
  } catch (error) {
    console.error('Error obteniendo detalles del servicio recurrente:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Genera servicios recurrentes manualmente (para testing/admin)
 */
async function generateRecurringServices(req, res) {
  try {
    // Solo administradores pueden ejecutar esto manualmente
    if (req.user.rol !== 'admin') {
      return res.status(403).json({
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      });
    }

    const result = await recurringServiceScheduler.generateRecurringServices();

    res.json({
      success: true,
      message: `Generados ${result.created} servicios recurrentes de ${result.processed} programaciones`,
      data: result
    });
  } catch (error) {
    console.error('Error generando servicios recurrentes:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
}

module.exports = {
  createRecurringService,
  getUserRecurringServices,
  cancelRecurringService,
  updateRecurringService,
  getRecurringServiceDetails,
  generateRecurringServices
};
