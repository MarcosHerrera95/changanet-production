'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Settings,
  X,
  Filter,
  Search,
  Archive,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import type { Notification, NotificationPriority, NotificationType } from '@/types/notifications';
import { cn } from '@/lib/utils';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPreferences?: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onOpenPreferences
}) => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    fetchNotifications
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [priority, setPriority] = useState<'all' | NotificationPriority>('all');
  const [type, setType] = useState<'all' | NotificationType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Fetch notifications when opened or filters change
  useEffect(() => {
    if (isOpen) {
      fetchNotifications({
        filter,
        priority: priority === 'all' ? undefined : priority,
        type: type === 'all' ? undefined : type
      });
    }
  }, [isOpen, filter, priority, type, fetchNotifications]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedNotifications(new Set());
      setShowBulkActions(false);
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleBulkMarkAsRead = async () => {
    for (const id of Array.from(selectedNotifications)) {
      await handleMarkAsRead(id);
    }
    setSelectedNotifications(new Set());
    setShowBulkActions(false);
  };

  const toggleNotificationSelection = (notificationId: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(notificationId)) {
      newSelected.delete(notificationId);
    } else {
      newSelected.add(notificationId);
    }
    setSelectedNotifications(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const selectAllNotifications = () => {
    if (selectedNotifications.size === notifications.length) {
      setSelectedNotifications(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedNotifications(new Set(notifications.map(n => n.id)));
      setShowBulkActions(true);
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = searchTerm === '' ||
      notification.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.mensaje.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const getPriorityColor = (priority: NotificationPriority) => {
    const colors = {
      critical: 'border-red-500 bg-red-50 text-red-700',
      high: 'border-orange-500 bg-orange-50 text-orange-700',
      medium: 'border-yellow-500 bg-yellow-50 text-yellow-700',
      low: 'border-gray-500 bg-gray-50 text-gray-700'
    };
    return colors[priority] || colors.medium;
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diff = now.getTime() - notificationDate.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;
    return notificationDate.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Bell className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Centro de Notificaciones</h2>
              <p className="text-sm text-gray-600">
                {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {showBulkActions && (
              <div className="flex items-center space-x-2 mr-4">
                <button
                  onClick={handleBulkMarkAsRead}
                  className="flex items-center space-x-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Marcar como leídas ({selectedNotifications.size})</span>
                </button>
              </div>
            )}
            <button
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
              title="Marcar todas como leídas"
            >
              <CheckCheck className="w-5 h-5" />
            </button>
            <button
              onClick={onOpenPreferences}
              className="p-2 hover:bg-gray-100 rounded"
              title="Configurar notificaciones"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar notificaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'read')}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="all">Todas</option>
                <option value="unread">No leídas</option>
                <option value="read">Leídas</option>
              </select>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'all' | NotificationPriority)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="all">Todas las prioridades</option>
                <option value="critical">Críticas</option>
                <option value="high">Altas</option>
                <option value="medium">Medias</option>
                <option value="low">Bajas</option>
              </select>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'all' | NotificationType)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="all">Todos los tipos</option>
                <option value="mensaje">Mensajes</option>
                <option value="cotizacion">Cotizaciones</option>
                <option value="servicio">Servicios</option>
                <option value="pago">Pagos</option>
                <option value="sistema">Sistema</option>
              </select>
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={selectAllNotifications}
                className="px-3 py-2 text-sm border rounded hover:bg-gray-100"
              >
                {selectedNotifications.size === notifications.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center p-12 text-gray-500">
              <Bell className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No hay notificaciones</h3>
              <p>Las notificaciones aparecerán aquí cuando las recibas.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-4 hover:bg-gray-50 transition-colors border-l-4',
                    !notification.esta_leido && 'bg-blue-50',
                    selectedNotifications.has(notification.id) && 'bg-blue-100',
                    notification.prioridad === 'critical' && 'border-red-500',
                    notification.prioridad === 'high' && 'border-orange-500',
                    notification.prioridad === 'medium' && 'border-yellow-500',
                    notification.prioridad === 'low' && 'border-gray-500'
                  )}
                >
                  <div className="flex items-start space-x-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedNotifications.has(notification.id)}
                      onChange={() => toggleNotificationSelection(notification.id)}
                      className="mt-1"
                    />

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {notification.titulo}
                        </h3>
                        <span className={cn(
                          'px-2 py-1 text-xs rounded-full border',
                          getPriorityColor(notification.prioridad)
                        )}>
                          {notification.prioridad}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {notification.tipo}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {notification.mensaje}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {formatTime(notification.creado_en)}
                        </span>
                        <div className="flex items-center space-x-2">
                          {!notification.esta_leido && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Marcar como leída
                            </button>
                          )}
                          <button className="p-1 hover:bg-gray-200 rounded">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;