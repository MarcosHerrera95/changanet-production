// test-sentry-backend.js - Script de prueba para Sentry en backend
require('dotenv').config();

// Inicializar Sentry
const { initializeSentry, captureError, captureMessage, setUserContext } = require('./changanet-backend/src/services/sentryService');
initializeSentry();

console.log('🚀 Iniciando pruebas de Sentry en backend...');

// Prueba 1: Capturar un error simple
console.log('📝 Prueba 1: Capturando error simple...');
try {
  throw new Error('Error de prueba intencional en backend');
} catch (error) {
  captureError(error, {
    tags: {
      test: 'backend-error-test',
      type: 'manual-test'
    },
    extra: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }
  });
  console.log('✅ Error capturado en Sentry');
}

// Prueba 2: Capturar un mensaje informativo
console.log('📝 Prueba 2: Capturando mensaje informativo...');
captureMessage('Prueba de mensaje informativo desde backend', 'info', {
  tags: {
    test: 'backend-message-test',
    type: 'manual-test'
  },
  extra: {
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }
});
console.log('✅ Mensaje informativo capturado en Sentry');

// Prueba 3: Simular error en contexto de usuario
console.log('📝 Prueba 3: Error con contexto de usuario...');
setUserContext({
  id: 123,
  email: 'test@example.com',
  nombre: 'Usuario de Prueba',
  rol: 'cliente'
});

try {
  // Simular un error de base de datos
  throw new Error('Error de conexión a base de datos - prueba');
} catch (error) {
  captureError(error, {
    tags: {
      test: 'backend-user-context-test',
      type: 'database-error',
      component: 'prisma-client'
    },
    extra: {
      operation: 'findMany',
      table: 'usuarios',
      query: 'SELECT * FROM usuarios WHERE activo = true'
    }
  });
  console.log('✅ Error con contexto de usuario capturado en Sentry');
}

// Prueba 4: Error asíncrono
console.log('📝 Prueba 4: Error asíncrono...');
setTimeout(() => {
  try {
    // Simular error en operación asíncrona
    throw new Error('Error en operación asíncrona - timeout simulation');
  } catch (error) {
    captureError(error, {
      tags: {
        test: 'backend-async-error-test',
        type: 'async-operation',
        component: 'notification-service'
      },
      extra: {
        operation: 'sendNotification',
        userId: 456,
        notificationType: 'push'
      }
    });
    console.log('✅ Error asíncrono capturado en Sentry');
  }
}, 1000);

// Prueba 5: Warning message
console.log('📝 Prueba 5: Mensaje de advertencia...');
captureMessage('Advertencia de prueba - configuración faltante', 'warning', {
  tags: {
    test: 'backend-warning-test',
    type: 'configuration-warning'
  },
  extra: {
    missingConfig: 'REDIS_URL',
    fallbackUsed: true
  }
});
console.log('✅ Mensaje de advertencia capturado en Sentry');

// Finalizar pruebas
setTimeout(() => {
  console.log('🎉 Todas las pruebas de Sentry completadas');
  console.log('📊 Revisa el dashboard de Sentry para ver los eventos capturados');
  console.log('🔗 Backend DSN:', process.env.SENTRY_DSN ? 'Configurado' : 'No configurado');

  // Limpiar contexto de usuario
  setUserContext(null);

  process.exit(0);
}, 2000);
