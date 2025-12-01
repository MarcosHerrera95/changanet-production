// src/controllers/professionalController.js
/**
 * Controlador para gestión de profesionales
 * Implementa endpoints REST para Gestión de Perfiles Profesionales
 * REQ-06 a REQ-10 según PRD
 */

const { PrismaClient } = require('@prisma/client');
const ProfessionalService = require('../services/professionalService');
const { validateProfessionalProfile, validatePhotoUpload, validateImageFile } = require('../middleware/validation');

const prisma = new PrismaClient();

/**
 * Crear nuevo perfil profesional
 * POST /api/professionals
 * REQ-06 a REQ-10: Creación completa de perfil
 */
exports.createProfessional = async (req, res) => {
  try {
    const { userId } = req.user;

    // Los datos ya están validados por el middleware
    const profileData = req.validatedData;

    const newProfile = await ProfessionalService.createProfessionalProfile(userId, profileData);

    res.status(201).json({
      success: true,
      message: 'Perfil profesional creado exitosamente',
      profile: newProfile
    });

  } catch (error) {
    console.error('Error creando perfil profesional:', error);
    res.status(400).json({
      error: error.message,
      code: 'PROFILE_CREATION_FAILED'
    });
  }
};

/**
 * Actualizar perfil profesional específico
 * PUT /api/professionals/:id
 * REQ-06 a REQ-10: Actualización completa
 */
