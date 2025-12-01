// test-fcm-send.js
const { sendPushNotification } = require('./src/config/firebaseAdmin');

async function testFCMSend() {
  try {
    console.log('📬 Iniciando prueba de envío de notificaciones push...');

    // Enviar notificación push de prueba
    await sendPushNotification(
      'TOKEN_DEL_USUARIO_AQUI', // ✅ REEMPLAZA CON EL TOKEN FCM REAL DEL USUARIO
      'Notificación de Prueba - Changánet',
      'Este es un mensaje de prueba enviado desde Changánet usando Firebase Cloud Messaging.'
    );

    console.log('✅ ¡Éxito! Notificación push enviada con Firebase Cloud Messaging.');
    console.log('📬 Revisa tu dispositivo para ver la notificación.');
  } catch (error) {
    console.error('❌ Error al enviar notificación push con Firebase Cloud Messaging:', error);
    if (error.response) {
      console.error(' Detalles:', error.response.body);
    }
  }
}

testFCMSend();
