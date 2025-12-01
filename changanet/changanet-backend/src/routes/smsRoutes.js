// src/routes/smsRoutes.js - Rutas para envío de SMS
const express = require('express');
const { sendSMS } = require('../services/smsService');

const router = express.Router();

/**
 * POST /api/sms/test
 * Envía un SMS de prueba (solo para desarrollo/testing)
 */
router.post('/test', async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requieren los campos "to" (número de teléfono) y "message"'
      });
    }

    // Validar que sea un número de teléfono válido (solo en desarrollo)
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'No permitido en producción',
        message: 'Esta ruta solo está disponible en desarrollo'
      });
    }

    const result = await sendSMS(to, message);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'SMS enviado exitosamente',
        data: {
          sid: result.sid,
          status: result.status,
          to: result.to
        }
      });
    } else {
      res.status(500).json({
        error: 'Error enviando SMS',
        message: result.error,
        code: result.code
      });
    }
  } catch (error) {
    console.error('Error en ruta SMS test:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

module.exports = router;
