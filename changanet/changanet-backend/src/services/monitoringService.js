/**
 * @archivo src/services/monitoringService.js - Servicio de Monitoreo y Métricas
 * @descripción Métricas de negocio y monitoreo para notificaciones
 * @impacto Observabilidad y rendimiento del sistema
 */

const { collectDefaultMetrics, register, Gauge, Counter, Histogram } = require('prom-client');

// Métricas de negocio para notificaciones
const notificationsSent = new Counter({
  name: 'changanet_notifications_sent_total',
  help: 'Total number of notifications sent',
  labelNames: ['type', 'channel', 'priority']
});

const notificationsDelivered = new Counter({
  name: 'changanet_notifications_delivered_total',
  help: 'Total number of notifications delivered',
  labelNames: ['type', 'channel']
});

const notificationsRead = new Counter({
  name: 'changanet_notifications_read_total',
  help: 'Total number of notifications read',
  labelNames: ['type', 'priority']
});

const websocketConnections = new Gauge({
  name: 'changanet_websocket_connections_active',
  help: 'Number of active WebSocket connections'
});

const notificationLatency = new Histogram({
  name: 'changanet_notification_processing_duration_seconds',
  help: 'Time taken to process notifications',
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

// Métricas de rate limiting
const rateLimitHits = new Counter({
  name: 'changanet_rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint', 'user_id']
});

const rateLimitExceeded = new Counter({
  name: 'changanet_rate_limit_exceeded_total',
  help: 'Total number of rate limit exceeded events',
  labelNames: ['endpoint', 'user_id']
});

// Métricas de caché
const cacheHits = new Counter({
  name: 'changanet_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type']
});

const cacheMisses = new Counter({
  name: 'changanet_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type']
});

class MonitoringService {
  constructor() {
    // Métricas por defecto de Node.js
    collectDefaultMetrics({ register });
  }

  // Notificaciones
  recordNotificationSent(type, channel, priority) {
    notificationsSent.inc({ type, channel, priority });
  }

  recordNotificationDelivered(type, channel) {
    notificationsDelivered.inc({ type, channel });
  }

  recordNotificationRead(type, priority) {
    notificationsRead.inc({ type, priority });
  }

  // WebSocket
  setWebSocketConnections(count) {
    websocketConnections.set(count);
  }

  // Latencia
  startNotificationTimer() {
    return notificationLatency.startTimer();
  }

  // Rate limiting
  recordRateLimitHit(endpoint, userId) {
    rateLimitHits.inc({ endpoint, user_id: userId });
  }

  recordRateLimitExceeded(endpoint, userId) {
    rateLimitExceeded.inc({ endpoint, user_id: userId });
  }

  // Caché
  recordCacheHit(cacheType) {
    cacheHits.inc({ cache_type: cacheType });
  }

  recordCacheMiss(cacheType) {
    cacheMisses.inc({ cache_type: cacheType });
  }

  // Obtener todas las métricas
  async getMetrics() {
    return register.metrics();
  }

  // Health check
  async getHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    };
  }

  // Estadísticas detalladas
  async getDetailedStats() {
    const metrics = await register.getMetricsAsJSON();

    return {
      notifications: {
        sent: this.getMetricValue(metrics, 'changanet_notifications_sent_total'),
        delivered: this.getMetricValue(metrics, 'changanet_notifications_delivered_total'),
        read: this.getMetricValue(metrics, 'changanet_notifications_read_total')
      },
      websocket: {
        connections: this.getMetricValue(metrics, 'changanet_websocket_connections_active')
      },
      rateLimiting: {
        hits: this.getMetricValue(metrics, 'changanet_rate_limit_hits_total'),
        exceeded: this.getMetricValue(metrics, 'changanet_rate_limit_exceeded_total')
      },
      cache: {
        hits: this.getMetricValue(metrics, 'changanet_cache_hits_total'),
        misses: this.getMetricValue(metrics, 'changanet_cache_misses_total')
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };
  }

  // Helper para extraer valores de métricas
  getMetricValue(metrics, name) {
    const metric = metrics.find(m => m.name === name);
    if (!metric) return 0;

    if (metric.type === 'counter' || metric.type === 'gauge') {
      return metric.values?.reduce((sum, v) => sum + v.value, 0) || 0;
    }

    return 0;
  }

  // Reset metrics (para testing)
  resetMetrics() {
    // En producción, esto podría no ser necesario
    console.log('Resetting monitoring metrics');
  }
}

module.exports = new MonitoringService();
