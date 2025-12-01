// src/routes/galleryRoutes.js
const express = require('express');
const galleryController = require('../controllers/galleryController');

// Configurar multer para subida de imágenes de galería
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(), // Almacenar en memoria para procesar con Cloudinary
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Validar tipos de archivo permitidos
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se aceptan imágenes (JPG, PNG).'), false);
    }
  }
});

const router = express.Router();

// Obtener galería de trabajos de un profesional (público)
router.get('/:professionalId', galleryController.getGallery);

// Agregar imagen a la galería (solo profesionales autenticados)
router.post('/', upload.single('imagen'), galleryController.addGalleryImage);

// Eliminar imagen de la galería (solo el propietario)
router.delete('/:imageId', galleryController.deleteGalleryImage);

module.exports = router;
