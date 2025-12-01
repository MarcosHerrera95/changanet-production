/**
 * Tests unitarios exhaustivos para el hook useSearch
 * Cubre estados, efectos, debounce, paginación, geolocalización y manejo de errores
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSearch } from './useSearch';
import { searchAPI } from '../services/apiService';

// Mock de dependencias
jest.mock('../services/apiService');
jest.mock('./useGeolocation');

// Mock de localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock de useGeolocation
const mockUseGeolocation = jest.fn();
jest.mock('./useGeolocation', () => ({
  useGeolocation: () => mockUseGeolocation()
}));

describe('useSearch Hook - Unit Tests', () => {
  let mockSearchAPI;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock localStorage
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});

    // Mock geolocation
    mockUseGeolocation.mockReturnValue({
      location: null,
      requestLocation: jest.fn()
    });

    // Mock API
    mockSearchAPI = {
      searchProfessionals: jest.fn()
    };
    searchAPI.searchProfessionals = mockSearchAPI.searchProfessionals;
  });

  describe('Inicialización', () => {
    test('inicializa con valores por defecto', () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.professionals).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.total).toBe(0);
      expect(result.current.page).toBe(1);
      expect(result.current.isLoadingMore).toBe(false);
    });

    test('inicializa con filtros personalizados', () => {
      const initialFilters = {
        q: 'plomero',
        ciudad: 'Buenos Aires',
        precio_min: '1000'
      };

      const { result } = renderHook(() => useSearch(initialFilters));

      expect(result.current.filters.q).toBe('plomero');
      expect(result.current.filters.ciudad).toBe('Buenos Aires');
      expect(result.current.filters.precio_min).toBe('1000');
    });

    test('carga filtros desde localStorage', () => {
      const storedFilters = {
        q: 'electricista',
        ciudad: 'Córdoba',
        ordenar_por: 'rating'
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedFilters));

      const { result } = renderHook(() => useSearch());

      expect(result.current.filters).toEqual({
        ...storedFilters,
        precio_min: '',
        precio_max: '',
        barrio: '',
        especialidad: '',
        verificado: false,
        radio: 10
      });
    });
  });

  describe('Búsqueda', () => {
    test('realiza búsqueda básica correctamente', async () => {
      mockSearchAPI.searchProfessionals.mockResolvedValue({
        professionals: [
          { id: 1, name: 'Juan Pérez', specialty: 'Plomero' }
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.performSearch({ q: 'plomero' });
      });

      expect(mockSearchAPI.searchProfessionals).toHaveBeenCalledWith({
        q: 'plomero',
        pagina: 1,
        limite: 20
      });
      expect(result.current.professionals).toHaveLength(1);
      expect(result.current.total).toBe(1);
      expect(result.current.loading).toBe(false);
    });

    test('incluye ubicación del usuario en la búsqueda', async () => {
      mockUseGeolocation.mockReturnValue({
        location: { latitude: -34.6037, longitude: -58.3816 },
        requestLocation: jest.fn()
      });

      mockSearchAPI.searchProfessionals.mockResolvedValue({
        professionals: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      });

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.performSearch({ q: 'plomero' });
      });

      expect(mockSearchAPI.searchProfessionals).toHaveBeenCalledWith({
        q: 'plomero',
        pagina: 1,
        limite: 20,
        lat: -34.6037,
        lng: -58.3816
      });
    });

    test('limpia parámetros vacíos antes de enviar', async () => {
      mockSearchAPI.searchProfessionals.mockResolvedValue({
        professionals: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      });

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.performSearch({
          q: 'plomero',
          ciudad: '',
          barrio: null,
          precio_min: undefined
        });
      });

      const callArgs = mockSearchAPI.searchProfessionals.mock.calls[0][0];
      expect(callArgs.q).toBe('plomero');
      expect(callArgs).not.toHaveProperty('ciudad');
      expect(callArgs).not.toHaveProperty('barrio');
      expect(callArgs).not.toHaveProperty('precio_min');
    });
  });

  describe('Debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('aplica debounce a las búsquedas', async () => {
      mockSearchAPI.searchProfessionals.mockResolvedValue({
        professionals: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      });

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.updateFilters({ q: 'p' });
        result.current.updateFilters({ q: 'pl' });
        result.current.updateFilters({ q: 'plo' });
      });

      expect(mockSearchAPI.searchProfessionals).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockSearchAPI.searchProfessionals).toHaveBeenCalledTimes(1);
      });

      expect(mockSearchAPI.searchProfessionals).toHaveBeenCalledWith({
        q: 'plo',
        pagina: 1,
        limite: 20
      });
    });
  });

  describe('Paginación', () => {
    test('carga más resultados correctamente', async () => {
      mockSearchAPI.searchProfessionals
        .mockResolvedValueOnce({
          professionals: [{ id: 1, name: 'Juan' }],
          total: 25,
          page: 1,
          limit: 20,
          totalPages: 2
        })
        .mockResolvedValueOnce({
          professionals: [{ id: 2, name: 'María' }],
          total: 25,
          page: 2,
          limit: 20,
          totalPages: 2
        });

      const { result } = renderHook(() => useSearch());

      // Primera búsqueda
      await act(async () => {
        await result.current.performSearch({ q: 'plomero' });
      });

      expect(result.current.professionals).toHaveLength(1);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.page).toBe(1);

      // Cargar más
      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.professionals).toHaveLength(2);
      expect(result.current.page).toBe(2);
      expect(result.current.isLoadingMore).toBe(false);

      expect(mockSearchAPI.searchProfessionals).toHaveBeenCalledTimes(2);
      expect(mockSearchAPI.searchProfessionals).toHaveBeenNthCalledWith(2, {
        q: 'plomero',
        pagina: 2,
        limite: 20
      });
    });

    test('no carga más cuando no hay más resultados', async () => {
      mockSearchAPI.searchProfessionals.mockResolvedValue({
        professionals: [{ id: 1, name: 'Juan' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.performSearch({ q: 'plomero' });
      });

      expect(result.current.hasMore).toBe(false);

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockSearchAPI.searchProfessionals).toHaveBeenCalledTimes(1);
    });

    test('no carga más mientras está cargando', async () => {
      mockSearchAPI.searchProfessionals.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          professionals: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0
        }), 100))
      );

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.loadMore();
        result.current.loadMore(); // Segunda llamada inmediata
      });

      expect(mockSearchAPI.searchProfessionals).toHaveBeenCalledTimes(1);
    });
  });

  describe('Gestión de Filtros', () => {
    test('actualiza filtros correctamente', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.updateFilters({
          q: 'plomero',
          ciudad: 'Buenos Aires',
          precio_min: '1000'
        });
      });

      expect(result.current.filters.q).toBe('plomero');
      expect(result.current.filters.ciudad).toBe('Buenos Aires');
      expect(result.current.filters.precio_min).toBe('1000');
    });

    test('limpia filtros correctamente', () => {
      const { result } = renderHook(() => useSearch({
        q: 'plomero',
        ciudad: 'Buenos Aires',
        precio_min: '1000'
      }));

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters.q).toBe('');
      expect(result.current.filters.ciudad).toBe('');
      expect(result.current.filters.precio_min).toBe('');
      expect(result.current.professionals).toEqual([]);
      expect(result.current.error).toBe(null);
    });

    test('persiste filtros en localStorage', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.updateFilters({ q: 'plomero', ciudad: 'Buenos Aires' });
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'searchFilters',
        JSON.stringify({
          q: 'plomero',
          especialidad: '',
          ciudad: 'Buenos Aires',
          barrio: '',
          precio_min: '',
          precio_max: '',
          verificado: false,
          ordenar_por: 'relevancia',
          radio: 10
        })
      );
    });
  });

  describe('Manejo de Errores', () => {
    test('maneja errores de API correctamente', async () => {
      const errorMessage = 'Error de conexión';
      mockSearchAPI.searchProfessionals.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.performSearch({ q: 'plomero' });
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.loading).toBe(false);
      expect(result.current.professionals).toEqual([]);
    });

    test('limpia error en nueva búsqueda', async () => {
      mockSearchAPI.searchProfessionals
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce({
          professionals: [{ id: 1, name: 'Juan' }],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1
        });

      const { result } = renderHook(() => useSearch());

      // Primera búsqueda con error
      await act(async () => {
        await result.current.performSearch({ q: 'plomero' });
      });
      expect(result.current.error).toBe('Error');

      // Segunda búsqueda exitosa
      await act(async () => {
        await result.current.performSearch({ q: 'electricista' });
      });
      expect(result.current.error).toBe(null);
      expect(result.current.professionals).toHaveLength(1);
    });
  });

  describe('Estados de Carga', () => {
    test('maneja estado de carga correctamente', async () => {
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockSearchAPI.searchProfessionals.mockReturnValue(promise);

      const { result } = renderHook(() => useSearch());

      expect(result.current.loading).toBe(false);

      const searchPromise = act(async () => {
        result.current.performSearch({ q: 'plomero' });
      });

      expect(result.current.loading).toBe(true);

      resolvePromise({
        professionals: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      });

      await searchPromise;

      expect(result.current.loading).toBe(false);
    });

    test('maneja estado de carga para paginación infinita', async () => {
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockSearchAPI.searchProfessionals
        .mockResolvedValueOnce({
          professionals: [{ id: 1 }],
          total: 25,
          page: 1,
          limit: 20,
          totalPages: 2
        })
        .mockReturnValueOnce(promise);

      const { result } = renderHook(() => useSearch());

      // Primera búsqueda
      await act(async () => {
        await result.current.performSearch({ q: 'plomero' });
      });

      expect(result.current.isLoadingMore).toBe(false);

      // Cargar más
      const loadMorePromise = act(async () => {
        result.current.loadMore();
      });

      expect(result.current.isLoadingMore).toBe(true);

      resolvePromise({
        professionals: [{ id: 2 }],
        total: 25,
        page: 2,
        limit: 20,
        totalPages: 2
      });

      await loadMorePromise;

      expect(result.current.isLoadingMore).toBe(false);
    });
  });

  describe('Efectos y Lifecycle', () => {
    test('realiza búsqueda automática al cambiar filtros', async () => {
      mockSearchAPI.searchProfessionals.mockResolvedValue({
        professionals: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      });

      const { result } = renderHook(() => useSearch());

      await waitFor(() => {
        expect(mockSearchAPI.searchProfessionals).toHaveBeenCalledTimes(1);
      });
    });

    test('no realiza búsqueda automática con filtros vacíos iniciales', () => {
      const { result } = renderHook(() => useSearch());

      // No debería haber llamadas automáticas con filtros por defecto
      expect(mockSearchAPI.searchProfessionals).not.toHaveBeenCalled();
    });
  });

  describe('Búsqueda Inmediata', () => {
    test('searchNow ejecuta búsqueda sin debounce', async () => {
      mockSearchAPI.searchProfessionals.mockResolvedValue({
        professionals: [{ id: 1, name: 'Juan' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.searchNow({ q: 'plomero' });
      });

      expect(mockSearchAPI.searchProfessionals).toHaveBeenCalledWith({
        q: 'plomero',
        pagina: 1,
        limite: 20
      });
    });
  });
});
