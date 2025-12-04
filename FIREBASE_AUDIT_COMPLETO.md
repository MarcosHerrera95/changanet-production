# 📋 AUDITORÍA COMPLETA FIREBASE - CHANGANET PRODUCTION

## 🔍 RESUMEN DE PROBLEMAS DETECTADOS

### 1. ❌ StorageBucket INCONSISTENTE (CRITICIDAD: MEDIA)
**Problema:** La configuración de Firebase difería entre dos archivos inicializadores:
- `firebaseConfig.js` (Main App - Modular SDK):  `"changanet-notifications.appspot.com"`
- `firebase-messaging-sw.js` (Service Worker - Compat SDK): `"changanet-notifications.firebasestorage.app"`

**Impacto:** 
- Ambas URLs son válidas y apuntan al mismo bucket, pero la inconsistencia puede causar problemas en futuros accesos a Firebase Storage
- Service Worker debe espejear exactamente la configuración principal

**Estado:** ✅ CORREGIDO - Unificado a `"changanet-notifications.appspot.com"`

---

### 2. ⚠️ VAPID Key No Documentada en Frontend (CRITICIDAD: MEDIA)
**Problema:** La clave VAPID está en backend `.env` pero no está clara su configuración en frontend:
```
Backend: FIREBASE_VAPID_KEY=BBcq0rChqpfQkexHGzbzAcPNyEcXQ6pHimpgltESqpSgmMmiQEPK2yfv87taE80q794Q_wtvRc8Zlnal75mqpoo
Frontend: Referencia como VITE_FCM_VAPID_KEY (pero no tiene documentación)
```

**Impacto:** 
- Usuarios en Render frontend no sabrán qué variable de entorno establecer para FCM
- FCM no funcionará sin esta clave

**Estado:** ✅ CORREGIDO - Creado `.env.example` con instrucciones

---

### 3. ⚠️ CORS y Autorización de Dominios (CRITICIDAD: ALTA - Bloquea Production)
**Problema:** Frontend en Render no puede conectar a backend (según reporte del usuario)
- Frontend: `https://changanet-production-xgkf.onrender.com`
- Backend: URL no confirmada (asumir `https://changanet-backend-xxxxx.onrender.com`)

**Causas Potenciales:**
- Firebase Console no tiene el dominio frontend autorizado
- Backend CORS no permite el origen frontend
- Google OAuth URIs no configuradas correctamente

**Estado:** ⏳ PENDIENTE - Checklist abajo

---

## 📝 DIFFS PARA COMMIT

### DIFF 1: firebase-messaging-sw.js
```diff
--- a/changanet-frontend/public/firebase-messaging-sw.js
+++ b/changanet-frontend/public/firebase-messaging-sw.js
@@ -9,7 +9,7 @@ importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-co
 const firebaseConfig = {
   apiKey: "AIzaSyA93wqcIxGpPCfyUBMq4ZwBxJRDfkKGXfQ",
   authDomain: "changanet-notifications.firebaseapp.com",
   projectId: "changanet-notifications",
-  storageBucket: "changanet-notifications.firebasestorage.app",
+  storageBucket: "changanet-notifications.appspot.com",
   messagingSenderId: "926478045621",
   appId: "1:926478045621:web:6704a255057b65a6e549fc"
 };
```

**Cambio:** Una línea. Normalizar `storageBucket` al formato estándar Firebase.

---

### DIFF 2: .env.example (Nuevo archivo)
```diff
--- /dev/null
+++ b/changanet-frontend/.env.example
@@ -0,0 +1,20 @@
+# ============================================
+# Firebase Cloud Messaging (FCM) Configuration
+# ============================================
+# Clave pública VAPID para obtener tokens FCM
+# Obtener desde: Firebase Console > Project Settings > Cloud Messaging > Server public key
+# IMPORTANTE: Esta es la clave PÚBLICA de la Key Pair; no compartir la privada
+VITE_FCM_VAPID_KEY=BBcq0rChqpfQkexHGzbzAcPNyEcXQ6pHimpgltESqpSgmMmiQEPK2yfv87taE80q794Q_wtvRc8Zlnal75mqpoo
+
+# ============================================
+# Backend API Configuration
+# ============================================
+# URL base del servidor backend (sin trailing slash)
+# En desarrollo: http://localhost:3003
+# En producción: https://changanet-backend-xxxxx.onrender.com
+VITE_BACKEND_URL=http://localhost:3003
+
+# ============================================
+# Google Maps API (opcional)
+# ============================================
+# Si se usa Google Maps, se carga desde CDN con clave API
+# La clave ya está embebida en el SDK de Google Maps
```

