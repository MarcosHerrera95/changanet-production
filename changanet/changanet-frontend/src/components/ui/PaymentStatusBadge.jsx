import React from 'react';
import PropTypes from 'prop-types';

/**
 * PaymentStatusBadge - Componente para mostrar el estado de pagos
 *
 * @param {string} status - Estado del pago
 * @param {string} className - Clases adicionales
 */
const PaymentStatusBadge = ({ status, className = '' }) => {
  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'completado':
        return {
          text: 'Completado',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          icon: '✅'
        };
      case 'pending':
      case 'pendiente':
        return {
          text: 'Pendiente',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          icon: '⏳'
        };
      case 'in_custody':
      case 'en_custodia':
        return {
          text: 'En Custodia',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          icon: '🔒'
        };
      case 'processing':
      case 'procesando':
        return {
          text: 'Procesando',
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          icon: '⚙️'
        };
      case 'failed':
      case 'fallido':
        return {
          text: 'Fallido',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          icon: '❌'
        };
      case 'cancelled':
      case 'cancelado':
        return {
          text: 'Cancelado',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          icon: '🚫'
        };
      case 'refunded':
      case 'reembolsado':
        return {
          text: 'Reembolsado',
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          icon: '↩️'
        };
      default:
        return {
          text: status || 'Desconocido',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          icon: '❓'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}>
      <span className="mr-1">{config.icon}</span>
      {config.text}
    </span>
  );
};

PaymentStatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default PaymentStatusBadge;
