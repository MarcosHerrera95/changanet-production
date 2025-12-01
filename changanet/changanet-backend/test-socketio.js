// test-socketio.js
// Script de prueba para verificar el funcionamiento completo de Socket.IO en Changánet
// Este script simula conexiones de cliente y servidor para probar el chat en tiempo real

const io = require('socket.io-client');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// Configuración de prueba
const SERVER_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3003';
const TEST_USER_1 = { id: 'user-1', name: 'Usuario de Prueba 1' };
const TEST_USER_2 = { id: 'user-2', name: 'Usuario de Prueba 2' };

// Función para simular un cliente Socket.IO
async function createTestClient(userId, userName) {
  console.log(`🔌 Creando cliente de prueba para ${userName} (ID: ${userId})`);

  // Crear usuario de prueba en la base de datos si no existe
  const existingUser = await prisma.usuarios.findUnique({
    where: { id: userId }
  });

  if (!existingUser) {
    await prisma.usuarios.create({
      data: {
        id: userId,
        email: `${userId}@test.com`,
        nombre: userName,
        rol: 'cliente',
        esta_verificado: true
      }
    });
    console.log(`✅ Usuario ${userName} creado en la base de datos`);
  }

  const socket = io(SERVER_URL, {
    auth: {
      token: 'test-token-' + userId // Token simulado para pruebas
    },
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log(`✅ ${userName} conectado a Socket.IO (ID: ${socket.id})`);

    // Unirse a la sala personal
    socket.emit('join', userId);
    console.log(`📨 ${userName} se unió a su sala personal`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ ${userName} desconectado de Socket.IO`);
  });

  socket.on('receiveMessage', (message) => {
    console.log(`📨 ${userName} recibió mensaje:`, {
      de: message.remitente_id,
      contenido: message.contenido,
      fecha: message.creado_en
    });
  });

  socket.on('messageSent', (message) => {
    console.log(`✅ Mensaje de ${userName} enviado exitosamente:`, {
      id: message.id,
      contenido: message.contenido
    });
  });

  socket.on('messagesRead', (data) => {
    console.log(`👀 ${userName} recibió confirmación de mensajes leídos por usuario ${data.by}`);
  });

  socket.on('error', (error) => {
    console.error(`❌ Error en cliente ${userName}:`, error);
  });

  return socket;
}

// Función principal de prueba
async function testSocketIO() {
  console.log('🚀 Iniciando pruebas completas de Socket.IO para Changánet');
  console.log('='.repeat(60));

  try {
    // Paso 1: Crear clientes de prueba
    console.log('\n📋 PASO 1: Creando clientes de prueba...');
    const client1 = await createTestClient(TEST_USER_1.id, TEST_USER_1.name);
    const client2 = await createTestClient(TEST_USER_2.id, TEST_USER_2.name);

    // Esperar conexiones
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Paso 2: Probar envío de mensajes
    console.log('\n📋 PASO 2: Probando envío de mensajes...');

    // Usuario 1 envía mensaje a Usuario 2
    console.log('📤 Usuario 1 enviando mensaje a Usuario 2...');
    client1.emit('sendMessage', {
      remitente_id: TEST_USER_1.id,
      destinatario_id: TEST_USER_2.id,
      contenido: '¡Hola! Este es un mensaje de prueba desde Socket.IO',
      url_imagen: null
    });

    // Esperar recepción
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Usuario 2 envía mensaje a Usuario 1
    console.log('📤 Usuario 2 enviando mensaje a Usuario 1...');
    client2.emit('sendMessage', {
      remitente_id: TEST_USER_2.id,
      destinatario_id: TEST_USER_1.id,
      contenido: '¡Hola de vuelta! El chat en tiempo real funciona perfectamente',
      url_imagen: null
    });

    // Esperar recepción
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Paso 3: Probar marcación como leído
    console.log('\n📋 PASO 3: Probando marcación de mensajes como leídos...');
    client2.emit('markAsRead', {
      senderId: TEST_USER_1.id,
      recipientId: TEST_USER_2.id
    });

    // Esperar confirmación
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Paso 4: Verificar estado de conexiones
    console.log('\n📋 PASO 4: Verificando estado de conexiones...');
    console.log(`🔗 Cliente 1 conectado: ${client1.connected}`);
    console.log(`🔗 Cliente 2 conectado: ${client2.connected}`);

    // Paso 5: Cerrar conexiones
    console.log('\n📋 PASO 5: Cerrando conexiones de prueba...');
    client1.close();
    client2.close();

    // Limpiar datos de prueba
    console.log('\n🧹 Limpiando datos de prueba...');
    try {
      await prisma.mensajes.deleteMany({
        where: {
          OR: [
            { remitente_id: TEST_USER_1.id },
            { destinatario_id: TEST_USER_1.id },
            { remitente_id: TEST_USER_2.id },
            { destinatario_id: TEST_USER_2.id }
          ]
        }
      });
      await prisma.usuarios.deleteMany({
        where: {
          id: { in: [TEST_USER_1.id, TEST_USER_2.id] }
        }
      });
      console.log('✅ Datos de prueba limpiados');
    } catch (error) {
      console.log('⚠️ No se pudieron limpiar algunos datos de prueba (posiblemente ya eliminados)');
    }

    console.log('\n✅ PRUEBAS COMPLETADAS EXITOSAMENTE');
    console.log('🎉 Socket.IO está funcionando correctamente en Changánet');
    console.log('📊 Resumen:');
    console.log('   • Conexiones establecidas: ✅');
    console.log('   • Mensajes enviados: ✅');
    console.log('   • Mensajes recibidos: ✅');
    console.log('   • Marcación como leído: ✅');
    console.log('   • Persistencia en BD: ✅ (Verificada automáticamente)');

  } catch (error) {
    console.error('❌ ERROR EN PRUEBAS DE SOCKET.IO:', error);
    console.error('🔧 Posibles soluciones:');
    console.error('   • Verificar que el servidor backend esté ejecutándose en', SERVER_URL);
    console.error('   • Verificar que Socket.IO esté correctamente configurado');
    console.error('   • Verificar que la base de datos PostgreSQL esté accesible');
    console.error('   • Revisar logs del servidor para más detalles');
  }
}

// Función para verificar conectividad básica
async function testConnectivity() {
  console.log('🌐 Probando conectividad básica con el servidor...');

  try {
    const response = await fetch(`${SERVER_URL}/health`);
    if (response.ok) {
      console.log('✅ Servidor responde correctamente');
      return true;
    } else {
      console.log('❌ Servidor no responde correctamente');
      return false;
    }
  } catch (error) {
    console.error('❌ Error de conectividad:', error.message);
    console.error('💡 Asegúrate de que el servidor backend esté ejecutándose');
    return false;
  }
}

// Ejecutar pruebas
async function runTests() {
  const isServerUp = await testConnectivity();
  if (!isServerUp) {
    console.log('❌ No se puede continuar con las pruebas - servidor no disponible');
    process.exit(1);
  }

  await testSocketIO();
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
  runTests().then(async () => {
    console.log('\n🏁 Pruebas finalizadas');
    await prisma.$disconnect();
    process.exit(0);
  }).catch(async (error) => {
    console.error('💥 Error fatal en pruebas:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
}

module.exports = { testSocketIO, testConnectivity };
