/**
 * Appointment Card Component
 * Shows appointment details, reschedule, cancel with status management
 */

import { useState } from 'react';
import { useAppointments } from '../hooks/useAvailability.js';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

const APPOINTMENT_STATUSES = {
  scheduled: { label: 'Programada', color: 'bg-blue-100 text-blue-800', icon: '📅' },
  confirmed: { label: 'Confirmada', color: 'bg-green-100 text-green-800', icon: '✅' },
  in_progress: { label: 'En progreso', color: 'bg-yellow-100 text-yellow-800', icon: '🔄' },
  completed: { label: 'Completada', color: 'bg-gray-100 text-gray-800', icon: '✓' },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-800', icon: '❌' },
  no_show: { label: 'No asistió', color: 'bg-orange-100 text-orange-800', icon: '⚠️' }
};

const PRIORITY_LEVELS = {
  low: { label: 'Baja', color: 'text-gray-600' },
  normal: { label: 'Normal', color: 'text-blue-600' },
  high: { label: 'Alta', color: 'text-orange-600' },
  urgent: { label: 'Urgente', color: 'text-red-600' }
};

const AppointmentCard = ({
  appointment,
  isProfessionalView = false,
  onStatusChange,
  onReschedule,
  onCancel,
  timezone = 'America/Buenos_Aires',
  className = ''
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const { updateAppointment, cancelAppointment } = useAppointments();

  // Determine if appointment can be modified
  const canModify = () => {
    const now = new Date();
    const appointmentTime = parseISO(appointment.scheduled_start);
    const hoursUntilAppointment = (appointmentTime - now) / (1000 * 60 * 60);

    // Can modify if more than 24 hours away and not cancelled/completed
    return hoursUntilAppointment > 24 &&
           !['cancelled', 'completed', 'no_show'].includes(appointment.status);
  };

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    setIsUpdating(true);
    try {
      const updatedAppointment = await updateAppointment(appointment.id, { status: newStatus });
      if (onStatusChange) {
        onStatusChange(updatedAppointment);
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      alert('Error al actualizar el estado de la cita');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle cancellation
  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      alert('Por favor, indica el motivo de la cancelación');
      return;
    }

    setIsUpdating(true);
    try {
      const cancelledAppointment = await cancelAppointment(appointment.id, cancelReason);
      if (onCancel) {
        onCancel(cancelledAppointment);
      }
      setShowCancelConfirm(false);
      setCancelReason('');
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      alert('Error al cancelar la cita');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle reschedule
  const handleReschedule = () => {
    if (onReschedule) {
      onReschedule(appointment);
    }
  };

  const statusInfo = APPOINTMENT_STATUSES[appointment.status] || APPOINTMENT_STATUSES.scheduled;
  const priorityInfo = PRIORITY_LEVELS[appointment.priority] || PRIORITY_LEVELS.normal;

  const appointmentDate = parseISO(appointment.scheduled_start);
  const isPastAppointment = isPast(appointmentDate);
  const isTodayAppointment = isToday(appointmentDate);

  return (
    <div className={`bg-white rounded-lg shadow-md border p-4 hover:shadow-lg transition-shadow ${className}`}>
      {/* Header with status and priority */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{statusInfo.icon}</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          {appointment.priority !== 'normal' && (
            <span className={`text-xs font-medium ${priorityInfo.color}`}>
              {priorityInfo.label}
            </span>
          )}
        </div>

        {/* Actions menu */}
        {canModify() && (
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              ⋮
            </button>

            {showActions && (
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-32">
                {isProfessionalView && (
                  <>
                    {appointment.status === 'scheduled' && (
                      <button
                        onClick={() => handleStatusChange('confirmed')}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        disabled={isUpdating}
                      >
                        ✅ Confirmar
                      </button>
                    )}
                    {appointment.status === 'confirmed' && (
                      <button
                        onClick={() => handleStatusChange('in_progress')}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        disabled={isUpdating}
                      >
                        🔄 Iniciar
                      </button>
                    )}
                    {appointment.status === 'in_progress' && (
                      <button
                        onClick={() => handleStatusChange('completed')}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        disabled={isUpdating}
                      >
                        ✓ Completar
                      </button>
                    )}
                    <div className="border-t border-gray-100"></div>
                  </>
                )}

                <button
                  onClick={handleReschedule}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                >
                  📅 Reprogramar
                </button>

                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-red-600"
                >
                  ❌ Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Appointment details */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900 text-lg">
          {appointment.title}
        </h3>

        {appointment.description && (
          <p className="text-gray-600 text-sm">
            {appointment.description}
          </p>
        )}

        {/* Date and time */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <span>📅</span>
            <span>
              {isTodayAppointment ? 'Hoy' :
               format(appointmentDate, 'd MMMM yyyy', { locale: es })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span>🕐</span>
            <span>
              {format(parseISO(appointment.scheduled_start), 'HH:mm')} -
              {format(parseISO(appointment.scheduled_end), 'HH:mm')}
            </span>
          </div>
        </div>

        {/* Timezone info */}
        <div className="text-xs text-gray-500">
          Zona horaria: {appointment.timezone?.replace('_', ' ') || timezone.replace('_', ' ')}
        </div>

        {/* Professional/Client info */}
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-gray-600">
              {isProfessionalView ? 'Cliente:' : 'Profesional:'}
            </span>
            <span className="ml-1 font-medium">
              {isProfessionalView ? appointment.client_name : appointment.professional_name}
            </span>
          </div>

          {appointment.price && (
            <div className="text-right">
              <span className="text-gray-600">Precio:</span>
              <span className="ml-1 font-medium">
                ${appointment.price} {appointment.currency}
              </span>
            </div>
          )}
        </div>

        {/* Service info */}
        {appointment.service_name && (
          <div className="text-sm">
            <span className="text-gray-600">Servicio:</span>
            <span className="ml-1 font-medium">{appointment.service_name}</span>
          </div>
        )}

        {/* Notes */}
        {(appointment.notes || appointment.client_notes) && (
          <div className="mt-3 p-2 bg-gray-50 rounded-md">
            {appointment.notes && (
              <div className="text-sm">
                <span className="font-medium text-gray-700">Notas del profesional:</span>
                <p className="text-gray-600 mt-1">{appointment.notes}</p>
              </div>
            )}
            {appointment.client_notes && (
              <div className="text-sm mt-2">
                <span className="font-medium text-gray-700">Notas del cliente:</span>
                <p className="text-gray-600 mt-1">{appointment.client_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Reminder info */}
        {appointment.reminder_sent && (
          <div className="flex items-center gap-1 text-xs text-blue-600 mt-2">
            <span>🔔</span>
            <span>Recordatorio enviado</span>
          </div>
        )}

        {/* Past appointment indicator */}
        {isPastAppointment && appointment.status !== 'completed' && (
          <div className="flex items-center gap-1 text-xs text-orange-600 mt-2">
            <span>⚠️</span>
            <span>Cita pasada</span>
          </div>
        )}
      </div>

      {/* Cancellation confirmation modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Cancelar Cita
            </h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                ¿Estás seguro de que quieres cancelar esta cita?
              </p>
              <p className="text-sm text-gray-800 font-medium">
                {appointment.title}
              </p>
              <p className="text-sm text-gray-600">
                {format(appointmentDate, 'd MMMM yyyy', { locale: es })} a las{' '}
                {format(parseISO(appointment.scheduled_start), 'HH:mm')}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de cancelación *
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mb-2"
              >
                <option value="">Seleccionar motivo...</option>
                <option value="schedule_conflict">Conflicto de horario</option>
                <option value="emergency">Emergencia</option>
                <option value="illness">Enfermedad</option>
                <option value="transportation">Problemas de transporte</option>
                <option value="other">Otro motivo</option>
              </select>

              {cancelReason === 'other' && (
                <textarea
                  placeholder="Especificar motivo..."
                  value={cancelReason === 'other' ? '' : cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={2}
                />
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isUpdating}
              >
                Mantener cita
              </button>
              <button
                onClick={handleCancel}
                disabled={isUpdating || !cancelReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Cancelando...' : 'Cancelar cita'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentCard;
