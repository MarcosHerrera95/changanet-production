/**
 * @archivo src/services/calendarSyncService.js - Servicio de sincronización de calendarios
 * @descripción Gestiona la sincronización bidireccional con Google Calendar e iCal
 * @sprint Sprint de Integraciones Avanzadas
 * @tarjeta Implementar sincronización de calendarios
 * @impacto Mejora la integración con herramientas externas de calendario
 */

const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const ical = require('ical-generator');
const fs = require('fs').promises;
const path = require('path');
const { createNotification } = require('./notificationService');

const prisma = new PrismaClient();

/**
 * Logger para operaciones de sincronización
 */
class CalendarSyncLogger {
  async logSyncOperation(userId, connectionId, operation, status, message, data = {}) {
    try {
      await prisma.calendar_sync_logs.create({
        data: {
          user_id: userId,
          connection_id: connectionId,
          operation,
          status,
          message,
          local_event_id: data.localEventId,
          remote_event_id: data.remoteEventId,
          conflict_type: data.conflictType,
          conflict_data: data.conflictData ? JSON.stringify(data.conflictData) : null
        }
      });

      console.log(`📅 [${operation.toUpperCase()}] ${status}: ${message}`);
    } catch (error) {
      console.error('Error logging sync operation:', error);
    }
  }

  async logConflict(userId, connectionId, conflictType, conflictData, localEventId, remoteEventId) {
    await this.logSyncOperation(userId, connectionId, 'conflict', 'detected', `Conflicto detectado: ${conflictType}`, {
      conflictType,
      conflictData,
      localEventId,
      remoteEventId
    });
  }

  async logResolution(userId, connectionId, resolution, resolvedData) {
    await this.logSyncOperation(userId, connectionId, 'resolution', 'completed', `Conflicto resuelto: ${resolution}`, resolvedData);
  }
}

const syncLogger = new CalendarSyncLogger();

/**
 * Validar configuración de Google Calendar
 */
function validateGoogleConfig() {
  const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI'
  ];

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(`Variables de entorno faltantes para Google Calendar: ${missing.join(', ')}`);
  }
}

/**
 * Validar que el usuario puede conectar calendarios
 */
async function validateUserForCalendarConnection(userId) {
  const user = await prisma.usuarios.findUnique({
    where: { id: userId },
    select: { id: true, rol: true, esta_verificado: true }
  });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  if (user.rol !== 'profesional') {
    throw new Error('Solo los profesionales pueden conectar calendarios externos');
  }

  if (!user.esta_verificado) {
    throw new Error('El usuario debe estar verificado para conectar calendarios externos');
  }

  return user;
}

/**
 * Validar que no existe una conexión activa del mismo tipo
 */
async function validateNoExistingConnection(userId, calendarType) {
  const existingConnection = await prisma.calendar_connections.findFirst({
    where: {
      user_id: userId,
      calendar_type: calendarType,
      is_active: true
    }
  });

  if (existingConnection) {
    throw new Error(`Ya existe una conexión activa de ${calendarType} para este usuario`);
  }
}

/**
 * Verificar conflictos entre eventos de Google Calendar y citas existentes
 */
async function checkCalendarConflicts(userId, googleEvent) {
  try {
    const eventStart = new Date(googleEvent.start.dateTime || googleEvent.start.date);
    const eventEnd = new Date(googleEvent.end.dateTime || googleEvent.end.date);

    // Buscar citas que se solapen con el evento de Google
    const conflictingAppointments = await prisma.appointments.findMany({
      where: {
        professional_id: userId,
        status: { in: ['scheduled', 'confirmed'] },
        OR: [
          // Caso 1: La cita comienza durante el evento de Google
          {
            scheduled_start: {
              gte: eventStart,
              lt: eventEnd
            }
          },
          // Caso 2: La cita termina durante el evento de Google
          {
            scheduled_end: {
              gt: eventStart,
              lte: eventEnd
            }
          },
          // Caso 3: La cita envuelve completamente al evento de Google
          {
            scheduled_start: { lte: eventStart },
            scheduled_end: { gte: eventEnd }
          }
        ]
      },
      include: {
        client: { select: { nombre: true } }
      }
    });

    return {
      hasConflict: conflictingAppointments.length > 0,
      conflictingAppointments
    };

  } catch (error) {
    console.error('Error checking calendar conflicts:', error);
    return { hasConflict: false, conflictingAppointments: [] };
  }
}

