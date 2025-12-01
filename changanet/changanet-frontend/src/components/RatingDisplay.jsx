/**
 * Componente de Visualización de Calificaciones Mejorado
 * Muestra ratings con íconos intuitivos y feedback visual avanzado
 */

import { useMemo } from 'react';

const RatingDisplay = ({
  rating,
  maxRating = 5,
  size = 'md',
  showLabel = true,
  showPercentage = false,
  interactive = false,
  onRatingChange
}) => {
  // Calcular porcentaje y nivel de calidad
  const ratingInfo = useMemo(() => {
    const percentage = (rating / maxRating) * 100;
    let quality, color, bgColor, icon, label;

    if (rating >= 4.5) {
      quality = 'excellent';
      color = 'text-emerald-600';
      bgColor = 'bg-emerald-50 border-emerald-200';
      icon = '🌟';
      label = 'Excelente';
    } else if (rating >= 4.0) {
      quality = 'very-good';
      color = 'text-teal-600';
      bgColor = 'bg-teal-50 border-teal-200';
      icon = '✨';
      label = 'Muy Bueno';
    } else if (rating >= 3.5) {
      quality = 'good';
      color = 'text-amber-600';
      bgColor = 'bg-amber-50 border-amber-200';
      icon = '👍';
      label = 'Bueno';
    } else if (rating >= 3.0) {
      quality = 'fair';
      color = 'text-orange-600';
      bgColor = 'bg-orange-50 border-orange-200';
      icon = '👌';
      label = 'Regular';
    } else {
      quality = 'needs-improvement';
      color = 'text-red-600';
      bgColor = 'bg-red-50 border-red-200';
      icon = '⚠️';
      label = 'Necesita Mejorar';
    }

    return { percentage, quality, color, bgColor, icon, label };
  }, [rating, maxRating]);

  // Generar estrellas con diferentes estados
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0);

    // Estrellas completas
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star
          key={`full-${i}`}
          filled={true}
          size={size}
          interactive={interactive}
          onClick={() => interactive && onRatingChange?.(i + 1)}
        />
      );
    }

    // Media estrella
    if (hasHalfStar) {
      stars.push(
        <Star
          key="half"
          half={true}
          size={size}
          interactive={interactive}
          onClick={() => interactive && onRatingChange?.(fullStars + 1)}
        />
      );
    }

    // Estrellas vacías
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star
          key={`empty-${i}`}
          filled={false}
          size={size}
          interactive={interactive}
          onClick={() => interactive && onRatingChange?.(fullStars + (hasHalfStar ? 1 : 0) + i + 1)}
        />
      );
    }

    return stars;
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  return (
    <div className={`rating-display ${sizeClasses[size]}`}>
      {/* Rating principal con badge de calidad */}
      <div className={`inline-flex items-center px-3 py-2 rounded-full border ${ratingInfo.bgColor} ${ratingInfo.color} font-semibold shadow-sm`}>
        <span className="mr-2 text-lg">{ratingInfo.icon}</span>
        <span className="font-bold text-lg">{rating?.toFixed(1) || 'N/A'}</span>
        {showLabel && (
          <span className="ml-2 text-sm opacity-90">{ratingInfo.label}</span>
        )}
        {showPercentage && (
          <span className="ml-2 text-xs opacity-75">({ratingInfo.percentage.toFixed(0)}%)</span>
        )}
      </div>

      {/* Estrellas visuales */}
      <div className="flex items-center mt-2 space-x-1">
        {renderStars()}
        <span className="ml-2 text-sm text-gray-500">
          ({rating?.toFixed(1) || '0.0'} de {maxRating})
        </span>
      </div>

      {/* Barra de progreso visual */}
      <div className="mt-2">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              ratingInfo.quality === 'excellent' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
              ratingInfo.quality === 'very-good' ? 'bg-gradient-to-r from-teal-400 to-cyan-500' :
              ratingInfo.quality === 'good' ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
              ratingInfo.quality === 'fair' ? 'bg-gradient-to-r from-orange-400 to-red-400' :
              'bg-gradient-to-r from-red-400 to-pink-500'
            }`}
            style={{ width: `${ratingInfo.percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Componente auxiliar para estrellas individuales
const Star = ({ filled, half = false, size, interactive, onClick }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  return (
    <button
      onClick={onClick}
      disabled={!interactive}
      className={`${sizeClasses[size]} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'} focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 rounded`}
      aria-label={filled ? 'Estrella llena' : half ? 'Media estrella' : 'Estrella vacía'}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`${filled ? 'text-amber-400' : half ? 'text-amber-400' : 'text-gray-300'} drop-shadow-sm`}
      >
        {/* Estrella base */}
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill={filled ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Media estrella (solo si half=true) */}
        {half && (
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77V2z"
            fill="currentColor"
            stroke="none"
          />
        )}
      </svg>
    </button>
  );
};

export default RatingDisplay;
