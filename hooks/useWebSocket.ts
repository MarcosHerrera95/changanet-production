import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationSocket } from '@/lib/socketService';
import { UseWebSocketReturn, WebSocketMessage } from '@/types/notifications';

export const useWebSocket = (): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use ref to store the latest message callback
  const messageCallbackRef = useRef<((data: WebSocketMessage) => void) | null>(null);

  useEffect(() => {
    // Set up event listeners
    const handleConnected = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      setError(null);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };

    const handleError = (data: { error: string }) => {
      setError(data.error);
      setConnectionStatus('error');
      setIsConnected(false);
    };

    const handleMessage = (data: WebSocketMessage) => {
      setLastMessage(data);
      if (messageCallbackRef.current) {
        messageCallbackRef.current(data);
      }
    };

    // Subscribe to events
    notificationSocket.on('connected', handleConnected);
    notificationSocket.on('disconnected', handleDisconnected);
    notificationSocket.on('error', handleError);
    notificationSocket.on('notification', handleMessage);
    notificationSocket.on('notification_updated', handleMessage);
    notificationSocket.on('all_notifications_read', handleMessage);
    notificationSocket.on('pending_notifications', handleMessage);
    notificationSocket.on('connection_established', handleMessage);
    notificationSocket.on('pong', handleMessage);

    // Cleanup function
    return () => {
      notificationSocket.off('connected', handleConnected);
      notificationSocket.off('disconnected', handleDisconnected);
      notificationSocket.off('error', handleError);
      notificationSocket.off('notification', handleMessage);
      notificationSocket.off('notification_updated', handleMessage);
      notificationSocket.off('all_notifications_read', handleMessage);
      notificationSocket.off('pending_notifications', handleMessage);
      notificationSocket.off('connection_established', handleMessage);
      notificationSocket.off('pong', handleMessage);
    };
  }, []);

  const reconnect = useCallback(async () => {
    setConnectionStatus('connecting');
    try {
      await notificationSocket.reconnect();
    } catch (err) {
      setError('Failed to reconnect');
      setConnectionStatus('error');
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    notificationSocket.sendMessage(message.type || 'message', message);
  }, []);

  // Auto-connect when component mounts if we have a token
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token && !isConnected && connectionStatus === 'disconnected') {
      setConnectionStatus('connecting');
      notificationSocket.connect(token).catch(err => {
        console.error('Failed to connect WebSocket:', err);
        setError('Failed to connect');
        setConnectionStatus('error');
      });
    }
  }, [isConnected, connectionStatus]);

  return {
    isConnected,
    connectionStatus,
    reconnect,
    sendMessage,
    lastMessage,
    error
  };
};

export default useWebSocket;