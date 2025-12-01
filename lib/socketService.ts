import { WebSocketMessage } from '@/types/notifications';

class NotificationSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;

  // Event listeners
  private listeners: Map<string, ((data: any) => void)[]> = new Map();

  constructor() {
    this.setupHeartbeat();
  }

  /**
   * Connect to WebSocket server
   */
  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || (this.socket && this.socket.readyState === WebSocket.OPEN)) {
        resolve();
        return;
      }

      this.isConnecting = true;
      const authToken = token || localStorage.getItem('authToken');

      if (!authToken) {
        reject(new Error('No authentication token available'));
        this.isConnecting = false;
        return;
      }

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3003';
      const fullUrl = `${wsUrl}/ws/notifications?token=${encodeURIComponent(authToken)}`;

      this.socket = new WebSocket(fullUrl);

      this.socket.onopen = () => {
        console.log('Notification WebSocket connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.emit('connected', { timestamp: new Date().toISOString() });
        resolve();
      };

      this.socket.onclose = (event) => {
        console.log('Notification WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.emit('disconnected', { code: event.code, reason: event.reason });
        this.attemptReconnect();
      };

      this.socket.onerror = (error) => {
        console.error('Notification WebSocket error:', error);
        this.isConnecting = false;
        this.emit('error', { error: 'WebSocket connection failed' });
        reject(new Error('WebSocket connection failed'));
        this.attemptReconnect();
      };

      this.socket.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: WebSocketMessage): void {
    switch (data.type) {
      case 'notification':
        this.emit('notification', data);
        break;
      case 'notification_updated':
        this.emit('notification_updated', data);
        break;
      case 'all_notifications_read':
        this.emit('all_notifications_read', data);
        break;
      case 'pending_notifications':
        this.emit('pending_notifications', data);
        break;
      case 'connection_established':
        this.emit('connection_established', data);
        break;
      case 'pong':
        this.emit('pong', data);
        break;
      case 'error':
        this.emit('error', data);
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  /**
   * Send message to server
   */
  sendMessage(type: string, data: any = {}): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, ...data });
      this.socket.send(message);
    } else {
      console.warn('WebSocket not connected, cannot send message:', type);
    }
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    this.sendMessage('mark_as_read', { notificationId });
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.sendMessage('mark_all_as_read');
  }

  /**
   * Send ping for heartbeat
   */
  ping(): void {
    this.sendMessage('ping', { timestamp: Date.now() });
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN || false;
  }

  /**
   * Get connection status
   */
  get connectionStatus(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    if (this.isConnecting) return 'connecting';
    if (this.isConnected) return 'connected';
    return 'disconnected';
  }

  /**
   * Add event listener
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (data: any) => void): void {
    if (!this.listeners.has(event)) return;

    if (callback) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket event listener:', error);
        }
      });
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('error', { error: 'Max reconnection attempts reached' });
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, this.reconnectInterval * this.reconnectAttempts); // Exponential backoff
  }

  /**
   * Setup heartbeat mechanism
   */
  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Force reconnection
   */
  reconnect(): Promise<void> {
    this.disconnect();
    return this.connect();
  }
}

// Export singleton instance
export const notificationSocket = new NotificationSocketService();
export default notificationSocket;