/**
 * @archivo src/controllers/newsletterController.js - Controlador del newsletter
 * @descripción Maneja suscripciones al newsletter (REQ-19)
 * @sprint Sprint 1 – Comunicación y Engagement
 * @tarjeta Tarjeta 6: [Backend] Implementar API de Newsletter
 * @impacto Social: Captura de leads para contenido educativo
 */

const { sendNewsletterWelcomeEmail } = require('../services/emailService');

/**
 * Suscribe un email al newsletter
 * @param {Object} req - Request con email en body
 * @param {Object} res - Response
 */
exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    // Validar que el email esté presente
    if (!email) {
      return res.status(400).json({
        error: 'El email es obligatorio'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Formato de email inválido'
      });
    }

    // Validar dominio básico (no permitir emails temporales comunes)
    const tempDomains = ['10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'temp-mail.org'];
    const domain = email.split('@')[1]?.toLowerCase();
    if (tempDomains.includes(domain)) {
      return res.status(400).json({
        error: 'Por favor usa un email válido y permanente'
      });
    }

    // Enviar email de bienvenida
    await sendNewsletterWelcomeEmail(email);

    // Log de suscripción
    console.log(`Nueva suscripción al newsletter: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Suscripción exitosa'
    });

  } catch (error) {
    console.error('Error al procesar suscripción:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};
