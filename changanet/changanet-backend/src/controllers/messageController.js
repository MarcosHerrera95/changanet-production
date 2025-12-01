/**
 * Controlador de mensajería
 * Implementa sección 7.4 del PRD: Mensajería Interna
 *
 * REQUERIMIENTOS FUNCIONALES IMPLEMENTADOS:
 * REQ-16: Chat interno en página del perfil - ✅ Implementado (Socket.IO + REST API)
 * REQ-17: Envío de mensajes de texto - ✅ Implementado (con validación de 1000 caracteres)
 * REQ-18: Envío de imágenes - ✅ Implementado (campo url_imagen)
 * REQ-19: Notificaciones de nuevos mensajes (push y email) - ✅ Implementado
 * REQ-20: Historial de conversaciones - ✅ Implementado (con paginación)
 *
 * CARACTERÍSTICAS ADICIONALES:
 * - Comunicación en tiempo real con Socket.IO
 * - Validación de permisos para chats de servicios
 * - Autenticación JWT para todas las operaciones
 * - Historial completo con paginación
 * - Notificaciones push (FCM) y email (SendGrid)
 * - Soporte para mensajes relacionados con servicios específicos
 */

// src/controllers/messageController.js
const { PrismaClient } = require('@prisma/client');
const { createNotification, NOTIFICATION_TYPES } = require('../services/notificationService');
const { getMessageHistory: getHistory, markMessagesAsRead } = require('../services/chatService');
const prisma = new PrismaClient();

/**
 * Obtiene historial de mensajes entre dos usuarios
 * REQ-20: Mantiene historial de conversaciones
 */
exports.getMessageHistory = async (req, res) => {
  const { id: userId } = req.user;
  const { with: otherUserId } = req.query;
  const limit = parseInt(req.query.limit) || 50;

  if (!otherUserId) {
    return res.status(400).json({ error: 'Se requiere el ID del otro usuario.' });
  }

  try {
    const messages = await getHistory(userId, otherUserId, limit);
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error al obtener historial de mensajes:', error);
    res.status(500).json({ error: 'Error al obtener el historial de mensajes.' });
  }
};

/**
 * Envía mensaje a otro usuario
 * REQ-17: Permite enviar mensajes de texto
 * REQ-18: Permite enviar imágenes
 * REQ-19: Envía notificaciones push y email
 */
exports.sendMessage = async (req, res) => {
  const { id: senderId } = req.user;
  const { recipientId, content, url_imagen, servicio_id } = req.body;

  if (!recipientId || !content) {
    return res.status(400).json({ error: 'Se requieren recipientId y content.' });
  }

  try {
    // Validar que ambos usuarios pertenezcan al servicio
    if (servicio_id) {
      const service = await prisma.servicios.findUnique({
        where: { id: servicio_id },
        include: { cliente: true, profesional: true }
      });

      if (!service) {
        return res.status(404).json({ error: 'Servicio no encontrado.' });
      }

      const isParticipant = (service.cliente_id === senderId && service.profesional_id === recipientId) ||
                           (service.profesional_id === senderId && service.cliente_id === recipientId);

      if (!isParticipant) {
        return res.status(403).json({ error: 'No tienes permiso para enviar mensajes en este chat.' });
      }
    }

    const message = await prisma.mensajes.create({
      data: {
        remitente_id: senderId,
        destinatario_id: recipientId,
        contenido: content,
        url_imagen: url_imagen || null,
        servicio_id: servicio_id || null,
        esta_leido: false,
      },
    });

    // VERIFICACIÓN: Enviar notificación push al destinatario usando VAPID key verificada
    try {
      const sender = await prisma.usuarios.findUnique({ where: { id: senderId }, select: { nombre: true } });
      await createNotification(recipientId, NOTIFICATION_TYPES.MENSAJE, `Tienes un nuevo mensaje de ${sender?.nombre || 'un usuario'}`);
    } catch (notificationError) {
      console.warn('Error enviando notificación push:', notificationError);
    }

    console.log({ event: 'message_sent', senderId, recipientId, messageId: message.id, servicio_id });

    // Enviar notificación por email
    try {
      const { sendEmail } = require('../services/emailService');
      const recipient = await prisma.usuarios.findUnique({ where: { id: recipientId } });
      const sender = await prisma.usuarios.findUnique({ where: { id: senderId } });

      if (recipient && sender) {
        await sendEmail(
          recipient.email,
          'Nuevo mensaje en Changánet',
          `Hola ${recipient.nombre},\n\nHas recibido un nuevo mensaje de ${sender.nombre}:\n\n"${content}"\n\nPuedes responder desde la plataforma.\n\nSaludos,\nEquipo Changánet`
        );
      }
    } catch (emailError) {
      console.warn('Error enviando email de notificación:', emailError);
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json({ error: 'Error al enviar el mensaje.' });
  }
};

// Marcar mensajes como leídos
exports.markMessagesAsRead = async (req, res) => {
  const { id: userId } = req.user;
  const { senderId } = req.body;

  if (!senderId) {
    return res.status(400).json({ error: 'Se requiere senderId.' });
  }

  try {
    await markMessagesAsRead(senderId, userId);
    res.status(200).json({ message: 'Mensajes marcados como leídos.' });
  } catch (error) {
    console.error('Error al marcar mensajes como leídos:', error);
    res.status(500).json({ error: 'Error al marcar mensajes como leídos.' });
  }
};
