'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, X, Clock, Bell, Smartphone, Mail, MessageSquare } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import type { NotificationPreferences, NotificationType, NotificationChannel } from '@/types/notifications';
import { cn } from '@/lib/utils';

interface NotificationPreferencesProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationPreferencesComponent: React.FC<NotificationPreferencesProps> = ({
  isOpen,
  onClose
}) => {
  const { preferences, fetchPreferences, updatePreferences } = useNotifications();
  const [localPreferences, setLocalPreferences] = useState<Partial<NotificationPreferences>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load preferences when opened
  useEffect(() => {
    if (isOpen && !preferences) {
      fetchPreferences().catch(console.error);
    }
  }, [isOpen, preferences, fetchPreferences]);

  // Sync local state with fetched preferences
  useEffect(() => {
    if (preferences) {
      setLocalPreferences({ ...preferences });
    }
  }, [preferences]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePreferences(localPreferences);
      onClose();
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    setLocalPreferences(prev => ({ ...prev, [key]: value }));
  };

  const updateChannelPreference = (channel: NotificationChannel, enabled: boolean) => {
    setLocalPreferences(prev => ({
      ...prev,
      canales: {
        ...prev.canales,
        [channel]: enabled
      }
    }));
  };

  const updateCategoryPreference = (
    category: NotificationType,
    setting: 'enabled' | 'priority' | 'channels',
    value: any
  ) => {
    setLocalPreferences(prev => ({
      ...prev,
      categorias: {
        ...prev.categorias,
        [category]: {
          ...prev.categorias?.[category],
          [setting]: value
        }
      }
    }));
  };

  const notificationTypes: { value: NotificationType; label: string; description: string }[] = [
    { value: 'mensaje', label: 'Mensajes', description: 'Mensajes directos y conversaciones' },
    { value: 'cotizacion', label: 'Cotizaciones', description: 'Solicitudes de presupuesto y ofertas' },
    { value: 'servicio', label: 'Servicios', description: 'Actualizaciones de servicios y estado' },
    { value: 'pago', label: 'Pagos', description: 'Confirmaciones y actualizaciones de pago' },
    { value: 'sistema', label: 'Sistema', description: 'Notificaciones del sistema y mantenimiento' },
    { value: 'urgente', label: 'Urgentes', description: 'Alertas críticas y emergencias' },
    { value: 'recordatorio', label: 'Recordatorios', description: 'Recordatorios de citas y tareas' }
  ];

  const channels: { value: NotificationChannel; label: string; icon: React.ReactNode }[] = [
    { value: 'push', label: 'Push', icon: <Smartphone className="w-4 h-4" /> },
    { value: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
    { value: 'sms', label: 'SMS', icon: <MessageSquare className="w-4 h-4" /> },
    { value: 'in_app', label: 'En App', icon: <Bell className="w-4 h-4" /> }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Preferencias de Notificaciones</h2>
              <p className="text-sm text-gray-600">Configura cómo quieres recibir tus notificaciones</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-[70vh] p-6">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* General Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Configuración General</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zona Horaria
                    </label>
                    <select
                      value={localPreferences.timezone || 'America/Buenos_Aires'}
                      onChange={(e) => updatePreference('timezone', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="America/Buenos_Aires">Buenos Aires (GMT-3)</option>
                      <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                      <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                      <option value="America/New_York">Nueva York (GMT-5)</option>
                      <option value="Europe/Madrid">Madrid (GMT+1)</option>
                      <option value="Europe/London">Londres (GMT+0)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frecuencia de Resumen
                    </label>
                    <select
                      value={localPreferences.summary_frequency || 'immediate'}
                      onChange={(e) => updatePreference('summary_frequency', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="immediate">Inmediato</option>
                      <option value="hourly">Cada hora</option>
                      <option value="daily">Diario</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={localPreferences.enabled !== false}
                      onChange={(e) => updatePreference('enabled', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Notificaciones habilitadas</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={localPreferences.group_similar !== false}
                      onChange={(e) => updatePreference('group_similar', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Agrupar notificaciones similares</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={localPreferences.sound_enabled !== false}
                      onChange={(e) => updatePreference('sound_enabled', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Sonido habilitado</span>
                  </label>
                </div>
              </div>

              {/* Quiet Hours */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Horas de Silencio</span>
                </h3>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={localPreferences.quiet_hours_enabled || false}
                    onChange={(e) => updatePreference('quiet_hours_enabled', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Habilitar horas de silencio</span>
                </label>

                {localPreferences.quiet_hours_enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hora de Inicio
                      </label>
                      <input
                        type="time"
                        value={localPreferences.quiet_start_time || '22:00'}
                        onChange={(e) => updatePreference('quiet_start_time', e.target.value)}
                        className="border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hora de Fin
                      </label>
                      <input
                        type="time"
                        value={localPreferences.quiet_end_time || '08:00'}
                        onChange={(e) => updatePreference('quiet_end_time', e.target.value)}
                        className="border rounded px-3 py-2"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Channels */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Canales de Notificación</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {channels.map((channel) => (
                    <label
                      key={channel.value}
                      className={cn(
                        'flex items-center space-x-2 p-3 border rounded cursor-pointer hover:bg-gray-50',
                        localPreferences.canales?.[channel.value] && 'bg-blue-50 border-blue-200'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={localPreferences.canales?.[channel.value] || false}
                        onChange={(e) => updateChannelPreference(channel.value, e.target.checked)}
                        className="rounded"
                      />
                      {channel.icon}
                      <span className="text-sm font-medium">{channel.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Categorías de Notificación</h3>
                <div className="space-y-4">
                  {notificationTypes.map((type) => (
                    <div key={type.value} className="border rounded p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{type.label}</h4>
                          <p className="text-sm text-gray-600">{type.description}</p>
                        </div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={localPreferences.categorias?.[type.value]?.enabled !== false}
                            onChange={(e) => updateCategoryPreference(type.value, 'enabled', e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-sm">Habilitado</span>
                        </label>
                      </div>

                      {localPreferences.categorias?.[type.value]?.enabled && (
                        <div className="ml-4 space-y-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Prioridades mínimas
                            </label>
                            <select
                              value={localPreferences.categorias?.[type.value]?.priority?.[0] || 'low'}
                              onChange={(e) => updateCategoryPreference(type.value, 'priority', [e.target.value])}
                              className="border rounded px-3 py-1 text-sm"
                            >
                              <option value="low">Baja o superior</option>
                              <option value="medium">Media o superior</option>
                              <option value="high">Alta o superior</option>
                              <option value="critical">Solo críticas</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferencesComponent;