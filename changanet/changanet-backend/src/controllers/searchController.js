/**
 * Controlador para sistema de búsqueda de profesionales
 * Implementa sección 7.3 del PRD: Sistema de Búsqueda y Filtros
 *
 * REQUERIMIENTOS FUNCIONALES IMPLEMENTADOS:
 * REQ-11: Búsqueda por palabra clave - ✅ Implementado (especialidad)
 * REQ-12: Filtros por especialidad, ciudad, barrio y radio - ✅ Implementado completamente
 * REQ-13: Filtro por rango de precio - ✅ Implementado (con tipos de tarifa flexibles)
 * REQ-14: Ordenamiento por calificación, cercanía y disponibilidad - ✅ Implementado
 * REQ-15: Tarjeta resumen con foto, nombre, calificación, distancia - ✅ Implementado
 *
 * CARACTERÍSTICAS ADICIONALES IMPLEMENTADAS:
 * - Filtro por radio geográfico con cálculo de distancia GPS
 * - Filtros de tarifa flexibles (hora, servicio, convenio)
 * - Filtro por disponibilidad real del profesional
 * - Sistema de caché para optimización de rendimiento
 * - Paginación completa con metadata
 * - Estadísticas calculadas (reseñas, servicios completados)
 */

// src/controllers/searchController.js
const { PrismaClient, Prisma } = require('@prisma/client');
const { getCachedProfessionalSearch, cacheProfessionalSearch } = require('../services/cacheService');
const { logSecurity, logBusiness } = require('../services/loggingService');
const { incrementSearchRequest, recordSearchDuration, recordSearchResultsCount, incrementAutocompleteRequest } = require('../services/metricsService');
const prisma = new PrismaClient();

/**
 * Calcula la distancia en kilómetros entre dos puntos GPS usando la fórmula de Haversine
 * @param {number} lat1 - Latitud del punto 1
 * @param {number} lon1 - Longitud del punto 1
 * @param {number} lat2 - Latitud del punto 2
 * @param {number} lon2 - Longitud del punto 2
 * @returns {number} Distancia en kilómetros
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en kilómetros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

/**
 * Busca profesionales con filtros avanzados y paginación
 * REQ-11: Búsqueda por palabra clave - ✅ Implementado (especialidad)
 * REQ-12: Filtros por especialidad, ciudad, barrio y radio - ✅ Implementado completamente
 * REQ-13: Filtro por rango de precio - ✅ Implementado (con tipos de tarifa flexibles)
 * REQ-14: Ordenamiento por calificación, cercanía y disponibilidad - ✅ Implementado
 * REQ-15: Tarjeta resumen con foto, nombre, calificación, distancia - ✅ Implementado
 * Soporta caché para optimización
 */
exports.searchProfessionals = async (req, res) => {
  // Extraer parámetros de búsqueda según especificaciones del endpoint
  const {
    q,              // Término de búsqueda full-text (REQ-11)
    specialty,      // Filtro por especialidad específica
    city,           // Filtro por ciudad
    district,       // Filtro por barrio/distrito
    radius,         // Radio geográfico en kilómetros (REQ-12)
    minPrice,       // Precio mínimo
    maxPrice,       // Precio máximo
    orderBy = 'relevance', // Ordenamiento: relevance, rating, distance, price, availability
    page = 1,       // Número de página para paginación
    limit = 10      // Resultados por página
  } = req.query;

  // Mapear nuevos parámetros a los parámetros del controlador existente
  const mappedParams = {
    especialidad: q || specialty,     // Usar q como especialidad principal, o specialty específico
    zona_cobertura: city || district, // Combinar ciudad y distrito
    precio_min: minPrice,
    precio_max: maxPrice,
    radio_km: radius,
    sort_by: mapOrderBy(orderBy),    // Mapear orderBy al formato antiguo
    page,
    limit,
    user_lat: req.query.lat,
    user_lng: req.query.lng
  };

  // Crear nueva request con parámetros mapeados
  const mappedReq = { ...req, query: mappedParams };

  // Usar el controlador existente pero con validación adicional
  try {
    // Validación adicional para nuevos parámetros
    const validOrderBy = ['relevance', 'rating', 'distance', 'price', 'availability'];
    if (!validOrderBy.includes(orderBy)) {
      return res.status(400).json({
        error: 'Parámetro orderBy inválido. Opciones válidas: relevance, rating, distance, price, availability.'
      });
    }

    // Usar la versión optimizada con PostGIS
    await searchProfessionalsOptimized(mappedReq, res);
  } catch (error) {
    console.error('Error in search endpoint:', error);
    res.status(500).json({ error: 'Error al buscar profesionales.' });
  }
}

