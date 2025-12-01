/**
 * Rutas para gestión de profesionales
 * Implementa endpoints REST completos para Gestión de Perfiles Profesionales
 * REQ-06 a REQ-15 según PRD
 */

const express = require('express');
const multer = require('multer');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { authenticateToken } = require('../middleware/authenticate');
const { validateProfessionalProfile, validatePhotoUpload, validateImageFile } = require('../middleware/validation');
const {
  createProfessional,
  updateProfessional,
  uploadProfilePhoto,
  getProfessionals,
  getProfessionalById
} = require('../controllers/professionalController');

const router = express.Router();

// Configuraciones de rate limiting específicas para profesionales
const createProfileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3, // Máximo 3 creaciones de perfil por usuario
  message: {
    error: 'Demasiados intentos de creación de perfil. Inténtalo de nuevo en 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const updateProfileLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // Máximo 10 actualizaciones por usuario
  message: {
    error: 'Demasiadas actualizaciones de perfil. Inténtalo de nuevo en 5 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const uploadPhotoLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 5, // Máximo 5 subidas de foto por usuario
  message: {
    error: 'Demasiadas subidas de fotos. Inténtalo de nuevo en 10 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const searchProfessionalsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // Máximo 30 búsquedas por IP/minuto
  message: {
    error: 'Demasiadas búsquedas. Inténtalo de nuevo en un minuto.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const getProfileLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 50, // Máximo 50 consultas de perfil por IP/minuto
  message: {
    error: 'Demasiadas consultas de perfil. Inténtalo de nuevo en un minuto.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Configuración de multer para subida de imágenes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

// Middleware condicional para subida de archivos
const conditionalUpload = (req, res, next) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    return upload.single('foto')(req, res, next);
  }
  next();
};

// Crear nuevo perfil profesional
// POST /api/professionals
// REQ-06 a REQ-10: Creación completa de perfil con validaciones
router.post('/',
  authenticateToken,
  createProfileLimiter,
  validateProfessionalProfile,
  createProfessional
);

// Actualizar perfil profesional específico
// PUT /api/professionals/:id
// REQ-06 a REQ-10: Actualización con validaciones y permisos
router.put('/:id',
  authenticateToken,
  updateProfileLimiter,
  validateProfessionalProfile,
  updateProfessional
);

// Subir foto de perfil o portada
// POST /api/professionals/upload-photo
// REQ-06: Gestión de imágenes con Cloudinary
router.post('/upload-photo',
  authenticateToken,
  uploadPhotoLimiter,
  conditionalUpload,
  uploadProfilePhoto
);

// Obtener todos los profesionales con filtros y ordenamiento
// GET /api/professionals?zona_cobertura=Palermo&especialidad=plomero&precio_min=100&precio_max=500&sort_by=calificacion_promedio&page=1&limit=10
// REQ-11 a REQ-15: Búsqueda y filtrado avanzado
router.get('/', searchProfessionalsLimiter, getProfessionals);

// Obtener profesional específico por ID
// GET /api/professionals/:id
// REQ-07, REQ-09: Perfil público para clientes (requiere autenticación)
router.get('/:id', authenticateToken, getProfileLimiter, getProfessionalById);

module.exports = router;
