/**
 * Availability Editor Component
 * Form for creating and editing recurring availability rules
 */

import { useState, useEffect } from 'react';
import { useAvailabilityConfigs, useConflictDetection } from '../hooks/useAvailability.js';
import { format, addMonths } from 'date-fns';

const RECURRENCE_TYPES = {
  NONE: 'none',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  CUSTOM: 'custom'
};

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 0, label: 'Domingo', short: 'Dom' }
];

const AvailabilityEditor = ({
  professionalId,
  config = null,
  onSave,
  onCancel,
  timezone = 'America/Buenos_Aires'
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_active: true,
    recurrence_type: RECURRENCE_TYPES.NONE,
    recurrence_config: {},
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: null,
    start_time: '09:00',
    end_time: '17:00',
    duration_minutes: 60,
    timezone,
    dst_handling: 'auto',
    meta: {}
  });

  const [recurrenceConfig, setRecurrenceConfig] = useState({
    // Daily config
    interval: 1,
    // Weekly config
    days_of_week: [1, 2, 3, 4, 5], // Monday to Friday
    // Monthly config
    day_of_month: 1,
    week_of_month: null,
    // Custom config
    rrule: ''
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createConfig, updateConfig, generateSlots } = useAvailabilityConfigs(professionalId);
  const { checkConflicts, checking: checkingConflicts } = useConflictDetection();

  // Initialize form with existing config data
  useEffect(() => {
    if (config) {
      setFormData({
        title: config.title || '',
        description: config.description || '',
        is_active: config.is_active ?? true,
        recurrence_type: config.recurrence_type || RECURRENCE_TYPES.NONE,
        recurrence_config: config.recurrence_config ? JSON.parse(config.recurrence_config) : {},
        start_date: config.start_date || format(new Date(), 'yyyy-MM-dd'),
        end_date: config.end_date || null,
        start_time: config.start_time || '09:00',
        end_time: config.end_time || '17:00',
        duration_minutes: config.duration_minutes || 60,
        timezone: config.timezone || timezone,
        dst_handling: config.dst_handling || 'auto',
        meta: config.meta ? JSON.parse(config.meta) : {}
      });

      if (config.recurrence_config) {
        setRecurrenceConfig(JSON.parse(config.recurrence_config));
      }
    }
  }, [config, timezone]);

  // Handle form field changes
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Handle recurrence config changes
  const handleRecurrenceChange = (field, value) => {
    setRecurrenceConfig(prev => ({ ...prev, [field]: value }));
  };

  // Validate form data
  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = 'El título es obligatorio';
    }

    if (!formData.start_time || !formData.end_time) {
      errors.time = 'Los horarios de inicio y fin son obligatorios';
    } else if (formData.start_time >= formData.end_time) {
      errors.time = 'La hora de fin debe ser posterior a la hora de inicio';
    }

    if (formData.duration_minutes < 15 || formData.duration_minutes > 480) {
      errors.duration_minutes = 'La duración debe estar entre 15 y 480 minutos';
    }

    if (formData.end_date && formData.start_date > formData.end_date) {
      errors.end_date = 'La fecha de fin debe ser posterior a la fecha de inicio';
    }

    // Validate recurrence config
    if (formData.recurrence_type === RECURRENCE_TYPES.WEEKLY && recurrenceConfig.days_of_week.length === 0) {
      errors.recurrence = 'Debe seleccionar al menos un día de la semana';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare final config data
      const configData = {
        ...formData,
        recurrence_config: JSON.stringify(recurrenceConfig),
        meta: JSON.stringify(formData.meta)
      };

      // Check for conflicts before saving
      const conflictCheck = await checkConflicts({
        professional_id: professionalId,
        start_date: formData.start_date,
        end_date: formData.end_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        recurrence_type: formData.recurrence_type,
        recurrence_config: recurrenceConfig
      }, 'availability_config');

      if (!conflictCheck.valid) {
        alert(`Conflicto detectado: ${conflictCheck.conflicts[0]?.message || 'Conflicto con disponibilidad existente'}`);
        setIsSubmitting(false);
        return;
      }

      // Save configuration
      let savedConfig;
      if (config) {
        savedConfig = await updateConfig(config.id, configData);
      } else {
        savedConfig = await createConfig(configData);
      }

      // Generate slots for the next 3 months
      const endDate = addMonths(new Date(formData.start_date), 3);
      await generateSlots(savedConfig.id, {
        startDate: formData.start_date,
        endDate: format(endDate, 'yyyy-MM-dd'),
        forceRegenerate: true
      });

      if (onSave) {
        onSave(savedConfig);
      }
    } catch (error) {
      console.error('Error saving availability config:', error);
      alert('Error al guardar la configuración. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render recurrence configuration based on type
  const renderRecurrenceConfig = () => {
    switch (formData.recurrence_type) {
      case RECURRENCE_TYPES.DAILY:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intervalo (días)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={recurrenceConfig.interval}
                onChange={(e) => handleRecurrenceChange('interval', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                Repetir cada X días
              </p>
            </div>
          </div>
        );

      case RECURRENCE_TYPES.WEEKLY:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Días de la semana
              </label>
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <label key={day.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={recurrenceConfig.days_of_week.includes(day.value)}
                      onChange={(e) => {
                        const newDays = e.target.checked
                          ? [...recurrenceConfig.days_of_week, day.value]
                          : recurrenceConfig.days_of_week.filter(d => d !== day.value);
                        handleRecurrenceChange('days_of_week', newDays);
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{day.short}</span>
                  </label>
                ))}
              </div>
              {validationErrors.recurrence && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.recurrence}</p>
              )}
            </div>
          </div>
        );

      case RECURRENCE_TYPES.MONTHLY:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Día del mes
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={recurrenceConfig.day_of_month}
                onChange={(e) => handleRecurrenceChange('day_of_month', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                Día del mes (1-31). Si no existe en un mes, se usará el último día.
              </p>
            </div>
          </div>
        );

      case RECURRENCE_TYPES.CUSTOM:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Regla RRULE
              </label>
              <textarea
                value={recurrenceConfig.rrule}
                onChange={(e) => handleRecurrenceChange('rrule', e.target.value)}
                placeholder="FREQ=WEEKLY;BYDAY=MO,WE,FR;INTERVAL=2"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                Regla de recurrencia en formato iCalendar RRULE
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {config ? 'Editar Disponibilidad' : 'Nueva Disponibilidad'}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: Horario de atención"
            />
            {validationErrors.title && (
              <p className="text-red-600 text-sm mt-1">{validationErrors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleFieldChange('is_active', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Activa</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Descripción opcional..."
          />
        </div>

        {/* Date and Time Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de inicio *
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => handleFieldChange('start_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de fin
            </label>
            <input
              type="date"
              value={formData.end_date || ''}
              onChange={(e) => handleFieldChange('end_date', e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {validationErrors.end_date && (
              <p className="text-red-600 text-sm mt-1">{validationErrors.end_date}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hora inicio *
            </label>
            <input
              type="time"
              value={formData.start_time}
              onChange={(e) => handleFieldChange('start_time', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hora fin *
            </label>
            <input
              type="time"
              value={formData.end_time}
              onChange={(e) => handleFieldChange('end_time', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duración (min) *
            </label>
            <input
              type="number"
              min="15"
              max="480"
              step="15"
              value={formData.duration_minutes}
              onChange={(e) => handleFieldChange('duration_minutes', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {validationErrors.duration_minutes && (
              <p className="text-red-600 text-sm mt-1">{validationErrors.duration_minutes}</p>
            )}
          </div>
        </div>

        {validationErrors.time && (
          <p className="text-red-600 text-sm">{validationErrors.time}</p>
        )}

        {/* Recurrence Configuration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de recurrencia
          </label>
          <select
            value={formData.recurrence_type}
            onChange={(e) => handleFieldChange('recurrence_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value={RECURRENCE_TYPES.NONE}>Sin recurrencia</option>
            <option value={RECURRENCE_TYPES.DAILY}>Diaria</option>
            <option value={RECURRENCE_TYPES.WEEKLY}>Semanal</option>
            <option value={RECURRENCE_TYPES.MONTHLY}>Mensual</option>
            <option value={RECURRENCE_TYPES.CUSTOM}>Personalizada (RRULE)</option>
          </select>
        </div>

        {formData.recurrence_type !== RECURRENCE_TYPES.NONE && (
          <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Configuración de recurrencia
            </h3>
            {renderRecurrenceConfig()}
          </div>
        )}

        {/* Timezone Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-start">
            <span className="text-blue-600 mr-2">ℹ️</span>
            <div>
              <p className="text-sm text-blue-800 font-medium">Zona horaria</p>
              <p className="text-sm text-blue-700">
                Los horarios se guardarán en la zona horaria: {formData.timezone.replace('_', ' ')}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                El manejo de cambios de horario está configurado como: {formData.dst_handling}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || checkingConflicts}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Guardando...' : checkingConflicts ? 'Verificando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AvailabilityEditor;