**Cambio:** Nuevo archivo con documentación clara de variables requeridas.

---

## ✅ COMPARATIVA FINAL - FIREBASE CONFIG

| Campo | firebaseConfig.js | firebase-messaging-sw.js | Estatus |
|-------|-------------------|--------------------------|---------|
| apiKey | `AIzaSyA93wqc...` | `AIzaSyA93wqc...` | ✅ IGUAL |
| authDomain | `changanet-notifications.firebaseapp.com` | `changanet-notifications.firebaseapp.com` | ✅ IGUAL |
| projectId | `changanet-notifications` | `changanet-notifications` | ✅ IGUAL |
| **storageBucket** | `changanet-notifications.appspot.com` | **→ `changanet-notifications.appspot.com`** | ✅ FIJO |
| messagingSenderId | `926478045621` | `926478045621` | ✅ IGUAL |
| appId | `1:926478045621:web:6704a...` | `1:926478045621:web:6704a...` | ✅ IGUAL |

---

## 🎯 CHECKLIST - FIREBASE CONSOLE SETUP

### ✅ 1. Authentication > Sign-in methods
```
[✓] Google Sign-in enabled
[✓] Anonymous (if needed for guests)
[✓] Email/Password enabled
```

**Verificar:**
- En `Google` sign-in provider, hacer clic en edit
- Verificar "Authorized domains" incluya:
  - ✅ `localhost` (para desarrollo)
  - ✅ `changanet-production-xgkf.onrender.com` (producción frontend)
  - ✅ `127.0.0.1` (local testing)

---

### ✅ 2. Authentication > Settings > Authorized domains
```
Authorized Domains (para redireccionamientos OAuth):
├─ localhost
├─ 127.0.0.1  
├─ changanet-production-xgkf.onrender.com  ← CRÍTICO para producción
├─ [backend-url.onrender.com] si es diferente
└─ [Tu dominio custom si existe]
```

**Cómo verificar:**
1. Ir a: Firebase Console > Authentication > Settings > Authorized domains
2. Confirmar que AMBOS están presentes:
   - Frontend URL: `changanet-production-xgkf.onrender.com`
   - Backend URL: (si es diferente, incluir también)

---

### ✅ 3. Cloud Messaging > Send requests from your app

```
Public Key (VAPID):
├─ Key Pair: Debe existir al menos uno
└─ Public Key Value: 
    BBcq0rChqpfQkexHGzbzAcPNyEcXQ6pHimpgltESqpSgmMmiQEPK2yfv87taE80q794Q_wtvRc8Zlnal75mqpoo
    ↑ Este debe coincidir con VITE_FCM_VAPID_KEY en frontend .env
```

**Cómo verificar:**
1. Ir a: Firebase Console > Project Settings > Cloud Messaging
2. En la sección "Key pair(s) for Cloud Messaging API":
   - Confirmar que existe al menos un par de claves
   - Copiar la "Server public key" (PUBLIC key)
   - Asegurarse que coincide con `VITE_FCM_VAPID_KEY`

---

### ⚠️ 4. Google OAuth Redirect URIs (CRÍTICO para Login)
```
Si usas Google Sign-in en el frontend:

En Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client IDs:
├─ Authorized JavaScript origins:
│  ├─ http://localhost:3000 (desarrollo)
│  ├─ http://127.0.0.1:3000 (desarrollo)
│  └─ https://changanet-production-xgkf.onrender.com (PRODUCCIÓN)
│
└─ Authorized redirect URIs:
   ├─ http://localhost:3000 (desarrollo)
   ├─ http://127.0.0.1:3000 (desarrollo)
   └─ https://changanet-production-xgkf.onrender.com (PRODUCCIÓN)
```

