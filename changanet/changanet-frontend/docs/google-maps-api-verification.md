# Tutorial: Verificación de API Key de Google Maps en Changánet

## 📋 Contexto
Este tutorial explica cómo verificar que la API Key de Google Maps esté correctamente configurada para el proyecto Changánet (PRD v1.0, 28/08/2025). Cubre los requisitos REQ-12 a REQ-15 relacionados con mapas y geocodificación.

## 🎯 Errores Comunes
- `NoApiKeys` en consola del navegador
- Autocompletado de direcciones roto
- Distance Matrix API no disponible
- CSP bloqueando conexiones a Google Maps

## ✅ Pasos de Verificación

### 1. Verificación del Archivo `.env.local`

**Archivo:** `changanet-frontend/.env.local`

Asegúrate de que contenga la siguiente línea:

```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyC109U8i3zXQTsKetuqLlQKgl4BEkiFf6k
```

**Nota:** Esta clave debe coincidir con la del proyecto `changanet-notifications` en Google Cloud Console.

### 2. Validación en Tiempo de Ejecución

Ejecuta el script de diagnóstico en la consola del navegador:

```javascript
import('./src/test/diagnose-maps.js')
```

Este script verificará:
- Que `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` esté definida
- Que no sea `undefined`
- Mostrará un mensaje de error si falta

### 3. Prueba Directa en DevTools

En la consola del navegador, ejecuta:

```javascript
import.meta.env.VITE_GOOGLE_MAPS_API_KEY
```

**Resultado esperado:** Debe devolver la clave real (`AIzaSyC109U8i3zXQTsKetuqLlQKgl4BEkiFf6k`), no `undefined`.

### 4. Verificación en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona el proyecto `changanet-notifications`
3. Ve a **APIs & Services > Library**
4. Asegúrate de que estén habilitadas:
   - ✅ Maps JavaScript API
   - ✅ Places API (New)
   - ✅ Distance Matrix API
   - ✅ Geocoding API

### 5. Verificación de Restricciones de la Clave

En Google Cloud Console:
1. Ve a **APIs & Services > Credentials**
2. Selecciona la clave `AIzaSyC109U8i3zXQTsKetuqLlQKgl4BEkiFf6k`
3. Verifica las restricciones:

**Aplicaciones web permitidas:**
- `http://localhost:5174` (desarrollo)
- `https://app.changanet.com.ar` (producción)

**APIs permitidas:**
- Maps JavaScript API
- Places API
- Distance Matrix API
- Geocoding API

### 6. Verificación del Content Security Policy (CSP)

**Archivo:** `vite.config.js`

En la configuración del servidor de desarrollo, verifica que el CSP incluya:

```javascript
'Content-Security-Policy': "connect-src 'self' https://maps.googleapis.com https://places.googleapis.com ..."
```

**Nota:** En producción, el CSP debe configurarse en el servidor backend.

## 🔧 Solución de Problemas

### Si la API Key no está definida:
1. Verifica que `.env.local` exista en `changanet-frontend/`
2. Asegúrate de que contenga `VITE_GOOGLE_MAPS_API_KEY=...`
3. Reinicia el servidor de desarrollo: `npm run dev`

### Si la API Key es inválida:
1. Ve a Google Cloud Console > APIs & Services > Credentials
2. Crea una nueva clave o verifica la existente
3. Actualiza `.env.local` con la nueva clave

### Si hay errores de CSP:
1. Verifica que `vite.config.js` incluya los dominios de Google Maps
2. En producción, configura CSP en el servidor backend

### Si las APIs no están habilitadas:
1. Ve a Google Cloud Console > APIs & Services > Library
2. Habilita las APIs requeridas
3. Espera 5-10 minutos para que los cambios surtan efecto

## 📊 Verificación Final

Después de seguir todos los pasos, ejecuta nuevamente el script de diagnóstico:

```javascript
import('./src/test/diagnose-maps.js')
```

Deberías ver:
- ✅ API Key presente
- ✅ Conexión exitosa a Google Maps
- ✅ Google Maps API cargada

## 📞 Soporte

Si persisten los problemas:
1. Revisa los logs en la consola del navegador
2. Verifica la configuración de Firebase (proyecto relacionado)
3. Contacta al equipo de desarrollo con los detalles del error
