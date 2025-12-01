-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "hash_contrasena" TEXT,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "rol" TEXT NOT NULL DEFAULT 'cliente',
    "esta_verificado" BOOLEAN NOT NULL DEFAULT false,
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "token_verificacion" TEXT,
    "token_expiracion" DATETIME,
    "refresh_token_hash" TEXT,
    "ultimo_email_verificacion" DATETIME,
    "ultimo_email_reset_password" DATETIME,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" DATETIME,
    "google_id" TEXT,
    "social_provider" TEXT,
    "social_provider_id" TEXT,
    "url_foto_perfil" TEXT,
    "fcm_token" TEXT,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "direccion" TEXT,
    "preferencias_servicio" TEXT,
    "notificaciones_push" BOOLEAN NOT NULL DEFAULT true,
    "notificaciones_email" BOOLEAN NOT NULL DEFAULT true,
    "notificaciones_sms" BOOLEAN NOT NULL DEFAULT false,
    "notificaciones_servicios" BOOLEAN NOT NULL DEFAULT true,
    "notificaciones_mensajes" BOOLEAN NOT NULL DEFAULT true,
    "notificaciones_pagos" BOOLEAN NOT NULL DEFAULT true,
    "notificaciones_marketing" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "failed_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "user_id" TEXT,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "reason" TEXT NOT NULL,
    "attempt_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blocked_until" DATETIME,
    CONSTRAINT "failed_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "perfiles_profesionales" (
    "usuario_id" TEXT NOT NULL PRIMARY KEY,
    "especialidad" TEXT NOT NULL,
    "especialidades" TEXT,
    "anos_experiencia" INTEGER,
    "zona_cobertura" TEXT NOT NULL,
    "ubicacion" TEXT,
    "latitud" REAL,
    "longitud" REAL,
    "tipo_tarifa" TEXT NOT NULL DEFAULT 'hora',
    "tarifa_hora" REAL,
    "tarifa_servicio" REAL,
    "tarifa_convenio" TEXT,
    "descripcion" TEXT,
    "url_foto_perfil" TEXT,
    "url_foto_portada" TEXT,
    "esta_disponible" BOOLEAN NOT NULL DEFAULT true,
    "calificacion_promedio" REAL,
    "estado_verificacion" TEXT NOT NULL DEFAULT 'pendiente',
    "verificado_en" DATETIME,
    "url_documento_verificacion" TEXT,
    "search_vector" TEXT,
    "search_vector_especialidades" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" DATETIME,
    CONSTRAINT "perfiles_profesionales_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "servicios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cliente_id" TEXT NOT NULL,
    "profesional_id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "fecha_agendada" DATETIME,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completado_en" DATETIME,
    "es_urgente" BOOLEAN NOT NULL DEFAULT false,
    "servicio_recurrente_id" TEXT,
    CONSTRAINT "servicios_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "servicios_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "servicios_servicio_recurrente_id_fkey" FOREIGN KEY ("servicio_recurrente_id") REFERENCES "servicios_recurrrentes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "resenas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "servicio_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "calificacion" INTEGER NOT NULL,
    "comentario" TEXT,
    "url_foto" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resenas_servicio_id_fkey" FOREIGN KEY ("servicio_id") REFERENCES "servicios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "resenas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "remitente_id" TEXT NOT NULL,
    "destinatario_id" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "url_imagen" TEXT,
    "esta_leido" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mensajes_remitente_id_fkey" FOREIGN KEY ("remitente_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "mensajes_destinatario_id_fkey" FOREIGN KEY ("destinatario_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "disponibilidad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profesional_id" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "hora_inicio" DATETIME NOT NULL,
    "hora_fin" DATETIME NOT NULL,
    "esta_disponible" BOOLEAN NOT NULL DEFAULT true,
    "reservado_por" TEXT,
    "reservado_en" DATETIME,
    "servicio_id" TEXT,
    CONSTRAINT "disponibilidad_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "disponibilidad_reservado_por_fkey" FOREIGN KEY ("reservado_por") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "disponibilidad_servicio_id_fkey" FOREIGN KEY ("servicio_id") REFERENCES "servicios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuario_id" TEXT NOT NULL,
    "prioridad" TEXT NOT NULL DEFAULT 'MEDIUM',
    "tipo" TEXT NOT NULL,
    "subtipo" TEXT,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "metadata" TEXT,
    "esta_leido" BOOLEAN NOT NULL DEFAULT false,
    "canales_enviados" TEXT,
    "fecha_envio" DATETIME,
    "programado_para" DATETIME,
    "expira_en" DATETIME,
    "plantilla_usada" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" DATETIME,
    CONSTRAINT "notificaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuario_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'America/Buenos_Aires',
    "canales" TEXT NOT NULL,
    "categorias" TEXT NOT NULL,
    "quiet_hours_enabled" BOOLEAN NOT NULL DEFAULT false,
    "quiet_start_time" TEXT,
    "quiet_end_time" TEXT,
    "summary_frequency" TEXT NOT NULL DEFAULT 'immediate',
    "max_notifications_per_hour" INTEGER NOT NULL DEFAULT 50,
    "group_similar" BOOLEAN NOT NULL DEFAULT true,
    "sound_enabled" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" DATETIME,
    CONSTRAINT "notification_preferences_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" TEXT NOT NULL,
    "subtipo" TEXT,
    "titulo_push" TEXT,
    "mensaje_push" TEXT,
    "titulo_email" TEXT,
    "mensaje_email" TEXT,
    "asunto_email" TEXT,
    "mensaje_sms" TEXT,
    "variables" TEXT,
    "prioridad_default" TEXT NOT NULL DEFAULT 'MEDIUM',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" DATETIME
);

