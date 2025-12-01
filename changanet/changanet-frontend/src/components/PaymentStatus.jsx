import React, { useState, useEffect } from 'react';
import { usePayment } from '../hooks/usePayment';
import { usePaymentAPI } from '../hooks/usePaymentAPI';
import LoadingSpinner from './ui/LoadingSpinner';
import ErrorAlert from './ui/ErrorAlert';
import PaymentStatusBadge from './ui/PaymentStatusBadge';

/**
 * PaymentStatus - Componente para mostrar el estado de un pago en tiempo real
 *
 * @param {string} paymentId - ID del pago a monitorear
 * @param {boolean} autoRefresh - Si debe actualizar automáticamente
 * @param {number} refreshInterval - Intervalo de actualización en ms
 * @param {Function} onStatusChange - Callback cuando cambia el estado
 */
const PaymentStatus = ({
  paymentId,
  autoRefresh = true,
  refreshInterval = 5000,
  onStatusChange
}) => {
  const { paymentStatus, loading, error, clearError } = usePayment();
  const { getPaymentStatus } = usePaymentAPI();

  const [currentStatus, setCurrentStatus] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get current payment status from context or fetch it
  const status = paymentStatus[paymentId] || currentStatus;

  // Fetch payment status
  const fetchStatus = async () => {
    if (!paymentId) return;

    try {
      setIsRefreshing(true);
      const data = await getPaymentStatus(paymentId);

      if (data && data.status !== currentStatus) {
        setCurrentStatus(data.status);
        setLastUpdated(new Date());

        if (onStatusChange) {
          onStatusChange(data.status, data);
        }
      }
    } catch {
      // Error handled by context
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [paymentId]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !paymentId) return;

    const interval = setInterval(fetchStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, paymentId, refreshInterval]);

  // Manual refresh
  const handleRefresh = () => {
    fetchStatus();
  };

  const getStatusMessage = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'pendiente':
        return {
          title: 'Pago Pendiente',
          description: 'Tu pago está siendo procesado por MercadoPago.',
          icon: '⏳',
          color: 'text-yellow-600'
        };
      case 'approved':
      case 'aprobado':
      case 'completed':
      case 'completado':
        return {
          title: 'Pago Completado',
          description: 'Tu pago ha sido procesado exitosamente. Los fondos están en custodia.',
          icon: '✅',
          color: 'text-green-600'
        };
      case 'in_custody':
      case 'en_custodia':
        return {
          title: 'Fondos en Custodia',
          description: 'Los fondos están retenidos hasta la confirmación del servicio.',
          icon: '🔒',
          color: 'text-blue-600'
        };
      case 'released':
      case 'liberado':
        return {
          title: 'Fondos Liberados',
          description: 'Los fondos han sido liberados al profesional.',
          icon: '💰',
          color: 'text-green-600'
        };
      case 'cancelled':
      case 'cancelado':
        return {
          title: 'Pago Cancelado',
          description: 'El pago ha sido cancelado.',
          icon: '❌',
          color: 'text-red-600'
        };
      case 'failed':
      case 'fallido':
        return {
          title: 'Pago Fallido',
          description: 'Hubo un problema al procesar tu pago.',
          icon: '⚠️',
          color: 'text-red-600'
        };
      default:
        return {
          title: 'Estado Desconocido',
          description: 'Estamos verificando el estado de tu pago.',
          icon: '❓',
          color: 'text-gray-600'
        };
    }
  };

  const statusInfo = getStatusMessage(status);

  if (!paymentId) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No se especificó un ID de pago.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Estado del Pago
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || loading}
          className="text-[#E30613] hover:text-[#C9050F] disabled:opacity-50 disabled:cursor-not-allowed"
          title="Actualizar estado"
        >
          {isRefreshing ? (
            <LoadingSpinner size="sm" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </button>
      </div>

      <ErrorAlert message={error} onClose={clearError} className="mb-4" />

      <div className="space-y-4">
        {/* Payment ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID del Pago
          </label>
          <p className="text-sm font-mono bg-gray-50 px-3 py-2 rounded border">
            {paymentId}
          </p>
        </div>

        {/* Status Badge */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado Actual
          </label>
          <PaymentStatusBadge status={status} />
        </div>

        {/* Status Description */}
        <div className={`p-4 rounded-lg border ${statusInfo.color.includes('red') ? 'bg-red-50 border-red-200' :
          statusInfo.color.includes('green') ? 'bg-green-50 border-green-200' :
          statusInfo.color.includes('yellow') ? 'bg-yellow-50 border-yellow-200' :
          statusInfo.color.includes('blue') ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-start">
            <span className="text-2xl mr-3">{statusInfo.icon}</span>
            <div>
              <h4 className={`font-medium ${statusInfo.color}`}>
                {statusInfo.title}
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                {statusInfo.description}
              </p>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="text-xs text-gray-500 text-right">
            Última actualización: {lastUpdated.toLocaleString()}
          </div>
        )}

        {/* Loading State */}
        {(loading || isRefreshing) && (
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner size="sm" message="Actualizando estado..." />
          </div>
        )}

        {/* Status-specific actions */}
        {status === 'in_custody' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-medium text-blue-800 mb-2">¿Qué sucede ahora?</h5>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Los fondos están seguros en custodia</li>
              <li>• Se liberarán automáticamente en 24 horas</li>
              <li>• O cuando el profesional confirme el servicio completado</li>
              <li>• Recibirás una notificación cuando se liberen</li>
            </ul>
          </div>
        )}

        {status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h5 className="font-medium text-green-800 mb-2">¡Pago exitoso!</h5>
            <p className="text-sm text-green-700">
              Tu pago ha sido procesado correctamente. El profesional puede ahora acceder a los fondos.
            </p>
          </div>
        )}

        {(status === 'failed' || status === 'cancelled') && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h5 className="font-medium text-red-800 mb-2">Pago no completado</h5>
            <p className="text-sm text-red-700 mb-3">
              {status === 'failed'
                ? 'Hubo un problema al procesar tu pago. Puedes intentar nuevamente.'
                : 'El pago fue cancelado. Puedes crear un nuevo pago si lo deseas.'
              }
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#E30613] text-white px-4 py-2 rounded text-sm hover:bg-[#C9050F]"
            >
              Intentar nuevamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentStatus;
