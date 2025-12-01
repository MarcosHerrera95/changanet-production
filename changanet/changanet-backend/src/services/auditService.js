/**
 * Servicio de auditoría para registro de operaciones de seguridad
 * Implementa logging completo con Winston y base de datos para verificación de identidad y reputación
 * Cumple con requisitos de auditoría y cumplimiento de datos
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();

/**
 * Registra un evento de auditoría en Winston y base de datos
 * @param {Object} auditData - Datos del evento de auditoría
 */
async function logAuditEvent(auditData) {
  try {
    const {
      usuario_id,
      accion,
      entidad_tipo,
      entidad_id,
      detalles,
      ip_address,
      user_agent,
      exito = true,
      error_mensaje
    } = auditData;

    // Loggear con Winston
    const logLevel = exito ? 'info' : 'warn';
    const message = `Audit: ${accion} on ${entidad_tipo}:${entidad_id} by user ${usuario_id || 'system'}`;

    logger[logLevel](message, {
      service: 'audit',
      userId: usuario_id,
      action: accion,
      entityType: entidad_tipo,
      entityId: entidad_id,
      success: exito,
      error: error_mensaje,
      ip: ip_address,
      userAgent: user_agent,
      details: detalles
    });

    // Guardar en base de datos
    await prisma.audit_logs.create({
      data: {
        usuario_id,
        accion,
        entidad_tipo,
        entidad_id,
        detalles: detalles ? JSON.stringify(detalles) : null,
        ip_address,
        user_agent,
        exito,
        error_mensaje
      }
    });

  } catch (error) {
    // Si falla el logging de auditoría, loggear el error pero no fallar la operación
    console.error('Error en logAuditEvent:', error);
    logger.error('Failed to log audit event', {
      service: 'audit',
      error: error.message,
      auditData
    });
  }
}

/**
 * Registra acceso a documento de verificación
 * @param {string} userId - ID del usuario que accede
 * @param {string} requestId - ID de la solicitud de verificación
 * @param {string} ipAddress - IP del cliente
 * @param {string} userAgent - User agent del navegador
 */
async function logDocumentAccess(userId, requestId, ipAddress, userAgent) {
  await logAuditEvent({
    usuario_id: userId,
    accion: 'access_document',
    entidad_tipo: 'verification_request',
    entidad_id: requestId,
    detalles: { access_type: 'view' },
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

/**
 * Registra subida de documento de verificación
 * @param {string} userId - ID del usuario que sube
 * @param {string} fileKey - Clave del archivo en GCS
 * @param {string} mimeType - Tipo MIME del archivo
 * @param {number} fileSize - Tamaño del archivo
 * @param {string} ipAddress - IP del cliente
 * @param {string} userAgent - User agent del navegador
 */
async function logDocumentUpload(userId, fileKey, mimeType, fileSize, ipAddress, userAgent) {
  await logAuditEvent({
    usuario_id: userId,
    accion: 'upload_document',
    entidad_tipo: 'verification_request',
    entidad_id: fileKey,
    detalles: {
      mime_type: mimeType,
      file_size: fileSize,
      storage: 'gcs'
    },
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

/**
 * Registra aprobación de verificación
 * @param {string} adminId - ID del administrador
 * @param {string} requestId - ID de la solicitud
 * @param {string} comentario - Comentario del administrador
 * @param {string} ipAddress - IP del cliente
 * @param {string} userAgent - User agent del navegador
 */
async function logVerificationApproval(adminId, requestId, comentario, ipAddress, userAgent) {
  await logAuditEvent({
    usuario_id: adminId,
    accion: 'approve_verification',
    entidad_tipo: 'verification_request',
    entidad_id: requestId,
    detalles: {
      comentario,
      decision: 'approved'
    },
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

/**
 * Registra rechazo de verificación
 * @param {string} adminId - ID del administrador
 * @param {string} requestId - ID de la solicitud
 * @param {string} comentario - Comentario del administrador
 * @param {string} ipAddress - IP del cliente
 * @param {string} userAgent - User agent del navegador
 */
async function logVerificationRejection(adminId, requestId, comentario, ipAddress, userAgent) {
  await logAuditEvent({
    usuario_id: adminId,
    accion: 'reject_verification',
    entidad_tipo: 'verification_request',
    entidad_id: requestId,
    detalles: {
      comentario,
      decision: 'rejected'
    },
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

/**
 * Registra acceso a información de reputación
 * @param {string} userId - ID del usuario que accede
 * @param {string} targetUserId - ID del usuario cuya reputación se consulta
 * @param {string} ipAddress - IP del cliente
 * @param {string} userAgent - User agent del navegador
 */
async function logReputationAccess(userId, targetUserId, ipAddress, userAgent) {
  await logAuditEvent({
    usuario_id: userId,
    accion: 'view_reputation',
    entidad_tipo: 'reputation_score',
    entidad_id: targetUserId,
    detalles: { access_type: 'view' },
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

/**
 * Registra actualización de reputación
 * @param {string} userId - ID del usuario que actualiza
 * @param {string} targetUserId - ID del usuario cuya reputación se actualiza
 * @param {Object} metrics - Métricas calculadas
 * @param {string} ipAddress - IP del cliente
 * @param {string} userAgent - User agent del navegador
 */
async function logReputationUpdate(userId, targetUserId, metrics, ipAddress, userAgent) {
  await logAuditEvent({
    usuario_id: userId,
    accion: 'update_reputation',
    entidad_tipo: 'reputation_score',
    entidad_id: targetUserId,
    detalles: {
      metrics,
      update_type: userId === targetUserId ? 'self' : 'admin'
    },
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

/**
 * Registra fallo de operación de seguridad
 * @param {string} userId - ID del usuario (opcional)
 * @param {string} action - Acción que falló
 * @param {string} entityType - Tipo de entidad
 * @param {string} entityId - ID de la entidad
 * @param {string} errorMessage - Mensaje de error
 * @param {string} ipAddress - IP del cliente
 * @param {string} userAgent - User agent del navegador
 */
async function logSecurityFailure(userId, action, entityType, entityId, errorMessage, ipAddress, userAgent) {
  await logAuditEvent({
    usuario_id: userId,
    accion: action,
    entidad_tipo: entityType,
    entidad_id: entityId,
    detalles: { failure_reason: errorMessage },
    ip_address: ipAddress,
    user_agent: userAgent,
    exito: false,
    error_mensaje: errorMessage
  });
}

/**
 * Registra acción administrativa
 * @param {Object} adminActionData - Datos de la acción administrativa
 */
async function logAdminAction(adminActionData) {
  const {
    adminId,
    accion,
    modulo,
    entidad_tipo,
    entidad_id,
    descripcion,
    detalles,
    exito = true,
    error_mensaje
  } = adminActionData;

  // Extraer ip y userAgent de detalles si están presentes
  const { ip, userAgent, ...otherDetalles } = detalles || {};

  await logAuditEvent({
    usuario_id: adminId,
    accion,
    entidad_tipo,
    entidad_id,
    detalles: {
      modulo,
      descripcion,
      ...otherDetalles
    },
    ip_address: ip,
    user_agent: userAgent,
    exito,
    error_mensaje
  });
}

module.exports = {
  logAuditEvent,
  logDocumentAccess,
  logDocumentUpload,
  logVerificationApproval,
  logVerificationRejection,
  logReputationAccess,
  logReputationUpdate,
  logSecurityFailure,
  logAdminAction
};
