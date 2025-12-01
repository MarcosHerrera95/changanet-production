/**
 * Servicio de negocio para Gestión de Perfiles Profesionales
 * Implementa lógica de negocio para REQ-06 a REQ-10 según PRD
 */

const { PrismaClient } = require('@prisma/client');
const { uploadImage, deleteImage } = require('./storageService');
const { sanitizeProfessionalProfile } = require('../utils/sanitizer');
const { getCachedProfessionalProfile, cacheProfessionalProfile, invalidateProfessionalProfile } = require('./cacheService');

const prisma = new PrismaClient();

/**
 * Servicio principal para gestión de perfiles profesionales
 */
class ProfessionalService {
  /**
   * Crear un nuevo perfil profesional
   * REQ-06 a REQ-10: Validación completa de datos
   */
  async createProfessionalProfile(userId, profileData) {
    try {
      // Sanitizar datos de entrada
      const sanitizedData = sanitizeProfessionalProfile(profileData);

      // Verificar que el usuario existe y es profesional
      const user = await prisma.usuarios.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      if (user.rol !== 'profesional') {
        throw new Error('Solo los usuarios profesionales pueden crear perfiles profesionales');
      }

      // Verificar que no existe ya un perfil (RB-01: Un profesional = un perfil activo)
      const existingProfile = await prisma.perfiles_profesionales.findUnique({
        where: { usuario_id: userId }
      });

      if (existingProfile) {
        throw new Error('El usuario ya tiene un perfil profesional activo');
      }

      // Preparar datos para inserción
      const profileDataToInsert = this.prepareProfileData(sanitizedData);

      // Crear perfil
      const newProfile = await prisma.perfiles_profesionales.create({
        data: {
          usuario_id: userId,
          ...profileDataToInsert
        },
        include: {
          usuario: {
            select: {
              nombre: true,
              email: true,
              telefono: true,
              esta_verificado: true
            }
          }
        }
      });

      // Cachear el perfil creado
      await cacheProfessionalProfile(userId, newProfile);

      console.log(`✅ Perfil profesional creado para usuario ${userId}`);
      return newProfile;

    } catch (error) {
      console.error('❌ Error creando perfil profesional:', error);
      throw error;
    }
  }

  /**
   * Actualizar perfil profesional existente
   * REQ-06 a REQ-10: Actualización completa con validaciones
   */
  async updateProfessionalProfile(userId, profileData) {
    try {
      // Sanitizar datos de entrada
      const sanitizedData = sanitizeProfessionalProfile(profileData);

      // Verificar que el perfil existe
      const existingProfile = await prisma.perfiles_profesionales.findUnique({
        where: { usuario_id: userId }
      });

      if (!existingProfile) {
        throw new Error('Perfil profesional no encontrado');
      }

      // Preparar datos para actualización
      const profileDataToUpdate = this.prepareProfileData(sanitizedData);

      // Actualizar perfil
      const updatedProfile = await prisma.perfiles_profesionales.update({
        where: { usuario_id: userId },
        data: {
          ...profileDataToUpdate,
          actualizado_en: new Date()
        },
        include: {
          usuario: {
            select: {
              nombre: true,
              email: true,
              telefono: true,
              esta_verificado: true
            }
          }
        }
      });

      // Invalidar caché
      await invalidateProfessionalProfile(userId);

      console.log(`✅ Perfil profesional actualizado para usuario ${userId}`);
      return updatedProfile;

    } catch (error) {
      console.error('❌ Error actualizando perfil profesional:', error);
      throw error;
    }
  }

  /**
   * Obtener perfil profesional público
   * REQ-07, REQ-09: Datos públicos para clientes
   */
  async getProfessionalProfile(professionalId) {
    try {
      // Intentar obtener del caché
      const cached = await getCachedProfessionalProfile(professionalId);
      if (cached) {
        console.log('👤 Perfil obtenido del caché');
        return cached;
      }

      // Obtener de base de datos
      const profile = await prisma.perfiles_profesionales.findUnique({
        where: { usuario_id: professionalId },
        include: {
          usuario: {
            select: {
              nombre: true,
              email: true, // Excluido en respuesta pública
              telefono: true,
              esta_verificado: true
            }
          }
        }
      });

      if (!profile) {
        throw new Error('Perfil profesional no encontrado');
      }

      // Verificar que el perfil esté disponible
      if (!profile.esta_disponible) {
        throw new Error('Perfil profesional no disponible');
      }

      // Cachear resultado
      await cacheProfessionalProfile(professionalId, profile);

      return profile;

    } catch (error) {
      console.error('❌ Error obteniendo perfil profesional:', error);
      throw error;
    }
  }