-- CreateTable
CREATE TABLE "notification_metrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuario_id" TEXT,
    "tipo_notificacion" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "enviada" BOOLEAN NOT NULL DEFAULT false,
    "entregada" BOOLEAN NOT NULL DEFAULT false,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "clickeada" BOOLEAN NOT NULL DEFAULT false,
    "fecha_envio" DATETIME,
    "fecha_entrega" DATETIME,
    "fecha_lectura" DATETIME,
    "fecha_click" DATETIME,
    "metadata" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_metrics_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cotizaciones" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cliente_id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "zona_cobertura" TEXT,
    "fotos_urls" TEXT,
    "profesionales_solicitados" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cotizaciones_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cotizacion_respuestas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cotizacion_id" TEXT NOT NULL,
    "profesional_id" TEXT NOT NULL,
    "precio" REAL,
    "comentario" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondido_en" DATETIME,
    CONSTRAINT "cotizacion_respuestas_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "cotizaciones" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "cotizacion_respuestas_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuario_id" TEXT NOT NULL,
    "documento_url" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "comentario_admin" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisado_en" DATETIME,
    "revisado_por" TEXT,
    CONSTRAINT "verification_requests_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "servicio_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "profesional_id" TEXT NOT NULL,
    "monto_total" REAL NOT NULL,
    "comision_plataforma" REAL NOT NULL,
    "monto_profesional" REAL NOT NULL,
    "mercado_pago_id" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "metodo_pago" TEXT,
    "fecha_pago" DATETIME,
    "fecha_liberacion" DATETIME,
    "url_comprobante" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commission_setting_id" TEXT,
    "escrow_release_deadline" DATETIME,
    CONSTRAINT "pagos_servicio_id_fkey" FOREIGN KEY ("servicio_id") REFERENCES "servicios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pagos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pagos_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pagos_commission_setting_id_fkey" FOREIGN KEY ("commission_setting_id") REFERENCES "commission_settings" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cuentas_bancarias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profesional_id" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "tipo_cuenta" TEXT NOT NULL DEFAULT 'checking',
    "numero_cuenta_encrypted" TEXT NOT NULL,
    "cvu_encrypted" TEXT,
    "alias" TEXT,
    "titular" TEXT NOT NULL,
    "documento_titular_encrypted" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_verificacion" DATETIME,
    "verificado_por" TEXT,
    "motivo_rechazo" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" DATETIME NOT NULL,
    CONSTRAINT "cuentas_bancarias_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "retiros" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profesional_id" TEXT NOT NULL,
    "cuenta_bancaria_id" TEXT NOT NULL,
    "monto" REAL NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "fecha_solicitud" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_procesamiento" DATETIME,
    "referencia_bancaria" TEXT,
    "notas" TEXT,
    "motivo_rechazo" TEXT,
    "procesado_por" TEXT,
    "procesado_en" DATETIME,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "retiros_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "retiros_cuenta_bancaria_id_fkey" FOREIGN KEY ("cuenta_bancaria_id") REFERENCES "cuentas_bancarias" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "commission_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "porcentaje" REAL NOT NULL,
    "tipo_servicio" TEXT,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_por" TEXT
);

