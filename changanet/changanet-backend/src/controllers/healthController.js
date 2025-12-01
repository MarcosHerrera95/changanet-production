/**
 * Controlador de health checks para Changánet
 * Verifica el estado de todos los servicios críticos
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Health check básico
 * GET /health
 */
const basicHealthCheck = async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();

    res.status(200).json({
      status: 'OK',
      timestamp,
      uptime: `${Math.floor(uptime)}s`,
      service: 'changanet-backend',
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    console.error('Error en health check básico:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
};

/**
 * Health check detallado con verificación de dependencias
 * GET /health/detailed
 */
const detailedHealthCheck = async (req, res) => {
  const checks = {
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    service: 'changanet-backend',
    version: process.env.npm_package_version || '1.0.0',
    status: 'OK',
    dependencies: {}
  };

  try {
    // Verificar base de datos
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.dependencies.database = {
        status: 'OK',
        response_time: 'N/A'
      };
    } catch (dbError) {
      checks.dependencies.database = {
        status: 'ERROR',
        error: dbError.message
      };
      checks.status = 'DEGRADED';
    }

    // Verificar Firebase Admin
    try {
      const admin = require('firebase-admin');
      if (admin.apps.length > 0) {
        checks.dependencies.firebase_admin = {
          status: 'OK',
          apps_count: admin.apps.length
        };
      } else {
        checks.dependencies.firebase_admin = {
          status: 'ERROR',
          error: 'No Firebase apps initialized'
        };
        checks.status = 'DEGRADED';
      }
    } catch (firebaseError) {
      checks.dependencies.firebase_admin = {
        status: 'ERROR',
        error: firebaseError.message
      };
      checks.status = 'DEGRADED';
    }

    // Verificar SendGrid
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    checks.dependencies.sendgrid = {
      status: sendgridApiKey ? 'OK' : 'ERROR',
      configured: !!sendgridApiKey
    };

    if (!sendgridApiKey) {
      checks.status = 'DEGRADED';
    }

    // Verificar Twilio
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    checks.dependencies.twilio = {
      status: (twilioSid && twilioToken) ? 'OK' : 'ERROR',
      configured: !!(twilioSid && twilioToken)
    };

    if (!twilioSid || !twilioToken) {
      checks.status = 'DEGRADED';
    }

    // Verificar Sentry
    const sentryDsn = process.env.SENTRY_DSN;
    checks.dependencies.sentry = {
      status: sentryDsn ? 'OK' : 'WARNING',
      configured: !!sentryDsn
    };

    // Verificar memoria
    const memUsage = process.memoryUsage();
    checks.system = {
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
      },
      cpu: process.cpuUsage(),
      platform: process.platform,
      node_version: process.version
    };

    // Verificar métricas de negocio básicas
    try {
      const userCount = await prisma.usuario.count();
      const serviceCount = await prisma.servicio.count();
      const messageCount = await prisma.mensajes.count();

      checks.business_metrics = {
        users_total: userCount,
        services_total: serviceCount,
        messages_total: messageCount
      };
    } catch (metricsError) {
      checks.business_metrics = {
        error: 'Could not fetch business metrics',
        details: metricsError.message
      };
    }

    const statusCode = checks.status === 'OK' ? 200 :
                      checks.status === 'DEGRADED' ? 206 : 503;

    res.status(statusCode).json(checks);

  } catch (error) {
    console.error('Error en health check detallado:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message,
      dependencies: checks.dependencies
    });
  }
};

/**
 * Health check de readiness (para Kubernetes)
 * GET /health/ready
 */
const readinessCheck = async (req, res) => {
  try {
    // Verificar conexión a base de datos
    await prisma.$queryRaw`SELECT 1`;

    // Verificar que los servicios críticos estén configurados
    const criticalServices = [
      process.env.FIREBASE_PROJECT_ID,
      process.env.JWT_SECRET
    ];

    const missingServices = criticalServices.filter(service => !service);

    if (missingServices.length > 0) {
      return res.status(503).json({
        status: 'NOT_READY',
        timestamp: new Date().toISOString(),
        message: 'Critical services not configured',
        missing: missingServices.length
      });
    }

    res.status(200).json({
      status: 'READY',
      timestamp: new Date().toISOString(),
      message: 'Service is ready to accept traffic'
    });

  } catch (error) {
    console.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'NOT_READY',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};

/**
 * Health check de liveness (para Kubernetes)
 * GET /health/live
 */
const livenessCheck = async (req, res) => {
  // Verificación básica de que el proceso está vivo
  const uptime = process.uptime();

  // Si el proceso lleva menos de 30 segundos vivo, podría estar iniciándose
  if (uptime < 30) {
    return res.status(503).json({
      status: 'STARTING',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime)}s`,
      message: 'Service is still starting'
    });
  }

  // Verificar que no hay errores críticos en el proceso
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

  // Si usa más de 1GB de heap, podría haber un memory leak
  if (heapUsedMB > 1024) {
    console.warn(`High memory usage detected: ${heapUsedMB.toFixed(2)}MB`);
  }

  res.status(200).json({
    status: 'ALIVE',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime)}s`,
    memory: {
      heap_used: `${heapUsedMB.toFixed(2)}MB`,
      heap_total: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`
    }
  });
};

/**
 * Endpoint para métricas de Prometheus
 * GET /metrics
 */
const metricsEndpoint = async (req, res) => {
  try {
    const { getMetrics } = require('../services/metricsService');
    const metrics = await getMetrics();

    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(metrics);
  } catch (error) {
    console.error('Error obteniendo métricas:', error);
    res.status(500).send('# Error retrieving metrics\n');
  }
};

module.exports = {
  basicHealthCheck,
  detailedHealthCheck,
  readinessCheck,
  livenessCheck,
  metricsEndpoint
};
