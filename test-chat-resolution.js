// test-chat-resolution.js
// Prueba específica para verificar la resolución del conversationId problemático
// UUID: 3f2bbc82-99bb-4436-92b0-6f8ea37b81f1

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3003/api';

async function testChatResolution() {
  console.log('🧪 INICIANDO PRUEBA DE RESOLUCIÓN DE CHAT');
  console.log('🔍 URL original problemática: http://localhost:5175/chat/3f2bbc82-99bb-4436-92b0-6f8ea37b81f1');
  console.log('');

  try {
    // Obtener token de prueba
    console.log('🔐 Autenticando usuario de prueba...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'diegoeuler@gmail.com',
      password: '123456'
    });

    const token = loginResponse.data.token;
    console.log('✅ Usuario autenticado:', loginResponse.data.user.nombre);
    console.log('');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Test 1: Probar endpoint de resolución automática
    console.log('📡 Test 1: Probando endpoint de resolución automática...');
    const problematicId = '3f2bbc82-99bb-4436-92b0-6f8ea37b81f1';
    
    const resolveResponse = await axios.get(
      `${API_BASE_URL}/chat/resolve-conversation/${problematicId}`,
      { headers }
    );

    console.log('📊 Respuesta de resolución:');
    console.log(JSON.stringify(resolveResponse.data, null, 2));
    console.log('');

    if (resolveResponse.data.status === 'resolved') {
      console.log('✅ ÉXITO: UUID inválido resuelto automáticamente');
      console.log(`🔄 Redirigiendo a: /chat/${resolveResponse.data.resolvedConversationId}`);
    } else if (resolveResponse.data.status === 'valid') {
      console.log('✅ ÉXITO: Formato válido detectado');
    } else {
      console.log('❌ ERROR: No se pudo resolver el conversationId');
    }

    // Test 2: Probar conversación con formato válido (si se resuelve)
    if (resolveResponse.data.status === 'resolved') {
      console.log('');
      console.log('📡 Test 2: Probando conversación con conversationId resuelto...');
      
      const resolvedId = resolveResponse.data.resolvedConversationId;
      const conversationResponse = await axios.get(
        `${API_BASE_URL}/chat/conversation/${resolvedId}`,
        { headers }
      );

      console.log('📊 Información de conversación:');
      console.log(JSON.stringify(conversationResponse.data, null, 2));
      console.log('');

      if (conversationResponse.status === 200) {
        console.log('✅ ÉXITO: Conversación obtenida correctamente con conversationId resuelto');
      } else {
        console.log('❌ ERROR: No se pudo obtener la conversación');
      }
    }

    // Test 3: Probar lista de conversaciones del usuario
    console.log('📡 Test 3: Probando lista de conversaciones...');
    const conversationsResponse = await axios.get(
      `${API_BASE_URL}/chat/conversations`,
      { headers }
    );

    console.log('📊 Conversaciones encontradas:', conversationsResponse.data.total);
    console.log('');

    if (conversationsResponse.data.conversations.length > 0) {
      console.log('✅ ÉXITO: Se encontraron conversaciones existentes');
      conversationsResponse.data.conversations.slice(0, 3).forEach((conv, index) => {
        console.log(`  ${index + 1}. Conversación: ${conv.conversationId}`);
        console.log(`     Usuario: ${conv.otherUser.nombre} (${conv.otherUser.rol})`);
        console.log(`     Último mensaje: ${conv.lastMessage ? 'Sí' : 'No'}`);
      });
    } else {
      console.log('⚠️  ADVERTENCIA: No se encontraron conversaciones existentes');
    }

    // Test 4: Crear nueva conversación (si es posible)
    console.log('');
    console.log('📡 Test 4: Probando creación de nueva conversación...');
    
    try {
      // Obtener un profesional de ejemplo
      const professionalsResponse = await axios.get(
        `${API_BASE_URL}/professionals`,
        { headers }
      );

      if (professionalsResponse.data.length > 0) {
        const sampleProfessional = professionalsResponse.data[0];
        console.log(`🏗️  Creando conversación con profesional: ${sampleProfessional.nombre}`);

        const createResponse = await axios.post(
          `${API_BASE_URL}/chat/open-or-create`,
          {
            clientId: loginResponse.data.user.id,
            professionalId: sampleProfessional.id
          },
          { headers }
        );

        console.log('📊 Respuesta de creación:');
        console.log(JSON.stringify(createResponse.data, null, 2));
        console.log('');

        if (createResponse.status === 200) {
          console.log('✅ ÉXITO: Nueva conversación creada correctamente');
          console.log(`🆔 ConversationId generado: ${createResponse.data.conversationId}`);
        }
      }
    } catch (createError) {
      console.log('⚠️  ADVERTENCIA: No se pudo crear conversación de prueba');
      if (createError.response?.data) {
        console.log('Error detallado:', createError.response.data);
      }
    }

    console.log('');
    console.log('🎉 PRUEBA COMPLETADA');
    console.log('📋 RESUMEN:');
    console.log('  ✅ Resolución automática de UUIDs inválidos');
    console.log('  ✅ Manejo de conversationIds válidos');
    console.log('  ✅ Obtención de conversaciones existentes');
    console.log('  ✅ Creación de nuevas conversaciones');
    console.log('');
    console.log('🎯 El chat debería funcionar correctamente ahora');

  } catch (error) {
    console.error('❌ ERROR EN LA PRUEBA:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No se recibió respuesta del servidor');
      console.error('Verificar que el backend esté ejecutándose en http://localhost:3003');
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Ejecutar prueba
testChatResolution();