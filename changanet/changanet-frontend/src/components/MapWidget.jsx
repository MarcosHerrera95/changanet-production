// src/components/MapWidget.jsx
/**
 * @component MapWidget - Widget de mapa interactivo
 * @descripción Componente para mostrar mapa de Google Maps con marcadores
 * @sprint Sprint 2 – Funcionalidades Avanzadas
 * @tarjeta Tarjeta 5: [Frontend] Implementar Mapa Interactivo
 * @impacto Social: Visualización geográfica accesible para localizar servicios
 */

import { useEffect, useRef, useState } from 'react';

const MapWidget = ({
  center = null,
  zoom = 12,
  markers = [],
  className = "",
  height = "400px",
  showControls = true
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Centro por defecto: Buenos Aires
  const defaultCenter = { lat: -34.6037, lng: -58.3816 };

  useEffect(() => {
    const initializeMap = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Google Maps ya está inicializado desde App.jsx
        const googleMaps = { maps: window.google?.maps };

        // Verificar si Google Maps está disponible
        if (!googleMaps) {
          throw new Error('Google Maps no está disponible. Verifica la configuración de la API key.');
        }

        // Determinar centro del mapa
        const mapCenter = center || defaultCenter;

        // Crear instancia del mapa
        const mapOptions = {
          center: mapCenter,
          zoom: zoom,
          mapTypeControl: showControls,
          streetViewControl: showControls,
          fullscreenControl: showControls,
          zoomControl: showControls,
          gestureHandling: 'cooperative',
          styles: [
            // Estilos minimalistas para mejor UX
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        };

        mapInstanceRef.current = new googleMaps.maps.Map(mapRef.current, mapOptions);

        // Agregar marcadores
        if (markers && markers.length > 0) {
          markers.forEach(markerData => {
            const marker = new googleMaps.maps.Marker({
              position: markerData.position,
              map: mapInstanceRef.current,
              title: markerData.title || 'Ubicación',
              icon: markerData.icon || {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="18" fill="#10b981" stroke="white" stroke-width="3"/>
                    <circle cx="20" cy="20" r="8" fill="white"/>
                  </svg>
                `),
                scaledSize: new googleMaps.maps.Size(40, 40),
                anchor: new googleMaps.maps.Point(20, 40)
              }
            });

            // Agregar info window si hay contenido
            if (markerData.infoContent) {
              const infoWindow = new googleMaps.maps.InfoWindow({
                content: markerData.infoContent
              });

              marker.addListener('click', () => {
                infoWindow.open(mapInstanceRef.current, marker);
              });
            }
          });

          // Ajustar zoom para mostrar todos los marcadores
          if (markers.length > 1) {
            const bounds = new googleMaps.maps.LatLngBounds();
            markers.forEach(marker => {
              bounds.extend(marker.position);
            });
            mapInstanceRef.current.fitBounds(bounds);
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error inicializando mapa:', err);
        setError('No se pudo cargar el mapa. Verifica tu conexión a internet.');
        setIsLoading(false);
      }
    };

    initializeMap();

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        // Google Maps no tiene un método destroy explícito
        // pero podemos limpiar referencias
        mapInstanceRef.current = null;
      }
    };
  }, [center, zoom, markers, showControls]);

  // Actualizar marcadores cuando cambian
  useEffect(() => {
    if (!mapInstanceRef.current || !markers) return;

    // Limpiar marcadores existentes (esto es simplificado)
    // En una implementación completa, mantendríamos referencias a los marcadores

    markers.forEach(markerData => {
      const marker = new window.google.maps.Marker({
        position: markerData.position,
        map: mapInstanceRef.current,
        title: markerData.title || 'Ubicación'
      });

      if (markerData.infoContent) {
        const infoWindow = new window.google.maps.InfoWindow({
          content: markerData.infoContent
        });

        marker.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, marker);
        });
      }
    });
  }, [markers]);

  if (error) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center p-4">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando mapa...</p>
          </div>
        </div>
      )}
      <div
        ref={mapRef}
        className="w-full h-full rounded-lg"
        style={{ minHeight: '200px' }}
        role="img"
        aria-label="Mapa interactivo con ubicaciones de servicios"
      />
    </div>
  );
};

export default MapWidget;
