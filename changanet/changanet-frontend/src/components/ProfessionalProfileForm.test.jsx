/**
 * Tests para ProfessionalProfileForm component
 * Verifica la funcionalidad del formulario de perfiles profesionales
 * REQ-06 a REQ-10 según PRD
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfessionalProfileForm from './ProfessionalProfileForm';

// Mock de componentes hijos para simplificar tests
jest.mock('./SpecialtySelector', () => {
  return function MockSpecialtySelector({ value, onChange }) {
    return (
      <div data-testid="specialty-selector">
        <button
          data-testid="specialty-btn"
          onClick={() => onChange(['Plomero'])}
        >
          Select Specialty
        </button>
      </div>
    );
  };
});

jest.mock('./ZoneSelector', () => {
  return function MockZoneSelector({ zona_cobertura, onChange }) {
    return (
      <div data-testid="zone-selector">
        <input
          data-testid="zone-input"
          value={zona_cobertura || ''}
          onChange={(e) => onChange({ zona_cobertura: e.target.value })}
        />
      </div>
    );
  };
});

jest.mock('./RateSelector', () => {
  return function MockRateSelector({ tipo_tarifa, onChange }) {
    return (
      <div data-testid="rate-selector">
        <button
          data-testid="rate-btn"
          onClick={() => onChange({ tipo_tarifa: 'hora', tarifa_hora: 1500 })}
        >
          Set Rate
        </button>
      </div>
    );
  };
});

jest.mock('./ImageUploader', () => {
  return function MockImageUploader({ onProfilePhotoChange }) {
    return (
      <div data-testid="image-uploader">
        <button
          data-testid="photo-btn"
          onClick={() => onProfilePhotoChange('photo-url')}
        >
          Upload Photo
        </button>
      </div>
    );
  };
});

// Mock del hook useProfile
jest.mock('../hooks/useProfile', () => ({
  useProfile: () => ({
    updateProfile: jest.fn().mockResolvedValue({ success: true }),
    loading: false,
    error: null
  })
}));

describe('ProfessionalProfileForm', () => {
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders form with all components', () => {
    render(
      <ProfessionalProfileForm
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByTestId('image-uploader')).toBeInTheDocument();
    expect(screen.getByTestId('specialty-selector')).toBeInTheDocument();
    expect(screen.getByTestId('zone-selector')).toBeInTheDocument();
    expect(screen.getByTestId('rate-selector')).toBeInTheDocument();
    expect(screen.getByText('Guardar Perfil')).toBeInTheDocument();
  });

  test('form submission calls onSuccess on valid data', async () => {
    render(
      <ProfessionalProfileForm
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    // Simular llenado de campos requeridos
    fireEvent.click(screen.getByTestId('specialty-btn')); // Seleccionar especialidad
    fireEvent.change(screen.getByTestId('zone-input'), { target: { value: 'Buenos Aires' } });
    fireEvent.click(screen.getByTestId('rate-btn')); // Establecer tarifa

    // Simular envío del formulario
    const submitButton = screen.getByText('Guardar Perfil');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith('Perfil profesional actualizado exitosamente');
    });
  });

  test('form validation shows errors for incomplete data', async () => {
    render(
      <ProfessionalProfileForm
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    // Enviar formulario sin datos
    const submitButton = screen.getByText('Guardar Perfil');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Por favor, corrige los errores en el formulario');
    });
  });
});
