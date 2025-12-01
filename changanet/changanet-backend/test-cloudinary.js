// test-cloudinary.js
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configurar Cloudinary con credenciales
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'changanet-stor',
  api_key: process.env.CLOUDINARY_API_KEY || '846814795685612',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'EXG02pFoj6Iu4aKN_iUI-K_fmtw'
});

// Subir imagen de prueba
const uploadImage = async () => {
  try {
    console.log('📤 Iniciando subida de imagen a Cloudinary...');

    // Subir imagen desde URL (para prueba)
    const result = await cloudinary.uploader.upload(
      'https://picsum.photos/600/400',
      {
        folder: 'changanet/pruebas',
        public_id: `test-image-${Date.now()}`,
        overwrite: false
      }
    );

    console.log('✅ ¡Éxito! Imagen subida a Cloudinary.');
    console.log('🔗 URL de la imagen:', result.secure_url);
    console.log('🆔 Public ID:', result.public_id);
    console.log('📁 Folder:', result.folder);
  } catch (error) {
    console.error('❌ Error al subir imagen a Cloudinary:', error);
    if (error.response) {
      console.error(' Detalles:', error.response.body);
    }
  }
};

uploadImage();