/**
 * Configuración de OAuth 2.0 para Google Calendar
 */
const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3003/api/sync/calendar/google/callback'
};

/**
 * Estados de sincronización
 */
const SYNC_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CONFLICT: 'conflict'
};

/**
 * Tipos de calendario soportados
 */
const CALENDAR_TYPES = {
  GOOGLE: 'google',
  ICAL: 'ical'
};

/**
 * Conectar calendario de Google para un usuario
 * @param {string} userId - ID del usuario
 * @param {string} authCode - Código de autorización de Google
 */
async function connectGoogleCalendar(userId, authCode) {
  try {
    // Validar configuración de Google
    validateGoogleConfig();

    // Validar usuario
    const user = await validateUserForCalendarConnection(userId);

    // Validar que no existe conexión activa
    await validateNoExistingConnection(userId, CALENDAR_TYPES.GOOGLE);

    // Validar código de autorización
    if (!authCode || typeof authCode !== 'string') {
      throw new Error('Código de autorización inválido');
    }

    // Crear cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_OAUTH_CONFIG.clientId,
      GOOGLE_OAUTH_CONFIG.clientSecret,
      GOOGLE_OAUTH_CONFIG.redirectUri
    );

    // Intercambiar código por tokens
    const { tokens } = await oauth2Client.getToken(authCode);
    oauth2Client.setCredentials(tokens);

    // Obtener información del calendario principal
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarList = await calendar.calendarList.list();
    const primaryCalendar = calendarList.data.items.find(cal => cal.primary);

    if (!primaryCalendar) {
      throw new Error('No se pudo encontrar el calendario principal');
    }

    // Guardar tokens en base de datos (encriptados en producción)
    await prisma.calendar_connections.create({
      data: {
        user_id: userId,
        calendar_type: CALENDAR_TYPES.GOOGLE,
        calendar_id: primaryCalendar.id,
        calendar_name: primaryCalendar.summary,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(tokens.expiry_date),
        is_active: true,
        last_sync_at: new Date(),
        sync_status: SYNC_STATUS.COMPLETED
      }
    });

    console.log(`📅 Calendario de Google conectado para usuario ${userId}: ${primaryCalendar.summary}`);

    // Iniciar sincronización inicial
    await syncGoogleCalendar(userId);

    return {
      success: true,
      calendarId: primaryCalendar.id,
      calendarName: primaryCalendar.summary
    };

  } catch (error) {
    console.error('Error conectando calendario de Google:', error);
    throw error;
  }
}

/**
 * Sincronizar calendario de Google para un usuario
 * @param {string} userId - ID del usuario
 */
async function syncGoogleCalendar(userId) {
  try {
    // Obtener conexión de calendario
    const connection = await prisma.calendar_connections.findFirst({
      where: {
        user_id: userId,
        calendar_type: CALENDAR_TYPES.GOOGLE,
        is_active: true
      }
    });

    if (!connection) {
      throw new Error('No hay conexión activa de Google Calendar');
    }

    // Actualizar estado de sincronización
    await prisma.calendar_connections.update({
      where: { id: connection.id },
      data: { sync_status: SYNC_STATUS.IN_PROGRESS }
    });

    // Crear cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_OAUTH_CONFIG.clientId,
      GOOGLE_OAUTH_CONFIG.clientSecret,
      GOOGLE_OAUTH_CONFIG.redirectUri
    );

    // Verificar y refrescar token si es necesario
    if (new Date() >= connection.token_expires_at) {
      oauth2Client.setCredentials({
        refresh_token: connection.refresh_token
      });
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);

      // Actualizar tokens en BD
      await prisma.calendar_connections.update({
        where: { id: connection.id },
        data: {
          access_token: credentials.access_token,
          token_expires_at: new Date(credentials.expiry_date)
        }
      });
    } else {
      oauth2Client.setCredentials({
        access_token: connection.access_token,
        refresh_token: connection.refresh_token
      });
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 1. PUSH: Enviar eventos locales a Google Calendar
    await syncLogger.logSyncOperation(userId, connection.id, 'sync', 'in_progress', 'Iniciando push de eventos locales');
    await pushAppointmentsToGoogleCalendar(userId, calendar, connection.calendar_id, connection.id);

    // 2. PULL: Obtener eventos externos y crear blocked slots
    await syncLogger.logSyncOperation(userId, connection.id, 'sync', 'in_progress', 'Iniciando pull de eventos externos');
    await pullGoogleCalendarEvents(userId, calendar, connection.calendar_id, connection.id);

    // Actualizar estado de sincronización
    await prisma.calendar_connections.update({
      where: { id: connection.id },
      data: {
        sync_status: SYNC_STATUS.COMPLETED,
        last_sync_at: new Date()
      }
    });

    console.log(`✅ Sincronización completada para usuario ${userId}`);

  } catch (error) {
    console.error('Error sincronizando Google Calendar:', error);

    // Actualizar estado de error
    await prisma.calendar_connections.updateMany({
      where: { user_id: userId, calendar_type: CALENDAR_TYPES.GOOGLE },
      data: { sync_status: SYNC_STATUS.FAILED }
    });

    throw error;
  }
}