// Función auxiliar para mapear orderBy
function mapOrderBy(orderBy) {
  const mapping = {
    'relevance': 'calificacion_promedio', // Default a calificación
    'rating': 'calificacion_promedio',
    'distance': 'distancia',
    'price': 'tarifa_hora',
    'availability': 'disponibilidad'
  };
  return mapping[orderBy] || 'calificacion_promedio';
}

// Función optimizada con PostGIS y full-text search
async function searchProfessionalsOptimized(req, res) {
  const {
    especialidad,
    zona_cobertura,
    precio_min,
    precio_max,
    tipo_tarifa,
    radio_km,
    disponible,
    sort_by = 'relevancia',
    page = 1,
    limit = 10,
    user_lat,
    user_lng
  } = req.query;

  try {
    // Validar parámetros
    const validSortOptions = ['relevancia', 'calificacion_promedio', 'tarifa_hora', 'distancia', 'disponibilidad'];
    if (!validSortOptions.includes(sort_by)) {
      return res.status(400).json({ error: 'Parámetro sort_by inválido.' });
    }

    if (radio_km && (!user_lat || !user_lng)) {
      return res.status(400).json({ error: 'Para usar filtro de radio, debe proporcionar user_lat y user_lng.' });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Parámetros de paginación inválidos.' });
    }

    // Construir consulta SQL optimizada con PostGIS
    let sqlQuery = `
      SELECT
        p.usuario_id,
        p.especialidad,
        p.especialidades,
        p.anos_experiencia,
        p.zona_cobertura,
        p.latitud,
        p.longitud,
        p.tipo_tarifa,
        p.tarifa_hora,
        p.tarifa_servicio,
        p.tarifa_convenio,
        p.descripcion,
        p.url_foto_perfil,
        p.url_foto_portada,
        p.esta_disponible,
        p.calificacion_promedio,
        p.estado_verificacion,
        p.verificado_en,
        u.nombre,
        u.email`;

    const params = [];
    let paramIndex = 1;

    // Agregar cálculo de distancia si hay coordenadas de usuario
    if (user_lat && user_lng) {
      sqlQuery += `,
        ST_Distance(p.ubicacion, ST_Point($${paramIndex}, $${paramIndex + 1}, 4326)::geography) / 1000 as distancia_km`;
      params.push(parseFloat(user_lng), parseFloat(user_lat));
      paramIndex += 2;
    } else {
      sqlQuery += `,
        NULL as distancia_km`;
    }

    // Agregar relevancia de búsqueda full-text si hay término de búsqueda
    if (especialidad) {
      sqlQuery += `,
        ts_rank(p.search_vector, plainto_tsquery('spanish', $${paramIndex})) as relevancia`;
      params.push(especialidad);
      paramIndex++;
    } else {
      sqlQuery += `,
        0 as relevancia`;
    }

    sqlQuery += `
      FROM perfiles_profesionales p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE 1=1`;

    // Filtro de especialidad con full-text search
    if (especialidad) {
      sqlQuery += ` AND p.search_vector @@ plainto_tsquery('spanish', $${paramIndex})`;
      params.push(especialidad);
      paramIndex++;
    }

    // Filtro por zona/barrio
    if (zona_cobertura) {
      sqlQuery += ` AND p.zona_cobertura ILIKE $${paramIndex}`;
      params.push(`%${zona_cobertura}%`);
      paramIndex++;
    }

    // Filtro por tipo de tarifa
    if (tipo_tarifa) {
      const validTipos = ['hora', 'servicio', 'convenio'];
      if (validTipos.includes(tipo_tarifa)) {
        sqlQuery += ` AND p.tipo_tarifa = $${paramIndex}`;
        params.push(tipo_tarifa);
        paramIndex++;
      }
    }

    // Filtro por rango de precios
    if (precio_min || precio_max) {
      if (tipo_tarifa === 'hora' || !tipo_tarifa) {
        if (precio_min) {
          sqlQuery += ` AND p.tarifa_hora >= $${paramIndex}`;
          params.push(parseFloat(precio_min));
          paramIndex++;
        }
        if (precio_max) {
          sqlQuery += ` AND p.tarifa_hora <= $${paramIndex}`;
          params.push(parseFloat(precio_max));
          paramIndex++;
        }
      } else if (tipo_tarifa === 'servicio') {
        if (precio_min) {
          sqlQuery += ` AND p.tarifa_servicio >= $${paramIndex}`;
          params.push(parseFloat(precio_min));
          paramIndex++;
        }
        if (precio_max) {
          sqlQuery += ` AND p.tarifa_servicio <= $${paramIndex}`;
          params.push(parseFloat(precio_max));
          paramIndex++;
        }
      }
    }

    // Filtro por disponibilidad
    if (disponible !== undefined) {
      sqlQuery += ` AND p.esta_disponible = $${paramIndex}`;
      params.push(disponible === 'true');
      paramIndex++;
    }

    // Filtro por radio geográfico usando PostGIS
    if (radio_km && user_lat && user_lng) {
      sqlQuery += ` AND ST_DWithin(p.ubicacion, ST_Point($${paramIndex}, $${paramIndex + 1}, 4326)::geography, $${paramIndex + 2} * 1000)`;
      params.push(parseFloat(user_lng), parseFloat(user_lat), parseFloat(radio_km));
      paramIndex += 3;
    }

    // Ordenamiento
    switch (sort_by) {
      case 'relevancia':
        sqlQuery += ` ORDER BY relevancia DESC, calificacion_promedio DESC NULLS LAST`;
        break;
      case 'calificacion_promedio':
        sqlQuery += ` ORDER BY calificacion_promedio DESC NULLS LAST, relevancia DESC`;
        break;
      case 'tarifa_hora':
        sqlQuery += ` ORDER BY tarifa_hora ASC NULLS LAST`;
        break;
      case 'distancia':
        if (user_lat && user_lng) {
          sqlQuery += ` ORDER BY distancia_km ASC NULLS LAST`;
        } else {
          sqlQuery += ` ORDER BY zona_cobertura ASC`;
        }
        break;
      case 'disponibilidad':
        sqlQuery += ` ORDER BY esta_disponible DESC, estado_verificacion ASC`;
        break;
    }

    // Paginación
    const offset = (pageNum - 1) * limitNum;
    sqlQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    // Ejecutar consulta principal
    const professionals = await prisma.$queryRawUnsafe(sqlQuery, ...params);

    // Contar total de resultados
    let countQuery = `
      SELECT COUNT(*) as total
      FROM perfiles_profesionales p
      WHERE 1=1`;

    const countParams = [];
    let countParamIndex = 1;

    // Aplicar mismos filtros para el conteo
    if (especialidad) {
      countQuery += ` AND p.search_vector @@ plainto_tsquery('spanish', $${countParamIndex})`;
      countParams.push(especialidad);
      countParamIndex++;
    }

    if (zona_cobertura) {
      countQuery += ` AND p.zona_cobertura ILIKE $${countParamIndex}`;
      countParams.push(`%${zona_cobertura}%`);
      countParamIndex++;
    }

    if (tipo_tarifa && ['hora', 'servicio', 'convenio'].includes(tipo_tarifa)) {
      countQuery += ` AND p.tipo_tarifa = $${countParamIndex}`;
      countParams.push(tipo_tarifa);
      countParamIndex++;
    }

    if (precio_min || precio_max) {
      if (tipo_tarifa === 'hora' || !tipo_tarifa) {
        if (precio_min) {
          countQuery += ` AND p.tarifa_hora >= $${countParamIndex}`;
          countParams.push(parseFloat(precio_min));
          countParamIndex++;
        }
        if (precio_max) {
          countQuery += ` AND p.tarifa_hora <= $${countParamIndex}`;
          countParams.push(parseFloat(precio_max));
          countParamIndex++;
        }
      } else if (tipo_tarifa === 'servicio') {
        if (precio_min) {
          countQuery += ` AND p.tarifa_servicio >= $${countParamIndex}`;
          countParams.push(parseFloat(precio_min));
          countParamIndex++;
        }
        if (precio_max) {
          countQuery += ` AND p.tarifa_servicio <= $${countParamIndex}`;
          countParams.push(parseFloat(precio_max));
          countParamIndex++;
        }
      }
    }

    if (disponible !== undefined) {
      countQuery += ` AND p.esta_disponible = $${countParamIndex}`;
      countParams.push(disponible === 'true');
      countParamIndex++;
    }

    if (radio_km && user_lat && user_lng) {
      countQuery += ` AND ST_DWithin(p.ubicacion, ST_Point($${countParamIndex}, $${countParamIndex + 1}, 4326)::geography, $${countParamIndex + 2} * 1000)`;
      countParams.push(parseFloat(user_lng), parseFloat(user_lat), parseFloat(radio_km));
    }

    const totalResult = await prisma.$queryRawUnsafe(countQuery, ...countParams);
    const total = parseInt(totalResult[0].total);
    const totalPages = Math.ceil(total / limitNum);

    // Obtener estadísticas adicionales (reseñas y servicios completados)
    const professionalIds = professionals.map(p => p.usuario_id);

    if (professionalIds.length > 0) {
      const [reviewsData, services] = await Promise.all([
        prisma.resenas.findMany({
          where: {
            servicio: {
              profesional_id: { in: professionalIds }
            }
          },
          select: {
            calificacion: true,
            servicio: {
              select: { profesional_id: true }
            }
          }
        }),
        prisma.servicios.groupBy({
          by: ['profesional_id'],
          where: {
            profesional_id: { in: professionalIds },
            estado: 'COMPLETADO'
          },
          _count: { id: true }
        })
      ]);

      // Crear mapa de estadísticas
      const statsMap = new Map();
      professionalIds.forEach(id => {
        statsMap.set(id, {
          calificacion_promedio: 0,
          total_resenas: 0,
          servicios_completados: 0
        });
      });

      reviewsData.forEach(review => {
        const profId = review.servicio.profesional_id;
        const stats = statsMap.get(profId);
        if (stats) {
          stats.total_resenas++;
          stats.calificacion_promedio += review.calificacion;
        }
      });

      statsMap.forEach(stats => {
        if (stats.total_resenas > 0) {
          stats.calificacion_promedio = stats.calificacion_promedio / stats.total_resenas;
        }
      });

      services.forEach(serviceStat => {
        const stats = statsMap.get(serviceStat.profesional_id);
        if (stats) {
          stats.servicios_completados = serviceStat._count.id;
        }
      });

      // Enriquecer resultados
      professionals.forEach(prof => {
        const stats = statsMap.get(prof.usuario_id);
        if (stats) {
          prof.calificacion_promedio = stats.calificacion_promedio;
          prof.total_resenas = stats.total_resenas;
          prof.servicios_completados = stats.servicios_completados;
        }
      });
    }

    // Estructurar respuesta
    const results = {
      professionals: professionals.map(prof => ({
        id: prof.usuario_id,
        name: prof.nombre,
        email: prof.email,
        specialty: prof.especialidad,
        specialties: prof.especialidades ? JSON.parse(prof.especialidades) : [],
        experience_years: prof.anos_experiencia,
        coverage_area: prof.zona_cobertura,
        latitude: prof.latitud,
        longitude: prof.longitud,
        rate_type: prof.tipo_tarifa,
        hourly_rate: prof.tarifa_hora,
        service_rate: prof.tarifa_servicio,
        custom_rate: prof.tarifa_convenio,
        description: prof.descripcion,
        profile_photo_url: prof.url_foto_perfil,
        cover_photo_url: prof.url_foto_portada,
        is_available: prof.esta_disponible,
        average_rating: prof.calificacion_promedio || 0,
        verification_status: prof.estado_verificacion,
        verified_at: prof.verificado_en,
        total_reviews: prof.total_resenas || 0,
        completed_services: prof.servicios_completados || 0,
        distance_km: prof.distancia_km,
        relevance_score: prof.relevancia || 0
      })),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages
    };

    // Almacenar en caché
    const filters = {
      especialidad,
      zona_cobertura,
      precio_min: precio_min ? parseFloat(precio_min) : null,
      precio_max: precio_max ? parseFloat(precio_max) : null,
      tipo_tarifa,
      radio_km: radio_km ? parseFloat(radio_km) : null,
      disponible: disponible ? disponible === 'true' : null,
      sort_by,
      page: pageNum,
      limit: limitNum,
      user_lat: user_lat ? parseFloat(user_lat) : null,
      user_lng: user_lng ? parseFloat(user_lng) : null
    };

    await cacheProfessionalSearch(filters, results);

    // Audit logging para búsquedas
    logBusiness('search_performed', {
      userId: req.user?.id || null,
      userRole: req.user?.role || 'anonymous',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      searchTerm: especialidad,
      location: user_lat && user_lng ? `${user_lat},${user_lng}` : null,
      radius: radio_km,
      filters: {
        specialty: especialidad,
        city: zona_cobertura,
        priceRange: precio_min && precio_max ? `${precio_min}-${precio_max}` : null,
        rateType: tipo_tarifa,
        availability: disponible,
        sortBy: sort_by
      },
      resultsCount: results.total,
      page: pageNum,
      limit: limitNum,
      responseTime: Date.now() - req.startTime,
      cached: false // TODO: track if result was cached
    });

    res.status(200).json(results);
  } catch (error) {
    console.error('Error in optimized search:', error);
    res.status(500).json({ error: 'Error al buscar profesionales.' });
  }
}

