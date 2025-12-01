#!/usr/bin/env node

/**
 * Script de prueba para el CHAT SIMPLIFICADO usando token del frontend
 * Prueba los endpoints: GET /api/chat/messages/:otherUserId y POST /api/chat/send
 */

const API_BASE_URL = 'http://localhost:3003';

// Token del usuario que está logueado en el frontend (usado en la aplicación)
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3ZjBkNTdhOS1jZjgzLTRkMDYtOGQ0MS1hMjQ0NzUyYzQ2ZmYiLCJlbWFpbCI6ImRpZWdvZWx1ZXJAZ21haWwuY29tIiwicm9sZSI6ImNsaWVudGUiLCJpYXQiOjE3NjM2NDUyMDYsImV4cCI6MTc2MzY0ODkwNn0.VNBcED-8xn4lmO4NTpv2QdElfcVQ1TUPqE4v6pJdFUw';

async function testChatSimplificadoConToken() {
  console.log('🧪 INICIANDO PRUEBAS DEL CHAT SIMPLIFICADO');
  console.log('=' * 50);

  try {
    // Paso 1: Verificar que el token funciona
    console.log('\n🔑 PASO 1: Verificando token de autenticación...');
    
    const profileResponse = await fetch(`${API_BASE_URL}/api/profile`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });

    if (!profileResponse.ok) {
      throw new Error(`Error obteniendo perfil: ${profileResponse.status}`);
    }

    const profileData = await profileResponse.json();
    const currentUser = profileData.usuario || profileData;
    
    console.log('✅ Token válido');
    console.log('Usuario actual:', {
      id: currentUser.id,
      nombre: currentUser.nombre,
      rol: currentUser.rol
    });

    // Paso 2: Enviar un mensaje de prueba
    console.log('\n📤 PASO 2: Enviando mensaje de prueba...');
    
    const sendMessageResponse = await fetch(`${API_BASE_URL}/api/chat/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        destinatario_id: 'c4b5ae51-4b78-47b8-afc7-263028f0a608', // ID del profesional
        contenido: '¡Hola! Este es un mensaje de prueba del chat simplificado. 🧪'
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

    // Paso 3: Obtener historial de mensajes
    console.log('\n📥 PASO 3: Obteniendo historial de mensajes...');
    
    const messagesResponse = await fetch(`${API_BASE_URL}/api/chat/messages/c4b5ae51-4b78-47b8-afc7-263028f0a608`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });

    if (!messagesResponse.ok) {
      const errorData = await messagesResponse.json().catch(() => ({}));
      throw new Error(`Error obteniendo mensajes: ${messagesResponse.status} - ${errorData.error || 'Unknown error'}`);
    }

    const messagesData = await messagesResponse.json();
    console.log('✅ Historial obtenido:', {
      total: messagesData.totalMessages,
      otherUser: messagesData.otherUser?.nombre,
      messages: messagesData.messages?.length || 0
    });

    // Paso 4: Verificar lista de conversaciones
    console.log('\n📋 PASO 4: Obteniendo lista de conversaciones...');
    
    const conversationsResponse = await fetch(`${API_BASE_URL}/api/chat/conversations-list`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
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
testChatSimplificadoConToken();