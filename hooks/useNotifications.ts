import { useState, useEffect, useCallback } from 'react';
import { notificationApi } from '@/lib/notificationApi';
import { useWebSocket } from './useWebSocket';
import {
  Notification,
  NotificationFilters,
  NotificationPreferences,
  NotificationType,
  UseNotificationsReturn,
  WebSocketMessage
} from '@/types/notifications';

export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isConnected: wsConnected, lastMessage } = useWebSocket();

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    const handleWebSocketMessage = (message: WebSocketMessage) => {
      switch (message.type) {
        case 'notification':
          if (message.data) {
            setNotifications(prev => [message.data as Notification, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
          break;

        case 'notification_updated':
          if (message.action === 'marked_as_read' && message.notificationId) {
            setNotifications(prev =>
              prev.map(n =>
                n.id === message.notificationId
                  ? { ...n, esta_leido: true }
                  : n
              )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
          break;

        case 'all_notifications_read':
          setNotifications(prev => prev.map(n => ({ ...n, esta_leido: true })));
          setUnreadCount(0);
          break;

        case 'pending_notifications':
          if (message.notifications) {
            setNotifications(message.notifications as Notification[]);
            setUnreadCount(message.unreadCount || 0);
          }
          break;
      }
    };

    handleWebSocketMessage(lastMessage);
  }, [lastMessage]);

  // Fetch notifications
  const fetchNotifications = useCallback(async (filters?: Partial<NotificationFilters>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await notificationApi.getUserNotifications(filters);
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark notification as read
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

      // API call
      await notificationApi.markAsRead(notificationId);
    } catch (err) {
      // Revert optimistic update on error
      setError('Failed to mark notification as read');
      await fetchNotifications(); // Refetch to sync state
      throw err;
    }
  }, [fetchNotifications]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, esta_leido: true })));
      setUnreadCount(0);

      // API call
      await notificationApi.markAllAsRead();
    } catch (err) {
      // Revert optimistic update on error
      setError('Failed to mark all notifications as read');
      await fetchNotifications(); // Refetch to sync state
      throw err;
    }
  }, [fetchNotifications]);

  // Create notification
  const createNotification = useCallback(async (
    type: NotificationType,
    message: string,
    metadata?: Record<string, any>
  ) => {
    try {
      const notification = await notificationApi.createNotification({
        userId: 'current-user', // This should come from auth context
        type,
        title: message,
        message,
        metadata
      });
      return notification;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create notification';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Load initial data
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    createNotification
  };
};

export default useNotifications;