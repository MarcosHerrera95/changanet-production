# 📄 CÓDIGO CORREGIDO FINAL - FIREBASE CONFIGURATION

## 1️⃣ firebase-messaging-sw.js (Service Worker - CORREGIDO)

**Archivo:** `changanet-frontend/public/firebase-messaging-sw.js`

**Cambio:** Línea 12 - Unificado `storageBucket` a formato `.appspot.com`

```javascript
// Firebase Messaging Service Worker para Changánet
// Importar scripts de Firebase inmediatamente al inicio

// Importar Firebase SDKs
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyA93wqcIxGpPCfyUBMq4ZwBxJRDfkKGXfQ",
  authDomain: "changanet-notifications.firebaseapp.com",
  projectId: "changanet-notifications",
  storageBucket: "changanet-notifications.appspot.com",  // ✅ CORREGIDO (era: firebasestorage.app)
  messagingSenderId: "926478045621",
  appId: "1:926478045621:web:6704a255057b65a6e549fc"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Manejar mensajes en background
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'Notificación Changánet';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes un nuevo mensaje',
    icon: payload.notification?.icon || '/changanet-icon.png',
    badge: '/changanet-badge.png',
    data: payload.data || {},
    tag: 'changanet-notification'
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar click en notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
      .then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Manejar cierre de notificación
self.addEventListener('notificationclose', (event) => {
  console.log('[firebase-messaging-sw.js] Notification closed');
});

// Push event listener (fallback para notificaciones push)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log('[firebase-messaging-sw.js] Push notification received:', data);
  }
});
```

**Notas:**
- ✅ StorageBucket ahora es `changanet-notifications.appspot.com` (no `firebasestorage.app`)
- ✅ Todos los 6 campos coinciden exactamente con `firebaseConfig.js`
- ✅ El rest del código permanece igual (no cambios en lógica)

---

## 2️⃣ .env.example (Nuevo - DOCUMENTACIÓN)

**Archivo:** `changanet-frontend/.env.example`

```bash
# ============================================
# Firebase Cloud Messaging (FCM) Configuration
# ============================================
# Clave pública VAPID para obtener tokens FCM
# Obtener desde: Firebase Console > Project Settings > Cloud Messaging > Server public key
# IMPORTANTE: Esta es la clave PÚBLICA de la Key Pair; no compartir la privada
VITE_FCM_VAPID_KEY=BBcq0rChqpfQkexHGzbzAcPNyEcXQ6pHimpgltESqpSgmMmiQEPK2yfv87taE80q794Q_wtvRc8Zlnal75mqpoo

# ============================================
# Backend API Configuration
# ============================================
# URL base del servidor backend (sin trailing slash)
# En desarrollo: http://localhost:3003
# En producción: https://changanet-backend-xxxxx.onrender.com
VITE_BACKEND_URL=http://localhost:3003

# ============================================
# Google Maps API (opcional)
# ============================================
# Si se usa Google Maps, se carga desde CDN con clave API
# La clave ya está embebida en el SDK de Google Maps
```

**Propósito:**
- Documentación clara para devs
- Template para configurar `.env` local
- Evita que se comita `.env` con secretos (debe estar en `.gitignore`)

---

## 3️⃣ firebaseConfig.js (REFERENCIA - SIN CAMBIOS)

**Archivo:** `changanet-frontend/src/config/firebaseConfig.js`

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getMessaging } from 'firebase/messaging';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA93wqcIxGpPCfyUBMq4ZwBxJRDfkKGXfQ",
  authDomain: "changanet-notifications.firebaseapp.com",
  projectId: "changanet-notifications",
  storageBucket: "changanet-notifications.appspot.com",  // ✅ Reference config
  messagingSenderId: "926478045621",
  appId: "1:926478045621:web:6704a255057b65a6e549fc"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);

// Obtener instancias de servicios
export const auth = getAuth(app);
export const messaging = getMessaging(app);

