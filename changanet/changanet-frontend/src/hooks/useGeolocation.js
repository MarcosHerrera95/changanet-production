import { useState, useEffect } from 'react';

/**
 * Hook personalizado para obtener la geolocalización del usuario
 * @returns {Object} - Estado de geolocalización con coordenadas, loading, error y función para solicitar ubicación
 */
const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Verificar si la geolocalización está disponible
  const isGeolocationAvailable = 'geolocation' in navigator;

  /**
   * Solicitar la ubicación del usuario
   */
  const requestLocation = () => {
    if (!isGeolocationAvailable) {
      setError('La geolocalización no está disponible en este navegador');
      return;
    }

    setLoading(true);
    setError(null);
    setPermissionDenied(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocation({
          latitude,
          longitude,
          accuracy,
          timestamp: position.timestamp
        });
        setLoading(false);
        
        // Guardar en localStorage para uso futuro
        localStorage.setItem('userLocation', JSON.stringify({
          latitude,
          longitude,
          timestamp: Date.now()
        }));
      },
      (err) => {
        setLoading(false);
        
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Permiso de ubicación denegado. Por favor, habilita la ubicación en tu navegador.');
            setPermissionDenied(true);
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Información de ubicación no disponible.');
            break;
          case err.TIMEOUT:
            setError('La solicitud de ubicación ha expirado.');
            break;
          default:
            setError('Error desconocido al obtener la ubicación.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutos
      }
    );
  };

  /**
   * Limpiar la ubicación guardada
   */
  const clearLocation = () => {
    setLocation(null);
    setError(null);
    setPermissionDenied(false);
    localStorage.removeItem('userLocation');
  };

  /**
   * Calcular distancia entre dos puntos usando la fórmula de Haversine
   * @param {number} lat1 - Latitud del punto 1
   * @param {number} lon1 - Longitud del punto 1
   * @param {number} lat2 - Latitud del punto 2
   * @param {number} lon2 - Longitud del punto 2
   * @returns {number} - Distancia en kilómetros
   */
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Redondear a 1 decimal
  };

  /**
   * Convertir grados a radianes
   */
  const toRad = (degrees) => {
    return degrees * (Math.PI / 180);
  };

  // Intentar cargar ubicación guardada al montar el componente
  useEffect(() => {
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        const age = Date.now() - parsed.timestamp;
        
        // Si la ubicación tiene menos de 1 hora, usarla
        if (age < 3600000) {
          setLocation({
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            accuracy: null,
            timestamp: parsed.timestamp
          });
        } else {
          // Ubicación muy antigua, eliminarla
          localStorage.removeItem('userLocation');
        }
      } catch (err) {
        console.error('Error al cargar ubicación guardada:', err);
        localStorage.removeItem('userLocation');
      }
    }
  }, []);

  return {
    location,
    loading,
    error,
    permissionDenied,
    isGeolocationAvailable,
    requestLocation,
    clearLocation,
    calculateDistance
  };
};

export default useGeolocation;
