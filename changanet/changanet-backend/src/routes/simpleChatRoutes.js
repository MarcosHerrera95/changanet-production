// src/routes/simpleChatRoutes.js
// Rutas del chat SIMPLIFICADO - Solo modelo mensajes
// Chat directo usuario-a-usuario sin conversationId

const express = require('express');
const { authenticateToken } = require('../middleware/authenticate');
const {
  getMessages,
  sendMessage,
  getConversationsList
} = require('../controllers/simpleChatController');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /api/chat/messages/:otherUserId
// Obtiene el historial de mensajes entre el usuario actual y otro usuario
router.get('/messages/:otherUserId', getMessages);

// POST /api/chat/send
// Envía un nuevo mensaje
router.post('/send', sendMessage);

// GET /api/chat/conversations-list
// Obtiene lista de usuarios con los que ha conversado
router.get('/conversations-list', getConversationsList);

module.exports = router;