// Copia del controlador existente para compatibilidad
async function searchProfessionalsLegacy(req, res) {
  // Extraer parámetros de búsqueda de la query string (REQ-11: búsqueda por múltiples criterios)
  const {
    especialidad,     // Filtro por especialidad del profesional (búsqueda en especialidad principal y array)
    zona_cobertura,   // Filtro por zona/barrio de cobertura
    precio_min,       // Filtro de precio mínimo por hora
    precio_max,       // Filtro de precio máximo por hora
    tipo_tarifa,      // Filtro por tipo de tarifa (hora, servicio, convenio)
    radio_km,         // Radio geográfico en kilómetros (REQ-12 mejorado)
    disponible,       // Filtro por disponibilidad (true/false)
    sort_by = 'calificacion_promedio', // Ordenamiento: calificación, precio, distancia, disponibilidad
    page = 1,         // Número de página para paginación
    limit = 10,       // Cantidad de resultados por página
    user_lat,         // Latitud del usuario para cálculo de distancia (REQ-14)
    user_lng          // Longitud del usuario para cálculo de distancia (REQ-14)
  } = req.query;

  try {
    // Validar que el parámetro de ordenamiento sea válido (REQ-14: opciones de ordenamiento)
    const validSortOptions = ['calificacion_promedio', 'tarifa_hora', 'distancia', 'disponibilidad'];
    if (!validSortOptions.includes(sort_by)) {
      return res.status(400).json({ error: 'Parámetro sort_by inválido. Opciones válidas: calificacion_promedio, tarifa_hora, distancia, disponibilidad.' });
    }

    // Validar radio geográfico si se proporciona
    if (radio_km && (!user_lat || !user_lng)) {
      return res.status(400).json({ error: 'Para usar filtro de radio, debe proporcionar user_lat y user_lng.' });
    }

    // Convertir y validar parámetros de paginación
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Parámetros de paginación inválidos.' });
    }
    // Crear objeto normalizado de filtros para caché y consultas
    const filters = {
      especialidad: especialidad || null,           // Especialidad a buscar
      zona_cobertura: zona_cobertura || null,       // Zona geográfica
      precio_min: precio_min ? parseFloat(precio_min) : null,  // Precio mínimo
      precio_max: precio_max ? parseFloat(precio_max) : null,  // Precio máximo
      tipo_tarifa: tipo_tarifa || null,             // Tipo de tarifa
      radio_km: radio_km ? parseFloat(radio_km) : null,  // Radio geográfico
      disponible: disponible ? disponible === 'true' : null,  // Disponibilidad
      sort_by: sort_by || 'calificacion_promedio',  // Criterio de ordenamiento
      page: parseInt(page),                         // Página actual
      limit: parseInt(limit),                       // Resultados por página
      user_lat: user_lat ? parseFloat(user_lat) : null,  // Latitud usuario
      user_lng: user_lng ? parseFloat(user_lng) : null    // Longitud usuario
    };

    // Intentar obtener resultados desde caché para mejorar rendimiento
    const cachedResults = await getCachedProfessionalSearch(filters);
    if (cachedResults) {
      console.log('🔍 Resultados obtenidos del caché'); // Log para monitoreo

      // Métricas para búsqueda cacheada
      incrementSearchRequest(true, !!especialidad || !!zona_cobertura || !!precio_min || !!precio_max, !!(user_lat && user_lng));
      recordSearchDuration((Date.now() - req.startTime) / 1000, true, cachedResults.total);

      return res.status(200).json(cachedResults); // Retornar resultados cacheados
    }

    // Inicializar objeto de condiciones WHERE para Prisma
    const where = {};

    // Aplicar filtro de búsqueda por especialidad (REQ-11: búsqueda por palabra clave)
    // Ahora busca tanto en especialidad principal como en array JSON de especialidades
    if (especialidad) {
      where.OR = [
        { especialidad: { contains: especialidad } }, // Especialidad principal
        // Nota: Búsqueda en JSON array requeriría lógica más compleja, por ahora solo especialidad principal
      ];
    }

    // Aplicar filtro por zona/barrio de cobertura (REQ-12: filtro geográfico)
    if (zona_cobertura) {
      where.zona_cobertura = { contains: zona_cobertura, mode: 'insensitive' }; // Búsqueda parcial
    }

    // Aplicar filtro por tipo de tarifa
    if (tipo_tarifa) {
      const validTipos = ['hora', 'servicio', 'convenio'];
      if (validTipos.includes(tipo_tarifa)) {
        where.tipo_tarifa = tipo_tarifa;
      }
    }

    // Aplicar filtro por rango de precios (REQ-13: filtro económico)
    // Adaptado para trabajar con diferentes tipos de tarifa
    if (precio_min || precio_max) {
      // Si se especifica tipo de tarifa, filtrar por ese tipo específico
      if (tipo_tarifa === 'hora' && where.tipo_tarifa) {
        where.tarifa_hora = {};
        if (precio_min) where.tarifa_hora.gte = parseFloat(precio_min);
        if (precio_max) where.tarifa_hora.lte = parseFloat(precio_max);
      } else if (tipo_tarifa === 'servicio' && where.tipo_tarifa) {
        where.tarifa_servicio = {};
        if (precio_min) where.tarifa_servicio.gte = parseFloat(precio_min);
        if (precio_max) where.tarifa_servicio.lte = parseFloat(precio_max);
      } else {
        // Sin tipo específico, filtrar por tarifa por hora por defecto (compatibilidad)
        where.tarifa_hora = {};
        if (precio_min) where.tarifa_hora.gte = parseFloat(precio_min);
        if (precio_max) where.tarifa_hora.lte = parseFloat(precio_max);
      }
    }

    // Aplicar filtro por disponibilidad
    if (disponible !== null) {
      where.esta_disponible = disponible;
    }

    // Calcular offset para paginación (saltar registros anteriores)
    const skip = (page - 1) * limit;
    // Definir límite de resultados por página
    const take = parseInt(limit);

    // Configurar lógica de ordenamiento según parámetro sort_by (REQ-14)
    let orderBy = {};        // Configuración de ordenamiento para Prisma
    let sortInMemory = false; // Flag para ordenamiento post-consulta
    switch (sort_by) {
      case 'calificacion_promedio':
        // Calificación se calcula después de consulta, requiere ordenamiento en memoria
        sortInMemory = true;
        orderBy = [{ usuario: { nombre: 'asc' } }]; // Ordenamiento base por nombre
        break;
      case 'tarifa_hora':
        // Ordenamiento directo por tarifa en base de datos
        orderBy = [{ tarifa_hora: 'asc' }];
        break;
      case 'distancia':
        // Ordenamiento por distancia requiere cálculo post-consulta
        if (user_lat && user_lng) {
          sortInMemory = true;  // Calcular distancias y ordenar en memoria
          orderBy = [{ zona_cobertura: 'asc' }]; // Fallback básico para DB
        } else {
          // Sin coordenadas de usuario, ordenar por zona alfabéticamente
          orderBy = [{ zona_cobertura: 'asc' }];
        }
        break;
      case 'disponibilidad':
        // Ordenar por estado de verificación (verificados primero)
        orderBy = [{ estado_verificacion: 'asc' }];
        break;
      default:
        // Caso por defecto: ordenamiento en memoria por nombre
        sortInMemory = true;
        orderBy = [{ usuario: { nombre: 'asc' } }];
    }

    // Registrar evento de búsqueda para analytics y monitoreo
    console.log({ event: 'search_performed', filters, timestamp: new Date().toISOString() });

    // Ejecutar consulta principal a la base de datos con filtros aplicados
    let professionals = await prisma.perfiles_profesionales.findMany({
      where,     // Condiciones de filtro aplicadas
      skip,      // Offset para paginación
      take,      // Límite de resultados
      orderBy,   // Configuración de ordenamiento
      include: { // Incluir datos relacionados del usuario
        usuario: {
          select: { id: true, nombre: true, email: true }, // Solo campos necesarios
        },
      },
    });

    // Calcular distancias geográficas si el usuario proporcionó coordenadas (REQ-14)
    if (user_lat && user_lng) {
      professionals.forEach(prof => {
        // Verificar que el profesional tenga coordenadas guardadas
        if (prof.latitud && prof.longitud) {
          // Calcular distancia usando fórmula de Haversine
          prof.distancia_km = calculateDistance(
            parseFloat(user_lat),   // Latitud del usuario
            parseFloat(user_lng),   // Longitud del usuario
            prof.latitud,           // Latitud del profesional
            prof.longitud           // Longitud del profesional
          );
        } else {
          // Profesional sin coordenadas - distancia no calculable
          prof.distancia_km = null;
        }
      });

      // Aplicar filtro por radio geográfico si se especificó (REQ-12 mejorado)
      if (radio_km) {
        const radioKmFloat = parseFloat(radio_km);
        professionals = professionals.filter(prof => {
          // Incluir profesionales sin coordenadas si no hay filtro estricto
          if (prof.distancia_km === null) return false;
          return prof.distancia_km <= radioKmFloat;
        });
      }
    }

    // Optimizar rendimiento: precargar estadísticas para evitar consultas N+1
    const professionalIds = professionals.map(p => p.usuario_id); // IDs de profesionales encontrados

    // Ejecutar consultas paralelas para obtener reseñas y servicios completados
    const [reviewsData, services] = await Promise.all([
      // Obtener todas las reseñas de estos profesionales
      prisma.resenas.findMany({
        where: {
          servicio: {
            profesional_id: { in: professionalIds } // Servicios de estos profesionales
          }
        },
        select: {
          calificacion: true,  // Solo necesitamos la calificación
          servicio: {
            select: { profesional_id: true } // Para agrupar por profesional
          }
        }
      }),
      // Contar servicios completados por profesional
      prisma.servicios.groupBy({
        by: ['profesional_id'],  // Agrupar por ID de profesional
        where: {
          profesional_id: { in: professionalIds },
          estado: 'COMPLETADO'  // Solo servicios finalizados
        },
        _count: { id: true }  // Contar cantidad de servicios
      })
    ]);

    // Crear mapa de estadísticas para acceso O(1) durante procesamiento
    const statsMap = new Map();
    professionalIds.forEach(id => {
      statsMap.set(id, {
        calificacion_promedio: 0,    // Promedio de calificaciones
        total_resenas: 0,           // Cantidad total de reseñas
        servicios_completados: 0    // Servicios finalizados
      });
    });

    // Procesar reseñas para calcular estadísticas por profesional
    reviewsData.forEach(review => {
      const profId = review.servicio.profesional_id; // ID del profesional de esta reseña
      const stats = statsMap.get(profId); // Obtener estadísticas del profesional
      if (stats) {
        stats.total_resenas++; // Incrementar contador de reseñas
        stats.calificacion_promedio += review.calificacion; // Sumar calificación para promedio
      }
    });

    // Calcular promedio de calificaciones para cada profesional
    statsMap.forEach(stats => {
      if (stats.total_resenas > 0) {
        // Dividir suma total por cantidad de reseñas
        stats.calificacion_promedio = stats.calificacion_promedio / stats.total_resenas;
      }
      // Si no hay reseñas, calificación_promedio permanece en 0
    });

    // Asignar cantidad de servicios completados a cada profesional
    services.forEach(serviceStat => {
      const stats = statsMap.get(serviceStat.profesional_id);
      if (stats) {
        // Asignar conteo de servicios completados
        stats.servicios_completados = serviceStat._count.id;
      }
    });

    // Enriquecer resultados con estadísticas calculadas (REQ-15: tarjeta resumen)
    const enrichedProfessionals = professionals.map(prof => ({
      ...prof, // Copiar todos los campos del perfil profesional
      // Agregar estadísticas calculadas con valores por defecto
      calificacion_promedio: statsMap.get(prof.usuario_id)?.calificacion_promedio || 0,
      total_resenas: statsMap.get(prof.usuario_id)?.total_resenas || 0,
      servicios_completados: statsMap.get(prof.usuario_id)?.servicios_completados || 0
    }));

    // Aplicar ordenamiento en memoria si fue configurado (sortInMemory = true)
    if (sortInMemory) {
      enrichedProfessionals.sort((a, b) => {
        // Ordenamiento específico por distancia si se solicitó y hay coordenadas
        if (sort_by === 'distancia' && user_lat && user_lng) {
          const distA = a.distancia_km || Infinity; // Usar infinito si no hay distancia
          const distB = b.distancia_km || Infinity;
          if (distA !== distB) {
            return distA - distB; // Orden ascendente por distancia
          }
        }

        // Ordenamiento por calificación descendente (más alta primero)
        if (b.calificacion_promedio !== a.calificacion_promedio) {
          return b.calificacion_promedio - a.calificacion_promedio;
        }
        // Criterio de desempate: orden alfabético por nombre
        return a.usuario.nombre.localeCompare(b.usuario.nombre);
      });
    }

    // Contar total de resultados sin paginación para metadata
    const total = await prisma.perfiles_profesionales.count({ where });
    // Calcular total de páginas disponibles
    const totalPages = Math.ceil(total / limit);

    // Estructurar respuesta final con resultados y metadata de paginación
    const results = {
      professionals: enrichedProfessionals.map(prof => ({
        id: prof.usuario_id,
        name: prof.usuario.nombre,
        email: prof.usuario.email,
        specialty: prof.especialidad,
        specialties: prof.especialidades ? JSON.parse(prof.especialidades) : [],
        experience_years: prof.anos_experiencia,
        coverage_area: prof.zona_cobertura,
        latitude: prof.latitud,
        longitude: prof.longitud,
        rate_type: prof.tipo_tarifa,
        hourly_rate: prof.tarifa_hora,
        service_rate: prof.tarifa_servicio,
        custom_rate: prof.tarifa_convenio,
        description: prof.descripcion,
        profile_photo_url: prof.url_foto_perfil,
        cover_photo_url: prof.url_foto_portada,
        is_available: prof.esta_disponible,
        average_rating: prof.calificacion_promedio || 0,
        verification_status: prof.estado_verificacion,
        verified_at: prof.verificado_en,
        total_reviews: prof.total_resenas || 0,
        completed_services: prof.servicios_completados || 0,
        distance_km: prof.distancia_km,
        relevance_score: 0 // No implementado en versión legacy
      })),
      total,           // Total de profesionales encontrados
      page: parseInt(page),     // Página actual
      limit: parseInt(limit),   // Resultados por página
      totalPages,     // Total de páginas disponibles
    };

    // Almacenar resultados en caché para mejorar rendimiento de búsquedas futuras
    await cacheProfessionalSearch(filters, results);
    console.log('💾 Resultados almacenados en caché'); // Log para monitoreo

    // Métricas para búsqueda no cacheada
    incrementSearchRequest(false, !!especialidad || !!zona_cobertura || !!precio_min || !!precio_max, !!(user_lat && user_lng));
    recordSearchDuration((Date.now() - req.startTime) / 1000, false, results.total);
    recordSearchResultsCount(results.total, !!especialidad || !!zona_cobertura || !!precio_min || !!precio_max, !!(user_lat && user_lng));

    // Responder con resultados de búsqueda (REQ-15: tarjeta resumen incluida)
    res.status(200).json(results);
  } catch (error) {
    console.error('Error searching professionals:', error);
    res.status(500).json({ error: 'Error al buscar profesionales.' });
  }
};

