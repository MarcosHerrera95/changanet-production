import React from 'react';
import PropTypes from 'prop-types';

/**
 * LoadingSpinner - Componente global de carga
 * 
 * Usa exclusivamente el color primario institucional de Changánet (#E30613)
 * 
 * @param {string} size - Tamaño del spinner: 'sm', 'md', 'lg', 'xl'
 * @param {string} message - Mensaje opcional a mostrar
 * @param {string} className - Clases adicionales
 */
const LoadingSpinner = ({ size = 'md', message = '', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
    xl: 'h-16 w-16 border-4',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`
          animate-spin rounded-full
          border-primary/20 border-t-primary
          ${sizeClasses[size] || sizeClasses.md}
        `}
        role="status"
        aria-label="Cargando"
      />
      {message && (
        <p className={`mt-3 text-gray-600 ${textSizeClasses[size]}`}>
          {message}
        </p>
      )}
    </div>
  );
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  message: PropTypes.string,
  className: PropTypes.string,
};

export default LoadingSpinner;
