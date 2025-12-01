/**
 * Controlador para gestión de verificación de identidad.
 * Implementa sección 7.8 del PRD: Verificación de Identidad y Reputación
 * REQ-36: Subir documento de identidad
 * REQ-37: Mostrar insignia "Verificado"
 * REQ-40: Administradores aprueban/rechazan solicitudes
 * Maneja solicitudes de verificación, consultas de estado y operaciones administrativas.
 */

const verificationService = require('../services/verificationService');
const { uploadVerificationDocument, getSignedUrl, validateFile } = require('../services/storageService');
const { logDocumentAccess, logDocumentUpload, logVerificationApproval, logVerificationRejection } = require('../services/auditService');

/**
 * Solicita verificación de identidad confirmando subida de documento
 * REQ-36: Permite subir documento de identidad
 * Crea solicitud pendiente para revisión administrativa
 */
async function requestVerification(req, res) {
  try {
    const userId = req.user.id;
    const { fileKey } = req.body;

    if (!fileKey) {
      return res.status(400).json({
        error: 'Se requiere fileKey del documento subido'
      });
    }

    // Crear solicitud de verificación con referencia al archivo
    const verificationRequest = await verificationService.createVerificationRequestFromKey(
      userId,
      fileKey
    );

    // Registrar auditoría de subida de documento
    await logDocumentUpload(
      userId,
      fileKey,
      'application/octet-stream', // Tipo genérico ya que no lo tenemos aquí
      0, // Tamaño desconocido en este punto
      req.ip,
      req.get('User-Agent')
    );

    res.status(201).json({
      success: true,
      message: 'Solicitud de verificación enviada correctamente',
      data: {
        id: verificationRequest.id,
        estado: verificationRequest.estado,
        documento_url: verificationRequest.documento_url,
        creado_en: verificationRequest.creado_en
      }
    });
  } catch (error) {
    console.error('Error en requestVerification:', error);
    res.status(500).json({
      error: error.message || 'Error interno del servidor'
    });
  }
}

/**
 * Obtiene el estado de verificación del usuario actual
 */
async function getVerificationStatus(req, res) {
  try {
    const userId = req.user.id;
    const status = await verificationService.getVerificationStatus(userId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error en getVerificationStatus:', error);
    res.status(500).json({
      error: error.message || 'Error interno del servidor'
    });
  }
}

/**
 * Lista todas las solicitudes de verificación pendientes (solo administradores)
 */
async function getPendingVerifications(req, res) {
  try {
    // Verificar que el usuario sea administrador
    if (req.user.rol !== 'admin') {
      return res.status(403).json({
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      });
    }

    const requests = await verificationService.getPendingVerifications();

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Error en getPendingVerifications:', error);
    res.status(500).json({
      error: error.message || 'Error interno del servidor'
    });
  }
}

/**
 * Aprueba una solicitud de verificación (solo administradores)
 * REQ-37: Otorga insignia "Verificado" al aprobar
 * REQ-40: Administradores pueden aprobar solicitudes
 */
async function approveVerification(req, res) {
  try {
    // Verificar que el usuario sea administrador
    if (req.user.rol !== 'admin') {
      return res.status(403).json({
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      });
    }

    const { id } = req.params;
    const { comentario } = req.body;
    const adminId = req.user.id;

    const result = await verificationService.approveVerification(id, adminId, comentario);

    // Registrar auditoría
    await logVerificationApproval(
      adminId,
      id,
      comentario,
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Verificación aprobada correctamente',
      data: result
    });
  } catch (error) {
    console.error('Error en approveVerification:', error);
    res.status(500).json({
      error: error.message || 'Error interno del servidor'
    });
  }
}

/**
 * Rechaza una solicitud de verificación (solo administradores)
 */
async function rejectVerification(req, res) {
  try {
    // Verificar que el usuario sea administrador
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      });
    }

    const { id } = req.params;
    const { comentario } = req.body;
    const adminId = req.user.id;

    if (!comentario || comentario.trim() === '') {
      return res.status(400).json({
        error: 'Se requiere un comentario explicando el rechazo'
      });
    }

    const result = await verificationService.rejectVerification(id, adminId, comentario);

    // Registrar auditoría
    await logVerificationRejection(
      adminId,
      id,
      comentario,
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Verificación rechazada correctamente',
      data: result
    });
  } catch (error) {
    console.error('Error en rejectVerification:', error);
    res.status(500).json({
      error: error.message || 'Error interno del servidor'
    });
  }
}

/**
 * Obtiene URL firmada para acceder a un documento de verificación
 * Solo el propietario del documento o administradores pueden acceder
 */
async function getDocumentUrl(req, res) {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    // Verificar que el usuario tenga acceso al documento
    const request = await require('../services/verificationService').getVerificationStatus(userId);

    if (!request || request.id !== requestId) {
      // Si no es el propietario, verificar si es admin
      if (req.user.rol !== 'admin') {
        return res.status(403).json({
          error: 'No tienes permisos para acceder a este documento'
        });
      }
    }

    // Obtener URL firmada
    const signedUrl = await getSignedUrl(request.documento_url);

    // Registrar auditoría de acceso al documento
    await logDocumentAccess(
      userId,
      requestId,
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      signedUrl: signedUrl,
      expiresIn: '15 minutos'
    });
  } catch (error) {
    console.error('Error obteniendo URL del documento:', error);
    res.status(500).json({
      error: error.message || 'Error interno del servidor'
    });
  }
}

module.exports = {
  requestVerification,
  getVerificationStatus,
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  getDocumentUrl
};
