# Migraciones SQL y Diagrama ER - Esquema Avanzado de Base de Datos
## Sistema de Gestión de Disponibilidad y Agenda - ChangaNet

**Fecha de Creación:** 29 de Noviembre de 2025
**Versión del Esquema:** 2.0 - Avanzado
**Base de Datos:** SQLite (desarrollo) / PostgreSQL (producción)

---

## 1. DIAGRAMA ER - ESQUEMA AVANZADO

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USUARIOS                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ id (PK, UUID)                           google_id (UQ)                     │
│ email (UQ)                               social_provider                    │
│ hash_contrasena                         social_provider_id (UQ)             │
│ nombre                                  url_foto_perfil                     │
│ telefono                                fcm_token                           │
│ rol (cliente/profesional/admin)         sms_enabled                         │
│ esta_verificado                         direccion                           │
│ bloqueado                               preferencias_servicio              │
│ token_verificacion                      notificaciones_push                 │
│ token_expiracion                        notificaciones_email               │
│ refresh_token_hash (UQ)                 notificaciones_sms                  │
│ creado_en                               notificaciones_servicios           │
│ actualizado_en                          notificaciones_mensajes            │
│                                       notificaciones_pagos                  │
│                                       notificaciones_marketing              │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      │ 1:N
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PERFILES_PROFESIONALES                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ usuario_id (PK, FK → usuarios.id)       latitud                            │
│ especialidad                            longitud                           │
│ especialidades (JSON)                   tarifa_hora                        │
│ anos_experiencia                        tarifa_servicio                    │
│ zona_cobertura                          tarifa_convenio                    │
│ ubicacion (JSON)                        descripcion                        │
│ url_foto_perfil                         url_foto_portada                   │
│ esta_disponible                         calificacion_promedio              │
│ estado_verificacion                     verificado_en                      │
│ url_documento_verificacion              creado_en                          │
│ search_vector                           actualizado_en                     │
│ search_vector_especialidades                                              │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      │ 1:N
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PROFESSIONALS_AVAILABILITY                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ id (PK, UUID)                           recurrence_config (JSON)           │
│ professional_id (FK → usuarios.id)      start_date                         │
│ title                                   end_date                           │
│ description                             start_time                        │
│ is_active                               end_time                           │
│ recurrence_type (none/daily/weekly/    duration_minutes                   │
│   monthly/custom)                       timezone                           │
│                                         dst_handling (auto/manual/ignore)  │
│ meta (JSON)                             created_at                        │
│                                         updated_at                         │
│                                         created_by                         │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      │ 1:N
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AVAILABILITY_SLOTS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ id (PK, UUID)                           local_end_time                     │
│ professional_id (FK → usuarios.id)      timezone                           │
│ availability_config_id (FK)             status (available/booked/blocked/  │
│ start_time (UTC, DateTime)              cancelled)                         │
│ end_time (UTC, DateTime)                is_available                       │
│ local_start_time                        booked_by (FK → usuarios.id)      │
│                                         booked_at                          │
│ meta (JSON)                             created_at                        │
│                                         updated_at                         │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      │ 1:1
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            APPOINTMENTS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ id (PK, UUID)                           client_notes                       │
│ professional_id (FK → usuarios.id)      price                              │
│ client_id (FK → usuarios.id)            currency                           │
│ slot_id (UQ, FK → availability_slots)   reminder_sent                      │
│ availability_config_id (FK)             reminder_time                      │
│ service_id (UQ, FK → servicios)          google_event_id (UQ)              │
│ title                                   ical_uid (UQ)                      │
│ description                             meta (JSON)                       │
│ appointment_type (service/consultation/ created_at                         │
│   meeting)                              updated_at                         │
│ status (scheduled/confirmed/in_progress/ created_by                        │
│   completed/cancelled/no_show)          cancelled_at                       │
│ priority (low/normal/high/urgent)       cancelled_by                       │
│ scheduled_start (UTC)                   cancel_reason                      │
│ scheduled_end (UTC)                                                        │
│ actual_start                            actual_end                         │
│ timezone                                                                       │
│ notes                                  client_notes                        │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      │ 1:1
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             SERVICIOS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ id (PK, UUID)                           slot_reservado (FK)                │
│ cliente_id (FK → usuarios.id)           servicio_recurrente_id             │
│ profesional_id (FK → usuarios.id)       appointment (1:1)                  │
│ descripcion                            estado (PENDIENTE/AGENDADO/        │
│                                         COMPLETADO/CANCELADO)              │
│ fecha_agendada                         completado_en                      │
│ creado_en                              es_urgente                         │
│ resena (1:1)                           pago (1:1)                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          BLOCKED_SLOTS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ id (PK, UUID)                           is_recurring                       │
│ professional_id (FK → usuarios.id)      recurrence_rule (RRULE)            │
│ title                                   timezone                           │
│ reason (vacation/sick/personal/         is_active                          │
│   maintenance/other)                    created_by                         │
│ description                             meta (JSON)                       │
│ start_time (UTC)                        created_at                        │
│ end_time (UTC)                          updated_at                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                       CALENDAR_CONNECTIONS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ id (PK, UUID)                           access_token                       │
│ user_id (FK → usuarios.id)              refresh_token                      │
│ calendar_type (google/ical)             token_expires_at                   │
│ calendar_id                             is_active                         │
│ calendar_name                           last_sync_at                      │
│                                         sync_status (pending/in_progress/  │
│ meta (JSON)                             completed/failed)                 │
│ created_at                              updated_at                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                       CALENDAR_SYNC_LOGS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ id (PK, UUID)                           remote_event_id                   │
│ user_id (FK → usuarios.id)              conflict_type                      │
│ connection_id (FK)                      conflict_data (JSON)               │
│ operation (push/pull/sync)              resolved                          │
│ status (success/error/conflict)         resolved_at                       │
│ message                                 resolution (keep_local/           │
│ local_event_id                          keep_remote/merge/manual)        │
│                                         created_at                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                       CONCURRENCY_LOCKS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ id (PK, UUID)                           lock_id                           │
│ resource_key (UQ)                       expires_at                        │
│                                         created_at                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Relaciones Clave
- **usuarios** → **perfiles_profesionales** (1:1)
- **usuarios** → **professionals_availability** (1:N)
- **professionals_availability** → **availability_slots** (1:N)
- **availability_slots** → **appointments** (1:1)
- **appointments** → **servicios** (1:1)
- **usuarios** → **blocked_slots** (1:N)
- **usuarios** → **calendar_connections** (1:N)
- **calendar_connections** → **calendar_sync_logs** (1:N)