**Cómo verificar:**
1. Ir a: Google Cloud Console > APIs & Services > Credentials
2. Encontrar el OAuth 2.0 Client ID para "Web application"
3. Confirmar que incluya:
   - El dominio frontend Render actual
   - Ambas secciones (JavaScript origins + redirect URIs)

---

### 🔧 5. Render Environment Variables (FRONTED)

**En el servicio frontend Render, establecer:**

```bash
# Clave VAPID para FCM (obtener de Firebase Console > Cloud Messaging)
VITE_FCM_VAPID_KEY=BBcq0rChqpfQkexHGzbzAcPNyEcXQ6pHimpgltESqpSgmMmiQEPK2yfv87taE80q794Q_wtvRc8Zlnal75mqpoo

# URL del backend
VITE_BACKEND_URL=https://[nombre-backend-render].onrender.com
```

**Cómo hacerlo:**
1. Render Dashboard > tu servicio frontend
2. Settings > Environment Variables
3. Añadir/actualizar ambas variables
4. Redeploy

---

### 🔧 6. Render Environment Variables (BACKEND)

**En el servicio backend Render, verificar:**

```bash
# Clave VAPID privada (para enviar notificaciones desde backend)
FIREBASE_VAPID_KEY=BBcq0rChqpfQkexHGzbzAcPNyEcXQ6pHimpgltESqpSgmMmiQEPK2yfv87taE80q794Q_wtvRc8Zlnal75mqpoo

# Credenciales Firebase Admin
FIREBASE_PRIVATE_KEY=[privada de serviceAccountKey.json]
FIREBASE_CLIENT_EMAIL=[email de serviceAccountKey.json]
FIREBASE_PROJECT_ID=changanet-notifications

# CORS: URL del frontend para permitir solicitudes
FRONTEND_URL=https://changanet-production-xgkf.onrender.com

# Otros
SENDGRID_API_KEY=[tu-api-key]
JWT_SECRET=[tu-secret]
DATABASE_URL=[postgresql://...]
NODE_ENV=production
```

---

## 📋 PASO A PASO - IMPLEMENTACIÓN

### Paso 1️⃣: Aplicar el commit con las correcciones Firebase
```bash
cd changanet-frontend
git add public/firebase-messaging-sw.js .env.example
git commit -m "fix(firebase): unificar storageBucket y documentar variables VAPID/Backend"
git push origin inicio-sesion
```

---

### Paso 2️⃣: Verificar Authorized Domains en Firebase Console
1. Abrir: https://console.firebase.google.com
2. Proyecto: `changanet-notifications`
3. Ir a: **Authentication** > **Settings**
4. Sección: **Authorized domains**
5. **✅ Verificar que incluya:**
   - `changanet-production-xgkf.onrender.com`
6. Si no está: Hacer clic en **"Add domain"** y añadirlo
7. Esperar ~5 minutos para que se propague

---

### Paso 3️⃣: Verificar VAPID Key en Cloud Messaging
1. Ir a: **Project Settings** (engranaje arriba)
2. Ir a: **Cloud Messaging** tab
3. **Key pair(s) for Cloud Messaging API**:
   - Copiar **"Server public key"**
   - **✅ Confirmar que coincida con:**
     ```
     BBcq0rChqpfQkexHGzbzAcPNyEcXQ6pHimpgltESqpSgmMmiQEPK2yfv87taE80q794Q_wtvRc8Zlnal75mqpoo
     ```

---

### Paso 4️⃣: Establecer Variables en Render Frontend
1. Render Dashboard > tu servicio frontend
2. **Settings** > **Environment**
3. Añadir variables:
   ```
   VITE_FCM_VAPID_KEY=BBcq0rChqpfQkexHGzbzAcPNyEcXQ6pHimpgltESqpSgmMmiQEPK2yfv87taE80q794Q_wtvRc8Zlnal75mqpoo
   VITE_BACKEND_URL=https://[nombre-backend].onrender.com
   ```
