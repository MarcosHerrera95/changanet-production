import { useState } from 'react';

/**
 * RatingStars - Componente interactivo para selección de calificación con estrellas
 * Permite seleccionar de 1 a 5 estrellas con feedback visual y accesibilidad
 */
const RatingStars = ({
  value = 0,
  onChange,
  maxStars = 5,
  size = 'md',
  disabled = false,
  showLabel = true,
  required = false,
  error = null
}) => {
  const [hoverValue, setHoverValue] = useState(0);

  // Tamaños disponibles
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10'
  };

  // Etiquetas descriptivas para cada calificación
  const getRatingLabel = (rating) => {
    const labels = {
      1: 'Muy malo',
      2: 'Malo',
      3: 'Regular',
      4: 'Bueno',
      5: 'Excelente'
    };
    return labels[rating] || '';
  };

  // Manejar clic en estrella
  const handleStarClick = (starValue) => {
    if (disabled) return;
    onChange?.(starValue);
  };

  // Manejar hover
  const handleMouseEnter = (starValue) => {
    if (disabled) return;
    setHoverValue(starValue);
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    setHoverValue(0);
  };

  // Determinar qué estrellas mostrar como activas
  const getActiveStars = () => {
    return hoverValue || value;
  };

  const activeStars = getActiveStars();

  return (
    <div className="space-y-2">
      {/* Label */}
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700">
          Calificación {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Estrellas */}
      <div className="flex items-center space-x-2">
        <div className="flex space-x-1">
          {[...Array(maxStars)].map((_, index) => {
            const starValue = index + 1;
            const isActive = starValue <= activeStars;

            return (
              <button
                key={starValue}
                type="button"
                onClick={() => handleStarClick(starValue)}
                onMouseEnter={() => handleMouseEnter(starValue)}
                onMouseLeave={handleMouseLeave}
                disabled={disabled}
                className={`
                  ${sizeClasses[size]}
                  transition-all duration-200 ease-in-out
                  focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1
                  rounded
                  ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'}
                `}
                aria-label={`Calificar con ${starValue} estrella${starValue !== 1 ? 's' : ''}: ${getRatingLabel(starValue)}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-full h-full"
                >
                  <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    fill={isActive ? '#f59e0b' : '#d1d5db'}
                    stroke={isActive ? '#f59e0b' : '#9ca3af'}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            );
          })}
        </div>

        {/* Etiqueta de calificación actual */}
        {activeStars > 0 && (
          <span className="text-sm text-gray-600 ml-2">
            {activeStars} estrella{activeStars !== 1 ? 's' : ''} - {getRatingLabel(activeStars)}
          </span>
        )}
      </div>

      {/* Mensaje de error */}
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}

      {/* Indicador de requerido */}
      {required && value === 0 && (
        <p className="text-xs text-gray-500 mt-1">
          Selecciona una calificación para continuar
        </p>
      )}
    </div>
  );
};

export default RatingStars;
