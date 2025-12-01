# Checklist Completo de Deployment - Sistema Avanzado de Disponibilidad y Agenda
## ChangaNet - Guía Exhaustiva para Producción

**Fecha:** 29 de Noviembre de 2025
**Versión:** 2.0 - Avanzado
**Estado:** ✅ **LISTO PARA DEPLOYMENT**

---

## 1. PRE-REQUISITOS DEL SISTEMA

### 1.1 Infraestructura Requerida
- ✅ **Servidor**: Ubuntu 20.04+ / CentOS 8+ / Amazon Linux 2+
- ✅ **Node.js**: Versión 18.0+ LTS
- ✅ **Base de Datos**: PostgreSQL 13+ (producción) / SQLite (desarrollo)
- ✅ **Redis**: Versión 6.0+ (para caching y locks)
- ✅ **Nginx/Apache**: Para reverse proxy y SSL
- ✅ **SSL Certificate**: Let's Encrypt o certificado válido
- ✅ **Domain**: Configurado y apuntando al servidor

### 1.2 Recursos del Sistema
- ✅ **CPU**: 2+ cores (4+ recomendado para alta carga)
- ✅ **RAM**: 4GB mínimo (8GB+ recomendado)
- ✅ **Storage**: 50GB+ SSD para base de datos y logs
- ✅ **Network**: 100Mbps+ conexión estable
- ✅ **Backup Storage**: Espacio para backups automáticos

### 1.3 Herramientas de Monitoreo
- ✅ **PM2**: Para gestión de procesos Node.js
- ✅ **Prometheus + Grafana**: Para métricas y dashboards
- ✅ **ELK Stack**: Para logging centralizado (opcional)
- ✅ **Sentry**: Para error tracking
- ✅ **New Relic/DataDog**: Para APM (opcional)

---

## 2. CONFIGURACIÓN DE ENTORNO

### 2.1 Variables de Entorno Críticas

#### Base de Datos
```bash
# PostgreSQL (Producción)
DATABASE_URL=postgresql://changanet_user:strong_password_here@db-host:5432/changanet_prod

# SQLite (Desarrollo/Testing)
DATABASE_URL=file:./dev.db

# Redis para Caching y Locks
REDIS_URL=redis://redis-host:6379
REDIS_PASSWORD=redis_password_here
```

#### Autenticación y Seguridad
```bash
# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_64_chars_minimum
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# Session Management
SESSION_SECRET=another_super_secure_session_secret_64_chars

# CORS Configuration
FRONTEND_URL=https://app.changanet.com
ALLOWED_ORIGINS=https://app.changanet.com,https://admin.changanet.com
```

#### Google Calendar Integration
```bash
# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=https://api.changanet.com/api/sync/calendar/google/callback

# Google Calendar API Limits
GOOGLE_CALENDAR_RATE_LIMIT=100000  # requests per 100 seconds
GOOGLE_CALENDAR_DAILY_LIMIT=1000000
```

#### Servicios de Notificación
```bash
# SendGrid Email Service
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@changanet.com
SENDGRID_FROM_NAME=Changánet

# Firebase Cloud Messaging (Push Notifications)
FCM_SERVER_KEY=your_firebase_server_key_here
FCM_PROJECT_ID=changanet-prod

# Twilio SMS (Opcional)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

#### Configuración de Aplicación
```bash
# Environment
NODE_ENV=production
PORT=3003
HOST=0.0.0.0

# Application URLs
API_BASE_URL=https://api.changanet.com
FRONTEND_URL=https://app.changanet.com

# File Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_PATH=/var/www/changanet/uploads
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # requests per window
```

#### Monitoreo y Logging
```bash
# Sentry Error Tracking
SENTRY_DSN=https://your_sentry_dsn_here@sentry.io/project_id

# Prometheus Metrics
PROMETHEUS_PUSHGATEWAY=http://prometheus-pushgateway:9091

# Log Level
LOG_LEVEL=info  # error, warn, info, debug

