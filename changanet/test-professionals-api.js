const http = require('http');

async function testProfessionalsAPI() {
  try {
    console.log('🔍 Probando API de profesionales...\n');

    const url = new URL('http://localhost:3004/api/professionals?page=1&limit=5');
    console.log('URL:', url.toString());

    const response = await new Promise((resolve, reject) => {
      http.get(url.toString(), (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ ok: res.statusCode === 200, status: res.statusCode, data }));
      }).on('error', reject);
    });
    
    console.log('Status:', response.status);
    
    if (!response.ok) {
      console.error('❌ Error en la respuesta:', response.status);
      return;
    }
    
    const data = JSON.parse(response.data);
    console.log('📊 Datos recibidos:');
    console.log('- Total:', data.total);
    console.log('- Página:', data.page);
    console.log('- Profesionales:', data.professionals.length);
    console.log('- Has next page:', data.hasNextPage);
    
    if (data.professionals.length > 0) {
      console.log('\n🎯 Primer profesional:');
      console.log(JSON.stringify(data.professionals[0], null, 2));
      
      console.log('\n🔍 Estructura del primer profesional:');
      const first = data.professionals[0];
      console.log('- usuario_id:', first.usuario_id, typeof first.usuario_id);
      console.log('- usuario:', first.usuario ? 'presente' : 'ausente');
      if (first.usuario) {
        console.log('  - nombre:', first.usuario.nombre);
        console.log('  - email:', first.usuario.email);
      }
      console.log('- especialidad:', first.especialidad);
      console.log('- zona_cobertura:', first.zona_cobertura);
      console.log('- tarifa_hora:', first.tarifa_hora);
      console.log('- estado_verificacion:', first.estado_verificacion);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testProfessionalsAPI();
