/**
 * @archivo src/services/smsService.js - Servicio de envío de SMS
 * @descripción Gestiona envío de mensajes SMS transaccionales usando Twilio (REQ-19, REQ-20)
 * @sprint Sprint 2 – Notificaciones y Comunicación
 * @tarjeta Tarjeta 4: [Backend] Implementar API de Chat en Tiempo Real
 * @impacto Social: Comunicación inmediata accesible para usuarios con dificultades visuales
 */

const twilio = require('twilio');

// Configuración de Twilio desde variables de entorno
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Inicializar cliente de Twilio con validación
let client;
if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.warn('⚠️ Credenciales de Twilio incompletas - SMS no se enviarán');
  client = null;
} else {
  client = twilio(accountSid, authToken);
  console.log('✅ Twilio configurado correctamente');
}

/**
 * Valida si un número de teléfono está en formato E.164
 * @param {string} phoneNumber - Número de teléfono a validar
 * @returns {boolean} - True si es válido, false en caso contrario
 */
function isValidE164(phoneNumber) {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

/**
 * Envía un SMS usando Twilio
 * @param {string} to - Número de teléfono destino en formato E.164
 * @param {string} message - Mensaje a enviar
 * @returns {Promise<Object>} - Resultado del envío
 */
/**
 * @función sendSMS - Envío de SMS transaccional
 * @descripción Envía mensaje SMS usando Twilio con validación E.164 (REQ-20)
 * @sprint Sprint 2 – Notificaciones y Comunicación
 * @tarjeta Tarjeta 4: [Backend] Implementar API de Chat en Tiempo Real
 * @impacto Ambiental: Comunicación digital sin consumo de papel
 * @param {string} to - Número de teléfono en formato E.164
 * @param {string} message - Contenido del mensaje
 * @returns {Promise<Object>} Resultado del envío
 */
async function sendSMS(to, message) {
   try {
     if (!client) {
       console.warn('⚠️ Twilio no configurado - SMS no enviado');
       return { success: false, error: 'Twilio no configurado' };
     }

     // Validar formato E.164
     if (!isValidE164(to)) {
       throw new Error(`Número de teléfono inválido: ${to}. Debe estar en formato E.164 (ej: +5491112345678)`);
     }

     // Agregar disclaimer legal al mensaje
     const fullMessage = `${message}\n\nResponde STOP para no recibir más mensajes.`;

     // Enviar SMS
     const result = await client.messages.create({
       body: fullMessage,
       from: twilioPhoneNumber,
       to: to
     });

    console.log(`SMS enviado exitosamente a ${to}. SID: ${result.sid}`);

    // REGISTRAR MÉTRICA DE SMS ENVIADO EN SENTRY
    const { captureMessage } = require('./sentryService');
    captureMessage('SMS enviado exitosamente en Changánet', 'info', {
      tags: {
        event: 'sms_sent',
        business_metric: 'communication',
        service: 'twilio'
      },
      extra: {
        to: to,
        sid: result.sid,
        status: result.status,
        message_length: fullMessage.length,
        timestamp: new Date().toISOString(),
        business_impact: 'social_economic'
      }
    });

    // INCREMENTAR MÉTRICA DE PROMETHEUS PARA SMS ENVIADO
    const { incrementSmsSent, incrementTripleImpactActivity } = require('./metricsService');
    incrementSmsSent('exitoso', 'notificacion');
    incrementTripleImpactActivity('social', 'sms_enviado');

    return {
      success: true,
      sid: result.sid,
      status: result.status,
      to: to
    };

  } catch (error) {
    console.error(`Error al enviar SMS a ${to}:`, error.message);

    // Manejo específico de errores de Twilio
    if (error.code) {
      switch (error.code) {
        case 21211:
          console.error('Número de teléfono inválido');
          break;
        case 21608:
          console.error('Número no verificado en Twilio (modo gratuito)');
          break;
        case 21614:
          console.error('Número no puede recibir SMS');
          break;
        default:
          console.error(`Error de Twilio (código ${error.code}): ${error.message}`);
      }
    }

    return {
      success: false,
      error: error.message,
      code: error.code || null,
      to: to
    };
  }
}

module.exports = {
  sendSMS,
  isValidE164
};
