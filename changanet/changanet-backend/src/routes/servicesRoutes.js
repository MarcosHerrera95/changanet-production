// src/routes/servicesRoutes.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/authenticate');

const router = express.Router();
const prisma = new PrismaClient();

// Obtener todos los servicios disponibles
router.get('/', async (req, res) => {
  try {
    const services = await prisma.servicios.findMany({
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            url_foto_perfil: true
          }
        },
        profesional: {
          select: {
            id: true,
            nombre: true,
            email: true,
            url_foto_perfil: true
          }
        }
      }
    });

    res.json(services);
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
});

// Obtener servicio por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const service = await prisma.servicios.findUnique({
      where: { id: parseInt(id) },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            foto_perfil: true,
            descripcion: true,
            especialidades: true
          }
        }
      }
    });

    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    res.json(service);
  } catch (error) {
    console.error('Error al obtener servicio:', error);
    res.status(500).json({ error: 'Error al obtener servicio' });
  }
});

// Crear nuevo servicio (solo profesionales)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { titulo, descripcion, categoria, precio_base, zona_cobertura } = req.body;
    const userId = req.user.userId;

    // Verificar que el usuario sea profesional
    const user = await prisma.usuarios.findUnique({
      where: { id: userId }
    });

    if (user.rol !== 'profesional') {
      return res.status(403).json({ error: 'Solo los profesionales pueden crear servicios' });
    }

    const service = await prisma.servicios.create({
      data: {
        titulo,
        descripcion,
        categoria,
        precio_base: parseFloat(precio_base),
        zona_cobertura,
        usuario_id: userId,
        esta_activo: true
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            foto_perfil: true
          }
        }
      }
    });

    res.status(201).json(service);
  } catch (error) {
    console.error('Error al crear servicio:', error);
    res.status(500).json({ error: 'Error al crear servicio' });
  }
});

// Actualizar servicio (solo el propietario)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, categoria, precio_base, zona_cobertura, esta_activo } = req.body;
    const userId = req.user.userId;

    // Verificar que el servicio existe y pertenece al usuario
    const existingService = await prisma.servicios.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingService) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    if (existingService.usuario_id !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para editar este servicio' });
    }

    const updatedService = await prisma.servicios.update({
      where: { id: parseInt(id) },
      data: {
        titulo,
        descripcion,
        categoria,
        precio_base: precio_base ? parseFloat(precio_base) : undefined,
        zona_cobertura,
        esta_activo
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            foto_perfil: true
          }
        }
      }
    });

    res.json(updatedService);
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({ error: 'Error al actualizar servicio' });
  }
});

// Eliminar servicio (solo el propietario)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verificar que el servicio existe y pertenece al usuario
    const existingService = await prisma.servicios.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingService) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    if (existingService.usuario_id !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este servicio' });
    }

    await prisma.servicios.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Servicio eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
});

// Buscar servicios por categoría o zona
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const services = await prisma.servicios.findMany({
      where: {
        esta_activo: true,
        OR: [
          { titulo: { contains: query, mode: 'insensitive' } },
          { descripcion: { contains: query, mode: 'insensitive' } },
          { categoria: { contains: query, mode: 'insensitive' } },
          { zona_cobertura: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            foto_perfil: true
          }
        }
      }
    });

    res.json(services);
  } catch (error) {
    console.error('Error al buscar servicios:', error);
    res.status(500).json({ error: 'Error al buscar servicios' });
  }
});

// Obtener servicios del cliente autenticado
router.get('/client', authenticateToken, async (req, res) => {
  try {
    const { id: clientId } = req.user;

    const services = await prisma.servicios.findMany({
      where: { cliente_id: clientId },
      include: {
        profesional: {
          select: {
            id: true,
            nombre: true,
            email: true,
            url_foto_perfil: true
          }
        },
        resena: true
      },
      orderBy: { creado_en: 'desc' }
    });

    res.json({ services });
  } catch (error) {
    console.error('Error al obtener servicios del cliente:', error);
    res.status(500).json({ error: 'Error al obtener servicios del cliente' });
  }
});

// Actualizar estado del servicio (cliente puede marcar como completado)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { id: userId } = req.user;

    const service = await prisma.servicios.findUnique({
      where: { id: parseInt(id) }
    });

    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    if (service.cliente_id !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para actualizar este servicio' });
    }

    // Solo permitir ciertos estados
    const allowedStatuses = ['completado', 'cancelado'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    const updatedService = await prisma.servicios.update({
      where: { id: parseInt(id) },
      data: {
        estado: status,
        completado_en: status === 'completado' ? new Date() : undefined
      },
      include: {
        profesional: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    res.json(updatedService);
  } catch (error) {
    console.error('Error al actualizar estado del servicio:', error);
    res.status(500).json({ error: 'Error al actualizar estado del servicio' });
  }
});

module.exports = router;
