/**
 * Servicio de colas avanzado para procesamiento asíncrono de payouts
 * Soporta Redis y RabbitMQ para alta escalabilidad y confiabilidad
 * Implementa colas prioritarias, dead letter queues y monitoreo avanzado
 */

const { initializeRedis, get: redisGet, set: redisSet } = require('./cacheService');
const amqp = require('amqplib');

let redisClient = null;
let rabbitConnection = null;
let rabbitChannel = null;

// Configuración de colas
const QUEUE_CONFIG = {
  payouts: {
    name: 'payouts_queue',
    deadLetter: 'payouts_dlq',
    retry: 'payouts_retry',
    maxRetries: 3
  },
  webhooks: {
    name: 'webhooks_queue',
    deadLetter: 'webhooks_dlq',
    retry: 'webhooks_retry',
    maxRetries: 5
  },
  reports: {
    name: 'reports_queue',
    deadLetter: 'reports_dlq',
    retry: 'reports_retry',
    maxRetries: 2
  }
};

// Estadísticas de colas
const queueStats = {
  redis: { processed: 0, failed: 0, retries: 0 },
  rabbitmq: { processed: 0, failed: 0, retries: 0 }
};

/**
 * Inicializa el sistema de colas con Redis y RabbitMQ
 */
async function initializeQueue() {
  await initializeRedis();
  // Usar el cliente del cacheService si está disponible
  redisClient = require('./cacheService').redisClient;

  // Inicializar RabbitMQ si está configurado
  await initializeRabbitMQ();
}

/**
 * Inicializa la conexión a RabbitMQ con configuración robusta
 */
async function initializeRabbitMQ() {
  try {
    const rabbitUrl = process.env.RABBITMQ_URL || process.env.CLOUDAMQP_URL;

    if (!rabbitUrl) {
      console.log('ℹ️ RabbitMQ no configurado, usando solo Redis para colas');
      return;
    }

    rabbitConnection = await amqp.connect(rabbitUrl);
    rabbitChannel = await rabbitConnection.createChannel();

    // Configurar colas con dead letter queues
    for (const [key, config] of Object.entries(QUEUE_CONFIG)) {
      // Cola principal
      await rabbitChannel.assertQueue(config.name, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': config.deadLetter
        }
      });

      // Dead letter queue
      await rabbitChannel.assertQueue(config.deadLetter, { durable: true });

      // Retry queue
      await rabbitChannel.assertQueue(config.retry, {
        durable: true,
        arguments: {
          'x-message-ttl': 60000, // 1 minuto
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': config.name
        }
      });
    }

    console.log('✅ RabbitMQ inicializado para colas avanzadas');

    // Configurar manejadores de eventos
    rabbitConnection.on('error', (err) => {
      console.error('❌ Error en conexión RabbitMQ:', err.message);
    });

    rabbitConnection.on('close', () => {
      console.warn('⚠️ Conexión RabbitMQ cerrada');
    });

  } catch (error) {
    console.warn('RabbitMQ no disponible, usando solo Redis:', error.message);
    rabbitConnection = null;
    rabbitChannel = null;
  }
}

/**
 * Agrega un payout a la cola para procesamiento asíncrono
 * @param {Object} payoutData - Datos del payout
 * @param {string} priority - Prioridad: 'high', 'normal', 'low'
 */
async function enqueuePayout(payoutData, priority = 'normal') {
  const queueType = 'payouts';

  // Intentar RabbitMQ primero (más robusto para producción)
  if (rabbitChannel && QUEUE_CONFIG[queueType]) {
    try {
      const message = JSON.stringify({
        ...payoutData,
        priority,
        enqueuedAt: new Date().toISOString(),
        retryCount: 0
      });

      // Usar routing key basado en prioridad
      const routingKey = priority === 'high' ? `${QUEUE_CONFIG[queueType].name}.high` : QUEUE_CONFIG[queueType].name;

      await rabbitChannel.sendToQueue(QUEUE_CONFIG[queueType].name, Buffer.from(message), {
        persistent: true,
        priority: priority === 'high' ? 10 : priority === 'low' ? 1 : 5,
        messageId: payoutData.id,
        timestamp: Date.now()
      });

      console.log(`🐰 Payout encolado en RabbitMQ (${priority}): ${payoutData.id}`);
      return;
    } catch (error) {
      console.warn('Error encolando en RabbitMQ, intentando Redis:', error.message);
    }
  }

  // Fallback a Redis
  if (!redisClient) {
    console.warn('Ni Redis ni RabbitMQ disponibles, procesando payout de forma síncrona');
    await processPayout(payoutData);
    return;
  }

  try {
    const queueKey = `queue:payouts:${priority}`;
    await redisClient.lPush(queueKey, JSON.stringify({
      ...payoutData,
      priority,
      enqueuedAt: new Date().toISOString()
    }));
    console.log(`💰 Payout encolado en Redis (${priority}): ${payoutData.id}`);
  } catch (error) {
    console.error('Error encolando payout en Redis:', error);
    // Fallback: procesar inmediatamente
    await processPayout(payoutData);
  }
}

