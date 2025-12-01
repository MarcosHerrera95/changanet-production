// test-sentry-frontend.js - Script de prueba para Sentry en frontend
// Este script simula errores en el frontend para probar Sentry

// Simular import.meta.env para el script de prueba
global.import = {
  meta: {
    env: {
      VITE_SENTRY_DSN: 'https://8ba1e27e23ff08c0c2003757e8913962@o4510260990574592.ingest.us.sentry.io/4510261039988736',
      MODE: 'development',
      npm_package_version: '1.0.0'
    }
  }
};

// Simular import.meta para el módulo ES
if (typeof globalThis !== 'undefined') {
  globalThis.import = global.import;
  globalThis.import.meta = global.import.meta;
} else {
  global.import.meta = global.import.meta || {
    env: {
      VITE_SENTRY_DSN: 'https://8ba1e27e23ff08c0c2003757e8913962@o4510260990574592.ingest.us.sentry.io/4510261039988736',
      MODE: 'development',
      npm_package_version: '1.0.0'
    }
  };
}

// Simular React para las pruebas
global.React = {
  useEffect: () => {},
  useLocation: () => ({ pathname: '/test' }),
  useNavigationType: () => 'PUSH',
  createRoutesFromChildren: () => [],
  matchRoutes: () => []
};

// Inicializar Sentry (simulando el frontend) - Usar CommonJS require para evitar problemas de ES modules
const Sentry = require('@sentry/browser');

// Configurar Sentry directamente para la prueba
Sentry.init({
  dsn: 'https://8ba1e27e23ff08c0c2003757e8913962@o4510260990574592.ingest.us.sentry.io/4510261039988736',
  environment: 'development',
  release: '1.0.0',
  tracesSampleRate: 0.1,
});

console.log('✅ Sentry inicializado correctamente en frontend (prueba)');

console.log('🚀 Iniciando pruebas de Sentry en frontend...');

// Prueba 1: Capturar un error simple
console.log('📝 Prueba 1: Capturando error simple...');
try {
  throw new Error('Error de prueba intencional en frontend');
} catch (error) {
  Sentry.withScope((scope) => {
    scope.setTag('test', 'frontend-error-test');
    scope.setTag('type', 'manual-test');
    scope.setTag('component', 'test-script');
    scope.setExtra('timestamp', new Date().toISOString());
    scope.setExtra('userAgent', 'TestScript/1.0');
    scope.setExtra('url', 'http://localhost:5174/test');
    Sentry.captureException(error);
  });
  console.log('✅ Error capturado en Sentry');
}

// Prueba 2: Capturar un mensaje informativo
console.log('📝 Prueba 2: Capturando mensaje informativo...');
Sentry.withScope((scope) => {
  scope.setTag('test', 'frontend-message-test');
  scope.setTag('type', 'manual-test');
  scope.setTag('component', 'ui-component');
  scope.setExtra('timestamp', new Date().toISOString());
  scope.setExtra('action', 'button-click');
  scope.setExtra('page', 'dashboard');
  scope.setLevel('info');
  Sentry.captureMessage('Prueba de mensaje informativo desde frontend');
});
console.log('✅ Mensaje informativo capturado en Sentry');

// Prueba 3: Simular error en contexto de usuario
console.log('📝 Prueba 3: Error con contexto de usuario...');
Sentry.setUser({
  id: '789',
  email: 'frontend-test@example.com',
  username: 'Usuario Frontend',
  role: 'profesional'
});

Sentry.setTag('page', 'Dashboard');
Sentry.setTag('route', '/dashboard');
Sentry.setTag('component', 'DashboardComponent');

try {
  // Simular un error de JavaScript en componente React
  throw new Error('Error en componente React - prueba de renderizado');
} catch (error) {
  Sentry.withScope((scope) => {
    scope.setTag('test', 'frontend-user-context-test');
    scope.setTag('type', 'react-error');
    scope.setExtra('operation', 'render');
    scope.setExtra('props', { userId: 789, loading: false });
    scope.setExtra('state', { error: null, data: 'mock-data' });
    Sentry.captureException(error);
  });
  console.log('✅ Error con contexto de usuario capturado en Sentry');
}

// Prueba 4: Error asíncrono (simulando fetch)
console.log('📝 Prueba 4: Error asíncrono (fetch)...');
setTimeout(() => {
  try {
    // Simular error en llamada a API
    throw new Error('Error en fetch - conexión rechazada');
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag('test', 'frontend-async-error-test');
      scope.setTag('type', 'network-error');
      scope.setTag('component', 'api-service');
      scope.setExtra('operation', 'fetch');
      scope.setExtra('url', 'http://localhost:3003/api/users');
      scope.setExtra('method', 'GET');
      scope.setExtra('status', 0);
      scope.setExtra('statusText', 'Connection refused');
      Sentry.captureException(error);
    });
    console.log('✅ Error asíncrono capturado en Sentry');
  }
}, 1000);

// Prueba 5: Error de validación de formulario
console.log('📝 Prueba 5: Error de validación...');
try {
  // Simular error de validación en formulario
  const validationError = new Error('Error de validación - campo requerido vacío');
  validationError.name = 'ValidationError';
  throw validationError;
} catch (error) {
  Sentry.withScope((scope) => {
    scope.setTag('test', 'frontend-validation-error-test');
    scope.setTag('type', 'validation-error');
    scope.setTag('component', 'LoginForm');
    scope.setExtra('field', 'email');
    scope.setExtra('value', '');
    scope.setExtra('validationRule', 'required');
    scope.setExtra('formData', { email: '', password: '****' });
    Sentry.captureException(error);
  });
  console.log('✅ Error de validación capturado en Sentry');
}

// Prueba 6: Warning message
console.log('📝 Prueba 6: Mensaje de advertencia...');
Sentry.withScope((scope) => {
  scope.setTag('test', 'frontend-warning-test');
  scope.setTag('type', 'performance-warning');
  scope.setTag('component', 'ApiService');
  scope.setExtra('responseTime', 5000);
  scope.setExtra('threshold', 2000);
  scope.setExtra('endpoint', '/api/professionals/search');
  scope.setLevel('warning');
  Sentry.captureMessage('Advertencia de prueba - API lenta');
});
console.log('✅ Mensaje de advertencia capturado en Sentry');

// Prueba 7: Error de chunk loading (común en SPA)
console.log('📝 Prueba 7: Error de chunk loading...');
try {
  const chunkError = new Error('Loading chunk 123 failed');
  chunkError.name = 'ChunkLoadError';
  throw chunkError;
} catch (error) {
  Sentry.withScope((scope) => {
    scope.setTag('test', 'frontend-chunk-error-test');
    scope.setTag('type', 'chunk-load-error');
    scope.setTag('component', 'dynamic-import');
    scope.setExtra('chunkId', '123');
    scope.setExtra('module', 'Dashboard');
    scope.setExtra('retryCount', 0);
    Sentry.captureException(error);
  });
  console.log('✅ Error de chunk loading capturado en Sentry');
}

// Finalizar pruebas
setTimeout(() => {
  console.log('🎉 Todas las pruebas de Sentry completadas');
  console.log('📊 Revisa el dashboard de Sentry para ver los eventos capturados');
  console.log('🔗 Frontend DSN: Configurado');

  // Limpiar contexto
  Sentry.setUser(null);

  process.exit(0);
}, 3000);
