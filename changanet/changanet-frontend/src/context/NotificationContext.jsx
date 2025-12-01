import { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import { initializeMobileNotifications, onFCMMessage, checkNotificationPermission, requestNotificationPermission } from '../services/fcmService';
import { useNotifications } from '../hooks/useNotifications';

// Disable hot reload for this file to prevent React hooks issues during hot reload
if (import.meta.hot) {
  import.meta.hot.decline();
}

const NotificationContext = createContext();

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext debe usarse dentro de NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notificationPermission, setNotificationPermission] = useState('default');
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification
  } = useNotifications();

  useEffect(() => {
    if (user) {
      // Verificar estado actual de permisos
      setNotificationPermission(Notification.permission);

      // Inicializar FCM cuando el usuario está autenticado (con soporte móvil)
      initializeMobileNotifications().then((result) => {
        if (result.success) {
          console.log('FCM inicializado correctamente');
          setNotificationPermission('granted');
        } else {
          // Manejar errores de FCM de manera apropiada
          setNotificationPermission(result.permission || 'denied');

          if (result.error === 'Permiso de notificaciones denegado') {
            console.warn('Notificaciones push deshabilitadas por el usuario - continuando sin FCM');
            console.info('Para habilitar notificaciones:');
            console.info('1. Haz clic en el candado/ícono de información en la barra de direcciones');
            console.info('2. Busca "Notificaciones" en la configuración del sitio');
            console.info('3. Cambia el permiso a "Permitir"');
            console.info('4. Recarga la página');
          } else if (result.error === 'Skipped in development') {
            console.log('FCM omitido en modo desarrollo');
          } else {
            console.error('Error inicializando FCM:', result.error);
          }
        }
      }).catch((error) => {
        // Manejar errores no esperados en la inicialización
        if (error.message && error.message.includes('denegado')) {
          console.warn('Notificaciones push deshabilitadas por el usuario');
          setNotificationPermission('denied');
        } else {
          console.error('Error inesperado inicializando FCM:', error);
        }
      });

      // Cargar notificaciones iniciales
      fetchNotifications();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // Escuchar mensajes FCM en tiempo real
      const unsubscribe = onFCMMessage((payload) => {
        console.log('Mensaje FCM recibido:', payload);

        // Crear nueva notificación desde el payload FCM
        const newNotification = {
          id: Date.now().toString(),
          titulo: payload.notification?.title || 'Nueva notificación',
          mensaje: payload.notification?.body || 'Tienes una nueva notificación',
          fecha_creacion: new Date().toISOString(),
          leida: false,
          tipo: payload.data?.tipo || 'general',
          datos: payload.data || {}
        };

        // Agregar notificación al estado global
        addNotification(newNotification);

        // Mostrar notificación del navegador si es necesario
        if (Notification.permission === 'granted') {
          new Notification(newNotification.titulo, {
            body: newNotification.mensaje,
            icon: '/vite.svg',
            tag: 'changanet-notification'
          });
        }
      });

      return unsubscribe;
    }
  }, [user, addNotification]);

  const value = {
    notifications,
    unreadCount,
    notificationPermission,
    checkNotificationPermission,
    requestNotificationPermission,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export { NotificationContext };
