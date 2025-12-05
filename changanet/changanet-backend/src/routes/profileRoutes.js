// src/routes/profileRoutes.js
// FUNCIÓN: Define los endpoints para la visualización y actualización de perfiles de profesionales.
// RELACIÓN PRD: Sección 7.2 Gestión de Perfiles Profesionales
//
// REQUERIMIENTOS FUNCIONALES COMPLETAMENTE IMPLEMENTADOS:
// REQ-06: Subir foto de perfil y portada - ✅ Implementado (con Cloudinary, campos separados)
// REQ-07: Seleccionar especialidades - ✅ Implementado (múltiples especialidades con array JSON)
// REQ-08: Ingresar años de experiencia - ✅ Implementado
// REQ-09: Definir zona de cobertura geográfica - ✅ Implementado (con coordenadas GPS)
// REQ-10: Indicar tarifas flexibles - ✅ Implementado (hora, servicio, convenio)
//
// CARACTERÍSTICAS ADICIONALES:
// - Sistema de especialidades múltiples
// - Tipos de tarifa flexibles con validación
// - Foto de perfil y portada separadas
// - Campo de disponibilidad general
// - Middleware multer condicional para subida de imágenes
//
// TARJETA BACKEND: Tarjeta 2: [Backend] Implementar API para Gestión de Perfiles Profesionales.
// SPRINT: Sprint 1 (Primera Entrega) - "Implementación del producto de software".

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/authenticate');
const multer = require('multer');
// Importar los controladores que contienen la lógica de negocio para obtener y actualizar perfiles.
const { getProfile, updateProfile } = require('../controllers/profileController');

const prisma = new PrismaClient();

// Configurar multer para subida de imágenes
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB límite
  },
  fileFilter: (req, file, cb) => {
    // Solo permitir imágenes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

// Middleware que aplica multer solo si hay archivos
const conditionalUpload = (req, res, next) => {
  // Si el Content-Type es multipart/form-data, aplicar multer
  if (req.headers['content-type'] && req.headers['content-type'].startsWith('multipart/form-data')) {
    console.log('🔍 Aplicando multer para subida de archivo, esperando campo "foto"');
    return upload.single('foto')(req, res, next); // Campo genérico 'foto'
  }
  // Si no es multipart, continuar sin multer
  next();
};

// Crear un enrutador de Express para agrupar las rutas relacionadas con los perfiles.
const router = express.Router();

// Definir la ruta GET para obtener el perfil propio (autenticado).
// Esta ruta está protegida y devuelve el perfil del usuario autenticado.
router.get('/', authenticateToken, async (req, res) => {
  console.log('Profile route hit for user:', req.user?.id);
  const { userId } = req.user;

  try {
    if (req.user.role === 'profesional') {
      const profile = await prisma.perfiles_profesionales.findUnique({
        where: { usuario_id: userId },
        include: { usuario: { select: { nombre: true, email: true, telefono: true } } }
      });

      if (!profile) {
        // Return default profile data for professionals without profile
        return res.status(200).json({
          perfil: {
            usuario_id: userId,
            especialidad: null,
            descripcion: '',
            experiencia_anios: 0,
            tarifa_hora: 0,
            zona_cobertura: '',
            calificacion_promedio: 0,
            esta_disponible: true
          },
          usuario: {
            nombre: req.user.nombre,
            email: req.user.email,
            telefono: req.user.telefono
          }
        });
      }
      // Separar usuario y perfil para compatibilidad frontend
      const { usuario, ...perfilData } = profile;
      res.status(200).json({ perfil: perfilData, usuario });
    } else {
      // Para clientes, devolver info básica del usuario incluyendo foto de perfil
      const user = await prisma.usuarios.findUnique({
        where: { id: userId },
        select: { id: true, nombre: true, email: true, telefono: true, rol: true, url_foto_perfil: true, direccion: true, preferencias_servicio: true }
      });
      res.status(200).json({ usuario: user });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el perfil.' });
  }
});

// Definir la ruta GET para obtener el perfil público de un profesional.
// REQ-07, REQ-09: El cliente enviará una solicitud GET a /api/profile/123, donde "123" es el ID del profesional.
// Esta ruta es pública y no requiere autenticación.
router.get('/:professionalId', getProfile);

// Note: The authenticated route for own profile is defined above without :professionalId

// Definir la ruta PUT para actualizar perfil (profesional o cliente).
// REQ-08, REQ-10: Los usuarios enviarán una solicitud PUT a /api/profile con los datos actualizados en el cuerpo.
// Esta ruta está protegida por el middleware de autenticación.
// Incluye multer condicional para manejo de subida de imágenes de perfil.
router.put('/', authenticateToken, conditionalUpload, updateProfile);

// Exportar el enrutador para que pueda ser usado por el servidor principal (server.js).
module.exports = router;
