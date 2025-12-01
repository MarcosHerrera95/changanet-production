/**
 * @hook useNotifications - Hook personalizado para gestión de notificaciones
 * @descripción Maneja estado y operaciones de notificaciones del usuario (REQ-19)
 * @sprint Sprint 2 – Notificaciones y Comunicación
 * @tarjeta Tarjeta 4: [Frontend] Implementar Hook de Notificaciones
 * @impacto Social: Estado reactivo de notificaciones para usuarios con discapacidades
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as notificationService from '../services/notificationService';

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Función para cargar notificaciones
  const loadNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const data = await notificationService.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
      setError('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Función para marcar notificación como leída
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);

      // Actualizar estado local
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, esta_leido: true }
            : notification
        )
      );

      // Actualizar contador
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marcando notificación como leída:', err);
      setError('Error al marcar notificación como leída');
    }
  }, []);

  // Función para marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();

      // Actualizar estado local
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, esta_leido: true }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error('Error marcando todas las notificaciones como leídas:', err);
      setError('Error al marcar todas las notificaciones como leídas');
    }
  }, []);

  // Función para eliminar notificación
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);

      // Actualizar estado local
      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      // Actualizar contador si era no leída
      if (deletedNotification && !deletedNotification.esta_leido) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error eliminando notificación:', err);
      setError('Error al eliminar notificación');
    }
  }, [notifications]);

  // Función para refrescar notificaciones
  const refreshNotifications = useCallback(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Cargar notificaciones al montar o cambiar de usuario
  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, loadNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications: loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications
  };
};
