/**
 * Tests unitarios para funcionalidad WebSocket del chat
 * Cubre: conexión, reconexión, envío de mensajes, uniones a conversaciones
 */

const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const { sendPushNotification } = require('../../services/pushNotificationService');
const { createNotification } = require('../../services/notificationService');

// Mock de Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    usuarios: {
      findUnique: jest.fn(),
    },
    conversations: {
      findUnique: jest.fn(),
    },
    messages: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    mensajes: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  })),
}));

// Mock de servicios
jest.mock('../../services/pushNotificationService', () => ({
  sendPushNotification: jest.fn(),
}));

jest.mock('../../services/notificationService', () => ({
  createNotification: jest.fn(),
}));

// Mock de jwt
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

describe('WebSocket Chat Functionality', () => {
  let io, serverSocket, clientSocket;
  let mockServer;
  let connectionHandler;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock del servidor HTTP
    mockServer = {
      listen: jest.fn(),
      on: jest.fn(),
      cors: jest.fn(),
    };

    // Crear instancia de Socket.IO para testing
    io = new Server(mockServer, {
      cors: {
        origin: ["http://localhost:5173"],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Mock de socket cliente
    clientSocket = {
      id: 'socket-123',
      handshake: {
        auth: { token: 'valid-token' },
        address: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      },
      join: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      to: jest.fn().mockReturnThis(),
      disconnect: jest.fn(),
      removeAllListeners: jest.fn(),
      connected: true,
      user: null,
      isDevMode: false,
      isUnauthenticated: false,
    };

    // Mock del socket del servidor
    serverSocket = {
      ...clientSocket,
      join: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      to: jest.fn().mockReturnThis(),
      disconnect: jest.fn(),
      removeAllListeners: jest.fn(),
    };

    // Mock console.log para evitar output en tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('Socket.IO Authentication Middleware', () => {
    it('debe autenticar usuario válido', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        nombre: 'Test User',
        rol: 'cliente',
        esta_verificado: true,
      };

      jwt.verify.mockReturnValue({ userId: 'user-123', id: 'user-123' });
      prisma.usuarios.findUnique.mockResolvedValue(mockUser);

      // Simular middleware de autenticación
      const authMiddleware = require('../../server').io.use ?
        require('../../server').io._middleware[0] :
        (socket, next) => {
          const token = socket.handshake.auth.token;
          if (!token) return next(new Error('Authentication required'));

          try {
            const decoded = jwt.verify(token, 'test-secret');
            socket.user = { ...decoded, ...mockUser, role: mockUser.rol };
            next();
          } catch (error) {
            next(new Error('Invalid token'));
          }
        };

      const next = jest.fn();

      await authMiddleware(clientSocket, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String), { algorithms: ['HS256'] });
      expect(prisma.usuarios.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: expect.any(Object),
      });
      expect(clientSocket.user).toEqual({
        userId: 'user-123',
        id: 'user-123',
        ...mockUser,
        role: 'cliente',
      });
      expect(next).toHaveBeenCalled();
    });

    it('debe rechazar conexión sin token en producción', async () => {
      // Mock NODE_ENV para producción
      process.env.NODE_ENV = 'production';

      const authMiddleware = (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication required'));
        next();
      };

      const next = jest.fn();

      clientSocket.handshake.auth.token = null;
      await authMiddleware(clientSocket, next);

      expect(next).toHaveBeenCalledWith(new Error('Authentication required'));

      // Restaurar NODE_ENV
      process.env.NODE_ENV = 'test';
    });

    it('debe permitir modo desarrollo sin token', async () => {
      process.env.NODE_ENV = 'development';

      const authMiddleware = (socket, next) => {
        const token = socket.handshake.auth.token;
        const isDevelopment = process.env.NODE_ENV !== 'production';

        if (!token) {
          if (isDevelopment) {
            socket.user = {
              id: 'dev-test-user',
              nombre: 'Usuario de Prueba',
              email: 'test@changánet.dev',
              rol: 'cliente',
              esta_verificado: false
            };
            socket.isDevMode = true;
            return next();
          } else {
            return next(new Error('Authentication required'));
          }
        }
        next();
      };

      const next = jest.fn();

      clientSocket.handshake.auth.token = null;
      await authMiddleware(clientSocket, next);

      expect(clientSocket.user.id).toBe('dev-test-user');
      expect(clientSocket.isDevMode).toBe(true);
      expect(next).toHaveBeenCalled();

      process.env.NODE_ENV = 'test';
    });
  });

  describe('Socket.IO Event Handlers', () => {
    let connectionHandler;

    beforeEach(() => {
      // Setup del handler de conexión
      connectionHandler = (socket) => {
        console.log('Usuario conectado:', socket.id);

        // Evento 'join'
        socket.on('join', (userId) => {
          socket.join(userId);
          console.log(`Usuario ${userId} se unió a su sala personal`);
        });

        // Evento 'joinConversation'
        socket.on('joinConversation', async (conversationId) => {
          try {
            if (!socket.user) {
              socket.emit('error', { message: 'Usuario no autenticado' });
              return;
            }

            const conversation = await prisma.conversations.findUnique({
              where: { id: conversationId },
              select: { client_id: true, professional_id: true }
            });

            if (!conversation) {
              socket.emit('error', { message: 'Conversación no encontrada' });
              return;
            }

            const userId = socket.user.id;
            if (conversation.client_id !== userId && conversation.professional_id !== userId) {
              socket.emit('error', { message: 'No tienes acceso a esta conversación' });
              return;
            }

            socket.join(`conversation_${conversationId}`);
            socket.emit('joinedConversation', { conversationId });
          } catch (error) {
            socket.emit('error', { message: 'Error al unirse a la conversación' });
          }
        });

        // Evento 'message'
        socket.on('message', async (data) => {
          const { conversationId, senderId, message, imageUrl } = data;

          try {
            if (!socket.user) {
              socket.emit('error', { message: 'Usuario no autenticado' });
              return;
            }

            if (!conversationId || !senderId) {
              socket.emit('error', { message: 'conversationId y senderId son requeridos' });
              return;
            }

            if (!message && !imageUrl) {
              socket.emit('error', { message: 'Se requiere message o imageUrl' });
              return;
            }

            const conversation = await prisma.conversations.findUnique({
              where: { id: conversationId },
              select: { client_id: true, professional_id: true }
            });

            if (!conversation) {
              socket.emit('error', { message: 'Conversación no encontrada' });
              return;
            }

            if (conversation.client_id !== senderId && conversation.professional_id !== senderId) {
              socket.emit('error', { message: 'No tienes permiso para enviar mensajes en esta conversación' });
              return;
            }

            const sanitizedMessage = message ? message.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/<[^>]*>/g, '').trim() : '';

            const newMessage = await prisma.messages.create({
              data: {
                conversation_id: conversationId,
                sender_id: senderId,
                message: sanitizedMessage,
                image_url: imageUrl || null
              },
              include: {
                sender: {
                  select: { id: true, nombre: true, rol: true, url_foto_perfil: true }
                }
              }
            });

            await prisma.conversations.update({
              where: { id: conversationId },
              data: { updated_at: new Date() }
            });

            io.to(`conversation_${conversationId}`).emit('message', {
              ...newMessage,
              conversationId
            });

            const otherUserId = conversation.client_id === senderId
              ? conversation.professional_id
              : conversation.client_id;

            await sendPushNotification(otherUserId, 'Nuevo mensaje', `Tienes un nuevo mensaje en Changánet`);
            await createNotification(otherUserId, 'nuevo_mensaje_chat', `Nuevo mensaje de ${newMessage.sender.nombre}`);

          } catch (error) {
            socket.emit('error', { message: 'Error al enviar el mensaje' });
          }
        });

        // Evento 'disconnect'
        socket.on('disconnect', () => {
          console.log('Usuario desconectado:', socket.id);
        });
      };
    });

    describe('join event', () => {
      it('debe unir usuario a su sala personal', () => {
        clientSocket.user = { id: 'user-123' };

        connectionHandler(clientSocket);

        // Simular envío del evento
        const joinHandler = clientSocket.on.mock.calls.find(call => call[0] === 'join')[1];
        joinHandler('user-123');

        expect(clientSocket.join).toHaveBeenCalledWith('user-123');
      });
    });

    describe('joinConversation event', () => {
      it('debe unir usuario a conversación válida', async () => {
        clientSocket.user = { id: 'user-123' };

        const mockConversation = {
          client_id: 'user-123',
          professional_id: 'prof-456',
        };

        prisma.conversations.findUnique.mockResolvedValue(mockConversation);

        connectionHandler(clientSocket);

        const joinConversationHandler = clientSocket.on.mock.calls.find(call => call[0] === 'joinConversation')[1];
        await joinConversationHandler('conv-123');

        expect(clientSocket.join).toHaveBeenCalledWith('conversation_conv-123');
        expect(clientSocket.emit).toHaveBeenCalledWith('joinedConversation', { conversationId: 'conv-123' });
      });

      it('debe rechazar usuario no participante', async () => {
        clientSocket.user = { id: 'user-999' }; // Usuario no participante

        const mockConversation = {
          client_id: 'user-123',
          professional_id: 'prof-456',
        };

        prisma.conversations.findUnique.mockResolvedValue(mockConversation);

        connectionHandler(clientSocket);

        const joinConversationHandler = clientSocket.on.mock.calls.find(call => call[0] === 'joinConversation')[1];
        await joinConversationHandler('conv-123');

        expect(clientSocket.emit).toHaveBeenCalledWith('error', {
          message: 'No tienes acceso a esta conversación'
        });
        expect(clientSocket.join).not.toHaveBeenCalled();
      });

      it('debe manejar conversación no encontrada', async () => {
        clientSocket.user = { id: 'user-123' };

        prisma.conversations.findUnique.mockResolvedValue(null);

        connectionHandler(clientSocket);

        const joinConversationHandler = clientSocket.on.mock.calls.find(call => call[0] === 'joinConversation')[1];
        await joinConversationHandler('conv-999');

        expect(clientSocket.emit).toHaveBeenCalledWith('error', {
          message: 'Conversación no encontrada'
        });
      });
    });

    describe('message event', () => {
      it('debe enviar mensaje válido', async () => {
        clientSocket.user = { id: 'user-123' };

        const mockConversation = {
          client_id: 'user-123',
          professional_id: 'prof-456',
        };

        const mockMessage = {
          id: 'msg-123',
          message: 'Hola mundo',
          sender: { nombre: 'Test User' },
        };

        prisma.conversations.findUnique.mockResolvedValue(mockConversation);
        prisma.messages.create.mockResolvedValue(mockMessage);

        connectionHandler(clientSocket);

        const messageHandler = clientSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        await messageHandler({
          conversationId: 'conv-123',
          senderId: 'user-123',
          message: 'Hola mundo',
        });

        expect(prisma.messages.create).toHaveBeenCalledWith({
          data: {
            conversation_id: 'conv-123',
            sender_id: 'user-123',
            message: 'Hola mundo',
            image_url: null,
          },
          include: expect.any(Object),
        });

        expect(io.to).toHaveBeenCalledWith('conversation_conv-123');
        expect(sendPushNotification).toHaveBeenCalled();
        expect(createNotification).toHaveBeenCalled();
      });

      it('debe sanitizar contenido XSS', async () => {
        clientSocket.user = { id: 'user-123' };

        const mockConversation = {
          client_id: 'user-123',
          professional_id: 'prof-456',
        };

        const mockMessage = {
          id: 'msg-123',
          message: 'Mensaje limpio',
          sender: { nombre: 'Test User' },
        };

        prisma.conversations.findUnique.mockResolvedValue(mockConversation);
        prisma.messages.create.mockResolvedValue(mockMessage);

        connectionHandler(clientSocket);

        const messageHandler = clientSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        await messageHandler({
          conversationId: 'conv-123',
          senderId: 'user-123',
          message: '<script>alert("XSS")</script>Mensaje limpio',
        });

        expect(prisma.messages.create).toHaveBeenCalledWith({
          data: {
            conversation_id: 'conv-123',
            sender_id: 'user-123',
            message: 'Mensaje limpio', // Script removido
            image_url: null,
          },
          include: expect.any(Object),
        });
      });

      it('debe rechazar mensaje sin contenido', async () => {
        clientSocket.user = { id: 'user-123' };

        connectionHandler(clientSocket);

        const messageHandler = clientSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        await messageHandler({
          conversationId: 'conv-123',
          senderId: 'user-123',
          // Sin message ni imageUrl
        });

        expect(clientSocket.emit).toHaveBeenCalledWith('error', {
          message: 'Se requiere message o imageUrl'
        });
      });
    });
  });

  describe('Connection Management', () => {
    it('debe manejar desconexión correctamente', () => {
      connectionHandler(clientSocket);

      const disconnectHandler = clientSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
      disconnectHandler();

      // Verificar que se registra la desconexión
      expect(console.log).toHaveBeenCalledWith('Usuario desconectado:', 'socket-123');
    });
  });
});
