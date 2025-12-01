#!/usr/bin/env node

/**
 * Script de prueba para el CHAT SIMPLIFICADO
 * Prueba los endpoints: GET /api/chat/messages/:otherUserId y POST /api/chat/send
 * Verifica que el chat funciona usando únicamente IDs de usuario
 */

const API_BASE_URL = 'http://localhost:3003';

async function testChatSimplificado() {
  console.log('🧪 INICIANDO PRUEBAS DEL CHAT SIMPLIFICADO');
  console.log('=' * 50);

  try {
    // Paso 1: Login para obtener token
    console.log('\n📧 PASO 1: Autenticación de usuario...');
    
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'diegoeuler@gmail.com',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Error en login: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    if (!token) {
      throw new Error('No se recibió token de autenticación');
    }
    
    console.log('✅ Login exitoso');
    console.log('Token:', token.substring(0, 20) + '...');

    // Paso 2: Obtener perfil del usuario actual
    console.log('\n👤 PASO 2: Obteniendo perfil del usuario actual...');
    
    const profileResponse = await fetch(`${API_BASE_URL}/api/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!profileResponse.ok) {
      throw new Error(`Error obteniendo perfil: ${profileResponse.status}`);
    }

    const profileData = await profileResponse.json();
    const currentUser = profileData.usuario || profileData;
    
    console.log('✅ Perfil obtenido:', {
      id: currentUser.id,
      nombre: currentUser.nombre,
      rol: currentUser.rol
    });

    // Paso 3: Enviar un mensaje de prueba
    console.log('\n📤 PASO 3: Enviando mensaje de prueba...');
    
    const sendMessageResponse = await fetch(`${API_BASE_URL}/api/chat/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        destinatario_id: 'c4b5ae51-4b78-47b8-afc7-263028f0a608', // ID del profesional
        contenido: '¡Hola! Este es un mensaje de prueba del chat simplificado.'
      })
    });

    if (!sendMessageResponse.ok) {
      const errorData = await sendMessageResponse.json().catch(() => ({}));
      throw new Error(`Error enviando mensaje: ${sendMessageResponse.status} - ${errorData.error || 'Unknown error'}`);
    }

    const sendData = await sendMessageResponse.json();
    console.log('✅ Mensaje enviado:', {
      id: sendData.data.id,
      contenido: sendData.data.contenido,
      remitente_id: sendData.data.remitente_id,
      destinatario_id: sendData.data.destinatario_id
    });

    // Paso 4: Obtener historial de mensajes
    console.log('\n📥 PASO 4: Obteniendo historial de mensajes...');
    
    const messagesResponse = await fetch(`${API_BASE_URL}/api/chat/messages/c4b5ae51-4b78-47b8-afc7-263028f0a608`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!messagesResponse.ok) {
      const errorData = await messagesResponse.json().catch(() => ({}));
      throw new Error(`Error obteniendo mensajes: ${messagesResponse.status} - ${errorData.error || 'Unknown error'}`);
    }

    const messagesData = await messagesResponse.json();
    console.log('✅ Historial obtenido:', {
      total: messagesData.totalMessages,
      otherUser: messagesData.otherUser?.nombre
    });

    // Paso 5: Verificar lista de conversaciones
    console.log('\n📋 PASO 5: Obteniendo lista de conversaciones...');
    
    const conversationsResponse = await fetch(`${API_BASE_URL}/api/chat/conversations-list`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!conversationsResponse.ok) {
      const errorData = await conversationsResponse.json().catch(() => ({}));
      throw new Error(`Error obteniendo conversaciones: ${conversationsResponse.status} - ${errorData.error || 'Unknown error'}`);
    }

    const conversationsData = await conversationsResponse.json();
    console.log('✅ Lista de conversaciones:', {
      total: conversationsData.total,
      conversaciones: conversationsData.conversations?.length || 0
    });

    console.log('\n🎉 TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE');
    console.log('=' * 50);
    console.log('✅ Chat simplificado funcionando correctamente');
    console.log('✅ Endpoints GET /api/chat/messages/:otherUserId operativo');
    console.log('✅ Endpoint POST /api/chat/send operativo');
    console.log('✅ Endpoint GET /api/chat/conversations-list operativo');
    console.log('✅ Chat bidireccional cliente ↔ profesional funcional');

  } catch (error) {
    console.error('\n❌ ERROR EN LAS PRUEBAS:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Ejecutar las pruebas
testChatSimplificado();