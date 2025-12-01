# Configuración de Grafana para Changánet

## 🚀 Inicio Rápido

Para iniciar Grafana y Prometheus con Docker:

```bash
cd changanet
docker-compose up -d prometheus grafana
```

## 📊 Acceso a Grafana

- **URL**: http://localhost:3000
- **Usuario**: admin
- **Contraseña**: admin

## 📈 Dashboard de Changánet

El dashboard incluye métricas de:

- **Usuarios Totales**: Número total de usuarios registrados
- **Servicios Completados**: Servicios finalizados exitosamente
- **SMS Enviados**: Notificaciones SMS enviadas
- **Tiempo de Respuesta HTTP**: Latencia de las APIs
- **Usuarios Activos**: Usuarios conectados actualmente
- **Errores de Negocio**: Errores por tipo y componente
- **Actividad Triple Impacto**: Métricas de impacto social/económico/ambiental


## 📊 Métricas Disponibles

Todas las métricas están disponibles en `/api/metrics` con formato Prometheus.

### Métricas Principales

- `changanet_users_total{rol, origen}`: Usuarios registrados
- `changanet_services_completed_total`: Servicios completados
- `changanet_sms_total{estado, tipo}`: SMS enviados
- `changanet_http_request_duration_seconds`: Latencia HTTP
- `changanet_active_users{rol}`: Usuarios activos
- `changanet_business_errors_total{tipo, componente}`: Errores
- `changanet_triple_impact_activities_total{tipo_impacto, categoria}`: Impacto

## 🔍 Monitoreo

### Prometheus
- **URL**: http://localhost:9090
- **Targets**: Backend Changánet en `/api/metrics`

### Grafana
- **Data Source**: Prometheus configurado automáticamente
- **Dashboard**: Changánet metrics cargado por defecto

## 🛠️ Desarrollo

Para desarrollo local:

1. Iniciar servicios de monitoreo:
   ```bash
   docker-compose up -d
   ```

2. Ver métricas en tiempo real:
   - Grafana: http://localhost:3000
   - Prometheus: http://localhost:9090

3. Configurar servicios de pago en modo sandbox para testing

## 📚 Documentación Adicional

- [Prometheus Metrics](https://prometheus.io/docs/concepts/metric_types/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
