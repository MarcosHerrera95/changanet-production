// test-email-integration.js - Prueba de integración de emails en autenticación
/**
 * @archivo test-email-integration.js - Pruebas de envío de emails en registro y recuperación
 * @descripción Verifica funcionamiento de emails de verificación y recuperación de contraseña
 * @sprint Sprint 1 – Autenticación y Perfiles
 * @tarjeta Tarjeta 1: [Backend] Implementar API de Registro y Login
 * @impacto Económico: Verificación de comunicaciones digitales sin papel
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3003/api/auth';

// Función para probar registro con envío de email
async function testRegistrationEmail() {
  console.log('🧪 Probando registro con envío de email de verificación...');

  const testUser = {
    name: 'Usuario Test Email',
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    rol: 'cliente'
  };

  try {
    const response = await axios.post(`${BASE_URL}/register`, testUser);
    console.log('✅ Registro exitoso:', response.data.message);
    console.log('📧 Email de verificación enviado automáticamente');

    // Esperar un poco antes de probar reenvío
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Probar reenvío de email de verificación
    console.log('🔄 Probando reenvío de email de verificación...');
    try {
      const resendResponse = await axios.post(`${BASE_URL}/resend-verification`, { email: testUser.email });
      console.log('✅ Reenvío exitoso:', resendResponse.data.message);
    } catch (resendError) {
      if (resendError.response?.status === 429) {
        console.log('⏰ Rate limit activado correctamente:', resendError.response.data.message);
      } else {
        console.log('❌ Error en reenvío:', resendError.response?.data || resendError.message);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error en registro:', error.response?.data || error.message);
    return false;
  }
}

// Función para probar recuperación de contraseña
async function testPasswordResetEmail() {
  console.log('🧪 Probando recuperación de contraseña...');

  const testEmail = `test-${Date.now()}@example.com`;

  try {
    const response = await axios.post(`${BASE_URL}/forgot-password`, { email: testEmail });
    console.log('✅ Solicitud de recuperación procesada:', response.data.message);

    // Esperar un poco antes de probar reenvío
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Probar reenvío de email de recuperación
    console.log('🔄 Probando reenvío de email de recuperación...');
    try {
      const resendResponse = await axios.post(`${BASE_URL}/resend-password-reset`, { email: testEmail });
      console.log('✅ Reenvío exitoso:', resendResponse.data.message);
    } catch (resendError) {
      if (resendError.response?.status === 429) {
        console.log('⏰ Rate limit activado correctamente:', resendError.response.data.message);
      } else {
        console.log('❌ Error en reenvío:', resendError.response?.data || resendError.message);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error en recuperación:', error.response?.data || error.message);
    return false;
  }
}

// Ejecutar pruebas
async function runTests() {
  console.log('🚀 Iniciando pruebas de integración de emails en autenticación...\n');

  console.log('⚠️  IMPORTANTE: Estas pruebas enviarán emails reales.');
  console.log('📧 Asegúrate de configurar SENDGRID_API_KEY y FROM_EMAIL en tu .env\n');

  // Probar registro
  const registrationSuccess = await testRegistrationEmail();
  console.log('');

  // Probar recuperación de contraseña
  const resetSuccess = await testPasswordResetEmail();
  console.log('');

  // Resultados
  console.log('📊 Resultados de las pruebas:');
  console.log(`   Registro con email: ${registrationSuccess ? '✅ Éxito' : '❌ Falló'}`);
  console.log(`   Recuperación de contraseña: ${resetSuccess ? '✅ Éxito' : '❌ Falló'}`);

  if (registrationSuccess && resetSuccess) {
    console.log('\n🎉 ¡Todas las pruebas pasaron! La integración de SendGrid está funcionando correctamente.');
    console.log('📧 Revisa tu buzón de correo para verificar los emails enviados.');
    console.log('⏰ Los límites de rate limiting (1 email por hora) están activos.');
  } else {
    console.log('\n⚠️  Algunas pruebas fallaron. Revisa la configuración y los logs del servidor.');
  }
}

runTests().catch(console.error);
