# 🚀 Guía Completa de Deployment en Render

## 📋 Resumen
Vamos a desplegar toda la aplicación en Render:
- ✅ PostgreSQL Database (base de datos)
- ✅ Backend (Node.js/Express + Prisma)
- ✅ Frontend (Next.js)

---

## 🗄️ PASO 1: Crear Base de Datos PostgreSQL

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. Click en **"New +"** → **"PostgreSQL"**
3. Configura:
   - **Name**: `changanet-db`
   - **Database**: `changanet`
   - **User**: `changanet_user`
   - **Region**: Oregon (US West) o la más cercana
   - **Plan**: 
     - **Free** (máx 90 días, 1GB, ideal para pruebas)
     - **Starter** ($7/mes, recomendado para producción)
4. Click **"Create Database"**
5. **Espera 2-3 minutos** hasta que el estado sea "Available"
6. **Copia estas URLs** (las necesitarás):
   - ✅ **Internal Database URL** (para el backend)
   - ✅ **External Database URL** (para conectarte localmente si es necesario)

---

## 🔧 PASO 2: Desplegar Backend

### 2.1. Crear Web Service

1. En Render Dashboard, click **"New +"** → **"Web Service"**
2. Conecta tu repositorio GitHub: `dgimenezdeveloper/changanet-production`
3. Configura:
   - **Name**: `changanet-backend`
   - **Root Directory**: `changanet/changanet-backend`
   - **Environment**: `Node`
   - **Region**: La misma que la base de datos
   - **Branch**: `main`
   - **Build Command**: 
     ```bash
     npm install && npx prisma generate && npx prisma migrate deploy
     ```
   - **Start Command**: 
     ```bash
     npm start
     ```
   - **Plan**: Free o Starter ($7/mes)

### 2.2. Configurar Variables de Entorno

En la sección **"Environment"**, agrega estas variables (una por una):

```env
# Base de datos (usa la Internal Database URL que copiaste)
DATABASE_URL=postgresql://changanet_user:XXX@dpg-XXX-a.oregon-postgres.render.com/changanet_db_XXX

# Seguridad
JWT_SECRET=PXaawb0afsIIidFfQIs9upcT9c0a/kdAuTDOkzft++XZ5bzWYpKZQ4S2XvPiMUYgHN8kLS0TkOZb6Nm1lbxaqA==
SESSION_SECRET=mZ3dHhjdhxeeRsACgCmobBlWl86Rm4fLy6qngLr8LapGF0vIg681IrqSglPz3UoJH/7Lop6SfsoFGT8ajXp71g==
PORT=3003

# URLs (actualizar después de crear el frontend)
FRONTEND_URL=https://changanet-frontend.onrender.com

# OAuth Callbacks (actualizar con la URL de tu backend)
GOOGLE_CALLBACK_URL=https://changanet-backend.onrender.com/api/auth/google/callback
FACEBOOK_CALLBACK_URL=https://changanet-backend.onrender.com/api/auth/facebook/callback

# Google OAuth
GOOGLE_CLIENT_ID=1092532981327-5fg2q8gghek8ftriqolithqmhcrbsv14.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# Facebook OAuth
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Firebase
FIREBASE_API_KEY=AIzaSyA93wqcIxGpPCfyUBMq4ZwBxJRDfkKGXfQ
FIREBASE_AUTH_DOMAIN=changanet-notifications.firebaseapp.com
FIREBASE_PROJECT_ID=changanet-notifications
FIREBASE_STORAGE_BUCKET=changanet-notifications.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=926478045621
FIREBASE_APP_ID=1:926478045621:web:6704a255057b65a6e549fc
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
FIREBASE_VAPID_KEY=BBcq0rChqpfQkexHGzbzAcPNyEcXQ6pHimpgltESqpSgmMmiQEPK2yfv87taE80q794Q_wtvRc8Zlnal75mqpoo

# Cloudinary
CLOUDINARY_CLOUD_NAME=dzgywwvoe
CLOUDINARY_API_KEY=846814795685612
CLOUDINARY_API_SECRET=EXG02pFoj6Iu4aKN_iUI-K_fmtw
CLOUDINARY_URL=cloudinary://846814795685612:EXG02pFoj6Iu4aKN_iUI-K_fmtw@dzgywwvoe

# SendGrid
SENDGRID_API_KEY=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
FROM_EMAIL=noreplychanganet@gmail.com
# ... (resto de emails)

# Twilio
TWILIO_ACCOUNT_SID=ACf05d72b3e6f84642071affa0ffcbec3d
TWILIO_AUTH_TOKEN=329cd866831e74d35592fa15224ef5bf
TWILIO_PHONE_NUMBER=+12566023324
TEST_PHONE_NUMBER=+5491134007759

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=TEST-7825541826896407-110307-3f5731d5600f528496e8e635fdede636-99150353

# Sentry
SENTRY_DSN=https://0dd4d936872b3cd34903e5dc3f2efc21@o4510260990574592.ingest.us.sentry.io/4510261006827520
```

