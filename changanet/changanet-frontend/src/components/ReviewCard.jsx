import { memo } from 'react';
import RatingDisplay from './RatingDisplay';

/**
 * ReviewCard - Componente para mostrar una reseña individual
 * Incluye información del cliente, calificación, comentario y foto opcional
 * Optimizado con React.memo y useMemo para evitar re-renders innecesarios
 */
const ReviewCard = memo(({
  review,
  showServiceInfo = true,
  compact = false,
  className = ''
}) => {
  if (!review) return null;

  // Formatear fecha
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Obtener iniciales del cliente
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
      <div className="flex items-start space-x-4">
        {/* Avatar del cliente */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
            {getInitials(review.cliente?.nombre)}
          </div>
        </div>

        {/* Contenido de la reseña */}
        <div className="flex-1 min-w-0">
          {/* Header con nombre y fecha */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <h4 className="text-lg font-semibold text-gray-900">
                {review.cliente?.nombre || 'Cliente Anónimo'}
              </h4>
              {review.cliente?.verificado && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  ✓ Verificado
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {formatDate(review.creado_en)}
            </span>
          </div>

          {/* Calificación */}
          <div className="mb-3">
            <RatingDisplay
              rating={review.calificacion}
              size={compact ? 'sm' : 'md'}
              showLabel={false}
            />
          </div>

          {/* Información del servicio */}
          {showServiceInfo && review.servicio && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Servicio:</span> {review.servicio.descripcion || 'Servicio realizado'}
              </p>
            </div>
          )}

          {/* Comentario */}
          {review.comentario && (
            <div className="mb-4">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {review.comentario}
              </p>
            </div>
          )}

          {/* Foto del servicio con lazy loading optimizado */}
          {review.url_foto && (
            <div className="mb-4">
              <div className="relative">
                <img
                  src={review.url_foto}
                  alt="Foto del servicio reseñado"
                  className="w-full max-w-md h-auto rounded-lg shadow-sm object-cover transition-opacity duration-300"
                  loading="lazy"
                  decoding="async"
                  onLoad={(e) => {
                    e.target.style.opacity = '1';
                  }}
                  style={{ opacity: 0 }}
                />
                <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                  📷 Foto del servicio
                </div>
              </div>
            </div>
          )}

          {/* Footer con acciones adicionales */}
          <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-4">
              <span>ID: {review.id.slice(0, 8)}...</span>
              {review.servicio_id && (
                <span>Servicio: {review.servicio_id.slice(0, 8)}...</span>
              )}
            </div>

            {/* Acciones (útil/no útil) - futuro */}
            <div className="flex items-center space-x-2 opacity-50">
              <button className="flex items-center space-x-1 hover:text-emerald-600 transition-colors">
                <span>👍</span>
                <span>Útil</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ReviewCard.displayName = 'ReviewCard';

export default ReviewCard;