  /**
   * Subir foto de perfil o portada
   * REQ-06: Gestión de imágenes con Cloudinary
   */
  async uploadProfilePhoto(userId, fileBuffer, photoType = 'perfil') {
    try {
      // Verificar que el perfil existe
      const profile = await prisma.perfiles_profesionales.findUnique({
        where: { usuario_id: userId }
      });

      if (!profile) {
        throw new Error('Perfil profesional no encontrado');
      }

      // Determinar folder y campo según tipo
      const folder = photoType === 'portada' ? 'changanet/profiles/covers' : 'changanet/profiles';
      const fieldName = photoType === 'portada' ? 'url_foto_portada' : 'url_foto_perfil';

      // Eliminar imagen anterior si existe
      const existingUrl = profile[fieldName];
      if (existingUrl) {
        try {
          const publicId = this.extractPublicIdFromUrl(existingUrl);
          await deleteImage(publicId);
        } catch (deleteError) {
          console.warn('Error eliminando imagen anterior:', deleteError.message);
        }
      }

      // Subir nueva imagen
      const uploadResult = await uploadImage(fileBuffer, {
        folder,
        userId,
        transformation: photoType === 'portada' ?
          { width: 1200, height: 400, crop: 'fill' } :
          { width: 400, height: 400, crop: 'fill', gravity: 'face' }
      });

      // Actualizar perfil con nueva URL
      const updatedProfile = await prisma.perfiles_profesionales.update({
        where: { usuario_id: userId },
        data: {
          [fieldName]: uploadResult.secure_url,
          actualizado_en: new Date()
        }
      });

      // Invalidar caché
      await invalidateProfessionalProfile(userId);

      console.log(`✅ Foto ${photoType} subida para usuario ${userId}`);
      return {
        success: true,
        url: uploadResult.secure_url,
        type: photoType,
        profile: updatedProfile
      };

    } catch (error) {
      console.error('❌ Error subiendo foto de perfil:', error);
      throw error;
    }
  }

  /**
   * Buscar profesionales con filtros avanzados
   * REQ-11 a REQ-15: Búsqueda y filtrado
   */
  async searchProfessionals(filters = {}, pagination = {}) {
    try {
      const {
        zona_cobertura,
        especialidad,
        precio_min,
        precio_max,
        calificacion_min,
        disponible = true,
        sort_by = 'calificacion_promedio',
        sort_order = 'desc'
      } = filters;

      const { page = 1, limit = 10 } = pagination;

      // Construir filtros
      const where = {
        rol: 'profesional',
        perfil_profesional: {
          isNot: null,
          esta_disponible: disponible
        }
      };

      // Filtro por zona
      if (zona_cobertura) {
        where.perfil_profesional.zona_cobertura = {
          contains: zona_cobertura,
          mode: 'insensitive'
        };
      }

      // Filtro por especialidad
      if (especialidad) {
        where.perfil_profesional.especialidades = {
          contains: especialidad,
          mode: 'insensitive'
        };
      }

      // Filtro por precio
      if (precio_min || precio_max) {
        where.perfil_profesional.tarifa_hora = {};
        if (precio_min) where.perfil_profesional.tarifa_hora.gte = parseFloat(precio_min);
        if (precio_max) where.perfil_profesional.tarifa_hora.lte = parseFloat(precio_max);
      }

      // Filtro por calificación
      if (calificacion_min) {
        where.perfil_profesional.calificacion_promedio = {
          gte: parseFloat(calificacion_min)
        };
      }

      // Configurar ordenamiento
      const validSortFields = ['calificacion_promedio', 'tarifa_hora', 'anos_experiencia'];
      const sortField = validSortFields.includes(sort_by) ? sort_by : 'calificacion_promedio';
      const orderBy = { perfil_profesional: { [sortField]: sort_order } };

      // Paginación
      const skip = (page - 1) * limit;
      const take = limit;

      // Ejecutar consulta
      const [professionals, total] = await Promise.all([
        prisma.usuarios.findMany({
          where,
          include: {
            perfil_profesional: {
              select: {
                especialidad: true,
                especialidades: true,
                zona_cobertura: true,
                tarifa_hora: true,
                calificacion_promedio: true,
                anos_experiencia: true,
                descripcion: true,
                url_foto_perfil: true,
                esta_disponible: true
              }
            }
          },
          orderBy,
          skip,
          take
        }),
        prisma.usuarios.count({ where })
      ]);

      // Transformar resultados
      const transformedResults = professionals.map(prof => ({
        usuario_id: prof.id,
        usuario: {
          nombre: prof.nombre,
          url_foto_perfil: prof.url_foto_perfil
        },
        ...prof.perfil_profesional
      }));

      return {
        professionals: transformedResults,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      };

    } catch (error) {
      console.error('❌ Error buscando profesionales:', error);
      throw error;
    }
  }

