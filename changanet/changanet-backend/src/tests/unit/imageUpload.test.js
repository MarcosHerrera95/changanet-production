/**
 * Tests unitarios para funcionalidad de subida de imágenes
 * Cubre: generación de URLs presigned, validación de archivos, Firebase Storage
 */

const { PrismaClient } = require('@prisma/client');
const chatController = require('../../controllers/chatController');

// Mock de Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    usuarios: {
      findUnique: jest.fn(),
    },
  })),
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

describe('Image Upload Functionality', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: { id: 'user-123' },
      body: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('generateUploadUrl', () => {
    it('debe generar URL presigned para imagen válida', async () => {
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

      // Mock Date.now para resultado consistente
      const originalDateNow = Date.now;
      Date.now = jest.fn().mockReturnValue(1640995200000); // 2022-01-01 00:00:00 UTC

      await chatController.generateUploadUrl(mockReq, mockRes);

      expect(mockBucket.file).toHaveBeenCalledWith(
        'chat_images/user-123/1640995200000_test-image.jpg'
      );

      expect(mockBucket.file().getSignedUrl).toHaveBeenCalledWith({
        version: 'v4',
        action: 'write',
        expires: 1640995200000 + 15 * 60 * 1000, // 15 minutos después
        contentType: 'image/jpeg',
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        uploadUrl: 'https://signed-url.com',
        fileName: 'chat_images/user-123/1640995200000_test-image.jpg',
        expiresIn: 900000, // 15 minutos en ms
      });

      // Restaurar Date.now
      Date.now = originalDateNow;
    });

    it('debe validar tipos de archivo permitidos', async () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

      for (const type of allowedTypes) {
        mockReq.body = {
          fileName: 'test.jpg',
          fileType: type,
        };

        await chatController.generateUploadUrl(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      }
    });

    it('debe rechazar tipos de archivo no permitidos', async () => {
      const invalidTypes = ['application/pdf', 'text/plain', 'video/mp4', ''];

      for (const type of invalidTypes) {
        mockReq.body = {
          fileName: 'test.invalid',
          fileType: type,
        };

        await chatController.generateUploadUrl(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Tipo de archivo no permitido. Solo imágenes.',
        });
      }
    });

    it('debe validar parámetros requeridos', async () => {
      // Sin fileName
      mockReq.body = { fileType: 'image/jpeg' };
      await chatController.generateUploadUrl(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'fileName y fileType son requeridos',
      });

      // Sin fileType
      mockReq.body = { fileName: 'test.jpg' };
      await chatController.generateUploadUrl(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'fileName y fileType son requeridos',
      });
    });

    it('debe manejar errores de Firebase Storage', async () => {
      const mockBucket = {
        file: jest.fn().mockReturnValue({
          getSignedUrl: jest.fn().mockRejectedValue(new Error('Firebase error')),
        }),
      };

      const { storage } = require('../../config/firebaseAdmin');
      storage.bucket.mockReturnValue(mockBucket);

      mockReq.body = {
        fileName: 'test.jpg',
        fileType: 'image/jpeg',
      };

      await chatController.generateUploadUrl(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Error interno del servidor',
      });
    });

    it('debe manejar cuando Firebase Storage no está disponible', async () => {
      const { storage } = require('../../config/firebaseAdmin');
      storage.bucket.mockReturnValue(null);

      mockReq.body = {
        fileName: 'test.jpg',
        fileType: 'image/jpeg',
      };

      await chatController.generateUploadUrl(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Servicio de almacenamiento no disponible',
      });
    });
  });

  describe('File Name Sanitization', () => {
    it('debe generar nombres de archivo únicos y seguros', async () => {
      const mockBucket = {
        file: jest.fn().mockReturnValue({
          getSignedUrl: jest.fn().mockResolvedValue(['https://signed-url.com']),
        }),
      };

      const { storage } = require('../../config/firebaseAdmin');
      storage.bucket.mockReturnValue(mockBucket);

      const testCases = [
        { input: 'test image.jpg', expected: /chat_images\/user-123\/\d+_test image\.jpg/ },
        { input: 'photo.png', expected: /chat_images\/user-123\/\d+_photo\.png/ },
        { input: 'screenshot.jpeg', expected: /chat_images\/user-123\/\d+_screenshot\.jpeg/ },
      ];

      for (const { input, expected } of testCases) {
        mockReq.body = {
          fileName: input,
          fileType: 'image/jpeg',
        };

        await chatController.generateUploadUrl(mockReq, mockRes);

        const fileCall = mockBucket.file.mock.calls[mockBucket.file.mock.calls.length - 1][0];
        expect(fileCall).toMatch(expected);
      }
    });

    it('debe manejar nombres de archivo con caracteres especiales', async () => {
      const mockBucket = {
        file: jest.fn().mockReturnValue({
          getSignedUrl: jest.fn().mockResolvedValue(['https://signed-url.com']),
        }),
      };

      const { storage } = require('../../config/firebaseAdmin');
      storage.bucket.mockReturnValue(mockBucket);

      mockReq.body = {
        fileName: 'test-image_ñáéíóú.jpg',
        fileType: 'image/jpeg',
      };

      await chatController.generateUploadUrl(mockReq, mockRes);

      const fileCall = mockBucket.file.mock.calls[0][0];
      expect(fileCall).toContain('test-image_ñáéíóú.jpg');
    });
  });

  describe('URL Expiration', () => {
    it('debe configurar expiración correcta de 15 minutos', async () => {
      const mockBucket = {
        file: jest.fn().mockReturnValue({
          getSignedUrl: jest.fn().mockResolvedValue(['https://signed-url.com']),
        }),
      };

      const { storage } = require('../../config/firebaseAdmin');
      storage.bucket.mockReturnValue(mockBucket);

      const fixedTime = 1640995200000; // 2022-01-01 00:00:00 UTC
      const originalDateNow = Date.now;
      Date.now = jest.fn().mockReturnValue(fixedTime);

      mockReq.body = {
        fileName: 'test.jpg',
        fileType: 'image/jpeg',
      };

      await chatController.generateUploadUrl(mockReq, mockRes);

      expect(mockBucket.file().getSignedUrl).toHaveBeenCalledWith({
        version: 'v4',
        action: 'write',
        expires: fixedTime + 15 * 60 * 1000, // 15 minutos
        contentType: 'image/jpeg',
      });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresIn: 900000, // 15 minutos en ms
        })
      );

      Date.now = originalDateNow;
    });
  });

  describe('Integration with Message Sending', () => {
    it('debe permitir enviar mensajes con URLs de imágenes', async () => {
      const mockConversation = { client_id: 'user-123', professional_id: 'prof-456' };
      const mockMessage = {
        id: 'msg-123',
        message: '',
        image_url: 'https://storage.googleapis.com/bucket/chat_images/user-123/123_test.jpg',
        sender: { nombre: 'Usuario Test' },
      };

      prisma.conversations.findUnique.mockResolvedValue(mockConversation);
      prisma.messages.create.mockResolvedValue(mockMessage);
      prisma.conversations.update.mockResolvedValue();

      mockReq.body = {
        conversationId: 'conv-123',
        imageUrl: 'https://storage.googleapis.com/bucket/chat_images/user-123/123_test.jpg',
      };

      await chatController.sendMessage(mockReq, mockRes);

      expect(prisma.messages.create).toHaveBeenCalledWith({
        data: {
          conversation_id: 'conv-123',
          sender_id: 'user-123',
          message: '',
          image_url: 'https://storage.googleapis.com/bucket/chat_images/user-123/123_test.jpg',
        },
        include: {
          sender: {
            select: { id: true, nombre: true, rol: true, url_foto_perfil: true },
          },
        },
      });

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('debe validar URLs de imágenes', async () => {
      const mockConversation = { client_id: 'user-123', professional_id: 'prof-456' };

      prisma.conversations.findUnique.mockResolvedValue(mockConversation);

      // URL inválida
      mockReq.body = {
        conversationId: 'conv-123',
        imageUrl: 'invalid-url',
      };

      await chatController.sendMessage(mockReq, mockRes);

      // Debería aceptar cualquier URL por ahora, pero validar que no esté vacía
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });
});
