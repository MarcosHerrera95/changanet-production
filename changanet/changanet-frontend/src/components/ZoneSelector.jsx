import { useState, useEffect } from 'react';

/**
 * ZoneSelector - Componente para selección de zona de cobertura con GPS
 * Cumple con REQ-09: Definir zona de cobertura geográfica
 */
const ZoneSelector = ({ zona_cobertura, latitud, longitud, onChange, error }) => {
  const [zoneInput, setZoneInput] = useState(zona_cobertura || '');
  const [coordinates, setCoordinates] = useState({
    lat: latitud || null,
    lng: longitud || null
  });
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Zonas predefinidas comunes en Argentina
  const predefinedZones = [
    'Buenos Aires, Palermo',
    'Buenos Aires, Belgrano',
    'Buenos Aires, Recoleta',
    'Buenos Aires, Caballito',
    'Buenos Aires, Almagro',
    'Buenos Aires, Villa Crespo',
    'Buenos Aires, San Telmo',
    'Buenos Aires, La Boca',
    'Buenos Aires, Puerto Madero',
    'Buenos Aires, Retiro',
    'Buenos Aires, Microcentro',
    'Buenos Aires, Congreso',
    'Buenos Aires, Tribunales',
    'Buenos Aires, Once',
    'Buenos Aires, Abasto',
    'Buenos Aires, Villa Urquiza',
    'Buenos Aires, Saavedra',
    'Buenos Aires, Núñez',
    'Buenos Aires, Coghlan',
    'Buenos Aires, Colegiales'
  ];

  // Actualizar estado local cuando cambien las props
  useEffect(() => {
    setZoneInput(zona_cobertura || '');
    setCoordinates({
      lat: latitud || null,
      lng: longitud || null
    });
  }, [zona_cobertura, latitud, longitud]);

  // Notificar cambios al componente padre
  const notifyChange = (newZone, newLat, newLng) => {
    onChange({
      zona_cobertura: newZone,
      latitud: newLat,
      longitud: newLng
    });
  };

  const handleZoneInputChange = (value) => {
    setZoneInput(value);
    setLocationError('');
    // Limpiar coordenadas si cambia el texto manualmente
    if (coordinates.lat || coordinates.lng) {
      setCoordinates({ lat: null, lng: null });
      notifyChange(value, null, null);
    } else {
      notifyChange(value, coordinates.lat, coordinates.lng);
    }
  };

  const handleZoneSelect = (zone) => {
    setZoneInput(zone);
    setLocationError('');
    // Intentar geocodificar la zona seleccionada
    geocodeZone(zone);
  };

  const geocodeZone = async (zone) => {
    if (!zone.trim()) return;

    setLoadingLocation(true);
    setLocationError('');

    try {
      // Usar Nominatim (OpenStreetMap) para geocodificación gratuita
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(zone + ', Argentina')}&limit=1`
      );

      if (!response.ok) {
        throw new Error('Error en la geocodificación');
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);

        setCoordinates({ lat: newLat, lng: newLng });
        notifyChange(zone, newLat, newLng);
      } else {
        // No se encontraron coordenadas, pero mantenemos la zona
        setCoordinates({ lat: null, lng: null });
        notifyChange(zone, null, null);
        setLocationError('No se pudieron obtener las coordenadas GPS para esta zona');
      }
    } catch (error) {
      console.error('Error geocoding:', error);
      setLocationError('Error al obtener coordenadas GPS');
      setCoordinates({ lat: null, lng: null });
      notifyChange(zone, null, null);
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('La geolocalización no está disponible en este navegador');
      return;
    }

    setLoadingLocation(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Reverse geocoding para obtener nombre de zona
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16`
          );

          if (response.ok) {
            const data = await response.json();
            let zoneName = 'Ubicación actual';

            if (data && data.display_name) {
              // Extraer información relevante de la dirección
              const address = data.address || {};
              const city = address.city || address.town || address.village || '';
              const suburb = address.suburb || address.neighbourhood || '';

              if (city && suburb) {
                zoneName = `${city}, ${suburb}`;
              } else if (city) {
                zoneName = city;
              } else {
                zoneName = data.display_name.split(',')[0];
              }
            }

            setZoneInput(zoneName);
            setCoordinates({ lat: latitude, lng: longitude });
            notifyChange(zoneName, latitude, longitude);
          } else {
            // Usar coordenadas sin nombre de zona
            setZoneInput(`Ubicación actual (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
            setCoordinates({ lat: latitude, lng: longitude });
            notifyChange(`Ubicación actual (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`, latitude, longitude);
          }
        } catch (error) {
          console.error('Error reverse geocoding:', error);
          setZoneInput(`Ubicación actual (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          setCoordinates({ lat: latitude, lng: longitude });
          notifyChange(`Ubicación actual (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`, latitude, longitude);
        } finally {
          setLoadingLocation(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = 'Error al obtener ubicación';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Ubicación no disponible';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado para obtener ubicación';
            break;
        }

        setLocationError(errorMessage);
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutos
      }
    );
  };

  const handleManualCoordinates = (lat, lng) => {
    const newLat = parseFloat(lat);
    const newLng = parseFloat(lng);

    if (!isNaN(newLat) && !isNaN(newLng) &&
        newLat >= -90 && newLat <= 90 &&
        newLng >= -180 && newLng <= 180) {
      setCoordinates({ lat: newLat, lng: newLng });
      notifyChange(zoneInput, newLat, newLng);
      setLocationError('');
    } else {
      setLocationError('Coordenadas GPS inválidas');
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Zona de Cobertura *
      </label>

      {/* Input principal de zona */}
      <div className="relative">
        <input
          type="text"
          value={zoneInput}
          onChange={(e) => handleZoneInputChange(e.target.value)}
          placeholder="Ej: Buenos Aires, Palermo"
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          required
        />
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={loadingLocation}
          className="absolute right-2 top-2 text-gray-400 hover:text-blue-600 disabled:opacity-50"
          title="Usar mi ubicación actual"
        >
          {loadingLocation ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>

      {/* Zonas predefinidas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {predefinedZones.slice(0, 12).map(zone => (
          <button
            key={zone}
            type="button"
            onClick={() => handleZoneSelect(zone)}
            className="text-sm px-3 py-2 border border-gray-300 rounded-md hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            {zone}
          </button>
        ))}
      </div>

      {/* Coordenadas GPS */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Coordenadas GPS</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Latitud</label>
            <input
              type="number"
              value={coordinates.lat || ''}
              onChange={(e) => handleManualCoordinates(e.target.value, coordinates.lng)}
              step="0.000001"
              min="-90"
              max="90"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="-34.6037"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Longitud</label>
            <input
              type="number"
              value={coordinates.lng || ''}
              onChange={(e) => handleManualCoordinates(coordinates.lat, e.target.value)}
              step="0.000001"
              min="-180"
              max="180"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="-58.3816"
            />
          </div>
        </div>
        {coordinates.lat && coordinates.lng && (
          <p className="text-xs text-green-600 mt-2">
            ✓ Coordenadas válidas obtenidas
          </p>
        )}
      </div>

      {/* Mensajes de error */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {locationError && (
        <p className="text-sm text-amber-600">{locationError}</p>
      )}

      {/* Información adicional */}
      <p className="text-xs text-gray-500">
        Especifica la zona donde ofreces tus servicios. Las coordenadas GPS ayudan a los clientes a encontrarte.
      </p>
    </div>
  );
};

export default ZoneSelector;