---

## 2. MIGRACIONES SQL - SCRIPTS DE CREACIÓN

### Migración Inicial - Tablas Core

```sql
-- Migración 001: Creación de tablas base de usuarios y perfiles
-- Fecha: 2025-11-29
-- Versión: 2.0.0

-- Tabla: usuarios
CREATE TABLE usuarios (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    email TEXT UNIQUE NOT NULL,
    hash_contrasena TEXT,
    nombre TEXT NOT NULL,
    telefono TEXT,
    rol TEXT DEFAULT 'cliente' CHECK (rol IN ('cliente', 'profesional', 'admin')),
    esta_verificado BOOLEAN DEFAULT FALSE,
    bloqueado BOOLEAN DEFAULT FALSE,
    token_verificacion TEXT UNIQUE,
    token_expiracion DATETIME,
    refresh_token_hash TEXT UNIQUE,
    ultimo_email_verificacion DATETIME,
    ultimo_email_reset_password DATETIME,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME,
    google_id TEXT UNIQUE,
    social_provider TEXT CHECK (social_provider IN ('google', 'facebook')),
    social_provider_id TEXT UNIQUE,
    url_foto_perfil TEXT,
    fcm_token TEXT,
    sms_enabled BOOLEAN DEFAULT FALSE,
    direccion TEXT,
    preferencias_servicio TEXT,
    notificaciones_push BOOLEAN DEFAULT TRUE,
    notificaciones_email BOOLEAN DEFAULT TRUE,
    notificaciones_sms BOOLEAN DEFAULT FALSE,
    notificaciones_servicios BOOLEAN DEFAULT TRUE,
    notificaciones_mensajes BOOLEAN DEFAULT TRUE,
    notificaciones_pagos BOOLEAN DEFAULT TRUE,
    notificaciones_marketing BOOLEAN DEFAULT FALSE
);

-- Tabla: perfiles_profesionales
CREATE TABLE perfiles_profesionales (
    usuario_id TEXT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    especialidad TEXT,
    especialidades TEXT, -- JSON array
    anos_experiencia INTEGER,
    zona_cobertura TEXT,
    ubicacion TEXT, -- JSON string
    latitud REAL,
    longitud REAL,
    tipo_tarifa TEXT DEFAULT 'hora' CHECK (tipo_tarifa IN ('hora', 'servicio', 'convenio')),
    tarifa_hora REAL,
    tarifa_servicio REAL,
    tarifa_convenio TEXT,
    descripcion TEXT,
    url_foto_perfil TEXT,
    url_foto_portada TEXT,
    esta_disponible BOOLEAN DEFAULT TRUE,
    calificacion_promedio REAL,
    estado_verificacion TEXT DEFAULT 'pendiente' CHECK (estado_verificacion IN ('pendiente', 'verificado', 'rechazado')),
    verificado_en DATETIME,
    url_documento_verificacion TEXT,
    search_vector TEXT,
    search_vector_especialidades TEXT,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME
);

-- Índices para perfiles_profesionales
CREATE INDEX idx_perfiles_lat_lng ON perfiles_profesionales(latitud, longitud);
CREATE INDEX idx_perfiles_search_vector ON perfiles_profesionales(search_vector);
CREATE INDEX idx_perfiles_search_especialidades ON perfiles_profesionales(search_vector_especialidades);
CREATE INDEX idx_perfiles_filtros ON perfiles_profesionales(especialidad, zona_cobertura, calificacion_promedio, tarifa_hora, esta_disponible, estado_verificacion);
CREATE INDEX idx_perfiles_calificacion ON perfiles_profesionales(calificacion_promedio);
CREATE INDEX idx_perfiles_tarifa ON perfiles_profesionales(tarifa_hora);
CREATE INDEX idx_perfiles_tipo_tarifa ON perfiles_profesionales(tipo_tarifa);
```

