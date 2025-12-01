/**
 * Controlador de favoritos
 * Permite a los clientes gestionar su lista de profesionales favoritos
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Agregar un profesional a favoritos
 */
exports.addFavorite = async (req, res) => {
  const { id: clienteId } = req.user;
  const { profesionalId } = req.body;

  try {
    // Verificar que el profesional existe y es un profesional
    const profesional = await prisma.usuarios.findUnique({
      where: { id: profesionalId },
      select: { rol: true, nombre: true }
    });

    if (!profesional || profesional.rol !== 'profesional') {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    // Verificar que no esté ya en favoritos
    const existingFavorite = await prisma.favoritos.findUnique({
      where: {
        cliente_id_profesional_id: {
          cliente_id: clienteId,
          profesional_id: profesionalId
        }
      }
    });

    if (existingFavorite) {
      return res.status(400).json({ error: 'Este profesional ya está en favoritos' });
    }

    // Crear favorito
    const favorite = await prisma.favoritos.create({
      data: {
        cliente_id: clienteId,
        profesional_id: profesionalId
      },
      include: {
        profesional: {
          select: {
            nombre: true,
            perfil_profesional: {
              select: {
                especialidad: true,
                zona_cobertura: true,
                tarifa_hora: true,
                calificacion_promedio: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      message: 'Profesional agregado a favoritos',
      favorite
    });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Error al agregar favorito' });
  }
};

/**
 * Remover un profesional de favoritos
 */
exports.removeFavorite = async (req, res) => {
  const { id: clienteId } = req.user;
  const { profesionalId } = req.params;

  try {
    const favorite = await prisma.favoritos.findUnique({
      where: {
        cliente_id_profesional_id: {
          cliente_id: clienteId,
          profesional_id: profesionalId
        }
      }
    });

    if (!favorite) {
      return res.status(404).json({ error: 'Favorito no encontrado' });
    }

    await prisma.favoritos.delete({
      where: {
        cliente_id_profesional_id: {
          cliente_id: clienteId,
          profesional_id: profesionalId
        }
      }
    });

    res.json({ message: 'Profesional removido de favoritos' });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Error al remover favorito' });
  }
};

/**
 * Obtener lista de favoritos del cliente
 */
exports.getFavorites = async (req, res) => {
  const { id: clienteId } = req.user;

  try {
    const favorites = await prisma.favoritos.findMany({
      where: { cliente_id: clienteId },
      include: {
        profesional: {
          select: {
            id: true,
            nombre: true,
            url_foto_perfil: true,
            perfil_profesional: {
              select: {
                especialidad: true,
                zona_cobertura: true,
                tarifa_hora: true,
                calificacion_promedio: true,
                estado_verificacion: true
              }
            }
          }
        }
      },
      orderBy: { creado_en: 'desc' }
    });

    res.json({ favorites });
  } catch (error) {
    console.error('Error getting favorites:', error);
    res.status(500).json({ error: 'Error al obtener favoritos' });
  }
};

/**
 * Verificar si un profesional está en favoritos
 */
exports.checkFavorite = async (req, res) => {
  const { id: clienteId } = req.user;
  const { profesionalId } = req.params;

  try {
    const favorite = await prisma.favoritos.findUnique({
      where: {
        cliente_id_profesional_id: {
          cliente_id: clienteId,
          profesional_id: profesionalId
        }
      }
    });

    res.json({ isFavorite: !!favorite });
  } catch (error) {
    console.error('Error checking favorite:', error);
    res.status(500).json({ error: 'Error al verificar favorito' });
  }
};
