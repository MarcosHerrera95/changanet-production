/**
 * Controlador de Chat SIMPLIFICADO - Solo modelo mensajes
 * Chat directo usuario-a-usuario sin conversationId
 * Basado en parámetros de URL: /chat?user=<id_otro_usuario>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtiene el historial de mensajes entre dos usuarios
 * GET /api/chat/messages/:otherUserId
 */
exports.getMessages = async (req, res) => {
  const { id: currentUserId } = req.user;
  const { otherUserId } = req.params;

  try {
    console.log(`🔍 Obteniendo mensajes entre usuario ${currentUserId} y ${otherUserId}`);

    // Verificar que el otro usuario existe
    const otherUser = await prisma.usuarios.findUnique({
      where: { id: otherUserId },
      select: { id: true, nombre: true, rol: true, email: true }
    });

    if (!otherUser) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado',
        userId: otherUserId 
      });
    }

    // Obtener mensajes bidireccionales ordenados ascendente
    const messages = await prisma.mensajes.findMany({
      where: {
        OR: [
          { 
            remitente_id: String(currentUserId), 
            destinatario_id: String(otherUserId) 
          },
          { 
            remitente_id: String(otherUserId), 
            destinatario_id: String(currentUserId) 
          }
        ]
      },
      orderBy: { creado_en: 'asc' },
      include: {
        remitente: {
          select: { id: true, nombre: true, rol: true }
        }
      }
    });

    console.log(`✅ Encontrados ${messages.length} mensajes`);

    res.status(200).json({
      success: true,
      otherUser: {
        id: otherUser.id,
        nombre: otherUser.nombre,
        rol: otherUser.rol,
        email: otherUser.email
      },
      messages: messages.map(msg => ({
        id: msg.id,
        contenido: msg.contenido,
        remitente_id: msg.remitente_id,
        destinatario_id: msg.destinatario_id,
        remitente_nombre: msg.remitente.nombre,
        remitente_rol: msg.remitente.rol,
        creado_en: msg.creado_en,
        isFromCurrentUser: msg.remitente_id === currentUserId
      })),
      totalMessages: messages.length
    });

  } catch (error) {
    console.error('❌ Error al obtener mensajes:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al obtener mensajes' 
    });
  }
};

/**
 * Envía un nuevo mensaje
 * POST /api/chat/send
 */
exports.sendMessage = async (req, res) => {
  const { id: currentUserId } = req.user;
  const { destinatario_id, contenido } = req.body;

  try {
    console.log(`📤 Enviando mensaje de ${currentUserId} a ${destinatario_id}`);

    // Validar parámetros
    if (!destinatario_id || !contenido) {
      return res.status(400).json({ 
        error: 'Se requieren destinatario_id y contenido' 
      });
    }

    // No permitir enviar mensaje a sí mismo
    if (destinatario_id === currentUserId) {
      return res.status(400).json({ 
        error: 'No puedes enviarte un mensaje a ti mismo' 
      });
    }

    // Verificar que el destinatario existe
    const destinatario = await prisma.usuarios.findUnique({
      where: { id: destinatario_id },
      select: { id: true, nombre: true, rol: true }
    });

    if (!destinatario) {
      return res.status(404).json({ 
        error: 'Destinatario no encontrado',
        destinatario_id 
      });
    }

    // Verificar que el contenido no esté vacío
    if (contenido.trim().length === 0) {
      return res.status(400).json({ 
        error: 'El contenido del mensaje no puede estar vacío' 
      });
    }

    // Crear el mensaje
    const newMessage = await prisma.mensajes.create({
      data: {
        remitente_id: String(currentUserId),
        destinatario_id: String(destinatario_id),
        contenido: contenido.trim()
      },
      include: {
        remitente: {
          select: { id: true, nombre: true, rol: true }
        }
      }
    });

    console.log(`✅ Mensaje creado con ID: ${newMessage.id}`);

    // TODO: Aquí se podría agregar lógica para emitir vía Socket.IO
    // req.io.to(destinatario_id).emit('new_message', newMessage);

    res.status(201).json({
      success: true,
      message: 'Mensaje enviado correctamente',
      data: {
        id: newMessage.id,
        contenido: newMessage.contenido,
        remitente_id: newMessage.remitente_id,
        destinatario_id: newMessage.destinatario_id,
        remitente_nombre: newMessage.remitente.nombre,
        remitente_rol: newMessage.remitente.rol,
        creado_en: newMessage.creado_en
      }
    });

  } catch (error) {
    console.error('❌ Error al enviar mensaje:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al enviar mensaje' 
    });
  }
};

/**
 * Obtiene lista de usuarios con los que el usuario actual ha conversado
 * GET /api/chat/conversations-list
 */
exports.getConversationsList = async (req, res) => {
  const { id: userId } = req.user;

  try {
    console.log(`📋 Obteniendo lista de conversaciones para usuario ${userId}`);

    // Obtener usuarios con los que ha tenido conversaciones
    const conversations = await prisma.mensajes.groupBy({
      by: ['remitente_id', 'destinatario_id'],
      where: {
        OR: [
          { remitente_id: String(userId) },
          { destinatario_id: String(userId) }
        ]
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    // Procesar cada conversación para obtener información del usuario
    const processedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const otherUserId = conv.remitente_id === userId 
          ? conv.destinatario_id 
          : conv.remitente_id;

        // Obtener información del otro usuario
        const otherUser = await prisma.usuarios.findUnique({
          where: { id: otherUserId },
          select: { 
            id: true, 
            nombre: true, 
            rol: true,
            esta_verificado: true,
            url_foto_perfil: true
          }
        });

        if (!otherUser) return null;

        // Obtener el último mensaje
        const lastMessage = await prisma.mensajes.findFirst({
          where: {
            OR: [
              { 
                remitente_id: String(userId), 
                destinatario_id: String(otherUserId) 
              },
              { 
                remitente_id: String(otherUserId), 
                destinatario_id: String(userId) 
              }
            ]
          },
          orderBy: { creado_en: 'desc' }
        });

        return {
          userId: otherUser.id,
          nombre: otherUser.nombre,
          rol: otherUser.rol,
          verificado: otherUser.esta_verificado,
          foto_perfil: otherUser.url_foto_perfil,
          lastMessage: lastMessage ? {
            contenido: lastMessage.contenido,
            remitente_id: lastMessage.remitente_id,
            creado_en: lastMessage.creado_en
          } : null,
          messageCount: conv._count.id,
          isLastMessageFromMe: lastMessage?.remitente_id === userId
        };
      })
    );

    // Filtrar nulls y ordenar por último mensaje
    const validConversations = processedConversations
      .filter(conv => conv !== null)
      .sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.creado_en) - new Date(a.lastMessage.creado_en);
      });

    console.log(`✅ Encontradas ${validConversations.length} conversaciones`);

    res.status(200).json({
      success: true,
      conversations: validConversations,
      total: validConversations.length
    });

  } catch (error) {
    console.error('❌ Error al obtener lista de conversaciones:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al obtener conversaciones' 
    });
  }
};

module.exports = exports;
