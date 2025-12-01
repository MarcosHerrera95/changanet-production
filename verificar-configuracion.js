// Script para verificar configuración actual del frontend
console.log('🔍 VERIFICACIÓN DE CONFIGURACIÓN ACTUAL:\n');

// Verificar variables de entorno en tiempo de ejecución
console.log('🌐 Variables de entorno en runtime:');
console.log('- VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL || 'NO DEFINIDA');
console.log('- VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL || 'NO DEFINIDA');

// Verificar API_BASE_URL desde config
try {
  const { API_BASE_URL } = await import('../config/api.js');
  console.log('- API_BASE_URL desde config:', API_BASE_URL);
} catch (error) {
  console.log('- Error importando config:', error.message);
}

// Verificar localStorage
const token = localStorage.getItem('changanet_token');
const user = localStorage.getItem('changanet_user');
console.log('\n💾 localStorage:');
console.log('- Token existe:', !!token);
console.log('- User data:', user ? 'SÍ' : 'NO');

// Test endpoint para verificar conectividad
async function testConnectivity() {
  console.log('\n🧪 PRUEBA DE CONECTIVIDAD:');
  
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3004';
  
  try {
    // Probar endpoint de salud si existe
    const response = await fetch(`${backendUrl}/api/profile`, {
      method: 'HEAD', // Solo verificar que esté corriendo
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    
    console.log('- Backend responde:', response.status);
    console.log('- URL probada:', `${backendUrl}/api/profile`);
    
  } catch (error) {
    console.log('- Error conectando al backend:', error.message);
    console.log('- URL que falló:', `${backendUrl}/api/profile`);
  }
}

testConnectivity();