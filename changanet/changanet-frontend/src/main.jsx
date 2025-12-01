import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthProvider';
import { NotificationProvider } from './context/NotificationContext';
import './index.css';

// IMPORTANTE: Inicializar Sentry lo más temprano posible
import { initializeSentry } from './config/sentryConfig';
initializeSentry();

// Initialize performance monitoring
import performanceMonitor from './utils/performanceMonitor';
performanceMonitor.mark('app-start');

// PWA Service Worker Registration - DESHABILITADO TEMPORALMENTE PARA DEBUG
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    console.log('🔍 SW registrations:', registrations.length);
    registrations.forEach(reg => console.log('🔍 SW scope:', reg.scope));

    // En desarrollo, desregistrar SW para evitar conflictos con hot reload
    if (import.meta.env.DEV) {
      console.log('🔧 Unregistering SW in dev mode');
      registrations.forEach(reg => reg.unregister());
    }
  });
}
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', async () => {
//     try {
//       // Registrar service worker para PWA
//       const registration = await navigator.serviceWorker.register('/sw.js', {
//         scope: '/'
//       });

//       console.log('✅ Service Worker PWA registrado:', registration.scope);

//       // Manejar actualizaciones del service worker
//       registration.addEventListener('updatefound', () => {
//         const newWorker = registration.installing;
//         if (newWorker) {
//           newWorker.addEventListener('statechange', () => {
//             if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
//               // Nueva versión disponible
//               console.log('🔄 Nueva versión del Service Worker disponible');

//               // Mostrar notificación al usuario (opcional)
//               if (confirm('Hay una nueva versión disponible. ¿Quieres actualizar?')) {
//                 newWorker.postMessage({ type: 'SKIP_WAITING' });
//                 window.location.reload();
//               }
//             }
//           });
//         }
//       });

//       // FCM Integration: Solo en producción
//       if (import.meta.env.PROD) {
//         try {
//           // Registrar service worker adicional para FCM
//           const fcmRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
//           console.log('✅ Service Worker FCM registrado:', fcmRegistration.scope);
//         } catch (fcmError) {
//           console.error('❌ Error registrando Service Worker FCM:', fcmError);
//         }
//       }

//     } catch (error) {
//       console.error('❌ Error registrando Service Worker PWA:', error);
//     }
//   });
// }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </AuthProvider>
  </React.StrictMode>,
);

// Mark when React app is fully mounted
performanceMonitor.mark('react-mounted');
