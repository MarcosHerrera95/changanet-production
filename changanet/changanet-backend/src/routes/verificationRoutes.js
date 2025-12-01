/**
 * Rutas para el sistema de verificación de identidad.
 * Implementa sección 7.8 del PRD: Verificación de Identidad y Reputación
 * Define endpoints para solicitudes de verificación y gestión administrativa.
 */

const express = require('express');
const verificationController = require('../controllers/verificationController');
const { authenticateToken } = require('../middleware/authenticate');
const { canAccessVerificationDocument, canReviewVerifications } = require('../middleware/verificationAuth');
const { uploadVerificationDocument, generatePresignedUploadUrl } = require('../services/storageService');

// Configurar multer para subida de archivos con validación estricta
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(), // Almacenar en memoria para procesar con Cloudinary
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo (estrictamente aplicado)
    files: 1, // Solo un archivo por solicitud
    fields: 0, // No permitir campos adicionales
  },
  fileFilter: (req, file, cb) => {
    // Validación estricta de tipos MIME permitidos
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

    // Verificar MIME type
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Tipo de archivo no permitido. Solo se aceptan JPG, PNG y PDF.'), false);
    }

    // Verificar extensión del archivo
    const fileExtension = require('path').extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return cb(new Error('Extensión de archivo no permitida. Solo se aceptan .jpg, .jpeg, .png, .pdf'), false);
    }

    // Verificar que el nombre del archivo no contenga caracteres peligrosos
    const dangerousChars = /[<>"\\/|?*]/;
    if (dangerousChars.test(file.originalname) || file.originalname.length > 255) {
      return cb(new Error('Nombre de archivo no válido o demasiado largo.'), false);
    }

    cb(null, true);
  }
});

const router = express.Router();

// POST /api/verification
// Solicitar verificación de identidad (solo profesionales) - Nuevo flujo con presigned URLs
router.post('/', authenticateToken, verificationController.requestVerification);

// GET /api/verification/status
// Obtener estado de verificación del usuario actual
router.get('/status', authenticateToken, verificationController.getVerificationStatus);

// PUT /api/verification/:id/approve
// Aprobar solicitud de verificación (solo administradores)
router.put('/:id/approve', authenticateToken, canReviewVerifications, verificationController.approveVerification);

// PUT /api/verification/:id/reject
// Rechazar solicitud de verificación (solo administradores)
router.put('/:id/reject', authenticateToken, canReviewVerifications, verificationController.rejectVerification);

// GET /api/admin/verification-requests
// Listar solicitudes pendientes (solo administradores)
router.get('/admin/verification-requests', authenticateToken, canReviewVerifications, verificationController.getPendingVerifications);

// GET /api/verification/presigned-url
// Obtener URL presignada para subida de documento (60-120s expiración)
router.post('/presigned-url', authenticateToken, async (req, res) => {
  try {
    const { fileName, mimeType } = req.body;
    const userId = req.user.id;

    if (!fileName || !mimeType) {
      return res.status(400).json({
        error: 'Se requieren fileName y mimeType'
      });
    }

    const presignedData = await generatePresignedUploadUrl(userId, fileName, mimeType);

    res.json({
      success: true,
      data: presignedData
    });
  } catch (error) {
    console.error('Error generando URL presignada:', error);
    res.status(500).json({
      error: error.message || 'Error interno del servidor'
    });
  }
});

// GET /api/verification/:requestId/document
// Obtener URL firmada para acceder al documento (usuario propietario o admin)
router.get('/:requestId/document', authenticateToken, canAccessVerificationDocument, verificationController.getDocumentUrl);

module.exports = router;
