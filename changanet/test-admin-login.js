const axios = require('axios');

async function testAdminLogin() {
  try {
    console.log('🔐 Probando login de administrador...');

    const loginResponse = await axios.post('http://localhost:3003/api/auth/login', {
      email: 'admin@changanet.com',
      password: 'admin123456'
    });

    console.log('✅ Login exitoso:', loginResponse.data);

    const token = loginResponse.data.token;
    console.log('🔑 Token obtenido:', token.substring(0, 50) + '...');

    // Probar endpoint de estadísticas
    console.log('\n📊 Probando endpoint de estadísticas...');
    const statsResponse = await axios.get('http://localhost:3003/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('✅ Estadísticas obtenidas:', statsResponse.data);

    // Probar endpoint de usuarios
    console.log('\n👥 Probando endpoint de usuarios...');
    const usersResponse = await axios.get('http://localhost:3003/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('✅ Usuarios obtenidos:', usersResponse.data.data.length, 'usuarios');

    // Probar endpoint de disputas
    console.log('\n⚠️ Probando endpoint de disputas...');
    const disputesResponse = await axios.get('http://localhost:3003/api/admin/disputes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('✅ Disputas obtenidas:', disputesResponse.data.data.length, 'disputas');

    console.log('\n🎉 Todos los endpoints de admin funcionan correctamente!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAdminLogin();