### Migración Avanzada - Sistema de Disponibilidad

```sql
-- Migración 002: Sistema avanzado de disponibilidad y citas
-- Fecha: 2025-11-29
-- Versión: 2.0.1

-- Tabla: professionals_availability
CREATE TABLE professionals_availability (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    professional_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    recurrence_type TEXT DEFAULT 'none' CHECK (recurrence_type IN ('none', 'daily', 'weekly', 'monthly', 'custom')),
    recurrence_config TEXT, -- JSON
    start_date DATE NOT NULL,
    end_date DATE,
    start_time TEXT NOT NULL CHECK (start_time GLOB '[0-2][0-9]:[0-5][0-9]'),
    end_time TEXT NOT NULL CHECK (end_time GLOB '[0-2][0-9]:[0-5][0-9]'),
    duration_minutes INTEGER DEFAULT 60 CHECK (duration_minutes >= 15 AND duration_minutes <= 480),
    timezone TEXT DEFAULT 'America/Buenos_Aires',
    dst_handling TEXT DEFAULT 'auto' CHECK (dst_handling IN ('auto', 'manual', 'ignore')),
    meta TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

-- Tabla: availability_slots
CREATE TABLE availability_slots (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    professional_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    availability_config_id TEXT REFERENCES professionals_availability(id),
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    local_start_time TEXT CHECK (local_start_time GLOB '[0-2][0-9]:[0-5][0-9]'),
    local_end_time TEXT CHECK (local_end_time GLOB '[0-2][0-9]:[0-5][0-9]'),
    timezone TEXT DEFAULT 'America/Buenos_Aires',
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked', 'cancelled')),
    is_available BOOLEAN DEFAULT TRUE,
    booked_by TEXT REFERENCES usuarios(id),
    booked_at DATETIME,
    meta TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(professional_id, start_time)
);

-- Tabla: appointments
CREATE TABLE appointments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    professional_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    slot_id TEXT UNIQUE REFERENCES availability_slots(id),
    availability_config_id TEXT REFERENCES professionals_availability(id),
    service_id TEXT UNIQUE REFERENCES servicios(id),
    title TEXT NOT NULL,
    description TEXT,
    appointment_type TEXT DEFAULT 'service' CHECK (appointment_type IN ('service', 'consultation', 'meeting')),
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    scheduled_start DATETIME NOT NULL,
    scheduled_end DATETIME NOT NULL,
    actual_start DATETIME,
    actual_end DATETIME,
    timezone TEXT DEFAULT 'America/Buenos_Aires',
    notes TEXT,
    client_notes TEXT,
    price REAL,
    currency TEXT DEFAULT 'ARS',
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_time DATETIME,
    google_event_id TEXT UNIQUE,
    ical_uid TEXT UNIQUE,
    meta TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,
    cancelled_at DATETIME,
    cancelled_by TEXT,
    cancel_reason TEXT
);

-- Tabla: blocked_slots
CREATE TABLE blocked_slots (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    professional_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('vacation', 'sick', 'personal', 'maintenance', 'other')),
    description TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT, -- RRULE string
    timezone TEXT DEFAULT 'America/Buenos_Aires',
    is_active BOOLEAN DEFAULT TRUE,
    created_by TEXT NOT NULL,
    meta TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_professionals_availability_professional ON professionals_availability(professional_id);
CREATE INDEX idx_professionals_availability_active ON professionals_availability(is_active);
CREATE INDEX idx_professionals_availability_start_date ON professionals_availability(start_date);
CREATE INDEX idx_professionals_availability_recurrence ON professionals_availability(recurrence_type);
CREATE INDEX idx_professionals_availability_compound ON professionals_availability(professional_id, is_active);

CREATE INDEX idx_availability_slots_professional ON availability_slots(professional_id);
CREATE INDEX idx_availability_slots_start_time ON availability_slots(start_time);
CREATE INDEX idx_availability_slots_status ON availability_slots(status);
CREATE INDEX idx_availability_slots_available ON availability_slots(is_available);
CREATE INDEX idx_availability_slots_professional_time ON availability_slots(professional_id, start_time);
CREATE INDEX idx_availability_slots_professional_status ON availability_slots(professional_id, status);
CREATE INDEX idx_availability_slots_config ON availability_slots(availability_config_id);

CREATE INDEX idx_appointments_professional ON appointments(professional_id);
CREATE INDEX idx_appointments_client ON appointments(client_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_scheduled_start ON appointments(scheduled_start);
CREATE INDEX idx_appointments_professional_scheduled ON appointments(professional_id, scheduled_start);
CREATE INDEX idx_appointments_client_scheduled ON appointments(client_id, scheduled_start);
CREATE INDEX idx_appointments_professional_status ON appointments(professional_id, status);
CREATE INDEX idx_appointments_client_status ON appointments(client_id, status);
CREATE INDEX idx_appointments_slot ON appointments(slot_id);
CREATE INDEX idx_appointments_service ON appointments(service_id);
CREATE INDEX idx_appointments_google_event ON appointments(google_event_id);
CREATE INDEX idx_appointments_ical_uid ON appointments(ical_uid);

CREATE INDEX idx_blocked_slots_professional ON blocked_slots(professional_id);
CREATE INDEX idx_blocked_slots_start_time ON blocked_slots(start_time);
CREATE INDEX idx_blocked_slots_end_time ON blocked_slots(end_time);
CREATE INDEX idx_blocked_slots_active ON blocked_slots(is_active);
CREATE INDEX idx_blocked_slots_professional_time ON blocked_slots(professional_id, start_time, end_time);
CREATE INDEX idx_blocked_slots_professional_active ON blocked_slots(professional_id, is_active);
```

