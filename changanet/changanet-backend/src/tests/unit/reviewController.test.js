// src/tests/unit/reviewController.test.js
const reviewController = require('../../controllers/reviewController');
const validationService = require('../../services/validationService');
const ratingService = require('../../services/ratingService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Mock services
jest.mock('../../services/validationService');
jest.mock('../../services/ratingService');
jest.mock('../../services/storageService', () => ({
  uploadImage: jest.fn()
}));
jest.mock('../../services/notificationService', () => ({
  createNotification: jest.fn(),
  NOTIFICATION_TYPES: { RESENA_RECIBIDA: 'resena_recibida' }
}));
jest.mock('../../services/pushNotificationService', () => ({
  sendPushNotification: jest.fn()
}));

describe('ReviewController', () => {
  let mockReq, mockRes, testUser, testService, testProfessional;

  beforeEach(async () => {
    // Create test data
    testUser = await prisma.usuarios.create({
      data: {
        email: 'cliente@test.com',
        hash_contrasena: 'hashedpass',
        nombre: 'Cliente Test',
        rol: 'cliente',
        esta_verificado: true
      }
    });

    testProfessional = await prisma.usuarios.create({
      data: {
        email: 'profesional@test.com',
        hash_contrasena: 'hashedpass',
        nombre: 'Profesional Test',
        rol: 'profesional',
        esta_verificado: true
      }
    });

    await prisma.perfiles_profesionales.create({
      data: {
        usuario_id: testProfessional.id,
        especialidad: 'Plomero',
        anos_experiencia: 5
      }
    });

    testService = await prisma.servicios.create({
      data: {
        cliente_id: testUser.id,
        profesional_id: testProfessional.id,
        descripcion: 'Servicio de prueba',
        estado: 'completado'
      }
    });

    // Setup mocks
    mockReq = {
      user: { id: testUser.id },
      body: {},
      file: null
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn()
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await prisma.resenas.deleteMany({});
    await prisma.servicios.deleteMany({});
    await prisma.perfiles_profesionales.deleteMany({});
    await prisma.usuarios.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('createReview', () => {
    beforeEach(() => {
      mockReq.body = {
        servicio_id: testService.id,
        calificacion: 5,
        comentario: 'Excelente servicio'
      };
    });

    it('should create review successfully', async () => {
      // Mock validation service
      validationService.validateReviewData.mockResolvedValue({
        isValid: true,
        data: {
          service: testService,
          rating: 5,
          comment: 'Excelente servicio',
          file: null
        }
      });

      // Mock rating service
      ratingService.updateAverageAfterReview.mockResolvedValue(4.5);

      await reviewController.createReview(mockReq, mockRes);

      expect(validationService.validateReviewData).toHaveBeenCalledWith(
        testUser.id,
        testService.id,
        5,
        'Excelente servicio',
        null
      );
      expect(ratingService.updateAverageAfterReview).toHaveBeenCalledWith(testProfessional.id);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      validationService.validateReviewData.mockResolvedValue({
        isValid: false,
        errors: ['Servicio no encontrado']
      });

      await reviewController.createReview(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Datos de reseña inválidos',
        details: ['Servicio no encontrado']
      });
    });

    it('should handle image upload', async () => {
      const mockFile = { buffer: Buffer.from('image-data') };
      mockReq.file = mockFile;

      validationService.validateReviewData.mockResolvedValue({
        isValid: true,
        data: {
          service: testService,
          rating: 4,
          comment: 'Buen servicio',
          file: mockFile
        }
      });

      const { uploadImage } = require('../../services/storageService');
      uploadImage.mockResolvedValue({ secure_url: 'https://cloudinary.com/image.jpg' });

      ratingService.updateAverageAfterReview.mockResolvedValue(4.0);

      await reviewController.createReview(mockReq, mockRes);

      expect(uploadImage).toHaveBeenCalledWith(mockFile.buffer, { folder: 'changanet/reviews' });
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should handle image upload errors', async () => {
      const mockFile = { buffer: Buffer.from('image-data') };
      mockReq.file = mockFile;

      validationService.validateReviewData.mockResolvedValue({
        isValid: true,
        data: {
          service: testService,
          rating: 4,
          comment: 'Buen servicio',
          file: mockFile
        }
      });

      const { uploadImage } = require('../../services/storageService');
      uploadImage.mockRejectedValue(new Error('Upload failed'));

      await reviewController.createReview(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Error al subir la imagen. Inténtalo de nuevo.'
      });
    });

    it('should send notifications on successful review', async () => {
      validationService.validateReviewData.mockResolvedValue({
        isValid: true,
        data: {
          service: { ...testService, cliente: { nombre: 'Cliente Test' }, profesional_id: testProfessional.id },
          rating: 5,
          comment: 'Excelente',
          file: null
        }
      });

      ratingService.updateAverageAfterReview.mockResolvedValue(5.0);

      const { createNotification } = require('../../services/notificationService');
      const { sendPushNotification } = require('../../services/pushNotificationService');

      createNotification.mockResolvedValue();
      sendPushNotification.mockResolvedValue();

      await reviewController.createReview(mockReq, mockRes);

      expect(createNotification).toHaveBeenCalledWith(
        testProfessional.id,
        'resena_recibida',
        'Has recibido una nueva reseña de Cliente Test (5⭐)',
        expect.objectContaining({
          servicio_id: testService.id,
          calificacion: 5,
          cliente_id: testUser.id
        })
      );

      expect(sendPushNotification).toHaveBeenCalledWith(
        testProfessional.id,
        'Nueva reseña recibida',
        'Has recibido una nueva reseña de Cliente Test (5⭐)',
        expect.any(Object)
      );
    });

    it('should handle notification errors gracefully', async () => {
      validationService.validateReviewData.mockResolvedValue({
        isValid: true,
        data: {
          service: testService,
          rating: 3,
          comment: 'Regular',
          file: null
        }
      });

      ratingService.updateAverageAfterReview.mockResolvedValue(3.0);

      const { sendPushNotification } = require('../../services/pushNotificationService');
      sendPushNotification.mockRejectedValue(new Error('Push failed'));

      await reviewController.createReview(mockReq, mockRes);

      // Should still succeed despite notification error
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should handle database errors', async () => {
      validationService.validateReviewData.mockRejectedValue(new Error('Database error'));

      await reviewController.createReview(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error al crear la reseña.' });
    });
  });

  describe('checkReviewEligibility', () => {
    it('should return eligible when user can review', async () => {
      mockReq.params = { servicioId: testService.id };

      validationService.validateReviewEligibility.mockResolvedValue({
        isValid: true,
        service: testService
      });

      await reviewController.checkReviewEligibility(mockReq, mockRes);

      expect(validationService.validateReviewEligibility).toHaveBeenCalledWith(testUser.id, testService.id);
      expect(mockRes.json).toHaveBeenCalledWith({ canReview: true });
    });

    it('should return not eligible with reason', async () => {
      mockReq.params = { servicioId: testService.id };

      validationService.validateReviewEligibility.mockResolvedValue({
        isValid: false,
        reason: 'Servicio no completado'
      });

      await reviewController.checkReviewEligibility(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        canReview: false,
        reason: 'Servicio no completado'
      });
    });

    it('should handle validation errors', async () => {
      mockReq.params = { servicioId: testService.id };

      validationService.validateReviewEligibility.mockRejectedValue(new Error('Validation error'));

      await reviewController.checkReviewEligibility(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error al verificar elegibilidad para reseña.' });
    });
  });

  describe('getReviewStats', () => {
    it('should return review stats successfully', async () => {
      mockReq.params = { professionalId: testProfessional.id };

      const mockStats = {
        professionalId: testProfessional.id,
        totalReviews: 5,
        averageRating: 4.2,
        ratingDistribution: { 1: 0, 2: 1, 3: 0, 4: 2, 5: 2 },
        positivePercentage: 80,
        lastReviewDate: new Date()
      };

      ratingService.getReviewStats.mockResolvedValue(mockStats);

      await reviewController.getReviewStats(mockReq, mockRes);

      expect(ratingService.getReviewStats).toHaveBeenCalledWith(testProfessional.id);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockStats);
    });

    it('should handle stats errors', async () => {
      mockReq.params = { professionalId: testProfessional.id };

      ratingService.getReviewStats.mockRejectedValue(new Error('Stats error'));

      await reviewController.getReviewStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error al obtener estadísticas de reseñas.' });
    });
  });

  describe('getReviewsByProfessional', () => {
    it('should return reviews for professional', async () => {
      mockReq.params = { professionalId: testProfessional.id };

      // Create a test review
      await prisma.resenas.create({
        data: {
          servicio_id: testService.id,
          cliente_id: testUser.id,
          calificacion: 5,
          comentario: 'Excelente servicio'
        }
      });

      await reviewController.getReviewsByProfessional(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
      const responseData = mockRes.json.mock.calls[0][0];
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData.length).toBeGreaterThan(0);
    });

    it('should handle database errors in getReviewsByProfessional', async () => {
      mockReq.params = { professionalId: 'invalid-id' };

      await reviewController.getReviewsByProfessional(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error al obtener las reseñas.' });
    });
  });
});
