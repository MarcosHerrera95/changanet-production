/**
 * Servicio Socket.IO cliente para comunicación en tiempo real
 * Reemplaza el sistema de chat basado en Firebase RTDB
 * Implementa conexión autenticada con el backend Socket.IO
 */

import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.messageListeners = new Map();
    this.connectionListeners = new Set();
  }

  /**
   * Conecta al servidor Socket.IO con autenticación JWT
   */
  connect() {
    if (this.socket?.connected) {
      console.log('Socket.IO ya está conectado');
      return;
    }

    const token = localStorage.getItem('changanet_token');
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003';

    console.log('Conectando a Socket.IO:', backendUrl);

    this.socket = io(backendUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 5000,
      forceNew: true
    });

    this.setupEventListeners();
  }

  /**
   * Configura los event listeners del socket
   */
  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Socket.IO conectado:', this.socket.id);
      this.isConnected = true;
      this.notifyConnectionListeners(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO desconectado:', reason);
      this.isConnected = false;
      this.notifyConnectionListeners(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚨 Error de conexión Socket.IO:', error.message);
      this.isConnected = false;
      this.notifyConnectionListeners(false);
    });

    // Event listeners para mensajes
    this.socket.on('receiveMessage', (message) => {
      this.notifyMessageListeners('receiveMessage', message);
    });

    this.socket.on('messageSent', (message) => {
      this.notifyMessageListeners('messageSent', message);
    });

    this.socket.on('messagesRead', (data) => {
      this.notifyMessageListeners('messagesRead', data);
    });

    this.socket.on('error', (error) => {
      console.error('Error de Socket.IO:', error);
      this.notifyMessageListeners('error', error);
    });
  }

  /**
   * Desconecta del servidor Socket.IO
   */
  disconnect() {
    if (this.socket) {
      console.log('Desconectando Socket.IO');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.notifyConnectionListeners(false);
    }
  }

  /**
   * Une al usuario a su sala personal
   */
  joinUserRoom(userId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join', userId);
      console.log(`Usuario ${userId} unido a sala personal`);
    } else {
      console.warn('Socket no conectado, no se puede unir a sala');
    }
  }

  /**
   * Envía un mensaje a otro usuario
   */
  sendMessage(remitenteId, destinatarioId, contenido, urlImagen = null) {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket.IO no está conectado');
    }

    const messageData = {
      remitente_id: remitenteId,
      destinatario_id: destinatarioId,
      contenido: contenido,
      url_imagen: urlImagen
    };

    console.log('Enviando mensaje:', messageData);
    this.socket.emit('sendMessage', messageData);
  }

  /**
   * Marca mensajes como leídos
   */
  markMessagesAsRead(senderId, recipientId) {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket.IO no está conectado');
    }

    this.socket.emit('markAsRead', { senderId, recipientId });
  }

  /**
   * Agrega un listener para eventos de mensajes
   */
  addMessageListener(event, callback) {
    if (!this.messageListeners.has(event)) {
      this.messageListeners.set(event, new Set());
    }
    this.messageListeners.get(event).add(callback);
  }

  /**
   * Remueve un listener de mensajes
   */
  removeMessageListener(event, callback) {
    const listeners = this.messageListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Notifica a todos los listeners de mensajes
   */
  notifyMessageListeners(event, data) {
    const listeners = this.messageListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error en message listener:', error);
        }
      });
    }
  }

  /**
   * Agrega un listener para eventos de conexión
   */
  addConnectionListener(callback) {
    this.connectionListeners.add(callback);
  }

  /**
   * Remueve un listener de conexión
   */
  removeConnectionListener(callback) {
    this.connectionListeners.delete(callback);
  }

  /**
   * Notifica a todos los listeners de conexión
   */
  notifyConnectionListeners(isConnected) {
    this.connectionListeners.forEach(callback => {
      try {
        callback(isConnected);
      } catch (error) {
        console.error('Error en connection listener:', error);
      }
    });
  }

  /**
   * Obtiene el estado de conexión
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null
    };
  }
}

// Instancia singleton del servicio
const socketService = new SocketService();

export default socketService;
