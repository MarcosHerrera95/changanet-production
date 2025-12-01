/**
 * Servicio de procesamiento de imágenes usando Sharp
 * Optimiza imágenes para web con compresión automática y redimensionamiento
 * Mejora rendimiento de carga y reduce uso de ancho de banda
 */

const sharp = require('sharp');

/**
 * Configuración de compresión por tipo de imagen
 */
const COMPRESSION_CONFIG = {
  // Configuración para imágenes de reseñas (alta calidad, tamaño moderado)
  review: {
    quality: 85, // Calidad JPEG/WebP
    maxWidth: 1200, // Ancho máximo
    maxHeight: 1200, // Alto máximo
    format: 'webp' // Formato preferido
  },

  // Configuración para avatares de perfil (alta calidad, tamaño pequeño)
  avatar: {
    quality: 90,
    maxWidth: 300,
    maxHeight: 300,
    format: 'webp'
  },

  // Configuración para documentos de verificación (alta calidad, sin redimensionamiento)
  document: {
    quality: 95,
    maxWidth: null, // Sin límite
    maxHeight: null,
    format: 'original' // Mantener formato original
  }
};

/**
 * Procesa imagen para reseñas con optimización automática
 * @param {Buffer} imageBuffer - Buffer de la imagen original
 * @param {string} originalName - Nombre original del archivo
 * @returns {Promise<Buffer>} Buffer de la imagen procesada
 */
const processReviewImage = async (imageBuffer, originalName) => {
  try {
    const config = COMPRESSION_CONFIG.review;
    let sharpInstance = sharp(imageBuffer);

    // Obtener metadatos de la imagen
    const metadata = await sharpInstance.metadata();

    console.log(`📸 Procesando imagen de reseña: ${originalName} (${metadata.width}x${metadata.height}, ${metadata.format})`);

    // Redimensionar si es necesario
    if (config.maxWidth && metadata.width > config.maxWidth) {
      sharpInstance = sharpInstance.resize(config.maxWidth, config.maxHeight, {
        fit: 'inside', // Mantener proporción
        withoutEnlargement: true // No agrandar si es más pequeña
      });
    }

    // Convertir a WebP para mejor compresión, o mantener JPEG si es preferible
    const outputFormat = config.format === 'webp' ? 'webp' : 'jpeg';

    const processedBuffer = await sharpInstance
      .toFormat(outputFormat, {
        quality: config.quality,
        effort: 6 // Máximo esfuerzo de compresión para WebP
      })
      .toBuffer();

    // Calcular reducción de tamaño
    const originalSize = imageBuffer.length;
    const processedSize = processedBuffer.length;
    const reduction = ((originalSize - processedSize) / originalSize * 100).toFixed(1);

    console.log(`✅ Imagen procesada: ${originalSize} → ${processedSize} bytes (${reduction}% reducción)`);

    return processedBuffer;
  } catch (error) {
    console.error('❌ Error procesando imagen de reseña:', error);
    // Retornar imagen original si falla el procesamiento
    return imageBuffer;
  }
};

/**
 * Procesa imagen de avatar con optimización para perfiles
 * @param {Buffer} imageBuffer - Buffer de la imagen original
 * @param {string} originalName - Nombre original del archivo
 * @returns {Promise<Buffer>} Buffer de la imagen procesada
 */
const processAvatarImage = async (imageBuffer, originalName) => {
  try {
    const config = COMPRESSION_CONFIG.avatar;
    let sharpInstance = sharp(imageBuffer);

    const metadata = await sharpInstance.metadata();

    console.log(`👤 Procesando avatar: ${originalName} (${metadata.width}x${metadata.height})`);

    // Redimensionar a cuadrado para avatares
    sharpInstance = sharpInstance.resize(config.maxWidth, config.maxHeight, {
      fit: 'cover', // Cubrir completamente, recortando si es necesario
      position: 'center' // Centrar el recorte
    });

    const processedBuffer = await sharpInstance
      .toFormat('webp', {
        quality: config.quality,
        effort: 6
      })
      .toBuffer();

    const reduction = ((imageBuffer.length - processedBuffer.length) / imageBuffer.length * 100).toFixed(1);
    console.log(`✅ Avatar procesado: ${imageBuffer.length} → ${processedBuffer.length} bytes (${reduction}% reducción)`);

    return processedBuffer;
  } catch (error) {
    console.error('❌ Error procesando avatar:', error);
    return imageBuffer;
  }
};

/**
 * Procesa documento manteniendo calidad pero optimizando
 * @param {Buffer} imageBuffer - Buffer del documento
 * @param {string} originalName - Nombre original
 * @returns {Promise<Buffer>} Buffer optimizado
 */
const processDocumentImage = async (imageBuffer, originalName) => {
  try {
    const config = COMPRESSION_CONFIG.document;
    const sharpInstance = sharp(imageBuffer);

    const metadata = await sharpInstance.metadata();

    console.log(`📄 Procesando documento: ${originalName} (${metadata.format})`);

    // Solo optimizar calidad sin redimensionar
    const processedBuffer = await sharpInstance
      .jpeg({ quality: config.quality })
      .toBuffer();

    const reduction = ((imageBuffer.length - processedBuffer.length) / imageBuffer.length * 100).toFixed(1);
    console.log(`✅ Documento procesado: ${imageBuffer.length} → ${processedBuffer.length} bytes (${reduction}% reducción)`);

    return processedBuffer;
  } catch (error) {
    console.error('❌ Error procesando documento:', error);
    return imageBuffer;
  }
};

/**
 * Función genérica para procesar imágenes según el tipo
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @param {string} originalName - Nombre original
 * @param {string} type - Tipo de procesamiento ('review', 'avatar', 'document')
 * @returns {Promise<Buffer>} Buffer procesado
 */
const processImage = async (imageBuffer, originalName, type = 'review') => {
  switch (type) {
    case 'avatar':
      return await processAvatarImage(imageBuffer, originalName);
    case 'document':
      return await processDocumentImage(imageBuffer, originalName);
    case 'review':
    default:
      return await processReviewImage(imageBuffer, originalName);
  }
};

/**
 * Valida si un buffer es una imagen válida
 * @param {Buffer} buffer - Buffer a validar
 * @returns {Promise<boolean>} true si es imagen válida
 */
const isValidImage = async (buffer) => {
  try {
    const metadata = await sharp(buffer).metadata();
    return metadata && metadata.width > 0 && metadata.height > 0;
  } catch (error) {
    return false;
  }
};

/**
 * Obtiene información de la imagen sin procesarla
 * @param {Buffer} buffer - Buffer de la imagen
 * @returns {Promise<Object>} Metadatos de la imagen
 */
const getImageInfo = async (buffer) => {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: buffer.length,
      hasAlpha: metadata.hasAlpha || false
    };
  } catch (error) {
    throw new Error('No se pudo obtener información de la imagen');
  }
};

module.exports = {
  processImage,
  processReviewImage,
  processAvatarImage,
  processDocumentImage,
  isValidImage,
  getImageInfo,
  COMPRESSION_CONFIG
};
