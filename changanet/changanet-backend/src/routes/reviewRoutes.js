// src/routes/reviewRoutes.js
// Rutas para sistema de reseñas y valoraciones
// Implementa sección 7.5 del PRD: Sistema de Reseñas y Valoraciones
//
// FUNCIONALIDADES IMPLEMENTADAS:
// - Creación de reseñas con validación completa
// - Subida de imágenes del servicio finalizado
// - Obtención de reseñas por profesional
// - Estadísticas detalladas de reseñas
// - Verificación de elegibilidad para reseñar
// - Obtención de reseñas del cliente autenticado
//
// CONFIGURACIÓN MULTER:
// - Límite de archivo: 5MB
// - Solo archivos de imagen
// - Almacenamiento temporal antes de subir a Cloudinary
//
// ENDPOINTS:
// POST /api/reviews - Crear reseña (autenticado, multipart/form-data)
// GET /api/reviews/professional/:id - Obtener reseñas de profesional
// GET /api/reviews/professional/:id/stats - Estadísticas de reseñas
// GET /api/reviews/check/:servicioId - Verificar elegibilidad (autenticado)
// GET /api/reviews/client - Obtener reseñas del cliente (autenticado)

const express = require('express');
const multer = require('multer');
const { createReview, getReviewsByProfessional, getReviewStats, checkReviewEligibility } = require('../controllers/reviewController');
const { authenticateToken } = require('../middleware/authenticate');
const { reviewRateLimit } = require('../middleware/reviewRateLimit');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Make sure this directory exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.mimetype.split('/')[1]);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

router.post('/', authenticateToken, reviewRateLimit, upload.single('url_foto'), createReview);
router.get('/professional/:professionalId', getReviewsByProfessional);
router.get('/professional/:professionalId/stats', getReviewStats);
router.get('/check/:servicioId', checkReviewEligibility);

// Obtener reseñas escritas por el cliente autenticado
router.get('/client', authenticateToken, async (req, res) => {
  try {
    const { id: clientId } = req.user;

    const reviews = await prisma.resenas.findMany({
      where: { cliente_id: clientId },
      include: {
        servicio: {
          include: {
            profesional: {
              select: {
                id: true,
                nombre: true,
                email: true,
                perfil_profesional: {
                  select: {
                    especialidad: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { creado_en: 'desc' }
    });

    res.json({ reviews });
  } catch (error) {
    console.error('Error al obtener reseñas del cliente:', error);
    res.status(500).json({ error: 'Error al obtener reseñas del cliente' });
  }
});

module.exports = router;
