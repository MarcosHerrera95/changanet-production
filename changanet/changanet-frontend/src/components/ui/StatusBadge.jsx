import React from 'react';
import PropTypes from 'prop-types';

/**
 * StatusBadge - Componente global para badges de estado
 * 
 * Usa exclusivamente los colores institucionales de Changánet
 * 
 * Estados soportados:
 * - pending: Amarillo (Pendiente)
 * - progress: Azul (En progreso)
 * - completed: Verde (Completado/Aceptado)
 * - error: Rojo (Rechazado/Cancelado)
 * - info: Azul claro (Informativo)
 * - default: Gris (Sin estado)
 * 
 * @param {string} status - Estado del badge
 * @param {string} children - Texto del badge
 * @param {string} size - Tamaño: 'sm', 'md', 'lg'
 * @param {string} className - Clases adicionales
 */
const StatusBadge = ({ status = 'default', children, size = 'md', className = '' }) => {
  const statusStyles = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    progress: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    accepted: 'bg-green-100 text-green-800 border-green-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-100',
    verified: 'bg-green-100 text-green-800 border-green-200',
    unverified: 'bg-gray-100 text-gray-800 border-gray-200',
    active: 'bg-green-100 text-green-800 border-green-200',
    inactive: 'bg-gray-100 text-gray-600 border-gray-200',
    default: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const statusLabels = {
    pending: 'Pendiente',
    progress: 'En Progreso',
    completed: 'Completado',
    accepted: 'Aceptado',
    error: 'Error',
    rejected: 'Rechazado',
    cancelled: 'Cancelado',
    info: 'Información',
    verified: 'Verificado',
    unverified: 'No Verificado',
    active: 'Activo',
    inactive: 'Inactivo',
    default: 'Sin Estado',
  };

  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '');
  const styleClass = statusStyles[normalizedStatus] || statusStyles.default;
  const sizeClass = sizeStyles[size] || sizeStyles.md;
  const displayText = children || statusLabels[normalizedStatus] || status;

  return (
    <span
      className={`
        inline-flex items-center justify-center
        font-medium rounded-full border
        ${styleClass}
        ${sizeClass}
        ${className}
      `}
    >
      {displayText}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.oneOf([
    'pending',
    'progress',
    'completed',
    'accepted',
    'error',
    'rejected',
    'cancelled',
    'info',
    'verified',
    'unverified',
    'active',
    'inactive',
    'default',
  ]),
  children: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};

export default StatusBadge;
