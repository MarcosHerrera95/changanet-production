# Checklist de Despliegue - Sistema de Autenticación Changánet

## 🔧 Variables de Entorno Requeridas

### Base de Datos
- [ ] `DATABASE_URL`: Configurada para entorno de producción
- [ ] Base de datos creada y migrada con Prisma
- [ ] Conexión a BD probada y funcionando
- [ ] Backups automáticos configurados

### Autenticación JWT
- [ ] `JWT_SECRET`: Clave secreta fuerte generada (>256 bits de entropía)
- [ ] `SESSION_SECRET`: Clave de sesión única para el entorno
- [ ] Secrets almacenados en gestor seguro (no en código)
- [ ] Rotación de claves programada

### OAuth Providers
- [ ] **Google OAuth**:
  - [ ] `GOOGLE_CLIENT_ID`: ID de aplicación Google configurado
  - [ ] `GOOGLE_CLIENT_SECRET`: Secret de aplicación Google
  - [ ] `GOOGLE_CALLBACK_URL`: URL de callback correcta para producción
  - [ ] Aplicación Google OAuth registrada y verificada
  - [ ] Scopes configurados: `profile`, `email`
- [ ] **Facebook OAuth**:
  - [ ] Aplicación Facebook registrada (si implementada)
  - [ ] Scopes configurados: `email`

### Servicios Externos
- [ ] **SendGrid**:
  - [ ] `SENDGRID_API_KEY`: API Key válida y con permisos
  - [ ] `FROM_EMAIL`: Email verificado como remitente
  - [ ] Dominio verificado en SendGrid
  - [ ] Templates de email configurados
- [ ] **Firebase**:
  - [ ] `FIREBASE_PROJECT_ID`: Proyecto Firebase creado
  - [ ] Archivo `serviceAccountKey.json` presente y seguro
  - [ ] FCM configurado para notificaciones push
- [ ] **Twilio** (opcional):
  - [ ] `TWILIO_ACCOUNT_SID`: Account SID válido
  - [ ] `TWILIO_AUTH_TOKEN`: Auth token configurado
  - [ ] `TWILIO_PHONE_NUMBER`: Número verificado

### Monitoreo y Logging
- [ ] **Sentry**:
  - [ ] `SENTRY_DSN`: DSN configurado para producción
  - [ ] Proyecto Sentry creado y configurado
  - [ ] Alertas configuradas para errores críticos
- [ ] **Prometheus**:
  - [ ] Métricas configuradas y expuestas
  - [ ] Dashboard de monitoreo disponible

### Infraestructura
- [ ] `PORT`: Puerto configurado para el entorno
- [ ] `FRONTEND_URL`: URL del frontend de producción
- [ ] `NODE_ENV`: Configurado como "production"
- [ ] HTTPS habilitado y certificado SSL válido
- [ ] CORS configurado solo para dominios autorizados

## 🔐 Gestión de Secrets

### Almacenamiento Seguro
- [ ] Secrets en variables de entorno (no hardcoded)
- [ ] Uso de AWS Secrets Manager / Azure Key Vault / GCP Secret Manager
- [ ] Secrets encriptados en repositorio
- [ ] Acceso basado en roles (RBAC) configurado
- [ ] Rotación automática de secrets programada

### Validación
- [ ] Secrets validados al inicio de la aplicación
- [ ] Mensajes de error descriptivos sin exponer secrets
- [ ] Logs no contienen información sensible
- [ ] Secrets no expuestos en respuestas HTTP

## 📧 Configuración de Email

### SendGrid Setup
- [ ] Cuenta SendGrid creada y verificada
- [ ] Dominio propio configurado y verificado
- [ ] SPF, DKIM y DMARC configurados
- [ ] Templates de email creados:
  - [ ] Verificación de email
  - [ ] Recuperación de contraseña
  - [ ] Bienvenida
  - [ ] Notificaciones de seguridad

### Testing
- [ ] Emails de prueba enviados exitosamente
- [ ] Rate limits de SendGrid verificados
- [ ] Bounce handling configurado
- [ ] Webhooks de SendGrid configurados

## 🔑 Configuración OAuth

### Google OAuth
- [ ] Proyecto Google Cloud creado
- [ ] OAuth 2.0 credentials generadas
- [ ] Consent screen configurado
- [ ] Authorized redirect URIs configuradas
- [ ] Authorized JavaScript origins configuradas
- [ ] Verificación de aplicación completada (si requerida)

### Facebook OAuth (si implementado)
- [ ] Aplicación Facebook creada
- [ ] App Review completado para scopes requeridos
- [ ] Valid OAuth Redirect URIs configuradas
- [ ] Webhooks configurados

