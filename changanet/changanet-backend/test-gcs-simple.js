/**
 * Test simple para Google Cloud Storage
 */

const { Storage } = require('@google-cloud/storage');
const path = require('path');

async function testGCS() {
  console.log('🔍 Probando Google Cloud Storage...\n');

  try {
    const storage = new Storage({
      keyFilename: path.join(__dirname, 'keys/gcs-key.json'),
      projectId: 'changanet-notifications-477520'
    });

    console.log('✅ Cliente GCS inicializado');

    const bucketName = 'changanet-docs';
    const bucket = storage.bucket(bucketName);

    console.log(`📁 Verificando bucket: ${bucketName}`);

    const [exists] = await bucket.exists();
    console.log(`📊 Bucket existe: ${exists ? '✅ SÍ' : '❌ NO'}`);

    if (!exists) {
      console.log('🔧 Intentando crear bucket...');
      await storage.createBucket(bucketName, {
        location: 'us-central1',
        storageClass: 'STANDARD'
      });
      console.log('✅ Bucket creado exitosamente');
    }

    console.log('🎉 GCS funcionando correctamente');

  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('🔍 Código de error:', error.code);

    if (error.code === 403) {
      console.log('🚫 Problema de permisos - verificar roles del service account');
    } else if (error.code === 404) {
      console.log('📁 Bucket no encontrado');
    } else if (error.code === 'ENOTFOUND') {
      console.log('🌐 Problema de conexión de red');
    }
  }
}

testGCS();
