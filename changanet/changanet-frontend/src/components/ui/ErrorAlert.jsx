import React from 'react';
import PropTypes from 'prop-types';

/**
 * ErrorAlert - Componente para mostrar errores
 *
 * @param {string} message - Mensaje de error
 * @param {Function} onClose - Función para cerrar el error
 * @param {string} className - Clases adicionales
 */
const ErrorAlert = ({ message, onClose, className = '' }) => {
  if (!message) return null;

  return (
    <div className={`bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-red-500 mr-2">⚠️</span>
          <span className="text-sm">{message}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-red-500 hover:text-red-700 ml-4"
            aria-label="Cerrar error"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

ErrorAlert.propTypes = {
  message: PropTypes.string,
  onClose: PropTypes.func,
  className: PropTypes.string,
};

export default ErrorAlert;
