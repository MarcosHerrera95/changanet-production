/**
 * Tests unitarios para cacheService.js
 * Verifica el funcionamiento del caché Redis y manejo de fallos
 */

const cacheService = require('../../../src/services/cacheService');

jest.mock('redis', () => ({
  createClient: jest.fn()
}));

describe('Cache Service - Unit Tests', () => {
  let mockRedisClient;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock del cliente Redis
    mockRedisClient = {
      get: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      dbsize: jest.fn(),
      info: jest.fn(),
      connect: jest.fn(),
      on: jest.fn(),
      quit: jest.fn()
    };

    // Mock de createClient para devolver nuestro mock
    require('redis').createClient.mockReturnValue(mockRedisClient);

    // Reset del estado del servicio
    cacheService.redisClient = null;
  });

  afterEach(async () => {
    await cacheService.close();
  });

  describe('initializeRedis', () => {
    test('should initialize Redis when HOST and PORT are provided', async () => {
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';

      mockRedisClient.connect.mockResolvedValue();

      await cacheService.initializeRedis();

      expect(require('redis').createClient).toHaveBeenCalledWith({
        host: 'localhost',
        port: '6379',
        password: undefined,
        socket: {
          connectTimeout: 5000,
          commandTimeout: 3000,
          lazyConnect: true,
        },
        retry_strategy: expect.any(Function)
      });

      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    test('should skip Redis initialization when not configured', async () => {
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;

      await cacheService.initializeRedis();

      expect(require('redis').createClient).not.toHaveBeenCalled();
      expect(cacheService.redisClient).toBeNull();
    });

    test('should handle Redis connection errors gracefully', async () => {
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      require('redis').createClient.mockImplementation(() => {
        throw new Error('Redis connection failed');
      });

      await cacheService.initializeRedis();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Redis no disponible, funcionando sin caché:',
        'Redis connection failed'
      );
      expect(cacheService.redisClient).toBeNull();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
      mockRedisClient.connect.mockResolvedValue();
      await cacheService.initializeRedis();
    });

    test('should return cached value when Redis is available', async () => {
      mockRedisClient.get.mockResolvedValue('cached-value');

      const result = await cacheService.get('test-key');

      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
      expect(result).toBe('cached-value');
    });

    test('should return null when Redis is not available', async () => {
      cacheService.redisClient = null;

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    test('should handle Redis errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.get('test-key');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Error obteniendo de caché:', 'Redis error');
      expect(result).toBeNull();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
      mockRedisClient.connect.mockResolvedValue();
      await cacheService.initializeRedis();
    });

    test('should set value with default TTL when Redis is available', async () => {
      mockRedisClient.setEx.mockResolvedValue();

      await cacheService.set('test-key', 'test-value');

      expect(mockRedisClient.setEx).toHaveBeenCalledWith('test-key', 300, 'test-value');
    });

    test('should set value with custom TTL', async () => {
      mockRedisClient.setEx.mockResolvedValue();

      await cacheService.set('test-key', 'test-value', 600);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith('test-key', 600, 'test-value');
    });

    test('should skip when Redis is not available', async () => {
      cacheService.redisClient = null;

      await cacheService.set('test-key', 'test-value');

      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    test('should handle Redis errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockRedisClient.setEx.mockRejectedValue(new Error('Redis error'));

      await cacheService.set('test-key', 'test-value');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Error almacenando en caché:', 'Redis error');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('cacheProfessionalSearch', () => {
    beforeEach(async () => {
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
      mockRedisClient.connect.mockResolvedValue();
      mockRedisClient.setEx.mockResolvedValue();
      await cacheService.initializeRedis();
    });

    test('should cache professional search results', async () => {
      const filters = { specialty: 'electricista', location: 'Buenos Aires' };
      const results = [{ id: 1, name: 'Juan Pérez' }];

      await cacheService.cacheProfessionalSearch(filters, results);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'search:professionals:{"specialty":"electricista","location":"Buenos Aires"}',
        600,
        JSON.stringify(results)
      );
    });
  });

  describe('getCachedProfessionalSearch', () => {
    beforeEach(async () => {
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
      mockRedisClient.connect.mockResolvedValue();
      await cacheService.initializeRedis();
    });

    test('should return parsed cached results', async () => {
      const filters = { specialty: 'electricista' };
      const cachedData = JSON.stringify([{ id: 1, name: 'Juan Pérez' }]);

      mockRedisClient.get.mockResolvedValue(cachedData);

      const result = await cacheService.getCachedProfessionalSearch(filters);

      expect(result).toEqual([{ id: 1, name: 'Juan Pérez' }]);
      expect(mockRedisClient.get).toHaveBeenCalledWith('search:professionals:{"specialty":"electricista"}');
    });

    test('should return null when no cached data', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheService.getCachedProfessionalSearch({ specialty: 'electricista' });

      expect(result).toBeNull();
    });

    test('should handle invalid JSON in cache', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockRedisClient.get.mockResolvedValue('invalid-json');

      const result = await cacheService.getCachedProfessionalSearch({ specialty: 'electricista' });

      expect(consoleWarnSpy).toHaveBeenCalledWith('Error parseando caché de búsqueda:', expect.any(Error));
      expect(result).toBeNull();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('del', () => {
    beforeEach(async () => {
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
      mockRedisClient.connect.mockResolvedValue();
      await cacheService.initializeRedis();
    });

    test('should delete key when Redis is available', async () => {
      mockRedisClient.del.mockResolvedValue();

      await cacheService.del('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });

    test('should skip when Redis is not available', async () => {
      cacheService.redisClient = null;

      await cacheService.del('test-key');

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    test('should handle Redis errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));

      await cacheService.del('test-key');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Error eliminando del caché:', 'Redis error');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('getCacheStats', () => {
    test('should return disabled status when Redis is not available', async () => {
      cacheService.redisClient = null;

      const stats = await cacheService.getCacheStats();

      expect(stats).toEqual({
        redis: false,
        message: 'Redis no disponible'
      });
    });

    test('should return cache statistics when Redis is available', async () => {
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
      mockRedisClient.connect.mockResolvedValue();
      mockRedisClient.dbsize.mockResolvedValue(150);
      mockRedisClient.info.mockResolvedValue('key1:value1\nkey2:value2');

      await cacheService.initializeRedis();

      const stats = await cacheService.getCacheStats();

      expect(stats).toEqual({
        redis: true,
        totalKeys: 150,
        info: {
          key1: 'value1',
          key2: 'value2'
        }
      });
    });

    test('should handle Redis errors in stats', async () => {
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
      mockRedisClient.connect.mockResolvedValue();
      mockRedisClient.dbsize.mockRejectedValue(new Error('Redis error'));

      await cacheService.initializeRedis();

      const stats = await cacheService.getCacheStats();

      expect(stats).toEqual({
        redis: false,
        error: 'Redis error'
      });
    });
  });

  describe('close', () => {
    test('should close Redis connection when available', async () => {
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
      mockRedisClient.connect.mockResolvedValue();
      mockRedisClient.quit.mockResolvedValue();

      await cacheService.initializeRedis();
      await cacheService.close();

      expect(mockRedisClient.quit).toHaveBeenCalled();
      expect(cacheService.redisClient).toBeNull();
    });

    test('should handle close when Redis is not available', async () => {
      cacheService.redisClient = null;

      await cacheService.close();

      expect(cacheService.redisClient).toBeNull();
    });
  });
});
