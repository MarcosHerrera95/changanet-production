// src/routes/chatRoutes.js
// Rutas para el sistema completo de mensajería interna
// Implementa conversaciones, mensajes, WebSocket y notificaciones

const express = require('express');
const { authenticateToken } = require('../middleware/authenticate');
const rateLimit = require('express-rate-limit');
const {
  createConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  generateUploadUrl
} = require('../controllers/chatController');

const router = express.Router();

// Rate limiting para endpoints de chat
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 requests por ventana
  message: 'Demasiadas solicitudes de chat, por favor intenta más tarde.'
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // límite de 10 mensajes por minuto
  message: 'Demasiados mensajes enviados, por favor espera un momento.'
});

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Aplicar rate limiting general
router.use(chatLimiter);

// POST /api/chat/conversations
// Crear una nueva conversación entre cliente y profesional
router.post('/conversations', createConversation);

// GET /api/chat/conversations/:userId
// Listar todas las conversaciones de un usuario
router.get('/conversations/:userId', getUserConversations);

// GET /api/chat/messages/:conversationId
// Obtener historial paginado de mensajes de una conversación
router.get('/messages/:conversationId', getConversationMessages);

// POST /api/chat/messages
// Enviar un mensaje en una conversación
router.post('/messages', messageLimiter, sendMessage);

// POST /api/chat/upload-image
// Generar URL presigned para subir imagen
router.post('/upload-image', generateUploadUrl);

// GET /api/chat/resolve-conversation/:conversationId
// Endpoint de compatibilidad para resolver conversationIds con formato UUID o incorrecto
router.get('/resolve-conversation/:conversationId', async (req, res) => {
  const { id: currentUserId } = req.user;
  const { conversationId } = req.params;
  
  try {
    // Parsear el conversationId
    const parsedId = require('../controllers/chatController').parseConversationId
      ? require('../controllers/chatController').parseConversationId(conversationId)
      : parseConversationId(conversationId);
    
    if (parsedId.isValid) {
      // Si el formato es válido, redirigir a la conversación normal
      return res.status(200).json({
        status: 'valid',
        conversationId,
        message: 'Formato válido, usa /api/chat/conversation/',
        redirect: `/chat/${conversationId}`
      });
    }
    
    // Para formatos inválidos, intentar encontrar conversaciones por mensaje
    if (parsedId.format === 'uuid') {
      // Buscar mensajes relacionados con este UUID como remitente o destinatario
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const relatedMessages = await prisma.mensajes.findMany({
        where: {
          OR: [
            { remitente_id: conversationId },
            { destinatario_id: conversationId }
          ]
        },
        take: 5,
        orderBy: { creado_en: 'desc' }
      });
      
      if (relatedMessages.length > 0) {
        // Encontrar el otro usuario en la conversación
        const message = relatedMessages[0];
        const otherUserId = message.remitente_id === conversationId 
          ? message.destinatario_id 
          : message.remitente_id;
          
        // Crear conversationId válido (orden alfabético consistente)
        const participants = [String(currentUserId), String(otherUserId)].sort();
        const validConversationId = `${participants[0]}-${participants[1]}`;
        
        return res.status(200).json({
          status: 'resolved',
          originalConversationId: conversationId,
          resolvedConversationId: validConversationId,
          message: 'Conversación encontrada y resuelta automáticamente',
          redirect: `/chat/${validConversationId}`
        });
      }
    }
    
    // Si no se puede resolver
    return res.status(400).json({
      status: 'invalid',
      conversationId,
      message: 'No se pudo resolver este conversationId',
      suggestion: 'Usa el botón "Chat" desde dentro de la aplicación para generar un conversationId válido'
    });
    
  } catch (error) {
    console.error('Error resolviendo conversationId:', error);
    res.status(500).json({
      error: 'Error interno al resolver conversationId'
    });
  }
});

// Función auxiliar para parseo (en caso de que no esté exportada)
function parseConversationId(conversationId) {
  const parts = conversationId.split('-');
  
  if (parts.length === 2) {
    return {
      format: 'userId1-userId2',
      participant1: parts[0],
      participant2: parts[1],
      isValid: true
    };
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const fullId = parts.join('-');
  
  if (uuidRegex.test(fullId)) {
    return {
      format: 'uuid',
      uuid: fullId,
      isValid: false,
      error: 'conversationId con formato UUID no válido. Use el formato userId1-userId2'
    };
  }
  
  return {
    format: 'unknown',
    isValid: false,
    error: 'Formato de conversationId no reconocido'
  };
}

module.exports = router;