/**
 * Enviar citas locales a Google Calendar
 */
async function pushAppointmentsToGoogleCalendar(userId, calendarClient, calendarId, connectionId) {
  try {
    // Obtener citas futuras sin ID de Google Calendar
    const appointments = await prisma.appointments.findMany({
      where: {
        professional_id: userId,
        scheduled_start: { gte: new Date() },
        status: { in: ['scheduled', 'confirmed'] },
        google_event_id: null // Solo citas no sincronizadas
      },
      include: {
        client: { select: { nombre: true } }
      }
    });

    await syncLogger.logSyncOperation(userId, connectionId, 'push', 'started', `Iniciando push de ${appointments.length} citas`);

    for (const appointment of appointments) {
      try {
        // Crear evento en Google Calendar
        const event = {
          summary: `Cita con ${appointment.client.nombre}`,
          description: appointment.description || `Cita agendada en Changánet\nCliente: ${appointment.client.nombre}`,
          start: {
            dateTime: appointment.scheduled_start.toISOString(),
            timeZone: appointment.timezone
          },
          end: {
            dateTime: appointment.scheduled_end.toISOString(),
            timeZone: appointment.timezone
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 30 },
              { method: 'email', minutes: 60 }
            ]
          }
        };

        const response = await calendarClient.events.insert({
          calendarId: calendarId,
          resource: event
        });

        // Actualizar cita con ID del evento de Google
        await prisma.appointments.update({
          where: { id: appointment.id },
          data: { google_event_id: response.data.id }
        });

        await syncLogger.logSyncOperation(userId, connectionId, 'push', 'success', `Evento creado para cita ${appointment.id}`, {
          localEventId: appointment.id,
          remoteEventId: response.data.id
        });

      } catch (eventError) {
        await syncLogger.logSyncOperation(userId, connectionId, 'push', 'error', `Error creando evento para cita ${appointment.id}: ${eventError.message}`, {
          localEventId: appointment.id
        });
        console.error(`Error creando evento para cita ${appointment.id}:`, eventError);
      }
    }

    await syncLogger.logSyncOperation(userId, connectionId, 'push', 'completed', `Push completado: ${appointments.length} citas procesadas`);

  } catch (error) {
    await syncLogger.logSyncOperation(userId, connectionId, 'push', 'error', `Error general en push: ${error.message}`);
    console.error('Error en pushAppointmentsToGoogleCalendar:', error);
  }
}

/**
 * Obtener eventos de Google Calendar y crear blocked slots
 */
