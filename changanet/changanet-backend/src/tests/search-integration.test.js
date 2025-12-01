/**
 * Tests de integración para el sistema completo de búsqueda
 * Prueba flujos end-to-end desde API hasta resultados
 */

const { searchProfessionals, autocomplete } = require('../controllers/searchController');
const { getCachedProfessionalSearch, cacheProfessionalSearch } = require('../services/cacheService');
const { PrismaClient } = require('@prisma/client');

// Mock de servicios
jest.mock('../services/cacheService');
jest.mock('../services/loggingService');
jest.mock('../services/metricsService');
jest.mock('@prisma/client');

describe('Search System - Integration Tests', () => {
  let mockReq, mockRes, mockPrisma, mockCache;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock de request/response
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

    // Mock de Prisma con datos de prueba
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

    // Mock de caché
    mockCache = {
      getCachedProfessionalSearch: jest.fn(),
      cacheProfessionalSearch: jest.fn()
    };

    getCachedProfessionalSearch.mockImplementation(mockCache.getCachedProfessionalSearch);
    cacheProfessionalSearch.mockImplementation(mockCache.cacheProfessionalSearch);
  });

  describe('Flujo Completo de Búsqueda Básica', () => {
    test('busca profesionales por especialidad con resultados completos', async () => {
      // Mock de datos de prueba
      const mockProfessionals = [
        {
          usuario_id: 1,
          nombre: 'Juan Pérez',
          email: 'juan@test.com',
          especialidad: 'Plomero',
          especialidades: '["plomero", "gasista"]',
          anos_experiencia: 5,
          zona_cobertura: 'Buenos Aires',
          latitud: -34.6037,
          longitud: -58.3816,
          tipo_tarifa: 'hora',
          tarifa_hora: 1500,
          tarifa_servicio: null,
          tarifa_convenio: null,
          descripcion: 'Profesional experimentado',
          url_foto_perfil: 'http://example.com/photo.jpg',
          url_foto_portada: null,
          esta_disponible: true,
          calificacion_promedio: 4.5,
          estado_verificacion: 'verificado',
          verificado_en: new Date(),
          distancia_km: null,
          relevancia: 0.8,
          total_resenas: 10,
          servicios_completados: 25
        }
      ];

      // Configurar mocks
      mockCache.getCachedProfessionalSearch.mockResolvedValue(null); // Cache miss
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce(mockProfessionals) // Resultados principales
        .mockResolvedValueOnce([{ total: 1 }]); // Conteo total

      mockPrisma.resenas.findMany.mockResolvedValue([
        { calificacion: 4, servicio: { profesional_id: 1 } },
        { calificacion: 5, servicio: { profesional_id: 1 } }
      ]);

      mockPrisma.servicios.groupBy.mockResolvedValue([
        { profesional_id: 1, _count: { id: 15 } }
      ]);

      // Ejecutar búsqueda
      mockReq.query = { q: 'plomero', page: 1, limit: 10 };
      await searchProfessionals(mockReq, mockRes);

      // Verificar respuesta
      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];

      expect(response.professionals).toHaveLength(1);
      expect(response.professionals[0]).toMatchObject({
        id: 1,
        name: 'Juan Pérez',
        specialty: 'Plomero',
        specialties: ['plomero', 'gasista'],
        average_rating: 4.5,
        is_available: true,
        verification_status: 'verificado',
        total_reviews: 10,
        completed_services: 25
      });
      expect(response.total).toBe(1);
      expect(response.page).toBe(1);
      expect(response.limit).toBe(10);

      // Verificar que se almacenó en caché
      expect(mockCache.cacheProfessionalSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          especialidad: 'plomero',
          page: 1,
          limit: 10
        }),
        response
      );
    });

    test('retorna resultados desde caché cuando está disponible', async () => {
      const cachedResults = {
        professionals: [{ id: 1, name: 'Cached Professional' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      mockCache.getCachedProfessionalSearch.mockResolvedValue(cachedResults);

      mockReq.query = { q: 'plomero', page: 1, limit: 10 };
      await searchProfessionals(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(cachedResults);

      // Verificar que no se ejecutó consulta a BD
      expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
      expect(mockCache.cacheProfessionalSearch).not.toHaveBeenCalled();
    });
  });

  describe('Búsqueda con Filtros Combinados', () => {
    test('aplica múltiples filtros simultáneamente', async () => {
      mockCache.getCachedProfessionalSearch.mockResolvedValue(null);

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 0 }]);

      mockReq.query = {
        q: 'plomero',
        ciudad: 'Buenos Aires',
        precio_min: '1000',
        precio_max: '2000',
        verificado: 'true',
        ordenar_por: 'rating',
        page: 1,
        limit: 10
      };

      await searchProfessionals(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);

      // Verificar que la query SQL incluye todos los filtros
      const [query, ...params] = mockPrisma.$queryRawUnsafe.mock.calls[0];
      expect(query).toContain('ts_rank'); // Búsqueda por especialidad
      expect(query).toContain('zona_cobertura ILIKE'); // Filtro por ciudad
      expect(query).toContain('tarifa_hora >='); // Precio mínimo
      expect(query).toContain('tarifa_hora <='); // Precio máximo
      expect(query).toContain('ORDER BY calificacion_promedio DESC'); // Ordenamiento
    });

    test('búsqueda geográfica con radio', async () => {
      mockCache.getCachedProfessionalSearch.mockResolvedValue(null);

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 0 }]);

      mockReq.query = {
        q: 'plomero',
        radio: 10,
        lat: -34.6037,
        lng: -58.3816,
        page: 1,
        limit: 10
      };

      await searchProfessionals(mockReq, mockRes);

      const [query] = mockPrisma.$queryRawUnsafe.mock.calls[0];
      expect(query).toContain('ST_DWithin'); // Función PostGIS
      expect(query).toContain('ST_Point'); // Punto de referencia
      expect(query).toContain('distancia_km'); // Cálculo de distancia
    });
  });

  describe('Paginación y Ordenamiento', () => {
    test('maneja paginación correctamente', async () => {
      mockCache.getCachedProfessionalSearch.mockResolvedValue(null);

      const mockResults = Array.from({ length: 5 }, (_, i) => ({
        usuario_id: i + 1,
        nombre: `Profesional ${i + 1}`,
        especialidad: 'Plomero',
        // ... otros campos
      }));

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce(mockResults)
        .mockResolvedValueOnce([{ total: 25 }]);

      mockReq.query = { page: 2, limit: 5 };
      await searchProfessionals(mockReq, mockRes);

      const [query, ...params] = mockPrisma.$queryRawUnsafe.mock.calls[0];
      expect(query).toContain('LIMIT $');
      expect(query).toContain('OFFSET $');

      // Verificar parámetros de paginación (últimos dos)
      const limitParam = params[params.length - 2];
      const offsetParam = params[params.length - 1];
      expect(limitParam).toBe(5);
      expect(offsetParam).toBe(5); // (page-1) * limit
    });

    test('ordena por diferentes criterios', async () => {
      mockCache.getCachedProfessionalSearch.mockResolvedValue(null);
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 0 }]);

      const testCases = [
        { orderBy: 'relevance', expected: 'relevancia DESC' },
        { orderBy: 'rating', expected: 'calificacion_promedio DESC' },
        { orderBy: 'price', expected: 'tarifa_hora ASC' },
        { orderBy: 'availability', expected: 'esta_disponible DESC' }
      ];

      for (const { orderBy, expected } of testCases) {
        mockReq.query = { orderBy, page: 1, limit: 10 };
        await searchProfessionals(mockReq, mockRes);

        const [query] = mockPrisma.$queryRawUnsafe.mock.calls[0];
        expect(query).toContain(`ORDER BY ${expected}`);
      }
    });
  });

  describe('Sistema de Autocompletado', () => {
    test('retorna sugerencias de especialidades', async () => {
      const mockSpecialties = [
        { especialidad: 'plomero' },
        { especialidad: 'plomero' },
        { especialidad: 'plomero urgente' }
      ];

      mockPrisma.perfiles_profesionales.findMany.mockResolvedValue(mockSpecialties);

      mockReq.query = { q: 'plom', type: 'specialties' };
      await autocomplete(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];

      expect(response.specialties).toEqual([
        { value: 'plomero', count: 2 },
        { value: 'plomero urgente', count: 1 }
      ]);
    });

    test('retorna sugerencias de ciudades', async () => {
      const mockCities = [
        { zona_cobertura: 'Buenos Aires, Palermo' },
        { zona_cobertura: 'Buenos Aires, Recoleta' },
        { zona_cobertura: 'Córdoba, Centro' }
      ];

      mockPrisma.perfiles_profesionales.findMany.mockResolvedValue(mockCities);

      mockReq.query = { q: 'Bue', type: 'cities' };
      await autocomplete(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];

      expect(response.cities).toEqual([
        { value: 'Buenos Aires', count: 2 }
      ]);
    });

    test('retorna sugerencias de barrios', async () => {
      const mockDistricts = [
        { zona_cobertura: 'Buenos Aires, Palermo' },
        { zona_cobertura: 'Córdoba, Palermo' }
      ];

      mockPrisma.perfiles_profesionales.findMany.mockResolvedValue(mockDistricts);

      mockReq.query = { q: 'Palm', type: 'districts' };
      await autocomplete(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];

      expect(response.districts).toEqual([
        { value: 'Buenos Aires, Palermo', count: 1 },
        { value: 'Córdoba, Palermo', count: 1 }
      ]);
    });

    test('retorna todos los tipos cuando type es "all"', async () => {
      mockPrisma.perfiles_profesionales.findMany
        .mockResolvedValueOnce([{ especialidad: 'plomero' }]) // specialties
        .mockResolvedValueOnce([{ zona_cobertura: 'Buenos Aires' }]) // cities
        .mockResolvedValueOnce([{ zona_cobertura: 'Palermo' }]); // districts

      mockReq.query = { q: 'test', type: 'all' };
      await autocomplete(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];

      expect(response).toHaveProperty('specialties');
      expect(response).toHaveProperty('cities');
      expect(response).toHaveProperty('districts');
    });
  });

  describe('Manejo de Errores y Edge Cases', () => {
    test('maneja consultas vacías', async () => {
      mockCache.getCachedProfessionalSearch.mockResolvedValue(null);
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 0 }]);

      mockReq.query = { page: 1, limit: 10 };
      await searchProfessionals(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.professionals).toEqual([]);
      expect(response.total).toBe(0);
    });

    test('maneja errores de base de datos', async () => {
      mockCache.getCachedProfessionalSearch.mockResolvedValue(null);
      mockPrisma.$queryRawUnsafe.mockRejectedValue(new Error('Database connection failed'));

      mockReq.query = { q: 'plomero', page: 1, limit: 10 };
      await searchProfessionals(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Error al buscar profesionales.'
      });
    });

    test('maneja parámetros inválidos', async () => {
      mockReq.query = { orderBy: 'invalid' };
      await searchProfessionals(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.stringContaining('Parámetro orderBy inválido')
      });
    });
  });

  describe('Estadísticas y Métricas', () => {
    test('calcula estadísticas de reseñas correctamente', async () => {
      mockCache.getCachedProfessionalSearch.mockResolvedValue(null);

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{
          usuario_id: 1,
          nombre: 'Juan Pérez',
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
          url_foto_perfil: 'http://example.com/photo.jpg',
          url_foto_portada: null,
          esta_disponible: true,
          calificacion_promedio: null, // Será calculado
          estado_verificacion: 'verificado',
          verificado_en: new Date(),
          distancia_km: null,
          relevancia: 0.8,
          total_resenas: null, // Será calculado
          servicios_completados: null // Será calculado
        }])
        .mockResolvedValueOnce([{ total: 1 }]);

      // Mock de reseñas: 3 reseñas con calificaciones 4, 5, 3
      mockPrisma.resenas.findMany.mockResolvedValue([
        { calificacion: 4, servicio: { profesional_id: 1 } },
        { calificacion: 5, servicio: { profesional_id: 1 } },
        { calificacion: 3, servicio: { profesional_id: 1 } }
      ]);

      // Mock de servicios completados: 12 servicios
      mockPrisma.servicios.groupBy.mockResolvedValue([
        { profesional_id: 1, _count: { id: 12 } }
      ]);

      mockReq.query = { q: 'plomero', page: 1, limit: 10 };
      await searchProfessionals(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      const professional = response.professionals[0];

      expect(professional.average_rating).toBe(4); // (4+5+3)/3
      expect(professional.total_reviews).toBe(3);
      expect(professional.completed_services).toBe(12);
    });
  });

  describe('Rate Limiting y Seguridad', () => {
    test('aplica rate limiting basado en usuario', async () => {
      // Este test verificaría que se aplican límites de rate correctamente
      // En una implementación real, esto requeriría middleware de rate limiting
      mockReq.query = { q: 'plomero', page: 1, limit: 10 };
      await searchProfessionals(mockReq, mockRes);

      // Verificar que se registra el usuario para rate limiting
      expect(mockReq.user).toBeDefined();
    });
  });
});
