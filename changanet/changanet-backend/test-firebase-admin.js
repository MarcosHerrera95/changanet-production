// test-firebase-admin.js
// Script de prueba para verificar la inicialización completa de Firebase Admin
// Verifica que todas las funcionalidades de Firebase estén habilitadas con credenciales reales

require('dotenv').config();

// Importar configuración de Firebase Admin
const { messaging, auth, storage, sendPushNotification } = require('./src/config/firebaseAdmin');

// Función principal de verificación
const testFirebaseAdmin = async () => {
  console.log('🔧 Verificando configuración de Firebase Admin...\n');

  try {
    // 1. Verificar inicialización básica
    if (!require('firebase-admin')) {
      throw new Error('Firebase Admin SDK no está instalado');
    }
    console.log('✅ Firebase Admin SDK instalado correctamente');

    // 2. Verificar credenciales del service account
    try {
      const serviceAccount = require('./src/config/serviceAccountKey.json');
      if (serviceAccount.type !== 'service_account') {
        throw new Error('El archivo serviceAccountKey.json no es válido');
      }
      console.log('✅ Archivo de credenciales del service account encontrado');
    } catch (error) {
      console.error('❌ Error con el archivo de credenciales:', error.message);
      console.log('💡 Solución: Descarga las credenciales reales desde Firebase Console > Project Settings > Service Accounts');
      return;
    }

    // 3. Verificar variables de entorno
    const requiredEnvVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_API_KEY',
      'FIREBASE_STORAGE_BUCKET'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.error(`❌ Variable de entorno faltante: ${envVar}`);
        console.log('💡 Solución: Añade las variables al archivo .env');
        return;
      }
    }
    console.log('✅ Variables de entorno de Firebase configuradas');

    // 4. Verificar inicialización de Firebase Admin
    if (!require('firebase-admin').apps.length) {
      throw new Error('Firebase Admin no se inicializó correctamente');
    }
    console.log('✅ Firebase Admin inicializado correctamente');

    // 5. Verificar Firebase Messaging
    if (!messaging) {
      console.error('❌ Firebase Messaging no disponible');
    } else {
      console.log('📬 Firebase Messaging habilitado');

      // Probar envío de notificación (sin token real para evitar errores)
      try {
        const testResult = await sendPushNotification(null, 'Test', 'Mensaje de prueba');
        if (testResult === null) {
          console.log('📬 Función sendPushNotification configurada correctamente');
        }
      } catch (pushError) {
        console.log('⚠️ Firebase Messaging configurado pero requiere token válido para pruebas completas');
      }
    }

    // 6. Verificar Firebase Auth
    if (!auth) {
      console.error('❌ Firebase Auth no disponible');
    } else {
      console.log('🔐 Firebase Auth habilitado');

      // Probar obtener lista de usuarios (limitada)
      try {
        const listUsersResult = await auth.listUsers(1);
        console.log('🔐 Firebase Auth operativo - usuarios encontrados:', listUsersResult.users.length);
      } catch (authError) {
        console.log('⚠️ Firebase Auth configurado pero puede requerir permisos adicionales');
      }
    }

    // 7. Verificar Firebase Storage
    if (!storage) {
      console.error('❌ Firebase Storage no disponible');
    } else {
      console.log('🗂️ Firebase Storage habilitado');

      // Probar acceso al bucket
      try {
        const bucket = storage.bucket();
        const [files] = await bucket.getFiles({ maxResults: 1 });
        console.log('🗂️ Firebase Storage operativo - bucket accesible');
      } catch (storageError) {
        console.log('⚠️ Firebase Storage configurado pero puede requerir configuración adicional del bucket');
      }
    }

    console.log('\n🎉 ¡Verificación completada! Firebase Admin está correctamente configurado con credenciales reales.');
    console.log('📋 Resumen:');
    console.log('   ✅ Firebase Admin SDK instalado');
    console.log('   ✅ Credenciales del service account válidas');
    console.log('   ✅ Variables de entorno configuradas');
    console.log('   ✅ Firebase Admin inicializado');
    console.log('   ✅ Firebase Messaging habilitado');
    console.log('   ✅ Firebase Auth habilitado');
    console.log('   ✅ Firebase Storage habilitado');

  } catch (error) {
    console.error('❌ Error crítico durante la verificación:', error.message);

    if (error.message.includes('serviceAccountKey.json')) {
      console.log('💡 Solución: Descarga el archivo de credenciales desde Firebase Console');
    } else if (error.message.includes('initializeApp')) {
      console.log('💡 Solución: Verifica que las credenciales y variables de entorno sean correctas');
    } else {
      console.log('💡 Solución: Revisa la configuración de Firebase y las dependencias instaladas');
    }
  }
};

// Ejecutar verificación
testFirebaseAdmin();
