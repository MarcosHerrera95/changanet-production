/**
 * Servicio de caché Redis para Changánet
 * Implementa estrategias de caché para búsquedas frecuentes y datos de alto acceso
 * Mejora rendimiento de queries repetitivas y reduce carga en base de datos
 */

const redis = require('redis'); // Librería cliente Redis para Node.js

// Variable global para almacenar instancia del cliente Redis
let redisClient = null;

// L1 Cache: In-memory cache para resultados más frecuentes
const memoryCache = new Map();
const MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutos en memoria

// Estadísticas de caché para monitoreo
const cacheStats = {
  hits: { memory: 0, redis: 0 },
  misses: { memory: 0, redis: 0 },
  sets: { memory: 0, redis: 0 }
};

/**
 * Inicializa la conexión a Redis con configuración robusta
 * Maneja fallos gracefully permitiendo funcionamiento sin caché
 */
async function initializeRedis() {
  try {
    // Verificar si Redis está configurado en variables de entorno
    if (!process.env.REDIS_HOST && !process.env.REDIS_PORT) {
      console.log('ℹ️ Redis no configurado, funcionando sin caché'); // Log informativo
      redisClient = null; // Deshabilitar caché explícitamente
      return; // Salir temprano sin error
    }

    // Crear cliente Redis con configuración completa y tolerante a fallos
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost', // Host desde env o default
      port: process.env.REDIS_PORT || 6379,        // Puerto desde env o default 6379
      password: process.env.REDIS_PASSWORD || undefined, // Password si está configurado
      // Configuración de socket para estabilidad de conexión
      socket: {
        connectTimeout: 5000,    // Timeout de conexión inicial: 5 segundos
        commandTimeout: 3000,    // Timeout por comando: 3 segundos
        lazyConnect: true,       // Conectar solo cuando se necesite
      },
      // Estrategia de reintento para manejar fallos temporales
      retry_strategy: (options) => {
        // Si conexión es rechazada, no reintentar (problema de configuración)
        if (options.error && options.error.code === 'ECONNREFUSED') {
          console.warn('Redis connection refused, skipping cache');
          return null; // No reintentar
        }
        // Si tiempo total de reintento supera 1 hora, desistir
        if (options.total_retry_time > 1000 * 60 * 60) {
          console.warn('Redis retry time exhausted, skipping cache');
          return null; // No reintentar
        }
        // Si se superan 3 intentos, desistir
        if (options.attempt > 3) {
          console.warn('Redis max attempts reached, skipping cache');
          return null; // No reintentar
        }
        // Calcular delay exponencial con máximo de 3 segundos
        return Math.min(options.attempt * 100, 3000);
      }
    });

    // Configurar manejadores de eventos para monitoreo de conexión
    redisClient.on('error', (err) => {
      console.warn('Redis Client Error (continuando sin caché):', err.message);
      redisClient = null; // Deshabilitar caché ante errores
    });

    redisClient.on('connect', () => {
      console.log('✅ Conectado a Redis'); // Log de conexión exitosa
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis listo para usar'); // Log cuando Redis está operativo
    });

    // Establecer conexión inicial
    await redisClient.connect();
  } catch (error) {
    // Capturar cualquier error durante inicialización
    console.warn('Redis no disponible, funcionando sin caché:', error.message);
    redisClient = null; // Asegurar que caché esté deshabilitado
  }
}

/**
 * Obtiene un valor del caché multi-nivel (L1 memoria -> L2 Redis)
 * @param {string} key - Clave del caché a buscar
 * @returns {Promise<string|null>} Valor almacenado o null si no existe/clave expiró
 */
async function get(key) {
  // L1: Verificar caché en memoria primero
  const memoryEntry = memoryCache.get(key);
  if (memoryEntry && Date.now() < memoryEntry.expiresAt) {
    cacheStats.hits.memory++;
    return memoryEntry.value;
  } else if (memoryEntry) {
    // Entrada expirada, remover
    memoryCache.delete(key);
  }

  // L2: Verificar Redis si memoria falló
  if (!redisClient) {
    cacheStats.misses.memory++;
    return null;
  }

  try {
    const value = await redisClient.get(key);
    if (value) {
      // Almacenar en L1 para futuras consultas
      memoryCache.set(key, {
        value,
        expiresAt: Date.now() + MEMORY_CACHE_TTL
      });
      cacheStats.hits.redis++;
      return value;
    }
    cacheStats.misses.redis++;
    return null;
  } catch (error) {
    console.warn('Error obteniendo de caché Redis:', error.message);
    cacheStats.misses.redis++;
    return null;
  }
}

