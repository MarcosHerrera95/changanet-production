import { useState, useEffect, useMemo, useCallback } from 'react';
import { searchAPI } from '../services/apiService';
import { useGeolocation } from './useGeolocation';

/**
 * Hook personalizado para búsqueda de profesionales con debounce y paginación infinita
 * @param {Object} initialFilters - Filtros iniciales
 * @returns {Object} Estado y funciones de búsqueda
 */
export const useSearch = (initialFilters = {}) => {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // Geolocalización del usuario
  const { location: userLocation, requestLocation } = useGeolocation();

  // Filtros persistentes en localStorage
  const [filters, setFilters] = useLocalStorage('searchFilters', {
    q: '',
    especialidad: '',
    ciudad: '',
    barrio: '',
    precio_min: '',
    precio_max: '',
    verificado: false,
    ordenar_por: 'relevancia',
    radio: 10,
    ...initialFilters
  });

  // Estado de paginación
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  /**
   * Función de búsqueda debounced
   */
  const debouncedSearch = useMemo(
    () => {
      let timeoutId;
      return (searchFilters = filters, pageNum = 1, append = false) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => performSearch(searchFilters, pageNum, append), 300);
      };
    },
    []
  );

  /**
   * Realiza la búsqueda de profesionales
   */
  const performSearch = useCallback(async (searchFilters = filters, pageNum = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      // Preparar parámetros de búsqueda
      const searchParams = {
        ...searchFilters,
        pagina: pageNum,
        limite: 20,
        // Incluir ubicación del usuario si está disponible
        ...(userLocation && {
          lat: userLocation.latitude,
          lng: userLocation.longitude
        })
      };

      // Limpiar parámetros vacíos
      Object.keys(searchParams).forEach(key => {
        if (searchParams[key] === '' || searchParams[key] === null || searchParams[key] === undefined) {
          delete searchParams[key];
        }
      });

      const response = await searchAPI.searchProfessionals(searchParams);

      if (response.professionals) {
        if (append) {
          setProfessionals(prev => [...prev, ...response.professionals]);
        } else {
          setProfessionals(response.professionals);
        }

        setTotal(response.total || 0);
        setHasMore(response.professionals.length === 20 && (response.total || 0) > (pageNum * 20));
        setPage(pageNum);
      } else {
        // Fallback para respuesta sin estructura
        if (append) {
          setProfessionals(prev => [...prev, ...response]);
        } else {
          setProfessionals(response);
        }
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error searching professionals:', err);
      setError(err.message || 'Error al buscar profesionales');
      if (!append) {
        setProfessionals([]);
      }
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [filters, userLocation]);

  /**
   * Cargar más resultados (paginación infinita)
   */
  const loadMore = useCallback(() => {
    if (!loading && !isLoadingMore && hasMore) {
      const nextPage = page + 1;
      performSearch(filters, nextPage, true);
    }
  }, [loading, isLoadingMore, hasMore, page, filters, performSearch]);

  /**
   * Actualizar filtros y reiniciar búsqueda
   */
  const updateFilters = useCallback((newFilters) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setPage(1);
    setHasMore(true);
    debouncedSearch(updatedFilters, 1, false);
  }, [filters, setFilters, debouncedSearch]);

  /**
   * Limpiar todos los filtros
   */
  const clearFilters = useCallback(() => {
    const clearedFilters = {
      q: '',
      especialidad: '',
      ciudad: '',
      barrio: '',
      precio_min: '',
      precio_max: '',
      verificado: false,
      ordenar_por: 'relevancia',
      radio: 10
    };
    setFilters(clearedFilters);
    setPage(1);
    setHasMore(true);
    setProfessionals([]);
    setError(null);
  }, [setFilters]);

  /**
   * Buscar inmediatamente (sin debounce)
   */
  const searchNow = useCallback((searchFilters = filters) => {
    setPage(1);
    setHasMore(true);
    performSearch(searchFilters, 1, false);
  }, [filters, performSearch]);

  // Búsqueda automática cuando cambian los filtros
  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      debouncedSearch(filters, 1, false);
    }
  }, [filters, debouncedSearch]);

  return {
    // Estado
    professionals,
    loading,
    error,
    hasMore,
    total,
    isLoadingMore,
    page,

    // Geolocalización
    userLocation,
    requestLocation,

    // Filtros
    filters,
    updateFilters,
    clearFilters,

    // Acciones
    loadMore,
    searchNow,
    performSearch: (filters, page, append) => performSearch(filters, page, append)
  };
};

// Hook auxiliar para localStorage (si no existe)
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
};

export default useSearch;
