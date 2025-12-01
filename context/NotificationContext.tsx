'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { notificationApi } from '@/lib/notificationApi';
import { notificationSocket } from '@/lib/socketService';
import type {
  Notification,
  NotificationPreferences,
  NotificationFilters,
  NotificationResponse,
  NotificationType,
  NotificationContextType,
  WebSocketMessage
} from '@/types/notifications';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);

  // WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const connectWebSocket = async () => {
      try {
        await notificationSocket.connect(token);
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      notificationSocket.disconnect();
    };
  }, []);

  // WebSocket event handlers
  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleNotification = (data: WebSocketMessage) => {
      if (data.type === 'notification' && data.data) {
        setNotifications(prev => [data.data as Notification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Show browser notification for critical notifications
        if ((data.data as Notification).prioridad === 'critical') {
          showBrowserNotification((data.data as Notification).titulo, (data.data as Notification).mensaje);
        }
      }
    };

    const handleNotificationUpdated = (data: WebSocketMessage) => {
      if (data.action === 'marked_as_read' && data.notificationId) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === data.notificationId
              ? { ...n, esta_leido: true }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    };

    const handleAllRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, esta_leido: true })));
      setUnreadCount(0);
    };

    const handlePendingNotifications = (data: WebSocketMessage) => {
      if (data.notifications) {
        setNotifications(data.notifications as Notification[]);
        setUnreadCount(data.unreadCount || 0);
      }
    };

    // Subscribe to WebSocket events
    notificationSocket.on('connected', handleConnected);
    notificationSocket.on('disconnected', handleDisconnected);
    notificationSocket.on('notification', handleNotification);
    notificationSocket.on('notification_updated', handleNotificationUpdated);
    notificationSocket.on('all_notifications_read', handleAllRead);
    notificationSocket.on('pending_notifications', handlePendingNotifications);

    return () => {
      notificationSocket.off('connected', handleConnected);
      notificationSocket.off('disconnected', handleDisconnected);
      notificationSocket.off('notification', handleNotification);
      notificationSocket.off('notification_updated', handleNotificationUpdated);
      notificationSocket.off('all_notifications_read', handleAllRead);
      notificationSocket.off('pending_notifications', handlePendingNotifications);
    };
  }, []);

  const showBrowserNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/badge.png'
      });
    }
  };

  // API methods
  const fetchNotifications = useCallback(async (options: Partial<NotificationFilters> = {}): Promise<NotificationResponse> => {
    setLoading(true);
    try {
      const response = await notificationApi.getUserNotifications(options);
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
      return response;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, esta_leido: true }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      await notificationApi.markAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Revert optimistic update
      await fetchNotifications();
      throw error;
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, esta_leido: true })));
      setUnreadCount(0);

      await notificationApi.markAllAsRead();
    } catch (error) {
      console.error('Error marking all as read:', error);
      // Revert optimistic update
      await fetchNotifications();
      throw error;
    }
  }, [fetchNotifications]);

  const createNotification = useCallback(async (
    type: NotificationType,
    message: string,
    metadata: Record<string, any> = {}
  ): Promise<Notification> => {
    try {
      // For demo purposes, we'll create a local notification
      // In a real app, this would call the API
      const newNotification: Notification = {
        id: Date.now().toString(),
        usuario_id: 'current-user',
        tipo: type,
        prioridad: 'medium',
        titulo: message,
        mensaje: message,
        metadata,
        esta_leido: false,
        canales_enviados: ['in_app'],
        fecha_envio: new Date().toISOString(),
        creado_en: new Date().toISOString()
      };

      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);

      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }, []);

  // Preferences management
  const fetchPreferences = useCallback(async (): Promise<NotificationPreferences> => {
    try {
      const prefs = await notificationApi.getUserPreferences();
      setPreferences(prefs);
      return prefs;
    } catch (error) {
      console.error('Error fetching preferences:', error);
      throw error;
    }
  }, []);

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    try {
      const updated = await notificationApi.updateUserPreferences(newPreferences);
      setPreferences(updated);
      return updated;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }, []);

  const value: NotificationContextType = {
    // State
    notifications,
    unreadCount,
    isConnected,
    preferences,
    loading,

    // Methods
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    createNotification,
    fetchPreferences,
    updatePreferences,

    // WebSocket status
    wsConnected: isConnected
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;