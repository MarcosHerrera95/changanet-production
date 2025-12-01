/**
 * @component ReputationBadge - Insignia de Reputación y Verificación
 * @descripción Muestra insignia "Verificado" si aprobado, con elementos de reputación
 * @sprint Sprint 3 – Verificación de Identidad y Reputación
 * @tarjeta Implementar Insignias de Verificación y Reputación
 * @impacto Confianza: Aumenta la confianza del cliente al ver profesionales verificados
 */

import React from 'react';

const ReputationBadge = ({
  isVerified = false,
  reputationScore = null,
  size = 'medium',
  showText = true,
  className = '',
  compact = false
}) => {
  if (!isVerified && !reputationScore) return null;

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6'
  };

  const textSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-1 ${className}`}>
        {isVerified && (
          <div className="inline-flex items-center space-x-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-2 py-1 rounded-full shadow-sm">
            <svg
              className={`${sizeClasses[size]} fill-current`}
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {showText && (
              <span className={`font-medium ${textSizeClasses[size]}`}>
                Verificado
              </span>
            )}
          </div>
        )}

        {reputationScore !== null && (
          <div className="inline-flex items-center space-x-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full shadow-sm">
            <svg
              className={`${sizeClasses[size]} fill-current`}
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className={`font-medium ${textSizeClasses[size]}`}>
              {reputationScore.toFixed(1)}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center ${className}`}>
      {/* Insignia de Verificación */}
      {isVerified && (
        <div className="inline-flex items-center space-x-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-2 rounded-full shadow-sm mr-2">
          <svg
            className={`${sizeClasses[size]} fill-current`}
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {showText && (
            <span className={`font-semibold ${textSizeClasses[size]}`}>
              Profesional Verificado
            </span>
          )}
        </div>
      )}

      {/* Sistema de Reputación */}
      {reputationScore !== null && (
        <div className="inline-flex items-center space-x-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-2 rounded-full shadow-sm">
          <svg
            className={`${sizeClasses[size]} fill-current`}
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className={`font-semibold ${textSizeClasses[size]}`}>
            Reputación: {reputationScore.toFixed(1)} ⭐
          </span>
        </div>
      )}
    </div>
  );
};

export default ReputationBadge;
