/**
 * @archivo src/services/pushNotificationService.js - Servicio de notificaciones push
 * @descripción Gestiona envío de notificaciones push a dispositivos móviles usando FCM (REQ-19, REQ-20)
 * @sprint Sprint 2 – Notificaciones y Comunicación
 * @tarjeta Tarjeta 4: [Backend] Implementar API de Chat en Tiempo Real
 * @impacto Social: Notificaciones accesibles que funcionan sin que la app esté abierta
 */

const { PrismaClient } = require('@prisma/client');
const { sendPushNotification: sendFCMPush } = require('../config/firebaseAdmin');

const prisma = new PrismaClient();

/**
 * @función sendPushNotification - Envío de notificación push
 * @descripción Envía notificación push a dispositivo móvil usando Firebase Cloud Messaging (REQ-20)
 * @sprint Sprint 2 – Notificaciones y Comunicación
 * @tarjeta Tarjeta 4: [Backend] Implementar API de Chat en Tiempo Real
 * @impacto Ambiental: Comunicación digital eficiente sin consumo de recursos físicos
 * @param {string} userId - ID del usuario destinatario
 * @param {string} title - Título de la notificación
 * @param {string} body - Cuerpo de la notificación
 * @param {Object} data - Datos adicionales para la notificación
 * @returns {Promise<Object>} Resultado del envío
 */
exports.sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    // Obtener token FCM del usuario desde la base de datos
    const user = await prisma.usuarios.findUnique({
      where: { id: userId },
      select: { fcm_token: true, nombre: true }
    });

    if (!user?.fcm_token) {
      console.log(`Usuario ${userId} no tiene token FCM registrado`);
      return { success: false, reason: 'no_token' };
    }

    // Preparar mensaje FCM
    const message = {
      notification: {
        title: title,
        body: body
      },
      data: {
        userId: userId,
        timestamp: new Date().toISOString(),
        ...data
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      },
      webpush: {
        notification: {
          icon: '/vite.svg',
          badge: '/vite.svg',
          requireInteraction: true
        },
        fcmOptions: {
          link: process.env.FRONTEND_URL || 'http://localhost:5173'
        }
      }
    };

    // Enviar notificación usando Firebase Admin
    const result = await sendFCMPush(user.fcm_token, title, body, message.data);

    console.log(`📱 Push notificación enviada a ${user.nombre} (${userId}):`, { title, body, result });

    return {
      success: true,
      messageId: result,
      userId: userId
    };

  } catch (error) {
    console.error('Error al enviar notificación push:', error);

    // Manejar errores específicos de FCM
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      // Token inválido, podríamos marcarlo para limpieza
      console.warn(`Token FCM inválido para usuario ${userId}, considerar limpieza`);
    }

    throw error;
  }
};

/**
 * @función sendMulticastPushNotification - Envío masivo de notificaciones push
 * @descripción Envía notificación push a múltiples usuarios simultáneamente
 * @param {string[]} userIds - IDs de los usuarios destinatarios
 * @param {string} title - Título de la notificación
 * @param {string} body - Cuerpo de la notificación
 * @param {Object} data - Datos adicionales para la notificación
 * @returns {Promise<Object>} Resultado del envío masivo
 */
exports.sendMulticastPushNotification = async (userIds, title, body, data = {}) => {
  try {
    // Obtener tokens FCM de todos los usuarios
    const users = await prisma.usuarios.findMany({
      where: {
        id: { in: userIds },
        fcm_token: { not: null }
      },
      select: { id: true, fcm_token: true, nombre: true }
    });

    if (users.length === 0) {
      console.log('Ningún usuario tiene token FCM registrado');
      return { success: false, reason: 'no_tokens' };
    }

    const tokens = users.map(user => user.fcm_token);

    // Preparar mensaje multicast
    const message = {
      tokens: tokens,
      notification: {
        title: title,
        body: body
      },
      data: {
        timestamp: new Date().toISOString(),
        ...data
      },
      android: {
        priority: 'high'
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    // Enviar notificaciones masivas usando Firebase Admin
    const { sendMulticastPushNotification: sendMulticastFCM } = require('../config/firebaseAdmin');
    const result = await sendMulticastFCM(tokens, title, body, message.data);

    console.log(`📱 Push notificaciones masivas enviadas a ${users.length} usuarios:`, {
      title,
      body,
      successCount: result.successCount,
      failureCount: result.failureCount
    });

    return {
      success: true,
      successCount: result.successCount,
      failureCount: result.failureCount,
      results: result.responses
    };

  } catch (error) {
    console.error('Error al enviar notificaciones push masivas:', error);
    throw error;
  }
};

/**
 * @función registerFCMToken - Registrar token FCM de usuario
 * @descripción Almacena el token FCM de un usuario para envío de notificaciones
 * @param {string} userId - ID del usuario
 * @param {string} token - Token FCM del dispositivo
 * @returns {Promise<Object>} Resultado del registro
 */
exports.registerFCMToken = async (userId, token) => {
  try {
    await prisma.usuarios.update({
      where: { id: userId },
      data: { fcm_token: token }
    });

    console.log(`Token FCM registrado para usuario ${userId}`);
    return { success: true };

  } catch (error) {
    console.error('Error registrando token FCM:', error);
    throw error;
  }
};

/**
 * @función unregisterFCMToken - Eliminar token FCM de usuario
 * @descripción Remueve el token FCM cuando el usuario cierra sesión o elimina cuenta
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Resultado de la eliminación
 */
exports.unregisterFCMToken = async (userId) => {
  try {
    await prisma.usuarios.update({
      where: { id: userId },
      data: { fcm_token: null }
    });

    console.log(`Token FCM eliminado para usuario ${userId}`);
    return { success: true };

  } catch (error) {
    console.error('Error eliminando token FCM:', error);
    throw error;
  }
};
