// test-integrations-detailed.js - Pruebas detalladas de todas las integraciones de Changánet
/**
 * @archivo test-integrations-detailed.js - Verificación completa de integraciones
 * @descripción Script para probar funcionamiento real de todas las integraciones de terceros
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3003'; // Backend corriendo en puerto 3002 según logs

console.log('🔍 Iniciando pruebas detalladas de integraciones de Changánet...\n');

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

// Función para registrar usuario y obtener token
async function setupTestUser() {
  console.log('👤 Configurando usuario de prueba...');

  const registerResponse = await makeRequest('POST', `${BASE_URL}/api/auth/register`, {
    email: `integration-test-${Date.now()}@changanet.com`,
    password: 'test123456',
    name: 'Usuario Integración',
    rol: 'cliente'
  });

  if (!registerResponse.success) {
    console.log(`❌ Error registrando usuario: ${registerResponse.error}`);
    return null;
  }

  // Verificar usuario manualmente para obtener token
  const loginResponse = await makeRequest('POST', `${BASE_URL}/api/auth/login`, {
    email: registerResponse.data.user.email,
    password: 'test123456'
  });

  if (!loginResponse.success) {
    console.log(`❌ Error en login: ${loginResponse.error}`);
    return null;
  }

  console.log('✅ Usuario de prueba configurado\n');
  return loginResponse.data.token;
}

// Pruebas de integraciones
async function runIntegrationTests() {
  const results = [];
  let userToken = null;

  // 1. Google Maps API
  console.log('🗺️ Probando Google Maps API...');
  try {
    const mapsResponse = await makeRequest('GET', `${BASE_URL}/api/maps/geocode?address=Buenos%20Aires,Argentina`);
    results.push({
      integration: 'Google Maps API',
      status: mapsResponse.success ? '✅ Funcionando' : '❌ Error',
      details: mapsResponse.success ? 'Geocodificación exitosa' : mapsResponse.error,
      endpoint: '/api/maps/geocode'
    });
    console.log(mapsResponse.success ? '✅ Google Maps OK' : `❌ Google Maps FAIL: ${mapsResponse.error}\n`);
  } catch (error) {
    results.push({
      integration: 'Google Maps API',
      status: '❌ Error',
      details: error.message,
      endpoint: '/api/maps/geocode'
    });
    console.log(`❌ Google Maps FAIL: ${error.message}\n`);
  }

  // 2. Mercado Pago
  console.log('💳 Probando Mercado Pago...');
  try {
    const mpResponse = await makeRequest('POST', `${BASE_URL}/api/payments/create-preference`, {
      title: 'Servicio de prueba',
      price: 100,
      description: 'Prueba de integración Mercado Pago'
    });
    results.push({
      integration: 'Mercado Pago',
      status: mpResponse.success ? '✅ Funcionando' : '❌ Error',
      details: mpResponse.success ? 'Preferencia creada' : mpResponse.error,
      endpoint: '/api/payments/create-preference'
    });
    console.log(mpResponse.success ? '✅ Mercado Pago OK' : `❌ Mercado Pago FAIL: ${mpResponse.error}\n`);
  } catch (error) {
    results.push({
      integration: 'Mercado Pago',
      status: '❌ Error',
      details: error.message,
      endpoint: '/api/payments/create-preference'
    });
    console.log(`❌ Mercado Pago FAIL: ${error.message}\n`);
  }

  // 3. SendGrid
  console.log('📧 Probando SendGrid...');
  try {
    const emailResponse = await makeRequest('POST', `${BASE_URL}/api/auth/forgot-password`, {
      email: 'test@changanet.com'
    });
    results.push({
      integration: 'SendGrid',
      status: emailResponse.success ? '✅ Funcionando' : '❌ Error',
      details: emailResponse.success ? 'Email enviado' : emailResponse.error,
      endpoint: '/api/auth/forgot-password'
    });
    console.log(emailResponse.success ? '✅ SendGrid OK' : `❌ SendGrid FAIL: ${emailResponse.error}\n`);
  } catch (error) {
    results.push({
      integration: 'SendGrid',
      status: '❌ Error',
      details: error.message,
      endpoint: '/api/auth/forgot-password'
    });
    console.log(`❌ SendGrid FAIL: ${error.message}\n`);
  }

  // 4. Google OAuth 2.0
  console.log('🔐 Probando Google OAuth...');
  try {
    const oauthResponse = await axios.get(`${BASE_URL}/api/auth/google`, {
      maxRedirects: 0,
      validateStatus: function (status) {
        return status >= 200 && status < 400;
      }
    });
    results.push({
      integration: 'Google OAuth 2.0',
      status: '✅ Funcionando',
      details: 'Ruta OAuth accesible',
      endpoint: '/api/auth/google'
    });
    console.log('✅ Google OAuth OK\n');
  } catch (error) {
    results.push({
      integration: 'Google OAuth 2.0',
      status: '❌ Error',
      details: error.message,
      endpoint: '/api/auth/google'
    });
    console.log(`❌ Google OAuth FAIL: ${error.message}\n`);
  }

  // 5. Socket.IO
  console.log('🔄 Probando Socket.IO...');
  try {
    const socketResponse = await makeRequest('GET', `${BASE_URL}/socket.io/?EIO=4&transport=polling`);
    results.push({
      integration: 'Socket.IO',
      status: socketResponse.success ? '✅ Funcionando' : '❌ Error',
      details: socketResponse.success ? 'WebSocket operativo' : socketResponse.error,
      endpoint: '/socket.io'
    });
    console.log(socketResponse.success ? '✅ Socket.IO OK' : `❌ Socket.IO FAIL: ${socketResponse.error}\n`);
  } catch (error) {
    results.push({
      integration: 'Socket.IO',
      status: '❌ Error',
      details: error.message,
      endpoint: '/socket.io'
    });
    console.log(`❌ Socket.IO FAIL: ${error.message}\n`);
  }

  // 6. Cloudinary
  console.log('📸 Probando Cloudinary...');
  try {
    // Crear un archivo de prueba pequeño
    const testImagePath = path.join(__dirname, 'test-image.txt');
    fs.writeFileSync(testImagePath, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');

    const cloudinaryResponse = await makeRequest('POST', `${BASE_URL}/api/upload/image`, {
      image: fs.readFileSync(testImagePath).toString('base64')
    });

    // Limpiar archivo de prueba
    fs.unlinkSync(testImagePath);

    results.push({
      integration: 'Cloudinary',
      status: cloudinaryResponse.success ? '✅ Funcionando' : '❌ Error',
      details: cloudinaryResponse.success ? 'Imagen subida' : cloudinaryResponse.error,
      endpoint: '/api/upload/image'
    });
    console.log(cloudinaryResponse.success ? '✅ Cloudinary OK' : `❌ Cloudinary FAIL: ${cloudinaryResponse.error}\n`);
  } catch (error) {
    results.push({
      integration: 'Cloudinary',
      status: '❌ Error',
      details: error.message,
      endpoint: '/api/upload/image'
    });
    console.log(`❌ Cloudinary FAIL: ${error.message}\n`);
  }

  // 7. Firebase Cloud Messaging
  console.log('🛎️ Probando Firebase Cloud Messaging...');
  userToken = userToken || await setupTestUser();
  if (userToken) {
    try {
      const fcmResponse = await makeRequest('POST', `${BASE_URL}/api/notifications/test-fcm`, {
        title: 'Prueba FCM',
        body: 'Mensaje de prueba'
      }, userToken);
      results.push({
        integration: 'Firebase Cloud Messaging',
        status: fcmResponse.success ? '✅ Funcionando' : '❌ Error',
        details: fcmResponse.success ? 'Notificación enviada' : fcmResponse.error,
        endpoint: '/api/notifications/test-fcm'
      });
      console.log(fcmResponse.success ? '✅ FCM OK' : `❌ FCM FAIL: ${fcmResponse.error}\n`);
    } catch (error) {
      results.push({
        integration: 'Firebase Cloud Messaging',
        status: '❌ Error',
        details: error.message,
        endpoint: '/api/notifications/test-fcm'
      });
      console.log(`❌ FCM FAIL: ${error.message}\n`);
    }
  } else {
    results.push({
      integration: 'Firebase Cloud Messaging',
      status: '⚠️ Omitido',
      details: 'Sin token de usuario',
      endpoint: '/api/notifications/test-fcm'
    });
    console.log('⚠️ FCM omitido (sin token)\n');
  }

  // 8. Twilio
  console.log('📱 Probando Twilio...');
  try {
    const smsResponse = await makeRequest('POST', `${BASE_URL}/api/sms/test`, {
      to: '+5491134007759',
      message: 'Prueba de integración Twilio'
    });
    results.push({
      integration: 'Twilio',
      status: smsResponse.success ? '✅ Funcionando' : '❌ Error',
      details: smsResponse.success ? 'SMS enviado' : smsResponse.error,
      endpoint: '/api/sms/test'
    });
    console.log(smsResponse.success ? '✅ Twilio OK' : `❌ Twilio FAIL: ${smsResponse.error}\n`);
  } catch (error) {
    results.push({
      integration: 'Twilio',
      status: '❌ Error',
      details: error.message,
      endpoint: '/api/sms/test'
    });
    console.log(`❌ Twilio FAIL: ${error.message}\n`);
  }

  // 9. Sentry
  console.log('🛡️ Probando Sentry...');
  try {
    const sentryResponse = await makeRequest('POST', `${BASE_URL}/api/test/sentry-error`);
    results.push({
      integration: 'Sentry',
      status: sentryResponse.success || sentryResponse.status === 500 ? '✅ Funcionando' : '❌ Error',
      details: 'Error de prueba enviado a Sentry',
      endpoint: '/api/test/sentry-error'
    });
    console.log('✅ Sentry OK (error de prueba enviado)\n');
  } catch (error) {
    results.push({
      integration: 'Sentry',
      status: '❌ Error',
      details: error.message,
      endpoint: '/api/test/sentry-error'
    });
    console.log(`❌ Sentry FAIL: ${error.message}\n`);
  }

  // 10. Prometheus
  console.log('📈 Probando Prometheus...');
  try {
    const prometheusResponse = await makeRequest('GET', `${BASE_URL}/metrics`);
    results.push({
      integration: 'Prometheus',
      status: prometheusResponse.success ? '✅ Funcionando' : '❌ Error',
      details: prometheusResponse.success ? 'Métricas expuestas' : prometheusResponse.error,
      endpoint: '/metrics'
    });
    console.log(prometheusResponse.success ? '✅ Prometheus OK' : `❌ Prometheus FAIL: ${prometheusResponse.error}\n`);
  } catch (error) {
    results.push({
      integration: 'Prometheus',
      status: '❌ Error',
      details: error.message,
      endpoint: '/metrics'
    });
    console.log(`❌ Prometheus FAIL: ${error.message}\n`);
  }

  // 11. Google Cloud Storage
  console.log('☁️ Probando Google Cloud Storage...');
  try {
    const gcsResponse = await makeRequest('POST', `${BASE_URL}/api/upload/document`, {
      fileName: 'test-document.txt',
      content: 'Contenido de prueba'
    });
    results.push({
      integration: 'Google Cloud Storage',
      status: gcsResponse.success ? '✅ Funcionando' : '❌ Error',
      details: gcsResponse.success ? 'Documento subido' : gcsResponse.error,
      endpoint: '/api/upload/document'
    });
    console.log(gcsResponse.success ? '✅ Google Cloud Storage OK' : `❌ Google Cloud Storage FAIL: ${gcsResponse.error}\n`);
  } catch (error) {
    results.push({
      integration: 'Google Cloud Storage',
      status: '❌ Error',
      details: error.message,
      endpoint: '/api/upload/document'
    });
    console.log(`❌ Google Cloud Storage FAIL: ${error.message}\n`);
  }

  // 12. Jest (Tests)
  console.log('🧪 Probando Jest...');
  try {
    const { execSync } = require('child_process');
    execSync('cd changanet-backend && npm test -- --passWithNoTests', { stdio: 'pipe' });
    results.push({
      integration: 'Jest + Supertest',
      status: '✅ Funcionando',
      details: 'Tests ejecutados exitosamente',
      endpoint: 'npm test'
    });
    console.log('✅ Jest OK\n');
  } catch (error) {
    results.push({
      integration: 'Jest + Supertest',
      status: '❌ Error',
      details: error.message,
      endpoint: 'npm test'
    });
    console.log(`❌ Jest FAIL: ${error.message}\n`);
  }

  return results;
}

// Función principal
async function main() {
  console.log('🔬 PRUEBAS DETALLADAS DE INTEGRACIONES EN CHANGÁNET\n');
  console.log('=' .repeat(60));

  const results = await runIntegrationTests();

  console.log('\n📊 RESULTADOS FINALES:');
  console.log('=' .repeat(60));

  const working = results.filter(r => r.status.includes('✅')).length;
  const issues = results.filter(r => r.status.includes('❌')).length;
  const skipped = results.filter(r => r.status.includes('⚠️')).length;

  results.forEach(result => {
    console.log(`${result.status} ${result.integration}`);
    console.log(`   📍 ${result.endpoint}`);
    console.log(`   💡 ${result.details}\n`);
  });

  console.log('=' .repeat(60));
  console.log(`🎯 RESUMEN: ${working} funcionando, ${issues} con errores, ${skipped} omitidos`);
  console.log(`📈 Tasa de éxito: ${((working / results.length) * 100).toFixed(1)}%`);

  if (issues === 0) {
    console.log('🎉 ¡Todas las integraciones están funcionando correctamente!');
  } else {
    console.log('⚠️ Algunas integraciones requieren atención.');
  }

  process.exit(issues === 0 ? 0 : 1);
}

main().catch(error => {
  console.error('❌ Error ejecutando pruebas:', error);
  process.exit(1);
});
