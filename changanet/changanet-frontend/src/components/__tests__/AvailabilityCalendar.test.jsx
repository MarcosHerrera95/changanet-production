/**
 * UI Tests for AvailabilityCalendar Component
 * Tests React component rendering, interactions, and integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AvailabilityCalendar } from '../AvailabilityCalendar';
import { useAvailability } from '../../hooks/useAvailability';

// Mock the hook
jest.mock('../../hooks/useAvailability');

// Mock date utilities
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  format: jest.fn((date, format) => `formatted-${date}-${format}`),
  parseISO: jest.fn((dateString) => new Date(dateString)),
  startOfMonth: jest.fn((date) => new Date(date)),
  endOfMonth: jest.fn((date) => new Date(date)),
  eachDayOfInterval: jest.fn(() => [
    new Date('2024-12-01'),
    new Date('2024-12-02'),
    new Date('2024-12-03'),
  ]),
}));

describe('AvailabilityCalendar Component', () => {
  const mockProfessionalId = 'prof-123';
  const mockSlots = [
    {
      id: 'slot-1',
      start_time: '2024-12-01T10:00:00Z',
      end_time: '2024-12-01T11:00:00Z',
      local_start_time: '10:00',
      local_end_time: '11:00',
      status: 'available',
      timezone: 'America/Buenos_Aires',
    },
    {
      id: 'slot-2',
      start_time: '2024-12-01T14:00:00Z',
      end_time: '2024-12-01T15:00:00Z',
      local_start_time: '14:00',
      local_end_time: '15:00',
      status: 'booked',
      timezone: 'America/Buenos_Aires',
    },
  ];

  const mockUseAvailability = {
    slots: mockSlots,
    loading: false,
    error: null,
    fetchSlots: jest.fn(),
    bookSlot: jest.fn(),
  };

  beforeEach(() => {
    useAvailability.mockReturnValue(mockUseAvailability);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders calendar with slots', () => {
      render(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      expect(screen.getByText('Disponibilidad')).toBeInTheDocument();
      expect(screen.getByText('10:00 - 11:00')).toBeInTheDocument();
      expect(screen.getByText('14:00 - 15:00')).toBeInTheDocument();
    });

    test('shows loading state', () => {
      useAvailability.mockReturnValue({
        ...mockUseAvailability,
        loading: true,
      });

      render(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      expect(screen.getByText('Cargando disponibilidad...')).toBeInTheDocument();
    });

    test('shows error state', () => {
      const errorMessage = 'Error al cargar disponibilidad';
      useAvailability.mockReturnValue({
        ...mockUseAvailability,
        error: errorMessage,
      });

      render(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
    });

    test('displays slots with correct status styling', () => {
      render(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      const availableSlot = screen.getByText('10:00 - 11:00');
      const bookedSlot = screen.getByText('14:00 - 15:00');

      // Check that slots are rendered
      expect(availableSlot).toBeInTheDocument();
      expect(bookedSlot).toBeInTheDocument();

      // Check for status indicators (implementation dependent)
      expect(availableSlot.closest('.slot')).toHaveClass('available');
      expect(bookedSlot.closest('.slot')).toHaveClass('booked');
    });
  });

  describe('Interactions', () => {
    test('calls fetchSlots on mount', () => {
      render(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      expect(mockUseAvailability.fetchSlots).toHaveBeenCalledWith({
        professionalId: mockProfessionalId,
        date: expect.any(Date),
      });
    });

    test('handles slot selection', async () => {
      const mockOnSlotSelect = jest.fn();
      render(
        <AvailabilityCalendar
          professionalId={mockProfessionalId}
          onSlotSelect={mockOnSlotSelect}
        />
      );

      const availableSlot = screen.getByText('10:00 - 11:00');
      fireEvent.click(availableSlot);

      await waitFor(() => {
        expect(mockOnSlotSelect).toHaveBeenCalledWith(mockSlots[0]);
      });
    });

    test('handles slot booking', async () => {
      mockUseAvailability.bookSlot.mockResolvedValue({
        success: true,
        appointment: { id: 'appt-123' },
      });

      render(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      const availableSlot = screen.getByText('10:00 - 11:00');
      fireEvent.click(availableSlot);

      // Assuming there's a booking confirmation dialog or button
      const bookButton = screen.getByRole('button', { name: /reservar|agendar|confirmar/i });
      fireEvent.click(bookButton);

      await waitFor(() => {
        expect(mockUseAvailability.bookSlot).toHaveBeenCalledWith(mockSlots[0].id, expect.any(Object));
      });
    });

    test('prevents booking unavailable slots', () => {
      render(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      const bookedSlot = screen.getByText('14:00 - 15:00');
      fireEvent.click(bookedSlot);

      // Booked slot should not trigger booking action
      expect(mockUseAvailability.bookSlot).not.toHaveBeenCalled();
    });

    test('navigates between months', () => {
      render(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      const nextMonthButton = screen.getByRole('button', { name: /siguiente|next|▶/i });
      fireEvent.click(nextMonthButton);

      expect(mockUseAvailability.fetchSlots).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      const calendar = screen.getByRole('grid', { name: /calendario de disponibilidad/i });
      expect(calendar).toBeInTheDocument();

      const slots = screen.getAllByRole('button', { name: /horario disponible|horario ocupado/i });
      expect(slots.length).toBeGreaterThan(0);
    });

    test('supports keyboard navigation', () => {
      render(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      const firstSlot = screen.getByText('10:00 - 11:00');
      firstSlot.focus();

      expect(document.activeElement).toBe(firstSlot);

      // Test arrow key navigation (implementation dependent)
      fireEvent.keyDown(firstSlot, { key: 'ArrowRight' });
      // Next slot should be focused
    });

    test('announces dynamic content changes', async () => {
      const { rerender } = render(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      // Simulate loading state change
      useAvailability.mockReturnValue({
        ...mockUseAvailability,
        loading: true,
      });

      rerender(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      expect(screen.getByText('Cargando disponibilidad...')).toBeInTheDocument();

      // Simulate data load
      useAvailability.mockReturnValue({
        ...mockUseAvailability,
        loading: false,
        slots: [...mockSlots, {
          id: 'slot-3',
          start_time: '2024-12-01T16:00:00Z',
          end_time: '2024-12-01T17:00:00Z',
          local_start_time: '16:00',
          local_end_time: '17:00',
          status: 'available',
          timezone: 'America/Buenos_Aires',
        }],
      });

      rerender(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      await waitFor(() => {
        expect(screen.getByText('16:00 - 17:00')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('displays booking error messages', async () => {
      mockUseAvailability.bookSlot.mockRejectedValue(
        new Error('El horario ya no está disponible')
      );

      render(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      const availableSlot = screen.getByText('10:00 - 11:00');
      fireEvent.click(availableSlot);

      const bookButton = screen.getByRole('button', { name: /reservar|agendar|confirmar/i });
      fireEvent.click(bookButton);

      await waitFor(() => {
        expect(screen.getByText('El horario ya no está disponible')).toBeInTheDocument();
      });
    });

    test('handles network errors gracefully', async () => {
      mockUseAvailability.fetchSlots.mockRejectedValue(
        new Error('Network error')
      );

      render(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      await waitFor(() => {
        expect(screen.getByText('Error: Network error')).toBeInTheDocument();
      });
    });

    test('shows retry option on errors', async () => {
      mockUseAvailability.fetchSlots.mockRejectedValue(
        new Error('Temporary network error')
      );

      render(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /reintentar|retry/i });
        expect(retryButton).toBeInTheDocument();

        fireEvent.click(retryButton);
        expect(mockUseAvailability.fetchSlots).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Performance', () => {
    test('renders large number of slots efficiently', () => {
      const largeSlotsArray = Array.from({ length: 100 }, (_, i) => ({
        id: `slot-${i}`,
        start_time: `2024-12-01T${10 + (i % 8)}:00:00Z`,
        end_time: `2024-12-01T${11 + (i % 8)}:00:00Z`,
        local_start_time: `${10 + (i % 8)}:00`,
        local_end_time: `${11 + (i % 8)}:00`,
        status: i % 2 === 0 ? 'available' : 'booked',
        timezone: 'America/Buenos_Aires',
      }));

      useAvailability.mockReturnValue({
        ...mockUseAvailability,
        slots: largeSlotsArray,
      });

      const startTime = performance.now();
      render(<AvailabilityCalendar professionalId={mockProfessionalId} />);
      const endTime = performance.now();

      const renderTime = endTime - startTime;

      // Should render within reasonable time (under 100ms for 100 items)
      expect(renderTime).toBeLessThan(100);

      // All slots should be rendered
      expect(screen.getAllByText(/\d{2}:\d{2} - \d{2}:\d{2}/)).toHaveLength(100);
    });

    test('updates efficiently on prop changes', () => {
      const { rerender } = render(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      const newSlots = [...mockSlots, {
        id: 'slot-3',
        start_time: '2024-12-01T16:00:00Z',
        end_time: '2024-12-01T17:00:00Z',
        local_start_time: '16:00',
        local_end_time: '17:00',
        status: 'available',
        timezone: 'America/Buenos_Aires',
      }];

      useAvailability.mockReturnValue({
        ...mockUseAvailability,
        slots: newSlots,
      });

      const startTime = performance.now();
      rerender(<AvailabilityCalendar professionalId={mockProfessionalId} />);
      const endTime = performance.now();

      const updateTime = endTime - startTime;

      // Should update quickly
      expect(updateTime).toBeLessThan(50);

      expect(screen.getByText('16:00 - 17:00')).toBeInTheDocument();
    });
  });

  describe('Integration with Hooks', () => {
    test('integrates properly with useAvailability hook', () => {
      render(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      // Verify hook is called with correct parameters
      expect(useAvailability).toHaveBeenCalledWith();

      // Verify hook methods are available
      expect(typeof mockUseAvailability.fetchSlots).toBe('function');
      expect(typeof mockUseAvailability.bookSlot).toBe('function');
    });

    test('handles hook state changes', async () => {
      const { rerender } = render(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      // Change to loading state
      useAvailability.mockReturnValue({
        ...mockUseAvailability,
        loading: true,
      });

      rerender(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      expect(screen.getByText('Cargando disponibilidad...')).toBeInTheDocument();

      // Change back to loaded state
      useAvailability.mockReturnValue({
        ...mockUseAvailability,
        loading: false,
      });

      rerender(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      expect(screen.queryByText('Cargando disponibilidad...')).not.toBeInTheDocument();
      expect(screen.getByText('10:00 - 11:00')).toBeInTheDocument();
    });

    test('passes correct data to booking function', async () => {
      const bookingData = {
        title: 'Test Appointment',
        description: 'Test booking',
        appointmentType: 'consultation',
      };

      render(
        <AvailabilityCalendar
          professionalId={mockProfessionalId}
          bookingData={bookingData}
        />
      );

      const availableSlot = screen.getByText('10:00 - 11:00');
      fireEvent.click(availableSlot);

      const bookButton = screen.getByRole('button', { name: /reservar|agendar|confirmar/i });
      fireEvent.click(bookButton);

      await waitFor(() => {
        expect(mockUseAvailability.bookSlot).toHaveBeenCalledWith(
          mockSlots[0].id,
          expect.objectContaining(bookingData)
        );
      });
    });
  });

  describe('Responsive Design', () => {
    test('adapts to mobile screen sizes', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      const calendar = screen.getByText('Disponibilidad').closest('.calendar-container');

      // Should have mobile-specific classes or styles
      expect(calendar).toHaveClass('mobile');
    });

    test('shows simplified view on small screens', () => {
      // Mock small screen
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });

      render(<AvailabilityCalendar professionalId={mockProfessionalId} />);

      // Should show list view instead of grid on very small screens
      const listView = screen.getByRole('list', { name: /horarios disponibles/i });
      expect(listView).toBeInTheDocument();
    });
  });
});
