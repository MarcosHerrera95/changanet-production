// src/components/ProfessionalCard.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../hooks/useFavorites';
import QuoteRequestModal from './modals/QuoteRequestModal';
import ProfessionalDetailModal from './modals/ProfessionalDetailModal';
import VerifiedBadge from './VerifiedBadge';
import RatingDisplay from './RatingDisplay';
import { getDistanceMatrix, getSimulatedCoordinates, calculateHaversineDistance } from '../services/mapService';

const ProfessionalCard = ({
  professional,
  isSelected = false,
  onSelect,
  showSelection = false,
  showRelevanceScore = false,
  relevanceScore = 0
}) => {
  console.log('🎨 ProfessionalCard - Received professional:', professional);
  console.log('🎨 ProfessionalCard - usuario_id:', professional?.usuario_id);

  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [distance, setDistance] = useState('Calculando...');
  const [loading, setLoading] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const distanceCalculatedRef = useRef(false);

  // Si ya viene la distancia calculada desde el hook, usarla
  useEffect(() => {
    if (professional.distancia_calculada !== undefined) {
      setDistance(`${professional.distancia_calculada} km`);
      setLoading(false);
      distanceCalculatedRef.current = true;
    }
  }, [professional.distancia_calculada]);

  const handleQuoteRequest = () => {
    if (!user) {
      alert('Debes iniciar sesión para solicitar un presupuesto.');
      return;
    }
    setShowQuoteModal(true);
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      alert('Debes iniciar sesión para agregar a favoritos.');
      return;
    }
    if (user.rol !== 'cliente') {
      alert('Solo los clientes pueden agregar profesionales a favoritos.');
      return;
    }

    setFavoriteLoading(true);
    try {
      const success = await toggleFavorite(professional.usuario_id);
      if (success) {
        // Feedback visual ya se maneja en el hook
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setFavoriteLoading(false);
    }
  };

  // Calcular distancia usando Google Maps API o fallback
  const calculateDistance = useCallback(async () => {
    if (!professional?.zona_cobertura) return;

    setLoading(true);
    try {
      // Intentar obtener ubicación del usuario
      let clientLat, clientLon;

      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 10000,
              enableHighAccuracy: false
            });
          });
          clientLat = position.coords.latitude;
          clientLon = position.coords.longitude;
        } catch {
          console.warn('Geolocalización no disponible, usando Buenos Aires por defecto');
          // Fallback: Buenos Aires
          clientLat = -34.6037;
          clientLon = -58.3816;
        }
      } else {
        // Fallback: Buenos Aires
        clientLat = -34.6037;
        clientLon = -58.3816;
      }

      // Obtener coordenadas del profesional
      const profCoords = getSimulatedCoordinates(professional.zona_cobertura);

      // Verificar si tenemos API key de Google Maps
      const hasGoogleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

      if (hasGoogleMapsKey) {
        // Intentar usar Google Distance Matrix API
        try {
          const result = await getDistanceMatrix(
            { lat: clientLat, lng: clientLon },
            { lat: profCoords.lat, lng: profCoords.lng }
          );

          // Mostrar distancia y duración si están disponibles
          let distanceText = '';
          if (result.distance) {
            distanceText = result.distance.text;
          }
          if (result.duration) {
            distanceText += distanceText ? ` (${result.duration.text})` : result.duration.text;
          }
          if (distanceText) {
            setDistance(distanceText);
          } else {
            throw new Error('No distance data available');
          }
        } catch {
          // Google Maps no disponible, usar cálculo alternativo
          const dist = calculateHaversineDistance(clientLat, clientLon, profCoords.lat, profCoords.lng);
          setDistance(`${dist.toFixed(1)} km (aprox.)`);
        }
      } else {
        // No hay API key, usar cálculo alternativo directamente
        const dist = calculateHaversineDistance(clientLat, clientLon, profCoords.lat, profCoords.lng);
        setDistance(`${dist.toFixed(1)} km (aprox.)`);
      }
    } catch (error) {
      console.error('Error calculando distancia:', error);
      setDistance('Distancia no disponible');
    } finally {
      setLoading(false);
    }
  }, [professional?.zona_cobertura]);

  useEffect(() => {
    if (distanceCalculatedRef.current) return;
    distanceCalculatedRef.current = true;
    calculateDistance();
  }, [calculateDistance]);

  // Validación de datos del profesional
  if (!professional || !professional.usuario_id) {
    console.error('ProfessionalCard: professional data is missing or invalid', professional);
    return (
      <div className="professional-card card-glow p-8 rounded-3xl bg-red-50 border-2 border-red-200">
        <p className="text-red-600 font-semibold">Error: Datos del profesional no disponibles</p>
      </div>
    );
  }

  // Extraer datos con valores por defecto
  const nombreProfesional = professional.usuario?.nombre || 'Profesional';
  const fotoPerfilOriginal = professional.usuario?.url_foto_perfil;
  const fotoPerfilFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombreProfesional)}&size=120&background=random&color=fff&format=png`;

  return (
    <div className={`professional-card card-glow p-6 rounded-2xl overflow-hidden group hover-lift relative bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 ${isSelected ? 'ring-2 ring-emerald-400 bg-emerald-50/30' : ''}`}>
      {/* Selection checkbox - top left corner */}
      {showSelection && user && user.rol === 'cliente' && (
        <div className="absolute top-3 left-3 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect && onSelect(professional.usuario_id)}
            className="w-4 h-4 text-emerald-600 bg-white border-2 border-gray-300 rounded focus:ring-emerald-500 focus:ring-1"
          />
        </div>
      )}

      {/* Favorite button - top right corner */}
      {user && user.rol === 'cliente' && (
        <button
          onClick={handleToggleFavorite}
          disabled={favoriteLoading}
          className={`absolute top-3 right-3 z-10 p-1.5 rounded-full transition-all duration-300 ${
            isFavorite(professional.usuario_id)
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-red-500'
          } disabled:opacity-50`}
          aria-label={
            isFavorite(professional.usuario_id)
              ? 'Remover de favoritos'
              : 'Agregar a favoritos'
          }
        >
          {favoriteLoading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg
              className={`w-4 h-4 ${isFavorite(professional.usuario_id) ? 'fill-current' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          )}
        </button>
      )}

      <div className="flex gap-4">
        {/* Profile Image */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-100">
            <img
              src={fotoPerfilOriginal || fotoPerfilFallback}
              alt={`Foto de perfil de ${nombreProfesional}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = fotoPerfilFallback;
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                  {nombreProfesional}
                </h3>
                {professional.estado_verificacion === 'verificado' && (
                  <VerifiedBadge size="xs" />
                )}
              </div>
              <p className="text-emerald-600 font-medium text-sm mb-1">{professional.especialidad}</p>
              <div className="flex items-center text-gray-500 text-xs mb-2">
                <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{professional.zona_cobertura}</span>
              </div>
            </div>
            <div className="text-right ml-2">
              <RatingDisplay
                rating={professional.calificacion_promedio || 0}
                size="xs"
                showLabel={false}
              />
              {showRelevanceScore && relevanceScore > 0 && (
                <div className="relevance-score">
                  <small className="text-gray-500">
                    {Math.round(relevanceScore * 100)}% relevante
                  </small>
                </div>
              )}
            </div>
          </div>

          {/* Price and badges */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold text-emerald-600">
                ${professional.tarifa_hora}
                <span className="text-xs text-gray-500 font-normal">/h</span>
              </span>
              {loading ? (
                <span className="text-xs text-gray-400">Calculando...</span>
              ) : distance && (
                <span className="text-xs text-gray-400">{distance}</span>
              )}
            </div>

            <div className="flex gap-1">
              {professional.estado_verificacion === 'verificado' && (
                <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium">
                  ✓
                </span>
              )}
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                ⚡
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowDetailModal(true)}
              className="flex-1 bg-gray-50 text-gray-700 hover:bg-gray-100 font-medium transition-all duration-200 flex items-center justify-center text-xs px-3 py-2 rounded-lg hover:shadow-sm min-h-[32px] border border-gray-200"
              aria-label={`Ver perfil completo de ${professional.usuario.nombre}`}
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Ver Perfil
            </button>
            <button
              onClick={handleQuoteRequest}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-2 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-200 font-medium text-xs flex items-center justify-center min-h-[32px] shadow-sm"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Presupuesto
            </button>
          </div>
        </div>
      </div>

      <QuoteRequestModal
        isOpen={showQuoteModal}
        onClose={() => setShowQuoteModal(false)}
        professionalId={professional.usuario_id}
        professionalName={professional.usuario.nombre}
      />

      <ProfessionalDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        professional={professional}
      />
    </div>
  );
};

export default ProfessionalCard;
