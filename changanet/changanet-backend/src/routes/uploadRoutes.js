// src/routes/uploadRoutes.js - Rutas para subida de archivos
const express = require('express');
const multer = require('multer');
const { uploadImage, uploadDocument } = require('../services/storageService');
const { authenticateToken } = require('../middleware/authenticate');

const router = express.Router();

// Configurar multer para memoria (sin guardar archivos localmente)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Tipos permitidos
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo imágenes JPG y PNG.'), false);
    }
  }
});

/**
 * POST /api/upload/image
 * Sube una imagen a Cloudinary
 */
router.post('/image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Imagen requerida',
        message: 'Debe proporcionar una imagen para subir'
      });
    }

    const result = await uploadImage(req.file.buffer, {
      folder: 'changanet/profiles',
      public_id: `profile_${req.user.id}_${Date.now()}`
    });

    res.status(200).json({
      success: true,
      message: 'Imagen subida exitosamente',
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height
      }
    });
  } catch (error) {
    console.error('Error subiendo imagen:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

/**
 * POST /api/upload/document
 * Sube un documento a Google Cloud Storage
 */
router.post('/document', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Documento requerido',
        message: 'Debe proporcionar un documento para subir'
      });
    }

    const fileName = await uploadDocument(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: 'Documento subido exitosamente',
      data: {
        fileName: fileName,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Error subiendo documento:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

module.exports = router;
