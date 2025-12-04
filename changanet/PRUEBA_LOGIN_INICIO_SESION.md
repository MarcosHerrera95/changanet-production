# ✅ GUÍA DE PRUEBA - INICIAR SESIÓN

## Correcciones Implementadas

### 1. **SendGrid - Manejo de Errores en Desarrollo**
- ❌ **Antes**: El error de SendGrid hacía que fallara todo el flujo
- ✅ **Ahora**: En desarrollo, se ignora el error de SendGrid (solo muestra warning)

**Archivo**: `src/services/emailService.js`
```javascript
// En desarrollo, no falla si no hay API key válida
if (process.env.NODE_ENV === 'development') {
  console.warn('⚠️ Email no pudo ser enviado');
  return; // Continúa sin fallar
}
```

---

### 2. **Backend - Login incluye Token en Respuesta**
- ❌ **Antes**: Solo devolvía `{ message, user }`
- ✅ **Ahora**: Devuelve `{ message, user, token }`

**Archivo**: `src/controllers/authController.js` (línea 617)
```javascript
res.status(200).json({
  message: 'Login exitoso.',
  user: { id, nombre, email, rol },
  token: accessToken  // ✅ NUEVO
});
```

---

### 3. **Backend - Register incluye Token en Respuesta**
- ❌ **Antes**: Solo devolvía `{ message, user, requiresVerification }`
- ✅ **Ahora**: Devuelve `{ message, user, token, requiresVerification }`

**Archivo**: `src/controllers/authController.js` (línea 326)
```javascript
res.status(201).json({
  message: 'Usuario registrado...',
  user: { id, nombre, email, rol },
  token: accessToken,  // ✅ NUEVO
  requiresVerification: true
});
```

---

### 4. **Frontend - AuthProvider.loginWithEmail**
- ✅ Agregado `credentials: 'include'` para incluir cookies
- ✅ Ahora espera y usa el token en la respuesta

**Archivo**: `src/context/AuthProvider.jsx`
```javascript
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
  credentials: 'include'  // ✅ NUEVO
});

if (data.token && data.user) {
  this.login(data.user, data.token);  // ✅ Usa el token de la respuesta
}
```

---

## Pasos para Probar

### **1. Registrar un Nuevo Usuario**
1. Abre la app en `http://localhost:5175`
2. Click en "Registrarse"
3. Completa:
   - Nombre: `Test User`
   - Email: `test@example.com`
   - Contraseña: `Password123`
   - Rol: `Cliente`
4. Click en "Registrarse"

**Resultado Esperado:**
- ✅ Se crea el usuario en BD
- ⚠️ El email de verificación puede fallar (normal en desarrollo)
- ✅ Se hace login automático
- ✅ Se redirige al dashboard

### **2. Iniciar Sesión**
1. Si ya cerraste sesión, vuelve a la página principal
2. Click en "Iniciar Sesión"
3. Completa:
   - Email: `test@example.com`
   - Contraseña: `Password123`
4. Click en "Iniciar Sesión"

**Resultado Esperado:**
- ✅ Se validan las credenciales
- ✅ Se genera el token JWT
- ✅ Se almacena en cookies httpOnly
- ✅ Se guarda el usuario en localStorage
- ✅ Se redirige al dashboard

---

## Verificación en Consola del Navegador

Abre DevTools (F12) y ve a la pestaña "Storage":

### Cookies (LocalStorage):
```javascript
// Debería estar:
localStorage.getItem('changanet_user')
// => { id, nombre, email, rol }

localStorage.getItem('changanet_token')
// => JWT token
```

### Cookies HTTP-Only (en Red tab):
```
Busca en las respuestas POST /api/auth/login
Headers > Response Headers > set-cookie
- accessToken (15 minutos)
- refreshToken (7 días)
```

---

## Logs Esperados en el Backend

```
[info] [auth] [User:xxx]: User login successful
{
  email: "test@example.com",
  rol: "cliente",
  ip: "::1"
}

[status] 200 OK - POST /api/auth/login
```

---

## Si Algo No Funciona

### Error: "Email o contraseña incorrectos"
✅ Verifica que:
- El usuario existe en BD (revisar en Prisma Studio)
- La contraseña es correcta
- La contraseña está hasheada con bcrypt

### Error: "Error de conexión"
✅ Verifica que:
- El backend está corriendo en `http://localhost:3003`
- No hay errores en la consola del backend
- Las CORS están configuradas correctamente

### El Login funciona pero no te redirige
✅ Verifica que:
- El rol del usuario está correctamente asignado
- El localStorage tiene el usuario guardado
- El contexto de autenticación se actualiza

---

## Resumen de Cambios

| Componente | Cambio | Estado |
|-----------|--------|--------|
| emailService.js | Mejor manejo de errores | ✅ Completado |
| authController.js (login) | Incluye token en respuesta | ✅ Completado |
| authController.js (register) | Incluye token en respuesta | ✅ Completado |
| AuthProvider.jsx | Espera token en respuesta | ✅ Completado |
| Cookies httpOnly | Se mantienen para seguridad | ✅ Completado |

---

**Resultado**: El flujo de login/registro debería funcionar correctamente sin depender del email de verificación. 🎉