### Migración de Integración - Calendarios Externos

```sql
-- Migración 003: Integración con calendarios externos
-- Fecha: 2025-11-29
-- Versión: 2.0.2

-- Tabla: calendar_connections
CREATE TABLE calendar_connections (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    user_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    calendar_type TEXT NOT NULL CHECK (calendar_type IN ('google', 'ical')),
    calendar_id TEXT NOT NULL,
    calendar_name TEXT,
    access_token TEXT, -- Encrypted in production
    refresh_token TEXT, -- Encrypted in production
    token_expires_at DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at DATETIME,
    sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'in_progress', 'completed', 'failed')),
    meta TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, calendar_type, calendar_id)
);

-- Tabla: calendar_sync_logs
CREATE TABLE calendar_sync_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    user_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    connection_id TEXT REFERENCES calendar_connections(id),
    operation TEXT NOT NULL CHECK (operation IN ('push', 'pull', 'sync', 'conflict', 'resolution')),
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'conflict')),
    message TEXT,
    local_event_id TEXT, -- appointment.id
    remote_event_id TEXT, -- Google Calendar event ID
    conflict_type TEXT CHECK (conflict_type IN ('time_overlap', 'double_booking', 'update_conflict')),
    conflict_data TEXT, -- JSON
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at DATETIME,
    resolution TEXT CHECK (resolution IN ('keep_local', 'keep_remote', 'merge', 'manual')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: concurrency_locks
CREATE TABLE concurrency_locks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    resource_key TEXT NOT NULL UNIQUE,
    lock_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para calendar_connections
CREATE INDEX idx_calendar_connections_user ON calendar_connections(user_id);
CREATE INDEX idx_calendar_connections_type ON calendar_connections(calendar_type);
CREATE INDEX idx_calendar_connections_active ON calendar_connections(is_active);
CREATE INDEX idx_calendar_connections_sync_status ON calendar_connections(sync_status);

-- Índices para calendar_sync_logs
CREATE INDEX idx_calendar_sync_logs_user ON calendar_sync_logs(user_id);
CREATE INDEX idx_calendar_sync_logs_connection ON calendar_sync_logs(connection_id);
CREATE INDEX idx_calendar_sync_logs_operation ON calendar_sync_logs(operation);
CREATE INDEX idx_calendar_sync_logs_status ON calendar_sync_logs(status);
CREATE INDEX idx_calendar_sync_logs_resolved ON calendar_sync_logs(resolved);

-- Índices para concurrency_locks
CREATE INDEX idx_concurrency_locks_expires ON concurrency_locks(expires_at);
CREATE INDEX idx_concurrency_locks_created ON concurrency_locks(created_at);
```