/**
 * Almacena un valor en el caché multi-nivel con tiempo de expiración
 * @param {string} key - Clave única para el valor
 * @param {string} value - Valor a almacenar (debe ser string)
 * @param {number} ttlSeconds - Tiempo de vida en segundos (default: 300 = 5 minutos)
 */
async function set(key, value, ttlSeconds = 300) {
  // L1: Almacenar en memoria (TTL más corto para L1)
  const memoryTTL = Math.min(ttlSeconds, 300) * 1000; // Máximo 5 minutos en memoria
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + memoryTTL
  });
  cacheStats.sets.memory++;

  // L2: Almacenar en Redis si disponible
  if (!redisClient) return;

  try {
    await redisClient.setEx(key, ttlSeconds, value);
    cacheStats.sets.redis++;
  } catch (error) {
    console.warn('Error almacenando en caché Redis:', error.message);
  }
}

/**
 * Elimina una clave específica del caché multi-nivel
 * @param {string} key - Clave a eliminar del caché
 */
async function del(key) {
  // L1: Eliminar de memoria
  memoryCache.delete(key);

  // L2: Eliminar de Redis si disponible
  if (!redisClient) return;

  try {
    await redisClient.del(key);
  } catch (error) {
    console.warn('Error eliminando del caché Redis:', error.message);
  }
}

/**
 * Almacena resultados de búsqueda de profesionales en caché
 * @param {Object} filters - Objeto con filtros aplicados (especialidad, zona, precio, etc.)
 * @param {Array} results - Resultados paginados de la búsqueda con metadata
 */
async function cacheProfessionalSearch(filters, results) {
  // Generar clave única basada en filtros para evitar colisiones
  const cacheKey = `search:professionals:${JSON.stringify(filters)}`;
  // Almacenar por 10 minutos (búsquedas cambian frecuentemente)
  await set(cacheKey, JSON.stringify(results), 600);
}

/**
 * Recupera resultados de búsqueda de profesionales desde caché
 * @param {Object} filters - Filtros de búsqueda para generar clave de caché
 * @returns {Promise<Array|null>} Resultados cacheados o null si no existen/expiraron
 */
async function getCachedProfessionalSearch(filters) {
  // Generar misma clave que en cacheProfessionalSearch
  const cacheKey = `search:professionals:${JSON.stringify(filters)}`;
  // Intentar obtener valor del caché
  const cached = await get(cacheKey);

  if (cached) {
    try {
      // Parsear JSON almacenado de vuelta a objeto
      return JSON.parse(cached);
    } catch (error) {
      // Log si hay corrupción de datos en caché
      console.warn('Error parseando caché de búsqueda:', error.message);
      return null; // Retornar null para forzar nueva consulta
    }
  }

  return null; // No encontrado en caché
}

/**
 * Cache para perfiles de profesionales
 * @param {string} professionalId - ID del profesional
 * @param {Object} profile - Datos del perfil
 */
async function cacheProfessionalProfile(professionalId, profile) {
  const cacheKey = `profile:professional:${professionalId}`;
  await set(cacheKey, JSON.stringify(profile), 1800); // 30 minutos
}

/**
 * Obtiene perfil de profesional del caché
 * @param {string} professionalId - ID del profesional
 * @returns {Promise<Object|null>} Perfil cacheado o null
 */
async function getCachedProfessionalProfile(professionalId) {
  const cacheKey = `profile:professional:${professionalId}`;
  const cached = await get(cacheKey);

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (error) {
      console.warn('Error parseando caché de perfil:', error.message);
      return null;
    }
  }

  return null;
}

/**
 * Invalida caché de perfil de profesional
 * @param {string} professionalId - ID del profesional
 */
async function invalidateProfessionalProfile(professionalId) {
  const cacheKey = `profile:professional:${professionalId}`;
  await del(cacheKey);
}

/**
 * Cache para rankings de profesionales
 * @param {Array} rankings - Lista de rankings
 */
async function cacheProfessionalRankings(rankings) {
  const cacheKey = 'rankings:professionals';
  await set(cacheKey, JSON.stringify(rankings), 3600); // 1 hora
}

