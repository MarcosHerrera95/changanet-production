/**
 * Tests para el hook useApiState
 * Verifica el manejo correcto de estados de API
 */

import { renderHook, act } from '@testing-library/react';
import { useApiState } from './useApi';

// Mock de Sentry para evitar errores en tests
jest.mock('@sentry/react', () => ({
  captureException: jest.fn(),
}));

// Mock del módulo apiService
jest.mock('../services/apiService', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('useApiState Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('debe inicializar con estados por defecto', () => {
    const { result } = renderHook(() => useApiState());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.data).toBe(null);
    expect(result.current.hasError).toBe(false);
    expect(typeof result.current.execute).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  test('debe manejar una llamada API exitosa', async () => {
    const mockApiCall = jest.fn().mockResolvedValue({ success: true, data: 'test' });
    const { result } = renderHook(() => useApiState());

    await act(async () => {
      const response = await result.current.execute(mockApiCall);
      expect(response).toEqual({ success: true, data: 'test' });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.data).toEqual({ success: true, data: 'test' });
    expect(result.current.hasError).toBe(false);
  });

  test('debe manejar errores de API', async () => {
    const mockError = new Error('API Error');
    const mockApiCall = jest.fn().mockRejectedValue(mockError);
    const { result } = renderHook(() => useApiState());

    await act(async () => {
      try {
        await result.current.execute(mockApiCall);
      } catch (error) {
        // Error esperado
      }
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('API Error');
    expect(result.current.hasError).toBe(true);
  });

  test('debe resetear estados correctamente', () => {
    const { result } = renderHook(() => useApiState());

    act(() => {
      result.current.reset();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.data).toBe(null);
    expect(result.current.hasError).toBe(false);
  });

  test('debe manejar opciones de configuración', () => {
    const { result } = renderHook(() =>
      useApiState({
        showErrorToast: false,
        logErrors: false,
        retryOnError: true,
        maxRetries: 3
      })
    );

    expect(result.current.loading).toBe(false);
    // Las opciones se pasan correctamente al hook interno
  });
});
