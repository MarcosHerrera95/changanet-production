/**
 * @component MedalsList - Lista de medallas activas con tooltips explicativos
 * @descripción Muestra medallas obtenidas por logros del profesional con información detallada
 * @sprint Sprint 3 – Verificación de Identidad y Reputación
 * @tarjeta Implementar Sistema de Medallas y Logros
 * @impacto Motivación: Incentiva a profesionales a mantener altos estándares
 */

import { useState, useEffect } from 'react';
import { reputationAPI } from '../services/apiService';
import { useApiState } from '../hooks/useApi';

const MedalsList = ({ professionalId, limit = null, showEmpty = true }) => {
  const [medals, setMedals] = useState([]);
  const { execute: loadMedals, loading } = useApiState();

  useEffect(() => {
    const fetchMedals = async () => {
      try {
        let data;
        if (professionalId) {
          // Cargar medallas de un profesional específico
          const profileData = await loadMedals(() => reputationAPI.getProfile());
          data = profileData.medals || [];
        } else {
          // Cargar todas las medallas disponibles
          data = await loadMedals(() => reputationAPI.getMedals());
        }
        setMedals(data);
      } catch (error) {
        console.error('Error loading medals:', error);
      }
    };

    fetchMedals();
  }, [professionalId, loadMedals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600">Cargando medallas...</span>
      </div>
    );
  }

  const displayedMedals = limit ? medals.slice(0, limit) : medals;
  const hasMore = limit && medals.length > limit;

  if (displayedMedals.length === 0 && showEmpty) {
    return (
      <div className="text-center py-6">
        <div className="text-3xl mb-2">🏆</div>
        <p className="text-gray-500 text-sm">Aún no hay medallas obtenidas</p>
        <p className="text-gray-400 text-xs mt-1">Completa más servicios para ganar medallas</p>
      </div>
    );
  }

  const getMedalIcon = (medal) => {
    // Iconos basados en el tipo de medalla
    const icons = {
      verification: '✅',
      reviews: '⭐',
      services: '🔧',
      rating: '👑',
      experience: '🎯',
      reliability: '🛡️',
      speed: '⚡',
      quality: '💎',
      default: '🏅'
    };
    return icons[medal.type] || icons.default;
  };

  const getMedalColor = (medal) => {
    const colors = {
      gold: 'from-yellow-400 to-yellow-600',
      silver: 'from-gray-300 to-gray-500',
      bronze: 'from-orange-400 to-orange-600',
      platinum: 'from-purple-400 to-purple-600',
      diamond: 'from-blue-400 to-blue-600',
      default: 'from-gray-400 to-gray-600'
    };
    return colors[medal.rarity] || colors.default;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {displayedMedals.map((medal, index) => (
          <MedalItem
            key={medal.id || index}
            medal={medal}
            getMedalIcon={getMedalIcon}
            getMedalColor={getMedalColor}
          />
        ))}

        {hasMore && (
          <div className="group relative inline-flex items-center justify-center w-12 h-12 bg-gray-200 rounded-full shadow-sm cursor-help">
            <span className="text-sm font-bold text-gray-600">+{medals.length - limit}</span>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
              {medals.length - limit} medallas más
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        )}
      </div>

      {displayedMedals.length > 0 && (
        <p className="text-xs text-gray-500 text-center">
          {medals.length} {medals.length === 1 ? 'medalla obtenida' : 'medallas obtenidas'}
        </p>
      )}
    </div>
  );
};

const MedalItem = ({ medal, getMedalIcon, getMedalColor }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="group relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br ${getMedalColor(medal)} rounded-full shadow-md cursor-help transform transition-transform group-hover:scale-110`}>
        <span className="text-lg" role="img" aria-label={medal.name}>
          {getMedalIcon(medal)}
        </span>
      </div>

      {/* Tooltip */}
      <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg transition-opacity duration-200 whitespace-nowrap z-10 ${showTooltip ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="font-semibold">{medal.name}</div>
        <div className="text-gray-300 mt-1">{medal.description}</div>
        {medal.obtainedAt && (
          <div className="text-gray-400 mt-1">
            Obtenida: {new Date(medal.obtainedAt).toLocaleDateString('es-ES')}
          </div>
        )}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
};

// Funciones auxiliares para medallas
const getMedalIcon = (medal) => {
  const icons = {
    verification: '✅',
    reviews: '⭐',
    services: '🔧',
    rating: '👑',
    experience: '🎯',
    reliability: '🛡️',
    speed: '⚡',
    quality: '💎',
    default: '🏅'
  };
  return icons[medal.type] || icons.default;
};

const getMedalColor = (medal) => {
  const colors = {
    gold: 'from-yellow-400 to-yellow-600',
    silver: 'from-gray-300 to-gray-500',
    bronze: 'from-orange-400 to-orange-600',
    platinum: 'from-purple-400 to-purple-600',
    diamond: 'from-blue-400 to-blue-600',
    default: 'from-gray-400 to-gray-600'
  };
  return colors[medal.rarity] || colors.default;
};

// Componente para mostrar medallas en una cuadrícula con más detalles
export const MedalsGrid = ({ professionalId }) => {
  const [medals, setMedals] = useState([]);
  const { execute: loadMedals, loading } = useApiState();

  useEffect(() => {
    const fetchMedals = async () => {
      try {
        const data = await loadMedals(() => reputationAPI.getMedals());
        setMedals(data);
      } catch (error) {
        console.error('Error loading medals:', error);
      }
    };

    fetchMedals();
  }, [loadMedals]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="w-full h-24 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {medals.map((medal) => (
        <div
          key={medal.id}
          className={`p-4 rounded-lg border-2 transition-all ${
            medal.obtained
              ? 'border-yellow-300 bg-yellow-50'
              : 'border-gray-200 bg-gray-50'
          }`}
        >
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-gradient-to-br ${getMedalColor(medal)} rounded-full shadow-md`}>
              <span className="text-xl">{getMedalIcon(medal)}</span>
            </div>
            <h3 className={`font-semibold text-sm ${medal.obtained ? 'text-yellow-800' : 'text-gray-600'}`}>
              {medal.name}
            </h3>
            <p className="text-xs text-gray-500 mt-1">{medal.description}</p>
            {medal.progress && (
              <div className="mt-2">
                <div className="text-xs text-gray-600 mb-1">
                  {medal.progress.current}/{medal.progress.target}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className="bg-yellow-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${(medal.progress.current / medal.progress.target) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MedalsList;
