/**
 * Configuración de Firebase Admin SDK para el backend.
 * Inicializa servicios de Firebase para notificaciones push, autenticación y almacenamiento.
 */
let admin;
let messaging;
let auth;
let storage;

/**
 * Inicialización condicional de Firebase Admin.
 * Solo se inicializa si existe el archivo de credenciales de servicio.
 */
try {
  admin = require('firebase-admin');
  const serviceAccount = require('../config/serviceAccountKey.json');

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || 'changanet-notifications',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'changanet-notifications.firebasestorage.app'
    });
    console.log('Firebase Admin inicializado correctamente');
    messaging = admin.messaging();
    auth = admin.auth();
    storage = admin.storage();
    console.log('Firebase Messaging habilitado');
    console.log('Firebase Auth habilitado');
    console.log('Firebase Storage habilitado');
  } else {
    messaging = admin.messaging();
    auth = admin.auth();
    storage = admin.storage();
  }
} catch (error) {
  console.warn('Firebase Admin no disponible - funcionalidades de Firebase deshabilitadas');
  console.warn('Para habilitar Firebase, descarga las credenciales reales de Firebase Console.');
  admin = null;
  messaging = null;
  auth = null;
  storage = null;
}

/**
 * Envía una notificación push a un dispositivo específico usando Firebase Cloud Messaging.
 * Requiere un token FCM válido y servicios de Firebase Admin configurados.
 */
exports.sendPushNotification = async (token, title, body) => {
  if (!admin || !messaging) {
    console.warn('Firebase Admin no disponible - notificación push no enviada');
    return null;
  }

  if (!token) {
    console.warn('Token FCM no proporcionado - notificación push no enviada');
    return null;
  }

  try {
    const message = {
      token,
      notification: {
        title,
        body
      },
      data: {
        timestamp: new Date().toISOString()
      }
    };

    const response = await messaging.send(message);
    console.log('Notificación push enviada:', response);
    return response;
  } catch (error) {
    console.error('Error al enviar notificación push:', error);
    throw error;
  }
};

/**
 * Envía notificaciones push a múltiples dispositivos simultáneamente.
 * Utiliza el método sendMulticast de Firebase para optimizar el envío masivo.
 */
exports.sendMulticastPushNotification = async (tokens, title, body) => {
  if (!admin || !messaging) {
    console.warn('Firebase Admin no disponible - notificaciones push multicast no enviadas');
    return null;
  }

  if (!tokens || tokens.length === 0) {
    console.warn('Tokens FCM no proporcionados - notificaciones push multicast no enviadas');
    return null;
  }

  try {
    const message = {
      tokens,
      notification: {
        title,
        body
      },
      data: {
        timestamp: new Date().toISOString()
      }
    };

    const response = await messaging.sendMulticast(message);
    console.log('Notificaciones push enviadas:', response);
    return response;
  } catch (error) {
    console.error('Error al enviar notificaciones push multicast:', error);
    throw error;
  }
};

// Exportar funciones y servicios
module.exports = {
  sendPushNotification: exports.sendPushNotification,
  sendMulticastPushNotification: exports.sendMulticastPushNotification,
  messaging,
  auth,
  storage
};
