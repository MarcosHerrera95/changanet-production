/**
 * ReviewSystem - Componente principal que integra todo el sistema de reseñas
 * Ejemplo de integración completa del sistema de reseñas y valoraciones
 * Implementa lazy loading para optimizar rendimiento de carga inicial
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import RatingDisplay from './RatingDisplay';
import reviewService from '../services/reviewService';

// Lazy loading de componentes pesados
const ReviewForm = lazy(() => import('./ReviewForm'));
const ReviewList = lazy(() => import('./ReviewList'));

// Componente de loading para lazy loading
const LoadingFallback = ({ message = 'Cargando...' }) => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mr-3"></div>
    <span className="text-gray-600">{message}</span>
  </div>
);

/**
 * ReviewSystem - Sistema completo de reseñas para una página de servicio/profesional
 * Incluye formulario condicional, lista de reseñas y estadísticas en vivo
 */
const ReviewSystem = ({
  servicioId,
  profesionalId,
  showForm = true,
  showStats = true,
  className = ''
}) => {
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Cargar estadísticas iniciales
  useEffect(() => {
    if (profesionalId && showStats) {
      loadInitialStats();
    }
  }, [profesionalId]);

  // Suscribirse a actualizaciones en vivo
  useEffect(() => {
    if (profesionalId && showStats) {
      const unsubscribe = reviewService.subscribeToStats(profesionalId, (newStats) => {
        setStats(newStats);
        setLoadingStats(false);
      });

      return unsubscribe;
    }
  }, [profesionalId]);

  const loadInitialStats = async () => {
    try {
      const statsData = await reviewService.getProfessionalStats(profesionalId);
      setStats(statsData);
    } catch (error) {
      console.error('Error cargando estadísticas iniciales:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleReviewSubmitted = (review) => {
    setReviewSubmitted(true);
    // El reviewService ya actualiza las estadísticas automáticamente
    console.log('Reseña enviada:', review);
  };

  return (
    <div className={`review-system space-y-8 ${className}`}>
      {/* Encabezado con estadísticas principales */}
      {showStats && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Valoraciones y Reseñas</h2>

          {loadingStats ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-48 mb-4"></div>
              <div className="h-4 bg-gray-300 rounded w-32"></div>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <RatingDisplay
                  rating={stats.averageRating}
                  size="lg"
                  showLabel={true}
                />
                <p className="text-sm text-gray-600 mt-2">
                  Basado en {stats.totalReviews} reseña{stats.totalReviews !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {stats.positivePercentage}%
                </div>
                <div className="text-sm text-gray-600">
                  Reseñas positivas
                </div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {stats.lastReviewDate ?
                    new Date(stats.lastReviewDate).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    }) :
                    'N/A'
                  }
                </div>
                <div className="text-sm text-gray-600">
                  Última reseña
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No hay estadísticas disponibles</p>
          )}
        </div>
      )}

      {/* Formulario de reseña (solo si está habilitado y no se ha enviado) */}
      {showForm && !reviewSubmitted && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Deja tu reseña
          </h3>
          <Suspense fallback={<LoadingFallback message="Cargando formulario..." />}>
            <ReviewForm
              servicio_id={servicioId}
              onReviewSubmitted={handleReviewSubmitted}
            />
          </Suspense>
        </div>
      )}

      {/* Mensaje de confirmación tras envío */}
      {reviewSubmitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🎉</span>
            <div>
              <h3 className="font-semibold text-emerald-800">¡Gracias por tu reseña!</h3>
              <p className="text-emerald-700 text-sm">
                Tu opinión ayuda a otros usuarios a tomar mejores decisiones.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de reseñas del profesional */}
      <Suspense fallback={<LoadingFallback message="Cargando reseñas..." />}>
        <ReviewList
          professionalId={profesionalId}
          showStats={false} // Ya mostramos las stats arriba
          className="mt-8"
        />
      </Suspense>
    </div>
  );
};

export default ReviewSystem;
