// Notification Types and Interfaces for ChangAnet Frontend

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';

export type NotificationType =
  | 'mensaje'
  | 'cotizacion'
  | 'servicio'
  | 'pago'
  | 'sistema'
  | 'urgente'
  | 'recordatorio';

export type NotificationChannel = 'push' | 'email' | 'sms' | 'in_app';

export interface Notification {
  id: string;
  usuario_id: string;
  tipo: NotificationType;
  subtipo?: string;
  prioridad: NotificationPriority;
  titulo: string;
  mensaje: string;
  metadata: Record<string, any>;
  esta_leido: boolean;
  canales_enviados: NotificationChannel[];
  fecha_envio: string;
  creado_en: string;
  actualizado_en?: string;
}

export interface NotificationGroup {
  id: string;
  type: 'group';
  title: string;
  count: number;
  notifications: Notification[];
  lastUpdated: string;
  priority: NotificationPriority;
}

export type NotificationItem = Notification | NotificationGroup;

export interface NotificationPreferences {
  id: string;
  usuario_id: string;
  enabled: boolean;
  timezone: string;
  canales: Record<NotificationChannel, boolean>;
  categorias: Record<NotificationType, {
    enabled: boolean;
    priority: NotificationPriority[];
    channels: NotificationChannel[];
  }>;
  quiet_hours_enabled: boolean;
  quiet_start_time?: string;
  quiet_end_time?: string;
  summary_frequency: 'immediate' | 'hourly' | 'daily';
  max_notifications_per_hour: number;
  group_similar: boolean;
  sound_enabled: boolean;
  creado_en: string;
  actualizado_en?: string;
}

export interface NotificationFilters {
  filter: 'all' | 'unread' | 'read';
  priority?: NotificationPriority;
  type?: NotificationType;
  page: number;
  limit: number;
  sortBy: 'creado_en' | 'prioridad' | 'tipo';
  sortOrder: 'asc' | 'desc';
}

export interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  unreadCount: number;
}

export interface WebSocketMessage {
  type:
    | 'connection_established'
    | 'notification'
    | 'notification_updated'
    | 'all_notifications_read'
    | 'pending_notifications'
    | 'error'
    | 'pong';
  data?: Notification;
  notificationId?: string;
  action?: 'marked_as_read';
  notifications?: Notification[];
  unreadCount?: number;
  timestamp?: string;
  message?: string;
}

export interface NotificationContextType {
  // State
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  preferences: NotificationPreferences | null;
  loading: boolean;

  // Methods
  fetchNotifications: (filters?: Partial<NotificationFilters>) => Promise<NotificationResponse>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  createNotification: (type: NotificationType, message: string, metadata?: Record<string, any>) => Promise<Notification>;
  fetchPreferences: () => Promise<NotificationPreferences>;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<NotificationPreferences>;

  // WebSocket status
  wsConnected: boolean;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnect: () => void;
  sendMessage: (message: any) => void;
  lastMessage: WebSocketMessage | null;
  error: string | null;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: (filters?: Partial<NotificationFilters>) => Promise<NotificationResponse>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  createNotification: (type: NotificationType, message: string, metadata?: Record<string, any>) => Promise<Notification>;
}