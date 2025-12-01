// test-integration.js - Script de prueba integral para Changánet
/**
 * @archivo test-integration.js - Pruebas de integración completa
 * @descripción Script automatizado para verificar funcionamiento completo de Changánet (REQ-01, REQ-02, REQ-03, REQ-40, REQ-41)
 * @sprint Sprint 1-6 – Todos los sprints según funcionalidad probada
 * @tarjeta Tarjetas múltiples: [Testing] Pruebas de integración completas
 * @impacto Social: Verificación de accesibilidad y funcionamiento para todos los usuarios
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3003';
const FRONTEND_URL = 'http://localhost:5173';

console.log('🚀 Iniciando pruebas de integración de Changánet...\n');

// Función para hacer peticiones con manejo de errores
async function makeRequest(method, url, data = null, token = null) {
  try {
    const config = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { data })
    };

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      status: error.response?.status
    };
  }
}

// Pruebas de integración
async function runTests() {
  let testResults = [];
  let userToken = null;
  let userData = null;

  // 1. Prueba de salud del backend
  console.log('1️⃣ Probando endpoint de salud...');
  const healthTest = await makeRequest('GET', `${BASE_URL}/health`);
  testResults.push({
    name: 'Health Check',
    result: healthTest.success,
    details: healthTest.success ? '✅ Backend funcionando' : `❌ ${healthTest.error}`
  });
  console.log(healthTest.success ? '✅ Backend OK' : `❌ Backend FAIL: ${healthTest.error}\n`);

  // 2. Prueba de CORS
  console.log('2️⃣ Probando CORS...');
  const corsTest = await makeRequest('GET', `${BASE_URL}/test-cors`);
  testResults.push({
    name: 'CORS Test',
    result: corsTest.success,
    details: corsTest.success ? '✅ CORS funcionando' : `❌ ${corsTest.error}`
  });
  console.log(corsTest.success ? '✅ CORS OK' : `❌ CORS FAIL: ${corsTest.error}\n`);

  // 3. Prueba de registro de usuario
  console.log('3️⃣ Probando registro de usuario...');
  const registerTest = await makeRequest('POST', `${BASE_URL}/api/auth/register`, {
    email: `test${Date.now()}@changanet.com`,
    password: 'test123456',
    name: 'Usuario Test',
    rol: 'cliente'
  });
  testResults.push({
    name: 'User Registration',
    result: registerTest.success,
    details: registerTest.success ? '✅ Usuario registrado' : `❌ ${registerTest.error}`
  });

  if (registerTest.success) {
    userToken = registerTest.data.token;
    userData = registerTest.data.user;
    console.log('✅ Registro OK - Token obtenido\n');
  } else {
    console.log(`❌ Registro FAIL: ${registerTest.error}\n`);
  }

  // 4. Prueba de login
  console.log('4️⃣ Probando login...');
  const loginTest = await makeRequest('POST', `${BASE_URL}/api/auth/login`, {
    email: userData?.email || 'test@example.com', // Usar el email del usuario registrado
    password: 'test123456'
  });
  testResults.push({
    name: 'User Login',
    result: loginTest.success,
    details: loginTest.success ? '✅ Login exitoso' : `❌ ${loginTest.error}`
  });

  if (loginTest.success) {
    userToken = loginTest.data.token;
    console.log('✅ Login OK - Token obtenido\n');
  } else {
    console.log(`❌ Login FAIL: ${loginTest.error}\n`);
  }

  // Usar el token del registro si el login falló
  if (!loginTest.success && userToken) {
    console.log('4.1️⃣ Usando token del registro para pruebas protegidas...\n');
  }

  // 5. Prueba de rutas protegidas (si tenemos token)
  if (userToken) {
    console.log('5️⃣ Probando rutas protegidas...');

    // Prueba de perfil
    const profileTest = await makeRequest('GET', `${BASE_URL}/api/profile`, null, userToken);
    testResults.push({
      name: 'Protected Profile Route',
      result: profileTest.success,
      details: profileTest.success ? '✅ Ruta protegida OK' : `❌ ${profileTest.error}`
    });
    console.log(profileTest.success ? '✅ Perfil OK' : `❌ Perfil FAIL: ${profileTest.error}`);

    // Prueba de servicios
    const servicesTest = await makeRequest('GET', `${BASE_URL}/api/services`, null, userToken);
    testResults.push({
      name: 'Protected Services Route',
      result: servicesTest.success,
      details: servicesTest.success ? '✅ Servicios OK' : `❌ ${servicesTest.error}`
    });
    console.log(servicesTest.success ? '✅ Servicios OK' : `❌ Servicios FAIL: ${servicesTest.error}\n`);
  } else {
    console.log('5️⃣ Omitiendo pruebas de rutas protegidas (sin token)\n');
  }

  // 6. Prueba de Google OAuth (simulada - verificar que la ruta existe)
  console.log('6️⃣ Probando configuración de Google OAuth...');
  try {
    // Solo verificar que la ruta responde (no podemos completar el flujo completo)
    const googleAuthCheck = await axios.get(`${BASE_URL}/api/auth/google`, {
      maxRedirects: 0,
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Aceptar redirects
      }
    });
    testResults.push({
      name: 'Google OAuth Route',
      result: true,
      details: '✅ Ruta de Google OAuth accesible'
    });
    console.log('✅ Google OAuth OK\n');
  } catch (error) {
    testResults.push({
      name: 'Google OAuth Route',
      result: false,
      details: `❌ ${error.message}`
    });
    console.log(`❌ Google OAuth FAIL: ${error.message}\n`);
  }

  // 7. Verificar documentación API
  console.log('7️⃣ Verificando documentación API...');
  try {
    const docsCheck = await axios.get(`${BASE_URL}/api-docs/`);
    testResults.push({
      name: 'API Documentation',
      result: docsCheck.status === 200,
      details: docsCheck.status === 200 ? '✅ Documentación disponible' : '❌ Documentación no disponible'
    });
    console.log(docsCheck.status === 200 ? '✅ Documentación OK' : '❌ Documentación FAIL\n');
  } catch (error) {
    testResults.push({
      name: 'API Documentation',
      result: false,
      details: `❌ ${error.message}`
    });
    console.log(`❌ Documentación FAIL: ${error.message}\n`);
  }

  // 8. Verificar configuración de servicios externos
  console.log('8️⃣ Verificando configuración de servicios externos...');
  try {
    const servicesCheck = await axios.get(`${BASE_URL}/api/status`);
    testResults.push({
      name: 'External Services Config',
      result: servicesCheck.status === 200,
      details: servicesCheck.status === 200 ? '✅ Servicios configurados' : '❌ Servicios no configurados'
    });
    console.log(servicesCheck.status === 200 ? '✅ Servicios externos OK' : '❌ Servicios externos FAIL\n');
  } catch (error) {
    testResults.push({
      name: 'External Services Config',
      result: false,
      details: `❌ ${error.message}`
    });
    console.log(`❌ Servicios externos FAIL: ${error.message}\n`);
  }

  // 9. Verificar frontend
  console.log('9️⃣ Verificando frontend...');
  try {
    const frontendCheck = await axios.get(FRONTEND_URL, {
      timeout: 5000,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    testResults.push({
      name: 'Frontend Access',
      result: frontendCheck.status === 200,
      details: frontendCheck.status === 200 ? '✅ Frontend funcionando' : '❌ Frontend no disponible'
    });
    console.log(frontendCheck.status === 200 ? '✅ Frontend OK' : '❌ Frontend FAIL\n');
  } catch (error) {
    testResults.push({
      name: 'Frontend Access',
      result: false,
      details: `❌ ${error.message}`
    });
    console.log(`❌ Frontend FAIL: ${error.message}\n`);
  }

  // Resultados finales
  console.log('📊 RESULTADOS DE LAS PRUEBAS:\n');

  const passed = testResults.filter(test => test.result).length;
  const total = testResults.length;

  testResults.forEach(test => {
    console.log(`${test.result ? '✅' : '❌'} ${test.name}: ${test.details}`);
  });

  console.log(`\n🎯 RESUMEN: ${passed}/${total} pruebas pasaron`);

  if (passed === total) {
    console.log('🎉 ¡Todas las pruebas pasaron! Changánet está completamente integrado.');
  } else {
    console.log('⚠️ Algunas pruebas fallaron. Revisa los errores arriba.');
  }

  // Información adicional
  console.log('\n📋 INFORMACIÓN ADICIONAL:');
  console.log(`🔗 Frontend: ${FRONTEND_URL}`);
  console.log(`🔗 Backend: ${BASE_URL}`);
  console.log(`📚 Documentación API: ${BASE_URL}/api-docs`);
  console.log(`💾 Base de datos: SQLite (dev.db)`);
  console.log(`📧 Email: SendGrid configurado`);
  console.log(`🔐 Autenticación: JWT + Google OAuth`);
  console.log(`💬 Chat: Socket.IO funcionando`);
  console.log(`🔔 Notificaciones: Firebase Cloud Messaging`);

  process.exit(passed === total ? 0 : 1);
}

// Ejecutar pruebas
runTests().catch(error => {
  console.error('❌ Error ejecutando pruebas:', error);
  process.exit(1);
});
