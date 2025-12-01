// src/controllers/galleryController.js
const { PrismaClient } = require('@prisma/client');
const { uploadImage, deleteImage } = require('../services/storageService');
const prisma = new PrismaClient();

// Obtener galería de trabajos de un profesional
exports.getGallery = async (req, res) => {
  const { professionalId } = req.params;

  try {
    const gallery = await prisma.galeria_trabajos.findMany({
      where: { profesional_id: professionalId },
      orderBy: { creado_en: 'desc' },
    });

    res.status(200).json(gallery);
  } catch (error) {
    console.error('Error getting gallery:', error);
    res.status(500).json({ error: 'Error al obtener la galería.' });
  }
};

// Agregar imagen a la galería
exports.addGalleryImage = async (req, res) => {
  const { userId } = req.user;
  const { titulo, descripcion } = req.body;

  try {
    const user = await prisma.usuarios.findUnique({ where: { id: userId } });
    if (user.rol !== 'profesional') {
      return res.status(403).json({ error: 'Solo los profesionales pueden agregar imágenes a la galería.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Se requiere una imagen.' });
    }

    // Subir imagen a Cloudinary
    const result = await uploadImage(req.file.buffer, { folder: 'changanet/gallery' });
    const url_imagen = result.secure_url;

    const galleryImage = await prisma.galeria_trabajos.create({
      data: {
        profesional_id: userId,
        titulo,
        descripcion,
        url_imagen,
      },
    });

    res.status(201).json(galleryImage);
  } catch (error) {
    console.error('Error adding gallery image:', error);
    res.status(500).json({ error: 'Error al agregar la imagen a la galería.' });
  }
};

// Eliminar imagen de la galería
exports.deleteGalleryImage = async (req, res) => {
  const { userId } = req.user;
  const { imageId } = req.params;

  try {
    const image = await prisma.galeria_trabajos.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      return res.status(404).json({ error: 'Imagen no encontrada.' });
    }

    if (image.profesional_id !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta imagen.' });
    }

    // Eliminar imagen de Cloudinary
    const publicId = image.url_imagen.split('/').pop().split('.')[0];
    await deleteImage(`changanet/gallery/${publicId}`);

    // Eliminar de la base de datos
    await prisma.galeria_trabajos.delete({
      where: { id: imageId },
    });

    res.status(200).json({ message: 'Imagen eliminada exitosamente.' });
  } catch (error) {
    console.error('Error deleting gallery image:', error);
    res.status(500).json({ error: 'Error al eliminar la imagen.' });
  }
};
