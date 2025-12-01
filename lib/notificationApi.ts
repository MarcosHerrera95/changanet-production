import { apiClient } from './api';
import {
  Notification,
  NotificationPreferences,
  NotificationFilters,
  NotificationResponse,
  NotificationType,
  NotificationChannel
} from '@/types/notifications';

// Notification API methods
export const notificationApi = {
  // Get user notifications with filters and pagination
  getUserNotifications: async (
    filters: Partial<NotificationFilters> = {}
  ): Promise<NotificationResponse> => {
    const params = {
      filter: filters.filter || 'all',
      priority: filters.priority,
      type: filters.type,
      page: filters.page || 1,
      limit: filters.limit || 20,
      sortBy: filters.sortBy || 'creado_en',
      sortOrder: filters.sortOrder || 'desc'
    };

    const response = await apiClient.get<NotificationResponse>('/notifications', params);
    return response.data.data;
  },

  // Get unread count
  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get<{ count: number }>('/notifications/unread-count');
    return response.data.data;
  },

  // Mark notification as read
  markAsRead: async (notificationId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.put<{ success: boolean }>(`/notifications/${notificationId}/read`);
    return response.data.data;
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<{ success: boolean; count: number }> => {
    const response = await apiClient.put<{ success: boolean; count: number }>('/notifications/mark-all-read');
    return response.data.data;
  },

  // Create notification (admin/internal use)
  createNotification: async (data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    priority?: 'critical' | 'high' | 'medium' | 'low';
    metadata?: Record<string, any>;
    channels?: NotificationChannel[];
  }): Promise<Notification> => {
    const response = await apiClient.post<Notification>('/notifications', data);
    return response.data.data;
  },

  // Delete notification
  deleteNotification: async (notificationId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/notifications/${notificationId}`);
    return response.data.data;
  },

  // Get notification preferences
  getUserPreferences: async (): Promise<NotificationPreferences> => {
    const response = await apiClient.get<NotificationPreferences>('/notifications/preferences');
    return response.data.data;
  },

  // Update notification preferences
  updateUserPreferences: async (
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> => {
    const response = await apiClient.put<NotificationPreferences>('/notifications/preferences', preferences);
    return response.data.data;
  },

  // Get notification statistics
  getNotificationStats: async (period: 'day' | 'week' | 'month' = 'week'): Promise<{
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
    byPriority: Record<string, number>;
    byChannel: Record<NotificationChannel, number>;
  }> => {
    const response = await apiClient.get<{
      total: number;
      unread: number;
      byType: Record<NotificationType, number>;
      byPriority: Record<string, number>;
      byChannel: Record<NotificationChannel, number>;
    }>('/notifications/stats', { period });
    return response.data.data;
  },

  // Test notification (for development)
  testNotification: async (data: {
    type: NotificationType;
    title: string;
    message: string;
    priority?: 'critical' | 'high' | 'medium' | 'low';
    channels?: NotificationChannel[];
  }): Promise<{ success: boolean; notificationId: string }> => {
    const response = await apiClient.post<{ success: boolean; notificationId: string }>('/notifications/test', data);
    return response.data.data;
  },

  // Bulk operations
  bulkMarkAsRead: async (notificationIds: string[]): Promise<{ success: boolean; count: number }> => {
    const response = await apiClient.put<{ success: boolean; count: number }>('/notifications/bulk-read', { notificationIds });
    return response.data.data;
  },

  bulkDelete: async (notificationIds: string[]): Promise<{ success: boolean; count: number }> => {
    const response = await apiClient.post<{ success: boolean; count: number }>('/notifications/bulk-delete', { notificationIds });
    return response.data.data;
  },

  // Get grouped notifications (intelligent grouping)
  getGroupedNotifications: async (
    filters: Partial<NotificationFilters> = {}
  ): Promise<{ groups: any[]; singles: Notification[] }> => {
    const params = {
      ...filters,
      grouped: true
    };
    const response = await apiClient.get<{ groups: any[]; singles: Notification[] }>('/notifications/grouped', params);
    return response.data.data;
  }
};

export default notificationApi;