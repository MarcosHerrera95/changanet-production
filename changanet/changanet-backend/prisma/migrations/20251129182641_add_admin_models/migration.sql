-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "hash_contrasena" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT,
    "rol" TEXT NOT NULL DEFAULT 'moderator',
    "permisos" TEXT,
    "esta_activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_acceso" DATETIME,
    "intentos_fallidos" INTEGER NOT NULL DEFAULT 0,
    "bloqueado_hasta" DATETIME,
    "creado_por" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "icono" TEXT,
    "color" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "esta_activa" BOOLEAN NOT NULL DEFAULT true,
    "requiere_verificacion" BOOLEAN NOT NULL DEFAULT false,
    "meta" TEXT,
    "creado_por" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "subcategories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "icono" TEXT,
    "color" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "esta_activa" BOOLEAN NOT NULL DEFAULT true,
    "requiere_verificacion" BOOLEAN NOT NULL DEFAULT false,
    "precio_minimo" REAL,
    "precio_maximo" REAL,
    "precio_sugerido" REAL,
    "meta" TEXT,
    "creado_por" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" DATETIME NOT NULL,
    CONSTRAINT "subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" TEXT NOT NULL,
    "parametros" TEXT,
    "fecha_inicio" DATETIME,
    "fecha_fin" DATETIME,
    "resultado" TEXT,
    "generado_en" DATETIME,
    "expira_en" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'pending',
    "error_mensaje" TEXT,
    "generado_por" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "admin_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "admin_id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "entidad_tipo" TEXT,
    "entidad_id" TEXT,
    "descripcion" TEXT NOT NULL,
    "detalles" TEXT,
    "cambios" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "session_id" TEXT,
    "exito" BOOLEAN NOT NULL DEFAULT true,
    "error_mensaje" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_users_rol_idx" ON "admin_users"("rol");

-- CreateIndex
CREATE INDEX "admin_users_esta_activo_idx" ON "admin_users"("esta_activo");

-- CreateIndex
CREATE INDEX "admin_users_ultimo_acceso_idx" ON "admin_users"("ultimo_acceso");

-- CreateIndex
CREATE INDEX "admin_users_bloqueado_hasta_idx" ON "admin_users"("bloqueado_hasta");

-- CreateIndex
CREATE UNIQUE INDEX "categories_nombre_key" ON "categories"("nombre");

-- CreateIndex
CREATE INDEX "categories_esta_activa_idx" ON "categories"("esta_activa");

-- CreateIndex
CREATE INDEX "categories_orden_idx" ON "categories"("orden");

-- CreateIndex
CREATE INDEX "categories_requiere_verificacion_idx" ON "categories"("requiere_verificacion");

-- CreateIndex
CREATE INDEX "subcategories_category_id_idx" ON "subcategories"("category_id");

-- CreateIndex
CREATE INDEX "subcategories_esta_activa_idx" ON "subcategories"("esta_activa");

-- CreateIndex
CREATE INDEX "subcategories_orden_idx" ON "subcategories"("orden");

-- CreateIndex
CREATE INDEX "subcategories_requiere_verificacion_idx" ON "subcategories"("requiere_verificacion");

-- CreateIndex
CREATE UNIQUE INDEX "subcategories_category_id_nombre_key" ON "subcategories"("category_id", "nombre");

-- CreateIndex
CREATE INDEX "reports_tipo_idx" ON "reports"("tipo");

-- CreateIndex
CREATE INDEX "reports_estado_idx" ON "reports"("estado");

-- CreateIndex
CREATE INDEX "reports_generado_en_idx" ON "reports"("generado_en");

-- CreateIndex
CREATE INDEX "reports_expira_en_idx" ON "reports"("expira_en");

-- CreateIndex
CREATE INDEX "reports_generado_por_idx" ON "reports"("generado_por");

-- CreateIndex
CREATE INDEX "admin_logs_admin_id_idx" ON "admin_logs"("admin_id");

-- CreateIndex
CREATE INDEX "admin_logs_accion_idx" ON "admin_logs"("accion");

-- CreateIndex
CREATE INDEX "admin_logs_modulo_idx" ON "admin_logs"("modulo");

-- CreateIndex
CREATE INDEX "admin_logs_entidad_tipo_entidad_id_idx" ON "admin_logs"("entidad_tipo", "entidad_id");

-- CreateIndex
CREATE INDEX "admin_logs_creado_en_idx" ON "admin_logs"("creado_en");

-- CreateIndex
CREATE INDEX "admin_logs_exito_idx" ON "admin_logs"("exito");

-- CreateIndex
CREATE INDEX "admin_logs_ip_address_idx" ON "admin_logs"("ip_address");
