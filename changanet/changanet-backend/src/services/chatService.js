// src/services/chatService.js
// Servicio para manejar la lógica del chat en tiempo real con Socket.IO
// Implementa sección 7.4 del PRD: Mensajería Interna
//
// FUNCIONES IMPLEMENTADAS:
// - saveMessage: Guardar mensaje en BD con validaciones
// - getMessageHistory: Obtener historial paginado entre dos usuarios
// - markMessagesAsRead: Marcar mensajes como leídos
// - notifyNewMessage: Enviar notificaciones de nuevos mensajes
//
// REQUERIMIENTOS CUBIERTOS:
// REQ-16: Chat interno - ✅ (Socket.IO en server.js)
// REQ-17: Mensajes de texto - ✅ (con límite de 1000 caracteres)
// REQ-18: Imágenes - ✅ (campo url_imagen)
// REQ-19: Notificaciones - ✅ (push y email)
// REQ-20: Historial - ✅ (con paginación)

const { PrismaClient } = require('@prisma/client');
const { sendNotification } = require('./notificationService');
const prisma = new PrismaClient();

// Función para guardar mensaje en la base de datos
const saveMessage = async (remitente_id, destinatario_id, contenido, url_imagen = null) => {
  try {
    // Validar entrada
    if (!remitente_id || !destinatario_id) {
      throw new Error('IDs de remitente y destinatario son requeridos');
    }

    if (!contenido && !url_imagen) {
      throw new Error('El mensaje debe tener contenido o imagen');
    }

    if (contenido && contenido.length > 1000) {
      throw new Error('El mensaje no puede exceder 1000 caracteres');
    }

    // Verificar que ambos usuarios existen
    const [remitente, destinatario] = await Promise.all([
      prisma.usuarios.findUnique({ where: { id: remitente_id } }),
      prisma.usuarios.findUnique({ where: { id: destinatario_id } })
    ]);

    if (!remitente || !destinatario) {
      throw new Error('Usuario remitente o destinatario no encontrado');
    }

    const message = await prisma.mensajes.create({
      data: {
        remitente_id,
        destinatario_id,
        contenido,
        url_imagen,
        esta_leido: false,
      },
    });
    return message;
  } catch (error) {
    console.error('Error al guardar mensaje:', error);
    throw error;
  }
};

// Función para obtener historial de mensajes entre dos usuarios
const getMessageHistory = async (userId1, userId2, limit = 50) => {
  try {
    // Validar parámetros
    if (!userId1 || !userId2) {
      throw new Error('IDs de usuario son requeridos');
    }

    if (limit < 1 || limit > 100) {
      limit = 50; // Valor por defecto razonable
    }

    const messages = await prisma.mensajes.findMany({
      where: {
        OR: [
          { remitente_id: userId1, destinatario_id: userId2 },
          { remitente_id: userId2, destinatario_id: userId1 },
        ],
      },
      orderBy: { creado_en: 'desc' },
      take: limit,
      include: {
        remitente: {
          select: { id: true, nombre: true }
        },
        destinatario: {
          select: { id: true, nombre: true }
        }
      }
    });
    return messages.reverse(); // Devolver en orden cronológico
  } catch (error) {
    console.error('Error al obtener historial de mensajes:', error);
    throw error;
  }
};

// Función para marcar mensajes como leídos
const markMessagesAsRead = async (remitente_id, destinatario_id) => {
  try {
    await prisma.mensajes.updateMany({
      where: {
        remitente_id,
        destinatario_id,
        esta_leido: false,
      },
      data: { esta_leido: true },
    });
  } catch (error) {
    console.error('Error al marcar mensajes como leídos:', error);
    throw error;
  }
};

// Función para enviar notificación de nuevo mensaje
const notifyNewMessage = async (destinatario_id, remitente_id) => {
  try {
    await sendNotification(destinatario_id, 'nuevo_mensaje', `Nuevo mensaje de usuario ${remitente_id}`);
  } catch (error) {
    console.error('Error al enviar notificación de mensaje:', error);
  }
};

module.exports = {
  saveMessage,
  getMessageHistory,
  markMessagesAsRead,
  notifyNewMessage,
};