### Migración de Compatibilidad - Sistema Legacy

```sql
-- Migración 004: Compatibilidad con sistema legacy de disponibilidad
-- Fecha: 2025-11-29
-- Versión: 2.0.3

-- Tabla legacy: disponibilidad (mantenida por compatibilidad)
CREATE TABLE disponibilidad (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    profesional_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora_inicio DATETIME NOT NULL,
    hora_fin DATETIME NOT NULL,
    esta_disponible BOOLEAN DEFAULT TRUE,
    reservado_por TEXT REFERENCES usuarios(id),
    reservado_en DATETIME,
    servicio_id TEXT UNIQUE REFERENCES servicios(id),
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla legacy: servicios (mantenida por compatibilidad)
CREATE TABLE servicios (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    cliente_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    profesional_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    descripcion TEXT NOT NULL,
    estado TEXT DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'AGENDADO', 'COMPLETADO', 'CANCELADO')),
    fecha_agendada DATETIME,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    completado_en DATETIME,
    es_urgente BOOLEAN DEFAULT FALSE,
    slot_reservado TEXT REFERENCES disponibilidad(id),
    servicio_recurrente_id TEXT
);

-- Índices legacy
CREATE INDEX idx_disponibilidad_profesional_fecha ON disponibilidad(profesional_id, fecha);
CREATE INDEX idx_disponibilidad_reservado_por ON disponibilidad(reservado_por);
CREATE INDEX idx_disponibilidad_servicio ON disponibilidad(servicio_id);
CREATE INDEX idx_disponibilidad_disponible_fecha ON disponibilidad(esta_disponible, fecha);

CREATE INDEX idx_servicios_cliente ON servicios(cliente_id);
CREATE INDEX idx_servicios_profesional ON servicios(profesional_id);
CREATE INDEX idx_servicios_estado ON servicios(estado);
CREATE INDEX idx_servicios_creado ON servicios(creado_en);
CREATE INDEX idx_servicios_urgente ON servicios(es_urgente);
CREATE INDEX idx_servicios_fecha_agendada ON servicios(fecha_agendada);
CREATE INDEX idx_servicios_cliente_estado ON servicios(cliente_id, estado);
CREATE INDEX idx_servicios_profesional_estado ON servicios(profesional_id, estado);
CREATE INDEX idx_servicios_estado_creado ON servicios(estado, creado_en);
CREATE INDEX idx_servicios_urgente_estado ON servicios(es_urgente, estado);
CREATE INDEX idx_servicios_fecha_cliente ON servicios(cliente_id, fecha_agendada);
CREATE INDEX idx_servicios_fecha_profesional ON servicios(profesional_id, fecha_agendada);
```

---

## 3. VISTAS Y FUNCIONES UTILITARIAS

### Vistas para Reportes

