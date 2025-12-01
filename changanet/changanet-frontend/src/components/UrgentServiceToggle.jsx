/**
 * @component UrgentServiceToggle - Conmutador para servicios urgentes
 * @descripción Componente que permite a los clientes marcar servicios como urgentes (REQ-UR-02)
 * @sprint Sprint 4 – Servicios Urgentes
 * @tarjeta Tarjeta 2: [Frontend] Componente para Marcar Servicios como Urgentes
 * @impacto Social: Permite a los clientes priorizar servicios en situaciones de emergencia
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotificationContext } from '../context/NotificationContext';

/**
 * @función UrgentServiceToggle - Componente principal
 * @descripción Permite a los clientes marcar o desmarcar servicios como urgentes
 * @param {Object} props - Propiedades del componente
 * @param {string} props.serviceId - ID del servicio
 * @param {boolean} props.isUrgent - Estado actual de urgencia
 * @param {Function} props.onToggle - Callback cuando se cambia el estado de urgencia
 * @returns {JSX.Element} Conmutador de urgencia para servicios
 */
const UrgentServiceToggle = ({ serviceId, isUrgent, onToggle }) => {
  const { user } = useAuth();
  const notificationContext = useNotificationContext();
  const [loading, setLoading] = useState(false);

  // Solo permitir a los clientes marcar como urgente
  if (!user || (user.role !== 'cliente' && user.rol !== 'cliente')) {
    return null;
  }

  /**
   * @función handleToggleUrgent - Manejar el cambio de estado urgente
   * @descripción Envía solicitud al backend para cambiar el estado de urgencia
   */
  const handleToggleUrgent = async () => {
    try {
      setLoading(true);

      const token = sessionStorage.getItem('changanet_token');
      const response = await fetch(`/api/services/${serviceId}/urgent`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ es_urgente: !isUrgent })
      });

      if (response.ok) {
        const data = await response.json();
        onToggle(data.es_urgente);
        
        // Mostrar notificación de éxito
        if (notificationContext && notificationContext.showNotification) {
          notificationContext.showNotification(
            !isUrgent ? 
            'Servicio marcado como urgente correctamente' : 
            'Servicio desmarcado como urgente correctamente',
            'success'
          );
        }
      } else {
        const errorData = await response.json();
        if (notificationContext && notificationContext.showNotification) {
          notificationContext.showNotification(
            errorData.error || 'Error al cambiar el estado de urgencia',
            'error'
          );
        }
      }
    } catch (error) {
      console.error('Error toggling urgent service:', error);
      if (notificationContext && notificationContext.showNotification) {
        notificationContext.showNotification(
          'Error de conexión. Inténtalo nuevamente.',
          'error'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleUrgent}
      disabled={loading}
      className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        isUrgent 
          ? 'bg-red-100 text-red-800 hover:bg-red-200' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      } disabled:opacity-50`}
      aria-pressed={isUrgent}
      aria-label={isUrgent ? 'Desmarcar servicio como urgente' : 'Marcar servicio como urgente'}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Procesando...
        </>
      ) : (
        <>
          <svg 
            className={`h-4 w-4 mr-2 ${isUrgent ? 'text-red-600' : 'text-gray-500'}`} 
            fill={isUrgent ? "currentColor" : "none"} 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d={isUrgent ? 
                "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" : 
                "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              } 
            />
          </svg>
          {isUrgent ? 'Desmarcar urgente' : 'Marcar urgente'}
        </>
      )}
    </button>
  );
};

export default UrgentServiceToggle;
