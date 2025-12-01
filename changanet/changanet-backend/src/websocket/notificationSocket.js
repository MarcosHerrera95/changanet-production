/**
 * @archivo src/websocket/notificationSocket.js - WebSocket Server para Notificaciones
 * @descripción Servidor WebSocket para notificaciones en tiempo real
 * @impacto Comunicación bidireccional en tiempo real
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { notificationService } = require('../services/notificationService');

class NotificationWebSocketServer {
  constructor(server) {
    console.log('🔌 Inicializando NotificationWebSocketServer...');

    this.wss = new WebSocket.Server({
      server,
      path: '/ws/notifications',
      perMessageDeflate: false,
      maxPayload: 1024 * 1024 // 1MB max
    });

    this.clients = new Map(); // userId -> Set of WebSocket connections
    this.heartbeatInterval = setInterval(() => this.checkHeartbeats(), 30000);

    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));

    this.wss.on('listening', () => {
      console.log('✅ NotificationWebSocketServer inicializado correctamente en /ws/notifications');
    });

    this.wss.on('error', (error) => {
      console.error('❌ Error en NotificationWebSocketServer:', error);
    });

    console.log('🔌 NotificationWebSocketServer configurado');
  }

  async handleConnection(ws, req) {
    try {
      const clientIP = req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const isDevelopment = process.env.NODE_ENV !== 'production';

      console.log(`🔐 WebSocket Auth Attempt - IP: ${clientIP}, UA: ${userAgent?.substring(0, 50)}..., ENV: ${process.env.NODE_ENV}`);

      // Autenticación JWT desde query parameters
      const token = req.url.split('token=')[1]?.split('&')[0];

      if (!token) {
        if (isDevelopment) {
          console.warn('⚠️ DEVELOPMENT: WebSocket connection without token allowed for testing');
          console.warn(`⚠️ Client IP: ${clientIP}, Time: ${new Date().toISOString()}`);
          console.warn('⚠️ Remember to enable authentication in production!');

          // En desarrollo, crear usuario de prueba
          const devUserId = 'dev-test-user';
          ws.user = {
            id: devUserId,
            nombre: 'Usuario de Prueba',
            email: 'test@changánet.dev',
            rol: 'cliente',
            esta_verificado: false
          };
          ws.isDevMode = true;

          // Registrar conexión de desarrollo
          this.registerConnection(devUserId, ws);

          // Enviar confirmación de conexión
          ws.send(JSON.stringify({
            type: 'connection_established',
            userId: devUserId,
            timestamp: new Date().toISOString()
          }));

          return;
        } else {
          console.error('🚨 PRODUCTION SECURITY ALERT: WebSocket connection without token BLOCKED!');
          console.error(`🚨 Client IP: ${clientIP}, Time: ${new Date().toISOString()}`);
          ws.close(4001, 'Authentication required');
          return;
        }
      }

      // Verificar el token JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      const userId = decoded.userId || decoded.id;

      // Obtener datos del usuario desde la base de datos
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      try {
        const userData = await prisma.usuarios.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            nombre: true,
            rol: true,
            esta_verificado: true
          }
        });

        if (!userData) {
          console.error(`🚨 SECURITY ALERT: Valid JWT but user not found in DB!`);
          console.error(`🚨 Token userId: ${userId}, IP: ${clientIP}`);
          if (!isDevelopment) {
            ws.close(4003, 'User not found');
            return;
          }
          // En desarrollo, permitir pero loggear
          ws.user = null;
          ws.isUnauthenticated = true;
        } else {
          // Adjuntar datos del usuario al WebSocket
          ws.user = {
            ...decoded,
            ...userData,
            role: userData.rol
          };
        }

        // Registrar conexión
        this.registerConnection(userId, ws);

        console.log(`✅ WebSocket: User authenticated: ${ws.user?.nombre || 'Unknown'} (${ws.user?.email || 'no-email'})`);

        // Enviar confirmación de conexión
        ws.send(JSON.stringify({
          type: 'connection_established',
          userId,
          timestamp: new Date().toISOString()
        }));

        // Enviar notificaciones no leídas pendientes
        await this.sendPendingNotifications(userId);

      } finally {
        await prisma.$disconnect();
      }

    } catch (error) {
      console.error(`🚨 SECURITY ALERT: JWT verification failed!`);
      console.error(`🚨 Error: ${error.message}, IP: ${req.socket.remoteAddress}, Token: ${req.url.split('token=')[1]?.split('&')[0]?.substring(0, 20)}...`);
      ws.close(4002, 'Authentication failed');
    }
  }

  /**
   * Registrar una nueva conexión de usuario
   * @param {string} userId - ID del usuario
   * @param {WebSocket} ws - Instancia del WebSocket
   */
  registerConnection(userId, ws) {
    // Registrar conexión
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(ws);

    // Configurar handlers
    ws.isAlive = true;
    ws.userId = userId;

    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', (data) => this.handleMessage(ws, data));
    ws.on('close', () => this.handleDisconnection(ws));
    ws.on('error', (error) => this.handleError(ws, error));
  }

  async handleMessage(ws, data) {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'mark_as_read':
          await notificationService.markAsRead(message.notificationId);
          // Broadcast update to all user connections
          this.broadcastToUser(ws.userId, {
            type: 'notification_updated',
            notificationId: message.notificationId,
            action: 'marked_as_read'
          });
          break;

        case 'mark_all_as_read':
          await notificationService.markAllAsRead(ws.userId);
          this.broadcastToUser(ws.userId, {
            type: 'all_notifications_read'
          });
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        case 'update_preferences':
          // Aquí podríamos actualizar preferencias en tiempo real
          console.log(`User ${ws.userId} updated notification preferences`);
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  }

  handleDisconnection(ws) {
    if (ws.userId && this.clients.has(ws.userId)) {
      this.clients.get(ws.userId).delete(ws);
      if (this.clients.get(ws.userId).size === 0) {
        this.clients.delete(ws.userId);
      }
    }
  }

  handleError(ws, error) {
    console.error('WebSocket error:', error);
    this.handleDisconnection(ws);
  }

  checkHeartbeats() {
    this.wss.clients.forEach(ws => {
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }

  // Enviar notificación a usuario específico
  async sendToUser(userId, notification) {
    if (!this.clients.has(userId)) return false;

    const message = JSON.stringify({
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString()
    });

    let sent = false;
    for (const ws of this.clients.get(userId)) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sent = true;
      }
    }
    return sent;
  }

  // Broadcast a todos los clientes de un usuario
  broadcastToUser(userId, message) {
    if (!this.clients.has(userId)) return;

    const data = JSON.stringify(message);
    for (const ws of this.clients.get(userId)) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  // Enviar notificaciones pendientes al conectar
  async sendPendingNotifications(userId) {
    try {
      const notifications = await notificationService.getUserNotifications(userId, 'unread');
      if (notifications.notifications.length > 0) {
        this.broadcastToUser(userId, {
          type: 'pending_notifications',
          notifications: notifications.notifications,
          unreadCount: notifications.unreadCount
        });
      }
    } catch (error) {
      console.error('Error sending pending notifications:', error);
    }
  }

  // Obtener estadísticas de conexiones
  getConnectionStats() {
    const stats = {
      totalConnections: this.wss.clients.size,
      activeUsers: this.clients.size,
      connectionsPerUser: {}
    };

    for (const [userId, connections] of this.clients) {
      stats.connectionsPerUser[userId] = connections.size;
    }

    return stats;
  }

  // Cleanup
  close() {
    clearInterval(this.heartbeatInterval);
    this.wss.close();
  }
}

module.exports = NotificationWebSocketServer;