/**
 * Obtiene rankings cacheados
 * @returns {Promise<Array|null>} Rankings cacheados o null
 */
async function getCachedProfessionalRankings() {
  const cacheKey = 'rankings:professionals';
  const cached = await get(cacheKey);

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (error) {
      console.warn('Error parseando caché de rankings:', error.message);
      return null;
    }
  }

  return null;
}

/**
 * Invalida todo el caché de búsquedas
 */
async function invalidateSearchCache() {
  if (!redisClient) return;

  try {
    const keys = await redisClient.keys('search:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.warn('Error invalidando caché de búsquedas:', error.message);
  }
}

/**
 * Invalida todo el caché de rankings
 */
async function invalidateRankingsCache() {
  await del('rankings:professionals');
}

/**
 * Cache para conversaciones de usuario
 * @param {string} userId - ID del usuario
 * @param {Array} conversations - Lista de conversaciones
 */
async function cacheUserConversations(userId, conversations) {
  const cacheKey = `conversations:user:${userId}`;
  await set(cacheKey, JSON.stringify(conversations), 300); // 5 minutos
}

/**
 * Obtiene conversaciones cacheadas de usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array|null>} Conversaciones cacheadas o null
 */
async function getCachedUserConversations(userId) {
  const cacheKey = `conversations:user:${userId}`;
  const cached = await get(cacheKey);

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (error) {
      console.warn('Error parseando caché de conversaciones:', error.message);
      return null;
    }
  }

  return null;
}

/**
 * Invalida caché de conversaciones de usuario
 * @param {string} userId - ID del usuario
 */
async function invalidateUserConversations(userId) {
  const cacheKey = `conversations:user:${userId}`;
  await del(cacheKey);
}

/**
 * Cache para mensajes de conversación
 * @param {string} conversationId - ID de la conversación
 * @param {Object} messagesData - Datos de mensajes con paginación
 */
async function cacheConversationMessages(conversationId, messagesData) {
  const cacheKey = `messages:conversation:${conversationId}`;
  await set(cacheKey, JSON.stringify(messagesData), 180); // 3 minutos
}

/**
 * Obtiene mensajes cacheados de conversación
 * @param {string} conversationId - ID de la conversación
 * @returns {Promise<Object|null>} Mensajes cacheados o null
 */
async function getCachedConversationMessages(conversationId) {
  const cacheKey = `messages:conversation:${conversationId}`;
  const cached = await get(cacheKey);

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (error) {
      console.warn('Error parseando caché de mensajes:', error.message);
      return null;
    }
  }

  return null;
}

/**
 * Invalida caché de mensajes de conversación
 * @param {string} conversationId - ID de la conversación
 */
async function invalidateConversationMessages(conversationId) {
  const cacheKey = `messages:conversation:${conversationId}`;
  await del(cacheKey);
}

/**
 * Cache para métricas de dashboard de pagos
 * @param {Object} metrics - Métricas de pagos (pending, released, commissions)
 */
async function cachePaymentDashboardMetrics(metrics) {
  const cacheKey = 'dashboard:payment_metrics';
  await set(cacheKey, JSON.stringify(metrics), 300); // 5 minutos
}

/**
 * Obtiene métricas cacheadas del dashboard de pagos
 * @returns {Promise<Object|null>} Métricas cacheadas o null
 */
async function getCachedPaymentDashboardMetrics() {
  const cacheKey = 'dashboard:payment_metrics';
  const cached = await get(cacheKey);

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (error) {
      console.warn('Error parseando caché de métricas de pagos:', error.message);
      return null;
    }
  }

  return null;
}

/**
 * Invalida caché de métricas del dashboard de pagos
 */
async function invalidatePaymentDashboardMetrics() {
  const cacheKey = 'dashboard:payment_metrics';
  await del(cacheKey);
}

/**
 * Cache para métricas de comisiones
 * @param {Object} commissionMetrics - Métricas de comisiones
 */
async function cacheCommissionMetrics(commissionMetrics) {
  const cacheKey = 'dashboard:commission_metrics';
  await set(cacheKey, JSON.stringify(commissionMetrics), 600); // 10 minutos
}

/**
 * Obtiene métricas cacheadas de comisiones
 * @returns {Promise<Object|null>} Métricas de comisiones cacheadas o null
 */
