// src/middleware/metricsMiddleware.js - Middleware para métricas HTTP
const { createHttpMetricsMiddleware } = require('../services/metricsService');

/**
 * Middleware que mide la duración de las solicitudes HTTP
 * y registra métricas automáticamente
 */
const metricsMiddleware = createHttpMetricsMiddleware();

module.exports = metricsMiddleware;
