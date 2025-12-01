/**
 * @archivo src/services/availabilityReminderService.js - Servicio de recordatorios de disponibilidad
 * @descripción Envía recordatorios automáticos a profesionales para actualizar su disponibilidad
 * @optimización Mejora la visibilidad y respuesta oportuna de profesionales
 */

const { PrismaClient } = require('@prisma/client');
const { createNotification, NOTIFICATION_TYPES } = require('./notificationService');
const { sendPushNotification } = require('./pushNotificationService');
const { sendEmail } = require('./emailService');

const prisma = new PrismaClient();

/**
 * Verifica y envía recordatorios de actualización de disponibilidad
 * Se ejecuta diariamente para profesionales que no han actualizado en 7+ días
 */
async function checkAndSendAvailabilityReminders() {
  try {
    console.log('🔄 Iniciando verificación de recordatorios de disponibilidad...');

    // Calcular fecha límite (7 días atrás)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Buscar profesionales que necesitan recordatorio
    const professionalsNeedingReminder = await prisma.usuarios.findMany({
      where: {
        rol: 'profesional',
        esta_verificado: true,
        OR: [
          // No tienen disponibilidad configurada
          {
            disponibilidad: {
              none: {}
            }
          },
          // Su última actualización de disponibilidad es antigua
          {
            disponibilidad: {
              every: {
                createdAt: {
                  lt: sevenDaysAgo
                }
              }
            }
          }
        ]
      },
      include: {
        perfil_profesional: {
          select: {
            especialidad: true,
            zona_cobertura: true
          }
        },
        disponibilidad: {
          select: {
            id: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    console.log(`📊 Encontrados ${professionalsNeedingReminder.length} profesionales que necesitan recordatorio`);

    let remindersSent = 0;

    for (const professional of professionalsNeedingReminder) {
      try {
        // Verificar si ya se envió un recordatorio en las últimas 24 horas
        const recentReminder = await prisma.notificaciones.findFirst({
          where: {
            usuario_id: professional.id,
            tipo: 'recordatorio_disponibilidad',
            creado_en: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
            }
          }
        });

        if (!recentReminder) {
          await sendAvailabilityReminder(professional);
          remindersSent++;
        }
      } catch (error) {
        console.error(`Error enviando recordatorio a profesional ${professional.id}:`, error);
      }
    }

    console.log(`✅ Enviados ${remindersSent} recordatorios de disponibilidad`);
    return { checked: professionalsNeedingReminder.length, sent: remindersSent };

  } catch (error) {
    console.error('Error en checkAndSendAvailabilityReminders:', error);
    throw error;
  }
}

/**
 * Envía recordatorio de disponibilidad a un profesional específico
 * @param {Object} professional - Datos del profesional
 */
async function sendAvailabilityReminder(professional) {
  const { id: professionalId, nombre, email } = professional;

  try {
    // 1. Notificación push
    try {
      await sendPushNotification(
        professionalId,
        'Actualiza tu disponibilidad 📅',
        'Mantén tu calendario actualizado para recibir más solicitudes de clientes',
        {
          type: 'availability_reminder',
          action: 'update_availability',
          professionalId
        }
      );
    } catch (pushError) {
      console.warn(`Error enviando push notification a ${professionalId}:`, pushError.message);
    }

    // 2. Notificación en base de datos
    await createNotification(
      professionalId,
      'recordatorio_disponibilidad',
      'Es hora de actualizar tu disponibilidad. Los clientes buscan profesionales con horarios actualizados.',
      {
        action: 'update_availability',
        reason: 'disponibilidad_desactualizada'
      }
    );

    // 3. Email de recordatorio
    try {
      const emailSubject = 'Actualiza tu disponibilidad en Changánet';
      const emailBody = `
        Hola ${nombre},

        Hemos notado que tu disponibilidad no ha sido actualizada recientemente.

        Para maximizar tus oportunidades de recibir solicitudes de clientes:

        ✅ Actualiza tus horarios disponibles
        ✅ Revisa tus zonas de cobertura
        ✅ Mantén tu perfil al día

        Los clientes prefieren profesionales con información actualizada.

        Actualiza tu disponibilidad ahora:
        ${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard-profesional/disponibilidad

        ¡Gracias por mantener tu perfil actualizado!

        Equipo Changánet
      `;

      await sendEmail(email, emailSubject, emailBody);
    } catch (emailError) {
      console.warn(`Error enviando email de recordatorio a ${email}:`, emailError.message);
    }

    console.log(`📧 Recordatorio enviado a profesional ${professionalId} (${email})`);

  } catch (error) {
    console.error(`Error enviando recordatorio a profesional ${professionalId}:`, error);
    throw error;
  }
}

/**
 * Envía recordatorio personalizado basado en análisis de actividad
 * @param {string} professionalId - ID del profesional
 * @param {Object} activityData - Datos de actividad del profesional
 */
async function sendPersonalizedAvailabilityReminder(professionalId, activityData) {
  try {
    const professional = await prisma.usuarios.findUnique({
      where: { id: professionalId },
      include: {
        perfil_profesional: {
          select: {
            especialidad: true,
            zona_cobertura: true
          }
        }
      }
    });

    if (!professional) {
      throw new Error('Profesional no encontrado');
    }

    let message = 'Actualiza tu disponibilidad para recibir más solicitudes.';
    let reason = 'disponibilidad_desactualizada';

    // Personalizar mensaje basado en actividad
    if (activityData.quotesReceived > 0 && activityData.quotesAccepted === 0) {
      message = `Has recibido ${activityData.quotesReceived} cotizaciones esta semana. Actualiza tu disponibilidad para convertirlas en servicios.`;
      reason = 'cotizaciones_pendientes';
    } else if (activityData.lastServiceDays > 14) {
      message = `Hace ${activityData.lastServiceDays} días que realizaste tu último servicio. Actualiza tu disponibilidad para volver a recibir solicitudes.`;
      reason = 'inactividad_reciente';
    } else if (activityData.competitorActivity > 1.5) {
      message = `La actividad en tu zona ha aumentado un ${Math.round((activityData.competitorActivity - 1) * 100)}%. Actualiza tu disponibilidad para no perder oportunidades.`;
      reason = 'aumento_competencia';
    }

    await sendAvailabilityReminder({
      ...professional,
      customMessage: message,
      customReason: reason
    });

  } catch (error) {
    console.error(`Error enviando recordatorio personalizado a ${professionalId}:`, error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de disponibilidad para análisis
 * @returns {Object} Estadísticas de disponibilidad
 */
async function getAvailabilityStats() {
  try {
    const totalProfessionals = await prisma.usuarios.count({
      where: { rol: 'profesional', esta_verificado: true }
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const professionalsWithRecentAvailability = await prisma.usuarios.count({
      where: {
        rol: 'profesional',
        esta_verificado: true,
        disponibilidad: {
          some: {
            createdAt: {
              gte: sevenDaysAgo
            }
          }
        }
      }
    });

    const professionalsWithoutAvailability = await prisma.usuarios.count({
      where: {
        rol: 'profesional',
        esta_verificado: true,
        disponibilidad: {
          none: {}
        }
      }
    });

    return {
      totalProfessionals,
      withRecentAvailability: professionalsWithRecentAvailability,
      withoutAvailability: professionalsWithoutAvailability,
      coverageRate: totalProfessionals > 0 ? (professionalsWithRecentAvailability / totalProfessionals) * 100 : 0,
      needsReminder: totalProfessionals - professionalsWithRecentAvailability
    };

  } catch (error) {
    console.error('Error obteniendo estadísticas de disponibilidad:', error);
    throw error;
  }
}

/**
 * Programa recordatorios automáticos (se ejecuta diariamente)
 */
async function scheduleAutomaticReminders() {
  try {
    // Ejecutar verificación diaria a las 9:00 AM
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(9, 0, 0, 0);

    // Si ya pasaron las 9:00, programar para mañana
    if (now.getHours() >= 9) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const timeUntilNextRun = nextRun.getTime() - now.getTime();

    setTimeout(async () => {
      await checkAndSendAvailabilityReminders();

      // Programar siguiente ejecución (cada 24 horas)
      setInterval(checkAndSendAvailabilityReminders, 24 * 60 * 60 * 1000);
    }, timeUntilNextRun);

    console.log(`⏰ Recordatorios automáticos programados para ${nextRun.toLocaleString()}`);

  } catch (error) {
    console.error('Error programando recordatorios automáticos:', error);
  }
}

module.exports = {
  checkAndSendAvailabilityReminders,
  sendAvailabilityReminder,
  sendPersonalizedAvailabilityReminder,
  getAvailabilityStats,
  scheduleAutomaticReminders
};
