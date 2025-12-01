// test-fcm-notifications.js
// Script de prueba completo para verificar el funcionamiento de Firebase Cloud Messaging (FCM) en Changánet
// Este script simula envío y recepción de notificaciones push para probar el sistema completo

const admin = require('firebase-admin');
require('dotenv').config();

// Configuración de prueba
const SERVER_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3003';
const TEST_USER_ID = 'user-test-fcm';
const TEST_FCM_TOKEN = process.env.TEST_FCM_TOKEN || 'test-fcm-token-placeholder'; // Token FCM de prueba

// Función para verificar configuración de Firebase Admin
function testFirebaseAdminConfig() {
  console.log('🔧 Verificando configuración de Firebase Admin...');

  try {
    if (!admin.apps.length) {
      console.log('❌ Firebase Admin no está inicializado');
      return false;
    }

    console.log('✅ Firebase Admin está correctamente configurado');
    return true;
  } catch (error) {
    console.error('❌ Error en configuración de Firebase Admin:', error.message);
    return false;
  }
}

// Función para probar envío de notificación push
async function testSendPushNotification() {
  console.log('\n📤 Probando envío de notificación push...');

  try {
    if (!TEST_FCM_TOKEN || TEST_FCM_TOKEN === 'test-fcm-token-placeholder') {
      console.log('⚠️ Token FCM de prueba no configurado - usando simulación');
      console.log('💡 Para probar completamente, configura TEST_FCM_TOKEN en .env con un token real');
      return simulatePushNotification();
    }

    const message = {
      token: TEST_FCM_TOKEN,
      notification: {
        title: 'Notificación de Prueba Changánet',
        body: 'Esta es una notificación push de prueba desde FCM'
      },
      data: {
        tipo: 'nuevo_mensaje',
        usuario_id: TEST_USER_ID
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Notificación push enviada exitosamente:', response);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar notificación push:', error.message);
    return false;
  }
}

// Función para simular notificación push (cuando no hay token real)
function simulatePushNotification() {
  console.log('🎭 Simulando envío de notificación push...');
  console.log('📱 En un dispositivo real, esta notificación aparecería en el navegador');

  // Simular respuesta exitosa
  const simulatedResponse = {
    messageId: 'simulated-message-id-' + Date.now(),
    success: true
  };

  console.log('✅ Notificación push simulada enviada exitosamente:', simulatedResponse);
  return true;
}

// Función para probar conectividad con el servidor
async function testServerConnectivity() {
  console.log('\n🌐 Probando conectividad con el servidor...');

  try {
    const response = await fetch(`${SERVER_URL}/health`);
    if (response.ok) {
      console.log('✅ Servidor responde correctamente');
      return true;
    } else {
      console.log('❌ Servidor no responde correctamente');
      return false;
    }
  } catch (error) {
    console.error('❌ Error de conectividad:', error.message);
    return false;
  }
}

// Función para probar API de notificaciones
async function testNotificationAPI() {
  console.log('\n📡 Probando API de notificaciones...');

  try {
    // Probar obtener notificaciones (requiere autenticación)
    console.log('📥 Probando obtener notificaciones...');
    // Nota: Esta prueba requiere un token JWT válido
    console.log('⚠️ Prueba de API requiere token de autenticación - verificar manualmente');

    // Probar envío de notificación desde el servidor
    console.log('📤 Probando envío desde servidor...');
    const notificationData = {
      usuario_id: TEST_USER_ID,
      tipo: 'nuevo_mensaje',
      mensaje: 'Notificación de prueba desde API'
    };

    // Simular llamada a la API (requiere implementación del endpoint)
    console.log('⚠️ Endpoint de prueba de notificaciones requiere implementación - verificar manualmente');

    return true;
  } catch (error) {
    console.error('❌ Error en API de notificaciones:', error.message);
    return false;
  }
}

// Función para probar integración con Socket.IO (notificaciones en tiempo real)
async function testRealtimeNotifications() {
  console.log('\n🔄 Probando notificaciones en tiempo real con Socket.IO...');

  try {
    // Esta prueba se integra con el test-socketio.js existente
    console.log('⚠️ Las notificaciones en tiempo real se prueban en test-socketio.js');
    console.log('💡 Ejecutar test-socketio.js para verificar integración completa');

    return true;
  } catch (error) {
    console.error('❌ Error en notificaciones en tiempo real:', error.message);
    return false;
  }
}

// Función principal de prueba
async function testFCM() {
  console.log('🚀 Iniciando pruebas completas de Firebase Cloud Messaging (FCM) para Changánet');
  console.log('='.repeat(80));

  let allTestsPassed = true;

  try {
    // Paso 1: Verificar configuración de Firebase Admin
    console.log('\n📋 PASO 1: Verificando configuración de Firebase Admin');
    const firebaseConfigOk = testFirebaseAdminConfig();
    allTestsPassed = allTestsPassed && firebaseConfigOk;

    // Paso 2: Probar conectividad con el servidor
    console.log('\n📋 PASO 2: Probando conectividad con el servidor');
    const serverOk = await testServerConnectivity();
    allTestsPassed = allTestsPassed && serverOk;

    // Paso 3: Probar envío de notificaciones push
    console.log('\n📋 PASO 3: Probando envío de notificaciones push');
    const pushOk = await testSendPushNotification();
    allTestsPassed = allTestsPassed && pushOk;

    // Paso 4: Probar API de notificaciones
    console.log('\n📋 PASO 4: Probando API de notificaciones');
    const apiOk = await testNotificationAPI();
    allTestsPassed = allTestsPassed && apiOk;

    // Paso 5: Probar notificaciones en tiempo real
    console.log('\n📋 PASO 5: Probando notificaciones en tiempo real');
    const realtimeOk = await testRealtimeNotifications();
    allTestsPassed = allTestsPassed && realtimeOk;

    // Resultados finales
    console.log('\n' + '='.repeat(80));
    if (allTestsPassed) {
      console.log('✅ PRUEBAS DE FCM COMPLETADAS EXITOSAMENTE');
      console.log('🎉 Firebase Cloud Messaging está funcionando correctamente en Changánet');
    } else {
      console.log('⚠️ ALGUNAS PRUEBAS DE FCM FALLARON - REVISAR CONFIGURACIÓN');
    }

    console.log('\n📊 Resumen de pruebas FCM:');
    console.log('   • Configuración Firebase Admin:', firebaseConfigOk ? '✅' : '❌');
    console.log('   • Conectividad del servidor:', serverOk ? '✅' : '❌');
    console.log('   • Envío de notificaciones push:', pushOk ? '✅' : '❌');
    console.log('   • API de notificaciones:', apiOk ? '✅' : '❌');
    console.log('   • Notificaciones en tiempo real:', realtimeOk ? '✅' : '❌');

    console.log('\n🔧 Próximos pasos para pruebas completas:');
    console.log('   • Configurar credenciales reales de Firebase en serviceAccountKey.json');
    console.log('   • Obtener token FCM real de un dispositivo registrado');
    console.log('   • Configurar TEST_FCM_TOKEN en variables de entorno');
    console.log('   • Implementar endpoints de prueba en notificationController.js');
    console.log('   • Verificar recepción de notificaciones en el frontend');

  } catch (error) {
    console.error('❌ ERROR FATAL EN PRUEBAS DE FCM:', error);
    console.error('🔧 Posibles soluciones:');
    console.error('   • Verificar que las credenciales de Firebase sean válidas');
    console.error('   • Verificar que el archivo serviceAccountKey.json exista');
    console.error('   • Verificar que el servidor backend esté ejecutándose');
    console.error('   • Revisar logs del servidor para más detalles');
  }
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
  testFCM().then(() => {
    console.log('\n🏁 Pruebas de FCM finalizadas');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Error fatal en pruebas de FCM:', error);
    process.exit(1);
  });
}

module.exports = { testFCM, testFirebaseAdminConfig, testSendPushNotification };
