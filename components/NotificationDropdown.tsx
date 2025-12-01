'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Settings, X, Filter } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import type { Notification, NotificationPriority } from '@/types/notifications';
import { cn } from '@/lib/utils';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPreferences?: () => void;
  className?: string;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  onOpenPreferences,
  className
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Fetch notifications when opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications({
        filter,
        priority: priority === 'all' ? undefined : priority
      });
    }
  }, [isOpen, filter, priority, fetchNotifications]);

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

  const getPriorityColor = (priority: NotificationPriority) => {
    const colors = {
      critical: 'border-red-500 bg-red-50',
      high: 'border-orange-500 bg-orange-50',
      medium: 'border-yellow-500 bg-yellow-50',
      low: 'border-gray-500 bg-gray-50'
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
    return `Hace ${days}d`;
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={cn(
        'absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border z-50 max-h-[80vh] overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5" />
          <h3 className="font-semibold text-gray-900">Notificaciones</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
            title="Marcar todas como leídas"
          >
            <CheckCheck className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2 p-3 border-b bg-gray-50">
        <Filter className="w-4 h-4 text-gray-500" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'read')}
          className="text-sm border rounded px-2 py-1 bg-white"
        >
          <option value="all">Todas</option>
          <option value="unread">No leídas</option>
          <option value="read">Leídas</option>
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as 'all' | NotificationPriority)}
          className="text-sm border rounded px-2 py-1 bg-white"
        >
          <option value="all">Todas las prioridades</option>
          <option value="critical">Críticas</option>
          <option value="high">Altas</option>
          <option value="medium">Medias</option>
          <option value="low">Bajas</option>
        </select>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay notificaciones</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification: Notification) => (
              <div
                key={notification.id}
                className={cn(
                  'p-4 hover:bg-gray-50 cursor-pointer transition-colors',
                  !notification.esta_leido && 'bg-blue-50'
                )}
                onClick={() => handleMarkAsRead(notification.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className={cn(
                    'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                    !notification.esta_leido ? 'bg-blue-500' : 'bg-gray-300'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {notification.titulo}
                      </h4>
                      <span className={cn(
                        'px-2 py-0.5 text-xs rounded-full border',
                        getPriorityColor(notification.prioridad)
                      )}>
                        {notification.prioridad}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {notification.mensaje}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {formatTime(notification.creado_en)}
                      </span>
                      {!notification.esta_leido && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Marcar como leída
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t bg-gray-50">
        <button
          onClick={onOpenPreferences}
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 w-full"
        >
          <Settings className="w-4 h-4" />
          <span>Configurar notificaciones</span>
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;