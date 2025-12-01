/**
 * Servicio de verificación de identidad para profesionales.
 * Implementa sección 7.8 del PRD: Verificación de Identidad y Reputación
 * REQ-36: Subida de documentos de identidad
 * REQ-37: Otorgamiento de insignia "Verificado"
 * REQ-40: Gestión administrativa de solicitudes
 * Gestiona solicitudes de verificación, subida de documentos y aprobación/rechazo manual.
 */

const { PrismaClient } = require('@prisma/client');
const { storageService } = require('./storageService');
const { get, set, del } = require('./cacheService');

const prisma = new PrismaClient();

/**
 * Invalida el caché de estado de verificación para un usuario
 * @param {string} userId - ID del usuario
 */
async function invalidateVerificationCache(userId) {
  try {
    await del(`verification:status:${userId}`);
  } catch (error) {
    console.error('Error invalidando caché de verificación:', error);
  }
}

/**
 * Crea una nueva solicitud de verificación de identidad
 * @param {string} userId - ID del usuario profesional
 * @param {Buffer} documentBuffer - Buffer del documento
 * @param {string} documentName - Nombre original del archivo
 * @param {string} mimeType - Tipo MIME del archivo
 * @returns {Object} Solicitud de verificación creada
 */
async function createVerificationRequest(userId, documentBuffer, documentName, mimeType) {
  try {
    // Verificar que el usuario existe y es profesional
    const user = await prisma.usuarios.findUnique({
      where: { id: userId },
      include: { perfil_profesional: true }
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    if (user.rol !== 'profesional') {
      throw new Error('Solo los profesionales pueden solicitar verificación');
    }

    // Verificar que no tenga una solicitud pendiente o aprobada
    const existingRequest = await prisma.verification_requests.findUnique({
      where: { usuario_id: userId }
    });

    if (existingRequest && existingRequest.estado === 'aprobado') {
      throw new Error('El usuario ya está verificado');
    }

    if (existingRequest && existingRequest.estado === 'pendiente') {
      throw new Error('Ya existe una solicitud de verificación pendiente');
    }

    // Subir documento a Cloudinary/Firebase
    const documentUrl = await storageService.uploadDocument(documentBuffer, documentName, mimeType, userId);

    // Crear solicitud de verificación
    const verificationRequest = await prisma.verification_requests.create({
      data: {
        usuario_id: userId,
        documento_url: documentUrl,
        estado: 'pendiente'
      }
    });

    // Actualizar estado en perfil profesional
    await prisma.perfiles_profesionales.update({
      where: { usuario_id: userId },
      data: {
        estado_verificacion: 'pendiente',
        url_documento_verificacion: documentUrl
      }
    });

    return verificationRequest;
  } catch (error) {
    console.error('Error creando solicitud de verificación:', error);
    throw error;
  }
}

/**
 * Crea una nueva solicitud de verificación usando fileKey de GCS
 * @param {string} userId - ID del usuario profesional
 * @param {string} fileKey - Clave del archivo en GCS
 * @returns {Object} Solicitud de verificación creada
 */
async function createVerificationRequestFromKey(userId, fileKey) {
  try {
    // Verificar que el usuario existe y es profesional
    const user = await prisma.usuarios.findUnique({
      where: { id: userId },
      include: { perfil_profesional: true }
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    if (user.rol !== 'profesional') {
      throw new Error('Solo los profesionales pueden solicitar verificación');
    }

    // Verificar que no tenga una solicitud pendiente o aprobada
    const existingRequest = await prisma.verification_requests.findUnique({
      where: { usuario_id: userId }
    });

    if (existingRequest && existingRequest.estado === 'aprobado') {
      throw new Error('El usuario ya está verificado');
    }

    if (existingRequest && existingRequest.estado === 'pendiente') {
      throw new Error('Ya existe una solicitud de verificación pendiente');
    }

    // Usar fileKey como URL del documento (para GCS)
    const documentUrl = fileKey; // En GCS, la clave del archivo sirve como identificador

    // Crear solicitud de verificación
    const verificationRequest = await prisma.verification_requests.create({
      data: {
        usuario_id: userId,
        documento_url: documentUrl,
        estado: 'pendiente'
      }
    });

    // Actualizar estado en perfil profesional
    await prisma.perfiles_profesionales.update({
      where: { usuario_id: userId },
      data: {
        estado_verificacion: 'pendiente',
        url_documento_verificacion: documentUrl
      }
    });

    // Invalidar caché
    await invalidateVerificationCache(userId);

    return verificationRequest;
  } catch (error) {
    console.error('Error creando solicitud de verificación desde key:', error);
    throw error;
  }
}

/**
 * Obtiene el estado de verificación de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Object} Estado de verificación
 */
async function getVerificationStatus(userId) {
  try {
    const cacheKey = `verification:status:${userId}`;

    // Intentar obtener del caché
    const cachedStatus = await get(cacheKey);
    if (cachedStatus) {
      return JSON.parse(cachedStatus);
    }

    const request = await prisma.verification_requests.findUnique({
      where: { usuario_id: userId }
    });

    let status;
    if (!request) {
      status = {
        estado: 'no_solicitado',
        documento_url: null,
        comentario_admin: null,
        creado_en: null,
        revisado_en: null
      };
    } else {
      status = {
        id: request.id,
        estado: request.estado,
        documento_url: request.documento_url,
        comentario_admin: request.comentario_admin,
        creado_en: request.creado_en,
        revisado_en: request.revisado_en,
        revisado_por: request.revisado_por
      };
    }

    // Cachear por 10 minutos
    await set(cacheKey, JSON.stringify(status), 600);

    return status;
  } catch (error) {
    console.error('Error obteniendo estado de verificación:', error);
    throw error;
  }
}

/**
 * Lista todas las solicitudes de verificación pendientes (para administradores)
 * @returns {Array} Lista de solicitudes pendientes
 */
async function getPendingVerifications() {
  try {
    const requests = await prisma.verification_requests.findMany({
      where: { estado: 'pendiente' },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            perfil_profesional: {
              select: {
                especialidad: true,
                zona_cobertura: true
              }
            }
          }
        }
      },
      orderBy: { creado_en: 'asc' }
    });

    return requests;
  } catch (error) {
    console.error('Error obteniendo verificaciones pendientes:', error);
    throw error;
  }
}

/**
 * Aprueba una solicitud de verificación
 * @param {string} requestId - ID de la solicitud
 * @param {string} adminId - ID del administrador
 * @param {string} comentario - Comentario opcional
 * @returns {Object} Solicitud aprobada
 */
async function approveVerification(requestId, adminId, comentario = null) {
  try {
    const request = await prisma.verification_requests.findUnique({
      where: { id: requestId },
      include: { usuario: true }
    });

    if (!request) {
      throw new Error('Solicitud de verificación no encontrada');
    }

    if (request.estado !== 'pendiente') {
      throw new Error('La solicitud ya fue procesada');
    }

    // Actualizar solicitud
    const updatedRequest = await prisma.verification_requests.update({
      where: { id: requestId },
      data: {
        estado: 'aprobado',
        comentario_admin: comentario,
        revisado_en: new Date(),
        revisado_por: adminId
      }
    });

    // Actualizar perfil profesional
    await prisma.perfiles_profesionales.update({
      where: { usuario_id: request.usuario_id },
      data: {
        estado_verificacion: 'verificado',
        verificado_en: new Date()
      }
    });

    // Actualizar usuario
    await prisma.usuarios.update({
      where: { id: request.usuario_id },
      data: { esta_verificado: true }
    });

    // Invalidar caché
    await invalidateVerificationCache(request.usuario_id);

    return updatedRequest;
  } catch (error) {
    console.error('Error aprobando verificación:', error);
    throw error;
  }
}

/**
 * Rechaza una solicitud de verificación
 * @param {string} requestId - ID de la solicitud
 * @param {string} adminId - ID del administrador
 * @param {string} comentario - Comentario explicando el rechazo
 * @returns {Object} Solicitud rechazada
 */
async function rejectVerification(requestId, adminId, comentario) {
  try {
    const request = await prisma.verification_requests.findUnique({
      where: { id: requestId },
      include: { usuario: true }
    });

    if (!request) {
      throw new Error('Solicitud de verificación no encontrada');
    }

    if (request.estado !== 'pendiente') {
      throw new Error('La solicitud ya fue procesada');
    }

    if (!comentario || comentario.trim() === '') {
      throw new Error('Se requiere un comentario para rechazar la verificación');
    }

    // Actualizar solicitud
    const updatedRequest = await prisma.verification_requests.update({
      where: { id: requestId },
      data: {
        estado: 'rechazado',
        comentario_admin: comentario,
        revisado_en: new Date(),
        revisado_por: adminId
      }
    });

    // Actualizar perfil profesional
    await prisma.perfiles_profesionales.update({
      where: { usuario_id: request.usuario_id },
      data: {
        estado_verificacion: 'rechazado'
      }
    });

    // Invalidar caché
    await invalidateVerificationCache(request.usuario_id);

    return updatedRequest;
  } catch (error) {
    console.error('Error rechazando verificación:', error);
    throw error;
  }
}

module.exports = {
  createVerificationRequest,
  createVerificationRequestFromKey,
  getVerificationStatus,
  getPendingVerifications,
  approveVerification,
  rejectVerification
};
