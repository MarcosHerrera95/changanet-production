/**
 * Servicio de Monitoreo de Queries - Changánet
 * Monitorea queries lentas y genera alertas para optimización
 */

class QueryMonitorService {
  constructor() {
    this.slowQueries = [];
    this.queryMetrics = new Map();
    this.SLOW_QUERY_THRESHOLD = 1000; // 1 segundo
    this.MAX_SLOW_QUERIES = 100; // Mantener máximo 100 queries lentas
  }

  /**
   * Middleware para monitorear queries de Prisma
   */
  getMiddleware() {
    return async (params, next) => {
      const startTime = Date.now();

      try {
        const result = await next(params);
        const duration = Date.now() - startTime;

        // Registrar métrica de la query
        this.recordQueryMetric(params, duration);

        // Alertar si es lenta
        if (duration > this.SLOW_QUERY_THRESHOLD) {
          this.recordSlowQuery(params, duration);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`Query Error [${duration}ms]:`, {
          model: params.model,
          action: params.action,
          args: params.args,
          error: error.message
        });
        throw error;
      }
    };
  }

  /**
   * Registra métricas de una query
   */
  recordQueryMetric(params, duration) {
    const key = `${params.model}.${params.action}`;

    if (!this.queryMetrics.has(key)) {
      this.queryMetrics.set(key, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        maxTime: 0,
        minTime: Infinity
      });
    }

    const metric = this.queryMetrics.get(key);
    metric.count++;
    metric.totalTime += duration;
    metric.avgTime = metric.totalTime / metric.count;
    metric.maxTime = Math.max(metric.maxTime, duration);
    metric.minTime = Math.min(metric.minTime, duration);
  }

  /**
   * Registra una query lenta
   */
  recordSlowQuery(params, duration) {
    const slowQuery = {
      timestamp: new Date().toISOString(),
      model: params.model,
      action: params.action,
      duration,
      args: this.sanitizeArgs(params.args),
      stack: new Error().stack.split('\n').slice(3, 8).join('\n') // Stack trace limitado
    };

    this.slowQueries.unshift(slowQuery);

    // Mantener máximo de queries lentas
    if (this.slowQueries.length > this.MAX_SLOW_QUERIES) {
      this.slowQueries = this.slowQueries.slice(0, this.MAX_SLOW_QUERIES);
    }

    // Log inmediato para desarrollo
    console.warn(`🐌 SLOW QUERY [${duration}ms]: ${params.model}.${params.action}`);

    // En producción, enviar a servicio de monitoreo
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(slowQuery);
    }
  }

  /**
   * Sanitiza argumentos sensibles antes de logging
   */
  sanitizeArgs(args) {
    if (!args) return args;

    const sanitized = { ...args };

    // Remover datos sensibles
    if (sanitized.data) {
      const data = { ...sanitized.data };
      if (data.hash_contrasena) data.hash_contrasena = '[REDACTED]';
      if (data.password) data.password = '[REDACTED]';
      sanitized.data = data;
    }

    // Limitar tamaño de arrays/objetos grandes
    const maxLength = 100;
    const stringifySafe = (obj) => {
      try {
        const str = JSON.stringify(obj);
        return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
      } catch {
        return '[COMPLEX_OBJECT]';
      }
    };

    return stringifySafe(sanitized);
  }

  /**
   * Envía alertas a servicio de monitoreo (Sentry, DataDog, etc.)
   */
  sendToMonitoring(slowQuery) {
    try {
      // Integración con Sentry
      if (typeof window !== 'undefined' && window.Sentry) {
        window.Sentry.captureMessage(`Slow Query: ${slowQuery.model}.${slowQuery.action}`, {
          level: 'warning',
          tags: {
            component: 'database',
            type: 'slow_query',
            model: slowQuery.model,
            action: slowQuery.action
          },
          extra: {
            duration: slowQuery.duration,
            args: slowQuery.args,
            stack: slowQuery.stack
          }
        });
      }

      // Aquí se podría integrar con DataDog, New Relic, etc.
      console.log('📊 Slow query sent to monitoring service');

    } catch (error) {
      console.error('Error sending to monitoring service:', error);
    }
  }

  /**
   * Obtiene métricas de rendimiento
   */
  getMetrics() {
    return {
      slowQueries: this.slowQueries,
      queryMetrics: Object.fromEntries(this.queryMetrics),
      summary: {
        totalSlowQueries: this.slowQueries.length,
        threshold: this.SLOW_QUERY_THRESHOLD,
        monitoredQueries: this.queryMetrics.size
      }
    };
  }

  /**
   * Resetea métricas (útil para testing)
   */
  reset() {
    this.slowQueries = [];
    this.queryMetrics.clear();
  }

  /**
   * Endpoint para dashboard de métricas
   */
  getMetricsEndpoint() {
    return (req, res) => {
      res.json({
        ...this.getMetrics(),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    };
  }
}

// Singleton instance
const queryMonitor = new QueryMonitorService();

module.exports = queryMonitor;
