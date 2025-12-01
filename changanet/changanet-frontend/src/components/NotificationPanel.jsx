/**
 * @component NotificationPanel - Panel de notificaciones del usuario
 * @descripción Panel completo para gestionar notificaciones (REQ-19, REQ-20)
 * @sprint Sprint 2 – Notificaciones y Comunicación
 * @tarjeta Tarjeta 4: [Frontend] Implementar Panel de Notificaciones
 * @impacto Social: Comunicación accesible y en tiempo real para todos los usuarios
 */

import { useState, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const NotificationPanel = ({ isOpen, onClose }) => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications
  } = useNotifications();

  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  // Filtrar notificaciones según el filtro seleccionado
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.esta_leido;
    if (filter === 'read') return notification.esta_leido;
    return true;
  });

  // Función para obtener el ícono según el tipo de notificación
  const getNotificationIcon = (type) => {
    const icons = {
      bienvenida: '🎉',
      cotizacion: '💰',
      mensaje: '💬',
      turno_agendado: '📅',
      resena_recibida: '⭐',
      pago_liberado: '💳',
      verificacion_aprobada: '✅',
      default: '🔔'
    };
    return icons[type] || icons.default;
  };

  // Función para manejar click en notificación
  const handleNotificationClick = async (notification) => {
    // Marcar como leída si no lo está
    if (!notification.esta_leido) {
      await markAsRead(notification.id);
    }

    // Aquí se podría agregar lógica para redirigir según el tipo
    // Por ejemplo: chat, perfil, servicio específico, etc.
    console.log('Notificación clickeada:', notification);

    // Cerrar panel después de interactuar
    onClose();
  };

  // Función para formatear fecha relativa
  const formatDate = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: es
      });
    } catch (error) {
      return 'Fecha desconocida';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
      {/* Overlay para cerrar */}
      <div
        className="fixed inset-0 bg-black bg-opacity-25"
        onClick={onClose}
      />

      {/* Panel de notificaciones */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-[#E30613] text-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Notificaciones
              {unreadCount > 0 && (
                <span className="ml-2 bg-white text-[#E30613] text-xs px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-xl"
            >
              ×
            </button>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded ${
                filter === 'all'
                  ? 'bg-white text-[#E30613]'
                  : 'bg-[#E30613] bg-opacity-20 text-white'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 text-sm rounded ${
                filter === 'unread'
                  ? 'bg-white text-[#E30613]'
                  : 'bg-[#E30613] bg-opacity-20 text-white'
              }`}
            >
              No leídas ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-3 py-1 text-sm rounded ${
                filter === 'read'
                  ? 'bg-white text-[#E30613]'
                  : 'bg-[#E30613] bg-opacity-20 text-white'
              }`}
            >
              Leídas
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E30613] mx-auto mb-2"></div>
              Cargando notificaciones...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">🔔</div>
              <p>No hay notificaciones {filter !== 'all' ? `en ${filter}` : ''}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.esta_leido ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.esta_leido ? 'font-medium' : 'text-gray-600'}`}>
                        {notification.mensaje}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(notification.creado_en)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="text-gray-400 hover:text-red-500 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        {notifications.length > 0 && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex gap-2">
              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="flex-1 bg-[#E30613] text-white px-4 py-2 rounded text-sm hover:bg-[#C20511] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Marcar todas como leídas
              </button>
              <button
                onClick={refreshNotifications}
                className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-100"
              >
                🔄
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