-- CreateTable
CREATE TABLE "transactions_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo_transaccion" TEXT NOT NULL,
    "entidad_tipo" TEXT NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "monto" REAL,
    "detalles" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "exito" BOOLEAN NOT NULL DEFAULT true,
    "error_mensaje" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_log_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profesional_id" TEXT NOT NULL,
    "servicio_id" TEXT,
    "monto_bruto" REAL NOT NULL,
    "comision_plataforma" REAL NOT NULL,
    "monto_neto" REAL NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "metodo_pago" TEXT NOT NULL DEFAULT 'bank_transfer',
    "referencia_pago" TEXT,
    "fecha_pago" DATETIME,
    "procesado_en" DATETIME,
    "notas" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payouts_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payouts_servicio_id_fkey" FOREIGN KEY ("servicio_id") REFERENCES "servicios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "servicios_recurrrentes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cliente_id" TEXT NOT NULL,
    "profesional_id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "frecuencia" TEXT NOT NULL,
    "dia_semana" INTEGER,
    "dia_mes" INTEGER,
    "hora_inicio" TEXT NOT NULL,
    "duracion_horas" REAL NOT NULL,
    "tarifa_base" REAL NOT NULL,
    "descuento_recurrencia" REAL NOT NULL DEFAULT 0,
    "fecha_inicio" DATETIME NOT NULL,
    "fecha_fin" DATETIME,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" DATETIME,
    CONSTRAINT "servicios_recurrrentes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "servicios_recurrrentes_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME,
    CONSTRAINT "conversations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "conversations_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "image_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "favoritos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cliente_id" TEXT NOT NULL,
    "profesional_id" TEXT NOT NULL,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "favoritos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "favoritos_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "logros" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "icono" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "criterio" TEXT NOT NULL,
    "puntos" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "logros_usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuario_id" TEXT NOT NULL,
    "logro_id" TEXT NOT NULL,
    "obtenido_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "logros_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "logros_usuario_logro_id_fkey" FOREIGN KEY ("logro_id") REFERENCES "logros" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "professionals_availability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "professional_id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "recurrence_type" TEXT NOT NULL DEFAULT 'none',
    "recurrence_config" TEXT,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "timezone" TEXT NOT NULL DEFAULT 'America/Buenos_Aires',
    "dst_handling" TEXT NOT NULL DEFAULT 'auto',
    "meta" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "created_by" TEXT,
    CONSTRAINT "professionals_availability_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "availability_slots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "professional_id" TEXT NOT NULL,
    "availability_config_id" TEXT,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "local_start_time" TEXT NOT NULL,
    "local_end_time" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "booked_by" TEXT,
    "booked_at" DATETIME,
    "meta" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "availability_slots_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "availability_slots_availability_config_id_fkey" FOREIGN KEY ("availability_config_id") REFERENCES "professionals_availability" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "availability_slots_booked_by_fkey" FOREIGN KEY ("booked_by") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "professional_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "slot_id" TEXT,
    "availability_config_id" TEXT,
    "service_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "appointment_type" TEXT NOT NULL DEFAULT 'service',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "scheduled_start" DATETIME NOT NULL,
    "scheduled_end" DATETIME NOT NULL,
    "actual_start" DATETIME,
    "actual_end" DATETIME,
    "timezone" TEXT NOT NULL DEFAULT 'America/Buenos_Aires',
    "notes" TEXT,
    "client_notes" TEXT,
    "price" REAL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder_time" DATETIME,
    "google_event_id" TEXT,
    "ical_uid" TEXT,
    "meta" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "created_by" TEXT NOT NULL,
    "cancelled_at" DATETIME,
    "cancelled_by" TEXT,
    "cancel_reason" TEXT,
    CONSTRAINT "appointments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "availability_slots" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "appointments_availability_config_id_fkey" FOREIGN KEY ("availability_config_id") REFERENCES "professionals_availability" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "servicios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "blocked_slots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "professional_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_rule" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Buenos_Aires',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "meta" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "blocked_slots_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "concurrency_locks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resource_key" TEXT NOT NULL,
    "lock_id" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "calendar_connections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "calendar_type" TEXT NOT NULL,
    "calendar_id" TEXT NOT NULL,
    "calendar_name" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" DATETIME,
    "sync_status" TEXT NOT NULL DEFAULT 'pending',
    "meta" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "calendar_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "calendar_sync_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "connection_id" TEXT,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "local_event_id" TEXT,
    "remote_event_id" TEXT,
    "conflict_type" TEXT,
    "conflict_data" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" DATETIME,
    "resolution" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "calendar_sync_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "calendar_sync_logs_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "calendar_connections" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reputation_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuario_id" TEXT NOT NULL,
    "average_rating" REAL NOT NULL DEFAULT 0,
    "completed_jobs" INTEGER NOT NULL DEFAULT 0,
    "on_time_percentage" REAL NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "total_rating_sum" REAL NOT NULL DEFAULT 0,
    "completed_jobs_count" INTEGER NOT NULL DEFAULT 0,
    "ranking_score" REAL NOT NULL DEFAULT 0,
    "global_ranking" INTEGER,
    "last_calculated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "reputation_scores_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_medals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuario_id" TEXT NOT NULL,
    "medal_type" TEXT NOT NULL,
    "medal_name" TEXT NOT NULL,
    "medal_description" TEXT,
    "icon_url" TEXT,
    "condition_value" REAL,
    "condition_type" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "awarded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_medals_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuario_id" TEXT,
    "accion" TEXT NOT NULL,
    "entidad_tipo" TEXT NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "detalles" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "exito" BOOLEAN NOT NULL DEFAULT true,
    "error_mensaje" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "urgent_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "requested_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "urgency_level" TEXT NOT NULL DEFAULT 'high',
    "special_requirements" TEXT,
    "estimated_budget" REAL,
    "service_category" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "urgent_requests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "urgent_request_candidates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "urgent_request_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "distance" REAL NOT NULL,
    "estimated_arrival_time" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "contacted_at" DATETIME,
    "responded_at" DATETIME,
    "response_time" INTEGER,
    "proposed_price" REAL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "urgent_request_candidates_urgent_request_id_fkey" FOREIGN KEY ("urgent_request_id") REFERENCES "urgent_requests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "urgent_request_candidates_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "urgent_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "urgent_request_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "assigned_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "completion_time" INTEGER,
    "final_price" REAL,
    "notes" TEXT,
    "cancellation_reason" TEXT,
    "cancelled_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "urgent_assignments_urgent_request_id_fkey" FOREIGN KEY ("urgent_request_id") REFERENCES "urgent_requests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "urgent_assignments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "urgent_pricing_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "service_category" TEXT NOT NULL,
    "urgency_level" TEXT NOT NULL,
    "base_price" REAL NOT NULL,
    "urgency_multiplier" REAL NOT NULL DEFAULT 1.0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_token_verificacion_key" ON "usuarios"("token_verificacion");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_refresh_token_hash_key" ON "usuarios"("refresh_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_google_id_key" ON "usuarios"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_social_provider_id_key" ON "usuarios"("social_provider_id");

-- CreateIndex
CREATE INDEX "usuarios_rol_idx" ON "usuarios"("rol");

-- CreateIndex
CREATE INDEX "usuarios_esta_verificado_idx" ON "usuarios"("esta_verificado");

-- CreateIndex
CREATE INDEX "usuarios_telefono_idx" ON "usuarios"("telefono");

-- CreateIndex
CREATE INDEX "usuarios_sms_enabled_idx" ON "usuarios"("sms_enabled");

-- CreateIndex
CREATE INDEX "failed_attempts_email_idx" ON "failed_attempts"("email");

-- CreateIndex
CREATE INDEX "failed_attempts_user_id_idx" ON "failed_attempts"("user_id");

-- CreateIndex
CREATE INDEX "failed_attempts_ip_address_idx" ON "failed_attempts"("ip_address");

-- CreateIndex
CREATE INDEX "failed_attempts_attempt_time_idx" ON "failed_attempts"("attempt_time");

-- CreateIndex
CREATE INDEX "failed_attempts_blocked_until_idx" ON "failed_attempts"("blocked_until");

-- CreateIndex
CREATE INDEX "perfiles_profesionales_latitud_longitud_idx" ON "perfiles_profesionales"("latitud", "longitud");

-- CreateIndex
CREATE INDEX "perfiles_profesionales_search_vector_idx" ON "perfiles_profesionales"("search_vector");

-- CreateIndex
CREATE INDEX "perfiles_profesionales_search_vector_especialidades_idx" ON "perfiles_profesionales"("search_vector_especialidades");

-- CreateIndex
CREATE INDEX "perfiles_profesionales_especialidad_zona_cobertura_calificacion_promedio_tarifa_hora_esta_disponible_estado_verificacion_idx" ON "perfiles_profesionales"("especialidad", "zona_cobertura", "calificacion_promedio", "tarifa_hora", "esta_disponible", "estado_verificacion");

-- CreateIndex
CREATE INDEX "perfiles_profesionales_calificacion_promedio_idx" ON "perfiles_profesionales"("calificacion_promedio");

-- CreateIndex
CREATE INDEX "perfiles_profesionales_tarifa_hora_idx" ON "perfiles_profesionales"("tarifa_hora");

-- CreateIndex
CREATE INDEX "perfiles_profesionales_tipo_tarifa_idx" ON "perfiles_profesionales"("tipo_tarifa");

-- CreateIndex
CREATE INDEX "servicios_cliente_id_idx" ON "servicios"("cliente_id");

-- CreateIndex
CREATE INDEX "servicios_profesional_id_idx" ON "servicios"("profesional_id");

-- CreateIndex
CREATE INDEX "servicios_estado_idx" ON "servicios"("estado");

-- CreateIndex
CREATE INDEX "servicios_creado_en_idx" ON "servicios"("creado_en");

-- CreateIndex
CREATE INDEX "servicios_es_urgente_idx" ON "servicios"("es_urgente");

-- CreateIndex
CREATE INDEX "servicios_cliente_id_estado_idx" ON "servicios"("cliente_id", "estado");

-- CreateIndex
CREATE INDEX "servicios_profesional_id_estado_idx" ON "servicios"("profesional_id", "estado");

-- CreateIndex
CREATE INDEX "servicios_estado_creado_en_idx" ON "servicios"("estado", "creado_en");

-- CreateIndex
CREATE INDEX "servicios_es_urgente_estado_idx" ON "servicios"("es_urgente", "estado");

-- CreateIndex
CREATE INDEX "servicios_fecha_agendada_idx" ON "servicios"("fecha_agendada");

-- CreateIndex
CREATE INDEX "servicios_cliente_id_fecha_agendada_idx" ON "servicios"("cliente_id", "fecha_agendada");

-- CreateIndex
CREATE INDEX "servicios_profesional_id_fecha_agendada_idx" ON "servicios"("profesional_id", "fecha_agendada");

-- CreateIndex
CREATE UNIQUE INDEX "resenas_servicio_id_key" ON "resenas"("servicio_id");

-- CreateIndex
CREATE INDEX "resenas_servicio_id_idx" ON "resenas"("servicio_id");

-- CreateIndex
CREATE INDEX "resenas_cliente_id_idx" ON "resenas"("cliente_id");

-- CreateIndex
CREATE INDEX "resenas_creado_en_idx" ON "resenas"("creado_en");

-- CreateIndex
CREATE INDEX "resenas_calificacion_idx" ON "resenas"("calificacion");

-- CreateIndex
CREATE INDEX "resenas_cliente_id_creado_en_idx" ON "resenas"("cliente_id", "creado_en");

-- CreateIndex
CREATE INDEX "resenas_calificacion_creado_en_idx" ON "resenas"("calificacion", "creado_en");

-- CreateIndex
CREATE INDEX "mensajes_remitente_id_creado_en_idx" ON "mensajes"("remitente_id", "creado_en");

-- CreateIndex
CREATE INDEX "mensajes_destinatario_id_creado_en_idx" ON "mensajes"("destinatario_id", "creado_en");

-- CreateIndex
CREATE INDEX "mensajes_remitente_id_destinatario_id_creado_en_idx" ON "mensajes"("remitente_id", "destinatario_id", "creado_en");

-- CreateIndex
CREATE INDEX "mensajes_creado_en_idx" ON "mensajes"("creado_en");

-- CreateIndex
CREATE UNIQUE INDEX "disponibilidad_servicio_id_key" ON "disponibilidad"("servicio_id");

-- CreateIndex
CREATE INDEX "disponibilidad_profesional_id_fecha_idx" ON "disponibilidad"("profesional_id", "fecha");

-- CreateIndex
CREATE INDEX "disponibilidad_reservado_por_idx" ON "disponibilidad"("reservado_por");

-- CreateIndex
CREATE INDEX "disponibilidad_servicio_id_idx" ON "disponibilidad"("servicio_id");

-- CreateIndex
CREATE INDEX "disponibilidad_esta_disponible_fecha_idx" ON "disponibilidad"("esta_disponible", "fecha");

-- CreateIndex
CREATE INDEX "notificaciones_usuario_id_esta_leido_idx" ON "notificaciones"("usuario_id", "esta_leido");

-- CreateIndex
CREATE INDEX "notificaciones_usuario_id_prioridad_idx" ON "notificaciones"("usuario_id", "prioridad");

-- CreateIndex
CREATE INDEX "notificaciones_usuario_id_creado_en_idx" ON "notificaciones"("usuario_id", "creado_en");

-- CreateIndex
CREATE INDEX "notificaciones_tipo_subtipo_idx" ON "notificaciones"("tipo", "subtipo");

-- CreateIndex
CREATE INDEX "notificaciones_programado_para_idx" ON "notificaciones"("programado_para");

-- CreateIndex
CREATE INDEX "notificaciones_expira_en_idx" ON "notificaciones"("expira_en");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_usuario_id_key" ON "notification_preferences"("usuario_id");

-- CreateIndex
CREATE INDEX "notification_preferences_usuario_id_idx" ON "notification_preferences"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_nombre_key" ON "notification_templates"("nombre");

-- CreateIndex
CREATE INDEX "notification_templates_tipo_subtipo_idx" ON "notification_templates"("tipo", "subtipo");

-- CreateIndex
CREATE INDEX "notification_templates_activo_idx" ON "notification_templates"("activo");

-- CreateIndex
CREATE INDEX "notification_metrics_usuario_id_idx" ON "notification_metrics"("usuario_id");

-- CreateIndex
CREATE INDEX "notification_metrics_tipo_notificacion_idx" ON "notification_metrics"("tipo_notificacion");

-- CreateIndex
CREATE INDEX "notification_metrics_canal_idx" ON "notification_metrics"("canal");

-- CreateIndex
CREATE INDEX "notification_metrics_enviada_entregada_leida_idx" ON "notification_metrics"("enviada", "entregada", "leida");

-- CreateIndex
CREATE INDEX "notification_metrics_fecha_envio_idx" ON "notification_metrics"("fecha_envio");

-- CreateIndex
CREATE INDEX "cotizaciones_cliente_id_idx" ON "cotizaciones"("cliente_id");

-- CreateIndex
CREATE INDEX "cotizaciones_creado_en_idx" ON "cotizaciones"("creado_en");

-- CreateIndex
CREATE INDEX "cotizacion_respuestas_cotizacion_id_idx" ON "cotizacion_respuestas"("cotizacion_id");

-- CreateIndex
CREATE INDEX "cotizacion_respuestas_profesional_id_idx" ON "cotizacion_respuestas"("profesional_id");

-- CreateIndex
CREATE INDEX "cotizacion_respuestas_estado_idx" ON "cotizacion_respuestas"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "cotizacion_respuestas_cotizacion_id_profesional_id_key" ON "cotizacion_respuestas"("cotizacion_id", "profesional_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_requests_usuario_id_key" ON "verification_requests"("usuario_id");

-- CreateIndex
CREATE INDEX "verification_requests_usuario_id_idx" ON "verification_requests"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_servicio_id_key" ON "pagos"("servicio_id");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_mercado_pago_id_key" ON "pagos"("mercado_pago_id");

-- CreateIndex
CREATE INDEX "pagos_cliente_id_idx" ON "pagos"("cliente_id");

-- CreateIndex
CREATE INDEX "pagos_profesional_id_idx" ON "pagos"("profesional_id");

-- CreateIndex
CREATE INDEX "pagos_estado_idx" ON "pagos"("estado");

-- CreateIndex
CREATE INDEX "pagos_mercado_pago_id_idx" ON "pagos"("mercado_pago_id");

-- CreateIndex
CREATE INDEX "pagos_commission_setting_id_idx" ON "pagos"("commission_setting_id");

-- CreateIndex
CREATE INDEX "pagos_creado_en_id_idx" ON "pagos"("creado_en", "id");

-- CreateIndex
CREATE INDEX "pagos_estado_creado_en_id_idx" ON "pagos"("estado", "creado_en", "id");

-- CreateIndex
CREATE INDEX "pagos_cliente_id_creado_en_id_idx" ON "pagos"("cliente_id", "creado_en", "id");

-- CreateIndex
CREATE INDEX "pagos_profesional_id_creado_en_id_idx" ON "pagos"("profesional_id", "creado_en", "id");

-- CreateIndex
CREATE INDEX "pagos_fecha_liberacion_idx" ON "pagos"("fecha_liberacion");

-- CreateIndex
CREATE INDEX "pagos_estado_fecha_liberacion_idx" ON "pagos"("estado", "fecha_liberacion");

-- CreateIndex
CREATE INDEX "pagos_creado_en_idx" ON "pagos"("creado_en");

-- CreateIndex
CREATE INDEX "pagos_cliente_id_estado_idx" ON "pagos"("cliente_id", "estado");

-- CreateIndex
CREATE INDEX "pagos_profesional_id_estado_idx" ON "pagos"("profesional_id", "estado");

-- CreateIndex
CREATE INDEX "cuentas_bancarias_profesional_id_idx" ON "cuentas_bancarias"("profesional_id");

-- CreateIndex
CREATE INDEX "cuentas_bancarias_estado_idx" ON "cuentas_bancarias"("estado");

-- CreateIndex
CREATE INDEX "cuentas_bancarias_verificado_idx" ON "cuentas_bancarias"("verificado");

-- CreateIndex
CREATE INDEX "cuentas_bancarias_profesional_id_estado_idx" ON "cuentas_bancarias"("profesional_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_bancarias_profesional_id_numero_cuenta_encrypted_key" ON "cuentas_bancarias"("profesional_id", "numero_cuenta_encrypted");

-- CreateIndex
CREATE INDEX "retiros_profesional_id_idx" ON "retiros"("profesional_id");

-- CreateIndex
CREATE INDEX "retiros_cuenta_bancaria_id_idx" ON "retiros"("cuenta_bancaria_id");

-- CreateIndex
CREATE INDEX "retiros_estado_idx" ON "retiros"("estado");

-- CreateIndex
CREATE INDEX "retiros_fecha_solicitud_idx" ON "retiros"("fecha_solicitud");

-- CreateIndex
CREATE INDEX "retiros_profesional_id_estado_idx" ON "retiros"("profesional_id", "estado");

-- CreateIndex
CREATE INDEX "retiros_estado_fecha_solicitud_idx" ON "retiros"("estado", "fecha_solicitud");

-- CreateIndex
CREATE INDEX "commission_settings_activo_idx" ON "commission_settings"("activo");

-- CreateIndex
CREATE INDEX "commission_settings_tipo_servicio_idx" ON "commission_settings"("tipo_servicio");

-- CreateIndex
CREATE INDEX "commission_settings_activo_tipo_servicio_idx" ON "commission_settings"("activo", "tipo_servicio");

-- CreateIndex
CREATE INDEX "commission_settings_activo_tipo_servicio_fecha_creacion_idx" ON "commission_settings"("activo", "tipo_servicio", "fecha_creacion");

-- CreateIndex
CREATE INDEX "transactions_log_tipo_transaccion_idx" ON "transactions_log"("tipo_transaccion");

-- CreateIndex
CREATE INDEX "transactions_log_entidad_tipo_entidad_id_idx" ON "transactions_log"("entidad_tipo", "entidad_id");

-- CreateIndex
CREATE INDEX "transactions_log_usuario_id_idx" ON "transactions_log"("usuario_id");

-- CreateIndex
CREATE INDEX "transactions_log_timestamp_idx" ON "transactions_log"("timestamp");

-- CreateIndex
CREATE INDEX "transactions_log_exito_idx" ON "transactions_log"("exito");

-- CreateIndex
CREATE INDEX "transactions_log_tipo_transaccion_timestamp_idx" ON "transactions_log"("tipo_transaccion", "timestamp");

-- CreateIndex
CREATE INDEX "payouts_profesional_id_idx" ON "payouts"("profesional_id");

-- CreateIndex
CREATE INDEX "payouts_servicio_id_idx" ON "payouts"("servicio_id");

-- CreateIndex
CREATE INDEX "payouts_estado_idx" ON "payouts"("estado");

-- CreateIndex
CREATE INDEX "payouts_fecha_pago_idx" ON "payouts"("fecha_pago");

-- CreateIndex
CREATE INDEX "payouts_profesional_id_estado_idx" ON "payouts"("profesional_id", "estado");

-- CreateIndex
CREATE INDEX "payouts_estado_fecha_pago_idx" ON "payouts"("estado", "fecha_pago");

-- CreateIndex
CREATE INDEX "payouts_creado_en_id_idx" ON "payouts"("creado_en", "id");

-- CreateIndex
CREATE INDEX "payouts_estado_creado_en_id_idx" ON "payouts"("estado", "creado_en", "id");

-- CreateIndex
CREATE INDEX "payouts_profesional_id_creado_en_id_idx" ON "payouts"("profesional_id", "creado_en", "id");

-- CreateIndex
CREATE INDEX "servicios_recurrrentes_cliente_id_idx" ON "servicios_recurrrentes"("cliente_id");

-- CreateIndex
CREATE INDEX "servicios_recurrrentes_profesional_id_idx" ON "servicios_recurrrentes"("profesional_id");

-- CreateIndex
CREATE INDEX "servicios_recurrrentes_activo_idx" ON "servicios_recurrrentes"("activo");

-- CreateIndex
CREATE INDEX "servicios_recurrrentes_fecha_inicio_idx" ON "servicios_recurrrentes"("fecha_inicio");

-- CreateIndex
CREATE INDEX "servicios_recurrrentes_frecuencia_idx" ON "servicios_recurrrentes"("frecuencia");

-- CreateIndex
CREATE INDEX "conversations_client_id_professional_id_idx" ON "conversations"("client_id", "professional_id");

-- CreateIndex
CREATE INDEX "conversations_created_at_idx" ON "conversations"("created_at");

-- CreateIndex
CREATE INDEX "conversations_updated_desc_idx" ON "conversations"("updated_at" DESC);

-- CreateIndex
CREATE INDEX "conversations_client_updated_desc_idx" ON "conversations"("client_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "conversations_professional_updated_desc_idx" ON "conversations"("professional_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_conversation_id_id_idx" ON "messages"("conversation_id", "id" DESC);

-- CreateIndex
CREATE INDEX "messages_conversation_status_idx" ON "messages"("conversation_id", "status");

-- CreateIndex
CREATE INDEX "messages_conversation_created_desc_idx" ON "messages"("conversation_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "favoritos_cliente_id_idx" ON "favoritos"("cliente_id");

-- CreateIndex
CREATE INDEX "favoritos_profesional_id_idx" ON "favoritos"("profesional_id");

-- CreateIndex
CREATE UNIQUE INDEX "favoritos_cliente_id_profesional_id_key" ON "favoritos"("cliente_id", "profesional_id");

-- CreateIndex
CREATE INDEX "logros_categoria_idx" ON "logros"("categoria");

-- CreateIndex
CREATE INDEX "logros_activo_idx" ON "logros"("activo");

-- CreateIndex
CREATE INDEX "logros_usuario_usuario_id_idx" ON "logros_usuario"("usuario_id");

-- CreateIndex
CREATE INDEX "logros_usuario_logro_id_idx" ON "logros_usuario"("logro_id");

-- CreateIndex
CREATE UNIQUE INDEX "logros_usuario_usuario_id_logro_id_key" ON "logros_usuario"("usuario_id", "logro_id");

-- CreateIndex
CREATE INDEX "professionals_availability_professional_id_idx" ON "professionals_availability"("professional_id");

-- CreateIndex
CREATE INDEX "professionals_availability_is_active_idx" ON "professionals_availability"("is_active");

-- CreateIndex
CREATE INDEX "professionals_availability_start_date_idx" ON "professionals_availability"("start_date");

-- CreateIndex
CREATE INDEX "professionals_availability_recurrence_type_idx" ON "professionals_availability"("recurrence_type");

-- CreateIndex
CREATE INDEX "professionals_availability_professional_id_is_active_idx" ON "professionals_availability"("professional_id", "is_active");

-- CreateIndex
CREATE INDEX "professionals_availability_professional_id_start_date_end_date_idx" ON "professionals_availability"("professional_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "availability_slots_professional_id_idx" ON "availability_slots"("professional_id");

-- CreateIndex
CREATE INDEX "availability_slots_start_time_idx" ON "availability_slots"("start_time");

-- CreateIndex
CREATE INDEX "availability_slots_status_idx" ON "availability_slots"("status");

-- CreateIndex
CREATE INDEX "availability_slots_is_available_idx" ON "availability_slots"("is_available");

-- CreateIndex
CREATE INDEX "availability_slots_professional_id_start_time_idx" ON "availability_slots"("professional_id", "start_time");

-- CreateIndex
CREATE INDEX "availability_slots_professional_id_status_idx" ON "availability_slots"("professional_id", "status");

-- CreateIndex
CREATE INDEX "availability_slots_availability_config_id_idx" ON "availability_slots"("availability_config_id");

-- CreateIndex
CREATE UNIQUE INDEX "availability_slots_professional_id_start_time_key" ON "availability_slots"("professional_id", "start_time");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_slot_id_key" ON "appointments"("slot_id");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_service_id_key" ON "appointments"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_google_event_id_key" ON "appointments"("google_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_ical_uid_key" ON "appointments"("ical_uid");

-- CreateIndex
CREATE INDEX "appointments_professional_id_idx" ON "appointments"("professional_id");

-- CreateIndex
CREATE INDEX "appointments_client_id_idx" ON "appointments"("client_id");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_scheduled_start_idx" ON "appointments"("scheduled_start");

-- CreateIndex
CREATE INDEX "appointments_professional_id_scheduled_start_idx" ON "appointments"("professional_id", "scheduled_start");

-- CreateIndex
CREATE INDEX "appointments_client_id_scheduled_start_idx" ON "appointments"("client_id", "scheduled_start");

-- CreateIndex
CREATE INDEX "appointments_professional_id_status_idx" ON "appointments"("professional_id", "status");

-- CreateIndex
CREATE INDEX "appointments_client_id_status_idx" ON "appointments"("client_id", "status");

-- CreateIndex
CREATE INDEX "appointments_slot_id_idx" ON "appointments"("slot_id");

-- CreateIndex
CREATE INDEX "appointments_service_id_idx" ON "appointments"("service_id");

-- CreateIndex
CREATE INDEX "appointments_google_event_id_idx" ON "appointments"("google_event_id");

-- CreateIndex
CREATE INDEX "appointments_ical_uid_idx" ON "appointments"("ical_uid");

-- CreateIndex
CREATE INDEX "blocked_slots_professional_id_idx" ON "blocked_slots"("professional_id");

-- CreateIndex
CREATE INDEX "blocked_slots_start_time_idx" ON "blocked_slots"("start_time");

-- CreateIndex
CREATE INDEX "blocked_slots_end_time_idx" ON "blocked_slots"("end_time");

-- CreateIndex
CREATE INDEX "blocked_slots_is_active_idx" ON "blocked_slots"("is_active");

-- CreateIndex
CREATE INDEX "blocked_slots_professional_id_start_time_end_time_idx" ON "blocked_slots"("professional_id", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "blocked_slots_professional_id_is_active_idx" ON "blocked_slots"("professional_id", "is_active");

-- CreateIndex
CREATE INDEX "concurrency_locks_expires_at_idx" ON "concurrency_locks"("expires_at");

-- CreateIndex
CREATE INDEX "concurrency_locks_created_at_idx" ON "concurrency_locks"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "concurrency_locks_resource_key_key" ON "concurrency_locks"("resource_key");

-- CreateIndex
CREATE INDEX "calendar_connections_user_id_idx" ON "calendar_connections"("user_id");

-- CreateIndex
CREATE INDEX "calendar_connections_calendar_type_idx" ON "calendar_connections"("calendar_type");

-- CreateIndex
CREATE INDEX "calendar_connections_is_active_idx" ON "calendar_connections"("is_active");

-- CreateIndex
CREATE INDEX "calendar_connections_sync_status_idx" ON "calendar_connections"("sync_status");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_connections_user_id_calendar_type_calendar_id_key" ON "calendar_connections"("user_id", "calendar_type", "calendar_id");

-- CreateIndex
CREATE INDEX "calendar_sync_logs_user_id_idx" ON "calendar_sync_logs"("user_id");

-- CreateIndex
CREATE INDEX "calendar_sync_logs_connection_id_idx" ON "calendar_sync_logs"("connection_id");

-- CreateIndex
CREATE INDEX "calendar_sync_logs_operation_idx" ON "calendar_sync_logs"("operation");

-- CreateIndex
CREATE INDEX "calendar_sync_logs_status_idx" ON "calendar_sync_logs"("status");

-- CreateIndex
CREATE INDEX "calendar_sync_logs_resolved_idx" ON "calendar_sync_logs"("resolved");

-- CreateIndex
CREATE UNIQUE INDEX "reputation_scores_usuario_id_key" ON "reputation_scores"("usuario_id");

-- CreateIndex
CREATE INDEX "reputation_scores_usuario_id_idx" ON "reputation_scores"("usuario_id");

-- CreateIndex
CREATE INDEX "reputation_scores_ranking_score_idx" ON "reputation_scores"("ranking_score" DESC);

-- CreateIndex
CREATE INDEX "reputation_scores_global_ranking_idx" ON "reputation_scores"("global_ranking");

-- CreateIndex
CREATE INDEX "reputation_scores_last_calculated_idx" ON "reputation_scores"("last_calculated");

-- CreateIndex
CREATE INDEX "user_medals_usuario_id_idx" ON "user_medals"("usuario_id");

-- CreateIndex
CREATE INDEX "user_medals_medal_type_idx" ON "user_medals"("medal_type");

-- CreateIndex
CREATE INDEX "user_medals_is_active_idx" ON "user_medals"("is_active");

-- CreateIndex
CREATE INDEX "user_medals_awarded_at_idx" ON "user_medals"("awarded_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_medals_usuario_id_medal_type_key" ON "user_medals"("usuario_id", "medal_type");

-- CreateIndex
CREATE INDEX "audit_logs_usuario_id_idx" ON "audit_logs"("usuario_id");

-- CreateIndex
CREATE INDEX "audit_logs_accion_idx" ON "audit_logs"("accion");

-- CreateIndex
CREATE INDEX "audit_logs_entidad_tipo_entidad_id_idx" ON "audit_logs"("entidad_tipo", "entidad_id");

-- CreateIndex
CREATE INDEX "audit_logs_creado_en_idx" ON "audit_logs"("creado_en");

-- CreateIndex
CREATE INDEX "audit_logs_exito_idx" ON "audit_logs"("exito");

-- CreateIndex
CREATE INDEX "urgent_requests_client_id_idx" ON "urgent_requests"("client_id");

-- CreateIndex
CREATE INDEX "idx_urgent_status" ON "urgent_requests"("status");

-- CreateIndex
CREATE INDEX "urgent_requests_urgency_level_idx" ON "urgent_requests"("urgency_level");

-- CreateIndex
CREATE INDEX "urgent_requests_requested_at_idx" ON "urgent_requests"("requested_at");

-- CreateIndex
CREATE INDEX "urgent_requests_status_requested_at_idx" ON "urgent_requests"("status", "requested_at");

-- CreateIndex
CREATE INDEX "urgent_request_candidates_urgent_request_id_idx" ON "urgent_request_candidates"("urgent_request_id");

-- CreateIndex
CREATE INDEX "urgent_request_candidates_professional_id_idx" ON "urgent_request_candidates"("professional_id");

-- CreateIndex
CREATE INDEX "urgent_request_candidates_status_idx" ON "urgent_request_candidates"("status");

-- CreateIndex
CREATE INDEX "idx_urgent_candidate_distance" ON "urgent_request_candidates"("distance");

-- CreateIndex
CREATE INDEX "urgent_request_candidates_urgent_request_id_status_idx" ON "urgent_request_candidates"("urgent_request_id", "status");

-- CreateIndex
CREATE INDEX "urgent_request_candidates_professional_id_status_idx" ON "urgent_request_candidates"("professional_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "urgent_assignments_urgent_request_id_key" ON "urgent_assignments"("urgent_request_id");

-- CreateIndex
CREATE INDEX "urgent_assignments_urgent_request_id_idx" ON "urgent_assignments"("urgent_request_id");

-- CreateIndex
CREATE INDEX "urgent_assignments_professional_id_idx" ON "urgent_assignments"("professional_id");

-- CreateIndex
CREATE INDEX "urgent_assignments_status_idx" ON "urgent_assignments"("status");

-- CreateIndex
CREATE INDEX "urgent_assignments_assigned_at_idx" ON "urgent_assignments"("assigned_at");

-- CreateIndex
CREATE INDEX "urgent_assignments_professional_id_status_idx" ON "urgent_assignments"("professional_id", "status");

-- CreateIndex
CREATE INDEX "urgent_pricing_rules_service_category_idx" ON "urgent_pricing_rules"("service_category");

-- CreateIndex
CREATE INDEX "urgent_pricing_rules_urgency_level_idx" ON "urgent_pricing_rules"("urgency_level");

-- CreateIndex
CREATE INDEX "urgent_pricing_rules_active_idx" ON "urgent_pricing_rules"("active");

-- CreateIndex
CREATE UNIQUE INDEX "urgent_pricing_rules_service_category_urgency_level_key" ON "urgent_pricing_rules"("service_category", "urgency_level");