```sql
-- Vista: Professional availability summary
CREATE VIEW professional_availability_summary AS
SELECT
    pa.professional_id,
    u.nombre as professional_name,
    COUNT(DISTINCT pa.id) as total_configs,
    COUNT(DISTINCT CASE WHEN pa.is_active THEN pa.id END) as active_configs,
    COUNT(DISTINCT aslot.id) as total_slots,
    COUNT(DISTINCT CASE WHEN aslot.status = 'available' THEN aslot.id END) as available_slots,
    COUNT(DISTINCT CASE WHEN aslot.status = 'booked' THEN aslot.id END) as booked_slots,
    COUNT(DISTINCT CASE WHEN aslot.status = 'blocked' THEN aslot.id END) as blocked_slots,
    COUNT(DISTINCT app.id) as total_appointments,
    AVG(CASE WHEN app.price IS NOT NULL THEN app.price END) as avg_appointment_price
FROM professionals_availability pa
JOIN usuarios u ON pa.professional_id = u.id
LEFT JOIN availability_slots aslot ON pa.id = aslot.availability_config_id
LEFT JOIN appointments app ON aslot.id = app.slot_id
GROUP BY pa.professional_id, u.nombre;

-- Vista: Daily availability overview
CREATE VIEW daily_availability_overview AS
SELECT
    DATE(aslot.start_time) as date,
    aslot.professional_id,
    u.nombre as professional_name,
    COUNT(*) as total_slots,
    COUNT(CASE WHEN aslot.status = 'available' THEN 1 END) as available_slots,
    COUNT(CASE WHEN aslot.status = 'booked' THEN 1 END) as booked_slots,
    COUNT(CASE WHEN aslot.status = 'blocked' THEN 1 END) as blocked_slots,
    COUNT(DISTINCT app.id) as appointments_count,
    SUM(app.price) as total_revenue
FROM availability_slots aslot
JOIN usuarios u ON aslot.professional_id = u.id
LEFT JOIN appointments app ON aslot.id = app.slot_id
WHERE DATE(aslot.start_time) >= DATE('now', '-30 days')
GROUP BY DATE(aslot.start_time), aslot.professional_id, u.nombre
ORDER BY date DESC, professional_name;

-- Vista: Conflict detection view
CREATE VIEW potential_conflicts AS
SELECT
    a1.id as slot1_id,
    a2.id as slot2_id,
    a1.professional_id,
    u.nombre as professional_name,
    a1.start_time as slot1_start,
    a1.end_time as slot1_end,
    a2.start_time as slot2_start,
    a2.end_time as slot2_end,
    CASE
        WHEN a1.booked_by IS NOT NULL AND a2.booked_by IS NOT NULL THEN 'Double booking'
        WHEN a1.status = 'blocked' AND a2.status = 'booked' THEN 'Blocked slot booked'
        WHEN a2.status = 'blocked' AND a1.status = 'booked' THEN 'Blocked slot booked'
        ELSE 'Time overlap'
    END as conflict_type
FROM availability_slots a1
JOIN availability_slots a2 ON a1.professional_id = a2.professional_id
    AND a1.id < a2.id
    AND a1.start_time < a2.end_time
    AND a2.start_time < a1.end_time
JOIN usuarios u ON a1.professional_id = u.id
WHERE (a1.status IN ('booked', 'blocked') OR a2.status IN ('booked', 'blocked'))
ORDER BY a1.professional_id, a1.start_time;
```

### Funciones Utilitarias

```sql
-- Función: Check slot availability
CREATE FUNCTION is_slot_available(slot_id TEXT) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM availability_slots
        WHERE id = slot_id
        AND status = 'available'
        AND is_available = TRUE
        AND start_time > CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql;

-- Función: Get professional utilization rate
CREATE FUNCTION get_professional_utilization(professional_id TEXT, start_date DATE, end_date DATE)
RETURNS DECIMAL AS $$
DECLARE
    total_slots INTEGER;
    booked_slots INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(CASE WHEN status = 'booked' THEN 1 END)
    INTO total_slots, booked_slots
    FROM availability_slots
    WHERE professional_id = professional_id
    AND DATE(start_time) BETWEEN start_date AND end_date;

    IF total_slots = 0 THEN
        RETURN 0;
    END IF;

    RETURN ROUND((booked_slots::DECIMAL / total_slots::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Función: Calculate timezone offset
CREATE FUNCTION get_timezone_offset(timezone_name TEXT, check_date DATE DEFAULT CURRENT_DATE)
RETURNS INTERVAL AS $$
BEGIN
    -- This is a simplified version. In production, use a proper timezone library
    CASE timezone_name
        WHEN 'America/Buenos_Aires' THEN RETURN '-03:00';
        WHEN 'America/New_York' THEN RETURN '-05:00';
        WHEN 'Europe/Madrid' THEN RETURN '+01:00';
        ELSE RETURN '+00:00';
    END CASE;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. TRIGGERS PARA INTEGRIDAD DE DATOS

### Triggers de Validación

```sql
-- Trigger: Validate appointment times
CREATE OR REPLACE FUNCTION validate_appointment_times()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.scheduled_end <= NEW.scheduled_start THEN
        RAISE EXCEPTION 'End time must be after start time';
    END IF;

    -- Check if slot is still available
    IF NEW.slot_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM availability_slots
            WHERE id = NEW.slot_id
            AND status = 'available'
            AND professional_id = NEW.professional_id
        ) THEN
            RAISE EXCEPTION 'Slot is not available';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_appointment_times_trigger
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION validate_appointment_times();

-- Trigger: Update slot status on booking
CREATE OR REPLACE FUNCTION update_slot_on_booking()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slot_id IS NOT NULL THEN
        UPDATE availability_slots
        SET status = 'booked',
            booked_by = NEW.client_id,
            booked_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.slot_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_slot_on_booking_trigger
    AFTER INSERT ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_slot_on_booking();