### 2.3. Deploy Backend

1. Click **"Create Web Service"**
2. Render empezará a desplegar automáticamente
3. **Espera 5-10 minutos**
4. Cuando veas **"Live"** en verde, copia la URL: `https://changanet-backend.onrender.com`

---

## 🎨 PASO 3: Desplegar Frontend

### 3.1. Crear archivo .env para el frontend

En tu proyecto local, crea el archivo `.env.local` en `changanet/changanet-frontend/`:

```env
NEXT_PUBLIC_API_URL=https://changanet-backend.onrender.com
```

### 3.2. Crear Web Service para Frontend

1. En Render Dashboard, click **"New +"** → **"Web Service"**
2. Conecta el mismo repositorio GitHub
3. Configura:
   - **Name**: `changanet-frontend`
   - **Root Directory**: `changanet/changanet-frontend`
   - **Environment**: `Node`
   - **Region**: La misma que el backend
   - **Branch**: `main`
   - **Build Command**: 
     ```bash
     npm install && npm run build
     ```
   - **Start Command**: 
     ```bash
     npm start
     ```
   - **Plan**: Free o Starter

### 3.3. Configurar Variables de Entorno del Frontend

En la sección **"Environment"**, agrega:

```env
NEXT_PUBLIC_API_URL=https://changanet-backend.onrender.com
```

### 3.4. Deploy Frontend

1. Click **"Create Web Service"**
2. Espera 5-10 minutos
3. Cuando veas **"Live"**, copia la URL: `https://changanet-frontend.onrender.com`

---

## 🔄 PASO 4: Actualizar URLs Cruzadas

### 4.1. Actualizar FRONTEND_URL en el Backend

1. Ve al servicio **changanet-backend** en Render
2. Click en **"Environment"**
3. Edita la variable `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://changanet-frontend.onrender.com
   ```
4. Click **"Save Changes"**
5. Render redesplegará automáticamente

### 4.2. Actualizar OAuth Callbacks en Google Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Navega a **APIs & Services** → **Credentials**
3. Edita tu OAuth 2.0 Client ID
4. Agrega en **Authorized redirect URIs**:
   ```
   https://changanet-backend.onrender.com/api/auth/google/callback
   ```
5. Click **"Save"**

---

## ✅ PASO 5: Verificar Deployment

### 5.1. Probar Backend

Abre en tu navegador:
```
https://changanet-backend.onrender.com/health
```
Deberías ver una respuesta JSON indicando que el backend está funcionando.

### 5.2. Probar Frontend

Abre en tu navegador:
```
https://changanet-frontend.onrender.com
```
Deberías ver tu aplicación funcionando.

### 5.3. Probar Conexión Backend-Frontend

1. Desde el frontend, intenta hacer login o cualquier acción que llame al backend
2. Verifica en las **Logs** de Render que no haya errores de CORS

---

## 🐛 Troubleshooting

### Error: "Migration failed"
- Verifica que la `DATABASE_URL` esté correcta en las variables de entorno
- Asegúrate de que el build command incluya `npx prisma migrate deploy`

### Error: "Cannot connect to database"
- Usa la **Internal Database URL**, no la External
- Verifica que el backend y la base de datos estén en la misma región

### Error: CORS en el frontend
- Verifica que `FRONTEND_URL` en el backend sea la URL correcta de Render (con https)
- Asegúrate de que tu código de backend permita CORS desde esa URL

### Error: "Build failed"
- Revisa los logs en Render para ver el error específico
- Verifica que el `Root Directory` esté configurado correctamente

---

## 💡 Consejos Finales

1. **Free Tier Limitations**:
   - Los servicios se duermen después de 15 minutos de inactividad
   - El primer request después de dormir puede tardar 30-60 segundos
   - Considera el plan Starter ($7/mes) para producción

2. **Monitoreo**:
   - Revisa los logs regularmente en Render Dashboard
   - Configura alertas en Sentry para errores en producción

3. **Deploy Automático**:
   - Cada push a `main` trigger un redeploy automático
   - Usa branches para desarrollo y haz merge a `main` solo cuando esté listo

4. **Base de Datos**:
   - El plan Free de PostgreSQL expira después de 90 días
   - Haz backups regulares (Render los hace automáticamente, pero es bueno tener copias adicionales)

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Render Dashboard
2. Consulta la [documentación de Render](https://render.com/docs)
3. Contacta al soporte de Render (muy responsivos)

---

¡Listo! Tu aplicación debería estar completamente desplegada en Render 🎉