async function getCachedCommissionMetrics() {
  const cacheKey = 'dashboard:commission_metrics';
  const cached = await get(cacheKey);

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (error) {
      console.warn('Error parseando caché de métricas de comisiones:', error.message);
      return null;
    }
  }

  return null;
}

/**
 * Invalida caché de métricas de comisiones
 */
async function invalidateCommissionMetrics() {
  const cacheKey = 'dashboard:commission_metrics';
  await del(cacheKey);
}

/**
 * Cache para métricas de ingresos pendientes por profesional
 * @param {string} professionalId - ID del profesional
 * @param {Object} pendingIncome - Ingresos pendientes
 */
async function cacheProfessionalPendingIncome(professionalId, pendingIncome) {
  const cacheKey = `professional:pending_income:${professionalId}`;
  await set(cacheKey, JSON.stringify(pendingIncome), 180); // 3 minutos
}

/**
 * Obtiene ingresos pendientes cacheados de profesional
 * @param {string} professionalId - ID del profesional
 * @returns {Promise<Object|null>} Ingresos pendientes cacheados o null
 */
async function getCachedProfessionalPendingIncome(professionalId) {
  const cacheKey = `professional:pending_income:${professionalId}`;
  const cached = await get(cacheKey);

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (error) {
      console.warn('Error parseando caché de ingresos pendientes:', error.message);
      return null;
    }
  }

  return null;
}

/**
 * Invalida caché de ingresos pendientes de profesional
 * @param {string} professionalId - ID del profesional
 */
async function invalidateProfessionalPendingIncome(professionalId) {
  const cacheKey = `professional:pending_income:${professionalId}`;
  await del(cacheKey);
}

/**
 * Limpia entradas expiradas del caché en memoria
 */
function cleanupMemoryCache() {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (now > entry.expiresAt) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Obtiene estadísticas del caché multi-nivel
 * @returns {Promise<Object>} Estadísticas de uso del caché
 */
async function getCacheStats() {
  // Limpiar entradas expiradas antes de reportar stats
  cleanupMemoryCache();

  const stats = {
    memory: {
      enabled: true,
      entries: memoryCache.size,
      hits: cacheStats.hits.memory,
      misses: cacheStats.misses.memory,
      sets: cacheStats.sets.memory,
      hitRate: cacheStats.hits.memory + cacheStats.misses.memory > 0 ?
        (cacheStats.hits.memory / (cacheStats.hits.memory + cacheStats.misses.memory) * 100).toFixed(2) + '%' : '0%'
    },
    redis: {
      enabled: !!redisClient
    }
  };

  if (redisClient) {
    try {
      const info = await redisClient.info();
      const keys = await redisClient.dbsize();

      stats.redis = {
        ...stats.redis,
        totalKeys: keys,
        hits: cacheStats.hits.redis,
        misses: cacheStats.misses.redis,
        sets: cacheStats.sets.redis,
        hitRate: cacheStats.hits.redis + cacheStats.misses.redis > 0 ?
          (cacheStats.hits.redis / (cacheStats.hits.redis + cacheStats.misses.redis) * 100).toFixed(2) + '%' : '0%',
        info: info.split('\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        }, {})
      };
    } catch (error) {
      stats.redis.error = error.message;
    }
  } else {
    stats.redis.message = 'Redis no disponible';
  }

  return stats;
}

/**
 * Cierra la conexión a Redis
 */
async function close() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

module.exports = {
  initializeRedis,
  get,
  set,
  del,
  cacheProfessionalSearch,
  getCachedProfessionalSearch,
  cacheProfessionalProfile,
  getCachedProfessionalProfile,
  invalidateProfessionalProfile,
  cacheProfessionalRankings,
  getCachedProfessionalRankings,
  invalidateSearchCache,
  invalidateRankingsCache,
  cacheUserConversations,
  getCachedUserConversations,
  invalidateUserConversations,
  cacheConversationMessages,
  getCachedConversationMessages,
  invalidateConversationMessages,
  cachePaymentDashboardMetrics,
  getCachedPaymentDashboardMetrics,
  invalidatePaymentDashboardMetrics,
  cacheCommissionMetrics,
  getCachedCommissionMetrics,
  invalidateCommissionMetrics,
  cacheProfessionalPendingIncome,
  getCachedProfessionalPendingIncome,
  invalidateProfessionalPendingIncome,
  getCacheStats,
  cleanupMemoryCache,
  close
};
