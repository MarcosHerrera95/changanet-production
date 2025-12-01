/**
 * @archivo src/services/rateLimiterService.js - Servicio de Rate Limiting
 * @descripción Control de tasa de solicitudes para prevenir abuso
 * @impacto Seguridad y rendimiento del sistema
 */

const Redis = require('ioredis');

class RateLimiterService {
  static instance = null;

  static getInstance() {
    if (!RateLimiterService.instance) {
      RateLimiterService.instance = new RateLimiterService();
    }
    return RateLimiterService.instance;
  }

  constructor() {
    if (RateLimiterService.instance) {
      throw new Error('Use RateLimiterService.getInstance() instead of new');
    }

    // Build Redis configuration
    const redisConfig = this.buildRedisConfig();
    this.redis = new Redis(redisConfig);
    this.redisConnected = false;
    this.localStorage = new Map(); // Fallback local en memoria
    this.redisConnectionLogged = false; // Flag para evitar logs repetidos
    this.connectionAttempts = 0;
    this.maxRetries = 5;
    this.baseRetryDelay = 1000; // 1 second

    // Verificar conexión Redis con retry
    this.redis.on('connect', () => {
      this.redisConnected = true;
      this.redisConnectionLogged = false; // Reset flag on successful connection
      this.connectionAttempts = 0; // Reset attempts on success
      console.log('Redis connected for rate limiting');
    });

    this.redis.on('error', (err) => {
      this.redisConnected = false;
      if (!this.redisConnectionLogged) {
        console.warn('Redis connection failed, using local fallback for rate limiting:', err.message);
        this.redisConnectionLogged = true; // Solo loggear una vez
      }
      this.attemptReconnect();
    });

    this.redis.on('close', () => {
      this.redisConnected = false;
      this.redisConnectionLogged = false; // Reset flag on close
    });

    // Limpiar almacenamiento local periódicamente
    setInterval(() => this.cleanupLocalStorage(), 60000); // Cada minuto
  }

  buildRedisConfig() {
    if (process.env.REDIS_URL) {
      return { url: process.env.REDIS_URL };
    }

    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true, // Connect on first command
    };
  }

  async attemptReconnect() {
    if (this.connectionAttempts >= this.maxRetries) {
      if (!this.redisConnectionLogged) {
        console.error('Max Redis reconnection attempts reached, sticking with local fallback');
        this.redisConnectionLogged = true;
      }
      return;
    }

    this.connectionAttempts++;
    const delay = this.baseRetryDelay * Math.pow(2, this.connectionAttempts - 1); // Exponential backoff

    setTimeout(async () => {
      try {
        if (!this.redisConnected) {
          console.log(`Attempting Redis reconnection ${this.connectionAttempts}/${this.maxRetries} in ${delay}ms`);
          await this.redis.connect();
        }
      } catch (error) {
        // Error will be handled by the 'error' event listener
      }
    }, delay);
  }

  /**
   * Verificar límite de rate
   * @param {string} key - Clave única (ej: 'notification:userId')
   * @param {number} limit - Número máximo de operaciones
   * @param {number} windowSeconds - Ventana de tiempo en segundos
   * @returns {boolean} true si está dentro del límite
   */
  async checkLimit(key, limit, windowSeconds) {
    if (this.redisConnected) {
      try {
        const now = Date.now();
        const windowStart = now - (windowSeconds * 1000);

        // Usar Redis sorted set para mantener timestamps
        const score = now;
        const member = `${key}:${now}`;

        // Agregar timestamp actual
        await this.redis.zadd(key, score, member);

        // Remover timestamps fuera de la ventana
        await this.redis.zremrangebyscore(key, '-inf', windowStart);

        // Contar elementos en la ventana
        const count = await this.redis.zcount(key, windowStart, '+inf');

        // Establecer expiración de la key
        await this.redis.expire(key, windowSeconds);

        return count <= limit;
      } catch (error) {
        console.error('Rate limiter Redis error, falling back to local storage:', error.message);
        return this.checkLimitLocal(key, limit, windowSeconds);
      }
    } else {
      // Usar fallback local
      return this.checkLimitLocal(key, limit, windowSeconds);
    }
  }

  /**
   * Verificar límite usando almacenamiento local (fallback)
   * @param {string} key - Clave única
   * @param {number} limit - Límite máximo
   * @param {number} windowSeconds - Ventana en segundos
   * @returns {boolean} true si está dentro del límite
   */
  checkLimitLocal(key, limit, windowSeconds) {
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);

    if (!this.localStorage.has(key)) {
      this.localStorage.set(key, []);
    }

    const timestamps = this.localStorage.get(key);

    // Remover timestamps expirados
    const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);

    // Agregar timestamp actual
    validTimestamps.push(now);

    // Actualizar almacenamiento
    this.localStorage.set(key, validTimestamps);

    return validTimestamps.length <= limit;
  }

  /**
   * Obtener información de rate limit
   * @param {string} key - Clave única
   * @param {number} limit - Límite
   * @param {number} windowSeconds - Ventana
   * @returns {Object} Información del límite
   */
  async getLimitInfo(key, limit, windowSeconds) {
    if (this.redisConnected) {
      try {
        const now = Date.now();
        const windowStart = now - (windowSeconds * 1000);

        await this.redis.zremrangebyscore(key, '-inf', windowStart);
        const count = await this.redis.zcount(key, windowStart, '+inf');

        const remaining = Math.max(0, limit - count);
        const resetTime = now + (windowSeconds * 1000);

        return {
          limit,
          remaining,
          resetTime,
          current: count
        };
      } catch (error) {
        console.error('Rate limiter info Redis error, falling back to local:', error.message);
        return this.getLimitInfoLocal(key, limit, windowSeconds);
      }
    } else {
      return this.getLimitInfoLocal(key, limit, windowSeconds);
    }
  }

  /**
   * Obtener información de rate limit usando almacenamiento local
   * @param {string} key - Clave única
   * @param {number} limit - Límite
   * @param {number} windowSeconds - Ventana
   * @returns {Object} Información del límite
   */
  getLimitInfoLocal(key, limit, windowSeconds) {
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);

    const timestamps = this.localStorage.get(key) || [];
    const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);

    // Actualizar con timestamps válidos
    this.localStorage.set(key, validTimestamps);

    const current = validTimestamps.length;
    const remaining = Math.max(0, limit - current);
    const resetTime = now + (windowSeconds * 1000);

    return {
      limit,
      remaining,
      resetTime,
      current
    };
  }

  /**
   * Limpiar almacenamiento local de timestamps expirados
   */
  cleanupLocalStorage() {
    const now = Date.now();
    const maxWindow = 3600 * 1000; // 1 hora como máximo
    const cutoff = now - maxWindow;

    for (const [key, timestamps] of this.localStorage.entries()) {
      const validTimestamps = timestamps.filter(timestamp => timestamp > cutoff);
      if (validTimestamps.length === 0) {
        this.localStorage.delete(key);
      } else {
        this.localStorage.set(key, validTimestamps);
      }
    }
  }

  /**
   * Limpiar keys expiradas (mantenimiento)
   */
  async cleanup() {
    // Redis maneja la expiración automáticamente con EXPIRE
    // Este método puede usarse para limpieza manual si es necesario
    this.cleanupLocalStorage();
  }

  /**
   * Cerrar conexión Redis
   */
  async close() {
    await this.redis.quit();
  }
}

module.exports = RateLimiterService;
