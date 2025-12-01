/**
 * @archivo src/services/recurringServiceScheduler.js - Programador de servicios recurrentes
 * @descripción Gestiona la creación automática de servicios basados en programaciones recurrentes
 * @optimización Automatiza la generación de servicios recurrentes para mejorar retención
 */

const { PrismaClient } = require('@prisma/client');
const { createNotification, NOTIFICATION_TYPES, processScheduledNotifications } = require('./notificationService');
const { sendPushNotification } = require('./pushNotificationService');
const { autoReleaseFunds } = require('./paymentsService');

const prisma = new PrismaClient();

/**
 * Genera servicios individuales para programaciones recurrentes activas
 * Se ejecuta diariamente para crear servicios futuros
 */
async function generateRecurringServices() {
  try {
    console.log('🔄 Iniciando generación de servicios recurrentes...');

    const activeRecurringServices = await prisma.servicios_recurrrentes.findMany({
      where: {
        activo: true,
        OR: [
          { fecha_fin: null }, // Sin fecha fin
          { fecha_fin: { gte: new Date() } } // Fecha fin futura
        ]
      },
      include: {
        cliente: { select: { nombre: true, email: true } },
        profesional: { select: { nombre: true, email: true } }
      }
    });

    console.log(`📋 Encontradas ${activeRecurringServices.length} programaciones recurrentes activas`);

    let servicesCreated = 0;

    for (const recurring of activeRecurringServices) {
      try {
        const newServices = await generateServicesForRecurring(recurring);
        servicesCreated += newServices;
      } catch (error) {
        console.error(`Error procesando programación recurrente ${recurring.id}:`, error);
      }
    }

    console.log(`✅ Generados ${servicesCreated} nuevos servicios recurrentes`);
    return { processed: activeRecurringServices.length, created: servicesCreated };

  } catch (error) {
    console.error('Error en generateRecurringServices:', error);
    throw error;
  }
}

/**
 * Genera servicios individuales para una programación recurrente específica
 * @param {Object} recurring - Programación recurrente
 * @returns {number} Número de servicios creados
 */
async function generateServicesForRecurring(recurring) {
  const now = new Date();
  const servicesToCreate = [];
  let servicesCreated = 0;

  // Determinar próximas fechas basadas en frecuencia
  const nextDates = calculateNextServiceDates(recurring, 30); // Próximos 30 días

  for (const serviceDate of nextDates) {
    // Verificar si ya existe un servicio para esta fecha
    const existingService = await prisma.servicios.findFirst({
      where: {
        cliente_id: recurring.cliente_id,
        profesional_id: recurring.profesional_id,
        fecha_agendada: {
          gte: new Date(serviceDate.getFullYear(), serviceDate.getMonth(), serviceDate.getDate()),
          lt: new Date(serviceDate.getFullYear(), serviceDate.getMonth(), serviceDate.getDate() + 1)
        },
        servicio_recurrente_id: recurring.id
      }
    });

    if (!existingService) {
      servicesToCreate.push({
        cliente_id: recurring.cliente_id,
        profesional_id: recurring.profesional_id,
        descripcion: `${recurring.descripcion} - Servicio recurrente`,
        estado: 'PENDIENTE',
        fecha_agendada: serviceDate,
        servicio_recurrente_id: recurring.id
      });
    }
  }

  // Crear servicios en lote
  if (servicesToCreate.length > 0) {
    await prisma.servicios.createMany({
      data: servicesToCreate
    });

    servicesCreated = servicesToCreate.length;

    // Notificar al cliente sobre nuevos servicios programados
    if (servicesCreated > 0) {
      await notifyNewRecurringServices(recurring, servicesCreated);
    }
  }

  return servicesCreated;
}

/**
 * Calcula las próximas fechas de servicio basadas en la frecuencia
 * @param {Object} recurring - Programación recurrente
 * @param {number} daysAhead - Días hacia adelante para generar
 * @returns {Array} Fechas de servicios
 */
function calculateNextServiceDates(recurring, daysAhead = 30) {
  const dates = [];
  const startDate = new Date(Math.max(recurring.fecha_inicio, new Date()));
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysAhead);

  let currentDate = new Date(startDate);

  while (currentDate <= endDate && (!recurring.fecha_fin || currentDate <= recurring.fecha_fin)) {
    // Verificar si la fecha cumple con la frecuencia
    if (matchesFrequency(currentDate, recurring)) {
      // Crear fecha completa con hora de inicio
      const serviceDate = new Date(currentDate);
      const [hours, minutes] = recurring.hora_inicio.split(':');
      serviceDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      dates.push(serviceDate);
    }

    // Avanzar según frecuencia
    switch (recurring.frecuencia) {
      case 'semanal':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'quincenal':
        currentDate.setDate(currentDate.getDate() + 14);
        break;
      case 'mensual':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'bimestral':
        currentDate.setMonth(currentDate.getMonth() + 2);
        break;
      case 'trimestral':
        currentDate.setMonth(currentDate.getMonth() + 3);
        break;
      default:
        currentDate.setDate(currentDate.getDate() + 7); // Default semanal
    }
  }

  return dates;
}

