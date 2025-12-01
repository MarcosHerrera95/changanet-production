/**
 * Test script para debuggear Google Cloud Storage
 */

const { Storage } = require('@google-cloud/storage');
const path = require('path');

async function testGCSConnection() {
  console.log('🔍 Probando conexión a Google Cloud Storage...\n');

  try {
    // Configurar Google Cloud Storage
    const storage = new Storage({
      keyFilename: path.join(__dirname, 'changanet-backend/keys/gcs-key.json'),
      projectId: 'changanet-notifications-477520'
    });

    console.log('✅ Cliente GCS inicializado');

    const bucketName = 'changanet-docs';
    const bucket = storage.bucket(bucketName);

    console.log(`📁 Intentando acceder al bucket: ${bucketName}`);

    // Verificar si el bucket existe
    const [exists] = await bucket.exists();
    console.log(`📊 Bucket existe: ${exists ? '✅ SÍ' : '❌ NO'}`);

    if (!exists) {
      console.log('🔧 Intentando crear el bucket...');
      try {
        await storage.createBucket(bucketName, {
          location: 'us-central1',
          storageClass: 'STANDARD'
        });
        console.log('✅ Bucket creado exitosamente');
      } catch (createError) {
        console.log('❌ Error creando bucket:', createError.message);
        console.log('💡 Posible causa: Sin permisos para crear buckets');
      }
    } else {
      console.log('✅ Bucket accesible');

      // Intentar listar archivos
      console.log('📋 Intentando listar archivos en el bucket...');
      try {
        const [files] = await bucket.getFiles();
        console.log(`📄 Archivos encontrados: ${files.length}`);
      } catch (listError) {
        console.log('❌ Error listando archivos:', listError.message);
      }
    }

  } catch (error) {
    console.log('❌ Error general:', error.message);

    if (error.message.includes('authentication')) {
      console.log('🔐 Problema de autenticación - verificar credenciales');
    } else if (error.message.includes('permission')) {
      console.log('🚫 Problema de permisos - verificar roles del service account');
    } else if (error.message.includes('not found')) {
      console.log('📁 Bucket no encontrado - verificar nombre del bucket');
    }
  }
}

testGCSConnection();
