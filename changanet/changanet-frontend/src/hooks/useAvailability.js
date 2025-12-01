/**
 * Custom hooks for advanced availability management
 * Integrates with the advanced availability API endpoints
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/apiService.js';

// Hook for managing availability configurations
export const useAvailabilityConfigs = (professionalId) => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pollingRef = useRef(null);

  const fetchConfigs = useCallback(async () => {
    if (!professionalId) return;

    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/advanced-availability/configs');
      setConfigs(response.configs || []);
    } catch (err) {
      setError(err.message || 'Error loading availability configurations');
      console.error('Error fetching availability configs:', err);
    } finally {
      setLoading(false);
    }
  }, [professionalId]);

  const createConfig = useCallback(async (configData) => {
    try {
      const newConfig = await api.post('/api/advanced-availability/configs', configData);
      setConfigs(prev => [...prev, newConfig]);
      return newConfig;
    } catch (err) {
      throw new Error(err.message || 'Error creating availability configuration');
    }
  }, []);

  const updateConfig = useCallback(async (configId, configData) => {
    try {
      const updatedConfig = await api.put(`/api/advanced-availability/configs/${configId}`, configData);
      setConfigs(prev => prev.map(config =>
        config.id === configId ? updatedConfig : config
      ));
      return updatedConfig;
    } catch (err) {
      throw new Error(err.message || 'Error updating availability configuration');
    }
  }, []);

  const deleteConfig = useCallback(async (configId) => {
    try {
      await api.delete(`/api/advanced-availability/configs/${configId}`);
      setConfigs(prev => prev.filter(config => config.id !== configId));
    } catch (err) {
      throw new Error(err.message || 'Error deleting availability configuration');
    }
  }, []);

  const generateSlots = useCallback(async (configId, dateRange) => {
    try {
      const result = await api.post(`/api/advanced-availability/configs/${configId}/generate`, dateRange);
      // Refresh configs after generation
      await fetchConfigs();
      return result;
    } catch (err) {
      throw new Error(err.message || 'Error generating availability slots');
    }
  }, [fetchConfigs]);

  // Real-time polling every 30 seconds
  useEffect(() => {
    if (professionalId) {
      fetchConfigs();

      pollingRef.current = setInterval(() => {
        fetchConfigs();
      }, 30000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [professionalId, fetchConfigs]);

  return {
    configs,
    loading,
    error,
    fetchConfigs,
    createConfig,
    updateConfig,
    deleteConfig,
    generateSlots,
    refetch: fetchConfigs
  };
};

// Hook for managing availability slots
export const useAvailabilitySlots = (filters = {}) => {
  const [slots, setSlots] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pollingRef = useRef(null);
  const debounceRef = useRef(null);

  const buildQueryString = useCallback((filters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    return params.toString();
  }, []);

  const fetchSlots = useCallback(async (currentFilters = filters) => {
    try {
      setLoading(true);
      setError('');
      const queryString = buildQueryString(currentFilters);
      const response = await api.get(`/api/advanced-availability/slots?${queryString}`);
      setSlots(response.slots || []);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message || 'Error loading availability slots');
      console.error('Error fetching availability slots:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, buildQueryString]);

  const debouncedFetch = useCallback((newFilters) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchSlots(newFilters);
    }, 300); // 300ms debounce
  }, [fetchSlots]);

  const updateSlot = useCallback(async (slotId, slotData) => {
    try {
      const updatedSlot = await api.put(`/api/advanced-availability/slots/${slotId}`, slotData);
      setSlots(prev => prev.map(slot =>
        slot.id === slotId ? updatedSlot : slot
      ));
      return updatedSlot;
    } catch (err) {
      throw new Error(err.message || 'Error updating availability slot');
    }
  }, []);

  const bookSlot = useCallback(async (slotId, bookingData) => {
    try {
      const result = await api.post(`/api/advanced-availability/slots/${slotId}/book`, bookingData);
      // Refresh slots after booking
      await fetchSlots();
      return result;
    } catch (err) {
      throw new Error(err.message || 'Error booking availability slot');
    }
  }, [fetchSlots]);

  // Real-time polling every 15 seconds
  useEffect(() => {
    fetchSlots();

    pollingRef.current = setInterval(() => {
      fetchSlots();
    }, 15000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fetchSlots]);

  return {
    slots,
    pagination,
    loading,
    error,
    fetchSlots,
    debouncedFetch,
    updateSlot,
    bookSlot,
    refetch: fetchSlots
  };
};

// Hook for managing appointments
export const useAppointments = (filters = {}) => {
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const queryString = new URLSearchParams(filters).toString();
      const response = await api.get(`/api/advanced-availability/appointments?${queryString}`);
      setAppointments(response.appointments || []);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message || 'Error loading appointments');
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const createAppointment = useCallback(async (appointmentData) => {
    try {
      const newAppointment = await api.post('/api/advanced-availability/appointments', appointmentData);
      setAppointments(prev => [...prev, newAppointment]);
      return newAppointment;
    } catch (err) {
      throw new Error(err.message || 'Error creating appointment');
    }
  }, []);

  const updateAppointment = useCallback(async (appointmentId, appointmentData) => {
    try {
      const updatedAppointment = await api.put(`/api/advanced-availability/appointments/${appointmentId}`, appointmentData);
      setAppointments(prev => prev.map(appointment =>
        appointment.id === appointmentId ? updatedAppointment : appointment
      ));
      return updatedAppointment;
    } catch (err) {
      throw new Error(err.message || 'Error updating appointment');
    }
  }, []);

  const cancelAppointment = useCallback(async (appointmentId, reason = '') => {
    try {
      const cancelledAppointment = await api.delete(`/api/advanced-availability/appointments/${appointmentId}`, {
        body: JSON.stringify({ reason })
      });
      setAppointments(prev => prev.map(appointment =>
        appointment.id === appointmentId ? cancelledAppointment : appointment
      ));
      return cancelledAppointment;
    } catch (err) {
      throw new Error(err.message || 'Error cancelling appointment');
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return {
    appointments,
    pagination,
    loading,
    error,
    fetchAppointments,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    refetch: fetchAppointments
  };
};

// Hook for conflict detection
export const useConflictDetection = () => {
  const [checking, setChecking] = useState(false);

  const checkConflicts = useCallback(async (entity, entityType, options = {}) => {
    try {
      setChecking(true);
      const result = await api.post('/api/advanced-availability/conflicts/check', {
        entity,
        entityType,
        options
      });
      return result;
    } catch (err) {
      throw new Error(err.message || 'Error checking for conflicts');
    } finally {
      setChecking(false);
    }
  }, []);

  return {
    checking,
    checkConflicts
  };
};

// Hook for timezone utilities
export const useTimezone = () => {
  const [timezones, setTimezones] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTimezones = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/advanced-availability/timezone/list');
      setTimezones(response.timezones || []);
    } catch (err) {
      console.error('Error fetching timezones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const convertTimezone = useCallback(async (dateTime, fromTimezone, toTimezone) => {
    try {
      const result = await api.post('/api/advanced-availability/timezone/convert', {
        dateTime,
        fromTimezone,
        toTimezone
      });
      return result;
    } catch (err) {
      throw new Error(err.message || 'Error converting timezone');
    }
  }, []);

  useEffect(() => {
    fetchTimezones();
  }, [fetchTimezones]);

  return {
    timezones,
    loading,
    fetchTimezones,
    convertTimezone
  };
};

// Hook for availability statistics
export const useAvailabilityStats = (professionalId, dateRange) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    if (!professionalId) return;

    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        professionalId,
        ...dateRange
      });
      const response = await api.get(`/api/advanced-availability/stats?${params}`);
      setStats(response);
    } catch (err) {
      setError(err.message || 'Error loading availability statistics');
      console.error('Error fetching availability stats:', err);
    } finally {
      setLoading(false);
    }
  }, [professionalId, dateRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
};