/**
 * Agrega un webhook a la cola para procesamiento asíncrono
 * @param {Object} webhookData - Datos del webhook
 */
async function enqueueWebhook(webhookData) {
  const queueType = 'webhooks';

  if (rabbitChannel && QUEUE_CONFIG[queueType]) {
    try {
      const message = JSON.stringify({
        ...webhookData,
        enqueuedAt: new Date().toISOString(),
        retryCount: 0
      });

      await rabbitChannel.sendToQueue(QUEUE_CONFIG[queueType].name, Buffer.from(message), {
        persistent: true,
        messageId: `webhook_${Date.now()}`,
        timestamp: Date.now()
      });

      console.log(`🐰 Webhook encolado en RabbitMQ: ${webhookData.type}`);
      return;
    } catch (error) {
      console.warn('Error encolando webhook en RabbitMQ:', error.message);
    }
  }

  // Fallback a Redis
  if (redisClient) {
    try {
      const queueKey = 'queue:webhooks';
      await redisClient.lPush(queueKey, JSON.stringify({
        ...webhookData,
        enqueuedAt: new Date().toISOString()
      }));
      console.log(`💳 Webhook encolado en Redis: ${webhookData.type}`);
    } catch (error) {
      console.error('Error encolando webhook en Redis:', error);
    }
  }
}

/**
 * Agrega un reporte a la cola para procesamiento asíncrono
 * @param {Object} reportData - Datos del reporte
 */
async function enqueueReport(reportData) {
  const queueType = 'reports';

  if (rabbitChannel && QUEUE_CONFIG[queueType]) {
    try {
      const message = JSON.stringify({
        ...reportData,
        enqueuedAt: new Date().toISOString(),
        retryCount: 0
      });

      await rabbitChannel.sendToQueue(QUEUE_CONFIG[queueType].name, Buffer.from(message), {
        persistent: true,
        messageId: `report_${Date.now()}`,
        timestamp: Date.now()
      });

      console.log(`🐰 Reporte encolado en RabbitMQ: ${reportData.type}`);
      return;
    } catch (error) {
      console.warn('Error encolando reporte en RabbitMQ:', error.message);
    }
  }

  // Fallback a Redis
  if (redisClient) {
    try {
      const queueKey = 'queue:reports';
      await redisClient.lPush(queueKey, JSON.stringify({
        ...reportData,
        enqueuedAt: new Date().toISOString()
      }));
      console.log(`📊 Reporte encolado en Redis: ${reportData.type}`);
    } catch (error) {
      console.error('Error encolando reporte en Redis:', error);
    }
  }
}

/**
 * Procesa payouts de la cola con soporte para Redis y RabbitMQ
 */
