/**
 * Controlador de Chat - Sistema de Conversaciones y Mensajes
 * Implementa el sistema completo de mensajería interna con conversaciones
 */

const { PrismaClient } = require('@prisma/client');
const { createNotification } = require('../services/notificationService');
const {
  cacheUserConversations,
  getCachedUserConversations,
  invalidateUserConversations,
  cacheConversationMessages,
  getCachedConversationMessages,
  invalidateConversationMessages
} = require('../services/cacheService');
const prisma = new PrismaClient();

/**
 * Sanitizar entrada de texto para prevenir XSS y otros ataques
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim();
}

/**
 * Crear una nueva conversación entre cliente y profesional
 * POST /api/chat/conversations
 */
exports.createConversation = async (req, res) => {
  const { id: currentUserId } = req.user;
  const { clientId, professionalId } = req.body;

  try {
    // Validar parámetros
    if (!clientId || !professionalId) {
      return res.status(400).json({
        error: 'Se requieren clientId y professionalId'
      });
    }

    // Validar UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clientId) || !uuidRegex.test(professionalId)) {
      return res.status(400).json({
        error: 'clientId y professionalId deben ser UUIDs válidos'
      });
    }

    // Verificar que el usuario actual es participante
    if (currentUserId !== clientId && currentUserId !== professionalId) {
      return res.status(403).json({
        error: 'No tienes permiso para crear esta conversación'
      });
    }

    // Verificar que los usuarios existen y tienen roles correctos
    const [client, professional] = await Promise.all([
      prisma.usuarios.findUnique({
        where: { id: clientId },
        select: { id: true, rol: true, nombre: true }
      }),
      prisma.usuarios.findUnique({
        where: { id: professionalId },
        select: { id: true, rol: true, nombre: true }
      })
    ]);

    if (!client || !professional) {
      return res.status(404).json({
        error: 'Uno o ambos usuarios no existen'
      });
    }

    if (client.rol !== 'cliente' || professional.rol !== 'profesional') {
      return res.status(400).json({
        error: 'La conversación debe ser entre un cliente y un profesional'
      });
    }

    // Verificar si ya existe una conversación
    const existingConversation = await prisma.conversations.findFirst({
      where: {
        OR: [
          { client_id: clientId, professional_id: professionalId },
          { client_id: professionalId, professional_id: clientId } // por si acaso
        ]
      }
    });

    if (existingConversation) {
      return res.status(200).json({
        conversation: existingConversation,
        message: 'Conversación ya existe'
      });
    }

    // Crear la conversación
    const conversation = await prisma.conversations.create({
      data: {
        client_id: clientId,
        professional_id: professionalId
      }
    });

    res.status(201).json({
      conversation,
      message: 'Conversación creada exitosamente'
    });

  } catch (error) {
    console.error('Error creando conversación:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Listar conversaciones de un usuario
 * GET /api/chat/conversations/:userId
 */
exports.getUserConversations = async (req, res) => {
  const { id: currentUserId } = req.user;
  const { userId } = req.params;

  try {
    // Verificar que el usuario actual puede ver estas conversaciones
    if (currentUserId !== userId) {
      return res.status(403).json({
        error: 'No tienes permiso para ver estas conversaciones'
      });
    }

    // Intentar obtener del caché primero
    const cachedConversations = await getCachedUserConversations(userId);
    if (cachedConversations) {
      return res.status(200).json({
        conversations: cachedConversations,
        cached: true
      });
    }

    // Obtener conversaciones donde el usuario es cliente o profesional
    const conversations = await prisma.conversations.findMany({
      where: {
        OR: [
          { client_id: userId },
          { professional_id: userId }
        ]
      },
      include: {
        client: {
          select: { id: true, nombre: true, rol: true, url_foto_perfil: true }
        },
        professional: {
          select: { id: true, nombre: true, rol: true, url_foto_perfil: true }
        },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            id: true,
            message: true,
            image_url: true,
            status: true,
            created_at: true,
            sender: {
              select: { id: true, nombre: true }
            }
          }
        }
      },
      orderBy: { updated_at: 'desc' }
    });

    // Formatear respuesta
    const formattedConversations = conversations.map(conv => {
      const otherUser = conv.client_id === userId ? conv.professional : conv.client;
      const lastMessage = conv.messages[0];

      return {
        id: conv.id,
        otherUser,
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          message: lastMessage.message,
          image_url: lastMessage.image_url,
          status: lastMessage.status,
          created_at: lastMessage.created_at,
          sender: lastMessage.sender
        } : null,
        updated_at: conv.updated_at
      };
    });

    // Cachear el resultado
    await cacheUserConversations(userId, formattedConversations);

    res.status(200).json({
      conversations: formattedConversations,
      cached: false
    });

  } catch (error) {
    console.error('Error obteniendo conversaciones:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener historial de mensajes de una conversación con paginación cursor-based
 * GET /api/chat/messages/:conversationId
 */
exports.getConversationMessages = async (req, res) => {
  const { id: currentUserId } = req.user;
  const { conversationId } = req.params;
  const { cursor, limit = 20 } = req.query;

  try {
    // Verificar que la conversación existe y el usuario es participante
    const conversation = await prisma.conversations.findUnique({
      where: { id: conversationId },
      select: { client_id: true, professional_id: true }
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversación no encontrada'
      });
    }

    if (conversation.client_id !== currentUserId && conversation.professional_id !== currentUserId) {
      return res.status(403).json({
        error: 'No tienes acceso a esta conversación'
      });
    }

    const limitNum = parseInt(limit);
    const whereClause = cursor
      ? { conversation_id: conversationId, id: { lt: cursor } }
      : { conversation_id: conversationId };

    // Intentar obtener del caché si es la primera página
    if (!cursor) {
      const cachedMessages = await getCachedConversationMessages(conversationId);
      if (cachedMessages) {
        return res.status(200).json({
          ...cachedMessages,
          cached: true
        });
      }
    }

    // Obtener mensajes con paginación cursor-based
    const messages = await prisma.messages.findMany({
      where: whereClause,
      include: {
        sender: {
          select: { id: true, nombre: true, rol: true, url_foto_perfil: true }
        }
      },
      orderBy: { created_at: 'desc' },
      take: limitNum + 1 // +1 para determinar si hay más mensajes
    });

    // Determinar si hay más mensajes
    const hasMore = messages.length > limitNum;
    const messagesToReturn = hasMore ? messages.slice(0, limitNum) : messages;

    // Revertir orden para mostrar mensajes más antiguos primero
    messagesToReturn.reverse();

    // Cursor para la siguiente página (ID del último mensaje)
    const nextCursor = hasMore ? messages[limitNum - 1].id : null;

    const result = {
      messages: messagesToReturn,
      pagination: {
        hasMore,
        nextCursor,
        limit: limitNum
      }
    };

    // Cachear si es la primera página
    if (!cursor) {
      await cacheConversationMessages(conversationId, result);
    }

    res.status(200).json({
      ...result,
      cached: false
    });

  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Enviar un mensaje en una conversación
 * POST /api/chat/messages
 */
exports.sendMessage = async (req, res) => {
  const { id: currentUserId } = req.user;
  const { conversationId, message, imageUrl } = req.body;

  try {
    // Validar parámetros
    if (!conversationId) {
      return res.status(400).json({
        error: 'conversationId es requerido'
      });
    }

    if (!message && !imageUrl) {
      return res.status(400).json({
        error: 'Se requiere message o imageUrl'
      });
    }

    // Verificar que la conversación existe y el usuario es participante
    const conversation = await prisma.conversations.findUnique({
      where: { id: conversationId },
      select: { client_id: true, professional_id: true }
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversación no encontrada'
      });
    }

    if (conversation.client_id !== currentUserId && conversation.professional_id !== currentUserId) {
      return res.status(403).json({
        error: 'No tienes permiso para enviar mensajes en esta conversación'
      });
    }

    // Sanitizar el mensaje
    const sanitizedMessage = message ? sanitizeInput(message) : '';

    // Crear el mensaje
    const newMessage = await prisma.messages.create({
      data: {
        conversation_id: conversationId,
        sender_id: currentUserId,
        message: sanitizedMessage,
        image_url: imageUrl || null
      },
      include: {
        sender: {
          select: { id: true, nombre: true, rol: true, url_foto_perfil: true }
        }
      }
    });

    // Actualizar updated_at de la conversación
    await prisma.conversations.update({
      where: { id: conversationId },
      data: { updated_at: new Date() }
    });

    // Invalidar caché de conversaciones para ambos participantes
    await invalidateUserConversations(conversation.client_id);
    await invalidateUserConversations(conversation.professional_id);

    // Invalidar caché de mensajes de la conversación
    await invalidateConversationMessages(conversationId);

    // Enviar notificación al otro participante
    const otherUserId = conversation.client_id === currentUserId
      ? conversation.professional_id
      : conversation.client_id;

    try {
      await createNotification(
        otherUserId,
        'nuevo_mensaje_chat',
        `Nuevo mensaje de ${newMessage.sender.nombre}`,
        {
          conversationId,
          messageId: newMessage.id,
          senderName: newMessage.sender.nombre,
          messageContent: newMessage.message.substring(0, 100)
        }
      );
    } catch (notificationError) {
      console.warn('Error enviando notificación de mensaje:', notificationError);
    }

    res.status(201).json({
      message: newMessage
    });

  } catch (error) {
    console.error('Error enviando mensaje:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Generar URL presigned para subir imagen a Firebase Storage
 * POST /api/chat/upload-image
 */
exports.generateUploadUrl = async (req, res) => {
  const { id: currentUserId } = req.user;
  const { fileName, fileType } = req.body;

  try {
    // Validar parámetros
    if (!fileName || !fileType) {
      return res.status(400).json({
        error: 'fileName y fileType son requeridos'
      });
    }

    // Validar tipo de archivo (solo imágenes)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({
        error: 'Tipo de archivo no permitido. Solo imágenes.'
      });
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const uniqueFileName = `chat_images/${currentUserId}/${timestamp}_${fileName}`;

    // Importar Firebase Admin
    const { storage } = require('../config/firebaseAdmin');

    if (!storage) {
      return res.status(500).json({
        error: 'Servicio de almacenamiento no disponible'
      });
    }

    // Obtener referencia al bucket
    const bucket = storage.bucket();

    // Crear referencia al archivo
    const file = bucket.file(uniqueFileName);

    // Generar URL firmada para subida (válida por 15 minutos)
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutos
      contentType: fileType,
    });

    res.status(200).json({
      uploadUrl,
      fileName: uniqueFileName,
      expiresIn: 15 * 60 * 1000 // 15 minutos en ms
    });

  } catch (error) {
    console.error('Error generando URL de upload:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};