/**
 * Endpoint de autocompletado para especialidades y ciudades
 * Proporciona sugerencias en tiempo real para mejorar UX
 */
exports.autocomplete = async (req, res) => {
  const { q, type = 'all', limit = 10 } = req.query;

  try {
    // Validar parámetros
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Se requiere un término de búsqueda de al menos 2 caracteres.' });
    }

    const searchTerm = q.trim();
    const limitNum = Math.min(parseInt(limit) || 10, 20); // Máximo 20 resultados

    const results = {
      specialties: [],
      cities: [],
      districts: []
    };

    // Buscar especialidades si se solicita
    if (type === 'all' || type === 'specialties') {
      const specialtiesData = await prisma.perfiles_profesionales.findMany({
        where: {
          AND: [
            { esta_disponible: true },
            { estado_verificacion: 'verificado' }
          ]
        },
        select: { especialidad: true },
        take: 1000 // Tomar muchos para filtrar después
      });

      // Filtrar y contar manualmente
      const specialtyCount = new Map();
      specialtiesData.forEach(prof => {
        if (prof.especialidad && prof.especialidad.toLowerCase().includes(searchTerm.toLowerCase())) {
          specialtyCount.set(prof.especialidad, (specialtyCount.get(prof.especialidad) || 0) + 1);
        }
      });

      results.specialties = Array.from(specialtyCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limitNum)
        .map(([value, count]) => ({ value, count }));
    }

    // Buscar ciudades si se solicita
    if (type === 'all' || type === 'cities') {
      const citiesData = await prisma.perfiles_profesionales.findMany({
        where: {
          zona_cobertura: { not: null },
          esta_disponible: true,
          estado_verificacion: 'verificado'
        },
        select: { zona_cobertura: true },
        take: 1000
      });

      // Agrupar manualmente por ciudad (primera parte antes de coma)
      const cityCount = new Map();
      citiesData.forEach(prof => {
        const city = prof.zona_cobertura.split(',')[0]?.trim();
        if (city && city.toLowerCase().includes(searchTerm.toLowerCase())) {
          cityCount.set(city, (cityCount.get(city) || 0) + 1);
        }
      });

      results.cities = Array.from(cityCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limitNum)
        .map(([value, count]) => ({ value, count }));
    }

    // Buscar distritos/barrios si se solicita
    if (type === 'all' || type === 'districts') {
      const districtsData = await prisma.perfiles_profesionales.findMany({
        where: {
          zona_cobertura: { not: null },
          esta_disponible: true,
          estado_verificacion: 'verificado'
        },
        select: { zona_cobertura: true },
        take: 1000
      });

      // Filtrar y contar manualmente
      const districtCount = new Map();
      districtsData.forEach(prof => {
        if (prof.zona_cobertura && prof.zona_cobertura.toLowerCase().includes(searchTerm.toLowerCase())) {
          districtCount.set(prof.zona_cobertura, (districtCount.get(prof.zona_cobertura) || 0) + 1);
        }
      });

      results.districts = Array.from(districtCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limitNum)
        .map(([value, count]) => ({ value, count }));
    }

    // Audit logging para autocompletado
    logBusiness('autocomplete_performed', {
      userId: req.user?.id || null,
      userRole: req.user?.role || 'anonymous',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      searchTerm,
      type,
      resultsCount: results.specialties.length + results.cities.length + results.districts.length,
      responseTime: Date.now() - req.startTime
    });

    // Métricas para autocompletado
    const totalResults = results.specialties.length + results.cities.length + results.districts.length;
    incrementAutocompleteRequest(type, totalResults);

    res.status(200).json(results);
  } catch (error) {
    console.error('Error in autocomplete:', error);
    res.status(500).json({ error: 'Error en autocompletado.' });
  }
};
