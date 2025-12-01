/**
 * @función initializeFCM - Inicializar Firebase Cloud Messaging
 * @descripción Inicializa FCM para recibir notificaciones push
 * @sprint Sprint 2 – Notificaciones y Comunicación
 * @tarjeta Tarjeta 4: [Frontend] Implementar Notificaciones Push con Firebase
 * @impacto Social: Notificaciones push en tiempo real para usuarios
 * @returns {Promise<Object>} Resultado de la inicialización
 */

import { getToken, onMessage, getMessaging } from "firebase/messaging";
import { app } from "../config/firebaseConfig";

/**
 * @función initializeFCM - Inicialización de Firebase Cloud Messaging
 * @descripción Solicita permisos y obtiene token FCM para notificaciones push (REQ-20)
 * @sprint Sprint 2 – Notificaciones y Comunicación
 * @tarjeta Tarjeta 4: [Frontend] Implementar Notificaciones Push con Firebase
 * @impacto Social: Notificaciones que no requieren visión perfecta para ser efectivas
 * @returns {Promise<Object>} Resultado con token o error
 */
export const initializeFCM = async () => {
  try {
    // Skip FCM in development to avoid service worker issues
    if (import.meta.env.DEV) {
      console.log('FCM skipped in development mode');
      return { success: false, error: 'Skipped in development' };
    }

    const messaging = getMessaging(app);
    // Verificar si Firebase Messaging está disponible
    if (!messaging) {
      console.warn('Firebase Messaging no está disponible');
      return { success: false, error: 'Firebase Messaging no está disponible' };
    }

    // Verificar si Service Worker y Notification API están disponibles
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      console.warn('Service Worker o Notification API no soportados');
      return { success: false, error: 'Service Worker o Notification API no soportados' };
    }

    // Solicitar permiso para notificaciones
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Permiso de notificaciones denegado');
      return {
        success: false,
        error: 'Permiso de notificaciones denegado',
        permission: permission,
        canRetry: false // Una vez denegado, no se puede volver a solicitar
      };
    }

    // Registrar service worker si no está registrado
    let registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (!registration) {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registrado:', registration);
    }

    // Obtener token FCM real
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FCM_VAPID_KEY
    });

    if (!token) {
      console.warn('No se pudo obtener token FCM');
      return { success: false, error: 'No se pudo obtener token FCM' };
    }

    // Enviar token al backend para almacenarlo
    const authToken = localStorage.getItem('changanet_token');
    if (authToken) {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/notifications/register-token`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token })
        });

        if (!response.ok) {
          console.warn('Error registrando token FCM en backend');
        } else {
          console.log('Token FCM registrado en backend correctamente');
        }
      } catch (error) {
        console.warn('Error enviando token al backend:', error);
      }
    }

    console.log('FCM inicializado correctamente con token real');
    return { success: true, token };

  } catch (error) {
    console.error('Error inicializando FCM:', error);
    return { success: false, error: error.message };
  }
};

/**
 * @función onFCMMessage - Escuchar mensajes FCM
 * @descripción Configura listener para mensajes FCM entrantes con soporte móvil nativo
 * @sprint Sprint 2 – Notificaciones y Comunicación
 * @tarjeta Tarjeta 4: [Frontend] Implementar Notificaciones Push con Firebase
 * @impacto Social: Recepción de notificaciones en tiempo real
 * @param {Function} callback - Función a ejecutar cuando llega un mensaje
 * @returns {Function} Función para desuscribirse
 */
export const onFCMMessage = (callback) => {
  const messaging = getMessaging(app);
  // Verificar si messaging está disponible
  if (!messaging) {
    console.warn('Firebase Messaging no disponible para escuchar mensajes');
    return () => {}; // Retornar función vacía
  }

  try {
    // Escuchar mensajes FCM en primer plano
    return onMessage(messaging, (payload) => {
      console.log('Mensaje FCM recibido:', payload);

      // Mostrar notificación del navegador con soporte móvil mejorado
      if (Notification.permission === 'granted') {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        const notificationOptions = {
          body: payload.notification?.body || 'Tienes una nueva notificación',
          icon: '/vite.svg',
          data: payload.data || {},
          tag: 'changanet-notification',
          badge: '/vite.svg', // Para móviles
          requireInteraction: false, // Auto-cierre en móviles
          silent: false // Sonido activado
        };

        // Opciones específicas para móviles
        if (isMobile) {
          notificationOptions.vibrate = [200, 100, 200]; // Patrón de vibración
          notificationOptions.silent = false;
          // En móviles, las notificaciones nativas manejan el sonido automáticamente
        }

        const notification = new Notification(
          payload.notification?.title || 'Nueva notificación',
          notificationOptions
        );

        // Manejar click en la notificación con navegación inteligente
        notification.onclick = () => {
          notification.close();

          // Enfocar la ventana de la app
          window.focus();

          // Navegación inteligente basada en el tipo de notificación
          const data = payload.data || {};
          if (data.type) {
            switch (data.type) {
              case 'mensaje':
                // Navegar al chat con el usuario específico
                if (data.senderId) {
                  window.location.href = `/chat/${data.senderId}`;
                }
                break;
              case 'cotizacion_recibida':
                // Navegar a cotizaciones
                window.location.href = '/mis-cotizaciones';
                break;
              case 'resena_recibida':
                // Navegar al perfil profesional
                window.location.href = '/mi-cuenta';
                break;
              case 'servicio_completado':
                // Navegar a reseñas
                window.location.href = '/cliente/resenas';
                break;
              default:
                // Navegar al dashboard por defecto
                window.location.href = '/mi-cuenta';
            }
          }
        };

        // Auto-cierre para móviles (mejor UX)
        if (isMobile) {
          setTimeout(() => {
            notification.close();
          }, 5000); // 5 segundos en móvil
        }
      }

      // Ejecutar callback con los datos del mensaje
      callback(payload);
    });
  } catch (error) {
    console.error('Error configurando listener FCM:', error);
    return () => {}; // Retornar función vacía
  }
};

/**
 * @función sendFCMNotification - Enviar notificación push (desde cliente - solo para testing)
 * @descripción Envía notificación FCM desde el cliente (solo para desarrollo/testing)
 * @sprint Sprint 2 – Notificaciones y Comunicación
 * @tarjeta Tarjeta 4: [Frontend] Implementar Notificaciones Push con Firebase
 * @impacto Social: Testing accesible de notificaciones sin backend
 * @param {string} token - Token FCM del destinatario
 * @param {string} title - Título de la notificación
 * @param {string} body - Cuerpo de la notificación
 * @param {Object} data - Datos adicionales
 * @returns {Promise<Object>} Resultado del envío
 */
export const sendFCMNotification = async (token, title, body, data = {}) => {
  // En producción, esto se haría desde el servidor backend
  console.log('Enviando notificación FCM (cliente):', { token, title, body, data });

  // Para testing local, mostrar notificación del navegador
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/vite.svg',
      data,
      tag: 'changanet-test-notification'
    });
  }

  return { success: true };
};

/**
 * @función checkNotificationPermission - Verificar estado actual de permisos
 * @descripción Devuelve el estado actual de los permisos de notificación
 * @returns {string} Estado de permisos: 'granted', 'denied', 'default'
 */
export const checkNotificationPermission = () => {
  if (!('Notification' in window)) {
    return 'not-supported';
  }
  return Notification.permission;
};

/**
 * @función requestNotificationPermission - Solicitar permisos de notificación
 * @descripción Solicita permisos de notificación al usuario (solo funciona si no está denegado)
 * @returns {Promise<string>} Nuevo estado de permisos
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    throw new Error('Las notificaciones no están soportadas en este navegador');
  }

  if (Notification.permission === 'denied') {
    throw new Error('Los permisos de notificación están denegados. Debes habilitarlos manualmente en la configuración del navegador.');
  }

  const permission = await Notification.requestPermission();
  return permission;
};

/**
 * @función isMobileDevice - Detectar si el dispositivo es móvil
 * @descripción Verifica si el usuario está accediendo desde un dispositivo móvil
 * @returns {boolean} True si es dispositivo móvil
 */
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * @función initializeMobileNotifications - Inicializar notificaciones optimizadas para móvil
 * @descripción Configura FCM con opciones específicas para dispositivos móviles
 * @returns {Promise<Object>} Resultado de la inicialización
 */
export const initializeMobileNotifications = async () => {
  try {
    const isMobile = isMobileDevice();

    if (!isMobile) {
      // Para desktop, usar inicialización estándar
      return await initializeFCM();
    }

    // Inicialización específica para móviles
    console.log('Inicializando notificaciones optimizadas para móvil');

    const result = await initializeFCM();

    if (result.success) {
      // Configurar opciones específicas para móviles
      if ('vibrate' in navigator) {
        console.log('Vibración soportada en este dispositivo');
      }

      // Verificar si es PWA instalada
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    window.navigator.standalone === true;

      if (isPWA) {
        console.log('App ejecutándose como PWA - notificaciones nativas activas');
      }
    }

    return result;
  } catch (error) {
    console.error('Error inicializando notificaciones móviles:', error);
    return { success: false, error: error.message };
  }
};

/**
 * @función sendNotificationToBackend - Enviar notificación a través del backend
 * @descripción Envía notificación usando la API del backend para procesamiento completo
 * @sprint Sprint 2 – Notificaciones y Comunicación
 * @tarjeta Tarjeta 4: [Backend] Implementar Sistema de Notificaciones
 * @impacto Social: Notificaciones push y email automáticas para usuarios
 * @param {string} userId - ID del usuario destinatario
 * @param {string} type - Tipo de notificación
 * @param {string} message - Mensaje de la notificación
 * @param {Object} metadata - Datos adicionales
 * @returns {Promise<Object>} Resultado del envío
 */
export const sendNotificationToBackend = async (userId, type, message, metadata = {}) => {
  const token = localStorage.getItem('changanet_token');

  if (!token) {
    throw new Error('Usuario no autenticado');
  }

  try {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        type,
        message,
        metadata
      })
    });

    if (!response.ok) {
      throw new Error('Error enviando notificación');
    }

    return await response.json();
  } catch (error) {
    console.error('Error enviando notificación al backend:', error);
    throw error;
  }
};
