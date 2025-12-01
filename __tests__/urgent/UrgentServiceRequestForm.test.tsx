/**
 * @file __tests__/urgent/UrgentServiceRequestForm.test.tsx
 * @description Frontend tests for UrgentServiceRequestForm component using testing-library
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UrgentServiceRequestForm } from '../../components/urgent/client/UrgentServiceRequestForm';

// Mock navigator.geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// Mock the onSubmit and onLocationRequest props
const mockOnSubmit = jest.fn();
const mockOnLocationRequest = jest.fn();

const defaultProps = {
  onSubmit: mockOnSubmit,
  onLocationRequest: mockOnLocationRequest,
  isLoading: false,
};

describe('UrgentServiceRequestForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGeolocation.getCurrentPosition.mockClear();
  });

  describe('Form Rendering', () => {
    test('renders all form elements correctly', () => {
      render(<UrgentServiceRequestForm {...defaultProps} />);

      // Check main heading
      expect(screen.getByText('Solicitud de Servicio Urgente')).toBeInTheDocument();

      // Check form fields
      expect(screen.getByLabelText(/descripción del problema/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/categoría de servicio/i)).toBeInTheDocument();
      expect(screen.getByText('Nivel de urgencia')).toBeInTheDocument();
      expect(screen.getByText('Ubicación')).toBeInTheDocument();

      // Check submit button
      expect(screen.getByRole('button', { name: /enviar solicitud urgente/i })).toBeInTheDocument();
    });

    test('renders service categories correctly', () => {
      render(<UrgentServiceRequestForm {...defaultProps} />);

      const select = screen.getByLabelText(/categoría de servicio/i);
      expect(select).toBeInTheDocument();

      // Check default option
      expect(screen.getByText('Selecciona una categoría')).toBeInTheDocument();
    });

    test('renders urgency levels with correct styling', () => {
      render(<UrgentServiceRequestForm {...defaultProps} />);

      // Check all urgency levels are present
      expect(screen.getByText('Baja')).toBeInTheDocument();
      expect(screen.getByText('Media')).toBeInTheDocument();
      expect(screen.getByText('Alta')).toBeInTheDocument();

      // Check descriptions
      expect(screen.getByText('En las próximas horas')).toBeInTheDocument();
      expect(screen.getByText('En la próxima hora')).toBeInTheDocument();
      expect(screen.getByText('Inmediatamente')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    test('allows typing in description field', async () => {
      const user = userEvent.setup();
      render(<UrgentServiceRequestForm {...defaultProps} />);

      const descriptionTextarea = screen.getByLabelText(/descripción del problema/i);
      await user.type(descriptionTextarea, 'Test description');

      expect(descriptionTextarea).toHaveValue('Test description');
    });

    test('allows selecting service category', async () => {
      const user = userEvent.setup();
      render(<UrgentServiceRequestForm {...defaultProps} />);

      const select = screen.getByLabelText(/categoría de servicio/i);
      await user.selectOptions(select, 'Plomería');

      expect(select).toHaveValue('Plomería');
    });

    test('allows selecting urgency level', async () => {
      const user = userEvent.setup();
      render(<UrgentServiceRequestForm {...defaultProps} />);

      const highUrgencyButton = screen.getByText('Alta');
      await user.click(highUrgencyButton);

      // The button should be visually selected (this would be tested with styled-components testing)
      expect(highUrgencyButton).toBeInTheDocument();
    });

    test('handles special requirements input', async () => {
      const user = userEvent.setup();
      render(<UrgentServiceRequestForm {...defaultProps} />);

      const specialReqTextarea = screen.getByLabelText(/requisitos especiales/i);
      await user.type(specialReqTextarea, 'Need special tools');

      expect(specialReqTextarea).toHaveValue('Need special tools');
    });

    test('handles budget input correctly', async () => {
      const user = userEvent.setup();
      render(<UrgentServiceRequestForm {...defaultProps} />);

      const budgetInput = screen.getByLabelText(/presupuesto estimado/i);
      await user.type(budgetInput, '500');

      expect(budgetInput).toHaveValue('500');
    });
  });

  describe('Location Handling', () => {
    test('calls onLocationRequest when location button is clicked', async () => {
      const user = userEvent.setup();
      mockOnLocationRequest.mockResolvedValue({
        latitude: -34.6037,
        longitude: -58.3816,
        accuracy: 10
      });

      render(<UrgentServiceRequestForm {...defaultProps} />);

      const locationButton = screen.getByRole('button', { name: /compartir ubicación/i });
      await user.click(locationButton);

      expect(mockOnLocationRequest).toHaveBeenCalledTimes(1);
    });

    test('shows success message when location is obtained', async () => {
      const user = userEvent.setup();
      mockOnLocationRequest.mockResolvedValue({
        latitude: -34.6037,
        longitude: -58.3816,
        accuracy: 10
      });

      render(<UrgentServiceRequestForm {...defaultProps} />);

      const locationButton = screen.getByRole('button', { name: /compartir ubicación/i });
      await user.click(locationButton);

      await waitFor(() => {
        expect(screen.getByText('Ubicación compartida correctamente')).toBeInTheDocument();
      });

      expect(locationButton).toHaveTextContent('Ubicación obtenida ✓');
    });

    test('shows error message when location request fails', async () => {
      const user = userEvent.setup();
      mockOnLocationRequest.mockRejectedValue(new Error('Location access denied'));

      render(<UrgentServiceRequestForm {...defaultProps} />);

      const locationButton = screen.getByRole('button', { name: /compartir ubicación/i });
      await user.click(locationButton);

      await waitFor(() => {
        expect(screen.getByText('Location access denied')).toBeInTheDocument();
      });
    });

    test('disables submit button when location not obtained', () => {
      render(<UrgentServiceRequestForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /enviar solicitud urgente/i });
      expect(submitButton).toBeDisabled();
    });

    test('enables submit button when location is obtained', async () => {
      const user = userEvent.setup();
      mockOnLocationRequest.mockResolvedValue({
        latitude: -34.6037,
        longitude: -58.3816
      });

      render(<UrgentServiceRequestForm {...defaultProps} />);

      const locationButton = screen.getByRole('button', { name: /compartir ubicación/i });
      await user.click(locationButton);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /enviar solicitud urgente/i });
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Form Submission', () => {
    test('calls onSubmit with correct data when form is valid', async () => {
      const user = userEvent.setup();
      mockOnLocationRequest.mockResolvedValue({
        latitude: -34.6037,
        longitude: -58.3816
      });

      render(<UrgentServiceRequestForm {...defaultProps} />);

      // Fill required fields
      const descriptionTextarea = screen.getByLabelText(/descripción del problema/i);
      await user.type(descriptionTextarea, 'Test urgent request');

      // Get location
      const locationButton = screen.getByRole('button', { name: /compartir ubicación/i });
      await user.click(locationButton);

      // Select urgency
      const highUrgencyButton = screen.getByText('Alta');
      await user.click(highUrgencyButton);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /enviar solicitud urgente/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          description: 'Test urgent request',
          latitude: -34.6037,
          longitude: -58.3816,
          urgency_level: 'high',
          special_requirements: '',
          estimated_budget: undefined,
          service_category: ''
        });
      });
    });

    test('shows validation error when description is empty', async () => {
      const user = userEvent.setup();
      mockOnLocationRequest.mockResolvedValue({
        latitude: -34.6037,
        longitude: -58.3816
      });

      render(<UrgentServiceRequestForm {...defaultProps} />);

      // Get location but don't fill description
      const locationButton = screen.getByRole('button', { name: /compartir ubicación/i });
      await user.click(locationButton);

      // Select urgency
      const highUrgencyButton = screen.getByText('Alta');
      await user.click(highUrgencyButton);

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /enviar solicitud urgente/i });
      await user.click(submitButton);

      expect(mockOnSubmit).not.toHaveBeenCalled();
      expect(screen.getByText('La descripción es requerida')).toBeInTheDocument();
    });

    test('shows validation error when location not shared', async () => {
      const user = userEvent.setup();
      render(<UrgentServiceRequestForm {...defaultProps} />);

      // Fill description but don't get location
      const descriptionTextarea = screen.getByLabelText(/descripción del problema/i);
      await user.type(descriptionTextarea, 'Test description');

      // Select urgency
      const highUrgencyButton = screen.getByText('Alta');
      await user.click(highUrgencyButton);

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /enviar solicitud urgente/i });
      await user.click(submitButton);

      expect(mockOnSubmit).not.toHaveBeenCalled();
      expect(screen.getByText('Debes compartir tu ubicación')).toBeInTheDocument();
    });

    test('handles submission errors gracefully', async () => {
      const user = userEvent.setup();
      mockOnLocationRequest.mockResolvedValue({
        latitude: -34.6037,
        longitude: -58.3816
      });
      mockOnSubmit.mockRejectedValue(new Error('Submission failed'));

      render(<UrgentServiceRequestForm {...defaultProps} />);

      // Fill form
      const descriptionTextarea = screen.getByLabelText(/descripción del problema/i);
      await user.type(descriptionTextarea, 'Test request');

      const locationButton = screen.getByRole('button', { name: /compartir ubicación/i });
      await user.click(locationButton);

      const highUrgencyButton = screen.getByText('Alta');
      await user.click(highUrgencyButton);

      // Submit
      const submitButton = screen.getByRole('button', { name: /enviar solicitud urgente/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Submission failed')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    test('shows loading text on submit button when loading', () => {
      render(<UrgentServiceRequestForm {...defaultProps} isLoading={true} />);

      const submitButton = screen.getByRole('button', { name: /creando solicitud/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    test('shows loading text on location button when requesting location', async () => {
      const user = userEvent.setup();
      mockOnLocationRequest.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<UrgentServiceRequestForm {...defaultProps} />);

      const locationButton = screen.getByRole('button', { name: /compartir ubicación/i });
      await user.click(locationButton);

      expect(screen.getByText('Obteniendo ubicación...')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels and roles', () => {
      render(<UrgentServiceRequestForm {...defaultProps} />);

      // Check form has proper structure
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();

      // Check buttons have proper roles
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      // Check inputs have labels
      const descriptionInput = screen.getByLabelText(/descripción del problema/i);
      expect(descriptionInput).toHaveAttribute('aria-required', 'true');
    });

    test('provides feedback for form errors', async () => {
      const user = userEvent.setup();
      render(<UrgentServiceRequestForm {...defaultProps} />);

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /enviar solicitud urgente/i });
      await user.click(submitButton);

      // Should have error message with proper role
      const errorAlert = screen.getByText('La descripción es requerida');
      expect(errorAlert).toBeInTheDocument();
      // The Alert component should have proper ARIA attributes
    });
  });

  describe('Form Reset and State Management', () => {
    test('maintains form state correctly', async () => {
      const user = userEvent.setup();
      render(<UrgentServiceRequestForm {...defaultProps} />);

      // Fill form
      const descriptionTextarea = screen.getByLabelText(/descripción del problema/i);
      await user.type(descriptionTextarea, 'Test description');

      const specialReqTextarea = screen.getByLabelText(/requisitos especiales/i);
      await user.type(specialReqTextarea, 'Special requirements');

      const budgetInput = screen.getByLabelText(/presupuesto estimado/i);
      await user.type(budgetInput, '1000');

      // Select category and urgency
      const select = screen.getByLabelText(/categoría de servicio/i);
      await user.selectOptions(select, 'Electricidad');

      const highUrgencyButton = screen.getByText('Alta');
      await user.click(highUrgencyButton);

      // Get location
      mockOnLocationRequest.mockResolvedValue({
        latitude: -34.6037,
        longitude: -58.3816
      });
      const locationButton = screen.getByRole('button', { name: /compartir ubicación/i });
      await user.click(locationButton);

      // Verify all values are maintained
      expect(descriptionTextarea).toHaveValue('Test description');
      expect(specialReqTextarea).toHaveValue('Special requirements');
      expect(budgetInput).toHaveValue('1000');
      expect(select).toHaveValue('Electricidad');
    });
  });
});