# Log Rotation
LOG_MAX_SIZE=10m
LOG_MAX_FILES=30
```

### 2.2 Validación de Variables de Entorno

```bash
#!/bin/bash
# validate-env.sh - Script de validación de configuración

echo "🔍 Validating environment configuration..."

# Required variables
required_vars=(
  "DATABASE_URL"
  "JWT_SECRET"
  "GOOGLE_CLIENT_ID"
  "GOOGLE_CLIENT_SECRET"
  "SENDGRID_API_KEY"
  "FCM_SERVER_KEY"
)

missing_vars=()
for var in "${required_vars[@]}"; do
  if [[ -z "${!var}" ]]; then
    missing_vars+=("$var")
  fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
  echo "❌ Missing required environment variables:"
  printf '  - %s\n' "${missing_vars[@]}"
  exit 1
fi

# Validate JWT secret length
if [[ ${#JWT_SECRET} -lt 64 ]]; then
  echo "❌ JWT_SECRET must be at least 64 characters long"
  exit 1
fi

# Validate database connection
if ! pg_isready -h $(echo $DATABASE_URL | sed 's|.*@\([^:]*\).*|\1|') 2>/dev/null; then
  echo "❌ Cannot connect to database"
  exit 1
fi

echo "✅ Environment configuration is valid"
```

---

## 3. CONFIGURACIÓN DE BASE DE DATOS

### 3.1 Creación de Base de Datos PostgreSQL

```sql
-- Crear usuario y base de datos
CREATE USER changanet_user WITH ENCRYPTED PASSWORD 'strong_password_here';
CREATE DATABASE changanet_prod OWNER changanet_user;
GRANT ALL PRIVILEGES ON DATABASE changanet_prod TO changanet_user;

-- Configurar permisos adicionales
\c changanet_prod;
GRANT ALL ON SCHEMA public TO changanet_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO changanet_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO changanet_user;

-- Configurar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Configurar collation para español (opcional)
-- ALTER DATABASE changanet_prod SET lc_collate = 'es_AR.UTF-8';
-- ALTER DATABASE changanet_prod SET lc_ctype = 'es_AR.UTF-8';
```

### 3.2 Índices de Performance Requeridos

```sql
-- Índices críticos para availability_slots (queries más frecuentes)
CREATE INDEX CONCURRENTLY idx_slots_professional_time ON availability_slots(professional_id, start_time);
CREATE INDEX CONCURRENTLY idx_slots_status_time ON availability_slots(status, start_time);
CREATE INDEX CONCURRENTLY idx_slots_available_time ON availability_slots(is_available, start_time);
CREATE INDEX CONCURRENTLY idx_slots_professional_status ON availability_slots(professional_id, status);
CREATE INDEX CONCURRENTLY idx_slots_config_id ON availability_slots(availability_config_id);

-- Índices para appointments
CREATE INDEX CONCURRENTLY idx_appointments_professional_scheduled ON appointments(professional_id, scheduled_start);
CREATE INDEX CONCURRENTLY idx_appointments_client_scheduled ON appointments(client_id, scheduled_start);
CREATE INDEX CONCURRENTLY idx_appointments_status ON appointments(status);
CREATE INDEX CONCURRENTLY idx_appointments_professional_status ON appointments(professional_id, status);
CREATE INDEX CONCURRENTLY idx_appointments_client_status ON appointments(client_id, status);
CREATE INDEX CONCURRENTLY idx_appointments_slot_id ON appointments(slot_id);
CREATE INDEX CONCURRENTLY idx_appointments_service_id ON appointments(service_id);
CREATE INDEX CONCURRENTLY idx_appointments_google_event_id ON appointments(google_event_id);

-- Índices para blocked_slots
CREATE INDEX CONCURRENTLY idx_blocked_slots_professional_time ON blocked_slots(professional_id, start_time, end_time);
CREATE INDEX CONCURRENTLY idx_blocked_slots_active ON blocked_slots(is_active);

-- Índices para calendar_connections
CREATE INDEX CONCURRENTLY idx_calendar_connections_user_type ON calendar_connections(user_id, calendar_type);
CREATE INDEX CONCURRENTLY idx_calendar_connections_active ON calendar_connections(is_active);

-- Índices para calendar_sync_logs
CREATE INDEX CONCURRENTLY idx_sync_logs_user_operation ON calendar_sync_logs(user_id, operation);
CREATE INDEX CONCURRENTLY idx_sync_logs_status ON calendar_sync_logs(status);
CREATE INDEX CONCURRENTLY idx_sync_logs_created_at ON calendar_sync_logs(created_at);

-- Índices para concurrencia
CREATE INDEX CONCURRENTLY idx_concurrency_locks_expires ON concurrency_locks(expires_at);
```

### 3.3 Configuración de PostgreSQL

```ini
# postgresql.conf - Configuración optimizada para ChangaNet

# Memoria
shared_buffers = 256MB                    # 25% de RAM total
effective_cache_size = 1GB               # 75% de RAM total
work_mem = 4MB                           # Memoria por query
maintenance_work_mem = 64MB              # Memoria para maintenance

# Conexiones
max_connections = 200                    # Máximo conexiones simultáneas
max_wal_senders = 5                      # Para replicas (si aplica)

# Logging
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'ddl'                    # Log DDL statements
log_duration = on                        # Log query duration

# Performance
random_page_cost = 1.1                   # Para SSD
effective_io_concurrency = 200           # Para SSD

# Autovacuum
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 20s
```

### 3.4 Configuración de Redis

```ini
# redis.conf - Configuración para caching y locks

# Memoria
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistencia
save 900 1
save 300 10
save 60 10000

# Seguridad
requirepass your_redis_password_here
bind 127.0.0.1

# Logging
loglevel notice
logfile /var/log/redis/redis.log

# Configuración para locks
lua-time-limit 5000
```

---

## 4. CONFIGURACIÓN DE RATE LIMITING

### 4.1 Rate Limits por Endpoint

```javascript
// rateLimits.js - Configuración centralizada de rate limiting

const rateLimits = {
  // Autenticación - Estricto
  auth: {
    windowMs: 15 * 60 * 1000,    // 15 minutes
    max: 5,                      // 5 attempts per window
    message: 'Too many authentication attempts'
  },

  // Availability queries - Moderado
  availabilityQuery: {
    windowMs: 60 * 1000,         // 1 minute
    max: 30,                     // 30 queries per minute
    message: 'Too many availability queries'
  },

  // Booking operations - Restringido
  booking: {
    windowMs: 60 * 60 * 1000,    // 1 hour
    max: 10,                     // 10 bookings per hour
    message: 'Too many booking attempts'
  },

  // Calendar sync - Limitado
  calendarSync: {
    windowMs: 60 * 60 * 1000,    // 1 hour
    max: 5,                      // 5 sync operations per hour
    message: 'Calendar sync rate limit exceeded'
  },

  // Admin operations - Estricto
  adminOps: {
    windowMs: 60 * 1000,         // 1 minute
    max: 20,                     // 20 operations per minute
    message: 'Admin operation rate limit exceeded'
  },

  // General API - Moderado
  general: {
    windowMs: 15 * 60 * 1000,    // 15 minutes
    max: 100,                    // 100 requests per window
    message: 'API rate limit exceeded'
  }
};

module.exports = rateLimits;
```

### 4.2 Implementación de Rate Limiting

```javascript
// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const rateLimits = require('../config/rateLimits');

function createRateLimiter(config) {
  return rateLimit({
    store: new RedisStore({
      client: require('../config/redis')
    }),
    windowMs: config.windowMs,
    max: config.max,
    message: { error: config.message },
    standardHeaders: true,
    legacyHeaders: false,
    // Usar user ID como key para rate limiting por usuario
    keyGenerator: (req) => req.user?.id || req.ip,
    // Skip successful requests, only count failures
    skipSuccessfulRequests: false,
    // Skip failed requests for certain endpoints
    skipFailedRequests: false
  });
}

// Aplicar rate limiting por ruta
app.use('/api/auth/', createRateLimiter(rateLimits.auth));
app.use('/api/advanced-availability/slots', createRateLimiter(rateLimits.availabilityQuery));
app.use('/api/advanced-availability/slots/:slotId/book', createRateLimiter(rateLimits.booking));
app.use('/api/sync/calendar', createRateLimiter(rateLimits.calendarSync));
app.use('/api/admin/', createRateLimiter(rateLimits.adminOps));
app.use('/api/', createRateLimiter(rateLimits.general));
```

---

## 5. CRON JOBS Y TAREAS PROGRAMADAS

### 5.1 Configuración de Cron Jobs

```bash
# /etc/cron.d/changanet - Cron jobs para ChangaNet

# Sincronización de calendarios - Cada 15 minutos
*/15 * * * * changanet /usr/local/bin/node /var/www/changanet/scripts/sync-calendars.js >> /var/log/changanet/calendar-sync.log 2>&1

# Envío de recordatorios de citas - Cada 5 minutos
*/5 * * * * changanet /usr/local/bin/node /var/www/changanet/scripts/send-reminders.js >> /var/log/changanet/reminders.log 2>&1

# Limpieza de tokens expirados - Cada hora
0 * * * * changanet /usr/local/bin/node /var/www/changanet/scripts/cleanup-tokens.js >> /var/log/changanet/cleanup.log 2>&1

# Backup de base de datos - Diariamente a las 2 AM
0 2 * * * changanet /usr/local/bin/node /var/www/changanet/scripts/backup-database.js >> /var/log/changanet/backup.log 2>&1

# Optimización de base de datos - Semanalmente (domingos 3 AM)
0 3 * * 0 changanet /usr/local/bin/node /var/www/changanet/scripts/optimize-database.js >> /var/log/changanet/optimization.log 2>&1

# Generación de reportes - Diariamente 6 AM
0 6 * * * changanet /usr/local/bin/node /var/www/changanet/scripts/generate-reports.js >> /var/log/changanet/reports.log 2>&1

# Monitoreo de salud del sistema - Cada minuto
* * * * * changanet /usr/local/bin/node /var/www/changanet/scripts/health-check.js >> /var/log/changanet/health.log 2>&1
```

### 5.2 Scripts de Automatización

#### Script de Sincronización de Calendarios

```javascript
// scripts/sync-calendars.js
const { PrismaClient } = require('@prisma/client');
const { syncGoogleCalendar } = require('../src/services/calendarSyncService');

const prisma = new PrismaClient();

async function syncAllCalendars() {
  try {
    console.log(`[${new Date().toISOString()}] Starting calendar sync...`);

    // Obtener todas las conexiones activas de Google Calendar
    const activeConnections = await prisma.calendar_connections.findMany({
      where: {
        calendar_type: 'google',
        is_active: true,
        // Solo sincronizar conexiones que no se hayan sincronizado en la última hora
        OR: [
          { last_sync_at: null },
          { last_sync_at: { lt: new Date(Date.now() - 60 * 60 * 1000) } }
        ]
      },
      select: { user_id: true }
    });

    console.log(`Found ${activeConnections.length} calendars to sync`);

    let successCount = 0;
    let errorCount = 0;

    for (const connection of activeConnections) {
      try {
        await syncGoogleCalendar(connection.user_id);
        successCount++;
        console.log(`✅ Synced calendar for user ${connection.user_id}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to sync calendar for user ${connection.user_id}:`, error.message);
      }

      // Pequeña pausa para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[${new Date().toISOString()}] Calendar sync completed: ${successCount} success, ${errorCount} errors`);

  } catch (error) {
    console.error('Critical error in calendar sync:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

syncAllCalendars();
```

#### Script de Envío de Recordatorios

```javascript
// scripts/send-reminders.js
const { PrismaClient } = require('@prisma/client');
const { sendNotification } = require('../src/services/notificationService');

const prisma = new PrismaClient();

async function sendReminders() {
  try {
    const now = new Date();

    // Recordatorios de 1 hora
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const appointments1Hour = await prisma.appointments.findMany({
      where: {
        scheduled_start: {
          gte: now,
          lte: oneHourFromNow
        },
        status: 'confirmed',
        reminder_sent: false
      },
      include: {
        professional: { select: { nombre: true } },
        client: { select: { id: true, nombre: true } }
      }
    });

    // Recordatorios de 24 horas
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const appointments24Hours = await prisma.appointments.findMany({
      where: {
        scheduled_start: {
          gte: now,
          lte: twentyFourHoursFromNow
        },
        status: 'confirmed',
        reminder_sent: false
      },
      include: {
        professional: { select: { nombre: true } },
        client: { select: { id: true, nombre: true } }
      }
    });

    // Enviar recordatorios de 1 hora
    for (const appointment of appointments1Hour) {
      try {
        await sendNotification(
          appointment.client_id,
          'appointment_reminder_1h',
          `Recordatorio: Tienes una cita en 1 hora con ${appointment.professional.nombre}`,
          { appointment_id: appointment.id }
        );

        await sendNotification(
          appointment.professional_id,
          'appointment_reminder_1h',
          `Recordatorio: Tienes una cita en 1 hora con ${appointment.client.nombre}`,
          { appointment_id: appointment.id }
        );

        // Marcar como enviado
        await prisma.appointments.update({
          where: { id: appointment.id },
          data: {
            reminder_sent: true,
            reminder_time: now
          }
        });

      } catch (error) {
        console.error(`Error sending 1h reminder for appointment ${appointment.id}:`, error);
      }
    }

    // Enviar recordatorios de 24 horas
    for (const appointment of appointments24Hours) {
      try {
        await sendNotification(
          appointment.client_id,
          'appointment_reminder_24h',
          `Recordatorio: Tienes una cita mañana con ${appointment.professional.nombre}`,
          { appointment_id: appointment.id }
        );

        await sendNotification(
          appointment.professional_id,
          'appointment_reminder_24h',
          `Recordatorio: Tienes una cita mañana con ${appointment.client.nombre}`,
          { appointment_id: appointment.id }
        );

        // Marcar como enviado
        await prisma.appointments.update({
          where: { id: appointment.id },
          data: {
            reminder_sent: true,
            reminder_time: now
          }
        });

      } catch (error) {
        console.error(`Error sending 24h reminder for appointment ${appointment.id}:`, error);
      }
    }

    console.log(`Sent ${appointments1Hour.length} 1-hour reminders and ${appointments24Hours.length} 24-hour reminders`);

  } catch (error) {
    console.error('Error sending reminders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

sendReminders();
```

---

## 6. CONFIGURACIÓN DE BACKUP Y RECOVERY

### 6.1 Estrategia de Backup

```bash
#!/bin/bash
# scripts/backup-database.sh - Backup completo de base de datos

BACKUP_DIR="/var/backups/changanet"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="changanet_backup_$DATE"

# Crear directorio de backup
mkdir -p $BACKUP_DIR

echo "Starting database backup: $BACKUP_NAME"

# Backup de base de datos PostgreSQL
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --no-password \
  --format=custom \
  --compress=9 \
  --file=$BACKUP_DIR/$BACKUP_NAME.backup

# Verificar integridad del backup
if pg_restore --list $BACKUP_DIR/$BACKUP_NAME.backup > /dev/null 2>&1; then
  echo "✅ Backup created successfully: $BACKUP_NAME"

  # Comprimir adicionalmente
  gzip $BACKUP_DIR/$BACKUP_NAME.backup

  # Subir a cloud storage (ejemplo con AWS S3)
  aws s3 cp $BACKUP_DIR/$BACKUP_NAME.backup.gz s3://changanet-backups/database/

  # Limpiar backups antiguos (mantener últimos 30 días)
  find $BACKUP_DIR -name "*.backup.gz" -mtime +30 -delete

  # Log de éxito
  echo "$(date): Backup $BACKUP_NAME completed successfully" >> /var/log/changanet/backup.log
else
  echo "❌ Backup verification failed: $BACKUP_NAME"
  rm $BACKUP_DIR/$BACKUP_NAME.backup
  exit 1
fi
```

### 6.2 Plan de Recovery

```bash
#!/bin/bash
# scripts/restore-database.sh - Restauración de base de datos

BACKUP_FILE=$1

if [[ -z "$BACKUP_FILE" ]]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

echo "Starting database restore from: $BACKUP_FILE"

# Detener aplicación
pm2 stop changanet-backend

# Crear backup de estado actual (por si acaso)
CURRENT_BACKUP="pre_restore_$(date +%Y%m%d_%H%M%S).backup"
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --format=custom \
  --file=/tmp/$CURRENT_BACKUP

# Restaurar desde backup
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --no-password \
  --clean \
  --if-exists \
  --create \
  --verbose \
  $BACKUP_FILE

if [[ $? -eq 0 ]]; then
  echo "✅ Database restored successfully"

  # Ejecutar migraciones si es necesario
  npx prisma migrate deploy

  # Reiniciar aplicación
  pm2 restart changanet-backend

  echo "$(date): Database restore completed successfully" >> /var/log/changanet/restore.log
else
  echo "❌ Database restore failed"

  # Restaurar backup anterior si existe
  if [[ -f "/tmp/$CURRENT_BACKUP" ]]; then
    echo "Restoring pre-restore backup..."
    pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME /tmp/$CURRENT_BACKUP
  fi

  exit 1
fi
```

---

## 7. CONFIGURACIÓN DE NGINX

### 7.1 Configuración de Reverse Proxy

```nginx
# /etc/nginx/sites-available/changanet

upstream changanet_backend {
    server 127.0.0.1:3003;
    keepalive 32;
}

# API Server
server {
    listen 443 ssl http2;
    server_name api.changanet.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.changanet.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.changanet.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # API endpoints
    location /api/ {
        proxy_pass http://changanet_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Rate limiting
        limit_req zone=api burst=20 nodelay;

        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # iCal feeds (públicos)
    location /api/sync/calendar/ical/ {
        proxy_pass http://changanet_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # Cache iCal feeds for 5 minutes
        location ~* \.ics$ {
            expires 5m;
            add_header Cache-Control "public, must-revalidate, proxy-revalidate";
        }
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# Frontend (SPA)
server {
    listen 443 ssl http2;
    server_name app.changanet.com;

    root /var/www/changanet-frontend/dist;
    index index.html;

    # SSL Configuration (igual que arriba)
    ssl_certificate /etc/letsencrypt/live/app.changanet.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.changanet.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api/ {
        proxy_pass https://api.changanet.com;
        proxy_set_header Host api.changanet.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7.2 Configuración de Rate Limiting en Nginx

```nginx
# /etc/nginx/nginx.conf

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=calendar:10m rate=1r/s;

# Burst limits
limit_req zone=api burst=20 nodelay;
limit_req zone=auth burst=3 nodelay;
limit_req zone=calendar burst=5 nodelay;

# Connection limits
limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;
limit_conn conn_limit_per_ip 10;
```

---

## 8. GESTIÓN DE PROCESOS CON PM2

### 8.1 Configuración de PM2

```json
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'changanet-backend',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3003
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3003
    },
    // Logging
    log_file: '/var/log/changanet/combined.log',
    out_file: '/var/log/changanet/out.log',
    error_file: '/var/log/changanet/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Restart policy
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,

    // Memory management
    max_memory_restart: '1G',

    // Health check
    health_check: {
      enabled: true,
      url: 'http://localhost:3003/health',
      interval: 30000,
      timeout: 5000,
      fails: 3
    },

    // Environment variables
    env_file: '/var/www/changanet/.env.production'
  }]
};
```

### 8.2 Comandos de Gestión

```bash
# Iniciar aplicación
pm2 start ecosystem.config.js --env production

# Ver estado
pm2 status
pm2 monit

# Ver logs
pm2 logs changanet-backend
pm2 logs changanet-backend --lines 100

# Reiniciar
pm2 restart changanet-backend

# Recargar sin downtime
pm2 reload changanet-backend

# Detener
pm2 stop changanet-backend

# Eliminar
pm2 delete changanet-backend

# Guardar configuración
pm2 save
pm2 startup
```

---

## 9. MONITOREO Y ALERTAS

### 9.1 Métricas de Prometheus

```yaml
# prometheus.yml - Configuración de targets

global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'changanet-backend'
    static_configs:
      - targets: ['localhost:3003']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['localhost:9187']
```

### 9.2 Dashboards de Grafana

#### KPIs Principales
- **Response Time**: P95 < 500ms
- **Error Rate**: < 1%
- **Availability**: > 99.9%
- **Bookings per Hour**: Métrica de negocio
- **Calendar Sync Success Rate**: > 95%

#### Alertas Configuradas
```yaml
# Alert rules
groups:
  - name: changanet_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}%"

      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow response time detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: CalendarSyncFailure
        expr: rate(calendar_sync_errors_total[5m]) > 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Calendar sync failures detected"
```

### 9.3 Logging Centralizado

```javascript
// logger.js - Configuración de logging
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'changanet-backend' },
  transports: [
    // Console para desarrollo
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),

    // Archivo para producción
    new winston.transports.File({
      filename: '/var/log/changanet/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: '/var/log/changanet/combined.log'
    })
  ]
});

// Log de requests HTTP
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userId: req.user?.id
    });
  });
  next();
});

module.exports = logger;
```

---

## 10. SEGURIDAD DE PRODUCCIÓN

### 10.1 Configuración de Firewall

```bash
# UFW Configuration
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# SSH (solo desde IPs específicas)
ufw allow from YOUR_IP/32 to any port 22

# HTTP/HTTPS
ufw allow 80
ufw allow 443

# Habilitar firewall
ufw --force enable
```

### 10.2 Configuración SSL/TLS

```bash
# Let's Encrypt para SSL automático
certbot --nginx -d api.changanet.com -d app.changanet.com

# Verificar renovación automática
certbot renew --dry-run

# Configurar cron para renovación
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

### 10.3 Headers de Seguridad

```javascript
// securityHeaders.js
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.changanet.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## 11. OPTIMIZACIONES DE PERFORMANCE

### 11.1 Configuración de Redis Cache

```javascript
// cache.js - Configuración de caching
const redis = require('redis');
const { promisify } = require('util');

const client = redis.createClient({
  host: process.env.REDIS_HOST,
  password: process.env.REDIS_PASSWORD,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      console.error('Redis connection refused');
      return new Error('Redis connection failed');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      console.error('Redis retry time exhausted');
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

// Promisify Redis commands
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const delAsync = promisify(client.del).bind(client);

// Cache wrapper
class Cache {
  async get(key) {
    try {
      const data = await getAsync(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 300) { // 5 minutes default
    try {
      await setAsync(key, JSON.stringify(value), 'EX', ttl);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key) {
    try {
      await delAsync(key);
    } catch (error) {
      console.error('Cache del error:', error);
    }
  }
}

module.exports = new Cache();
```

### 11.2 Optimización de Base de Datos

```sql
-- Configuración de connection pooling
-- En producción, usar PgBouncer o similar

-- Optimización de queries frecuentes
CREATE OR REPLACE FUNCTION get_available_slots(
  p_professional_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  id UUID,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT,
  is_available BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    aslot.id,
    aslot.start_time,
    aslot.end_time,
    aslot.status,
    aslot.is_available
  FROM availability_slots aslot
  WHERE aslot.professional_id = p_professional_id
    AND aslot.start_time >= p_start_date::timestamptz
    AND aslot.start_time < (p_end_date::timestamptz + interval '1 day')
    AND aslot.status = 'available'
  ORDER BY aslot.start_time;
END;
$$;
```

---

## 12. CHECKLIST FINAL DE DEPLOYMENT

### ✅ PRE-DEPLOYMENT
- [ ] Variables de entorno configuradas y validadas
- [ ] Base de datos creada con índices optimizados
- [ ] Redis configurado y accesible
- [ ] SSL certificates instalados
- [ ] Nginx configurado como reverse proxy
- [ ] PM2 configurado para gestión de procesos
- [ ] Cron jobs configurados
- [ ] Backups automáticos configurados
- [ ] Monitoreo y alertas configuradas

### ✅ DEPLOYMENT
- [ ] Código desplegado en servidor
- [ ] Dependencias instaladas (`npm ci --production`)
- [ ] Base de datos migrada (`npx prisma migrate deploy`)
- [ ] Aplicación iniciada con PM2
- [ ] Health checks funcionando
- [ ] Logs configurados y rotando

### ✅ POST-DEPLOYMENT
- [ ] Endpoints de API funcionando
- [ ] Frontend accesible y funcional
- [ ] Autenticación funcionando
- [ ] Primeros usuarios pueden registrarse
- [ ] Sistema de bookings operativo
- [ ] Notificaciones funcionando
- [ ] Monitoreo reportando métricas correctas

### ✅ VALIDACIÓN EN PRODUCCIÓN
- [ ] Tests de carga ejecutados (100 usuarios concurrentes)
- [ ] Funcionalidades críticas probadas
- [ ] Backups verificados
- [ ] Logs monitoreados por 24 horas
- [ ] Métricas de performance dentro de límites

---

## 13. ROLLBACK PLAN

### Estrategia de Rollback
1. **Código**: Revertir a versión anterior en Git
2. **Base de Datos**: Restaurar desde backup si hay cambios incompatibles
3. **Configuración**: Revertir variables de entorno si es necesario
4. **Cache**: Limpiar Redis completamente
5. **CDN**: Purgar cache si aplica

### Comando de Rollback de Emergencia

```bash
#!/bin/bash
# rollback-emergency.sh

echo "🚨 EMERGENCY ROLLBACK INITIATED"

# Detener aplicación actual
pm2 stop changanet-backend

# Revertir código
git checkout HEAD~1
npm ci --production

# Restaurar base de datos si es necesario
if [[ "$ROLLBACK_DB" == "true" ]]; then
  ./scripts/restore-database.sh /var/backups/changanet/last_good_backup.backup
fi

# Limpiar cache
redis-cli FLUSHALL

# Reiniciar aplicación
pm2 start ecosystem.config.js --env production

# Verificar health
sleep 30
curl -f https://api.changanet.com/health

if [[ $? -eq 0 ]]; then
  echo "✅ Rollback successful"
else
  echo "❌ Rollback failed - manual intervention required"
  exit 1
fi
```

---

## 14. CONTACTOS DE SOPORTE

### Equipo de Desarrollo
- **Lead Developer**: [Nombre] - [email@changanet.com](mailto:email@changanet.com)
- **DevOps Engineer**: [Nombre] - [devops@changanet.com](mailto:devops@changanet.com)
- **Database Admin**: [Nombre] - [dba@changanet.com](mailto:dba@changanet.com)

### Monitoreo y Alertas
- **PagerDuty**: +1-XXX-XXX-XXXX (24/7)
- **Slack Channel**: #changanet-alerts
- **Email Alerts**: alerts@changanet.com

### Proveedores Externos
- **AWS Support**: [caso-id] - Para issues de infraestructura
- **SendGrid Support**: Para issues de email
- **Google Cloud**: Para Google Calendar API issues

---

**Checklist creado por:** Sistema de Análisis ChangaNet  
**Fecha:** 29 de Noviembre de 2025  
**Versión:** 2.0 - Avanzado  
**Estado:** ✅ **APROBADO PARA DEPLOYMENT**