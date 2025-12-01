/**
 * @archivo src/controllers/contactController.js - Controlador de contacto
 * @descripción Maneja envío de mensajes de contacto (REQ-19)
 * @sprint Sprint 1 – Soporte y Comunicación
 * @tarjeta Tarjeta 5: [Backend] Implementar API de Contacto
 * @impacto Social: Comunicación efectiva con el equipo de soporte
 */

const { sendContactMessage } = require('../services/emailService');

/**
 * Envía un mensaje de contacto al equipo de soporte
 * @param {Object} req - Request con datos del formulario
 * @param {Object} res - Response
 */
exports.sendMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validar campos requeridos
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        error: 'Todos los campos son obligatorios'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Formato de email inválido'
      });
    }

    // Validar longitud del mensaje
    if (message.length < 10) {
      return res.status(400).json({
        error: 'El mensaje debe tener al menos 10 caracteres'
      });
    }

    // Enviar email de contacto
    await sendContactMessage({
      name,
      email,
      subject,
      message
    });

    // Log del mensaje recibido
    console.log(`Mensaje de contacto recibido de ${name} (${email}): ${subject}`);

    res.status(200).json({
      success: true,
      message: 'Mensaje enviado exitosamente'
    });

  } catch (error) {
    console.error('Error al enviar mensaje de contacto:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};