async function processPayoutQueue() {
  // Procesar RabbitMQ primero (prioridad alta)
  if (rabbitChannel && QUEUE_CONFIG.payouts) {
    try {
      const message = await rabbitChannel.get(QUEUE_CONFIG.payouts.name, { noAck: false });

      if (message) {
        const payoutData = JSON.parse(message.content.toString());

        try {
          await processPayout(payoutData);
          rabbitChannel.ack(message);
          queueStats.rabbitmq.processed++;
          console.log(`✅ Payout procesado desde RabbitMQ: ${payoutData.id}`);
        } catch (error) {
          console.error(`Error procesando payout ${payoutData.id}:`, error);

          // Lógica de reintento
          payoutData.retryCount = (payoutData.retryCount || 0) + 1;

          if (payoutData.retryCount < QUEUE_CONFIG.payouts.maxRetries) {
            // Reencolar para reintento
            await rabbitChannel.sendToQueue(QUEUE_CONFIG.payouts.retry, Buffer.from(JSON.stringify(payoutData)), {
              persistent: true,
              messageId: payoutData.id
            });
            queueStats.rabbitmq.retries++;
          } else {
            // Mover a dead letter queue
            await rabbitChannel.sendToQueue(QUEUE_CONFIG.payouts.deadLetter, Buffer.from(JSON.stringify(payoutData)), {
              persistent: true,
              messageId: payoutData.id
            });
            queueStats.rabbitmq.failed++;
          }

          rabbitChannel.ack(message);
        }
      }
    } catch (error) {
      console.error('Error procesando cola RabbitMQ de payouts:', error);
    }
  }

  // Procesar Redis como fallback o para colas prioritarias
  if (!redisClient) return;

  // Procesar diferentes prioridades
  const priorities = ['high', 'normal', 'low'];
  for (const priority of priorities) {
    try {
      const queueKey = `queue:payouts:${priority}`;
      const payoutData = await redisClient.rPop(queueKey);

      if (payoutData) {
        const payout = JSON.parse(payoutData);

        try {
          await processPayout(payout);
          queueStats.redis.processed++;
          console.log(`✅ Payout procesado desde Redis (${priority}): ${payout.id}`);
        } catch (error) {
          console.error(`Error procesando payout ${payout.id}:`, error);
          queueStats.redis.failed++;

          // Reencolar con backoff exponencial
          const retryCount = (payout.retryCount || 0) + 1;
          if (retryCount < 3) {
            setTimeout(async () => {
              payout.retryCount = retryCount;
              await redisClient.lPush(queueKey, JSON.stringify(payout));
              queueStats.redis.retries++;
            }, Math.pow(2, retryCount) * 1000); // Backoff exponencial
          }
        }
        break; // Procesar solo uno por llamada para no bloquear
      }
    } catch (error) {
      console.error(`Error procesando cola Redis de payouts (${priority}):`, error);
    }
  }
}

/**
 * Procesa un payout individual
 * @param {Object} payoutData - Datos del payout
 */
async function processPayout(payoutData) {
  try {
    const { createPayout } = require('./payoutService');

    // Crear el registro de payout
    const payout = await createPayout(
      payoutData.professionalId,
      payoutData.serviceId,
      payoutData.grossAmount,
      payoutData.commissionAmount,
      payoutData.netAmount,
      payoutData.paymentMethod || 'bank_transfer'
    );

    // Aquí se podría integrar con servicios bancarios externos
    // Por ahora, solo registramos el payout

    console.log(`✅ Payout procesado: ${payout.id} - Monto: $${payoutData.netAmount}`);

    // Notificar al profesional
    const { createNotification } = require('./notificationService');
    await createNotification(
      payoutData.professionalId,
      'payout_processed',
      `Tu payout por $${payoutData.netAmount} ha sido procesado exitosamente.`,
      { payoutId: payout.id, amount: payoutData.netAmount }
    );

  } catch (error) {
    console.error('Error procesando payout:', error);

    // Marcar payout como fallido en la base de datos si existe
    if (payoutData.id) {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.payouts.update({
        where: { id: payoutData.id },
        data: { estado: 'fallido' }
      });
    }
  }
}

/**
 * Procesa webhooks de la cola
 */
async function processWebhookQueue() {
  if (rabbitChannel && QUEUE_CONFIG.webhooks) {
    try {
      const message = await rabbitChannel.get(QUEUE_CONFIG.webhooks.name, { noAck: false });

      if (message) {
        const webhookData = JSON.parse(message.content.toString());

        try {
          await processWebhook(webhookData);
          rabbitChannel.ack(message);
          queueStats.rabbitmq.processed++;
          console.log(`✅ Webhook procesado desde RabbitMQ: ${webhookData.type}`);
        } catch (error) {
          console.error(`Error procesando webhook:`, error);
          webhookData.retryCount = (webhookData.retryCount || 0) + 1;

          if (webhookData.retryCount < QUEUE_CONFIG.webhooks.maxRetries) {
            await rabbitChannel.sendToQueue(QUEUE_CONFIG.webhooks.retry, Buffer.from(JSON.stringify(webhookData)), {
              persistent: true
            });
            queueStats.rabbitmq.retries++;
          } else {
            await rabbitChannel.sendToQueue(QUEUE_CONFIG.webhooks.deadLetter, Buffer.from(JSON.stringify(webhookData)), {
              persistent: true
            });
            queueStats.rabbitmq.failed++;
          }

          rabbitChannel.ack(message);
        }
      }
    } catch (error) {
      console.error('Error procesando cola RabbitMQ de webhooks:', error);
    }
  }

  // Fallback a Redis
  if (redisClient) {
    try {
      const queueKey = 'queue:webhooks';
      const webhookData = await redisClient.rPop(queueKey);

      if (webhookData) {
        const webhook = JSON.parse(webhookData);

        try {
          await processWebhook(webhook);
          queueStats.redis.processed++;
          console.log(`✅ Webhook procesado desde Redis: ${webhook.type}`);
        } catch (error) {
          console.error('Error procesando webhook:', error);
          queueStats.redis.failed++;
        }
      }
    } catch (error) {
      console.error('Error procesando cola Redis de webhooks:', error);
    }
  }
}

