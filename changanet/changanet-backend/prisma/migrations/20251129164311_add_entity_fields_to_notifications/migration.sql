-- AlterTable
ALTER TABLE "notificaciones" ADD COLUMN "entity_id" TEXT;
ALTER TABLE "notificaciones" ADD COLUMN "entity_type" TEXT;

-- CreateIndex
CREATE INDEX "notificaciones_entity_type_entity_id_idx" ON "notificaciones"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "notificaciones_usuario_id_entity_type_entity_id_idx" ON "notificaciones"("usuario_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "notificaciones_usuario_id_tipo_esta_leido_idx" ON "notificaciones"("usuario_id", "tipo", "esta_leido");

-- CreateIndex
CREATE INDEX "notificaciones_usuario_id_creado_en_esta_leido_idx" ON "notificaciones"("usuario_id", "creado_en", "esta_leido");

-- CreateIndex
CREATE INDEX "notificaciones_expira_en_esta_leido_idx" ON "notificaciones"("expira_en", "esta_leido");

-- CreateIndex
CREATE INDEX "notification_metrics_usuario_id_fecha_envio_idx" ON "notification_metrics"("usuario_id", "fecha_envio");

-- CreateIndex
CREATE INDEX "notification_metrics_canal_fecha_envio_idx" ON "notification_metrics"("canal", "fecha_envio");

-- CreateIndex
CREATE INDEX "notification_metrics_tipo_notificacion_canal_fecha_envio_idx" ON "notification_metrics"("tipo_notificacion", "canal", "fecha_envio");