async function pullGoogleCalendarEvents(userId, calendarClient, calendarId, connectionId) {
  try {
    // Obtener eventos de los próximos 90 días
    const now = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const response = await calendarClient.events.list({
      calendarId: calendarId,
      timeMin: now.toISOString(),
      timeMax: ninetyDaysFromNow.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items;
    await syncLogger.logSyncOperation(userId, connectionId, 'pull', 'started', `Procesando ${events.length} eventos de Google Calendar`);

    let processedEvents = 0;
    let conflictsDetected = 0;

    for (const event of events) {
      try {
        // Verificar si ya existe un blocked slot para este evento
        const existingBlock = await prisma.blocked_slots.findFirst({
          where: {
            professional_id: userId,
            title: `Google Calendar: ${event.summary}`,
            start_time: new Date(event.start.dateTime || event.start.date),
            end_time: new Date(event.end.dateTime || event.end.date)
          }
        });

        if (!existingBlock) {
          // Verificar conflictos con citas existentes
          const conflictCheck = await checkCalendarConflicts(userId, event);
          if (conflictCheck.hasConflict) {
            await syncLogger.logConflict(userId, connectionId, 'time_overlap', {
              googleEvent: event,
              conflictingAppointments: conflictCheck.conflictingAppointments
            }, null, event.id);
            conflictsDetected++;
            continue; // Saltar creación de blocked slot por conflicto
          }

          // Crear blocked slot
          await prisma.blocked_slots.create({
            data: {
              professional_id: userId,
              title: `Google Calendar: ${event.summary}`,
              reason: 'external_calendar_event',
              description: event.description || 'Evento sincronizado desde Google Calendar',
              start_time: new Date(event.start.dateTime || event.start.date),
              end_time: new Date(event.end.dateTime || event.end.date),
              timezone: event.start.timeZone || 'America/Buenos_Aires',
              is_active: true,
              created_by: userId,
              meta: JSON.stringify({
                google_event_id: event.id,
                source: 'google_calendar_sync'
              })
            }
          });

          await syncLogger.logSyncOperation(userId, connectionId, 'pull', 'success', `Blocked slot creado para evento: ${event.summary}`, {
            remoteEventId: event.id
          });

          processedEvents++;
        }

      } catch (blockError) {
        await syncLogger.logSyncOperation(userId, connectionId, 'pull', 'error', `Error procesando evento ${event.id}: ${blockError.message}`, {
          remoteEventId: event.id
        });
        console.error(`Error creando blocked slot para evento ${event.id}:`, blockError);
      }
    }

    await syncLogger.logSyncOperation(userId, connectionId, 'pull', 'completed',
      `Pull completado: ${processedEvents} eventos procesados, ${conflictsDetected} conflictos detectados`);

  } catch (error) {
    await syncLogger.logSyncOperation(userId, connectionId, 'pull', 'error', `Error general en pull: ${error.message}`);
    console.error('Error en pullGoogleCalendarEvents:', error);
  }
}

/**
 * Generar archivo iCal con disponibilidad
 * @param {string} userId - ID del usuario
 * @param {Date} startDate - Fecha de inicio
 * @param {Date} endDate - Fecha de fin
 */
async function generateICalFeed(userId, startDate, endDate) {
  try {
    // Obtener slots disponibles del profesional
    const availableSlots = await prisma.availability_slots.findMany({
      where: {
        professional_id: userId,
        start_time: {
          gte: startDate,
          lte: endDate
        },
        status: 'available'
      },
      include: {
        professional: { select: { nombre: true, especialidad: true } }
      }
    });

    // Crear calendario iCal
    const cal = ical({
      domain: 'changánet.com',
      prodId: { company: 'Changánet', product: 'Availability Calendar' },
      name: `Disponibilidad - ${availableSlots[0]?.professional.nombre || 'Profesional'}`,
      timezone: 'America/Buenos_Aires'
    });

    // Agregar eventos de disponibilidad
    for (const slot of availableSlots) {
      cal.createEvent({
        start: slot.start_time,
        end: slot.end_time,
        summary: 'Horario disponible',
        description: `Horario disponible para servicios en Changánet\nProfesional: ${slot.professional.nombre}\nEspecialidad: ${slot.professional.especialidad}`,
        location: 'Changánet Platform',
        url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/book/${userId}?slot=${slot.id}`,
        organizer: {
          name: slot.professional.nombre,
          email: 'no-reply@changánet.com'
        }
      });
    }

    return cal.toString();

  } catch (error) {
    console.error('Error generando feed iCal:', error);
    throw error;
  }
}

/**
 * Desconectar calendario
 * @param {string} userId - ID del usuario
 * @param {string} calendarType - Tipo de calendario
 */
async function disconnectCalendar(userId, calendarType) {
  try {
    await prisma.calendar_connections.updateMany({
      where: {
        user_id: userId,
        calendar_type: calendarType
      },
      data: {
        is_active: false,
        sync_status: SYNC_STATUS.FAILED
      }
    });

    console.log(`📅 Calendario ${calendarType} desconectado para usuario ${userId}`);

  } catch (error) {
    console.error('Error desconectando calendario:', error);
    throw error;
  }
}

/**
 * Obtener estado de conexiones de calendario
 * @param {string} userId - ID del usuario
 */
async function getCalendarConnections(userId) {
  try {
    const connections = await prisma.calendar_connections.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });

    return connections.map(conn => ({
      id: conn.id,
      type: conn.calendar_type,
      name: conn.calendar_name,
      isActive: conn.is_active,
      lastSync: conn.last_sync_at,
      status: conn.sync_status
    }));

  } catch (error) {
    console.error('Error obteniendo conexiones de calendario:', error);
    throw error;
  }
}

/**
 * Resolver conflictos de sincronización
 * @param {string} userId - ID del usuario
 * @param {Array} conflicts - Lista de conflictos
 */
async function resolveSyncConflicts(userId, conflicts) {
  try {
    for (const conflict of conflicts) {
      const logEntry = await prisma.calendar_sync_logs.findUnique({
        where: { id: conflict.id }
      });

      if (!logEntry || logEntry.user_id !== userId) {
        throw new Error(`Conflicto ${conflict.id} no encontrado o no pertenece al usuario`);
      }

      if (conflict.resolution === 'keep_local') {
        // Mantener evento local, crear blocked slot ignorando el conflicto
        if (logEntry.conflict_data) {
          const conflictData = JSON.parse(logEntry.conflict_data);
          const googleEvent = conflictData.googleEvent;

          // Crear blocked slot a pesar del conflicto
          await prisma.blocked_slots.create({
            data: {
              professional_id: userId,
              title: `Google Calendar: ${googleEvent.summary} (Conflicto resuelto: mantener local)`,
              reason: 'external_calendar_event',
              description: `Evento sincronizado desde Google Calendar\nResolución: Mantener eventos locales\n${googleEvent.description || ''}`,
              start_time: new Date(googleEvent.start.dateTime || googleEvent.start.date),
              end_time: new Date(googleEvent.end.dateTime || googleEvent.end.date),
              timezone: googleEvent.start.timeZone || 'America/Buenos_Aires',
              is_active: true,
              created_by: userId,
              meta: JSON.stringify({
                google_event_id: googleEvent.id,
                source: 'google_calendar_sync',
                conflict_resolution: 'keep_local',
                resolved_at: new Date().toISOString()
              })
            }
          });

          await syncLogger.logResolution(userId, logEntry.connection_id, 'keep_local', {
            conflictId: conflict.id,
            googleEventId: googleEvent.id
          });

        }
      } else if (conflict.resolution === 'keep_remote') {
        // Cancelar citas locales que entran en conflicto
        if (logEntry.conflict_data) {
          const conflictData = JSON.parse(logEntry.conflict_data);
          const conflictingAppointments = conflictData.conflictingAppointments || [];

          for (const appointment of conflictingAppointments) {
            await prisma.appointments.update({
              where: { id: appointment.id },
              data: {
                status: 'cancelled',
                cancelled_at: new Date(),
                cancelled_by: userId,
                cancel_reason: 'Conflicto con calendario externo - resolución automática'
              }
            });

            // Notificar al cliente sobre la cancelación
            await createNotification(
              appointment.client_id,
              'appointment_cancelled',
              `Su cita ha sido cancelada debido a un conflicto con el calendario del profesional.`,
              { appointment_id: appointment.id }
            );
          }

          await syncLogger.logResolution(userId, logEntry.connection_id, 'keep_remote', {
            conflictId: conflict.id,
            cancelledAppointments: conflictingAppointments.map(a => a.id)
          });
        }
      } else if (conflict.resolution === 'manual') {
        // Marcar para resolución manual (no hacer nada automático)
        await syncLogger.logSyncOperation(userId, logEntry.connection_id, 'resolution', 'pending', 'Conflicto marcado para resolución manual', {
          conflictId: conflict.id
        });
      }

      // Marcar conflicto como resuelto
      await prisma.calendar_sync_logs.update({
        where: { id: conflict.id },
        data: {
          resolved: true,
          resolved_at: new Date(),
          resolution: conflict.resolution
        }
      });
    }

  } catch (error) {
    console.error('Error resolviendo conflictos de sincronización:', error);
    throw error;
  }
}

module.exports = {
  connectGoogleCalendar,
  syncGoogleCalendar,
  generateICalFeed,
  disconnectCalendar,
  getCalendarConnections,
  resolveSyncConflicts,
  CALENDAR_TYPES,
  SYNC_STATUS
};
