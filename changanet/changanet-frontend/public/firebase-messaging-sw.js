// Firebase Messaging Service Worker para Changánet
// Importar scripts de Firebase inmediatamente al inicio

// Importar Firebase SDKs
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyA93wqcIxGpPCfyUBMq4ZwBxJRDfkKGXfQ",
  authDomain: "changanet-notifications.firebaseapp.com",
  projectId: "changanet-notifications",
  storageBucket: "changanet-notifications.appspot.com",
  messagingSenderId: "926478045621",
  appId: "1:926478045621:web:6704a255057b65a6e549fc"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Manejar mensajes en background
messaging.onBackgroundMessage((payload) => {
  console.log('Mensaje FCM recibido en background:', payload);

  const notificationTitle = payload.notification?.title || 'Changánet';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes una nueva notificación',
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: payload.data?.tag || 'changanet-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'Ver'
      },
      {
        action: 'dismiss',
        title: 'Cerrar'
      }
    ],
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('Notificación FCM clickeada:', event);

  event.notification.close();

  if (event.action === 'view' || !event.action) {
    // Abrir la aplicación en la URL correspondiente
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        // Si ya hay una ventana abierta, enfocarla
        for (let client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// Manejar instalación del service worker
self.addEventListener('install', (event) => {
  console.log('Firebase Messaging Service Worker instalado');
  self.skipWaiting();
});

// Manejar activación del service worker
self.addEventListener('activate', (event) => {
  console.log('Firebase Messaging Service Worker activado');
  event.waitUntil(self.clients.claim());
});

console.log('Firebase Messaging Service Worker cargado correctamente');
