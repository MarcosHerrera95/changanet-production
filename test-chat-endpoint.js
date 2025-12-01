// Script para probar el endpoint /api/chat/open-or-create
// Usa la API fetch nativa de Node.js 18+

// Configuración
const API_BASE_URL = 'http://localhost:3004';
const TEST_CLIENT_ID = '123'; // ID de ejemplo para prueba
const TEST_PROFESSIONAL_ID = '456'; // ID de ejemplo para prueba

async function testChatEndpoint() {
  console.log('🧪 Probando endpoint /api/chat/open-or-create...\n');
  
  // Crear token de prueba (esto debería ser reemplazado con un token real)
  // Para esta prueba, usaremos un token de desarrollo
  const testToken = 'test-token-dev';
  
  try {
    console.log(`📡 Enviando solicitud POST a: ${API_BASE_URL}/api/chat/open-or-create`);
    console.log(`📊 Payload:`, {
      clientId: TEST_CLIENT_ID,
      professionalId: TEST_PROFESSIONAL_ID
    });
    
    const response = await fetch(`${API_BASE_URL}/api/chat/open-or-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({
        clientId: TEST_CLIENT_ID,
        professionalId: TEST_PROFESSIONAL_ID
      })
    });
    
    console.log(`📈 Status: ${response.status} ${response.statusText}`);
    
    // Obtener respuesta como texto primero para ver el error completo
    const responseText = await response.text();
    console.log(`📝 Respuesta completa:`, responseText);
    
    // Intentar parsear como JSON si es posible
    try {
      const responseData = JSON.parse(responseText);
      console.log(`✅ Respuesta JSON válida:`, responseData);
    } catch (parseError) {
      console.log(`❌ Error al parsear JSON:`, parseError.message);
      console.log(`📄 Respuesta raw:`, responseText);
    }
    
  } catch (error) {
    console.error('💥 Error en la solicitud:', error.message);
    console.error('📍 Stack trace:', error.stack);
  }
}

// Ejecutar la prueba
testChatEndpoint();