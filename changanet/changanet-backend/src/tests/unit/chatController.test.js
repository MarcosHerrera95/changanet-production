/**
 * Tests unitarios para chatController.js
 * Cubre: envío/recepción de mensajes, carga de historial, permisos, subida de imágenes
 */

const { PrismaClient } = require('@prisma/client');
const chatController = require('../../controllers/chatController');
const { createNotification } = require('../../services/notificationService');

// Mock de Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    usuarios: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    conversations: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    messages: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  })),
}));

// Mock del servicio de notificaciones
jest.mock('../../services/notificationService', () => ({
  createNotification: jest.fn(),
}));

// Mock de Firebase Admin
jest.mock('../../config/firebaseAdmin', () => ({
  storage: {
    bucket: jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue({
        getSignedUrl: jest.fn(),
      }),
    }),
  },
}));

const prisma = new PrismaClient();

describe('Chat Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: { id: 'user-123' },
      body: {},
      params: {},
      query: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('createConversation', () => {
    it('debe crear una conversación exitosamente', async () => {
      const mockClient = { id: 'client-123', rol: 'cliente', nombre: 'Cliente Test' };
      const mockProfessional = { id: 'prof-456', rol: 'profesional', nombre: 'Profesional Test' };

      prisma.usuarios.findUnique
        .mockResolvedValueOnce(mockClient)
        .mockResolvedValueOnce(mockProfessional);

      prisma.conversations.findFirst.mockResolvedValue(null);

      const mockConversation = {
        id: 'conv-789',
        client_id: 'client-123',
        professional_id: 'prof-456',
      };
      prisma.conversations.create.mockResolvedValue(mockConversation);

      mockReq.body = { clientId: 'client-123', professionalId: 'prof-456' };

      await chatController.createConversation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        conversation: mockConversation,
        message: 'Conversación creada exitosamente',
      });
    });

    it('debe retornar conversación existente si ya existe', async () => {
      const mockClient = { id: 'client-123', rol: 'cliente', nombre: 'Cliente Test' };
      const mockProfessional = { id: 'prof-456', rol: 'profesional', nombre: 'Profesional Test' };

      prisma.usuarios.findUnique
        .mockResolvedValueOnce(mockClient)
        .mockResolvedValueOnce(mockProfessional);

      const existingConversation = {
        id: 'conv-789',
        client_id: 'client-123',
        professional_id: 'prof-456',
      };
      prisma.conversations.findFirst.mockResolvedValue(existingConversation);

      mockReq.body = { clientId: 'client-123', professionalId: 'prof-456' };

      await chatController.createConversation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        conversation: existingConversation,
        message: 'Conversación ya existe',
      });
    });

    it('debe retornar 400 si faltan parámetros', async () => {
      mockReq.body = { clientId: 'client-123' }; // Falta professionalId

      await chatController.createConversation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Se requieren clientId y professionalId',
      });
    });

    it('debe retornar 400 para UUIDs inválidos', async () => {
      mockReq.body = {
        clientId: 'invalid-uuid',
        professionalId: 'prof-456',
      };

      await chatController.createConversation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'clientId y professionalId deben ser UUIDs válidos',
      });
    });

    it('debe retornar 403 si usuario no es participante', async () => {
      const mockClient = { id: 'client-123', rol: 'cliente', nombre: 'Cliente Test' };
      const mockProfessional = { id: 'prof-456', rol: 'profesional', nombre: 'Profesional Test' };

      prisma.usuarios.findUnique
        .mockResolvedValueOnce(mockClient)
        .mockResolvedValueOnce(mockProfessional);

      mockReq.user.id = 'other-user-789'; // Usuario no participante
      mockReq.body = { clientId: 'client-123', professionalId: 'prof-456' };

      await chatController.createConversation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No tienes permiso para crear esta conversación',
      });
    });

    it('debe retornar 400 para roles incorrectos', async () => {
      const mockClient = { id: 'client-123', rol: 'profesional', nombre: 'Cliente Test' }; // Rol incorrecto
      const mockProfessional = { id: 'prof-456', rol: 'cliente', nombre: 'Profesional Test' }; // Rol incorrecto

      prisma.usuarios.findUnique
        .mockResolvedValueOnce(mockClient)
        .mockResolvedValueOnce(mockProfessional);

      mockReq.body = { clientId: 'client-123', professionalId: 'prof-456' };

      await chatController.createConversation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'La conversación debe ser entre un cliente y un profesional',
      });
    });
  });

  describe('getUserConversations', () => {
    it('debe retornar conversaciones del usuario', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          client_id: 'user-123',
          professional_id: 'prof-456',
          updated_at: new Date(),
          client: { id: 'user-123', nombre: 'Cliente', rol: 'cliente' },
          professional: { id: 'prof-456', nombre: 'Profesional', rol: 'profesional' },
          messages: [{ id: 'msg-1', message: 'Hola', created_at: new Date() }],
        },
      ];

      prisma.conversations.findMany.mockResolvedValue(mockConversations);

      mockReq.params.userId = 'user-123';

      await chatController.getUserConversations(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        conversations: expect.any(Array),
      });
    });

    it('debe retornar 403 si usuario no autorizado', async () => {
      mockReq.user.id = 'user-123';
      mockReq.params.userId = 'other-user-456';

      await chatController.getUserConversations(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No tienes permiso para ver estas conversaciones',
      });
    });
  });

  describe('getConversationMessages', () => {
    it('debe retornar mensajes con paginación', async () => {
      const mockConversation = { client_id: 'user-123', professional_id: 'prof-456' };
      const mockMessages = [
        { id: 'msg-1', message: 'Hola', sender: { nombre: 'Usuario' } },
      ];

      prisma.conversations.findUnique.mockResolvedValue(mockConversation);
      prisma.messages.findMany.mockResolvedValue(mockMessages);
      prisma.messages.count.mockResolvedValue(25);

      mockReq.params.conversationId = 'conv-123';
      mockReq.query = { page: '1', limit: '20' };

      await chatController.getConversationMessages(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        messages: mockMessages.reverse(),
        pagination: {
          page: 1,
          limit: 20,
          total: 25,
          pages: 2,
        },
      });
    });

    it('debe retornar 403 si usuario no es participante', async () => {
      const mockConversation = { client_id: 'other-123', professional_id: 'other-456' };

      prisma.conversations.findUnique.mockResolvedValue(mockConversation);

      mockReq.params.conversationId = 'conv-123';

      await chatController.getConversationMessages(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No tienes acceso a esta conversación',
      });
    });

    it('debe retornar 404 si conversación no existe', async () => {
      prisma.conversations.findUnique.mockResolvedValue(null);

      mockReq.params.conversationId = 'conv-123';

      await chatController.getConversationMessages(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Conversación no encontrada',
      });
    });
  });

  describe('sendMessage', () => {
    it('debe enviar mensaje exitosamente', async () => {
      const mockConversation = { client_id: 'user-123', professional_id: 'prof-456' };
      const mockMessage = {
        id: 'msg-123',
        message: 'Hola mundo',
        sender: { nombre: 'Usuario Test' },
      };

      prisma.conversations.findUnique.mockResolvedValue(mockConversation);
      prisma.messages.create.mockResolvedValue(mockMessage);
      createNotification.mockResolvedValue();

      mockReq.body = {
        conversationId: 'conv-123',
        message: 'Hola mundo',
      };

      await chatController.sendMessage(mockReq, mockRes);

      expect(prisma.messages.create).toHaveBeenCalledWith({
        data: {
          conversation_id: 'conv-123',
          sender_id: 'user-123',
          message: 'Hola mundo',
          image_url: null,
        },
        include: {
          sender: {
            select: { id: true, nombre: true, rol: true, url_foto_perfil: true },
          },
        },
      });

      expect(createNotification).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({ message: mockMessage });
    });

    it('debe enviar mensaje con imagen', async () => {
      const mockConversation = { client_id: 'user-123', professional_id: 'prof-456' };
      const mockMessage = {
        id: 'msg-123',
        message: '',
        image_url: 'https://example.com/image.jpg',
        sender: { nombre: 'Usuario Test' },
      };

      prisma.conversations.findUnique.mockResolvedValue(mockConversation);
      prisma.messages.create.mockResolvedValue(mockMessage);
      createNotification.mockResolvedValue();

      mockReq.body = {
        conversationId: 'conv-123',
        imageUrl: 'https://example.com/image.jpg',
      };

      await chatController.sendMessage(mockReq, mockRes);

      expect(prisma.messages.create).toHaveBeenCalledWith({
        data: {
          conversation_id: 'conv-123',
          sender_id: 'user-123',
          message: '',
          image_url: 'https://example.com/image.jpg',
        },
        include: {
          sender: {
            select: { id: true, nombre: true, rol: true, url_foto_perfil: true },
          },
        },
      });
    });

    it('debe sanitizar mensaje XSS', async () => {
      const mockConversation = { client_id: 'user-123', professional_id: 'prof-456' };
      const mockMessage = {
        id: 'msg-123',
        message: 'Mensaje sanitizado',
        sender: { nombre: 'Usuario Test' },
      };

      prisma.conversations.findUnique.mockResolvedValue(mockConversation);
      prisma.messages.create.mockResolvedValue(mockMessage);

      mockReq.body = {
        conversationId: 'conv-123',
        message: '<script>alert("XSS")</script>Mensaje limpio',
      };

      await chatController.sendMessage(mockReq, mockRes);

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

    it('debe retornar 400 si faltan conversationId', async () => {
      mockReq.body = { message: 'Hola' };

      await chatController.sendMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'conversationId es requerido',
      });
    });

    it('debe retornar 400 si no hay mensaje ni imagen', async () => {
      mockReq.body = { conversationId: 'conv-123' };

      await chatController.sendMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Se requiere message o imageUrl',
      });
    });

    it('debe retornar 403 si usuario no es participante', async () => {
      const mockConversation = { client_id: 'other-123', professional_id: 'other-456' };

      prisma.conversations.findUnique.mockResolvedValue(mockConversation);

      mockReq.body = {
        conversationId: 'conv-123',
        message: 'Hola',
      };

      await chatController.sendMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No tienes permiso para enviar mensajes en esta conversación',
      });
    });
  });

  describe('generateUploadUrl', () => {
    it('debe generar URL de subida exitosamente', async () => {
      const mockBucket = {
        file: jest.fn().mockReturnValue({
          getSignedUrl: jest.fn().mockResolvedValue(['https://signed-url.com']),
        }),
      };

      const { storage } = require('../../config/firebaseAdmin');
      storage.bucket.mockReturnValue(mockBucket);

      mockReq.body = {
        fileName: 'test-image.jpg',
        fileType: 'image/jpeg',
      };

      await chatController.generateUploadUrl(mockReq, mockRes);

      expect(mockBucket.file).toHaveBeenCalledWith(
        expect.stringContaining('chat_images/user-123/')
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        uploadUrl: 'https://signed-url.com',
        fileName: expect.any(String),
        expiresIn: 900000, // 15 minutos en ms
      });
    });

    it('debe retornar 400 para tipo de archivo no permitido', async () => {
      mockReq.body = {
        fileName: 'test-file.exe',
        fileType: 'application/exe',
      };

      await chatController.generateUploadUrl(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Tipo de archivo no permitido. Solo imágenes.',
      });
    });

    it('debe retornar 400 si faltan parámetros', async () => {
      mockReq.body = { fileName: 'test.jpg' }; // Falta fileType

      await chatController.generateUploadUrl(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'fileName y fileType son requeridos',
      });
    });
  });
});
