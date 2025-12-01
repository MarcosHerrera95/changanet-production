import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { usePayment } from '../../hooks/usePayment';

/**
 * PaymentNotification - Componente para mostrar notificaciones de pago
 */
const PaymentNotification = () => {
  const { notifications, removeNotification } = usePayment();

  useEffect(() => {
    // Auto-remove notifications after 10 seconds (handled in context)
  }, [notifications]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

/**
 * NotificationItem - Componente individual para cada notificación
 */
const NotificationItem = ({ notification, onClose }) => {
  const getNotificationStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          icon: '✅'
        };
      case 'error':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          icon: '❌'
        };
      case 'warning':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          icon: '⚠️'
        };
      case 'info':
      default:
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          icon: 'ℹ️'
        };
    }
  };

  const styles = getNotificationStyles(notification.type);

  return (
    <div className={`max-w-sm w-full ${styles.bgColor} border ${styles.borderColor} ${styles.textColor} px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-lg">{styles.icon}</span>
        </div>
        <div className="ml-3 w-0 flex-1">
          <p className="text-sm font-medium">{notification.message}</p>
          {notification.details && (
            <p className="mt-1 text-xs opacity-75">{notification.details}</p>
          )}
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={onClose}
            className={`inline-flex ${styles.textColor} hover:opacity-75 focus:outline-none focus:opacity-75`}
          >
            <span className="sr-only">Cerrar</span>
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

NotificationItem.propTypes = {
  notification: PropTypes.shape({
    id: PropTypes.number.isRequired,
    type: PropTypes.oneOf(['success', 'error', 'warning', 'info']).isRequired,
    message: PropTypes.string.isRequired,
    details: PropTypes.string,
    timestamp: PropTypes.instanceOf(Date)
  }).isRequired,
  onClose: PropTypes.func.isRequired
};

export default PaymentNotification;
