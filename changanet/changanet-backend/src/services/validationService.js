/**
 * Servicio de Validación para el Sistema de Reseñas y Valoraciones
 * Implementa validaciones de negocio para reseñas según la arquitectura definida
 *
 * FUNCIONALIDADES:
 * - Validación de elegibilidad para crear reseñas
 * - Validación de calificaciones (1-5 estrellas)
 * - Validación de comentarios (sanitización)
 * - Validación de archivos de imagen
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ValidationService {
  /**
   * Valida si un usuario puede crear una reseña para un servicio específico
   * REQ-25: Solo servicios completados pueden ser reseñados
   * RB-01: Una reseña por servicio
   *
   * @param {string} userId - ID del usuario que intenta reseñar
   * @param {string} serviceId - ID del servicio a reseñar
   * @returns {Promise<Object>} Resultado de la validación
   */
  async validateReviewEligibility(userId, serviceId) {
    try {
      // Verificar que el servicio existe
      const service = await prisma.servicios.findUnique({
        where: { id: serviceId },
        include: {
          cliente: true,
          profesional: true
        }
      });

      if (!service) {
        return {
          isValid: false,
          reason: 'Servicio no encontrado'
        };
      }

      // Verificar que el usuario es el cliente del servicio
      if (service.cliente_id !== userId) {
        return {
          isValid: false,
          reason: 'Solo el cliente puede reseñar este servicio'
        };
      }

      // Verificar que el servicio está completado
      if (service.estado !== 'completado') {
        return {
          isValid: false,
          reason: 'El servicio debe estar completado para poder reseñar'
        };
      }

      // Verificar que no existe una reseña previa (RB-01)
      const existingReview = await prisma.resenas.findUnique({
        where: { servicio_id: serviceId }
      });

      if (existingReview) {
        return {
          isValid: false,
          reason: 'Ya se ha dejado una reseña para este servicio'
        };
      }

      return {
        isValid: true,
        service: service
      };
    } catch (error) {
      console.error('Error validating review eligibility:', error);
      throw new Error('Error al validar elegibilidad para reseña');
    }
  }

  /**
   * Valida una calificación de estrellas
   * REQ-21: Calificación debe ser un número entero entre 1 y 5
   *
   * @param {any} rating - Valor de calificación a validar
   * @returns {Object} Resultado de la validación
   */
  validateRating(rating) {
    // Verificar que es un número
    const numRating = parseInt(rating);
    if (isNaN(numRating)) {
      return {
        isValid: false,
        reason: 'La calificación debe ser un número'
      };
    }

    // Verificar rango 1-5
    if (numRating < 1 || numRating > 5) {
      return {
        isValid: false,
        reason: 'La calificación debe estar entre 1 y 5 estrellas'
      };
    }

    return {
      isValid: true,
      rating: numRating
    };
  }

  /**
   * Sanitiza y valida un comentario de reseña
   * REQ-22: Comentario opcional pero con límites razonables
   *
   * @param {string} comment - Comentario a validar
   * @returns {Object} Resultado de la validación
   */
  validateComment(comment) {
    // Si no hay comentario, es válido (opcional)
    if (!comment || comment.trim() === '') {
      return {
        isValid: true,
        comment: null
      };
    }

    // Sanitizar comentario (remover scripts y HTML básico)
    const sanitized = comment
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remover scripts
      .replace(/<[^>]*>/g, '') // Remover HTML
      .trim();

    // Verificar longitud máxima (1000 caracteres razonable)
    if (sanitized.length > 1000) {
      return {
        isValid: false,
        reason: 'El comentario no puede exceder 1000 caracteres'
      };
    }

    return {
      isValid: true,
      comment: sanitized
    };
  }

  /**
   * Valida un archivo de imagen para reseña
   * REQ-23: Solo imágenes, máximo 5MB
   *
   * @param {Object} file - Archivo de multer
   * @returns {Object} Resultado de la validación
   */
  validateReviewImage(file) {
    // Verificar que existe archivo
    if (!file) {
      return {
        isValid: true, // Imagen opcional
        file: null
      };
    }

    // Verificar tipo MIME (solo imágenes)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return {
        isValid: false,
        reason: 'Solo se permiten archivos de imagen (JPEG, PNG, WebP)'
      };
    }

    // Verificar tamaño máximo (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        reason: 'La imagen no puede superar los 5MB'
      };
    }

    return {
      isValid: true,
      file: file
    };
  }

  /**
   * Valida todos los datos de una reseña completa
   *
   * @param {string} userId - ID del usuario
   * @param {string} serviceId - ID del servicio
   * @param {any} rating - Calificación
   * @param {string} comment - Comentario
   * @param {Object} file - Archivo de imagen
   * @returns {Promise<Object>} Resultado completo de validación
   */
  async validateReviewData(userId, serviceId, rating, comment, file) {
    const results = {
      isValid: true,
      errors: [],
      data: {}
    };

    // Validar elegibilidad
    const eligibility = await this.validateReviewEligibility(userId, serviceId);
    if (!eligibility.isValid) {
      results.isValid = false;
      results.errors.push(eligibility.reason);
      return results;
    }
    results.data.service = eligibility.service;

    // Validar calificación
    const ratingValidation = this.validateRating(rating);
    if (!ratingValidation.isValid) {
      results.isValid = false;
      results.errors.push(ratingValidation.reason);
    } else {
      results.data.rating = ratingValidation.rating;
    }

    // Validar comentario
    const commentValidation = this.validateComment(comment);
    if (!commentValidation.isValid) {
      results.isValid = false;
      results.errors.push(commentValidation.reason);
    } else {
      results.data.comment = commentValidation.comment;
    }

    // Validar imagen
    const imageValidation = this.validateReviewImage(file);
    if (!imageValidation.isValid) {
      results.isValid = false;
      results.errors.push(imageValidation.reason);
    } else {
      results.data.file = imageValidation.file;
    }

    return results;
  }
}

module.exports = new ValidationService();
