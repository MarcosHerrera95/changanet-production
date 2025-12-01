/**
 * Slot Picker Component
 * For clients - shows available slots, duration selector, booking with confirmation
 */

import { useState, useEffect, useMemo } from 'react';
import { useAvailabilitySlots, useConflictDetection } from '../hooks/useAvailability.js';
import { format, parseISO, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1.5 horas' },
  { value: 120, label: '2 horas' }
];

const SlotPicker = ({
  professionalId,
  serviceId,
  onBookingComplete,
  timezone = 'America/Buenos_Aires',
  className = ''
}) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingData, setBookingData] = useState({
    title: '',
    description: '',
    notes: ''
  });
  const [isBooking, setIsBooking] = useState(false);

  const {
    slots,
    loading,
    error,
    debouncedFetch,
    bookSlot
  } = useAvailabilitySlots({
    professionalId,
    date: selectedDate,
    status: 'available',
    includeBooked: false
  });

  const { checkConflicts, checking: checkingConflicts } = useConflictDetection();

  // Filter and group available slots by duration
  const availableSlots = useMemo(() => {
    const filtered = slots.filter(slot => {
      const slotDuration = (new Date(slot.end_time) - new Date(slot.start_time)) / (1000 * 60);
      return slot.status === 'available' && slotDuration >= selectedDuration;
    });

    // Group by time slots
    const grouped = {};
    filtered.forEach(slot => {
      const timeKey = format(parseISO(slot.start_time), 'HH:mm');
      if (!grouped[timeKey]) {
        grouped[timeKey] = [];
      }
      grouped[timeKey].push(slot);
    });

    return grouped;
  }, [slots, selectedDuration]);

  // Handle date change with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      debouncedFetch({ professionalId, date: selectedDate, status: 'available', includeBooked: false });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [selectedDate, professionalId, debouncedFetch]);

  // Handle slot selection
  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setShowConfirmation(true);
  };

  // Handle booking confirmation
  const handleBookingConfirm = async () => {
    if (!selectedSlot) return;

    setIsBooking(true);

    try {
      // Check for conflicts before booking
      const conflictCheck = await checkConflicts({
        slot_id: selectedSlot.id,
        start_time: selectedSlot.start_time,
        end_time: addMinutes(parseISO(selectedSlot.start_time), selectedDuration).toISOString(),
        professional_id: professionalId,
        client_id: 'current_user' // This should be replaced with actual user ID
      }, 'appointment');

      if (!conflictCheck.valid) {
        alert(`No se puede reservar: ${conflictCheck.conflicts[0]?.message || 'Conflicto detectado'}`);
        setIsBooking(false);
        return;
      }

      // Prepare booking data
      const appointmentData = {
        slotId: selectedSlot.id,
        appointmentData: {
          title: bookingData.title || `Cita - ${format(parseISO(selectedSlot.start_time), 'dd/MM/yyyy HH:mm')}`,
          description: bookingData.description,
          appointment_type: 'service',
          service_id: serviceId,
          notes: bookingData.notes,
          price: 0, // This should be calculated based on service
          currency: 'ARS'
        }
      };

      // Book the slot
      const result = await bookSlot(selectedSlot.id, appointmentData.appointmentData);

      if (onBookingComplete) {
        onBookingComplete(result);
      }

      // Reset state
      setShowConfirmation(false);
      setSelectedSlot(null);
      setBookingData({ title: '', description: '', notes: '' });

    } catch (error) {
      console.error('Error booking slot:', error);
      alert('Error al reservar el turno. Inténtalo de nuevo.');
    } finally {
      setIsBooking(false);
    }
  };

  // Generate next 7 days for date selector
  const dateOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      options.push({
        value: format(date, 'yyyy-MM-dd'),
        label: i === 0 ? 'Hoy' :
               i === 1 ? 'Mañana' :
               format(date, 'EEEE d/MM', { locale: es })
      });
    }
    return options;
  }, []);

  // Loading skeleton
  if (loading && Object.keys(availableSlots).length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Seleccionar Horario Disponible
        </h3>
        <p className="text-sm text-gray-600">
          Zona horaria: {timezone.replace('_', ' ')}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Date Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fecha
        </label>
        <div className="flex flex-wrap gap-2">
          {dateOptions.map(date => (
            <button
              key={date.value}
              onClick={() => setSelectedDate(date.value)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedDate === date.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {date.label}
            </button>
          ))}
        </div>
      </div>

      {/* Duration Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Duración del servicio
        </label>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map(duration => (
            <button
              key={duration.value}
              onClick={() => setSelectedDuration(duration.value)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedDuration === duration.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {duration.label}
            </button>
          ))}
        </div>
      </div>

      {/* Available Slots */}
      <div className="mb-6">
        <h4 className="text-lg font-medium text-gray-900 mb-3">
          Horarios disponibles para {format(parseISO(selectedDate), 'd MMMM yyyy', { locale: es })}
        </h4>

        {Object.keys(availableSlots).length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(availableSlots)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([time, slotsAtTime]) => (
                <button
                  key={time}
                  onClick={() => handleSlotSelect(slotsAtTime[0])}
                  className="p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary hover:bg-opacity-5 transition-colors text-center"
                >
                  <div className="text-lg font-semibold text-gray-900">
                    {time}
                  </div>
                  <div className="text-xs text-gray-600">
                    {slotsAtTime.length} disponible{slotsAtTime.length !== 1 ? 's' : ''}
                  </div>
                </button>
              ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600">
              No hay horarios disponibles para esta fecha y duración.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Intenta con otra fecha o duración diferente.
            </p>
          </div>
        )}
      </div>

      {/* Booking Confirmation Modal */}
      {showConfirmation && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirmar Reserva
              </h3>
              <button
                onClick={() => setShowConfirmation(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Appointment Details */}
            <div className="mb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Fecha:</span>
                <span className="text-sm font-medium">
                  {format(parseISO(selectedSlot.start_time), 'd MMMM yyyy', { locale: es })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Horario:</span>
                <span className="text-sm font-medium">
                  {format(parseISO(selectedSlot.start_time), 'HH:mm')} - {format(addMinutes(parseISO(selectedSlot.start_time), selectedDuration), 'HH:mm')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Duración:</span>
                <span className="text-sm font-medium">
                  {DURATION_OPTIONS.find(d => d.value === selectedDuration)?.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Zona horaria:</span>
                <span className="text-sm font-medium">
                  {timezone.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Booking Form */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título de la cita
                </label>
                <input
                  type="text"
                  value={bookingData.title}
                  onChange={(e) => setBookingData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej: Consulta general"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  value={bookingData.description}
                  onChange={(e) => setBookingData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  placeholder="Detalles adicionales..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={bookingData.notes}
                  onChange={(e) => setBookingData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  placeholder="Instrucciones especiales..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Timezone Warning */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-6">
              <div className="flex items-start">
                <span className="text-blue-600 mr-2">ℹ️</span>
                <div>
                  <p className="text-sm text-blue-800">
                    Asegúrate de que el horario sea correcto en tu zona horaria local.
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Si viajas o hay cambios de horario, el turno se mantendrá en la hora acordada.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isBooking}
              >
                Cancelar
              </button>
              <button
                onClick={handleBookingConfirm}
                disabled={isBooking || checkingConflicts}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBooking ? 'Reservando...' : checkingConflicts ? 'Verificando...' : 'Confirmar Reserva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlotPicker;
