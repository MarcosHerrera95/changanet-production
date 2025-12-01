/**
 * Controlador de logros y gamificación
 * REQ-38: Sistema de medallas por logros
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtener todos los logros activos
 */
exports.getAllAchievements = async (req, res) => {
  try {
    const achievements = await prisma.logros.findMany({
      where: { activo: true }
    });
    res.json(achievements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener logros de un usuario específico
 */
exports.getUserAchievements = async (req, res) => {
  try {
    const { userId } = req.params;
    const userAchievements = await prisma.logros_usuario.findMany({
      where: { usuario_id: userId },
      include: { logro: true }
    });
    res.json(userAchievements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Crear un nuevo logro (solo administradores)
 */
exports.createAchievement = async (req, res) => {
  try {
    const { nombre, descripcion, icono, categoria, criterio, puntos } = req.body;

    // Validar campos requeridos
    if (!nombre || !descripcion || !icono || !categoria || !criterio) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const achievement = await prisma.logros.create({
      data: {
        nombre,
        descripcion,
        icono,
        categoria,
        criterio,
        puntos: puntos || 0
      }
    });

    res.status(201).json(achievement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Inicializar logros por defecto
 */
exports.initializeDefaultAchievements = async () => {
  try {
    const defaultAchievements = [
      {
        nombre: 'Primer Servicio',
        descripcion: 'Completa tu primer servicio como profesional',
        icono: '🎯',
        categoria: 'servicios',
        criterio: 'servicios_completados >= 1',
        puntos: 10
      },
      {
        nombre: 'Profesional Estrella',
        descripcion: 'Completa 5 servicios exitosamente',
        icono: '⭐',
        categoria: 'servicios',
        criterio: 'servicios_completados >= 5',
        puntos: 50
      },
      {
        nombre: 'Cliente Recurrente',
        descripcion: 'Contrata 3 servicios o más',
        icono: '🔄',
        categoria: 'cliente',
        criterio: 'servicios_contratados >= 3',
        puntos: 25
      },
      {
        nombre: 'Crítico Constructivo',
        descripcion: 'Deja tu primera reseña',
        icono: '📝',
        categoria: 'resenas',
        criterio: 'resenas_escritas >= 1',
        puntos: 5
      },
      {
        nombre: 'Reseñador Activo',
        descripcion: 'Deja 5 reseñas positivas o más',
        icono: '🌟',
        categoria: 'resenas',
        criterio: 'resenas_positivas >= 5',
        puntos: 30
      },
      {
        nombre: 'Verificado',
        descripcion: 'Completa la verificación de identidad',
        icono: '✅',
        categoria: 'verificacion',
        criterio: 'esta_verificado = true',
        puntos: 20
      },
      {
        nombre: 'Experiencia Comprobada',
        descripcion: 'Más de 5 años de experiencia',
        icono: '👨‍🔧',
        categoria: 'experiencia',
        criterio: 'anos_experiencia >= 5',
        puntos: 40
      },
      {
        nombre: 'Excelencia Total',
        descripcion: 'Mantén una calificación perfecta de 5 estrellas',
        icono: '🏆',
        categoria: 'calidad',
        criterio: 'calificacion_promedio = 5.0',
        puntos: 100
      }
    ];

    for (const achievement of defaultAchievements) {
      const exists = await prisma.logros.findFirst({
        where: { criterio: achievement.criterio }
      });

      if (!exists) {
        await prisma.logros.create({
          data: achievement
        });
        console.log(`✅ Logro creado: ${achievement.nombre}`);
      }
    }

    console.log('🎯 Logros por defecto inicializados');
  } catch (error) {
    console.error('Error inicializando logros:', error);
  }
};