exports.updateProfessional = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;
    const targetUserId = parseInt(id);

    // Verificar permisos: solo el propietario o admin puede actualizar
    if (role !== 'admin' && userId !== targetUserId) {
      return res.status(403).json({
        error: 'No tienes permisos para actualizar este perfil',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Los datos ya están validados por el middleware
    const profileData = req.validatedData;

    const updatedProfile = await ProfessionalService.updateProfessionalProfile(targetUserId, profileData);

    res.json({
      success: true,
      message: 'Perfil profesional actualizado exitosamente',
      profile: updatedProfile
    });

  } catch (error) {
    console.error('Error actualizando perfil profesional:', error);
    res.status(400).json({
      error: error.message,
      code: 'PROFILE_UPDATE_FAILED'
    });
  }
};

/**
 * Subir foto de perfil o portada
 * POST /api/professionals/upload-photo
 * REQ-06: Gestión de imágenes
 */
exports.uploadProfilePhoto = [
  validatePhotoUpload,
  validateImageFile,
  async (req, res) => {
    try {
      const { userId } = req.user;
      const { foto_tipo } = req.body;

      if (!req.file) {
        return res.status(400).json({
          error: 'No se encontró archivo de imagen',
          code: 'NO_FILE_UPLOADED'
        });
      }

      const result = await ProfessionalService.uploadProfilePhoto(
        userId,
        req.file.buffer,
        foto_tipo
      );

      res.json({
        success: true,
        message: `Foto ${foto_tipo} subida exitosamente`,
        data: result
      });

    } catch (error) {
      console.error('Error subiendo foto:', error);
      res.status(400).json({
        error: error.message,
        code: 'PHOTO_UPLOAD_FAILED'
      });
    }
  }
];

/**
 * Buscar profesionales con filtros y ordenamiento
 * GET /api/professionals
 * REQ-11, REQ-12, REQ-13, REQ-14, REQ-15
 */
exports.getProfessionals = async (req, res) => {
  try {
    const {
      zona_cobertura,
      precio_min,
      precio_max,
      especialidad,
      sort_by = 'calificacion_promedio',
      page = 1,
      limit = 10
    } = req.query;

    console.log('🔍 Buscando profesionales con filtros:', req.query);

    // Validar parámetros
    const validSortOptions = ['calificacion_promedio', 'tarifa_hora', 'distancia', 'disponibilidad'];
    if (!validSortOptions.includes(sort_by)) {
      return res.status(400).json({
        error: 'Parámetro sort_by inválido. Opciones válidas: calificacion_promedio, tarifa_hora, distancia, disponibilidad.'
      });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Parámetros de paginación inválidos.' });
    }

    // Construir filtros usando Prisma con include
    const where = {
      rol: 'profesional',
      perfil_profesional: {
        isNot: null // Solo usuarios con perfil profesional
      }
    };

    // Crear filtros para perfil_profesional usando 'is'
    const perfilWhere = {};

    // Filtro por zona/barrio (REQ-12)
    if (zona_cobertura) {
      perfilWhere.zona_cobertura = {
        contains: zona_cobertura
      };
    }

    // Filtro por especialidad (REQ-11) - mejorado para ser más flexible
    if (especialidad) {
      // Búsqueda flexible que incluya variaciones comunes
      const especialidadLower = especialidad.toLowerCase().trim();
      
      // Mapeo de especialidades flexibles
      
      if (especialidadLower.includes('cerraj')) {
        // Buscar tanto 'Cerrajería' (con í) como 'Cerrajero'
        perfilWhere.especialidad = {
          in: ['Cerrajería', 'cerrajería', 'Cerrajero', 'cerrajero', 'CERRAJERÍA', 'CERRAJERO']
        };
      } else if (especialidadLower.includes('plom')) {
        perfilWhere.especialidad = {
          in: ['Plomero', 'plomero', 'PLOMERO', 'Plomería', 'plomería', 'PLOMERÍA']
        };
      } else if (especialidadLower.includes('electr')) {
        perfilWhere.especialidad = {
          in: ['Electricista', 'electricista', 'ELECTRICISTA', 'Electricidad', 'electricidad', 'ELECTRICIDAD']
        };
      } else if (especialidadLower.includes('pint')) {
        perfilWhere.especialidad = {
          in: ['Pintor', 'pintor', 'PINTOR', 'Pintura', 'pintura', 'PINTURA']
        };
      } else if (especialidadLower.includes('albañil')) {
        perfilWhere.especialidad = {
          in: ['Albañil', 'albañil', 'ALBAÑIL', 'Albañilería', 'albañilería', 'ALBAÑILERÍA']
        };
      } else if (especialidadLower.includes('gas')) {
        perfilWhere.especialidad = {
          in: ['Gasista', 'gasista', 'GASISTA', 'Gasfiter', 'gasfiter', 'GASFITER']
        };
      } else if (especialidadLower.includes('carpint')) {
        perfilWhere.especialidad = {
          in: ['Carpintero', 'carpintero', 'CARPINTERO', 'Carpintería', 'carpintería', 'CARPINTERÍA']
        };
      } else if (especialidadLower.includes('herr')) {
        perfilWhere.especialidad = {
          in: ['Herrero', 'herrero', 'HERRERO', 'Herrería', 'herrería', 'HERRERÍA']
        };
      } else if (especialidadLower.includes('mecan')) {
        perfilWhere.especialidad = {
          in: ['Mecánico', 'mecánico', 'MECÁNICO', 'Mecánica', 'mecánica', 'MECÁNICA']
        };
      } else if (especialidadLower.includes('jardin')) {
        perfilWhere.especialidad = {
          in: ['Jardín', 'jardín', 'JARDÍN', 'Jardinería', 'jardinería', 'JARDINERÍA']
        };
      } else {
        // Búsqueda genérica - buscar coincidencias parciales
        perfilWhere.especialidad = {
          contains: especialidadLower
        };
      }
      
      console.log('🔍 DEBUGGING - Especialidad buscada:', especialidadLower);
      console.log('🔍 DEBUGGING - Filtro aplicado:', perfilWhere.especialidad);
    }

    // Filtro por rango de precio (REQ-13)
    if (precio_min || precio_max) {
      perfilWhere.tarifa_hora = {};
      if (precio_min) perfilWhere.tarifa_hora.gte = parseFloat(precio_min);
      if (precio_max) perfilWhere.tarifa_hora.lte = parseFloat(precio_max);
    }

    // Aplicar filtros de perfil_profesional si existen
    if (Object.keys(perfilWhere).length > 0) {
      where.perfil_profesional = {
        ...where.perfil_profesional,
        is: perfilWhere
      };
    }

    // Configurar ordenamiento (REQ-14)
    let orderBy = {};
    switch (sort_by) {
      case 'calificacion_promedio':
        orderBy = { perfil_profesional: { calificacion_promedio: 'desc' } };
        break;
      case 'tarifa_hora':
        orderBy = { perfil_profesional: { tarifa_hora: 'asc' } };
        break;
      case 'distancia':
        // Para distancia necesitaríamos coordenadas del usuario
        orderBy = { perfil_profesional: { zona_cobertura: 'asc' } };
        break;
      case 'disponibilidad':
        // Para disponibilidad: ordenar por estado de verificación
        orderBy = { perfil_profesional: { estado_verificacion: 'desc' } };
        break;
      default:
        orderBy = { perfil_profesional: { calificacion_promedio: 'desc' } };
    }

    const skip = (pageNum - 1) * limitNum;

    // Solo obtener especialidades disponibles para logging cuando se busca especialidad
    let allSpecialties = [];
    if (especialidad) {
      allSpecialties = await prisma.perfiles_profesionales.findMany({
        select: {
          especialidad: true
        },
        distinct: ['especialidad']
      });
      console.log('📋 Especialidades disponibles:', allSpecialties.map(s => s.especialidad).join(', '));
    }

    // Buscar profesionales usando Prisma con include (REQ-15)
    const professionals = await prisma.usuarios.findMany({
      where,
      include: {
        perfil_profesional: {
          select: {
            especialidad: true,
            zona_cobertura: true,
            tarifa_hora: true,
            calificacion_promedio: true,
            estado_verificacion: true,
            descripcion: true
          }
        }
      },
      orderBy,
      skip,
      take: limitNum
    });

    // Transformar datos para el frontend
    const transformedProfessionals = professionals.map(prof => ({
      usuario_id: prof.id,
      usuario: {
        nombre: prof.nombre,
        email: prof.email,
        url_foto_perfil: prof.url_foto_perfil
      },
      especialidad: prof.perfil_profesional?.especialidad,
      zona_cobertura: prof.perfil_profesional?.zona_cobertura,
      tarifa_hora: prof.perfil_profesional?.tarifa_hora,
      calificacion_promedio: prof.perfil_profesional?.calificacion_promedio,
      estado_verificacion: prof.perfil_profesional?.estado_verificacion,
      descripcion: prof.perfil_profesional?.descripcion
    }));

    const total = await prisma.usuarios.count({
      where: {
        rol: 'profesional',
        perfil_profesional: { isNot: null }
      }
    });

    const totalPages = Math.ceil(total / limitNum);

    console.log(`✅ Encontrados ${transformedProfessionals.length} profesionales de ${total} total`);

    res.json({
      professionals: transformedProfessionals,
      total,
      page: pageNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    });

  } catch (error) {
    console.error('❌ Error al buscar profesionales:', error);
    res.status(500).json({ error: 'Error interno del servidor al buscar profesionales' });
  }
};

/**
 * Obtener profesional por ID
 * GET /api/professionals/:id
 * Solo perfiles públicos o del propietario/admin
 */
exports.getProfessionalById = async (req, res) => {
  try {
    const { id } = req.params;
    const targetUserId = parseInt(id);
    const { userId, role } = req.user || {};

    // Verificar que el usuario esté autenticado para acceder a perfiles detallados
    if (!userId) {
      return res.status(401).json({
        error: 'Autenticación requerida para acceder a perfiles profesionales',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    const professional = await prisma.usuarios.findUnique({
      where: {
        id: targetUserId,
        rol: 'profesional'
      },
      include: {
        perfil_profesional: {
          select: {
            especialidad: true,
            zona_cobertura: true,
            tarifa_hora: true,
            calificacion_promedio: true,
            estado_verificacion: true,
            descripcion: true,
            creado_en: true,
            esta_disponible: true
          }
        }
      }
    });

    if (!professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    // Verificar permisos: solo perfiles disponibles públicamente o del propietario/admin
    if (!professional.perfil_profesional?.esta_disponible && role !== 'admin' && userId !== targetUserId) {
      return res.status(403).json({
        error: 'No tienes permisos para acceder a este perfil',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Transformar datos - excluir información sensible según permisos
    const transformedProfessional = {
      usuario_id: professional.id,
      usuario: {
        nombre: professional.nombre,
        email: role === 'admin' || userId === targetUserId ? professional.email : undefined, // Solo admin/propietario ven email
        url_foto_perfil: professional.url_foto_perfil
      },
      especialidad: professional.perfil_profesional?.especialidad,
      zona_cobertura: professional.perfil_profesional?.zona_cobertura,
      tarifa_hora: professional.perfil_profesional?.tarifa_hora,
      calificacion_promedio: professional.perfil_profesional?.calificacion_promedio,
      estado_verificacion: professional.perfil_profesional?.estado_verificacion,
      descripcion: professional.perfil_profesional?.descripcion,
      esta_disponible: professional.perfil_profesional?.esta_disponible
    };

    res.json(transformedProfessional);
  } catch (error) {
    console.error('Error al obtener profesional:', error);
    res.status(500).json({ error: 'Error al obtener profesional' });
  }
};
