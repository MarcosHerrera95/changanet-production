/**
 * Pruebas unitarias para verificationService.js
 * Cubre: REQ-36, REQ-37, REQ-40, RB-05 (Verificación de identidad)
 * Incluye validación de archivos, estados del proceso, casos edge
 */

const { PrismaClient } = require('@prisma/client');
const verificationService = require('../../src/services/verificationService');
const { storageService } = require('../../src/services/storageService');

jest.mock('@prisma/client');
jest.mock('../../src/services/storageService');

const mockPrisma = {
  usuarios: {
    findUnique: jest.fn(),
  },
  perfiles_profesionales: {
    update: jest.fn(),
  },
  verification_requests: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
};

PrismaClient.mockImplementation(() => mockPrisma);

describe('Verification Service - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storageService.uploadDocument = jest.fn();
  });

  describe('createVerificationRequest', () => {
    test('debe crear solicitud de verificación exitosamente', async () => {
      const mockUser = {
        id: 'user-123',
        rol: 'profesional',
        perfil_profesional: { id: 'profile-123' }
      };

      const mockDocumentUrl = 'https://cloudinary.com/document.jpg';
      const mockVerificationRequest = {
        id: 'verification-123',
        usuario_id: 'user-123',
        documento_url: mockDocumentUrl,
        estado: 'pendiente'
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockUser);
      storageService.uploadDocument.mockResolvedValue(mockDocumentUrl);
      mockPrisma.verification_requests.create.mockResolvedValue(mockVerificationRequest);

      const result = await verificationService.createVerificationRequest(
        'user-123',
        Buffer.from('document content'),
        'document.jpg',
        'image/jpeg'
      );

      expect(result).toEqual(mockVerificationRequest);
      expect(storageService.uploadDocument).toHaveBeenCalledWith(
        expect.any(Buffer),
        'document.jpg',
        'image/jpeg',
        'user-123'
      );
    });

    test('debe rechazar usuario no profesional', async () => {
      const mockUser = {
        id: 'user-123',
        rol: 'cliente'
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockUser);

      await expect(
        verificationService.createVerificationRequest(
          'user-123',
          Buffer.from('document'),
          'document.jpg',
          'image/jpeg'
        )
      ).rejects.toThrow('Solo los profesionales pueden solicitar verificación');
    });

    test('debe rechazar solicitud duplicada pendiente', async () => {
      const mockUser = {
        id: 'user-123',
        rol: 'profesional'
      };

      const mockExistingRequest = {
        id: 'verification-123',
        estado: 'pendiente'
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockUser);
      mockPrisma.verification_requests.findUnique.mockResolvedValue(mockExistingRequest);

      await expect(
        verificationService.createVerificationRequest(
          'user-123',
          Buffer.from('document'),
          'document.jpg',
          'image/jpeg'
        )
      ).rejects.toThrow('Ya existe una solicitud de verificación pendiente');
    });

    test('debe rechazar solicitud de usuario ya verificado', async () => {
      const mockUser = {
        id: 'user-123',
        rol: 'profesional'
      };

      const mockExistingRequest = {
        id: 'verification-123',
        estado: 'aprobado'
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockUser);
      mockPrisma.verification_requests.findUnique.mockResolvedValue(mockExistingRequest);

      await expect(
        verificationService.createVerificationRequest(
          'user-123',
          Buffer.from('document'),
          'document.jpg',
          'image/jpeg'
        )
      ).rejects.toThrow('El usuario ya está verificado');
    });
  });

  describe('approveVerification', () => {
    test('debe aprobar solicitud exitosamente', async () => {
      const mockRequest = {
        id: 'verification-123',
        usuario_id: 'user-123',
        estado: 'pendiente',
        usuario: { id: 'user-123' }
      };

      const mockUpdatedRequest = {
        id: 'verification-123',
        estado: 'aprobado',
        revisado_en: new Date(),
        revisado_por: 'admin-123'
      };

      mockPrisma.verification_requests.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.verification_requests.update.mockResolvedValue(mockUpdatedRequest);

      const result = await verificationService.approveVerification('verification-123', 'admin-123', 'Documento válido');

      expect(result).toEqual(mockUpdatedRequest);
      expect(mockPrisma.perfiles_profesionales.update).toHaveBeenCalledWith({
        where: { usuario_id: 'user-123' },
        data: {
          estado_verificacion: 'verificado',
          verificado_en: expect.any(Date)
        }
      });
      expect(mockPrisma.usuarios.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { esta_verificado: true }
      });
    });

    test('debe rechazar aprobación de solicitud ya procesada', async () => {
      const mockRequest = {
        id: 'verification-123',
        estado: 'aprobado'
      };

      mockPrisma.verification_requests.findUnique.mockResolvedValue(mockRequest);

      await expect(
        verificationService.approveVerification('verification-123', 'admin-123')
      ).rejects.toThrow('La solicitud ya fue procesada');
    });
  });

  describe('rejectVerification', () => {
    test('debe rechazar solicitud con comentario', async () => {
      const mockRequest = {
        id: 'verification-123',
        usuario_id: 'user-123',
        estado: 'pendiente',
        usuario: { id: 'user-123' }
      };

      const mockUpdatedRequest = {
        id: 'verification-123',
        estado: 'rechazado',
        comentario_admin: 'Documento ilegible',
        revisado_en: new Date(),
        revisado_por: 'admin-123'
      };

      mockPrisma.verification_requests.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.verification_requests.update.mockResolvedValue(mockUpdatedRequest);

      const result = await verificationService.rejectVerification('verification-123', 'admin-123', 'Documento ilegible');

      expect(result).toEqual(mockUpdatedRequest);
      expect(mockPrisma.perfiles_profesionales.update).toHaveBeenCalledWith({
        where: { usuario_id: 'user-123' },
        data: { estado_verificacion: 'rechazado' }
      });
    });

    test('debe rechazar solicitud sin comentario', async () => {
      const mockRequest = {
        id: 'verification-123',
        estado: 'pendiente'
      };

      mockPrisma.verification_requests.findUnique.mockResolvedValue(mockRequest);

      await expect(
        verificationService.rejectVerification('verification-123', 'admin-123', '')
      ).rejects.toThrow('Se requiere un comentario explicando el rechazo');
    });
  });

  describe('createVerificationRequestFromKey', () => {
    test('debe crear solicitud usando fileKey de GCS exitosamente', async () => {
      const mockUser = {
        id: 'user-123',
        rol: 'profesional',
        perfil_profesional: { id: 'profile-123' }
      };

      const mockVerificationRequest = {
        id: 'verification-123',
        usuario_id: 'user-123',
        documento_url: 'gs://bucket/file-key',
        estado: 'pendiente'
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockUser);
      mockPrisma.verification_requests.findUnique.mockResolvedValue(null);
      mockPrisma.verification_requests.create.mockResolvedValue(mockVerificationRequest);

      const result = await verificationService.createVerificationRequestFromKey('user-123', 'gs://bucket/file-key');

      expect(result).toEqual(mockVerificationRequest);
      expect(mockPrisma.verification_requests.create).toHaveBeenCalledWith({
        data: {
          usuario_id: 'user-123',
          documento_url: 'gs://bucket/file-key',
          estado: 'pendiente'
        }
      });
    });

    test('debe rechazar creación con fileKey si usuario no existe', async () => {
      mockPrisma.usuarios.findUnique.mockResolvedValue(null);

      await expect(
        verificationService.createVerificationRequestFromKey('user-123', 'gs://bucket/file-key')
      ).rejects.toThrow('Usuario no encontrado');
    });
  });

  describe('getPendingVerifications', () => {
    test('debe retornar lista de solicitudes pendientes con datos de usuario', async () => {
      const mockRequests = [
        {
          id: 'verification-123',
          estado: 'pendiente',
          creado_en: new Date(),
          usuario: {
            id: 'user-123',
            nombre: 'Juan Pérez',
            email: 'juan@example.com',
            perfil_profesional: {
              especialidad: 'plomero',
              zona_cobertura: 'Buenos Aires'
            }
          }
        }
      ];

      mockPrisma.verification_requests.findMany.mockResolvedValue(mockRequests);

      const result = await verificationService.getPendingVerifications();

      expect(result).toEqual(mockRequests);
      expect(mockPrisma.verification_requests.findMany).toHaveBeenCalledWith({
        where: { estado: 'pendiente' },
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              perfil_profesional: {
                select: {
                  especialidad: true,
                  zona_cobertura: true
                }
              }
            }
          }
        },
        orderBy: { creado_en: 'asc' }
      });
    });

    test('debe retornar lista vacía cuando no hay solicitudes pendientes', async () => {
      mockPrisma.verification_requests.findMany.mockResolvedValue([]);

      const result = await verificationService.getPendingVerifications();

      expect(result).toEqual([]);
    });
  });

  describe('getVerificationStatus', () => {
    test('debe retornar estado de solicitud existente', async () => {
      const mockRequest = {
        id: 'verification-123',
        estado: 'pendiente',
        documento_url: 'https://cloudinary.com/doc.jpg',
        comentario_admin: null,
        creado_en: new Date(),
        revisado_en: null
      };

      mockPrisma.verification_requests.findUnique.mockResolvedValue(mockRequest);

      const result = await verificationService.getVerificationStatus('user-123');

      expect(result).toEqual({
        id: 'verification-123',
        estado: 'pendiente',
        documento_url: 'https://cloudinary.com/doc.jpg',
        comentario_admin: null,
        creado_en: expect.any(Date),
        revisado_en: null,
        revisado_por: undefined
      });
    });

    test('debe retornar estado "no_solicitado" para usuario sin solicitud', async () => {
      mockPrisma.verification_requests.findUnique.mockResolvedValue(null);

      const result = await verificationService.getVerificationStatus('user-123');

      expect(result).toEqual({
        estado: 'no_solicitado',
        documento_url: null,
        comentario_admin: null,
        creado_en: null,
        revisado_en: null
      });
    });
  });

  describe('Casos Edge y Validación de Archivos', () => {
    test('debe manejar error de usuario no encontrado', async () => {
      mockPrisma.usuarios.findUnique.mockResolvedValue(null);

      await expect(
        verificationService.createVerificationRequest(
          'user-999',
          Buffer.from('document'),
          'document.jpg',
          'image/jpeg'
        )
      ).rejects.toThrow('Usuario no encontrado');
    });

    test('debe manejar error de subida de documento', async () => {
      const mockUser = {
        id: 'user-123',
        rol: 'profesional',
        perfil_profesional: { id: 'profile-123' }
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockUser);
      mockPrisma.verification_requests.findUnique.mockResolvedValue(null);
      storageService.uploadDocument.mockRejectedValue(new Error('Error de subida'));

      await expect(
        verificationService.createVerificationRequest(
          'user-123',
          Buffer.from('document'),
          'document.jpg',
          'image/jpeg'
        )
      ).rejects.toThrow('Error de subida');
    });

    test('debe manejar error de base de datos en creación', async () => {
      const mockUser = {
        id: 'user-123',
        rol: 'profesional',
        perfil_profesional: { id: 'profile-123' }
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockUser);
      mockPrisma.verification_requests.findUnique.mockResolvedValue(null);
      storageService.uploadDocument.mockResolvedValue('https://cloudinary.com/doc.jpg');
      mockPrisma.verification_requests.create.mockRejectedValue(new Error('Error de BD'));

      await expect(
        verificationService.createVerificationRequest(
          'user-123',
          Buffer.from('document'),
          'document.jpg',
          'image/jpeg'
        )
      ).rejects.toThrow('Error de BD');
    });

    test('debe manejar error en aprobación cuando solicitud no existe', async () => {
      mockPrisma.verification_requests.findUnique.mockResolvedValue(null);

      await expect(
        verificationService.approveVerification('verification-999', 'admin-123')
      ).rejects.toThrow('Solicitud de verificación no encontrada');
    });

    test('debe manejar error en rechazo cuando solicitud no existe', async () => {
      mockPrisma.verification_requests.findUnique.mockResolvedValue(null);

      await expect(
        verificationService.rejectVerification('verification-999', 'admin-123', 'Comentario')
      ).rejects.toThrow('Solicitud de verificación no encontrada');
    });
  });
});