/**
 * Verifica si una fecha cumple con la frecuencia especificada
 * @param {Date} date - Fecha a verificar
 * @param {Object} recurring - Programación recurrente
 * @returns {boolean} Si cumple con la frecuencia
 */
function matchesFrequency(date, recurring) {
  switch (recurring.frecuencia) {
    case 'semanal':
      return recurring.dia_semana !== null ? date.getDay() === recurring.dia_semana : true;
    case 'mensual':
      return recurring.dia_mes !== null ? date.getDate() === recurring.dia_mes : true;
    default:
      return true; // Para otras frecuencias, cualquier fecha válida
  }
}

/**
 * Notifica al cliente sobre nuevos servicios recurrentes programados
 * @param {Object} recurring - Programación recurrente
 * @param {number} count - Número de servicios creados
 */
async function notifyNewRecurringServices(recurring, count) {
  try {
    // Notificación push al cliente
    await sendPushNotification(
      recurring.cliente_id,
      'Servicios recurrentes programados',
      `Se han programado ${count} nuevos servicios para "${recurring.descripcion}"`,
      {
        type: 'recurring_services_scheduled',
        recurringId: recurring.id,
        count: count
      }
    );

    // Notificación en base de datos
    await createNotification(
      recurring.cliente_id,
      'servicios_recurrrentes_programados',
      `Se han programado ${count} nuevos servicios recurrentes para "${recurring.descripcion}"`,
      {
        recurringId: recurring.id,
        count: count
      }
    );

    // Notificación push al profesional
    await sendPushNotification(
      recurring.profesional_id,
      'Nuevos servicios recurrentes',
      `Se han programado ${count} nuevos servicios recurrentes para "${recurring.descripcion}"`,
      {
        type: 'recurring_services_assigned',
        recurringId: recurring.id,
        count: count
      }
    );

  } catch (error) {
    console.error('Error notificando servicios recurrentes:', error);
  }
}

/**
 * Crea una nueva programación de servicios recurrentes
 * @param {Object} data - Datos de la programación
 * @returns {Object} Programación creada
 */
async function createRecurringService(data) {
  try {
    const recurring = await prisma.servicios_recurrrentes.create({
      data: {
        cliente_id: data.cliente_id,
        profesional_id: data.profesional_id,
        descripcion: data.descripcion,
        frecuencia: data.frecuencia,
        dia_semana: data.dia_semana,
        dia_mes: data.dia_mes,
        hora_inicio: data.hora_inicio,
        duracion_horas: data.duracion_horas,
        tarifa_base: data.tarifa_base,
        descuento_recurrencia: data.descuento_recurrencia || 0,
        fecha_inicio: new Date(data.fecha_inicio),
        fecha_fin: data.fecha_fin ? new Date(data.fecha_fin) : null,
        activo: true
      }
    });

    // Generar primeros servicios
    await generateServicesForRecurring(recurring);

    return recurring;
  } catch (error) {
    console.error('Error creando servicio recurrente:', error);
    throw error;
  }
}

/**
 * Cancela una programación recurrente
 * @param {string} recurringId - ID de la programación
 * @param {string} userId - ID del usuario que cancela
 */
async function cancelRecurringService(recurringId, userId) {
  try {
    const recurring = await prisma.servicios_recurrrentes.findUnique({
      where: { id: recurringId }
    });

    if (!recurring) {
      throw new Error('Programación recurrente no encontrada');
    }

    if (recurring.cliente_id !== userId && recurring.profesional_id !== userId) {
      throw new Error('No tienes permiso para cancelar esta programación');
    }

    // Marcar como inactiva
    await prisma.servicios_recurrrentes.update({
      where: { id: recurringId },
      data: {
        activo: false,
        actualizado_en: new Date()
      }
    });

    // Cancelar servicios futuros no completados
    await prisma.servicios.updateMany({
      where: {
        servicio_recurrente_id: recurringId,
        estado: { in: ['PENDIENTE', 'AGENDADO'] },
        fecha_agendada: { gt: new Date() }
      },
      data: {
        estado: 'CANCELADO'
      }
    });

    // Notificar a ambas partes
    await notifyRecurringServiceCancelled(recurring, userId);

  } catch (error) {
    console.error('Error cancelando servicio recurrente:', error);
    throw error;
  }
}

/**
 * Notifica la cancelación de un servicio recurrente
 * @param {Object} recurring - Programación cancelada
 * @param {string} cancelledBy - Usuario que canceló
 */
