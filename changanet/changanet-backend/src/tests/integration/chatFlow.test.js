/**
 * Tests de integración para flujo completo de chat
 * Cubre: creación de conversación, envío de mensajes, recepción, WebSocket
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { io: ioClient } = require('socket.io-client');
const { createServer } = require('http');
const { Server } = require('socket.io');
const app = require('../../server');

const prisma = new PrismaClient();

describe('Chat Flow Integration', () => {
  let server;
  let io;
  let clientSocket;
  let testUser1, testUser2;
  let conversationId;
  let authToken1, authToken2;

  beforeAll(async () => {
    // Crear servidor de prueba
    server = createServer(app);
    io = new Server(server, {
      cors: {
        origin: ["http://localhost:5173"],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Adjuntar io al app para que esté disponible en las rutas
    app.set('io', io);

    await new Promise(resolve => {
      server.listen(0, () => resolve());
    });
  });

  afterAll(async () => {
    if (clientSocket) clientSocket.disconnect();
    if (io) io.close();
    if (server) server.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Limpiar base de datos de prueba
    await prisma.messages.deleteMany();
    await prisma.conversations.deleteMany();
    await prisma.usuarios.deleteMany();

    // Crear usuarios de prueba
    testUser1 = await prisma.usuarios.create({
      data: {
        id: 'test-user-1',
        email: 'test1@example.com',
        nombre: 'Usuario Test 1',
        password: 'hashedpassword',
        rol: 'cliente',
        esta_verificado: true,
      },
    });

    testUser2 = await prisma.usuarios.create({
      data: {
        id: 'test-user-2',
        email: 'test2@example.com',
        nombre: 'Usuario Test 2',
        password: 'hashedpassword',
        rol: 'profesional',
        esta_verificado: true,
      },
    });

    // Generar tokens JWT de prueba (simulados)
    authToken1 = 'Bearer test-token-user-1';
    authToken2 = 'Bearer test-token-user-2';
  });

  describe('Flujo completo de chat', () => {
    it('debe crear conversación, enviar mensajes y recibir via WebSocket', async () => {
      // 1. Crear conversación
      const createResponse = await request(app)
        .post('/api/chat/conversations')
        .set('Authorization', authToken1)
        .send({
          clientId: testUser1.id,
          professionalId: testUser2.id,
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.conversation).toBeDefined();
      conversationId = createResponse.body.conversation.id;

      // 2. Verificar que la conversación existe
      const conversationsResponse = await request(app)
        .get(`/api/chat/conversations/${testUser1.id}`)
        .set('Authorization', authToken1);

      expect(conversationsResponse.status).toBe(200);
      expect(conversationsResponse.body.conversations).toHaveLength(1);
      expect(conversationsResponse.body.conversations[0].id).toBe(conversationId);

      // 3. Conectar cliente Socket.IO
      const serverPort = server.address().port;
      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: 'test-token-user-1' },
        transports: ['websocket', 'polling'],
      });

      await new Promise(resolve => {
        clientSocket.on('connect', () => resolve());
      });

      // 4. Unirse a conversación
      clientSocket.emit('joinConversation', conversationId);

      await new Promise(resolve => {
        clientSocket.on('joinedConversation', (data) => {
          expect(data.conversationId).toBe(conversationId);
          resolve();
        });
      });

      // 5. Enviar mensaje via API REST
      const messageResponse = await request(app)
        .post('/api/chat/messages')
        .set('Authorization', authToken1)
        .send({
          conversationId,
          message: 'Hola, este es un mensaje de prueba',
        });

      expect(messageResponse.status).toBe(201);
      expect(messageResponse.body.message).toBeDefined();

      // 6. Verificar recepción via WebSocket
      const receivedMessage = await new Promise(resolve => {
        clientSocket.on('message', (messageData) => {
          resolve(messageData);
        });

        // Re-enviar el mensaje via Socket.IO para simular recepción
        clientSocket.emit('message', {
          conversationId,
          senderId: testUser1.id,
          message: 'Hola, este es un mensaje de prueba',
        });
      });

      expect(receivedMessage.conversationId).toBe(conversationId);
      expect(receivedMessage.message).toBe('Hola, este es un mensaje de prueba');
      expect(receivedMessage.sender.nombre).toBe(testUser1.nombre);

      // 7. Obtener historial de mensajes
      const historyResponse = await request(app)
        .get(`/api/chat/messages/${conversationId}`)
        .set('Authorization', authToken1);

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.messages).toHaveLength(1);
      expect(historyResponse.body.messages[0].message).toBe('Hola, este es un mensaje de prueba');

      // 8. Enviar mensaje con imagen
      const imageMessageResponse = await request(app)
        .post('/api/chat/messages')
        .set('Authorization', authToken1)
        .send({
          conversationId,
          message: 'Mira esta imagen',
          imageUrl: 'https://example.com/test-image.jpg',
        });

      expect(imageMessageResponse.status).toBe(201);
      expect(imageMessageResponse.body.message.image_url).toBe('https://example.com/test-image.jpg');

      // 9. Verificar historial actualizado
      const updatedHistoryResponse = await request(app)
        .get(`/api/chat/messages/${conversationId}`)
        .set('Authorization', authToken1);

      expect(updatedHistoryResponse.status).toBe(200);
      expect(updatedHistoryResponse.body.messages).toHaveLength(2);
    });

    it('debe manejar permisos correctamente', async () => {
      // Crear conversación
      const createResponse = await request(app)
        .post('/api/chat/conversations')
        .set('Authorization', authToken1)
        .send({
          clientId: testUser1.id,
          professionalId: testUser2.id,
        });

      conversationId = createResponse.body.conversation.id;

      // Intentar enviar mensaje como usuario no participante
      const otherUser = await prisma.usuarios.create({
        data: {
          id: 'other-user',
          email: 'other@example.com',
          nombre: 'Otro Usuario',
          password: 'hashedpassword',
          rol: 'cliente',
          esta_verificado: true,
        },
      });

      const unauthorizedResponse = await request(app)
        .post('/api/chat/messages')
        .set('Authorization', 'Bearer test-token-other-user')
        .send({
          conversationId,
          message: 'Mensaje no autorizado',
        });

      expect(unauthorizedResponse.status).toBe(403);
      expect(unauthorizedResponse.body.error).toContain('No tienes permiso');

      // Intentar ver mensajes de conversación ajena
      const unauthorizedViewResponse = await request(app)
        .get(`/api/chat/messages/${conversationId}`)
        .set('Authorization', 'Bearer test-token-other-user');

      expect(unauthorizedViewResponse.status).toBe(403);
    });

    it('debe manejar subida de imágenes', async () => {
      // Generar URL de subida
      const uploadUrlResponse = await request(app)
        .post('/api/chat/upload-image')
        .set('Authorization', authToken1)
        .send({
          fileName: 'test-image.jpg',
          fileType: 'image/jpeg',
        });

      expect(uploadUrlResponse.status).toBe(200);
      expect(uploadUrlResponse.body.uploadUrl).toBeDefined();
      expect(uploadUrlResponse.body.fileName).toContain('chat_images/test-user-1');
      expect(uploadUrlResponse.body.expiresIn).toBe(900000); // 15 minutos
    });

    it('debe manejar paginación de mensajes', async () => {
      // Crear conversación
      const createResponse = await request(app)
        .post('/api/chat/conversations')
        .set('Authorization', authToken1)
        .send({
          clientId: testUser1.id,
          professionalId: testUser2.id,
        });

      conversationId = createResponse.body.conversation.id;

      // Enviar múltiples mensajes
      for (let i = 1; i <= 25; i++) {
        await request(app)
          .post('/api/chat/messages')
          .set('Authorization', authToken1)
          .send({
            conversationId,
            message: `Mensaje ${i}`,
          });
      }

      // Obtener primera página
      const page1Response = await request(app)
        .get(`/api/chat/messages/${conversationId}?page=1&limit=10`)
        .set('Authorization', authToken1);

      expect(page1Response.status).toBe(200);
      expect(page1Response.body.messages).toHaveLength(10);
      expect(page1Response.body.pagination.page).toBe(1);
      expect(page1Response.body.pagination.pages).toBe(3);
      expect(page1Response.body.pagination.total).toBe(25);

      // Obtener segunda página
      const page2Response = await request(app)
        .get(`/api/chat/messages/${conversationId}?page=2&limit=10`)
        .set('Authorization', authToken1);

      expect(page2Response.status).toBe(200);
      expect(page2Response.body.messages).toHaveLength(10);
      expect(page2Response.body.pagination.page).toBe(2);
    });

    it('debe manejar conversaciones existentes', async () => {
      // Crear primera conversación
      const firstResponse = await request(app)
        .post('/api/chat/conversations')
        .set('Authorization', authToken1)
        .send({
          clientId: testUser1.id,
          professionalId: testUser2.id,
        });

      expect(firstResponse.status).toBe(201);

      // Intentar crear la misma conversación nuevamente
      const secondResponse = await request(app)
        .post('/api/chat/conversations')
        .set('Authorization', authToken1)
        .send({
          clientId: testUser1.id,
          professionalId: testUser2.id,
        });

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.message).toBe('Conversación ya existe');
      expect(secondResponse.body.conversation.id).toBe(firstResponse.body.conversation.id);
    });
  });

  describe('Rate Limiting', () => {
    it('debe aplicar rate limiting a mensajes', async () => {
      // Crear conversación
      const createResponse = await request(app)
        .post('/api/chat/conversations')
        .set('Authorization', authToken1)
        .send({
          clientId: testUser1.id,
          professionalId: testUser2.id,
        });

      conversationId = createResponse.body.conversation.id;

      // Enviar múltiples mensajes rápidamente (simular spam)
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(
          request(app)
            .post('/api/chat/messages')
            .set('Authorization', authToken1)
            .send({
              conversationId,
              message: `Mensaje spam ${i}`,
            })
        );
      }

      const results = await Promise.all(promises);

      // Algunos deberían ser exitosos, otros rate limited
      const successful = results.filter(r => r.status === 201).length;
      const rateLimited = results.filter(r => r.status === 429).length;

      expect(successful + rateLimited).toBe(15);
      expect(successful).toBeGreaterThan(0);
      expect(rateLimited).toBeGreaterThan(0);
    });
  });

  describe('WebSocket Events', () => {
    it('debe manejar eventos de typing', async () => {
      const serverPort = server.address().port;
      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: 'test-token-user-1' },
      });

      await new Promise(resolve => {
        clientSocket.on('connect', () => resolve());
      });

      // Escuchar evento de typing
      const typingPromise = new Promise(resolve => {
        clientSocket.on('userTyping', (data) => {
          resolve(data);
        });
      });

      // Enviar evento de typing
      clientSocket.emit('typing', {
        from: testUser1.id,
        to: testUser2.id,
        isTyping: true,
      });

      const typingData = await typingPromise;
      expect(typingData.from).toBe(testUser1.id);
      expect(typingData.isTyping).toBe(true);
    });

    it('debe manejar eventos de markAsRead', async () => {
      // Crear conversación y mensaje
      const createResponse = await request(app)
        .post('/api/chat/conversations')
        .set('Authorization', authToken1)
        .send({
          clientId: testUser1.id,
          professionalId: testUser2.id,
        });

      conversationId = createResponse.body.conversation.id;

      await request(app)
        .post('/api/chat/messages')
        .set('Authorization', authToken1)
        .send({
          conversationId,
          message: 'Mensaje para marcar como leído',
        });

      const serverPort = server.address().port;
      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: 'test-token-user-2' }, // Usuario 2
      });

      await new Promise(resolve => {
        clientSocket.on('connect', () => resolve());
      });

      // Escuchar evento de messagesRead
      const readPromise = new Promise(resolve => {
        clientSocket.on('messagesRead', (data) => {
          resolve(data);
        });
      });

      // Marcar como leído
      clientSocket.emit('markAsRead', {
        senderId: testUser1.id,
        recipientId: testUser2.id,
      });

      const readData = await readPromise;
      expect(readData.by).toBe(testUser2.id);
    });
  });
});
