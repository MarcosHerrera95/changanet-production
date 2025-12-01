// test-sendgrid.js - Script de prueba para SendGrid
/**
 * @archivo test-sendgrid.js - Pruebas de envío de emails con SendGrid
 * @descripción Verifica funcionamiento de emails transaccionales y de soporte (REQ-04)
 * @sprint Sprint 1 – Autenticación y Perfiles
 * @tarjeta Tarjeta 2: [Dev] Implementar API y Frontend para Registro de Usuario
 * @impacto Ambiental: Verificación de comunicaciones digitales sin papel
 */

const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Función para probar email transaccional
async function testTransactionalEmail() {
  const msg = {
    to: 'makitosriver@gmail.com',
    from: {
      email: process.env.FROM_EMAIL,
      name: 'Changánet'
    },
    subject: '📧 Prueba de Email Transaccional - Changánet',
    text: '¡Hola! Este es un email de prueba transaccional para verificar que SendGrid funciona correctamente en Changánet.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #10B981;">🚀 ¡Prueba de Email Transaccional!</h1>
        <p>¡Hola!</p>
        <p>Este es un <strong>email transaccional</strong> enviado desde <span style="color: #10B981;">${process.env.FROM_EMAIL}</span>.</p>
        <div style="background-color: #F0FDF4; border: 1px solid #10B981; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0;"><strong>✅ Resultado:</strong> Email transaccional enviado correctamente.</p>
        </div>
        <p>¡Felicitaciones! Tu sistema de notificaciones transaccionales está funcionando.</p>
        <p>Saludos,<br>Equipo Changánet</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log('✅ ¡Éxito! Email transaccional enviado desde noreplychanganet@gmail.com');
    return true;
  } catch (error) {
    console.error('❌ Error al enviar email transaccional:', error);
    if (error.response) {
      console.error(' Detalles:', error.response.body);
    }
    return false;
  }
}

// Función para probar email de soporte
async function testSupportEmail() {
  const msg = {
    to: 'makitosriver@gmail.com',
    from: {
      email: process.env.SUPPORT_EMAIL,
      name: 'Soporte Changánet'
    },
    subject: '📧 Prueba de Email de Soporte - Changánet',
    text: '¡Hola! Este es un email de prueba de soporte para verificar que SendGrid funciona correctamente en Changánet.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #F59E0B;">🛠️ ¡Prueba de Email de Soporte!</h1>
        <p>¡Hola!</p>
        <p>Este es un <strong>email de soporte</strong> enviado desde <span style="color: #F59E0B;">${process.env.SUPPORT_EMAIL}</span>.</p>
        <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0;"><strong>✅ Resultado:</strong> Email de soporte enviado correctamente.</p>
        </div>
        <p>¡Felicitaciones! Tu sistema de soporte por email está funcionando.</p>
        <p>Saludos,<br>Equipo de Soporte Changánet</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log('✅ ¡Éxito! Email de soporte enviado desde soportechanganet@gmail.com');
    return true;
  } catch (error) {
    console.error('❌ Error al enviar email de soporte:', error);
    if (error.response) {
      console.error(' Detalles:', error.response.body);
    }
    return false;
  }
}

// Ejecutar pruebas
async function runTests() {
  console.log('🚀 Iniciando pruebas de SendGrid con credenciales reales...\n');

  console.log('📧 Probando email transaccional...');
  const transactionalSuccess = await testTransactionalEmail();

  console.log('\n📧 Probando email de soporte...');
  const supportSuccess = await testSupportEmail();

  console.log('\n📊 Resultados de las pruebas:');
  console.log(`   Email transaccional: ${transactionalSuccess ? '✅ Éxito' : '❌ Falló'}`);
  console.log(`   Email de soporte: ${supportSuccess ? '✅ Éxito' : '❌ Falló'}`);

  if (transactionalSuccess && supportSuccess) {
    console.log('\n🎉 ¡Todas las pruebas pasaron! SendGrid está configurado correctamente.');
    console.log('📧 Revisa tu buzón de correo makitosriver@gmail.com (incluyendo Spam).');
  } else {
    console.log('\n⚠️  Algunas pruebas fallaron. Revisa la configuración de SendGrid.');
  }
}

runTests();
