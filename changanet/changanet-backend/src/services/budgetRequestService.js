/**
 * @archivo src/services/budgetRequestService.js - Servicio de Solicitudes de Presupuesto
 * @descripción Gestiona lógica de negocio para solicitudes de presupuesto, incluyendo expiración automática
 * @sprint Sprint de Solicitudes de Presupuestos
 * @tarjeta Implementar backend completo para módulo de Solicitudes de Presupuestos
 * @impacto Económico: Sistema robusto de gestión de solicitudes con expiración automática
 */

const { PrismaClient } = require('@prisma/client');
const { createNotification } = require('./notificationService');

const prisma = new PrismaClient();

// Configuración de expiración
const EXPIRATION_DAYS = 7; // 7 días para expirar
const EXPIRATION_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // Revisar cada 24 horas

/**
 * @función checkAndExpireBudgetRequests - Verificar y expirar solicitudes antiguas
 * @descripción Revisa solicitudes de presupuesto expiradas y las marca como expiradas
 * @sprint Sprint de Solicitudes de Presupuestos
 * @tarjeta Implementar backend completo para módulo de Solicitudes de Presupuestos
 * @impacto Social: Mantiene el sistema limpio y actualizado
 */
async function checkAndExpireBudgetRequests() {
  try {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - EXPIRATION_DAYS);

    console.log(`🔍 Checking for expired budget requests before ${expirationDate.toISOString()}`);

    // Encontrar respuestas pendientes de solicitudes expiradas
    const expiredResponses = await prisma.cotizacion_respuestas.findMany({
      where: {
        estado: 'PENDIENTE',
        cotizacion: {
          creado_en: {
            lt: expirationDate
          }
        }
      },
      include: {
        cotizacion: {
          include: {
            cliente: { select: { id: true, nombre: true, email: true } }
          }
        },
        profesional: { select: { id: true, nombre: true, email: true } }
      }
    });

    if (expiredResponses.length === 0) {
      console.log('✅ No expired budget requests found');
      return;
    }

    console.log(`📋 Found ${expiredResponses.length} expired budget request responses`);

    // Marcar respuestas como expiradas
    const expiredResponseIds = expiredResponses.map(r => r.id);

    await prisma.cotizacion_respuestas.updateMany({
      where: {
        id: { in: expiredResponseIds }
      },
      data: {
        estado: 'EXPIRADO',
        comentario: 'Solicitud expirada automáticamente'
      }
    });

    // Notificar a clientes sobre expiración
    const notifiedClients = new Set();

    for (const response of expiredResponses) {
      const clientId = response.cotizacion.cliente.id;

      if (!notifiedClients.has(clientId)) {
        try {
          await createNotification(
            clientId,
            'solicitud_expirada',
            `Tu solicitud de presupuesto "${response.cotizacion.descripcion.substring(0, 50)}..." ha expirado`,
            { requestId: response.cotizacion.id }
          );

          notifiedClients.add(clientId);
        } catch (notificationError) {
          console.warn(`Error notificando expiración a cliente ${clientId}:`, notificationError.message);
        }
      }
    }

    console.log(`✅ Expired ${expiredResponseIds.length} budget request responses and notified ${notifiedClients.size} clients`);
  } catch (error) {
    console.error('❌ Error checking expired budget requests:', error);
  }
}

/**
 * @función getExpirationDate - Calcular fecha de expiración para una solicitud
 * @descripción Retorna la fecha en que expirará una solicitud
 * @param {Date} createdDate - Fecha de creación de la solicitud
 * @returns {Date} Fecha de expiración
 */
function getExpirationDate(createdDate = new Date()) {
  const expirationDate = new Date(createdDate);
  expirationDate.setDate(expirationDate.getDate() + EXPIRATION_DAYS);
  return expirationDate;
}

/**
 * @función isExpired - Verificar si una solicitud está expirada
 * @descripción Verifica si una solicitud ha pasado su fecha de expiración
 * @param {Date} createdDate - Fecha de creación de la solicitud
 * @returns {boolean} true si está expirada
 */
function isExpired(createdDate) {
  const expirationDate = getExpirationDate(createdDate);
  return new Date() > expirationDate;
}

/**
 * @función startExpirationScheduler - Iniciar programador de expiración automática
 * @descripción Inicia el proceso automático que revisa y expira solicitudes periódicamente
 * @sprint Sprint de Solicitudes de Presupuestos
 * @tarjeta Implementar backend completo para módulo de Solicitudes de Presupuestos
 * @impacto Económico: Mantenimiento automático del sistema
 */
function startExpirationScheduler() {
  // Ejecutar verificación inicial
  setTimeout(() => {
    checkAndExpireBudgetRequests();
  }, 60000); // Esperar 1 minuto para iniciar

  // Programar verificación periódica
  setInterval(checkAndExpireBudgetRequests, EXPIRATION_CHECK_INTERVAL);

  console.log(`⏰ Budget request expiration scheduler started - checking every ${EXPIRATION_CHECK_INTERVAL / (1000 * 60 * 60)} hours`);
}

/**
 * @función getExpirationStats - Obtener estadísticas de expiración
 * @descripción Retorna estadísticas sobre solicitudes expiradas y próximas a expirar
 * @returns {Object} Estadísticas de expiración
 */
async function getExpirationStats() {
  try {
    const now = new Date();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - EXPIRATION_DAYS);

    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() - (EXPIRATION_DAYS - 1)); // 1 día antes

    const [expired, expiringSoon] = await Promise.all([
      prisma.cotizaciones.count({
        where: {
          creado_en: { lt: expirationDate },
          respuestas: {
            some: {
              estado: 'PENDIENTE'
            }
          }
        }
      }),
      prisma.cotizaciones.count({
        where: {
          creado_en: { lt: warningDate, gte: expirationDate },
          respuestas: {
            some: {
              estado: 'PENDIENTE'
            }
          }
        }
      })
    ]);

    return {
      expired,
      expiring_soon: expiringSoon,
      expiration_days: EXPIRATION_DAYS,
      last_check: now.toISOString()
    };
  } catch (error) {
    console.error('Error getting expiration stats:', error);
    return {
      expired: 0,
      expiring_soon: 0,
      error: 'Error al obtener estadísticas'
    };
  }
}

module.exports = {
  checkAndExpireBudgetRequests,
  getExpirationDate,
  isExpired,
  startExpirationScheduler,
  getExpirationStats,
  EXPIRATION_DAYS
};
