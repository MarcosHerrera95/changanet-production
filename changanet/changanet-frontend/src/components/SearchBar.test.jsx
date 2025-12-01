/**
 * Tests unitarios para el componente SearchBar
 * Cubre renderizado, interacciones, autocompletado y navegación
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SearchBar from './SearchBar';
import { searchAPI } from '../services/apiService';

// Mock de dependencias
jest.mock('../services/apiService');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn()
}));

const mockSearchAPI = {
  autocomplete: jest.fn()
};
searchAPI.autocomplete = mockSearchAPI.autocomplete;

// Función debounce mock
const mockDebounce = jest.fn((fn) => fn);
jest.mock('../hooks/useSearch', () => ({
  debounce: mockDebounce
}));

// Wrapper para Router
const Wrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('SearchBar Component - Unit Tests', () => {
  let mockNavigate;
  let mockOnSearch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate = jest.fn();
    mockOnSearch = jest.fn();

    // Mock useNavigate
    require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);
  });

  describe('Renderizado', () => {
    test('renderiza todos los campos de entrada', () => {
      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      expect(screen.getByLabelText(/Servicio que necesitas/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Ciudad/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Barrio/i)).toBeInTheDocument();
      expect(screen.getByText('Buscar')).toBeInTheDocument();
    });

    test('renderiza placeholders correctos', () => {
      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      expect(screen.getByPlaceholderText('Plomero, Electricista...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Buenos Aires, Córdoba...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Palermo, Recoleta...')).toBeInTheDocument();
    });

    test('renderiza íconos de búsqueda', () => {
      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      const searchIcons = screen.getAllByText('🔍');
      expect(searchIcons).toHaveLength(2); // Uno en servicio, uno en ciudad

      expect(screen.getByText('🏙️')).toBeInTheDocument();
      expect(screen.getByText('📍')).toBeInTheDocument();
    });
  });

  describe('Interacciones Básicas', () => {
    test('actualiza valor del campo servicio', () => {
      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      const serviceInput = screen.getByLabelText(/Servicio que necesitas/i);
      fireEvent.change(serviceInput, { target: { value: 'plomero' } });

      expect(serviceInput.value).toBe('plomero');
    });

    test('actualiza valor del campo ciudad', () => {
      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      const cityInput = screen.getByLabelText(/Ciudad/i);
      fireEvent.change(cityInput, { target: { value: 'Buenos Aires' } });

      expect(cityInput.value).toBe('Buenos Aires');
    });

    test('actualiza valor del campo barrio', () => {
      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      const districtInput = screen.getByLabelText(/Barrio/i);
      fireEvent.change(districtInput, { target: { value: 'Palermo' } });

      expect(districtInput.value).toBe('Palermo');
    });
  });

  describe('Validación y Envío', () => {
    test('muestra alerta cuando no hay campos completados', () => {
      const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      const searchButton = screen.getByText('Buscar');
      fireEvent.click(searchButton);

      expect(mockAlert).toHaveBeenCalledWith('Por favor ingresa un servicio, ciudad o barrio para buscar');

      mockAlert.mockRestore();
    });

    test('navega correctamente con parámetros de búsqueda', () => {
      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      const serviceInput = screen.getByLabelText(/Servicio que necesitas/i);
      const cityInput = screen.getByLabelText(/Ciudad/i);

      fireEvent.change(serviceInput, { target: { value: 'plomero' } });
      fireEvent.change(cityInput, { target: { value: 'Buenos Aires' } });

      const searchButton = screen.getByText('Buscar');
      fireEvent.click(searchButton);

      expect(mockNavigate).toHaveBeenCalledWith('/profesionales?q=plomero&ciudad=Buenos%20Aires');
    });

    test('llama onSearch cuando es embedded', () => {
      render(
        <Wrapper>
          <SearchBar isEmbedded={true} onSearch={mockOnSearch} />
        </Wrapper>
      );

      const serviceInput = screen.getByLabelText(/Servicio que necesitas/i);
      fireEvent.change(serviceInput, { target: { value: 'plomero' } });

      const searchButton = screen.getByText('Buscar');
      fireEvent.click(searchButton);

      expect(mockOnSearch).toHaveBeenCalledWith({
        q: 'plomero'
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Autocompletado', () => {
    beforeEach(() => {
      mockSearchAPI.autocomplete.mockResolvedValue({
        specialties: [
          { value: 'plomero', count: 15 },
          { value: 'plomero urgente', count: 8 }
        ],
        cities: [
          { value: 'Buenos Aires', count: 25 },
          { value: 'Córdoba', count: 12 }
        ],
        districts: [
          { value: 'Palermo', count: 10 },
          { value: 'Recoleta', count: 6 }
        ]
      });
    });

    test('muestra sugerencias de especialidades', async () => {
      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      const serviceInput = screen.getByLabelText(/Servicio que necesitas/i);
      fireEvent.change(serviceInput, { target: { value: 'plom' } });

      await waitFor(() => {
        expect(screen.getByText('plomero')).toBeInTheDocument();
        expect(screen.getByText('(15)')).toBeInTheDocument();
        expect(screen.getByText('plomero urgente')).toBeInTheDocument();
      });
    });

    test('muestra sugerencias de ciudades', async () => {
      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      const cityInput = screen.getByLabelText(/Ciudad/i);
      fireEvent.change(cityInput, { target: { value: 'Bue' } });

      await waitFor(() => {
        expect(screen.getByText('Buenos Aires')).toBeInTheDocument();
        expect(screen.getByText('Córdoba')).toBeInTheDocument();
      });
    });

    test('muestra sugerencias de barrios', async () => {
      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      const districtInput = screen.getByLabelText(/Barrio/i);
      fireEvent.change(districtInput, { target: { value: 'Pal' } });

      await waitFor(() => {
        expect(screen.getByText('Palermo')).toBeInTheDocument();
        expect(screen.getByText('Recoleta')).toBeInTheDocument();
      });
    });

    test('limita sugerencias a 5 por tipo', async () => {
      mockSearchAPI.autocomplete.mockResolvedValue({
        specialties: Array.from({ length: 10 }, (_, i) => ({
          value: `especialidad${i}`,
          count: i + 1
        }))
      });

      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      const serviceInput = screen.getByLabelText(/Servicio que necesitas/i);
      fireEvent.change(serviceInput, { target: { value: 'esp' } });

      await waitFor(() => {
        const suggestions = screen.getAllByText(/\(\d+\)/);
        expect(suggestions).toHaveLength(5); // Máximo 5 sugerencias
      });
    });

    test('selecciona sugerencia correctamente', async () => {
      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      const serviceInput = screen.getByLabelText(/Servicio que necesitas/i);
      fireEvent.change(serviceInput, { target: { value: 'plom' } });

      await waitFor(() => {
        expect(screen.getByText('plomero')).toBeInTheDocument();
      });

      const suggestion = screen.getByText('plomero');
      fireEvent.click(suggestion);

      expect(serviceInput.value).toBe('plomero');
      expect(screen.queryByText('plomero urgente')).not.toBeInTheDocument();
    });

    test('oculta sugerencias al hacer blur', async () => {
      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      const serviceInput = screen.getByLabelText(/Servicio que necesitas/i);
      fireEvent.change(serviceInput, { target: { value: 'plom' } });

      await waitFor(() => {
        expect(screen.getByText('plomero')).toBeInTheDocument();
      });

      fireEvent.blur(serviceInput);

      await waitFor(() => {
        expect(screen.queryByText('plomero')).not.toBeInTheDocument();
      }, { timeout: 300 });
    });

    test('no muestra sugerencias para términos cortos', () => {
      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      const serviceInput = screen.getByLabelText(/Servicio que necesitas/i);
      fireEvent.change(serviceInput, { target: { value: 'p' } });

      expect(mockSearchAPI.autocomplete).not.toHaveBeenCalled();
    });

    test('maneja errores de autocompletado', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSearchAPI.autocomplete.mockRejectedValue(new Error('API Error'));

      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      const serviceInput = screen.getByLabelText(/Servicio que necesitas/i);
      fireEvent.change(serviceInput, { target: { value: 'plom' } });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching autocomplete:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Debounce', () => {
    test('aplica debounce a las llamadas de autocompletado', () => {
      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      const serviceInput = screen.getByLabelText(/Servicio que necesitas/i);

      fireEvent.change(serviceInput, { target: { value: 'p' } });
      fireEvent.change(serviceInput, { target: { value: 'pl' } });
      fireEvent.change(serviceInput, { target: { value: 'plo' } });

      expect(mockSearchAPI.autocomplete).not.toHaveBeenCalled();
    });
  });

  describe('Accesibilidad', () => {
    test('tiene labels correctos para lectores de pantalla', () => {
      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      expect(screen.getByLabelText(/Servicio que necesitas/i)).toHaveAttribute('aria-label', 'Campo para ingresar el servicio que necesitas');
      expect(screen.getByLabelText(/Ciudad/i)).toHaveAttribute('aria-label', 'Campo para ingresar la ciudad');
      expect(screen.getByLabelText(/Barrio/i)).toHaveAttribute('aria-label', 'Campo para ingresar el barrio');
      expect(screen.getByText('Buscar')).toHaveAttribute('aria-label', 'Buscar servicios');
    });

    test('tiene autoComplete deshabilitado', () => {
      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).toHaveAttribute('autoComplete', 'off');
      });
    });
  });

  describe('Edge Cases', () => {
    test('maneja campos vacíos en navegación', () => {
      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      const serviceInput = screen.getByLabelText(/Servicio que necesitas/i);
      const cityInput = screen.getByLabelText(/Ciudad/i);

      fireEvent.change(serviceInput, { target: { value: '   ' } }); // Solo espacios
      fireEvent.change(cityInput, { target: { value: 'Buenos Aires' } });

      const searchButton = screen.getByText('Buscar');
      fireEvent.click(searchButton);

      expect(mockNavigate).toHaveBeenCalledWith('/profesionales?ciudad=Buenos%20Aires');
    });

    test('trim espacios en blanco al buscar', () => {
      render(
        <Wrapper>
          <SearchBar />
        </Wrapper>
      );

      const serviceInput = screen.getByLabelText(/Servicio que necesitas/i);
      fireEvent.change(serviceInput, { target: { value: '  plomero  ' } });

      const searchButton = screen.getByText('Buscar');
      fireEvent.click(searchButton);

      expect(mockNavigate).toHaveBeenCalledWith('/profesionales?q=plomero');
    });
  });
});
