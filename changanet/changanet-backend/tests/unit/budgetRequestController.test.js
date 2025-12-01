/**
 * Pruebas unitarias para budgetRequestController.js
 * Cubre: REQ-31, REQ-32, REQ-33, REQ-34, REQ-35 (Solicitud de Presupuestos)
 * Incluye pruebas de creación, distribución automática y validaciones
 */

const { PrismaClient } = require('@prisma/client');

// Mock de Prisma
jest.mock('@prisma/client');
jest.mock('../services/notificationService');
jest.mock('../services/pushNotificationService');
jest.mock('../services/emailService');
jest.mock('../services/storageService');
jest.mock('../services/validationService');

const mockPrisma = {
  cotizaciones: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  perfiles_profesionales: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  cotizacion_respuestas: {
    createMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  usuarios: {
    findUnique: jest.fn(),
  },
};

PrismaClient.mockImplementation(() => mockPrisma);

// Mocks de servicios
const mockCreateNotification = jest.fn();
const mockSendPushNotification = jest.fn();
const mockSendQuoteRequestEmail = jest.fn();
const mockUploadImage = jest.fn();
const mockValidateComment = jest.fn();

jest.mock('../services/notificationService', () => ({
  createNotification: mockCreateNotification,
  NOTIFICATION_TYPES: {
    COTIZACION: 'cotizacion',
    COTIZACION_ACEPTADA: 'cotizacion_aceptada',
  },
}));

jest.mock('../services/pushNotificationService', () => ({
  sendPushNotification: mockSendPushNotification,
}));

jest.mock('../services/emailService', () => ({
  sendQuoteRequestEmail: mockSendQuoteRequestEmail,
  sendEmail: jest.fn(),
}));

jest.mock('../services/storageService', () => ({
  uploadImage: mockUploadImage,
}));

jest.mock('../services/validationService', () => ({
  validateComment: mockValidateComment,
}));

const {
  createBudgetRequest,
  getClientBudgetRequests,
  getBudgetRequestOffers,
  getProfessionalInbox,
  createOffer,
} = require('../../src/controllers/budgetRequestController');

describe('Budget Request Controller - Unit Tests', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: { id: 'user-123' },
      body: {},
      params: {},
      files: null,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('createBudgetRequest', () => {
    test('debe crear solicitud exitosamente con fotos (REQ-31)', async () => {
      // Setup
      mockReq.body = {
        descripcion: 'Necesito reparar mi baño',
        zona_cobertura: 'Palermo, Buenos Aires',
        especialidad: 'Plomería',
        presupuesto_estimado: '50000',
      };
      mockReq.files = [
        { buffer: Buffer.from('fake-image'), originalname: 'photo1.jpg' },
        { buffer: Buffer.from('fake-image2'), originalname: 'photo2.jpg' },
      ];

      const mockClient = { nombre: 'Test Client', email: 'client@test.com' };
      const mockProfessionals = [
        {
          usuario_id: 'prof-1',
          usuario: {
            id: 'prof-1',
            nombre: 'Professional 1',
            email: 'prof1@test.com',
            fcm_token: 'token123',
          },
        },
        {
          usuario_id: 'prof-2',
          usuario: {
            id: 'prof-2',
            nombre: 'Professional 2',
            email: 'prof2@test.com',
            fcm_token: 'token456',
          },
        },
      ];

      // Mocks
      mockValidateComment
        .mockReturnValueOnce({ isValid: true, comment: 'Necesito reparar mi baño' })
        .mockReturnValueOnce({ isValid: true, comment: 'Palermo, Buenos Aires' })
        .mockReturnValueOnce({ isValid: true, comment: 'Plomería' });

      mockUploadImage
        .mockResolvedValueOnce({ secure_url: 'https://cloudinary.com/photo1.jpg' })
        .mockResolvedValueOnce({ secure_url: 'https://cloudinary.com/photo2.jpg' });

      mockPrisma.cotizaciones.create.mockResolvedValue({
        id: 'quote-123',
        cliente: mockClient,
      });

      mockPrisma.perfiles_profesionales.findMany.mockResolvedValue(mockProfessionals);
      mockPrisma.cotizacion_respuestas.createMany.mockResolvedValue({ count: 2 });

      mockSendPushNotification.mockResolvedValue();
      mockCreateNotification.mockResolvedValue();

      // Execute
      await createBudgetRequest(mockReq, mockRes);

      // Assert
      expect(mockValidateComment).toHaveBeenCalledTimes(3);
      expect(mockUploadImage).toHaveBeenCalledTimes(2);
      expect(mockPrisma.cotizaciones.create).toHaveBeenCalledWith({
        data: {
          cliente_id: 'user-123',
          descripcion: 'Necesito reparar mi baño',
          zona_cobertura: 'Palermo, Buenos Aires',
          fotos_urls: JSON.stringify([
            'https://cloudinary.com/photo1.jpg',
            'https://cloudinary.com/photo2.jpg',
          ]),
          profesionales_solicitados: JSON.stringify(['prof-1', 'prof-2']),
        },
        include: { cliente: { select: { nombre: true, email: true } } },
      });

      expect(mockPrisma.perfiles_profesionales.findMany).toHaveBeenCalledWith({
        where: {
          especialidad: 'Plomería',
          zona_cobertura: 'Palermo, Buenos Aires',
          esta_disponible: true,
          usuario: {
            esta_verificado: true,
            bloqueado: false,
            rol: 'profesional',
          },
        },
        include: expect.any(Object),
        orderBy: [
          { calificacion_promedio: 'desc' },
          { anos_experiencia: 'desc' },
        ],
        take: 10,
      });

      expect(mockSendPushNotification).toHaveBeenCalledTimes(2);
      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    test('debe crear solicitud sin fotos exitosamente', async () => {
      mockReq.body = {
        descripcion: 'Necesito pintar mi casa',
        zona_cobertura: 'Recoleta, Buenos Aires',
        especialidad: 'Pintura',
      };
      mockReq.files = null;

      mockValidateComment
        .mockReturnValue({ isValid: true, comment: 'test' });

      mockPrisma.cotizaciones.create.mockResolvedValue({
        id: 'quote-124',
        cliente: { nombre: 'Test Client', email: 'client@test.com' },
      });

      mockPrisma.perfiles_profesionales.findMany.mockResolvedValue([]);

      await createBudgetRequest(mockReq, mockRes);

      expect(mockUploadImage).not.toHaveBeenCalled();
      expect(mockPrisma.cotizaciones.create).toHaveBeenCalledWith({
        data: {
          cliente_id: 'user-123',
          descripcion: 'Necesito pintar mi casa',
          zona_cobertura: 'Recoleta, Buenos Aires',
          fotos_urls: null,
          profesionales_solicitados: JSON.stringify([]),
        },
        include: { cliente: { select: { nombre: true, email: true } } },
      });
    });

    test('debe rechazar solicitud con descripción inválida', async () => {
      mockReq.body = {
        descripcion: 'abc', // Muy corta
        zona_cobertura: 'Palermo',
        especialidad: 'Plomería',
      };

      mockValidateComment
        .mockReturnValueOnce({ isValid: false, reason: 'Descripción demasiado corta' });

      await createBudgetRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Descripción inválida',
        message: 'Descripción demasiado corta',
      });
    });

    test('debe manejar error de subida de imagen', async () => {
      mockReq.body = {
        descripcion: 'Necesito reparar mi baño',
        zona_cobertura: 'Palermo',
        especialidad: 'Plomería',
      };
      mockReq.files = [{ buffer: Buffer.from('fake-image') }];

      mockValidateComment.mockReturnValue({ isValid: true, comment: 'test' });
      mockUploadImage.mockRejectedValue(new Error('Upload failed'));

      await createBudgetRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Error al subir las imágenes.',
      });
    });
  });

  describe('getClientBudgetRequests', () => {
    test('debe retornar solicitudes del cliente correctamente', async () => {
      mockReq.params.clientId = 'user-123';

      const mockRequests = [
        {
          id: 'quote-1',
          descripcion: 'Test quote',
          zona_cobertura: 'Palermo',
          fotos_urls: JSON.stringify(['url1.jpg']),
          respuestas: [
            {
              profesional: {
                nombre: 'Prof 1',
                email: 'prof1@test.com',
                perfil_profesional: {
                  especialidad: 'Plomería',
                  calificacion_promedio: 4.5,
                  anos_experiencia: 5,
                },
              },
              precio: 1000,
              comentario: 'Buen precio',
              estado: 'ACEPTADO',
              respondido_en: new Date(),
            },
          ],
          creado_en: new Date(),
        },
      ];

      mockPrisma.cotizaciones.findMany.mockResolvedValue(mockRequests);

      await getClientBudgetRequests(mockReq, mockRes);

      expect(mockPrisma.cotizaciones.findMany).toHaveBeenCalledWith({
        where: { cliente_id: 'user-123' },
        include: expect.any(Object),
        orderBy: { creado_en: 'desc' },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([
        {
          id: 'quote-1',
          descripcion: 'Test quote',
          zona_cobertura: 'Palermo',
          fotos_urls: ['url1.jpg'],
          profesionales_solicitados: [],
          ofertas: [
            {
              id: expect.any(String),
              profesional: {
                nombre: 'Prof 1',
                especialidad: 'Plomería',
                calificacion: 4.5,
                experiencia: 5,
              },
              precio: 1000,
              comentario: 'Buen precio',
              estado: 'ACEPTADO',
              respondido_en: expect.any(Date),
            },
          ],
          estadisticas_ofertas: {
            total_ofertas: 1,
            precio_minimo: 1000,
            precio_maximo: 1000,
            precio_promedio: 1000,
          },
          creado_en: expect.any(Date),
        },
      ]);
    });

    test('debe rechazar acceso a solicitudes de otro cliente (403)', async () => {
      mockReq.params.clientId = 'other-user-456';
      mockReq.user.id = 'user-123';

      await getClientBudgetRequests(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No tienes permiso para ver estas solicitudes.',
      });
    });
  });

  describe('getBudgetRequestOffers', () => {
    test('debe retornar ofertas con estadísticas de comparación (REQ-34)', async () => {
      mockReq.params.id = 'quote-123';

      const mockRequest = {
        id: 'quote-123',
        descripcion: 'Test request',
        zona_cobertura: 'Palermo',
        fotos_urls: JSON.stringify(['url1.jpg']),
      };

      const mockOffers = [
        {
          id: 'offer-1',
          precio: 1000,
          comentario: 'Buena oferta',
          estado: 'ACEPTADO',
          respondido_en: new Date('2025-01-02'),
          profesional: {
            nombre: 'Prof 1',
            email: 'prof1@test.com',
            perfil_profesional: {
              especialidad: 'Plomería',
              calificacion_promedio: 4.5,
              anos_experiencia: 5,
              descripcion: 'Profesional experimentado',
            },
          },
        },
        {
          id: 'offer-2',
          precio: 1200,
          comentario: 'Otra oferta',
          estado: 'ACEPTADO',
          respondido_en: new Date('2025-01-03'),
          profesional: {
            nombre: 'Prof 2',
            email: 'prof2@test.com',
            perfil_profesional: {
              especialidad: 'Plomería',
              calificacion_promedio: 4.0,
              anos_experiencia: 3,
              descripcion: 'Profesional joven',
            },
          },
        },
      ];

      mockPrisma.cotizaciones.findFirst.mockResolvedValue(mockRequest);
      mockPrisma.cotizacion_respuestas.findMany.mockResolvedValue(mockOffers);

      await getBudgetRequestOffers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];

      expect(responseData.request).toEqual({
        id: 'quote-123',
        descripcion: 'Test request',
        zona_cobertura: 'Palermo',
        fotos_urls: ['url1.jpg'],
      });

      expect(responseData.offers).toHaveLength(2);
      expect(responseData.comparison_stats).toEqual({
        total_offers: 2,
        price_range: {
          min: 1000,
          max: 1200,
          average: 1100,
        },
        best_value: mockOffers[0], // Primera oferta (más barata)
        fastest_response: mockOffers[0], // Primera respuesta
      });
    });

    test('debe rechazar acceso a ofertas de solicitud inexistente', async () => {
      mockReq.params.id = 'non-existent-quote';

      mockPrisma.cotizaciones.findFirst.mockResolvedValue(null);

      await getBudgetRequestOffers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Solicitud no encontrada o no tienes acceso.',
      });
    });
  });

  describe('createOffer', () => {
    test('debe crear oferta exitosamente (REQ-33)', async () => {
      mockReq.user.id = 'prof-123';
      mockReq.params.id = 'quote-123';
      mockReq.body = {
        precio: 1500,
        comentario: 'Buen precio por el trabajo',
      };

      const mockProfessional = {
        usuario: {
          rol: 'profesional',
          esta_verificado: true,
          bloqueado: false,
        },
        esta_disponible: true,
      };

      const mockResponse = {
        cotizacion: {
          cliente_id: 'client-123',
          cliente: { nombre: 'Client Name', email: 'client@test.com' },
        },
        profesional: { nombre: 'Professional Name', email: 'prof@test.com' },
      };

      mockValidateComment.mockReturnValue({ isValid: true, comment: 'Buen precio por el trabajo' });
      mockPrisma.perfiles_profesionales.findUnique.mockResolvedValue(mockProfessional);
      mockPrisma.cotizacion_respuestas.findUnique.mockResolvedValue(mockResponse);
      mockPrisma.cotizacion_respuestas.update.mockResolvedValue({
        id: 'offer-123',
        precio: 1500,
        comentario: 'Buen precio por el trabajo',
        estado: 'ACEPTADO',
        respondido_en: expect.any(Date),
      });

      mockSendPushNotification.mockResolvedValue();
      mockCreateNotification.mockResolvedValue();

      await createOffer(mockReq, mockRes);

      expect(mockPrisma.cotizacion_respuestas.update).toHaveBeenCalledWith({
        where: {
          cotizacion_id_profesional_id: {
            cotizacion_id: 'quote-123',
            profesional_id: 'prof-123',
          },
        },
        data: {
          precio: 1500,
          comentario: 'Buen precio por el trabajo',
          estado: 'ACEPTADO',
          respondido_en: expect.any(Date),
        },
        include: expect.any(Object),
      });

      expect(mockSendPushNotification).toHaveBeenCalledWith(
        'client-123',
        'Nueva oferta recibida',
        'Professional Name ha enviado una oferta: $1500',
        expect.any(Object)
      );

      expect(mockCreateNotification).toHaveBeenCalledWith(
        'client-123',
        'cotizacion_aceptada',
        'Professional Name ha enviado una oferta: $1500',
        { requestId: 'quote-123', precio: 1500 }
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    test('debe rechazar oferta de usuario no profesional', async () => {
      mockReq.user.id = 'client-123';
      mockReq.body = { precio: 1500 };

      const mockProfessional = {
        usuario: {
          rol: 'cliente', // No es profesional
          esta_verificado: true,
          bloqueado: false,
        },
        esta_disponible: true,
      };

      mockPrisma.perfiles_profesionales.findUnique.mockResolvedValue(mockProfessional);

      await createOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Solo los profesionales pueden enviar ofertas.',
      });
    });

    test('debe rechazar oferta sin precio válido', async () => {
      mockReq.user.id = 'prof-123';
      mockReq.body = { precio: 'invalid-price' };

      const mockProfessional = {
        usuario: {
          rol: 'profesional',
          esta_verificado: true,
          bloqueado: false,
        },
        esta_disponible: true,
      };

      mockPrisma.perfiles_profesionales.findUnique.mockResolvedValue(mockProfessional);

      await createOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Debes proporcionar un precio válido.',
      });
    });

    test('debe rechazar oferta para solicitud ya respondida', async () => {
      mockReq.user.id = 'prof-123';
      mockReq.body = { precio: 1500 };

      const mockProfessional = {
        usuario: {
          rol: 'profesional',
          esta_verificado: true,
          bloqueado: false,
        },
        esta_disponible: true,
      };

      const mockResponse = {
        estado: 'ACEPTADO', // Ya respondida
        cotizacion: { cliente_id: 'client-123' },
      };

      mockPrisma.perfiles_profesionales.findUnique.mockResolvedValue(mockProfessional);
      mockPrisma.cotizacion_respuestas.findUnique.mockResolvedValue(mockResponse);

      await createOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Esta solicitud ya ha sido respondida.',
      });
    });
  });

  describe('getProfessionalInbox', () => {
    test('debe retornar bandeja del profesional correctamente', async () => {
      mockReq.params.professionalId = 'prof-123';

      const mockResponses = [
        {
          cotizacion: {
            id: 'quote-1',
            descripcion: 'Test quote',
            zona_cobertura: 'Palermo',
            fotos_urls: JSON.stringify(['url1.jpg']),
            cliente: { nombre: 'Client 1', email: 'client1@test.com' },
            respuestas: [],
            creado_en: new Date(),
          },
          mi_respuesta: {
            id: 'response-1',
            precio: null,
            comentario: '',
            estado: 'PENDIENTE',
            respondido_en: null,
          },
        },
      ];

      mockPrisma.cotizacion_respuestas.findMany.mockResolvedValue(mockResponses);

      await getProfessionalInbox(mockReq, mockRes);

      expect(mockPrisma.cotizacion_respuestas.findMany).toHaveBeenCalledWith({
        where: { profesional_id: 'prof-123' },
        include: expect.any(Object),
        orderBy: { creado_en: 'desc' },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData).toHaveLength(1);
      expect(responseData[0]).toEqual({
        id: 'quote-1',
        descripcion: 'Test quote',
        zona_cobertura: 'Palermo',
        fotos_urls: ['url1.jpg'],
        cliente: { nombre: 'Client 1', email: 'client1@test.com' },
        mi_respuesta: {
          id: 'response-1',
          precio: null,
          comentario: '',
          estado: 'PENDIENTE',
          respondido_en: null,
        },
        otras_respuestas: [],
        creado_en: expect.any(Date),
      });
    });

    test('debe rechazar acceso a bandeja de otro profesional', async () => {
      mockReq.params.professionalId = 'other-prof-456';
      mockReq.user.id = 'prof-123';

      await getProfessionalInbox(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No tienes permiso para ver esta bandeja.',
      });
    });
  });
});
