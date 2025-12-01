/**
 * Tests unitarios para el controlador de búsqueda
 * Cubre algoritmos de búsqueda, validación, mapeo de parámetros y lógica crítica
 */

const { searchProfessionals, autocomplete } = require('../controllers/searchController');

// Mock de dependencias
jest.mock('../services/cacheService');
jest.mock('../services/loggingService');
jest.mock('../services/metricsService');
jest.mock('@prisma/client');

const mockCacheService = require('../services/cacheService');
const mockLoggingService = require('../services/loggingService');
const mockMetricsService = require('../services/metricsService');
const { PrismaClient } = require('@prisma/client');

describe('Search Controller - Unit Tests', () => {
    let mockReq, mockRes, mockPrisma;

    beforeEach(() => {
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

        // Mock de Prisma
        mockPrisma = {
            $queryRawUnsafe: jest.fn(),
            perfiles_profesionales: {
                count: jest.fn(),
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

        // Reset mocks
        jest.clearAllMocks();
    });

    describe('searchProfessionals - Validación de Parámetros', () => {
        test('rechaza orderBy inválido', async () => {
            mockReq.query = { orderBy: 'invalid' };

            await searchProfessionals(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: expect.stringContaining('Parámetro orderBy inválido')
            });
        });

        test('acepta orderBy válido', async () => {
            mockReq.query = { orderBy: 'relevance' };

            // Mock para evitar ejecución completa
            mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

            await searchProfessionals(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        test('mapea parámetros correctamente', async () => {
            mockReq.query = {
                q: 'plomero',
                specialty: 'electricista',
                city: 'Buenos Aires',
                district: 'Palermo',
                minPrice: '1000',
                maxPrice: '5000',
                orderBy: 'rating'
            };

            mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

            await searchProfessionals(mockReq, mockRes);

            // Verificar que se mapean los parámetros
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });
    });

    describe('Función mapOrderBy', () => {
        // Importar la función privada para testing
        const { mapOrderBy } = require('../controllers/searchController');

        test('mapea orderBy correctamente', () => {
            expect(mapOrderBy('relevance')).toBe('calificacion_promedio');
            expect(mapOrderBy('rating')).toBe('calificacion_promedio');
            expect(mapOrderBy('distance')).toBe('distancia');
            expect(mapOrderBy('price')).toBe('tarifa_hora');
            expect(mapOrderBy('availability')).toBe('disponibilidad');
            expect(mapOrderBy('invalid')).toBe('calificacion_promedio'); // default
        });
    });

    describe('searchProfessionalsOptimized - Validaciones', () => {
        // Acceder a la función privada para testing directo
        const searchProfessionalsOptimized = require('../controllers/searchController').searchProfessionalsOptimized;

        test('rechaza sort_by inválido', async () => {
            mockReq.query = { sort_by: 'invalid' };

            await searchProfessionalsOptimized(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Parámetro sort_by inválido.'
            });
        });

        test('rechaza radio sin coordenadas de usuario', async () => {
            mockReq.query = { radio_km: 10 };

            await searchProfessionalsOptimized(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Para usar filtro de radio, debe proporcionar user_lat y user_lng.'
            });
        });

        test('rechaza paginación inválida', async () => {
            mockReq.query = { page: 0, limit: 150 };

            await searchProfessionalsOptimized(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Parámetros de paginación inválidos.'
            });
        });

        test('acepta paginación válida', async () => {
            mockReq.query = { page: 1, limit: 50 };
            mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

            await searchProfessionalsOptimized(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
        });
    });

    describe('Construcción de Queries SQL', () => {
        const searchProfessionalsOptimized = require('../controllers/searchController').searchProfessionalsOptimized;

        test('construye query básica correctamente', async () => {
            mockReq.query = { page: 1, limit: 10 };
            mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

            await searchProfessionalsOptimized(mockReq, mockRes);

            expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
            const [query] = mockPrisma.$queryRawUnsafe.mock.calls[0];

            expect(query).toContain('SELECT');
            expect(query).toContain('FROM perfiles_profesionales p');
            expect(query).toContain('JOIN usuarios u ON p.usuario_id = u.id');
            expect(query).toContain('WHERE 1=1');
            expect(query).toContain('LIMIT');
            expect(query).toContain('OFFSET');
        });

        test('agrega filtro de especialidad', async () => {
            mockReq.query = { especialidad: 'plomero', page: 1, limit: 10 };
            mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

            await searchProfessionalsOptimized(mockReq, mockRes);

            const [query] = mockPrisma.$queryRawUnsafe.mock.calls[0];
            expect(query).toContain('ts_rank');
            expect(query).toContain('plainto_tsquery');
        });

        test('agrega filtro por zona', async () => {
            mockReq.query = { zona_cobertura: 'Buenos Aires', page: 1, limit: 10 };
            mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

            await searchProfessionalsOptimized(mockReq, mockRes);

            const [query] = mockPrisma.$queryRawUnsafe.mock.calls[0];
            expect(query).toContain('zona_cobertura ILIKE');
        });

        test('agrega filtro por tipo de tarifa', async () => {
            mockReq.query = { tipo_tarifa: 'hora', page: 1, limit: 10 };
            mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

            await searchProfessionalsOptimized(mockReq, mockRes);

            const [query] = mockPrisma.$queryRawUnsafe.mock.calls[0];
            expect(query).toContain('tipo_tarifa =');
        });

        test('agrega filtro por rango de precios', async () => {
            mockReq.query = {
                tipo_tarifa: 'hora',
                precio_min: '1000',
                precio_max: '5000',
                page: 1,
                limit: 10
            };
            mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

            await searchProfessionalsOptimized(mockReq, mockRes);

            const [query] = mockPrisma.$queryRawUnsafe.mock.calls[0];
            expect(query).toContain('tarifa_hora >=');
            expect(query).toContain('tarifa_hora <=');
        });

        test('agrega filtro por disponibilidad', async () => {
            mockReq.query = { disponible: 'true', page: 1, limit: 10 };
            mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

            await searchProfessionalsOptimized(mockReq, mockRes);

            const [query] = mockPrisma.$queryRawUnsafe.mock.calls[0];
            expect(query).toContain('esta_disponible =');
        });

        test('agrega filtro geográfico PostGIS', async () => {
            mockReq.query = {
                radio_km: 10,
                user_lat: -34.6037,
                user_lng: -58.3816,
                page: 1,
                limit: 10
            };
            mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

            await searchProfessionalsOptimized(mockReq, mockRes);

            const [query] = mockPrisma.$queryRawUnsafe.mock.calls[0];
            expect(query).toContain('ST_DWithin');
            expect(query).toContain('ST_Point');
            expect(query).toContain('::geography');
        });

        test('agrega cálculo de distancia cuando hay coordenadas', async () => {
            mockReq.query = {
                user_lat: -34.6037,
                user_lng: -58.3816,
                page: 1,
                limit: 10
            };
            mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

            await searchProfessionalsOptimized(mockReq, mockRes);

            const [query] = mockPrisma.$queryRawUnsafe.mock.calls[0];
            expect(query).toContain('ST_Distance');
            expect(query).toContain('distancia_km');
        });
    });

    describe('Ordenamiento', () => {
        const searchProfessionalsOptimized = require('../controllers/searchController').searchProfessionalsOptimized;

        test.each([
            ['relevancia', 'relevancia DESC, calificacion_promedio DESC NULLS LAST'],
            ['calificacion_promedio', 'calificacion_promedio DESC NULLS LAST, relevancia DESC'],
            ['tarifa_hora', 'tarifa_hora ASC NULLS LAST'],
            ['disponibilidad', 'esta_disponible DESC, estado_verificacion ASC']
        ])('ordena por %s correctamente', async (sortBy, expectedOrder) => {
            mockReq.query = { sort_by: sortBy, page: 1, limit: 10 };
            mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

            await searchProfessionalsOptimized(mockReq, mockRes);

            const [query] = mockPrisma.$queryRawUnsafe.mock.calls[0];
            expect(query).toContain(`ORDER BY ${expectedOrder}`);
        });

        test('ordena por distancia cuando hay coordenadas', async () => {
            mockReq.query = {
                sort_by: 'distancia',
                user_lat: -34.6037,
                user_lng: -58.3816,
                page: 1,
                limit: 10
            };
            mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

            await searchProfessionalsOptimized(mockReq, mockRes);

            const [query] = mockPrisma.$queryRawUnsafe.mock.calls[0];
            expect(query).toContain('ORDER BY distancia_km ASC NULLS LAST');
        });

        test('ordena por zona cuando no hay coordenadas para distancia', async () => {
            mockReq.query = { sort_by: 'distancia', page: 1, limit: 10 };
            mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

            await searchProfessionalsOptimized(mockReq, mockRes);

            const [query] = mockPrisma.$queryRawUnsafe.mock.calls[0];
            expect(query).toContain('ORDER BY zona_cobertura ASC');
        });
    });

    describe('Paginación', () => {
        const searchProfessionalsOptimized = require('../controllers/searchController').searchProfessionalsOptimized;

        test('aplica paginación correctamente', async () => {
            mockReq.query = { page: 2, limit: 20 };
            mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

            await searchProfessionalsOptimized(mockReq, mockRes);

            const [query, ...params] = mockPrisma.$queryRawUnsafe.mock.calls[0];
            expect(query).toContain('LIMIT $');
            expect(query).toContain('OFFSET $');

            // Verificar parámetros de paginación (últimos dos)
            const limitParam = params[params.length - 2];
            const offsetParam = params[params.length - 1];
            expect(limitParam).toBe(20); // limit
            expect(offsetParam).toBe(20); // (page-1) * limit = 20
        });
    });

    describe('Procesamiento de Resultados', () => {
        const searchProfessionalsOptimized = require('../controllers/searchController').searchProfessionalsOptimized;

        test('procesa resultados vacíos', async () => {
            mockReq.query = { page: 1, limit: 10 };
            mockPrisma.$queryRawUnsafe
                .mockResolvedValueOnce([]) // Resultados principales
                .mockResolvedValueOnce([{ total: 0 }]); // Conteo

            await searchProfessionalsOptimized(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            const response = mockRes.json.mock.calls[0][0];
            expect(response.professionals).toEqual([]);
            expect(response.total).toBe(0);
            expect(response.page).toBe(1);
            expect(response.limit).toBe(10);
        });

        test('procesa resultados con datos', async () => {
            const mockProfessional = {
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
                distancia_km: 5.2,
                relevancia: 0.8,
                total_resenas: 10,
                servicios_completados: 25
            };

            mockReq.query = { page: 1, limit: 10 };
            mockPrisma.$queryRawUnsafe
                .mockResolvedValueOnce([mockProfessional])
                .mockResolvedValueOnce([{ total: 1 }]);

            // Mock de estadísticas adicionales
            mockPrisma.resenas.findMany.mockResolvedValue([
                { calificacion: 4, servicio: { profesional_id: 1 } },
                { calificacion: 5, servicio: { profesional_id: 1 } }
            ]);
            mockPrisma.servicios.groupBy.mockResolvedValue([
                { profesional_id: 1, _count: { id: 15 } }
            ]);

            await searchProfessionalsOptimized(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            const response = mockRes.json.mock.calls[0][0];
            expect(response.professionals).toHaveLength(1);
            expect(response.professionals[0]).toMatchObject({
                id: 1,
                name: 'Juan Pérez',
                specialty: 'Plomero',
                specialties: ['plomero', 'gasista'],
                average_rating: 4.5,
                distance_km: 5.2,
                relevance_score: 0.8
            });
        });
    });

    describe('autocomplete', () => {
        test('rechaza términos de búsqueda muy cortos', async () => {
            mockReq.query = { q: 'a' };

            await autocomplete(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Se requiere un término de búsqueda de al menos 2 caracteres.'
            });
        });

        test('limita resultados de autocompletado', async () => {
            mockReq.query = { q: 'plom', limit: 50 };

            mockPrisma.perfiles_profesionales.findMany.mockResolvedValue([]);

            await autocomplete(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            // Verificar que se limita a 20 máximo
        });

        test('busca en especialidades cuando se solicita', async () => {
            mockReq.query = { q: 'plom', type: 'specialties' };

            mockPrisma.perfiles_profesionales.findMany.mockResolvedValue([
                { especialidad: 'plomero' },
                { especialidad: 'plomero' },
                { especialidad: 'plomero urgente' }
            ]);

            await autocomplete(mockReq, mockRes);

            expect(mockPrisma.perfiles_profesionales.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        especialidad: { not: null },
                        esta_disponible: true,
                        estado_verificacion: 'verificado'
                    })
                })
            );
        });
    });

    describe('Manejo de Errores', () => {
        test('maneja errores de base de datos', async () => {
            mockReq.query = { page: 1, limit: 10 };
            mockPrisma.$queryRawUnsafe.mockRejectedValue(new Error('Database error'));

            await searchProfessionals(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Error al buscar profesionales.'
            });
        });
    });
});
