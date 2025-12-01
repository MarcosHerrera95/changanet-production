/**
 * Tests unitarios exhaustivos para el hook useFilters
 * Cubre gestión de estado, validación, persistencia y utilidades
 */

import { renderHook, act } from '@testing-library/react';
import { useFilters } from './useFilters';

describe('useFilters Hook - Unit Tests', () => {
  describe('Inicialización', () => {
    test('inicializa con valores por defecto', () => {
      const { result } = renderHook(() => useFilters());

      expect(result.current.filters).toEqual({
        q: '',
        especialidad: '',
        ciudad: '',
        barrio: '',
        precio_min: '',
        precio_max: '',
        verificado: false,
        ordenar_por: 'relevancia',
        radio: 10
      });
      expect(result.current.activeFiltersCount).toBe(0);
    });

    test('inicializa con filtros personalizados', () => {
      const initialFilters = {
        q: 'plomero',
        ciudad: 'Buenos Aires',
        precio_min: '1000',
        verificado: true
      };

      const { result } = renderHook(() => useFilters(initialFilters));

      expect(result.current.filters.q).toBe('plomero');
      expect(result.current.filters.ciudad).toBe('Buenos Aires');
      expect(result.current.filters.precio_min).toBe('1000');
      expect(result.current.filters.verificado).toBe(true);
    });
  });

  describe('Actualización de Filtros', () => {
    test('updateFilter actualiza un filtro específico', () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.updateFilter('q', 'plomero');
      });

      expect(result.current.filters.q).toBe('plomero');
      expect(result.current.activeFiltersCount).toBe(1);
    });

    test('updateFilters actualiza múltiples filtros', () => {
      const { result } = renderHook(() => useFilters());

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
      expect(result.current.activeFiltersCount).toBe(3);
    });

    test('clearFilters resetea todos los filtros', () => {
      const { result } = renderHook(() => useFilters({
        q: 'plomero',
        ciudad: 'Buenos Aires',
        precio_min: '1000'
      }));

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({
        q: '',
        especialidad: '',
        ciudad: '',
        barrio: '',
        precio_min: '',
        precio_max: '',
        verificado: false,
        ordenar_por: 'relevancia',
        radio: 10
      });
      expect(result.current.activeFiltersCount).toBe(0);
    });

    test('clearFilter resetea un filtro específico', () => {
      const { result } = renderHook(() => useFilters({
        q: 'plomero',
        ciudad: 'Buenos Aires'
      }));

      act(() => {
        result.current.clearFilter('q');
      });

      expect(result.current.filters.q).toBe('');
      expect(result.current.filters.ciudad).toBe('Buenos Aires');
      expect(result.current.activeFiltersCount).toBe(1);
    });
  });

  describe('Filtros Activos', () => {
    test('getActiveFilters retorna solo filtros con valores', () => {
      const { result } = renderHook(() => useFilters({
        q: 'plomero',
        ciudad: '',
        precio_min: '1000',
        verificado: false,
        radio: 10
      }));

      const activeFilters = result.current.getActiveFilters();

      expect(activeFilters).toEqual({
        q: 'plomero',
        precio_min: '1000',
        radio: 10
      });
    });

    test('hasActiveFilters retorna true cuando hay filtros activos', () => {
      const { result } = renderHook(() => useFilters({
        q: 'plomero'
      }));

      expect(result.current.hasActiveFilters()).toBe(true);
    });

    test('hasActiveFilters retorna false cuando no hay filtros activos', () => {
      const { result } = renderHook(() => useFilters());

      expect(result.current.hasActiveFilters()).toBe(false);
    });

    test('activeFiltersCount se actualiza automáticamente', () => {
      const { result } = renderHook(() => useFilters());

      expect(result.current.activeFiltersCount).toBe(0);

      act(() => {
        result.current.updateFilter('q', 'plomero');
      });

      expect(result.current.activeFiltersCount).toBe(1);

      act(() => {
        result.current.updateFilter('ciudad', 'Buenos Aires');
      });

      expect(result.current.activeFiltersCount).toBe(2);

      act(() => {
        result.current.clearFilter('q');
      });

      expect(result.current.activeFiltersCount).toBe(1);
    });
  });

  describe('Validación de Filtros', () => {
    test('validateFilters retorna errores para precios inválidos', () => {
      const { result } = renderHook(() => useFilters({
        precio_min: '2000',
        precio_max: '1000'
      }));

      const errors = result.current.validateFilters();

      expect(errors).toContain('El precio mínimo debe ser menor al precio máximo');
    });

    test('validateFilters acepta precios válidos', () => {
      const { result } = renderHook(() => useFilters({
        precio_min: '1000',
        precio_max: '2000'
      }));

      const errors = result.current.validateFilters();

      expect(errors).toHaveLength(0);
    });

    test('validateFilters rechaza precio mínimo negativo', () => {
      const { result } = renderHook(() => useFilters({
        precio_min: '-100'
      }));

      const errors = result.current.validateFilters();

      expect(errors).toContain('El precio mínimo debe ser un número positivo');
    });

    test('validateFilters rechaza precio máximo negativo', () => {
      const { result } = renderHook(() => useFilters({
        precio_max: '-500'
      }));

      const errors = result.current.validateFilters();

      expect(errors).toContain('El precio máximo debe ser un número positivo');
    });

    test('validateFilters rechaza radio inválido', () => {
      const { result } = renderHook(() => useFilters({
        radio: '-5'
      }));

      const errors = result.current.validateFilters();

      expect(errors).toContain('El radio debe ser un número positivo');
    });

    test('validateFilters acepta radio cero', () => {
      const { result } = renderHook(() => useFilters({
        radio: 0
      }));

      const errors = result.current.validateFilters();

      expect(errors).toHaveLength(0);
    });

    test('validateFilters maneja precios no numéricos', () => {
      const { result } = renderHook(() => useFilters({
        precio_min: 'abc',
        precio_max: 'xyz'
      }));

      const errors = result.current.validateFilters();

      expect(errors).toHaveLength(0); // No valida formato, solo comparación
    });
  });

  describe('API Filters', () => {
    test('getApiFilters convierte tipos correctamente', () => {
      const { result } = renderHook(() => useFilters({
        q: 'plomero',
        ciudad: 'Buenos Aires',
        precio_min: '1000',
        precio_max: '2000',
        radio: '15',
        verificado: true
      }));

      const apiFilters = result.current.getApiFilters();

      expect(apiFilters).toEqual({
        q: 'plomero',
        ciudad: 'Buenos Aires',
        precio_min: 1000,
        precio_max: 2000,
        radio: 15,
        verificado: true,
        ordenar_por: 'relevancia'
      });
    });

    test('getApiFilters elimina campos vacíos', () => {
      const { result } = renderHook(() => useFilters({
        q: 'plomero',
        ciudad: '',
        barrio: null,
        precio_min: undefined
      }));

      const apiFilters = result.current.getApiFilters();

      expect(apiFilters).toEqual({
        q: 'plomero',
        ordenar_por: 'relevancia',
        radio: 10
      });
      expect(apiFilters).not.toHaveProperty('ciudad');
      expect(apiFilters).not.toHaveProperty('barrio');
      expect(apiFilters).not.toHaveProperty('precio_min');
    });

    test('getApiFilters maneja valores booleanos correctamente', () => {
      const { result } = renderHook(() => useFilters({
        verificado: false
      }));

      const apiFilters = result.current.getApiFilters();

      expect(apiFilters.verificado).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('maneja actualización de filtros inexistentes', () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.updateFilter('nonexistent', 'value');
      });

      expect(result.current.filters).toHaveProperty('nonexistent', 'value');
    });

    test('clearFilter maneja filtros inexistentes', () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.clearFilter('nonexistent');
      });

      // No debería lanzar error
      expect(result.current.filters).not.toHaveProperty('nonexistent');
    });

    test('validateFilters maneja filtros undefined', () => {
      const { result } = renderHook(() => useFilters());

      // Simular filtros undefined
      act(() => {
        result.current.setFilters(undefined);
      });

      expect(() => result.current.validateFilters()).not.toThrow();
    });

    test('getActiveFilters maneja filtros undefined', () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setFilters(undefined);
      });

      expect(() => result.current.getActiveFilters()).not.toThrow();
    });
  });

  describe('Integración con setFilters', () => {
    test('setFilters directo actualiza estado', () => {
      const { result } = renderHook(() => useFilters());

      const newFilters = {
        q: 'direct',
        ciudad: 'update'
      };

      act(() => {
        result.current.setFilters(newFilters);
      });

      expect(result.current.filters.q).toBe('direct');
      expect(result.current.filters.ciudad).toBe('update');
    });

    test('setFilters mantiene valores por defecto para campos no especificados', () => {
      const { result } = renderHook(() => useFilters({
        q: 'initial'
      }));

      act(() => {
        result.current.setFilters({
          ciudad: 'new'
        });
      });

      expect(result.current.filters.q).toBe('initial'); // Mantiene valor inicial
      expect(result.current.filters.ciudad).toBe('new');
      expect(result.current.filters.ordenar_por).toBe('relevancia'); // Valor por defecto
    });
  });
});
