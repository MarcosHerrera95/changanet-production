// src/routes/metricsRoutes.js - Rutas para exponer métricas de Prometheus
const express = require('express');
const { getMetrics } = require('../services/metricsService');
const queryMonitor = require('../services/queryMonitorService');

const router = express.Router();

/**
 * GET /api/metrics
 * Endpoint público para que Prometheus recolecte métricas
 * Devuelve métricas en formato Prometheus (text/plain)
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await getMetrics();

    // Configurar headers para formato Prometheus
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.set('Content-Length', Buffer.byteLength(metrics, 'utf8'));

    // Enviar métricas
    res.status(200).send(metrics);
  } catch (error) {
    console.error('Error al obtener métricas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /api/metrics/health
 * Endpoint de salud para verificar que el servicio de métricas funciona
 */
router.get('/metrics/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'metrics',
    timestamp: new Date().toISOString(),
    message: 'Servicio de métricas funcionando correctamente'
  });
});

/**
 * GET /api/metrics/queries
 * Endpoint para obtener métricas de queries de base de datos
 * Incluye queries lentas y estadísticas de rendimiento
 */
router.get('/metrics/queries', queryMonitor.getMetricsEndpoint());

module.exports = router;