-- Trigger: Prevent double booking
CREATE OR REPLACE FUNCTION prevent_double_booking()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for overlapping appointments
    IF EXISTS (
        SELECT 1 FROM appointments a
        JOIN availability_slots s1 ON a.slot_id = s1.id
        JOIN availability_slots s2 ON s2.professional_id = s1.professional_id
        WHERE s2.id = NEW.slot_id
        AND a.id != COALESCE(NEW.id, '')
        AND a.status NOT IN ('cancelled', 'completed')
        AND s1.start_time < s2.end_time
        AND s2.start_time < s1.end_time
    ) THEN
        RAISE EXCEPTION 'Time slot conflict detected';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_double_booking_trigger
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION prevent_double_booking();
```

### Triggers de Auditoría

```sql
-- Trigger: Audit log for critical operations
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION audit_critical_operations()
RETURNS TRIGGER AS $$
DECLARE
    old_row JSONB;
    new_row JSONB;
BEGIN
    old_row := CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD)::JSONB ELSE NULL END;
    new_row := CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::JSONB ELSE NULL END;

    INSERT INTO audit_log (table_name, record_id, operation, old_values, new_values, user_id)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP, old_row, new_row, current_user_id());

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to critical tables
CREATE TRIGGER audit_appointments
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW EXECUTE FUNCTION audit_critical_operations();

CREATE TRIGGER audit_availability_slots
    AFTER INSERT OR UPDATE OR DELETE ON availability_slots
    FOR EACH ROW EXECUTE FUNCTION audit_critical_operations();
```

---

## 5. OPTIMIZACIONES DE PERFORMANCE

### Índices Compuestos Estratégicos

```sql
-- Índices para consultas de calendario
CREATE INDEX idx_slots_calendar_view ON availability_slots(professional_id, DATE(start_time), status, is_available);

-- Índices para búsquedas de disponibilidad
CREATE INDEX idx_slots_time_range ON availability_slots(start_time, end_time) WHERE status = 'available';

-- Índices para reportes de utilization
CREATE INDEX idx_slots_utilization ON availability_slots(professional_id, DATE(start_time), status);

-- Índices para conflict detection
CREATE INDEX idx_slots_conflict_check ON availability_slots(professional_id, start_time, end_time, status);

