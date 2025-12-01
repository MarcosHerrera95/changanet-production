/**
 * Middleware de autorización para acceso a documentos de verificación
 * Verifica que el usuario tenga permisos para acceder a documentos específicos
 */

const { PrismaClient } = require('@prisma/client');
const { logSecurityFailure } = require('../services/auditService');

const prisma = new PrismaClient();

/**
 * Middleware que verifica si el usuario puede acceder a un documento de verificación
 * Solo el propietario del documento o administradores pueden acceder
 */
const canAccessVerificationDocument = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.rol;
    const { requestId } = req.params;

    if (!userId) {
      await logSecurityFailure(
        null,
        'access_document',
        'verification_request',
        requestId,
        'Usuario no autenticado',
        req.ip,
        req.get('User-Agent')
      );
      return res.status(401).json({
        error: 'Usuario no autenticado'
      });
    }

    // Buscar la solicitud de verificación
    const verificationRequest = await prisma.verification_requests.findUnique({
      where: { id: requestId },
      select: {
        usuario_id: true,
        estado: true
      }
    });

    if (!verificationRequest) {
      await logSecurityFailure(
        userId,
        'access_document',
        'verification_request',
        requestId,
        'Solicitud de verificación no encontrada',
        req.ip,
        req.get('User-Agent')
      );
      return res.status(404).json({
        error: 'Documento no encontrado'
      });
    }

    // Verificar permisos de acceso
    const isOwner = verificationRequest.usuario_id === userId;
    const isAdmin = userRole === 'admin';
    const isApproved = verificationRequest.estado === 'aprobado';

    // Solo propietarios pueden ver sus propios documentos
    // Administradores pueden ver todos los documentos para revisión
    if (!isOwner && !isAdmin) {
      await logSecurityFailure(
        userId,
        'access_document',
        'verification_request',
        requestId,
        'Acceso denegado: no es propietario ni administrador',
        req.ip,
        req.get('User-Agent')
      );
      return res.status(403).json({
        error: 'No tienes permisos para acceder a este documento'
      });
    }

    // Si no es admin y el documento no está aprobado, verificar que sea el propietario
    if (!isAdmin && !isApproved && !isOwner) {
      await logSecurityFailure(
        userId,
        'access_document',
        'verification_request',
        requestId,
        'Acceso denegado: documento no aprobado',
        req.ip,
        req.get('User-Agent')
      );
      return res.status(403).json({
        error: 'No tienes permisos para acceder a este documento'
      });
    }

    // Adjuntar información del documento al request para uso posterior
    req.verificationDocument = {
      ownerId: verificationRequest.usuario_id,
      status: verificationRequest.estado,
      isOwner,
      isAdmin
    };

    next();
  } catch (error) {
    console.error('Error en middleware de autorización de documento:', error);
    await logSecurityFailure(
      req.user?.id,
      'access_document',
      'verification_request',
      req.params?.requestId,
      `Error en middleware: ${error.message}`,
      req.ip,
      req.get('User-Agent')
    );
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Middleware que verifica si el usuario puede revisar solicitudes de verificación
 * Solo administradores pueden listar y gestionar solicitudes
 */
const canReviewVerifications = async (req, res, next) => {
  try {
    const userRole = req.user?.rol;

    if (userRole !== 'admin') {
      await logSecurityFailure(
        req.user?.id,
        'review_verifications',
        'verification_request',
        'bulk',
        'Acceso denegado: no es administrador',
        req.ip,
        req.get('User-Agent')
      );
      return res.status(403).json({
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      });
    }

    next();
  } catch (error) {
    console.error('Error en middleware de revisión de verificaciones:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Middleware que verifica si el usuario puede gestionar reputación
 * Propietarios pueden ver su propia reputación, administradores pueden gestionar todas
 */
const canAccessReputation = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.rol;
    const targetUserId = req.params?.userId || req.body?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Usuario no autenticado'
      });
    }

    // Verificar si está accediendo a su propia reputación o es admin
    const isOwner = targetUserId === userId;
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isAdmin) {
      await logSecurityFailure(
        userId,
        'access_reputation',
        'reputation_score',
        targetUserId,
        'Acceso denegado: no es propietario ni administrador',
        req.ip,
        req.get('User-Agent')
      );
      return res.status(403).json({
        error: 'No tienes permisos para acceder a la reputación de este usuario'
      });
    }

    // Adjuntar información de permisos al request
    req.reputationAccess = {
      targetUserId,
      isOwner,
      isAdmin
    };

    next();
  } catch (error) {
    console.error('Error en middleware de acceso a reputación:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

module.exports = {
  canAccessVerificationDocument,
  canReviewVerifications,
  canAccessReputation
};
