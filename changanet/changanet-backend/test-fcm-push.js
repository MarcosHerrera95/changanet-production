// test-fcm-push.js
// Script de prueba para verificar el funcionamiento de Firebase Cloud Messaging (FCM)
// Este script envía una notificación push de prueba usando las credenciales configuradas

require('dotenv').config();

// Importar el servicio de notificaciones
const { sendPushNotification } = require('./src/config/firebaseAdmin');

// Función principal de prueba
const testFCM = async () => {
  try {
    console.log('📬 Iniciando prueba de envío de notificaciones push con FCM...');

    // NOTA: Para esta prueba, necesitamos un token FCM válido
    // En un entorno real, este token vendría de un dispositivo registrado
    // Para la prueba, usaremos null para verificar que FCM esté configurado correctamente
    const testToken = null; // Token FCM de prueba - reemplazar con token real si está disponible

    // Datos de la notificación de prueba
    const title = '🔔 Prueba de Notificación Push';
    const body = 'Esta es una notificación de prueba desde Changánet usando Firebase Cloud Messaging.';

    console.log('📤 Enviando notificación push de prueba...');

    // Intentar enviar la notificación
    const result = await sendPushNotification(testToken, title, body);

    if (result) {
      console.log('✅ ¡Éxito! Notificación push enviada con Firebase Cloud Messaging.');
      console.log('📬 Revisa tu dispositivo para ver la notificación.');
      console.log('🔗 ID del mensaje:', result);
    } else {
      console.log('⚠️ FCM está configurado pero no se pudo enviar la notificación (token faltante).');
      console.log('💡 Para probar completamente, registra un dispositivo y obtén su token FCM.');
    }

  } catch (error) {
    console.error('❌ Error al enviar notificación push con Firebase Cloud Messaging:', error.message);

    if (error.message.includes('Invalid cloud_name')) {
      console.error('🔧 Solución: Verifica las credenciales de Cloudinary en el archivo .env');
    } else if (error.message.includes('Firebase')) {
      console.error('🔧 Solución: Verifica que el archivo serviceAccountKey.json esté presente y sea válido');
    } else {
      console.error('🔧 Solución: Revisa la configuración de Firebase y las variables de entorno');
    }
  }
};

// Ejecutar la prueba
testFCM();
