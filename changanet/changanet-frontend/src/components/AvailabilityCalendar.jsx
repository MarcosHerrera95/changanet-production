/**
 * Advanced Availability Calendar Component
 * Features: Month/Week/Day views, visual recurrence, real-time updates, responsive design
 */

import { useState, useMemo } from 'react';
import { useAvailabilitySlots, useAvailabilityConfigs } from '../hooks/useAvailability.js';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const VIEW_MODES = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day'
};

const AvailabilityCalendar = ({
  professionalId,
  onScheduleService,
  isProfessionalView = true,
  timezone = 'America/Buenos_Aires'
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState(VIEW_MODES.WEEK);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    let start, end;

    switch (viewMode) {
      case VIEW_MODES.MONTH:
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        break;
      case VIEW_MODES.WEEK:
        start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
        break;
      case VIEW_MODES.DAY:
        start = currentDate;
        end = currentDate;
        break;
      default:
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
    }

    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    };
  }, [currentDate, viewMode]);

  // Fetch slots with filters
  const {
    slots,
    loading,
    error,
    updateSlot,
    bookSlot
  } = useAvailabilitySlots({
    professionalId,
    ...dateRange,
    includeBooked: !isProfessionalView
  });

  const { configs } = useAvailabilityConfigs(professionalId);

  // Group slots by date for calendar display
  const slotsByDate = useMemo(() => {
    const grouped = {};
    slots.forEach(slot => {
      const dateKey = format(parseISO(slot.start_time), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(slot);
    });
    return grouped;
  }, [slots]);

  // Handle slot click
  const handleSlotClick = async (slot) => {
    if (!isProfessionalView && slot.status === 'available') {
      // Client booking flow
      setSelectedSlot(slot);
    } else if (isProfessionalView) {
      // Professional management
      try {
        const newStatus = slot.status === 'available' ? 'blocked' : 'available';
        await updateSlot(slot.id, { status: newStatus });
      } catch (err) {
        console.error('Error updating slot:', err);
      }
    }
  };

  // Handle booking confirmation
  const handleBookingConfirm = async (appointmentData) => {
    if (!selectedSlot) return;

    try {
      await bookSlot(selectedSlot.id, { appointmentData });
      setSelectedSlot(null);
      if (onScheduleService) {
        onScheduleService(selectedSlot);
      }
    } catch (err) {
      console.error('Error booking slot:', err);
      alert('Error al reservar el turno. Inténtalo de nuevo.');
    }
  };

  // Navigation functions
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case VIEW_MODES.MONTH:
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case VIEW_MODES.WEEK:
        newDate.setDate(newDate.getDate() - 7);
        break;
      case VIEW_MODES.DAY:
        newDate.setDate(newDate.getDate() - 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case VIEW_MODES.MONTH:
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case VIEW_MODES.WEEK:
        newDate.setDate(newDate.getDate() + 7);
        break;
      case VIEW_MODES.DAY:
        newDate.setDate(newDate.getDate() + 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  // Render calendar header
  const renderHeader = () => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">
          {isProfessionalView ? 'Mi Agenda' : 'Disponibilidad'}
        </h2>
        <div className="text-sm text-gray-600">
          Zona horaria: {timezone.replace('_', ' ')}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* View mode selector */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {Object.values(VIEW_MODES).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={navigatePrevious}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Anterior"
          >
            ‹
          </button>

          <button
            onClick={navigateToday}
            className="px-3 py-2 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors"
          >
            Hoy
          </button>

          <button
            onClick={navigateNext}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Siguiente"
          >
            ›
          </button>
        </div>

        {/* Current period display */}
        <div className="text-lg font-semibold text-gray-900 min-w-0">
          {viewMode === VIEW_MODES.MONTH && format(currentDate, 'MMMM yyyy', { locale: es })}
          {viewMode === VIEW_MODES.WEEK && `Semana del ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: es })}`}
          {viewMode === VIEW_MODES.DAY && format(currentDate, 'd MMMM yyyy', { locale: es })}
        </div>
      </div>
    </div>
  );

  // Render month view
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const weeks = [];
    let currentWeek = startDate;

    while (currentWeek <= endDate) {
      const weekSlots = [];
      for (let i = 0; i < 7; i++) {
        const day = addDays(currentWeek, i);
        const dayKey = format(day, 'yyyy-MM-dd');
        const daySlots = slotsByDate[dayKey] || [];
        weekSlots.push({ day, slots: daySlots });
      }
      weeks.push(weekSlots);
      currentWeek = addDays(currentWeek, 7);
    }

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {/* Day headers */}
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
          <div key={day} className="bg-gray-100 p-2 text-center text-sm font-medium text-gray-700">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {weeks.map((week, weekIndex) => (
          week.map(({ day, slots: daySlots }, dayIndex) => {
            const isCurrentMonth = day >= monthStart && day <= monthEnd;
            const isCurrentDay = isToday(day);
            const availableCount = daySlots.filter(s => s.status === 'available').length;
            const bookedCount = daySlots.filter(s => s.status === 'booked').length;

            return (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`bg-white min-h-24 p-2 ${
                  !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                } ${isCurrentDay ? 'ring-2 ring-primary ring-inset' : ''}`}
              >
                <div className="text-sm font-medium mb-1">
                  {format(day, 'd')}
                </div>
                {daySlots.length > 0 && (
                  <div className="space-y-1">
                    {availableCount > 0 && (
                      <div className="text-xs text-green-600">
                        {availableCount} disponible{availableCount !== 1 ? 's' : ''}
                      </div>
                    )}
                    {bookedCount > 0 && (
                      <div className="text-xs text-blue-600">
                        {bookedCount} reservado{bookedCount !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ))}
      </div>
    );
  };

  // Render week/day view
  const renderTimeView = () => {
    const isDayView = viewMode === VIEW_MODES.DAY;
    const startDate = isDayView ? currentDate : startOfWeek(currentDate, { weekStartsOn: 1 });
    const endDate = isDayView ? currentDate : endOfWeek(currentDate, { weekStartsOn: 1 });

    const days = [];
    let currentDay = startDate;
    while (currentDay <= endDate) {
      days.push(currentDay);
      currentDay = addDays(currentDay, 1);
    }

    // Generate time slots (assuming 30-minute intervals from 8 AM to 8 PM)
    const timeSlots = [];
    for (let hour = 8; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }

    return (
      <div className="overflow-x-auto">
        <div className={`grid gap-px bg-gray-200 rounded-lg overflow-hidden ${isDayView ? 'grid-cols-1' : 'grid-cols-8'}`}>
          {/* Time column header */}
          <div className="bg-gray-100 p-2 text-center text-sm font-medium text-gray-700">
            Hora
          </div>

          {/* Day headers */}
          {!isDayView && days.map(day => (
            <div key={format(day, 'yyyy-MM-dd')} className="bg-gray-100 p-2 text-center text-sm font-medium text-gray-700">
              <div>{format(day, 'EEE', { locale: es })}</div>
              <div className={`text-lg ${isToday(day) ? 'text-primary font-bold' : ''}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}

          {/* Time slots */}
          {timeSlots.map(time => (
            <div key={time} className="contents">
              {/* Time label */}
              <div className="bg-gray-50 p-2 text-xs text-gray-600 text-center border-r">
                {time}
              </div>

              {/* Day slots */}
              {(isDayView ? [currentDate] : days).map(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const daySlots = slotsByDate[dayKey] || [];
                const slotAtTime = daySlots.find(slot => {
                  const slotTime = format(parseISO(slot.start_time), 'HH:mm');
                  return slotTime === time;
                });

                return (
                  <div
                    key={`${dayKey}-${time}`}
                    className={`bg-white min-h-12 p-1 border-r border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                      slotAtTime ? 'relative' : ''
                    }`}
                    onClick={() => slotAtTime && handleSlotClick(slotAtTime)}
                  >
                    {slotAtTime && (
                      <div className={`absolute inset-1 rounded text-xs flex items-center justify-center ${
                        slotAtTime.status === 'available'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : slotAtTime.status === 'booked'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {slotAtTime.status === 'available' && 'Disponible'}
                        {slotAtTime.status === 'booked' && 'Reservado'}
                        {slotAtTime.status === 'blocked' && 'Bloqueado'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Loading skeleton
  if (loading && slots.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {renderHeader()}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Recurrence indicators */}
      {configs.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <span>🔄</span>
            <span>Configuraciones recurrentes activas: {configs.filter(c => c.is_active).length}</span>
          </div>
        </div>
      )}

      {/* Calendar content */}
      {viewMode === VIEW_MODES.MONTH ? renderMonthView() : renderTimeView()}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 rounded"></div>
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 rounded"></div>
          <span>Reservado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 rounded"></div>
          <span>Bloqueado</span>
        </div>
      </div>

      {/* Booking confirmation modal */}
      {selectedSlot && !isProfessionalView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirmar Reserva</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Fecha: {format(parseISO(selectedSlot.start_time), 'd MMMM yyyy', { locale: es })}
              </p>
              <p className="text-sm text-gray-600">
                Hora: {format(parseISO(selectedSlot.start_time), 'HH:mm')} - {format(parseISO(selectedSlot.end_time), 'HH:mm')}
              </p>
              <p className="text-sm text-gray-600">
                Zona horaria: {timezone.replace('_', ' ')}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedSlot(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleBookingConfirm({})}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-emerald-600"
              >
                Confirmar Reserva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityCalendar;
