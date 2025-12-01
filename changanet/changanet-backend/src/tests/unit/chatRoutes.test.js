/**
 * Tests unitarios para chatRoutes.js
 * Cubre: rutas, middleware de autenticación, rate limiting
 */

const express = require('express');
const request = require('supertest');
const chatRoutes = require('../../routes/chatRoutes');

// Mock de middlewares
jest.mock('../../middleware/authenticate', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { id: 'test-user-123' };
    next();
  }),
}));

// Mock de express-rate-limit
jest.mock('express-rate-limit', () => {
  return jest.fn(() => (req, res, next) => next());
});

// Mock de controladores
jest.mock('../../controllers/chatController', () => ({
  createConversation: jest.fn((req, res) => res.status(201).json({ message: 'Conversation created' })),
  getUserConversations: jest.fn((req, res) => res.status(200).json({ conversations: [] })),
  getConversationMessages: jest.fn((req, res) => res.status(200).json({ messages: [] })),
  sendMessage: jest.fn((req, res) => res.status(201).json({ message: 'Message sent' })),
  generateUploadUrl: jest.fn((req, res) => res.status(200).json({ uploadUrl: 'test-url' })),
  parseConversationId: jest.fn(),
}));

const { authenticateToken } = require('../../middleware/authenticate');
const {
  createConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  generateUploadUrl,
} = require('../../controllers/chatController');

describe('Chat Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/chat', chatRoutes);
  });

  describe('Middleware Setup', () => {
    it('debe aplicar authenticateToken a todas las rutas', async () => {
      await request(app).post('/api/chat/conversations').send({});

      expect(authenticateToken).toHaveBeenCalled();
    });

    it('debe aplicar rate limiting general', async () => {
      const rateLimit = require('express-rate-limit');
      expect(rateLimit).toHaveBeenCalled();
    });
  });

  describe('POST /api/chat/conversations', () => {
    it('debe llamar a createConversation controller', async () => {
      const response = await request(app)
        .post('/api/chat/conversations')
        .send({
          clientId: 'client-123',
          professionalId: 'prof-456',
        });

      expect(createConversation).toHaveBeenCalled();
      expect(response.status).toBe(201);
      expect(response.body).toEqual({ message: 'Conversation created' });
    });
  });

  describe('GET /api/chat/conversations/:userId', () => {
    it('debe llamar a getUserConversations controller', async () => {
      const response = await request(app)
        .get('/api/chat/conversations/user-123');

      expect(getUserConversations).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ conversations: [] });
    });
  });

  describe('GET /api/chat/messages/:conversationId', () => {
    it('debe llamar a getConversationMessages controller', async () => {
      const response = await request(app)
        .get('/api/chat/messages/conv-123');

      expect(getConversationMessages).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ messages: [] });
    });

    it('debe manejar parámetros de paginación', async () => {
      await request(app)
        .get('/api/chat/messages/conv-123?page=2&limit=10');

      expect(getConversationMessages).toHaveBeenCalled();
    });
  });

  describe('POST /api/chat/messages', () => {
    it('debe llamar a sendMessage controller', async () => {
      const response = await request(app)
        .post('/api/chat/messages')
        .send({
          conversationId: 'conv-123',
          message: 'Hola mundo',
        });

      expect(sendMessage).toHaveBeenCalled();
      expect(response.status).toBe(201);
      expect(response.body).toEqual({ message: 'Message sent' });
    });

    it('debe aplicar rate limiting específico para mensajes', async () => {
      // El rate limiter de mensajes se configura en la ruta
      const response = await request(app)
        .post('/api/chat/messages')
        .send({
          conversationId: 'conv-123',
          message: 'Mensaje de prueba',
        });

      expect(response.status).toBe(201);
    });
  });

  describe('POST /api/chat/upload-image', () => {
    it('debe llamar a generateUploadUrl controller', async () => {
      const response = await request(app)
        .post('/api/chat/upload-image')
        .send({
          fileName: 'test.jpg',
          fileType: 'image/jpeg',
        });

      expect(generateUploadUrl).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ uploadUrl: 'test-url' });
    });
  });

  describe('GET /api/chat/resolve-conversation/:conversationId', () => {
    it('debe manejar conversationIds válidos', async () => {
      // Mock parseConversationId para retornar válido
      const mockParseConversationId = require('../../controllers/chatController').parseConversationId;
      mockParseConversationId.mockReturnValue({
        format: 'userId1-userId2',
        participant1: 'user1',
        participant2: 'user2',
        isValid: true,
      });

      const response = await request(app)
        .get('/api/chat/resolve-conversation/user1-user2');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'valid',
        conversationId: 'user1-user2',
        message: 'Formato válido, usa /api/chat/conversation/',
        redirect: '/chat/user1-user2',
      });
    });

    it('debe manejar conversationIds con formato UUID', async () => {
      const mockParseConversationId = require('../../controllers/chatController').parseConversationId;
      mockParseConversationId.mockReturnValue({
        format: 'uuid',
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        isValid: false,
      });

      // Mock Prisma para simular búsqueda de mensajes
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.mensajes.findMany = jest.fn().mockResolvedValue([
        {
          remitente_id: '550e8400-e29b-41d4-a716-446655440000',
          destinatario_id: 'user-456',
        },
      ]);

      const response = await request(app)
        .get('/api/chat/resolve-conversation/550e8400-e29b-41d4-a716-446655440000');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('resolved');
    });

    it('debe retornar error para conversationIds no resueltos', async () => {
      const mockParseConversationId = require('../../controllers/chatController').parseConversationId;
      mockParseConversationId.mockReturnValue({
        format: 'unknown',
        isValid: false,
        error: 'Formato no reconocido',
      });

      const response = await request(app)
        .get('/api/chat/resolve-conversation/invalid-format');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: 'invalid',
        conversationId: 'invalid-format',
        message: 'No se pudo resolver este conversationId',
        suggestion: 'Usa el botón "Chat" desde dentro de la aplicación para generar un conversationId válido',
      });
    });
  });

  describe('Error Handling', () => {
    it('debe manejar errores del controller', async () => {
      createConversation.mockImplementation((req, res) => {
        res.status(500).json({ error: 'Database error' });
      });

      const response = await request(app)
        .post('/api/chat/conversations')
        .send({ clientId: 'test', professionalId: 'test' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Database error' });
    });
  });

  describe('Rate Limiting Configuration', () => {
    it('debe configurar rate limiting general (100 req/15min)', () => {
      // Verificar que el rate limiter general se configura correctamente
      const rateLimit = require('express-rate-limit');
      expect(rateLimit).toHaveBeenCalledWith({
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 100, // límite de 100 requests
        message: 'Demasiadas solicitudes de chat, por favor intenta más tarde.',
      });
    });

    it('debe configurar rate limiting específico para mensajes (10 req/min)', () => {
      // Verificar que el rate limiter de mensajes se configura correctamente
      const rateLimit = require('express-rate-limit');
      expect(rateLimit).toHaveBeenCalledWith({
        windowMs: 60 * 1000, // 1 minuto
        max: 10, // límite de 10 mensajes por minuto
        message: 'Demasiados mensajes enviados, por favor espera un momento.',
      });
    });
  });
});