4. Click: **Save**
5. Ir a: **Deploys** > **Redeploy latest**

---

### Paso 5️⃣: Verificar CORS en Backend
**El backend debe tener esto en `authController.js` o `server.js`:**

```javascript
// En Express app.use() middleware:
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,  // ← CRÍTICO para cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// En cookies (al hacer login):
res.cookie('token', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',  // true en Render
  sameSite: 'none',  // ← Para cross-site en producción
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 días
});
```

---

### Paso 6️⃣: Verificar Frontend Fetch Calls
**El frontend debe usar `credentials: 'include'` en TODOS los fetches al backend:**

```javascript
// ❌ Incorrecto (no envía cookies):
fetch(`${BACKEND_URL}/api/auth/login`, { method: 'POST', ... })

// ✅ Correcto (incluye cookies):
fetch(`${BACKEND_URL}/api/auth/login`, { 
  method: 'POST',
  credentials: 'include',  // ← CRÍTICO
  ...
})
```

**Verificar que `AuthProvider.jsx` tenga:**
```javascript
const loginWithEmail = async (email, password) => {
  const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',  // ✅ Presente
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  // ...
}
```

---

## 🧪 TESTING - VERIFICAR QUE FUNCIONE

### Test 1: Login en Producción
1. Abrir: https://changanet-production-xgkf.onrender.com
2. Hacer login con email/password
3. Abrir DevTools > Network tab
4. Buscar la llamada a `/api/auth/login`
5. **✅ Verificar:**
   - Status: `200` (no 401, 403, 500)
   - Response tiene: `{ token, user, ... }`
   - Response Headers tienen: `Set-Cookie: token=...`

---

### Test 2: Google Sign-in en Producción
1. En login, hacer clic en **"Sign in with Google"**
2. Seleccionar cuenta Google
3. **✅ Debe:**
   - Redirigir a Firebase auth flow
   - Completar sin errores CORS
   - Hacer POST a `/api/auth/google-login`
   - Guardar token en localStorage

---

### Test 3: FCM en Producción
1. Login exitoso
2. Browser pide permiso: "Permitir notificaciones"
3. Hacer clic en **Permitir**
4. Abrir DevTools > Console
5. Buscar: `[FCM] Token obtenido` o similar
6. **✅ Si aparece:** FCM está funcionando

---

### Test 4: CORS Cross-Origin
1. DevTools > Network tab
2. Cualquier llamada al backend
3. **✅ Response Headers deben tener:**
   ```
   Access-Control-Allow-Origin: https://changanet-production-xgkf.onrender.com
   Access-Control-Allow-Credentials: true
   ```

---

## 🔐 RESUMEN DE SEGURIDAD

| Elemento | Verificación | Status |
|----------|---------------|--------|
| StorageBucket | Unificado en ambos archivos | ✅ CORREGIDO |
| VAPID Key | Documentada en .env.example | ✅ CORREGIDO |
| Authorized Domains | Debe incluir frontend Render | ⏳ VERIFICAR |
| OAuth Redirect URIs | Debe incluir frontend Render | ⏳ VERIFICAR |
| CORS Config Backend | `credentials: true` + origen exacto | ⏳ VERIFICAR |
| Cookie SameSite | `sameSite: 'none'` en producción | ⏳ VERIFICAR |
| Cookie Secure | `secure: true` en HTTPS | ✅ Ya en código |
| HTTPS Enforcement | Render enforce HTTPS automáticamente | ✅ Automático |

---

## 📞 PRÓXIMOS PASOS

1. ✅ **Aplicar el commit** con `firebase-messaging-sw.js` y `.env.example`
2. ⏳ **Verificar Authorized Domains** en Firebase Console
3. ⏳ **Actualizar variables** en Render (frontend)
4. ⏳ **Redeploy** en Render
5. ⏳ **Testear** login en producción
6. ⏳ **Verificar** CORS en DevTools

---

**Última actualización:** Firebase Audit v2.0
**Proyecto:** Changanet Production
**Estado:** Listo para deploy
