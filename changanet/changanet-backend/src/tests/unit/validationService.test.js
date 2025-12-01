// src/tests/unit/validationService.test.js
const validationService = require('../../services/validationService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('ValidationService', () => {
  let testUser, testProfessional, testService;

  beforeEach(async () => {
    // Crear datos de prueba
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

  describe('validateReviewEligibility', () => {
    it('should allow review for completed service by client', async () => {
      const result = await validationService.validateReviewEligibility(testUser.id, testService.id);

      expect(result.isValid).toBe(true);
      expect(result.service).toBeDefined();
      expect(result.service.id).toBe(testService.id);
    });

    it('should reject review for non-existent service', async () => {
      const result = await validationService.validateReviewEligibility(testUser.id, 'non-existent-id');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Servicio no encontrado');
    });

    it('should reject review if user is not the client', async () => {
      const otherUser = await prisma.usuarios.create({
        data: {
          email: 'other@test.com',
          hash_contrasena: 'hashedpass',
          nombre: 'Other User',
          rol: 'cliente',
          esta_verificado: true
        }
      });

      const result = await validationService.validateReviewEligibility(otherUser.id, testService.id);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Solo el cliente puede reseñar este servicio');
    });

    it('should reject review for pending service', async () => {
      await prisma.servicios.update({
        where: { id: testService.id },
        data: { estado: 'pendiente' }
      });

      const result = await validationService.validateReviewEligibility(testUser.id, testService.id);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('El servicio debe estar completado para poder reseñar');
    });

    it('should reject duplicate review for same service', async () => {
      // Crear reseña existente
      await prisma.resenas.create({
        data: {
          servicio_id: testService.id,
          cliente_id: testUser.id,
          calificacion: 5,
          comentario: 'Excelente servicio'
        }
      });

      const result = await validationService.validateReviewEligibility(testUser.id, testService.id);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Ya se ha dejado una reseña para este servicio');
    });
  });

  describe('validateRating', () => {
    it('should accept valid ratings 1-5', () => {
      for (let rating = 1; rating <= 5; rating++) {
        const result = validationService.validateRating(rating);
        expect(result.isValid).toBe(true);
        expect(result.rating).toBe(rating);
      }
    });

    it('should reject ratings below 1', () => {
      const result = validationService.validateRating(0);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('La calificación debe estar entre 1 y 5 estrellas');
    });

    it('should reject ratings above 5', () => {
      const result = validationService.validateRating(6);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('La calificación debe estar entre 1 y 5 estrellas');
    });

    it('should reject non-numeric ratings', () => {
      const invalidRatings = ['invalid', null, undefined, {}, [], '5.5', '0', '6'];

      invalidRatings.forEach(rating => {
        const result = validationService.validateRating(rating);
        expect(result.isValid).toBe(false);
        if (rating === '5.5' || rating === '0' || rating === '6') {
          expect(result.reason).toBe('La calificación debe estar entre 1 y 5 estrellas');
        } else {
          expect(result.reason).toBe('La calificación debe ser un número');
        }
      });
    });

    it('should handle string numbers correctly', () => {
      const stringRatings = ['1', '2', '3', '4', '5'];

      stringRatings.forEach(rating => {
        const result = validationService.validateRating(rating);
        expect(result.isValid).toBe(true);
        expect(result.rating).toBe(parseInt(rating));
      });
    });

    it('should handle float numbers by truncating', () => {
      const result = validationService.validateRating(3.7);
      expect(result.isValid).toBe(true);
      expect(result.rating).toBe(3); // Should be truncated to integer
    });
  });

  describe('validateComment', () => {
    it('should accept valid comments', () => {
      const result = validationService.validateComment('Excelente servicio');
      expect(result.isValid).toBe(true);
      expect(result.comment).toBe('Excelente servicio');
    });

    it('should accept null/empty comments', () => {
      const result = validationService.validateComment('');
      expect(result.isValid).toBe(true);
      expect(result.comment).toBe(null);
    });

    it('should sanitize HTML from comments', () => {
      const result = validationService.validateComment('<script>alert("xss")</script>Comentario<script>');
      expect(result.isValid).toBe(true);
      expect(result.comment).toBe('Comentario');
    });

    it('should sanitize complex XSS attempts', () => {
      const xssAttempts = [
        '<img src=x onerror=alert(1)>',
        '<script>alert("xss")</script>',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<a href="javascript:alert(1)">Click me</a>',
        '<div onmouseover=alert(1)>Hover me</div>'
      ];

      xssAttempts.forEach(attempt => {
        const result = validationService.validateComment(attempt);
        expect(result.isValid).toBe(true);
        expect(result.comment).toBe(''); // Should be empty after sanitization
      });
    });

    it('should preserve safe HTML-like text', () => {
      const safeText = 'Comentario con < 3 y > 5 pero sin HTML real';
      const result = validationService.validateComment(safeText);
      expect(result.isValid).toBe(true);
      expect(result.comment).toBe(safeText);
    });

    it('should handle null and undefined comments', () => {
      const nullResult = validationService.validateComment(null);
      expect(nullResult.isValid).toBe(true);
      expect(nullResult.comment).toBe(null);

      const undefinedResult = validationService.validateComment(undefined);
      expect(undefinedResult.isValid).toBe(true);
      expect(undefinedResult.comment).toBe(null);
    });

    it('should reject comments too long', () => {
      const longComment = 'a'.repeat(1001);
      const result = validationService.validateComment(longComment);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('El comentario no puede exceder 1000 caracteres');
    });
  });

  describe('validateReviewImage', () => {
    it('should accept valid image file', () => {
      const mockFile = {
        mimetype: 'image/jpeg',
        size: 1024 * 1024 // 1MB
      };

      const result = validationService.validateReviewImage(mockFile);
      expect(result.isValid).toBe(true);
      expect(result.file).toBe(mockFile);
    });

    it('should accept no file (optional)', () => {
      const result = validationService.validateReviewImage(null);
      expect(result.isValid).toBe(true);
      expect(result.file).toBe(null);
    });

    it('should reject non-image files', () => {
      const mockFile = {
        mimetype: 'text/plain',
        size: 1024
      };

      const result = validationService.validateReviewImage(mockFile);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Solo se permiten archivos de imagen (JPEG, PNG, WebP)');
    });

    it('should reject files too large', () => {
      const mockFile = {
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024 // 6MB
      };

      const result = validationService.validateReviewImage(mockFile);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('La imagen no puede superar los 5MB');
    });

    it('should accept all valid image types', () => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

      validTypes.forEach(type => {
        const mockFile = {
          mimetype: type,
          size: 1024 * 1024 // 1MB
        };

        const result = validationService.validateReviewImage(mockFile);
        expect(result.isValid).toBe(true);
        expect(result.file).toBe(mockFile);
      });
    });

    it('should reject invalid file types', () => {
      const invalidTypes = ['text/plain', 'application/pdf', 'video/mp4', 'audio/mpeg'];

      invalidTypes.forEach(type => {
        const mockFile = {
          mimetype: type,
          size: 1024 * 1024
        };

        const result = validationService.validateReviewImage(mockFile);
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe('Solo se permiten archivos de imagen (JPEG, PNG, WebP)');
      });
    });

    it('should handle edge case file sizes', () => {
      // Exactly 5MB should be valid
      const exactLimitFile = {
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024
      };

      const result = validationService.validateReviewImage(exactLimitFile);
      expect(result.isValid).toBe(true);

      // Just over 5MB should be invalid
      const overLimitFile = {
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024 + 1
      };

      const overResult = validationService.validateReviewImage(overLimitFile);
      expect(overResult.isValid).toBe(false);
    });

    it('should handle malformed file objects', () => {
      const malformedFiles = [
        { mimetype: 'image/jpeg' }, // missing size
        { size: 1024 }, // missing mimetype
        {}, // empty object
        null,
        undefined
      ];

      malformedFiles.forEach(file => {
        if (file === null || file === undefined) {
          const result = validationService.validateReviewImage(file);
          expect(result.isValid).toBe(true); // Optional field
          expect(result.file).toBe(null);
        } else {
          // These should fail validation due to missing properties
          const result = validationService.validateReviewImage(file);
          expect(result.isValid).toBe(false);
        }
      });
    });
  });

  describe('validateReviewData', () => {
    it('should validate complete valid review data', async () => {
      const mockFile = {
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake-image-data')
      };

      const result = await validationService.validateReviewData(
        testUser.id,
        testService.id,
        5,
        'Excelente servicio',
        mockFile
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data.rating).toBe(5);
      expect(result.data.comment).toBe('Excelente servicio');
      expect(result.data.file).toBe(mockFile);
    });

    it('should validate review data without image', async () => {
      const result = await validationService.validateReviewData(
        testUser.id,
        testService.id,
        4,
        'Buen servicio',
        null
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data.rating).toBe(4);
      expect(result.data.comment).toBe('Buen servicio');
      expect(result.data.file).toBe(null);
    });

    it('should validate review data without comment', async () => {
      const result = await validationService.validateReviewData(
        testUser.id,
        testService.id,
        3,
        '',
        null
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data.rating).toBe(3);
      expect(result.data.comment).toBe(null);
    });

    it('should collect multiple validation errors', async () => {
      const result = await validationService.validateReviewData(
        testUser.id,
        testService.id,
        6, // Invalid rating
        'a'.repeat(1001), // Too long comment
        null
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('La calificación debe estar entre 1 y 5 estrellas');
      expect(result.errors).toContain('El comentario no puede exceder 1000 caracteres');
    });

    it('should handle eligibility failure in validateReviewData', async () => {
      // Create a review first to make the service ineligible
      await prisma.resenas.create({
        data: {
          servicio_id: testService.id,
          cliente_id: testUser.id,
          calificacion: 5,
          comentario: 'Existing review'
        }
      });

      const result = await validationService.validateReviewData(
        testUser.id,
        testService.id,
        4,
        'Another comment',
        null
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe('Ya se ha dejado una reseña para este servicio');
    });

    it('should sanitize XSS in comments during full validation', async () => {
      const xssComment = '<script>alert("xss")</script>Malicious content<img src=x onerror=alert(1)>';

      const result = await validationService.validateReviewData(
        testUser.id,
        testService.id,
        2,
        xssComment,
        null
      );

      expect(result.isValid).toBe(true);
      expect(result.data.comment).toBe('Malicious content');
    });

    it('should handle database errors gracefully', async () => {
      // Mock prisma to throw error
      const originalFindUnique = prisma.servicios.findUnique;
      prisma.servicios.findUnique = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(validationService.validateReviewData(
        testUser.id,
        'invalid-id',
        3,
        'Test comment',
        null
      )).rejects.toThrow('Error al validar elegibilidad para reseña');

      // Restore original function
      prisma.servicios.findUnique = originalFindUnique;
    });
  });
});
