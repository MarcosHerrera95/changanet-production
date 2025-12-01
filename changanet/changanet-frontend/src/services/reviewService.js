/**
 * Servicio de Reseñas - Changánet
 * Maneja la lógica de negocio para reseñas y actualizaciones en vivo
 */

import { reviewsAPI } from './apiService';

/**
 * Servicio para gestionar reseñas con actualizaciones en vivo
 */
class ReviewService {
  constructor() {
    this.listeners = new Set();
    this.professionalStats = new Map();
  }

  /**
   * Suscribirse a actualizaciones de estadísticas de profesionales
   */
  subscribeToStats(professionalId, callback) {
    const key = `stats_${professionalId}`;
    this.listeners.add({ key, callback });

    // Retornar función para desuscribirse
    return () => {
      this.listeners.forEach(listener => {
        if (listener.key === key && listener.callback === callback) {
          this.listeners.delete(listener);
        }
      });
    };
  }

  /**
   * Notificar cambios en estadísticas
   */
  notifyStatsUpdate(professionalId, stats) {
    this.professionalStats.set(professionalId, stats);

    this.listeners.forEach(listener => {
      if (listener.key === `stats_${professionalId}`) {
        listener.callback(stats);
      }
    });
  }

  /**
   * Obtener estadísticas en caché
   */
  getCachedStats(professionalId) {
    return this.professionalStats.get(professionalId);
  }

  /**
   * Crear reseña y actualizar estadísticas automáticamente
   */
  async createReview(reviewData) {
    try {
      const review = await reviewsAPI.create(reviewData);

      // Extraer professionalId del servicio (asumiendo que viene en la respuesta)
      if (review.servicio?.profesional_id) {
        // Actualizar estadísticas automáticamente
        await this.refreshProfessionalStats(review.servicio.profesional_id);
      }

      return review;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Refrescar estadísticas de un profesional
   */
  async refreshProfessionalStats(professionalId) {
    try {
      const stats = await reviewsAPI.getProfessionalStats(professionalId);
      this.notifyStatsUpdate(professionalId, stats);
      return stats;
    } catch (error) {
      console.error('Error refrescando estadísticas:', error);
      throw error;
    }
  }

  /**
   * Verificar elegibilidad para reseñar
   */
  async checkReviewEligibility(serviceId) {
    return await reviewsAPI.checkEligibility(serviceId);
  }

  /**
   * Obtener reseñas de un profesional con paginación
   */
  async getProfessionalReviews(professionalId, page = 1, limit = 10, sortBy = 'newest') {
    return await reviewsAPI.getProfessionalReviews(professionalId, page, limit, sortBy);
  }

  /**
   * Obtener estadísticas de un profesional
   */
  async getProfessionalStats(professionalId) {
    // Intentar caché primero
    const cached = this.getCachedStats(professionalId);
    if (cached) {
      return cached;
    }

    // Si no está en caché, obtener de API
    return await this.refreshProfessionalStats(professionalId);
  }

  /**
   * Obtener reseñas del cliente actual
   */
  async getClientReviews() {
    return await reviewsAPI.getClientReviews();
  }

  /**
   * Calcular promedio local (útil para preview antes de enviar)
   */
  calculateLocalAverage(existingReviews = [], newRating = null) {
    if (!existingReviews.length && !newRating) return 0;

    const allRatings = [...existingReviews.map(r => r.calificacion)];
    if (newRating) allRatings.push(newRating);

    return allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length;
  }

  /**
   * Limpiar caché (útil al cambiar de usuario)
   */
  clearCache() {
    this.professionalStats.clear();
  }
}

// Instancia singleton
const reviewService = new ReviewService();

export default reviewService;
