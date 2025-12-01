// src/routes/messageRoutes.js
// Rutas para mensajería interna
// Implementa sección 7.4 del PRD: Mensajería Interna
//
// FUNCIONALIDADES IMPLEMENTADAS:
// - Chat en tiempo real con Socket.IO
// - API REST para operaciones de mensajes
// - Historial de conversaciones con paginación
// - Validación de permisos para chats de servicios
//
// ENDPOINTS:
// GET /api/messages?with=userId - Obtener historial con usuario
// POST /api/messages - Enviar mensaje (con soporte para servicio_id)
// PUT /api/messages/read - Marcar mensajes como leídos

const express = require('express');
const { authenticateToken } = require('../middleware/authenticate');
const {
  getMessageHistory,
  sendMessage,
  markMessagesAsRead
} = require('../controllers/messageController');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener historial de mensajes con otro usuario
// REQ-20: Mantiene historial de conversaciones
router.get('/', getMessageHistory);

// Enviar mensaje (usado principalmente por Socket.IO, pero disponible como REST API)
// REQ-17: Envío de mensajes de texto, REQ-18: Envío de imágenes
router.post('/', sendMessage);

// Marcar mensajes como leídos
router.put('/read', markMessagesAsRead);

module.exports = router;
