/**
 * @component VerificationBadge - Insignia de Verificación
 * @descripción Muestra insignia "Verificado" para profesionales validados (REQ-37)
 * @sprint Sprint 3 – Verificación de Identidad y Reputación
 * @tarjeta Tarjeta 9: [Frontend] Implementar Insignias de Verificación y Reputación
 * @impacto Confianza: Aumenta la confianza del cliente al ver profesionales verificados
 */

import React from 'react';

const VerificationBadge = ({ 
  isVerified = false, 
  size = 'medium',
  showText = true,
  className = '',
  verificationStatus = null,
  reputationScore = null,
  achievements = []
}) => {
  if (!isVerified) return null;

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6'
  };

  const textSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      {/* Insignia de Verificación */}
      <div className="inline-flex items-center space-x-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-2 py-1 rounded-full shadow-sm">
        <svg 
          className={`${sizeClasses[size]} fill-current`} 
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        {showText && (
          <span className={`font-medium ${textSizeClasses[size]}`}>
            Verificado
          </span>
        )}
      </div>

      {/* Sistema de Reputación */}
      {reputationScore !== null && (
        <div className="ml-2 inline-flex items-center space-x-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full shadow-sm">
          <svg 
            className={`${sizeClasses[size]} fill-current`} 
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className={`font-medium ${textSizeClasses[size]}`}>
            {reputationScore.toFixed(1)}
          </span>
        </div>
      )}

      {/* Medallas por Logros */}
      {achievements && achievements.length > 0 && (
        <div className="ml-2 inline-flex space-x-1">
          {achievements.slice(0, 3).map((achievement, index) => (
            <div
              key={index}
              className="group relative inline-flex items-center justify-center"
              title={achievement.name}
            >
              <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-xs shadow-sm">
                {achievement.icon || achievement.name.charAt(0)}
              </div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                {achievement.name}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          ))}
          
          {achievements.length > 3 && (
            <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">
              +{achievements.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Estado de Verificación Personalizado */}
      {verificationStatus && verificationStatus !== 'verificado' && (
        <div className="ml-2 inline-flex items-center space-x-1 bg-gray-500 text-white px-2 py-1 rounded-full shadow-sm">
          <svg 
            className={`${sizeClasses[size]} fill-current`} 
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className={`font-medium ${textSizeClasses[size]}`}>
            {verificationStatus}
          </span>
        </div>
      )}
    </div>
  );
};

// Componente para mostrar ranking de profesionales
const ProfessionalRanking = ({ 
  ranking = null, 
  totalProfessionals = null,
  categoryRank = null,
  size = 'medium' 
}) => {
  if (ranking === null) return null;

  const textSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm', 
    large: 'text-base'
  };

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6'
  };

  return (
    <div className={`inline-flex items-center space-x-1 ${textSizeClasses[size]} text-gray-600`}>
      <svg 
        className={`${sizeClasses[size]} text-yellow-500 fill-current`} 
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
      </svg>
      <span className="font-medium">
        #{ranking}
        {totalProfessionals && ` de ${totalProfessionals}`}
      </span>
      {categoryRank && (
        <span className="text-gray-500">
          en {categoryRank}
        </span>
      )}
    </div>
  );
};

// Componente principal que combina todas las insignias
const VerificationStatus = ({ 
  isVerified = false,
  verificationStatus = null,
  reputationScore = null,
  ranking = null,
  totalProfessionals = null,
  categoryRank = null,
  achievements = [],
  size = 'medium',
  showText = true,
  className = ''
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <VerificationBadge
        isVerified={isVerified}
        verificationStatus={verificationStatus}
        reputationScore={reputationScore}
        achievements={achievements}
        size={size}
        showText={showText}
      />
      
      <ProfessionalRanking
        ranking={ranking}
        totalProfessionals={totalProfessionals}
        categoryRank={categoryRank}
        size={size}
      />
    </div>
  );
};

export default VerificationStatus;
export { VerificationBadge, ProfessionalRanking, VerificationStatus };
