import { useState, useCallback, useEffect } from 'react';

/**
 * Hook personalizado para gestión de filtros de búsqueda
 * Maneja estado de filtros, validación y persistencia
 * @param {Object} initialFilters - Filtros iniciales
 * @returns {Object} Estado y funciones de filtros
 */
export const useFilters = (initialFilters = {}) => {
  const [filters, setFilters] = useState({
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

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  /**
   * Actualizar un filtro específico
   */
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  /**
   * Actualizar múltiples filtros
   */
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  /**
   * Limpiar todos los filtros
   */
  const clearFilters = useCallback(() => {
    setFilters({
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
  }, []);

  /**
   * Limpiar filtro específico
   */
  const clearFilter = useCallback((key) => {
    const defaultValues = {
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

    setFilters(prev => ({
      ...prev,
      [key]: defaultValues[key]
    }));
  }, []);

  /**
   * Obtener filtros activos (con valores no vacíos)
   */
  const getActiveFilters = useCallback(() => {
    const active = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined && value !== false) {
        active[key] = value;
      }
    });
    return active;
  }, [filters]);

  /**
   * Verificar si hay filtros activos
   */
  const hasActiveFilters = useCallback(() => {
    return Object.values(getActiveFilters()).length > 0;
  }, [getActiveFilters]);

  /**
   * Validar filtros
   */
  const validateFilters = useCallback(() => {
    const errors = [];

    // Validar rango de precios
    if (filters.precio_min && filters.precio_max) {
      const min = parseFloat(filters.precio_min);
      const max = parseFloat(filters.precio_max);
      if (min >= max) {
        errors.push('El precio mínimo debe ser menor al precio máximo');
      }
    }

    // Validar precio mínimo
    if (filters.precio_min && (isNaN(filters.precio_min) || parseFloat(filters.precio_min) < 0)) {
      errors.push('El precio mínimo debe ser un número positivo');
    }

    // Validar precio máximo
    if (filters.precio_max && (isNaN(filters.precio_max) || parseFloat(filters.precio_max) < 0)) {
      errors.push('El precio máximo debe ser un número positivo');
    }

    // Validar radio
    if (filters.radio && (isNaN(filters.radio) || parseFloat(filters.radio) <= 0)) {
      errors.push('El radio debe ser un número positivo');
    }

    return errors;
  }, [filters]);

  /**
   * Obtener filtros para API (convirtiendo tipos)
   */
  const getApiFilters = useCallback(() => {
    const apiFilters = { ...filters };

    // Convertir strings vacías a undefined
    Object.keys(apiFilters).forEach(key => {
      if (apiFilters[key] === '') {
        delete apiFilters[key];
      }
    });

    // Convertir precios a números
    if (apiFilters.precio_min) {
      apiFilters.precio_min = parseFloat(apiFilters.precio_min);
    }
    if (apiFilters.precio_max) {
      apiFilters.precio_max = parseFloat(apiFilters.precio_max);
    }

    // Convertir radio a número
    if (apiFilters.radio) {
      apiFilters.radio = parseFloat(apiFilters.radio);
    }

    return apiFilters;
  }, [filters]);

  // Calcular cantidad de filtros activos
  useEffect(() => {
    const activeCount = Object.values(getActiveFilters()).length;
    setActiveFiltersCount(activeCount);
  }, [filters, getActiveFilters]);

  return {
    // Estado
    filters,
    activeFiltersCount,

    // Funciones de actualización
    updateFilter,
    updateFilters,
    clearFilters,
    clearFilter,

    // Utilidades
    getActiveFilters,
    hasActiveFilters,
    validateFilters,
    getApiFilters,

    // Setters directos
    setFilters
  };
};

export default useFilters;
