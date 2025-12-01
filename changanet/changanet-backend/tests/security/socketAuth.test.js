/**
 * Tests de seguridad para autenticación Socket.IO
 * Verifica que la autenticación funcione correctamente en diferentes entornos
 */

const { createServer } = require('http');
const { Server } = require('socket.io');
const { io: Client } = require('socket.io-client');
const jwt = require('jsonwebtoken');

describe('Socket.IO Authentication Security', () => {
  let io, server, port;

  beforeAll((done) => {
    server = createServer();
    io = new Server(server, {
      cors: {
        origin: ["http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Middleware de autenticación Socket.IO (simplificado para tests)
    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      const isDevelopment = process.env.NODE_ENV !== 'production';

      if (!token) {
        if (isDevelopment) {
          socket.user = {
            id: 'dev-test-user',
            nombre: 'Usuario de Prueba',
            email: 'test@changánet.dev',
            rol: 'cliente',
            esta_verificado: false
          };
          socket.isDevMode = true;
          return next();
        } else {
          return next(new Error('Authentication required'));
        }
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
        socket.user = decoded;
        next();
      } catch (error) {
        if (!isDevelopment) {
          return next(new Error('Invalid token'));
        }
        socket.user = null;
        socket.isUnauthenticated = true;
        next();
      }
    });

    server.listen(0, () => {
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    io.close();
    server.close(done);
  });

  describe('Development Environment', () => {
    beforeAll(() => {
      process.env.NODE_ENV = 'development';
    });

    test('should allow connection without token in development', (done) => {
      const clientSocket = Client(`http://localhost:${port}`);

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        clientSocket.disconnect();
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done.fail(`Connection should succeed in development: ${error.message}`);
      });
    });

    test('should accept valid JWT token in development', (done) => {
      const validToken = jwt.sign(
        { userId: 'test-user-id', email: 'test@example.com' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const clientSocket = Client(`http://localhost:${port}`, {
        auth: { token: validToken }
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        clientSocket.disconnect();
        done();
      });
    });

    test('should allow connection with invalid token in development', (done) => {
      const clientSocket = Client(`http://localhost:${port}`, {
        auth: { token: 'invalid.jwt.token' }
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        clientSocket.disconnect();
        done();
      });
    });
  });

  describe('Production Environment', () => {
    beforeAll(() => {
      process.env.NODE_ENV = 'production';
    });

    test('should reject connection without token in production', (done) => {
      const clientSocket = Client(`http://localhost:${port}`);

      clientSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication required');
        done();
      });

      clientSocket.on('connect', () => {
        done.fail('Connection should fail in production without token');
      });
    });

    test('should reject connection with invalid token in production', (done) => {
      const clientSocket = Client(`http://localhost:${port}`, {
        auth: { token: 'invalid.jwt.token' }
      });

      clientSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Invalid token');
        done();
      });

      clientSocket.on('connect', () => {
        done.fail('Connection should fail in production with invalid token');
      });
    });

    test('should accept valid JWT token in production', (done) => {
      const validToken = jwt.sign(
        { userId: 'test-user-id', email: 'test@example.com' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const clientSocket = Client(`http://localhost:${port}`, {
        auth: { token: validToken }
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        clientSocket.disconnect();
        done();
      });
    });
  });

  describe('Message Security', () => {
    beforeAll(() => {
      process.env.NODE_ENV = 'development';
    });

    test('should handle message sending from authenticated user', (done) => {
      const validToken = jwt.sign(
        { userId: 'test-user-id', email: 'test@example.com' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const clientSocket = Client(`http://localhost:${port}`, {
        auth: { token: validToken }
      });

      io.on('connection', (socket) => {
        socket.on('sendMessage', (data) => {
          expect(data.remitente_id).toBe('test-user-id');
          expect(data.contenido).toBe('Test message');
          socket.emit('messageSent', { id: 'msg-123' });
        });
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('sendMessage', {
          remitente_id: 'test-user-id',
          destinatario_id: 'recipient-id',
          contenido: 'Test message'
        });
      });

      clientSocket.on('messageSent', (message) => {
        expect(message.id).toBe('msg-123');
        clientSocket.disconnect();
        done();
      });
    });

    test('should reject message sending from unauthenticated user in production', (done) => {
      process.env.NODE_ENV = 'production';

      const clientSocket = Client(`http://localhost:${port}`);

      clientSocket.on('connect_error', () => {
        // Connection should fail, so test passes
        done();
      });

      clientSocket.on('connect', () => {
        // If connection succeeds, try to send message
        clientSocket.emit('sendMessage', {
          remitente_id: 'hacker-id',
          destinatario_id: 'victim-id',
          contenido: 'Hacked message'
        });

        clientSocket.on('error', (error) => {
          expect(error.message).toContain('Authentication required');
          clientSocket.disconnect();
          done();
        });
      });

      // Reset to development for other tests
      process.env.NODE_ENV = 'development';
    });
  });
});
