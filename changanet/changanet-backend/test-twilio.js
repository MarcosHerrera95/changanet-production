// test-twilio.js - Script de prueba para Twilio SMS
/**
 * @archivo test-twilio.js - Pruebas de envío de SMS con Twilio
 * @descripción Verifica funcionamiento de SMS transaccionales con validación E.164 (REQ-19, REQ-20)
 * @sprint Sprint 2 – Notificaciones y Comunicación
 * @tarjeta Tarjeta 4: [Backend] Implementar API de Chat en Tiempo Real
 * @impacto Social: Verificación de comunicaciones accesibles para usuarios con dificultades visuales
 */

require('dotenv').config({ path: './.env' });
const { sendSMS, isValidE164 } = require('./src/services/smsService');

async function testTwilioSMS() {
  console.log('🚀 Iniciando pruebas de Twilio SMS...\n');

  // Verificar credenciales
  console.log('📋 Verificando configuración:');
  console.log(`Account SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Configurado' : '❌ Faltante'}`);
  console.log(`Auth Token: ${process.env.TWILIO_AUTH_TOKEN ? '✅ Configurado' : '❌ Faltante'}`);
  console.log(`Phone Number: ${process.env.TWILIO_PHONE_NUMBER ? '✅ Configurado' : '❌ Faltante'}\n`);

  // Pruebas de validación E.164
  console.log('🔍 Probando validación de formato E.164:');
  const testNumbers = [
    '+5491134007759', // Tu número real
    '+5491112345678', // Argentina válido
    '+12175163344',  // Twilio válido
    '5491112345678',  // Sin +
    '+54911123456789', // Demasiados dígitos
    '+549111234567',  // Pocos dígitos
    'invalid',        // Inválido
  ];

  testNumbers.forEach(number => {
    const isValid = isValidE164(number);
    console.log(`${number}: ${isValid ? '✅ Válido' : '❌ Inválido'}`);
  });

  console.log('\n📱 Probando envío de SMS:');

  // Número verificado para pruebas (debe estar verificado en Twilio)
  // IMPORTANTE: Cambia este número por uno que esté verificado en tu cuenta Twilio
  const testPhoneNumber = process.env.TEST_PHONE_NUMBER || '+5491134007759';
  const testMessage = 'Prueba de Changánet: Este es un SMS de prueba para verificar la funcionalidad.';

  console.log(`\n⚠️  IMPORTANTE: El número ${testPhoneNumber} debe estar verificado en Twilio Console`);
  console.log('   📋 PASOS PARA VERIFICAR:');
  console.log('   1. Ve a: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
  console.log('   2. Haz clic en "Add a new Caller ID"');
  console.log('   3. Ingresa: +5491134007759 (sin espacios ni guiones)');
  console.log('   4. Twilio enviará un código por SMS a tu teléfono');
  console.log('   5. Ingresa el código de verificación');
  console.log('   6. El número aparecerá en la lista de "Verified Caller IDs"');
  console.log('   7. Vuelve a ejecutar este script\n');

  try {
    console.log(`Enviando SMS a: ${testPhoneNumber}`);
    const result = await sendSMS(testPhoneNumber, testMessage);

    if (result.success) {
      console.log('✅ SMS enviado exitosamente!');
      console.log(`SID: ${result.sid}`);
      console.log(`Estado: ${result.status}`);
      console.log(`Fecha de envío: ${new Date().toLocaleString('es-AR')}`);
      console.log('\n📱 Verifica en tu dispositivo móvil que hayas recibido el SMS.');
      console.log('   Si no lo recibes en 30 segundos, revisa:');
      console.log('   1. Que el número esté verificado en Twilio Console');
      console.log('   2. Que tengas cobertura de red móvil');
      console.log('   3. Que no haya bloqueo de SMS');
    } else {
      console.log('❌ Error al enviar SMS:');
      console.log(`Error: ${result.error}`);
      if (result.code) {
        console.log(`Código de error: ${result.code}`);
        console.log('\n🔧 Soluciones comunes:');
        switch (result.code) {
          case 21608:
            console.log('   • ERROR 21608: Número no verificado en cuenta trial');
            console.log('   • Twilio solo permite enviar SMS a números verificados en modo gratuito');
            console.log('   • SOLUCIÓN: Verifica +5491134007759 en Twilio Console');
            console.log('   • PASOS:');
            console.log('     1. Ve a: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
            console.log('     2. "Add a new Caller ID" → Ingresa +5491134007759');
            console.log('     3. Recibe código por SMS → Ingrésalo');
            console.log('     4. Vuelve a ejecutar: node test-twilio.js');
            break;
          case 20003:
            console.log('   • Verifica tus credenciales TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN');
            break;
          case 21211:
            console.log('   • El número debe estar en formato E.164 (+549XXXXXXXXXX)');
            break;
          default:
            console.log('   • Consulta la documentación de Twilio para el código de error');
        }
      }
    }
  } catch (error) {
    console.log('❌ Error inesperado:', error.message);
  }

  console.log('\n✨ Pruebas completadas.');
}

// Ejecutar pruebas
testTwilioSMS().catch(console.error);
