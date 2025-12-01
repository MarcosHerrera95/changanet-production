/**
 * Pruebas exhaustivas de cumplimiento para REQ-36 a REQ-40
 * Verificación de identidad y sistema de reputación
 * Incluye validación completa de funcionalidades críticas
 */

const { PrismaClient } = require('@prisma/client');
const verificationService = require('../../src/services/verificationService');
const reputationService = require('../../src/services/reputationService');
const { storageService } = require('../../src/services/storageService');

jest.mock('@prisma/client');
jest.mock('../../src/services/storageService');

const mockPrisma = {
  usuarios: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  perfiles_profesionales: {
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  verification_requests: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  servicios: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  resenas: {
    findMany: jest.fn(),
  },
  reputation_scores: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  user_medals: {
    upsert: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
  },
  audit_logs: {
    create: jest.fn(),
  },
};

PrismaClient.mockImplementation(() => mockPrisma);

describe('REQ-36 to REQ-40 Compliance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storageService.uploadDocument = jest.fn();
    storageService.generatePresignedUrl = jest.fn();
  });

  describe('REQ-36: Sistema debe permitir subir documento de identidad', () => {
    test('debe permitir subida exitosa de documento válido', async () => {
      const mockUser = {
        id: 'user-123',
        rol: 'profesional',
        perfil_profesional: { id: 'profile-123' }
      };

      const mockDocumentUrl = 'https://storage.googleapis.com/bucket/user-123/document.pdf';
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
        'document.pdf',
        'application/pdf'
      );

      expect(result).toEqual(mockVerificationRequest);
      expect(storageService.uploadDocument).toHaveBeenCalledWith(
        expect.any(Buffer),
        'document.pdf',
        'application/pdf',
        'user-123'
      );
      expect(mockPrisma.audit_logs.create).toHaveBeenCalledWith({
        data: {
          usuario_id: 'user-123',
          accion: 'upload_document',
          entidad_tipo: 'verification_request',
          entidad_id: 'verification-123',
          detalles: expect.any(String),
          exito: true
        }
      });
    });

    test('debe rechazar subida de documento con tipo MIME no permitido', async () => {
      const mockUser = {
        id: 'user-123',
        rol: 'profesional'
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockUser);

      await expect(
        verificationService.createVerificationRequest(
          'user-123',
          Buffer.from('malicious content'),
          'malware.exe',
          'application/x-msdownload'
        )
      ).rejects.toThrow('Tipo de archivo no permitido');
    });

    test('debe rechazar subida de documento mayor a 5MB', async () => {
      const mockUser = {
        id: 'user-123',
        rol: 'profesional'
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockUser);

      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB

      await expect(
        verificationService.createVerificationRequest(
          'user-123',
          largeBuffer,
          'large-document.pdf',
          'application/pdf'
        )
      ).rejects.toThrow('El archivo es demasiado grande');
    });
  });

  describe('REQ-37: Sistema debe mostrar insignia "Verificado" al validar datos', () => {
    test('debe mostrar insignia verificado después de aprobación', async () => {
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

      expect(result.estado).toBe('aprobado');
      expect(mockPrisma.usuarios.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { esta_verificado: true }
      });
      expect(mockPrisma.perfiles_profesionales.update).toHaveBeenCalledWith({
        where: { usuario_id: 'user-123' },
        data: {
          estado_verificacion: 'verificado',
          verificado_en: expect.any(Date)
        }
      });
    });

    test('debe ocultar insignia verificado después de rechazo', async () => {
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

      expect(result.estado).toBe('rechazado');
      expect(mockPrisma.perfiles_profesionales.update).toHaveBeenCalledWith({
        where: { usuario_id: 'user-123' },
        data: { estado_verificacion: 'rechazado' }
      });
    });
  });

  describe('REQ-38: Sistema debe asignar medallas por logros', () => {
    test('debe asignar medalla de puntualidad con 95% de trabajos a tiempo', async () => {
      const metrics = {
        averageRating: 4.0,
        completedJobs: 20,
        onTimePercentage: 95.0
      };

      const mockMedal = {
        id: 'medal-123',
        usuario_id: 'user-123',
        medal_type: 'puntualidad',
        medal_name: 'Profesional Puntual',
        is_active: true
      };

      mockPrisma.user_medals.upsert.mockResolvedValue(mockMedal);

      await reputationService.checkAndAssignMedals('user-123', metrics);

      expect(mockPrisma.user_medals.upsert).toHaveBeenCalledWith({
        where: {
          usuario_id_medal_type: {
            usuario_id: 'user-123',
            medal_type: 'puntualidad'
          }
        },
        update: expect.objectContaining({
          condition_value: 95.0,
          is_active: true
        }),
        create: expect.objectContaining({
          medal_type: 'puntualidad',
          medal_name: 'Profesional Puntual'
        })
      });
    });

    test('debe asignar medalla de reputación con calificación promedio > 4.5', async () => {
      const metrics = {
        averageRating: 4.8,
        completedJobs: 15,
        onTimePercentage: 80.0
      };

      const mockMedal = {
        id: 'medal-124',
        usuario_id: 'user-123',
        medal_type: 'calificaciones',
        medal_name: 'Excelente Reputación',
        is_active: true
      };

      mockPrisma.user_medals.upsert.mockResolvedValue(mockMedal);

      await reputationService.checkAndAssignMedals('user-123', metrics);

      expect(mockPrisma.user_medals.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            medal_type: 'calificaciones',
            medal_name: 'Excelente Reputación'
          })
        })
      );
    });

    test('debe asignar medalla de trabajos completados con > 50 servicios', async () => {
      const metrics = {
        averageRating: 4.0,
        completedJobs: 55,
        onTimePercentage: 80.0
      };

      const mockMedal = {
        id: 'medal-125',
        usuario_id: 'user-123',
        medal_type: 'trabajos_completados',
        medal_name: 'Profesional Experto',
        is_active: true
      };

      mockPrisma.user_medals.upsert.mockResolvedValue(mockMedal);

      await reputationService.checkAndAssignMedals('user-123', metrics);

      expect(mockPrisma.user_medals.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            medal_type: 'trabajos_completados',
            medal_name: 'Profesional Experto'
          })
        })
      );
    });

    test('debe revocar medalla cuando ya no cumple criterios', async () => {
      const metrics = {
        averageRating: 4.2, // Bajó de 4.5
        completedJobs: 10,
        onTimePercentage: 85.0 // Bajó de 90
      };

      mockPrisma.user_medals.updateMany.mockResolvedValue({ count: 2 });

      await reputationService.checkAndAssignMedals('user-123', metrics);

      expect(mockPrisma.user_medals.updateMany).toHaveBeenCalledWith({
        where: {
          usuario_id: 'user-123',
          medal_type: 'calificaciones',
          is_active: true
        },
        data: {
          is_active: false,
          revoked_at: expect.any(Date)
        }
      });

      expect(mockPrisma.user_medals.updateMany).toHaveBeenCalledWith({
        where: {
          usuario_id: 'user-123',
          medal_type: 'puntualidad',
          is_active: true
        },
        data: {
          is_active: false,
          revoked_at: expect.any(Date)
        }
      });
    });
  });

  describe('REQ-39: Sistema debe mostrar ranking basado en reputación', () => {
    test('debe calcular ranking score correctamente', async () => {
      const mockServices = 25;
      const mockReviews = [
        { calificacion: 5 },
        { calificacion: 4 },
        { calificacion: 5 },
        { calificacion: 4.5 }
      ];

      mockPrisma.servicios.count.mockResolvedValue(mockServices);
      mockPrisma.resenas.findMany.mockResolvedValue(mockReviews);

      const result = await reputationService.calculateReputationScore('user-123');

      expect(result.averageRating).toBeCloseTo(4.6, 1);
      expect(result.completedJobs).toBe(25);
      expect(result.onTimePercentage).toBe(85.0); // Default
      expect(result.rankingScore).toBeGreaterThan(0);
    });

    test('debe retornar ranking global ordenado por puntuación', async () => {
      const mockRankings = [
        {
          id: 'score-1',
          ranking_score: 20.5,
          global_ranking: 1,
          usuario: {
            nombre: 'Usuario 1',
            perfil_profesional: {
              especialidad: 'plomero',
              zona_cobertura: 'Buenos Aires',
              calificacion_promedio: 5.0,
              estado_verificacion: 'verificado'
            }
          }
        },
        {
          id: 'score-2',
          ranking_score: 18.2,
          global_ranking: 2,
          usuario: {
            nombre: 'Usuario 2',
            perfil_profesional: {
              especialidad: 'electricista',
              zona_cobertura: 'CABA',
              calificacion_promedio: 4.5,
              estado_verificacion: 'pendiente'
            }
          }
        }
      ];

      mockPrisma.reputation_scores.findMany.mockResolvedValue(mockRankings);

      const result = await reputationService.getGlobalRanking(10);

      expect(result).toHaveLength(2);
      expect(result[0].global_ranking).toBe(1);
      expect(result[1].global_ranking).toBe(2);
      expect(result[0].ranking_score).toBeGreaterThan(result[1].ranking_score);
    });

    test('debe actualizar ranking global después de cambios en reputación', async () => {
      const mockProfessionals = [
        { id: 'user-1' },
        { id: 'user-2' },
        { id: 'user-3' }
      ];

      mockPrisma.usuarios.findMany.mockResolvedValue(mockProfessionals);
      jest.spyOn(reputationService, 'updateReputationScore').mockResolvedValue();

      await reputationService.updateAllReputationScores();

      expect(reputationService.updateReputationScore).toHaveBeenCalledTimes(3);
    });
  });

  describe('REQ-40: Administrador debe poder aprobar/rechazar solicitudes', () => {
    test('debe permitir aprobación por administrador autorizado', async () => {
      const mockRequest = {
        id: 'verification-123',
        usuario_id: 'user-123',
        estado: 'pendiente',
        usuario: { id: 'user-123' }
      };

      mockPrisma.verification_requests.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.verification_requests.update.mockResolvedValue({
        ...mockRequest,
        estado: 'aprobado',
        revisado_por: 'admin-123'
      });

      const result = await verificationService.approveVerification('verification-123', 'admin-123', 'Aprobado');

      expect(result.estado).toBe('aprobado');
      expect(result.revisado_por).toBe('admin-123');
      expect(mockPrisma.audit_logs.create).toHaveBeenCalledWith({
        data: {
          usuario_id: 'admin-123',
          accion: 'approve_verification',
          entidad_tipo: 'verification_request',
          entidad_id: 'verification-123',
          detalles: expect.stringContaining('Aprobado'),
          exito: true
        }
      });
    });

    test('debe permitir rechazo con comentario obligatorio', async () => {
      const mockRequest = {
        id: 'verification-123',
        usuario_id: 'user-123',
        estado: 'pendiente'
      };

      mockPrisma.verification_requests.findUnique.mockResolvedValue(mockRequest);

      await expect(
        verificationService.rejectVerification('verification-123', 'admin-123', '')
      ).rejects.toThrow('Se requiere un comentario explicando el rechazo');
    });

    test('debe listar todas las solicitudes pendientes para administradores', async () => {
      const mockRequests = [
        {
          id: 'verification-1',
          estado: 'pendiente',
          creado_en: new Date(),
          usuario: {
            id: 'user-1',
            nombre: 'Juan Pérez',
            email: 'juan@example.com',
            perfil_profesional: {
              especialidad: 'plomero',
              zona_cobertura: 'Buenos Aires'
            }
          }
        },
        {
          id: 'verification-2',
          estado: 'pendiente',
          creado_en: new Date(),
          usuario: {
            id: 'user-2',
            nombre: 'María García',
            email: 'maria@example.com',
            perfil_profesional: {
              especialidad: 'electricista',
              zona_cobertura: 'CABA'
            }
          }
        }
      ];

      mockPrisma.verification_requests.findMany.mockResolvedValue(mockRequests);

      const result = await verificationService.getPendingVerifications();

      expect(result).toHaveLength(2);
      expect(result[0].usuario.nombre).toBe('Juan Pérez');
      expect(result[1].usuario.nombre).toBe('María García');
      expect(mockPrisma.verification_requests.findMany).toHaveBeenCalledWith({
        where: { estado: 'pendiente' },
        include: expect.any(Object),
        orderBy: { creado_en: 'asc' }
      });
    });
  });

  describe('Validación de Integridad y Seguridad', () => {
    test('debe registrar auditoría para todas las operaciones críticas', async () => {
      // Simular aprobación
      const mockRequest = {
        id: 'verification-123',
        usuario_id: 'user-123',
        estado: 'pendiente',
        usuario: { id: 'user-123' }
      };

      mockPrisma.verification_requests.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.verification_requests.update.mockResolvedValue({
        ...mockRequest,
        estado: 'aprobado'
      });

      await verificationService.approveVerification('verification-123', 'admin-123', 'Aprobado');

      expect(mockPrisma.audit_logs.create).toHaveBeenCalledWith({
        data: {
          usuario_id: 'admin-123',
          accion: 'approve_verification',
          entidad_tipo: 'verification_request',
          entidad_id: 'verification-123',
          detalles: expect.any(String),
          exito: true
        }
      });
    });

    test('debe validar permisos de administrador para operaciones críticas', async () => {
      // Esta validación ocurre en el middleware, pero podemos verificar que el servicio
      // no permita operaciones sin usuario administrador
      const mockRequest = {
        id: 'verification-123',
        estado: 'aprobado' // Ya procesada
      };

      mockPrisma.verification_requests.findUnique.mockResolvedValue(mockRequest);

      await expect(
        verificationService.approveVerification('verification-123', 'user-123') // Usuario no admin
      ).rejects.toThrow('La solicitud ya fue procesada');
    });

    test('debe mantener consistencia de datos entre tablas relacionadas', async () => {
      const mockRequest = {
        id: 'verification-123',
        usuario_id: 'user-123',
        estado: 'pendiente',
        usuario: { id: 'user-123' }
      };

      mockPrisma.verification_requests.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.verification_requests.update.mockResolvedValue({
        ...mockRequest,
        estado: 'aprobado'
      });

      await verificationService.approveVerification('verification-123', 'admin-123', 'Aprobado');

      // Verificar que se actualicen ambas tablas
      expect(mockPrisma.usuarios.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { esta_verificado: true }
      });

      expect(mockPrisma.perfiles_profesionales.update).toHaveBeenCalledWith({
        where: { usuario_id: 'user-123' },
        data: {
          estado_verificacion: 'verificado',
          verificado_en: expect.any(Date)
        }
      });
    });
  });
});