  /**
   * Preparar datos de perfil para inserción/actualización
   * Asegura consistencia de datos según reglas de negocio
   */
  prepareProfileData(data) {
    const prepared = { ...data };

    // Convertir especialidades a JSON si es array
    if (Array.isArray(prepared.especialidades)) {
      prepared.especialidades = JSON.stringify(prepared.especialidades);
    }

    // Asegurar valores por defecto
    prepared.esta_disponible = prepared.esta_disponible !== false; // Default true
    prepared.tipo_tarifa = prepared.tipo_tarifa || 'hora';

    // Limpiar campos según tipo de tarifa
    if (prepared.tipo_tarifa === 'hora') {
      prepared.tarifa_servicio = null;
      prepared.tarifa_convenio = null;
    } else if (prepared.tipo_tarifa === 'servicio') {
      prepared.tarifa_hora = null;
      prepared.tarifa_convenio = null;
    } else if (prepared.tipo_tarifa === 'convenio') {
      prepared.tarifa_hora = null;
      prepared.tarifa_servicio = null;
    }

    return prepared;
  }

  /**
   * Extraer public ID de URL de Cloudinary
   */
  extractPublicIdFromUrl(url) {
    if (!url) return null;

    try {
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const publicId = fileName.split('.')[0];
      return `changanet/profiles/${publicId}`;
    } catch (error) {
      console.warn('Error extrayendo public ID:', error.message);
      return null;
    }
  }

  /**
   * Eliminar perfil profesional
   * Operación destructiva - usar con cuidado
   */
  async deleteProfessionalProfile(userId) {
    try {
      // Verificar que existe
      const profile = await prisma.perfiles_profesionales.findUnique({
        where: { usuario_id: userId }
      });

      if (!profile) {
        throw new Error('Perfil profesional no encontrado');
      }

      // Eliminar imágenes asociadas
      if (profile.url_foto_perfil) {
        try {
          const publicId = this.extractPublicIdFromUrl(profile.url_foto_perfil);
          if (publicId) await deleteImage(publicId);
        } catch (error) {
          console.warn('Error eliminando foto de perfil:', error.message);
        }
      }

      if (profile.url_foto_portada) {
        try {
          const publicId = this.extractPublicIdFromUrl(profile.url_foto_portada);
          if (publicId) await deleteImage(publicId);
        } catch (error) {
          console.warn('Error eliminando foto de portada:', error.message);
        }
      }

      // Eliminar perfil
      await prisma.perfiles_profesionales.delete({
        where: { usuario_id: userId }
      });

      // Invalidar caché
      await invalidateProfessionalProfile(userId);

      console.log(`✅ Perfil profesional eliminado para usuario ${userId}`);
      return { success: true, message: 'Perfil eliminado exitosamente' };

    } catch (error) {
      console.error('❌ Error eliminando perfil profesional:', error);
      throw error;
    }
  }
}

module.exports = new ProfessionalService();
