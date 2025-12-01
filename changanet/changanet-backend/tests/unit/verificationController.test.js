/**
 * Pruebas unitarias para verificationController.js
 * Cubre: REQ-36, REQ-37, REQ-40 (Controlador de verificación)
 * Incluye manejo de requests HTTP, validación de permisos, respuestas
 */

const verificationController = require('../../src/controllers/verificationController');
const verificationService = require('../../src/services/verificationService');
const { storageService } = require('../../src/services/storageService');
const { logDocumentAccess, logDocumentUpload, logVerificationApproval, logVerificationRejection } = require('../../src/services/auditService');

jest.mock('../../src/services/verificationService');
jest.mock('../../src/services/storageService');
jest.mock('../../src/services/auditService');

describe('Verification Controller - Unit Tests', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: { id: 'user-123', rol: 'profesional' },
      body: {},
      params: {},
      ip: '127.0.0.1',
      get: jest.fn(() => 'Mozilla/5.0')
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('requestVerification', () => {
    test('debe procesar solicitud de verificación exitosamente', async () => {
      const mockVerificationRequest = {
        id: 'verification-123',
        estado: 'pendiente',
        documento_url: 'gs://bucket/file-key',
        creado_en: new Date()
      };

      mockReq.body.fileKey = 'gs://bucket/file-key';
      verificationService.createVerificationRequestFromKey.mockResolvedValue(mockVerificationRequest);

      await verificationController.requestVerification(mockReq, mockRes);

      expect(verificationService.createVerificationRequestFromKey).toHaveBeenCalledWith('user-123', 'gs://bucket/file-key');
      expect(logDocumentUpload).toHaveBeenCalledWith(
        'user-123',
        'gs://bucket/file-key',
        'application/octet-stream',
        0,
        '127.0.0.1',
        'Mozilla/5.0'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Solicitud de verificación enviada correctamente',
        data: {
          id: 'verification-123',
          estado: 'pendiente',
          documento_url: 'gs://bucket/file-key',
          creado_en: expect.any(Date)
        }
      });
    });

    test('debe rechazar solicitud sin fileKey', async () => {
      mockReq.body.fileKey = undefined;

      await verificationController.requestVerification(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Se requiere fileKey del documento subido'
      });
    });

    test('debe manejar errores del servicio', async () => {
      mockReq.body.fileKey = 'gs://bucket/file-key';
      verificationService.createVerificationRequestFromKey.mockRejectedValue(new Error('Usuario no encontrado'));

      await verificationController.requestVerification(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Usuario no encontrado'
      });
    });
  });

  describe('getVerificationStatus', () => {
    test('debe retornar estado de verificación exitosamente', async () => {
      const mockStatus = {
        id: 'verification-123',
        estado: 'pendiente',
        documento_url: 'gs://bucket/file-key'
      };

      verificationService.getVerificationStatus.mockResolvedValue(mockStatus);

      await verificationController.getVerificationStatus(mockReq, mockRes);

      expect(verificationService.getVerificationStatus).toHaveBeenCalledWith('user-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatus
      });
    });

    test('debe manejar errores del servicio', async () => {
      verificationService.getVerificationStatus.mockRejectedValue(new Error('Error de BD'));

      await verificationController.getVerificationStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Error de BD'
      });
    });
  });

  describe('getPendingVerifications', () => {
    test('debe retornar solicitudes pendientes para administradores', async () => {
      mockReq.user.rol = 'admin';
      const mockRequests = [
        {
          id: 'verification-123',
          estado: 'pendiente',
          usuario: { nombre: 'Juan Pérez' }
        }
      ];

      verificationService.getPendingVerifications.mockResolvedValue(mockRequests);

      await verificationController.getPendingVerifications(mockReq, mockRes);

      expect(verificationService.getPendingVerifications).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockRequests
      });
    });

    test('debe rechazar acceso a no administradores', async () => {
      mockReq.user.rol = 'profesional';

      await verificationController.getPendingVerifications(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      });
    });
  });

  describe('approveVerification', () => {
    beforeEach(() => {
      mockReq.user.rol = 'admin';
      mockReq.params.id = 'verification-123';
      mockReq.body.comentario = 'Documento válido';
    });

    test('debe aprobar verificación exitosamente', async () => {
      const mockResult = {
        id: 'verification-123',
        estado: 'aprobado',
        revisado_en: new Date()
      };

      verificationService.approveVerification.mockResolvedValue(mockResult);

      await verificationController.approveVerification(mockReq, mockRes);

      expect(verificationService.approveVerification).toHaveBeenCalledWith('verification-123', 'user-123', 'Documento válido');
      expect(logVerificationApproval).toHaveBeenCalledWith(
        'user-123',
        'verification-123',
        'Documento válido',
        '127.0.0.1',
        'Mozilla/5.0'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Verificación aprobada correctamente',
        data: mockResult
      });
    });

    test('debe rechazar acceso a no administradores', async () => {
      mockReq.user.rol = 'profesional';

      await verificationController.approveVerification(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      });
    });

    test('debe manejar errores del servicio', async () => {
      verificationService.approveVerification.mockRejectedValue(new Error('Solicitud no encontrada'));

      await verificationController.approveVerification(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Solicitud no encontrada'
      });
    });
  });

  describe('rejectVerification', () => {
    beforeEach(() => {
      mockReq.user.rol = 'admin';
      mockReq.params.id = 'verification-123';
      mockReq.body.comentario = 'Documento ilegible';
    });

    test('debe rechazar verificación exitosamente', async () => {
      const mockResult = {
        id: 'verification-123',
        estado: 'rechazado',
        comentario_admin: 'Documento ilegible'
      };

      verificationService.rejectVerification.mockResolvedValue(mockResult);

      await verificationController.rejectVerification(mockReq, mockRes);

      expect(verificationService.rejectVerification).toHaveBeenCalledWith('verification-123', 'user-123', 'Documento ilegible');
      expect(logVerificationRejection).toHaveBeenCalledWith(
        'user-123',
        'verification-123',
        'Documento ilegible',
        '127.0.0.1',
        'Mozilla/5.0'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Verificación rechazada correctamente',
        data: mockResult
      });
    });

    test('debe rechazar solicitud sin comentario', async () => {
      mockReq.body.comentario = '';

      await verificationController.rejectVerification(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Se requiere un comentario explicando el rechazo'
      });
    });

    test('debe rechazar acceso a no administradores', async () => {
      mockReq.user.rol = 'profesional';

      await verificationController.rejectVerification(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      });
    });
  });

  describe('getDocumentUrl', () => {
    beforeEach(() => {
      mockReq.params.requestId = 'verification-123';
    });

    test('debe retornar URL firmada para propietario del documento', async () => {
      const mockStatus = {
        id: 'verification-123',
        documento_url: 'gs://bucket/file-key'
      };

      verificationService.getVerificationStatus.mockResolvedValue(mockStatus);
      storageService.getSignedUrl.mockResolvedValue('https://signed-url.com');

      await verificationController.getDocumentUrl(mockReq, mockRes);

      expect(verificationService.getVerificationStatus).toHaveBeenCalledWith('user-123');
      expect(storageService.getSignedUrl).toHaveBeenCalledWith('gs://bucket/file-key');
      expect(logDocumentAccess).toHaveBeenCalledWith(
        'user-123',
        'verification-123',
        '127.0.0.1',
        'Mozilla/5.0'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        signedUrl: 'https://signed-url.com',
        expiresIn: '15 minutos'
      });
    });

    test('debe permitir acceso a administradores aunque no sean propietarios', async () => {
      mockReq.user.rol = 'admin';
      const mockStatus = {
        id: 'verification-999', // diferente ID
        documento_url: 'gs://bucket/file-key'
      };

      verificationService.getVerificationStatus.mockResolvedValue(mockStatus);
      storageService.getSignedUrl.mockResolvedValue('https://signed-url.com');

      await verificationController.getDocumentUrl(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        signedUrl: 'https://signed-url.com',
        expiresIn: '15 minutos'
      });
    });

    test('debe rechazar acceso a usuarios no autorizados', async () => {
      const mockStatus = {
        id: 'verification-999', // diferente ID
        documento_url: 'gs://bucket/file-key'
      };

      verificationService.getVerificationStatus.mockResolvedValue(mockStatus);

      await verificationController.getDocumentUrl(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No tienes permisos para acceder a este documento'
      });
    });

    test('debe manejar errores al generar URL firmada', async () => {
      const mockStatus = {
        id: 'verification-123',
        documento_url: 'gs://bucket/file-key'
      };

      verificationService.getVerificationStatus.mockResolvedValue(mockStatus);
      storageService.getSignedUrl.mockRejectedValue(new Error('Error de GCS'));

      await verificationController.getDocumentUrl(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Error de GCS'
      });
    });
  });
});
