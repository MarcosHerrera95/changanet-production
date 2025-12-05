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
      // Usar el proxy backend para evitar CORS
      const token = localStorage.getItem('changanet_token');
      const response = await fetch(`/api/geocode?zone=${encodeURIComponent(zone + ', Argentina')}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        throw new Error('Error en la geocodificación');
      }

      // Validar que la respuesta sea JSON
      const contentType = response.headers.get('content-type');
      const text = await response.text();
      if (!contentType || !contentType.includes('application/json') || text.trim().startsWith('<!doctype')) {
        setLocationError('Error: El servidor respondió con un formato inesperado. Verifica la configuración del backend y CORS.');
        setCoordinates({ lat: null, lng: null });
        notifyChange(zone, null, null);
        console.error('Respuesta inesperada:', text);
        return;
      }

      // Si es JSON, parsear
      const data = JSON.parse(text);

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


      {/* Coordenadas GPS - Mejor UX */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <span>Coordenadas GPS</span>
            <span className="text-gray-400" title="Las coordenadas GPS ayudan a los clientes a encontrarte y validar tu zona de cobertura.">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3"/></svg>
            </span>
          </h4>
          <button
            type="button"
            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors border border-blue-200"
            onClick={() => zoneInput && geocodeZone(zoneInput)}
            disabled={!zoneInput || loadingLocation}
            title="Obtener coordenadas automáticamente según la zona"
          >
            Obtener coordenadas de zona
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Latitud</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="^-?\d{1,2}(\.\d{1,8})?$"
              value={coordinates.lat ?? ''}
              onChange={(e) => handleManualCoordinates(e.target.value, coordinates.lng)}
              className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${locationError ? 'border-red-400' : 'border-gray-300'}`}
              placeholder="Ej: -34.6037"
              aria-label="Latitud GPS"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Longitud</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="^-?\d{1,3}(\.\d{1,8})?$"
              value={coordinates.lng ?? ''}
              onChange={(e) => handleManualCoordinates(coordinates.lat, e.target.value)}
              className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${locationError ? 'border-red-400' : 'border-gray-300'}`}
              placeholder="Ej: -58.3816"
              aria-label="Longitud GPS"
            />
          </div>
        </div>
        <div className="mt-2">
          {locationError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3"/></svg>
              {locationError}
            </p>
          )}
          {coordinates.lat && coordinates.lng && !locationError && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3"/></svg>
              ✓ Coordenadas válidas
            </p>
          )}
          {!coordinates.lat && !coordinates.lng && !locationError && (
            <p className="text-xs text-gray-500">Especifica la zona donde ofreces tus servicios. Las coordenadas GPS ayudan a los clientes a encontrarte.</p>
          )}
        </div>
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