async function notifyRecurringServiceCancelled(recurring, cancelledBy) {
  const clientId = recurring.cliente_id;
  const professionalId = recurring.profesional_id;

  const cancellerName = cancelledBy === clientId ? 'cliente' : 'profesional';
  const message = `El servicio recurrente "${recurring.descripcion}" ha sido cancelado por el ${cancellerName}`;

  // Notificar al cliente
  if (cancelledBy !== clientId) {
    await createNotification(clientId, 'servicio_recurrente_cancelado', message);
  }

  // Notificar al profesional
  if (cancelledBy !== professionalId) {
    await createNotification(professionalId, 'servicio_recurrente_cancelado', message);
  }
}

/**
 * Obtiene servicios recurrentes de un usuario
 * @param {string} userId - ID del usuario
 * @param {string} role - Rol del usuario ('cliente' o 'profesional')
 * @returns {Array} Servicios recurrentes
 */
async function getUserRecurringServices(userId, role) {
  try {
    const whereClause = role === 'cliente'
      ? { cliente_id: userId }
      : { profesional_id: userId };

    const recurringServices = await prisma.servicios_recurrrentes.findMany({
      where: whereClause,
      include: {
        cliente: { select: { nombre: true, email: true } },
        profesional: { select: { nombre: true, email: true } },
        servicios_generados: {
          where: {
            fecha_agendada: { gte: new Date() }
          },
          orderBy: { fecha_agendada: 'asc' },
          take: 5 // Próximos 5 servicios
        }
      },
      orderBy: { creado_en: 'desc' }
    });

    return recurringServices;
  } catch (error) {
    console.error('Error obteniendo servicios recurrentes:', error);
    throw error;
  }
}

/**
 * Libera automáticamente fondos de pagos completados después de 24h (RB-04)
 * Se ejecuta cada hora para procesar liberaciones pendientes
 */
async function processAutomaticFundReleases() {
  try {
    console.log('💰 Procesando liberaciones automáticas de fondos...');

    const result = await autoReleaseFunds();

    if (result.processed > 0) {
      console.log(`✅ Procesadas ${result.processed} liberaciones automáticas de fondos`);
    }

    return result;
  } catch (error) {
    console.error('Error en liberación automática de fondos:', error);
    throw error;
  }
}

/**
 * Programa la ejecución automática del generador de servicios recurrentes, liberaciones de fondos y notificaciones
 */
async function scheduleRecurringServiceGeneration() {
  try {
    // Ejecutar diariamente a las 2:00 AM
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(2, 0, 0, 0);

    if (now.getHours() >= 2) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const timeUntilNextRun = nextRun.getTime() - now.getTime();

    setTimeout(async () => {
      await generateRecurringServices();

      // Programar siguiente ejecución (cada 24 horas)
      setInterval(generateRecurringServices, 24 * 60 * 60 * 1000);
    }, timeUntilNextRun);

    console.log(`⏰ Generación de servicios recurrentes programada para ${nextRun.toLocaleString()}`);

  } catch (error) {
    console.error('Error programando generación automática:', error);
  }
}

/**
 * Programa el procesamiento de notificaciones programadas cada hora
 */
async function scheduleNotificationProcessing() {
  try {
    // Ejecutar cada hora
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(nextRun.getHours() + 1, 0, 0, 0); // Próxima hora en punto

    const timeUntilNextRun = nextRun.getTime() - now.getTime();

    setTimeout(async () => {
      await processScheduledNotifications();

      // Programar siguiente ejecución (cada hora)
      setInterval(processScheduledNotifications, 60 * 60 * 1000); // Cada hora
    }, timeUntilNextRun);

    console.log(`🔔 Procesamiento de notificaciones programadas para ${nextRun.toLocaleString()}`);

  } catch (error) {
    console.error('Error programando procesamiento de notificaciones:', error);
  }
}

/**
 * Programa la liberación automática de fondos cada hora
 */
async function scheduleAutomaticFundReleases() {
  try {
    // Ejecutar cada hora
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(nextRun.getHours() + 1, 0, 0, 0); // Próxima hora en punto

    const timeUntilNextRun = nextRun.getTime() - now.getTime();

    setTimeout(async () => {
      await processAutomaticFundReleases();

      // Programar siguiente ejecución (cada hora)
      setInterval(processAutomaticFundReleases, 60 * 60 * 1000); // Cada hora
    }, timeUntilNextRun);

    console.log(`⏰ Liberación automática de fondos programada para ${nextRun.toLocaleString()}`);

  } catch (error) {
    console.error('Error programando liberación automática de fondos:', error);
  }
}

module.exports = {
  generateRecurringServices,
  createRecurringService,
  cancelRecurringService,
  getUserRecurringServices,
  scheduleRecurringServiceGeneration,
  processAutomaticFundReleases,
  scheduleAutomaticFundReleases,
  scheduleNotificationProcessing
};