/**
 * Procesa reportes de la cola
 */
async function processReportQueue() {
  if (rabbitChannel && QUEUE_CONFIG.reports) {
    try {
      const message = await rabbitChannel.get(QUEUE_CONFIG.reports.name, { noAck: false });

      if (message) {
        const reportData = JSON.parse(message.content.toString());

        try {
          await processReport(reportData);
          rabbitChannel.ack(message);
          queueStats.rabbitmq.processed++;
          console.log(`✅ Reporte procesado desde RabbitMQ: ${reportData.type}`);
        } catch (error) {
          console.error(`Error procesando reporte:`, error);
          reportData.retryCount = (reportData.retryCount || 0) + 1;

          if (reportData.retryCount < QUEUE_CONFIG.reports.maxRetries) {
            await rabbitChannel.sendToQueue(QUEUE_CONFIG.reports.retry, Buffer.from(JSON.stringify(reportData)), {
              persistent: true
            });
            queueStats.rabbitmq.retries++;
          } else {
            await rabbitChannel.sendToQueue(QUEUE_CONFIG.reports.deadLetter, Buffer.from(JSON.stringify(reportData)), {
              persistent: true
            });
            queueStats.rabbitmq.failed++;
          }

          rabbitChannel.ack(message);
        }
      }
    } catch (error) {
      console.error('Error procesando cola RabbitMQ de reportes:', error);
    }
  }

  // Fallback a Redis
  if (redisClient) {
    try {
      const queueKey = 'queue:reports';
      const reportData = await redisClient.rPop(queueKey);

      if (reportData) {
        const report = JSON.parse(reportData);

        try {
          await processReport(report);
          queueStats.redis.processed++;
          console.log(`✅ Reporte procesado desde Redis: ${report.type}`);
        } catch (error) {
          console.error('Error procesando reporte:', error);
          queueStats.redis.failed++;
        }
      }
    } catch (error) {
      console.error('Error procesando cola Redis de reportes:', error);
    }
  }
}

/**
 * Función auxiliar para procesar webhooks
 */
async function processWebhook(webhookData) {
  // Implementar lógica de procesamiento de webhooks
  console.log(`Procesando webhook: ${webhookData.type}`, webhookData);
  // Aquí iría la lógica específica del webhook
}

/**
 * Función auxiliar para procesar reportes
 */
async function processReport(reportData) {
  // Implementar lógica de procesamiento de reportes
  console.log(`Procesando reporte: ${reportData.type}`, reportData);
  // Aquí iría la lógica específica del reporte
}

/**
 * Inicia el worker de procesamiento de colas
 */
function startQueueWorker() {
  if (!redisClient && !rabbitChannel) {
    console.log('Ni Redis ni RabbitMQ disponibles, worker de colas no iniciado');
    return;
  }

  // Procesar colas cada intervalo
  const interval = setInterval(async () => {
    await processPayoutQueue();
    await processWebhookQueue();
    await processReportQueue();
  }, 2000); // Procesar cada 2 segundos

  console.log('🚀 Worker avanzado de colas iniciado (Redis + RabbitMQ)');

  // Cleanup on exit
  process.on('SIGINT', async () => {
    clearInterval(interval);
    if (rabbitChannel) await rabbitChannel.close();
    if (rabbitConnection) await rabbitConnection.close();
    process.exit(0);
  });
}

/**
 * Obtiene estadísticas de la cola
 */
async function getQueueStats() {
  if (!redisClient) {
    return { redis: false, queueLength: 0 };
  }

  try {
    const queueLength = await redisClient.lLen('queue:payouts');
    return {
      redis: true,
      queueLength,
      processing: await redisClient.exists('processing:payouts')
    };
  } catch (error) {
    return { redis: true, error: error.message };
  }
}

module.exports = {
  initializeQueue,
  enqueuePayout,
  enqueueWebhook,
  enqueueReport,
  processPayoutQueue,
  processWebhookQueue,
  processReportQueue,
  startQueueWorker,
  getQueueStats,
  getQueueStatsAdvanced: () => queueStats
};
