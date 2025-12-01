/**
 * Configuración de base de datos con soporte para sharding y escalabilidad horizontal
 * Implementa estrategias de particionamiento para manejar 100.000+ usuarios
 */

const { PrismaClient } = require('@prisma/client');

// Configuración de shards de base de datos
const SHARD_CONFIG = {
  // Shard 0: Usuarios con ID 0-99999
  shard_0: {
    url: process.env.DATABASE_URL_SHARD_0 || process.env.DATABASE_URL,
    minConnections: 2,
    maxConnections: 10
  },
  // Shard 1: Usuarios con ID 100000-199999
  shard_1: {
    url: process.env.DATABASE_URL_SHARD_1,
    minConnections: 2,
    maxConnections: 10
  },
  // Shard 2: Usuarios con ID 200000+
  shard_2: {
    url: process.env.DATABASE_URL_SHARD_2,
    minConnections: 2,
    maxConnections: 10
  }
};

// Función de sharding: determina qué shard usar basado en el ID del usuario
function getShardForUser(userId) {
  if (!userId) return 'shard_0'; // Default shard

  const id = typeof userId === 'string' ? parseInt(userId) : userId;

  if (id < 100000) return 'shard_0';
  if (id < 200000) return 'shard_1';
  return 'shard_2';
}

// Función de sharding para servicios basado en el ID del cliente
function getShardForService(serviceId, clientId) {
  return getShardForUser(clientId);
}

// Pool de conexiones Prisma por shard
const prismaPools = new Map();

// Función para obtener cliente Prisma para un shard específico
function getPrismaClient(shardName = 'shard_0') {
  if (!prismaPools.has(shardName)) {
    const config = SHARD_CONFIG[shardName];
    if (!config) {
      throw new Error(`Shard ${shardName} no configurado`);
    }

    const client = new PrismaClient({
      datasourceUrl: config.url,
      // Configuración de conexión pool
      // Nota: Prisma maneja el pool internamente, pero podemos configurar límites
    });

    prismaPools.set(shardName, client);
  }

  return prismaPools.get(shardName);
}

// Cliente principal (para operaciones globales como configuraciones)
const mainPrismaClient = new PrismaClient({
  datasourceUrl: process.env.DATABASE_MAIN_URL || process.env.DATABASE_URL
});

// Función para ejecutar queries con el shard apropiado
async function executeOnShard(operation, params = {}) {
  const { userId, clientId, serviceId, shard: forcedShard } = params;

  let shardName = forcedShard;

  if (!shardName) {
    if (userId) {
      shardName = getShardForUser(userId);
    } else if (clientId) {
      shardName = getShardForUser(clientId);
    } else if (serviceId) {
      // Para servicios, necesitaríamos buscar el cliente primero
      // Por simplicidad, asumimos que viene clientId
      shardName = 'shard_0';
    } else {
      shardName = 'shard_0'; // Default
    }
  }

  const client = getPrismaClient(shardName);

  try {
    return await operation(client);
  } catch (error) {
    console.error(`Error ejecutando operación en shard ${shardName}:`, error);
    throw error;
  }
}

// Función para ejecutar operaciones que requieren múltiples shards
async function executeCrossShard(operation) {
  const results = [];

  for (const shardName of Object.keys(SHARD_CONFIG)) {
    try {
      const client = getPrismaClient(shardName);
      const result = await operation(client, shardName);
      results.push({ shard: shardName, result, success: true });
    } catch (error) {
      results.push({ shard: shardName, error: error.message, success: false });
    }
  }

  return results;
}

// Función para migrar datos entre shards (útil para rebalanceo)
async function migrateUserData(userId, fromShard, toShard) {
  console.log(`Migrando datos del usuario ${userId} de ${fromShard} a ${toShard}`);

  // Esta sería una operación compleja que requeriría:
  // 1. Backup de datos del usuario
  // 2. Insertar en nuevo shard
  // 3. Verificar integridad
  // 4. Eliminar de shard antiguo
  // 5. Actualizar referencias

  throw new Error('Migración de datos no implementada aún');
}

// Health check para todos los shards
async function healthCheck() {
  const results = {};

  for (const [shardName, config] of Object.entries(SHARD_CONFIG)) {
    try {
      const client = getPrismaClient(shardName);
      await client.$queryRaw`SELECT 1`;
      results[shardName] = { status: 'healthy', url: config.url };
    } catch (error) {
      results[shardName] = { status: 'unhealthy', error: error.message };
    }
  }

  return results;
}

// Cleanup function para cerrar conexiones
async function closeAllConnections() {
  for (const [shardName, client] of prismaPools) {
    await client.$disconnect();
    console.log(`Conexión cerrada para shard: ${shardName}`);
  }

  await mainPrismaClient.$disconnect();
  console.log('Conexión principal cerrada');
}

module.exports = {
  getPrismaClient,
  mainPrismaClient,
  executeOnShard,
  executeCrossShard,
  getShardForUser,
  getShardForService,
  migrateUserData,
  healthCheck,
  closeAllConnections,
  SHARD_CONFIG
};
