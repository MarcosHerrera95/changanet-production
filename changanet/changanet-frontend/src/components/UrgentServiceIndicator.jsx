/**
 * @component UrgentServiceIndicator - Indicador visual para servicios urgentes
 * @descripción Componente para mostrar indicadores visuales claros para servicios urgentes (REQ-UR-04)
 * @sprint Sprint 4 – Servicios Urgentes
 * @tarjeta Tarjeta 1: [Frontend] Componente Indicador Visual para Servicios Urgentes
 * @impacto Social: Mejora la visibilidad y gestión de servicios urgentes
 */

import React from 'react';

/**
 * @función UrgentServiceIndicator - Componente principal
 * @descripción Muestra un indicador visual distintivo para servicios urgentes
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.isUrgent - Indica si el servicio es urgente
 * @param {string} props.size - Tamaño del indicador (small, medium, large)
 * @returns {JSX.Element} Indicador visual para servicio urgente
 */
const UrgentServiceIndicator = ({ isUrgent, size = 'medium' }) => {
  if (!isUrgent) return null;

  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-3 py-1',
    large: 'text-base px-4 py-2'
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full bg-red-100 text-red-800 ${sizeClasses[size]}`}>
      <svg className={`${size === 'small' ? 'w-3 h-3' : size === 'medium' ? 'w-4 h-4' : 'w-5 h-5'} mr-1`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      URGENTE
    </span>
  );
};

export default UrgentServiceIndicator;