export default app;
```

**Status:** ✅ Sin cambios (referencia para comparar)

---

## 4️⃣ TABLA DE CAMBIOS

| Componente | Archivo | Línea | Antes | Después | Status |
|-----------|---------|-------|-------|---------|--------|
| Firebase Storage Bucket | `firebase-messaging-sw.js` | 12 | `firebasestorage.app` | `appspot.com` | ✅ CORREGIDO |
| Documentación Variables | `.env.example` | NEW | N/A | Archivo nuevo con VAPID + Backend URL | ✅ CREADO |

---

## 5️⃣ VERIFICACIÓN DE COHERENCIA

### Antes (INCONSISTENTE ❌)
```
firebaseConfig.js:         storageBucket: "changanet-notifications.appspot.com"
firebase-messaging-sw.js:  storageBucket: "changanet-notifications.firebasestorage.app"
                                           ↑ DIFERENTE
```

### Después (CONSISTENTE ✅)
```
firebaseConfig.js:         storageBucket: "changanet-notifications.appspot.com"
firebase-messaging-sw.js:  storageBucket: "changanet-notifications.appspot.com"
                                           ↑ IDÉNTICO
```

---

## 6️⃣ INTEGRACIÓN CON OTROS ARCHIVOS

### Archivos que usan `firebaseConfig.js`
```
✓ src/services/fcmService.js     → import { app, messaging } from '@/config/firebaseConfig'
✓ src/components/GoogleLoginButton.jsx → import { auth } from '@/config/firebaseConfig'
✓ src/services/storageService.js → import { app } from '@/config/firebaseConfig'
```

**Impacto de cambios:** ✅ NINGUNO - Solo cambió `storageBucket` valor, no la estructura

### Archivos que usan `firebase-messaging-sw.js`
```
✓ public/firebase-messaging-sw.js (auto-cargado por navegador)
✓ src/services/fcmService.js     → navigator.serviceWorker.register('/firebase-messaging-sw.js')
```

**Impacto de cambios:** ✅ Positivo - Ahora SW está consistente con main app

---

## 7️⃣ NOTAS PARA DEVELOPERS

### ✅ Hacer después de aplicar los cambios:

1. **Crear `.env` local con:**
   ```bash
   cp .env.example .env.local
   # Editar .env.local si es necesario
   ```

2. **En Render (Frontend), establecer:**
   ```
   VITE_FCM_VAPID_KEY=BBcq0rChqpfQkexHGzbzAcPNyEcXQ6pHimpgltESqpSgmMmiQEPK2yfv87taE80q794Q_wtvRc8Zlnal75mqpoo
   VITE_BACKEND_URL=https://[your-backend-render-url]
   ```

3. **Verificar en Firebase Console:**
   - Authorized Domains incluya tu frontend Render URL
   - VAPID key matches el valor anterior

### ⚠️ NO hacer:

- ❌ No commitear `.env` con secretos a GitHub
- ❌ No cambiar el `storageBucket` a otros formatos (usar siempre `.appspot.com`)
- ❌ No usar diferentes valores de storageBucket en diferentes archivos

---

## 8️⃣ SOPORTE / TROUBLESHOOTING

**Si FCM no funciona:**
1. Verificar que `VITE_FCM_VAPID_KEY` esté establecida en Render
2. Verificar que matches el valor en Firebase Console
3. Ver console.log en DevTools para ver si `[FCM] Token obtained` aparece

**Si Login no funciona:**
1. Verificar que `VITE_BACKEND_URL` sea correcto
2. Verificar que Authorized Domains incluya tu frontend URL
3. Ver Network tab para verificar respuesta de backend (200 OK, no 401/403/500)

**Si Service Worker no carga:**
1. Verificar que archivo existe en `public/firebase-messaging-sw.js`
2. Verificar que register URL es `/firebase-messaging-sw.js` (absoluta desde raíz)
3. Ver Console en DevTools para errores

---

**Versión:** 1.0
**Fecha:** 2024
**Proyecto:** Changanet Production - Firebase Audit
**Status:** ✅ Listo para producción