## 🚀 Checklist de Pre-Despliegue

### Base de Datos
- [ ] Migraciones Prisma ejecutadas en producción
- [ ] Datos de seed ejecutados (si aplicable)
- [ ] Índices de BD optimizados
- [ ] Conexión a BD probada con carga
- [ ] Backup inicial realizado

### Seguridad
- [ ] HTTPS forzado en todos los endpoints
- [ ] Headers de seguridad (Helmet) configurados
- [ ] Rate limiting ajustado para producción
- [ ] CORS restringido a dominios autorizados
- [ ] Validación de entrada activa
- [ ] Logs de seguridad habilitados

### Testing
- [ ] Tests unitarios pasan (autenticación)
- [ ] Tests de integración pasan (flujos completos)
- [ ] Tests de carga realizados
- [ ] Tests de seguridad (penetration testing)
- [ ] Tests de OAuth flows
- [ ] Tests de email delivery

### Monitoreo
- [ ] Métricas Prometheus configuradas
- [ ] Alertas Sentry activas
- [ ] Health checks funcionando
- [ ] Logs centralizados configurados
- [ ] Dashboard de monitoreo disponible

### Performance
- [ ] Optimización de queries de BD
- [ ] Caché Redis configurado (si disponible)
- [ ] Compresión gzip habilitada
- [ ] CDN configurado para assets estáticos
- [ ] Optimización de imágenes activada

## 🔄 Proceso de Despliegue

### Pre-Deploy
- [ ] Branch de producción actualizado
- [ ] Tests pasan en CI/CD
- [ ] Code review aprobado
- [ ] Security scan completado
- [ ] Variables de entorno verificadas

### Deploy Steps
- [ ] Backup de BD realizado
- [ ] Aplicación desplegada en staging
- [ ] Tests de smoke ejecutados en staging
- [ ] Aplicación desplegada en producción
- [ ] Health checks pasan
- [ ] Logs verificados
- [ ] Métricas monitoreadas

### Post-Deploy
- [ ] Emails de verificación funcionando
- [ ] OAuth flows probados
- [ ] Login/logout funcionando
- [ ] Rate limiting operativo
- [ ] Alertas configuradas
- [ ] Documentación actualizada

## 🚨 Verificación Post-Despliegue

### Funcionalidad
- [ ] Registro de usuarios funciona
- [ ] Login con email/password funciona
- [ ] Verificación de email funciona
- [ ] Recuperación de contraseña funciona
- [ ] OAuth Google funciona
- [ ] Refresh token funciona
- [ ] Logout funciona

### Seguridad
- [ ] HTTPS obligatorio
- [ ] Rate limiting activo
- [ ] CORS funcionando correctamente
- [ ] Headers de seguridad presentes
- [ ] No secrets expuestos en logs
- [ ] Tokens JWT válidos

### Performance
- [ ] Tiempos de respuesta aceptables (<500ms)
- [ ] CPU y memoria en rangos normales
- [ ] Conexiones a BD estables
- [ ] Cache hit rate óptimo

### Monitoreo
- [ ] Alertas funcionando
- [ ] Métricas recolectándose
- [ ] Logs llegando a centralizador
- [ ] Dashboard actualizándose

## 📞 Contactos de Emergencia

### Equipo Técnico
- **DevOps Lead**: [Nombre] - [Email] - [Teléfono]
- **Security Officer**: [Nombre] - [Email] - [Teléfono]
- **Backend Lead**: [Nombre] - [Email] - [Teléfono]

### Servicios Externos
- **SendGrid Support**: https://sendgrid.com/support
- **Google Cloud Support**: https://cloud.google.com/support
- **Sentry Support**: https://sentry.io/support
- **Firebase Support**: https://firebase.google.com/support

### Runbooks
- [ ] Runbook de recuperación de BD
- [ ] Runbook de rotación de secrets
- [ ] Runbook de respuesta a incidentes
- [ ] Runbook de rollback de despliegue

---

## ✅ Checklist de Verificación Final

- [ ] Todos los items marcados como completados
- [ ] Despliegue aprobado por equipo de seguridad
- [ ] Despliegue aprobado por product owner
- [ ] Documentación actualizada
- [ ] Equipo notificado del despliegue exitoso

**Fecha de Despliegue**: _______________
**Versión Desplegada**: _______________
**Responsable del Despliegue**: _______________
**Estado**: ⏳ **PENDIENTE** | ✅ **COMPLETADO** | ❌ **CON ERRORES**

---

**Notas Importantes**:
- Este checklist debe ser completado antes de cada despliegue a producción
- Mantener copia actualizada de este documento
- Revisar mensualmente la configuración de seguridad
- Actualizar secrets cada 90 días como mínimo
