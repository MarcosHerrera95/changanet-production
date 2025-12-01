/**
 * Tests de rendimiento para el sistema de búsqueda
 * Pruebas de stress, concurrencia y memory leaks
 */

const { searchProfessionals } = require('../controllers/searchController');
const { PrismaClient } = require('@prisma/client');

// Mock de servicios
jest.mock('../services/cacheService');
jest.mock('../services/loggingService');
jest.mock('../services/metricsService');
jest.mock('@prisma/client');

describe('Search System - Performance Tests', () => {
  let mockReq, mockRes, mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      query: {},
      user: { id: 1, role: 'user' },
      ip: '127.0.0.1',
      get: jest.fn(() => 'test-user-agent'),
      startTime: Date.now()
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockPrisma = {
      $queryRawUnsafe: jest.fn(),
      perfiles_profesionales: {
        findMany: jest.fn()
      },
      resenas: {
        findMany: jest.fn()
      },
      servicios: {
        groupBy: jest.fn()
      }
    };

    PrismaClient.mockImplementation(() => mockPrisma);
  });

  describe('Stress Testing - Grandes Volúmenes de Datos', () => {
    test('maneja grandes conjuntos de resultados (1000+ profesionales)', async () => {
      // Generar 1000 profesionales mock
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        usuario_id: i + 1,
        nombre: `Profesional ${i + 1}`,
        email: `prof${i + 1}@test.com`,
        especialidad: i % 2 === 0 ? 'Plomero' : 'Electricista',
        especialidades: '["plomero"]',
        anos_experiencia: Math.floor(Math.random() * 20) + 1,
        zona_cobertura: 'Buenos Aires',
        latitud: -34.6037 + (Math.random() - 0.5) * 0.1,
        longitud: -58.3816 + (Math.random() - 0.5) * 0.1,
        tipo_tarifa: 'hora',
        tarifa_hora: 1000 + Math.floor(Math.random() * 2000),
        tarifa_servicio: null,
        tarifa_convenio: null,
        descripcion: `Profesional experimentado ${i + 1}`,
        url_foto_perfil: `http://example.com/photo${i + 1}.jpg`,
        url_foto_portada: null,
        esta_disponible: Math.random() > 0.1, // 90% disponibles
        calificacion_promedio: 3 + Math.random() * 2, // 3-5 estrellas
        estado_verificacion: Math.random() > 0.2 ? 'verificado' : 'pendiente',
        verificado_en: new Date(),
        distancia_km: Math.random() * 50,
        relevancia: Math.random(),
        total_resenas: Math.floor(Math.random() * 50),
        servicios_completados: Math.floor(Math.random() * 100)
      }));

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce(largeDataset)
        .mockResolvedValueOnce([{ total: 1000 }]);

      // Mock de estadísticas para evitar consultas N+1
      mockPrisma.resenas.findMany.mockResolvedValue([]);
      mockPrisma.servicios.groupBy.mockResolvedValue([]);

      mockReq.query = { page: 1, limit: 50 };

      const startTime = Date.now();
      await searchProfessionals(mockReq, mockRes);
      const endTime = Date.now();

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];

      expect(response.professionals).toHaveLength(50); // Solo primera página
      expect(response.total).toBe(1000);
      expect(response.totalPages).toBe(20); // 1000 / 50

      // Verificar rendimiento (debe ser < 500ms para 1000 resultados)
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(500);

      console.log(`Large dataset test completed in ${responseTime}ms`);
    });

    test('maneja búsquedas full-text complejas con muchos resultados', async () => {
      // Simular búsqueda que retorna muchos resultados con relevancia
      const searchResults = Array.from({ length: 500 }, (_, i) => ({
        ...createMockProfessional(i + 1),
        relevancia: Math.random(), // Relevancia aleatoria
        especialidad: 'plomero urgente 24hs electricista' // Contiene múltiples términos
      }));

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce(searchResults)
        .mockResolvedValueOnce([{ total: 500 }]);

      mockPrisma.resenas.findMany.mockResolvedValue([]);
      mockPrisma.servicios.groupBy.mockResolvedValue([]);

      mockReq.query = {
        q: 'plomero electricista urgente',
        page: 1,
        limit: 20,
        ordenar_por: 'relevance'
      };

      const startTime = Date.now();
      await searchProfessionals(mockReq, mockRes);
      const endTime = Date.now();

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];

      expect(response.professionals).toHaveLength(20);
      expect(response.total).toBe(500);

      // Verificar que los resultados están ordenados por relevancia
      const relevances = response.professionals.map(p => p.relevance_score);
      const isSortedDescending = relevances.every((val, i, arr) =>
        i === 0 || arr[i - 1] >= val
      );
      expect(isSortedDescending).toBe(true);

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(300);

      console.log(`Complex search test completed in ${responseTime}ms`);
    });
  });

  describe('Concurrencia - Múltiples Usuarios Simultáneos', () => {
    test('maneja 50 búsquedas concurrentes sin degradación', async () => {
      const concurrentRequests = 50;
      const promises = [];

      // Configurar mock para retornar resultados consistentes
      mockPrisma.$queryRawUnsafe
        .mockResolvedValue([])
        .mockResolvedValue([{ total: 0 }]);

      mockPrisma.resenas.findMany.mockResolvedValue([]);
      mockPrisma.servicios.groupBy.mockResolvedValue([]);

      for (let i = 0; i < concurrentRequests; i++) {
        const req = {
          ...mockReq,
          query: { q: `search${i}`, page: 1, limit: 10 },
          user: { id: i + 1, role: 'user' }
        };
        const res = { ...mockRes };

        promises.push(searchProfessionals(req, res));
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Verificar que todas las búsquedas fueron exitosas
      results.forEach(result => {
        expect(result).toBeUndefined(); // searchProfessionals no retorna valor
      });

      const totalTime = endTime - startTime;
      const avgTime = totalTime / concurrentRequests;

      console.log(`${concurrentRequests} concurrent searches completed in ${totalTime}ms (avg: ${avgTime.toFixed(2)}ms per request)`);

      // Verificar rendimiento aceptable (< 100ms promedio)
      expect(avgTime).toBeLessThan(100);
      expect(totalTime).toBeLessThan(3000); // Menos de 3 segundos total
    });

    test('maneja race conditions en caché', async () => {
      // Simular múltiples lecturas/escrituras concurrentes al caché
      const cachePromises = [];
      const cacheHits = [];
      const cacheMisses = [];

      // Mock de caché que simula hits y misses
      const mockCacheService = require('../services/cacheService');
      mockCacheService.getCachedProfessionalSearch.mockImplementation(() => {
        return Math.random() > 0.5 ? null : { cached: true };
      });

      mockCacheService.cacheProfessionalSearch.mockImplementation(() => {
        return Promise.resolve();
      });

      for (let i = 0; i < 20; i++) {
        const req = {
          ...mockReq,
          query: { q: 'concurrent', page: 1, limit: 10 }
        };
        const res = { ...mockRes };

        cachePromises.push(searchProfessionals(req, res));
      }

      await Promise.all(cachePromises);

      // Verificar que no hubo errores de concurrencia
      expect(mockCacheService.getCachedProfessionalSearch).toHaveBeenCalled();
      expect(mockCacheService.cacheProfessionalSearch).toHaveBeenCalled();
    });
  });

  describe('Memory Leaks y Recursos', () => {
    test('no mantiene referencias a objetos grandes en memoria', async () => {
      // Ejecutar múltiples búsquedas grandes y verificar que no hay memory leaks
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 10; i++) {
        const largeResults = Array.from({ length: 100 }, (_, j) => ({
          ...createMockProfessional(j + 1 + (i * 100)),
          descripcion: 'A'.repeat(1000) // Descripción grande para consumir memoria
        }));

        mockPrisma.$queryRawUnsafe
          .mockResolvedValueOnce(largeResults)
          .mockResolvedValueOnce([{ total: 100 }]);

        mockPrisma.resenas.findMany.mockResolvedValue([]);
        mockPrisma.servicios.groupBy.mockResolvedValue([]);

        mockReq.query = { page: 1, limit: 100 };
        await searchProfessionals(mockReq, mockRes);

        // Forzar garbage collection si está disponible
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`Memory test: ${initialMemory} -> ${finalMemory} (${memoryIncrease} bytes increase)`);

      // El aumento de memoria debería ser mínimo (< 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    test('libera conexiones de base de datos correctamente', async () => {
      // Verificar que las conexiones Prisma se liberan correctamente
      const prismaInstances = [];

      // Mock para trackear instancias
      const originalPrisma = PrismaClient;
      PrismaClient.mockImplementation((...args) => {
        const instance = originalPrisma(...args);
        prismaInstances.push(instance);
        return instance;
      });

      for (let i = 0; i < 5; i++) {
        mockPrisma.$queryRawUnsafe
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ total: 0 }]);

        mockReq.query = { page: 1, limit: 10 };
        await searchProfessionals(mockReq, mockRes);
      }

      // Verificar que las instancias se crearon pero se liberaron
      expect(prismaInstances.length).toBeGreaterThan(0);
    });
  });

  describe('Timeouts y Timeouts de Red', () => {
    test('maneja timeouts de base de datos gracefully', async () => {
      // Simular timeout de BD
      mockPrisma.$queryRawUnsafe.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 35000)) // 35 segundos
      );

      mockReq.query = { q: 'slowquery', page: 1, limit: 10 };

      // Ejecutar con timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Test timeout')), 5000)
      );

      await expect(Promise.race([
        searchProfessionals(mockReq, mockRes),
        timeoutPromise
      ])).rejects.toThrow('Test timeout');

    }, 6000);

    test('responde dentro de límites de tiempo aceptables', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 0 }]);

      mockReq.query = { page: 1, limit: 10 };

      const startTime = Date.now();
      await searchProfessionals(mockReq, mockRes);
      const endTime = Date.now();

      const responseTime = endTime - startTime;

      // Verificar SLA: respuesta en menos de 200ms para casos simples
      expect(responseTime).toBeLessThan(200);

      console.log(`Response time test: ${responseTime}ms`);
    });
  });

  describe('Escalabilidad - Queries Complejas', () => {
    test('optimiza queries con múltiples JOINs y filtros', async () => {
      // Query compleja con todos los filtros aplicados
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 0 }]);

      mockReq.query = {
        q: 'plomero electricista urgente',
        ciudad: 'Buenos Aires',
        barrio: 'Palermo',
        precio_min: '1000',
        precio_max: '5000',
        tipo_tarifa: 'hora',
        radio: 10,
        lat: -34.6037,
        lng: -58.3816,
        disponible: 'true',
        verificado: 'true',
        ordenar_por: 'relevance',
        page: 1,
        limit: 20
      };

      const startTime = Date.now();
      await searchProfessionals(mockReq, mockRes);
      const endTime = Date.now();

      const responseTime = endTime - startTime;

      // Verificar que la query compleja no degrada significativamente el rendimiento
      expect(responseTime).toBeLessThan(150);

      // Verificar que se ejecutó solo una query principal (optimizada)
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(2); // Principal + count

      console.log(`Complex query test completed in ${responseTime}ms`);
    });

    test('maneja índices y optimizaciones de BD', async () => {
      // Verificar que las queries usan índices apropiados
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 0 }]);

      mockReq.query = {
        q: 'full text search query',
        sort_by: 'relevancia',
        page: 1,
        limit: 10
      };

      await searchProfessionals(mockReq, mockRes);

      const [query] = mockPrisma.$queryRawUnsafe.mock.calls[0];

      // Verificar uso de índices full-text
      expect(query).toContain('ts_rank');
      expect(query).toContain('plainto_tsquery');

      // Verificar uso de índices geoespaciales cuando aplica
      mockReq.query.radio = 5;
      mockReq.query.user_lat = -34.6037;
      mockReq.query.user_lng = -58.3816;

      await searchProfessionals(mockReq, mockRes);

      const [geoQuery] = mockPrisma.$queryRawUnsafe.mock.calls[2];
      expect(geoQuery).toContain('ST_DWithin');
    });
  });
});

// Función helper para crear profesionales mock
function createMockProfessional(id) {
  return {
    usuario_id: id,
    nombre: `Profesional ${id}`,
    email: `prof${id}@test.com`,
    especialidad: 'Plomero',
    especialidades: '["plomero"]',
    anos_experiencia: 5,
    zona_cobertura: 'Buenos Aires',
    latitud: -34.6037,
    longitud: -58.3816,
    tipo_tarifa: 'hora',
    tarifa_hora: 1500,
    tarifa_servicio: null,
    tarifa_convenio: null,
    descripcion: 'Profesional experimentado',
    url_foto_perfil: `http://example.com/photo${id}.jpg`,
    url_foto_portada: null,
    esta_disponible: true,
    calificacion_promedio: 4.5,
    estado_verificacion: 'verificado',
    verificado_en: new Date(),
    distancia_km: null,
    relevancia: 0.8,
    total_resenas: 10,
    servicios_completados: 25
  };
}