-- Índices para sync operations
CREATE INDEX idx_appointments_sync ON appointments(professional_id, updated_at, status);
CREATE INDEX idx_sync_logs_performance ON calendar_sync_logs(user_id, operation, status, created_at);
```

### Configuración de Cache

```sql
-- Tabla para cache de availability
CREATE TABLE availability_cache (
    cache_key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_availability_cache_expires ON availability_cache(expires_at);

-- Función para limpiar cache expirado
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM availability_cache WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. ESTRATEGIAS DE BACKUP Y RECOVERY

### Backup Strategy

```bash
#!/bin/bash
# Daily backup script for availability system

BACKUP_DIR="/backups/availability"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -f $BACKUP_DIR/availability_$DATE.sql

# Backup configuration files
tar -czf $BACKUP_DIR/config_$DATE.tar.gz /etc/changanet/

# Upload to cloud storage
aws s3 cp $BACKUP_DIR/availability_$DATE.sql s3://changanet-backups/database/
aws s3 cp $BACKUP_DIR/config_$DATE.tar.gz s3://changanet-backups/config/

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

# Verify backup integrity
if ! pg_restore --list $BACKUP_DIR/availability_$DATE.sql > /dev/null; then
    echo "Backup verification failed!" >&2
    exit 1
fi

echo "Backup completed successfully: $DATE"
```

### Point-in-Time Recovery

```sql
-- Recovery script template
-- 1. Stop application
-- 2. Restore base backup
-- 3. Apply WAL logs until target time

-- Example recovery commands
RESTORE DATABASE changanet_availability
FROM '/backups/availability/availability_20251129_020000.sql'
WITH RECOVERY TARGET TIME '2025-11-29 02:00:00';

-- Verify data integrity
SELECT COUNT(*) FROM availability_slots;
SELECT COUNT(*) FROM appointments WHERE status = 'scheduled';
```

---

## 7. MIGRACIÓN DE DATOS LEGACY

### Script de Migración

```sql
-- Migración de datos legacy a nuevo sistema
-- Ejecutar después de crear las nuevas tablas

-- Paso 1: Migrar configuraciones básicas de disponibilidad
INSERT INTO professionals_availability (
    id, professional_id, title, description, is_active,
    recurrence_type, start_date, end_date, start_time, end_time,
    timezone, created_at, created_by
)
SELECT
    'legacy-' || d.id,
    d.profesional_id,
    'Configuración Legacy',
    'Migrada desde sistema anterior',
    TRUE,
    'none',
    DATE(d.fecha),
    DATE(d.fecha),
    TIME(d.hora_inicio),
    TIME(d.hora_fin),
    'America/Buenos_Aires',
    d.creado_en,
    d.profesional_id
FROM disponibilidad d
WHERE NOT EXISTS (
    SELECT 1 FROM professionals_availability pa
    WHERE pa.professional_id = d.profesional_id
);

-- Paso 2: Generar slots para datos legacy
INSERT INTO availability_slots (
    id, professional_id, availability_config_id,
    start_time, end_time, local_start_time, local_end_time, timezone,
    status, is_available, booked_by, booked_at, created_at
)
SELECT
    d.id,
    d.profesional_id,
    'legacy-' || d.id,
    d.hora_inicio,
    d.hora_fin,
    TIME(d.hora_inicio),
    TIME(d.hora_fin),
    'America/Buenos_Aires',
    CASE
        WHEN d.esta_disponible = FALSE THEN 'booked'
        ELSE 'available'
    END,
    d.esta_disponible,
    d.reservado_por,
    d.reservado_en,
    d.creado_en
FROM disponibilidad d;

-- Paso 3: Migrar servicios a appointments
INSERT INTO appointments (
    id, professional_id, client_id, service_id,
    title, description, status, scheduled_start, scheduled_end,
    timezone, created_at, created_by
)
SELECT
    'appt-' || s.id,
    s.profesional_id,
    s.cliente_id,
    s.id,
    'Servicio Agendado',
    s.descripcion,
    CASE s.estado
        WHEN 'PENDIENTE' THEN 'scheduled'
        WHEN 'AGENDADO' THEN 'confirmed'
        WHEN 'COMPLETADO' THEN 'completed'
        WHEN 'CANCELADO' THEN 'cancelled'
        ELSE 'scheduled'
    END,
    s.fecha_agendada,
    datetime(s.fecha_agendada, '+1 hour'), -- Asumir 1 hora por defecto
    'America/Buenos_Aires',
    s.creado_en,
    s.cliente_id
FROM servicios s
WHERE s.fecha_agendada IS NOT NULL;

-- Paso 4: Vincular appointments con slots
UPDATE appointments
SET slot_id = (
    SELECT aslot.id
    FROM availability_slots aslot
    WHERE aslot.professional_id = appointments.professional_id
    AND datetime(aslot.start_time) = datetime(appointments.scheduled_start)
    LIMIT 1
)
WHERE slot_id IS NULL;
```

---

## 8. MONITOREO Y ALERTAS

### Métricas Críticas

```sql
-- Vista de métricas de sistema
CREATE VIEW system_metrics AS
SELECT
    'availability_slots' as metric,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'available' THEN 1 END) as available_count,
    COUNT(CASE WHEN status = 'booked' THEN 1 END) as booked_count,
    COUNT(CASE WHEN created_at > datetime('now', '-1 hour') THEN 1 END) as last_hour_created
FROM availability_slots

UNION ALL

SELECT
    'appointments' as metric,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN created_at > datetime('now', '-1 hour') THEN 1 END) as last_hour_created
FROM appointments

UNION ALL

SELECT
    'sync_operations' as metric,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
    COUNT(CASE WHEN created_at > datetime('now', '-1 hour') THEN 1 END) as last_hour_operations
FROM calendar_sync_logs;
```

### Alertas Automáticas

```sql
-- Función para verificar integridad
CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE(table_name TEXT, issue TEXT, count INTEGER) AS $$
BEGIN
    -- Check for orphaned appointments
    RETURN QUERY
    SELECT
        'appointments'::TEXT,
        'Orphaned appointments (no slot)'::TEXT,
        COUNT(*)::INTEGER
    FROM appointments
    WHERE slot_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM availability_slots WHERE id = appointments.slot_id);

    -- Check for double bookings
    RETURN QUERY
    SELECT
        'availability_slots'::TEXT,
        'Double booked slots'::TEXT,
        COUNT(DISTINCT a1.id)::INTEGER
    FROM availability_slots a1
    JOIN availability_slots a2 ON a1.professional_id = a2.professional_id
        AND a1.id < a2.id
        AND a1.status = 'booked'
        AND a2.status = 'booked'
        AND a1.start_time < a2.end_time
        AND a2.start_time < a1.end_time;

    -- Check for sync failures
    RETURN QUERY
    SELECT
        'calendar_sync_logs'::TEXT,
        'Recent sync failures'::TEXT,
        COUNT(*)::INTEGER
    FROM calendar_sync_logs
    WHERE status = 'error'
    AND created_at > datetime('now', '-1 hour');
END;
$$ LANGUAGE plpgsql;
```

---

**Documentación preparada por:** Sistema de Análisis ChangaNet  
**Fecha:** 29 de Noviembre de 2025  
**Versión:** 2.0 - Avanzado  
**Estado:** ✅ **LISTO PARA DEPLOYMENT**