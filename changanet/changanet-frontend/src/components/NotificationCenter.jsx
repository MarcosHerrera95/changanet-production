import { useState, useEffect, useContext } from 'react';
import { NotificationContext } from '../context/NotificationContext';

const NotificationCenter = ({ isOpen, onClose }) => {
  const { notifications, markAsRead, markAllAsRead, deleteNotification, unreadCount } = useContext(NotificationContext);
  const [filter, setFilter] = useState('all'); // all, unread, read

  const handleNotificationClick = (notification) => {
    // Navegar según el tipo de notificación
    switch (notification.tipo) {
      case 'mensaje':
        // Navegar al chat usando parámetro ?user= (chat simplificado)
        window.location.href = `/chat?user=${notification.datos?.senderId}`;
        break;
      case 'cotizacion':
        // Las cotizaciones se gestionan a través del modal en el dashboard del cliente
        // Solo navegar al dashboard del cliente donde está el botón de cotizaciones
        window.location.href = '/cliente/dashboard';
        break;
      case 'servicio_agendado':
        // Navegar a servicios
        window.location.href = '/cliente/servicios';
        break;
      default:
        // Mantener en la misma página
        break;
    }
    onClose();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.notification-center')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.esta_leido;
    if (filter === 'read') return notification.esta_leido;
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-16 z-50">
      <div className="notification-center bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Notificaciones</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filtros y acciones */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  filter === 'all' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Todas ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  filter === 'unread' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                No leídas ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  filter === 'read' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Leídas ({notifications.length - unreadCount})
              </button>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>

        {/* Lista de notificaciones */}
        <div className="max-h-96 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">🔔</div>
              <p>No hay notificaciones {filter === 'unread' ? 'no leídas' : filter === 'read' ? 'leídas' : ''}</p>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                  !notification.esta_leido ? 'bg-emerald-50' : ''
                }`}
                onClick={() => {
                  if (!notification.esta_leido) {
                    markAsRead(notification.id);
                  }
                  handleNotificationClick(notification);
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {notification.titulo}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {notification.mensaje}
                    </p>
                    <div className="flex items-center mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        notification.tipo === 'mensaje' ? 'bg-blue-100 text-blue-800' :
                        notification.tipo === 'cotizacion' ? 'bg-green-100 text-green-800' :
                        notification.tipo === 'servicio_agendado' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {notification.tipo === 'mensaje' && '💬 Mensaje'}
                        {notification.tipo === 'cotizacion' && '📋 Cotización'}
                        {notification.tipo === 'servicio_agendado' && '📅 Servicio'}
                        {notification.tipo === 'bienvenida' && '🎉 Bienvenida'}
                        {!['mensaje', 'cotizacion', 'servicio_agendado', 'bienvenida'].includes(notification.tipo) && notification.tipo}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notification.creado_en).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 ml-3">
                    {!notification.esta_leido && (
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    )}

                    <div className="flex space-x-1">
                      {!notification.esta_leido && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="text-emerald-600 hover:text-emerald-700 p-1"
                          title="Marcar como leída"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Eliminar notificación"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Recibe notificaciones en tiempo real sobre tus actividades en Changánet
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
