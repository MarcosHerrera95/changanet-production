/**
 * PasswordStrengthMeter - Componente para mostrar el nivel de fortaleza de contraseñas
 * Proporciona feedback visual en tiempo real para mejorar la seguridad
 */

import React from 'react';

const PasswordStrengthMeter = ({ password, showDetails = true }) => {
  // Validación de contraseña (igual que la del backend)
  const validatePassword = (password) => {
    const feedback = {
      score: 0,
      label: '',
      color: '',
      bgColor: '',
      suggestions: [],
      warnings: []
    };

    if (!password) {
      feedback.label = 'Escribe una contraseña';
      feedback.color = 'text-gray-400';
      feedback.bgColor = 'bg-gray-200';
      return feedback;
    }

    // Validación básica de longitud
    if (password.length < 8) {
      feedback.warnings.push('Debe tener al menos 8 caracteres');
    }

    if (password.length < 6) {
      feedback.label = 'Muy débil';
      feedback.color = 'text-red-600';
      feedback.bgColor = 'bg-red-100';
      return feedback;
    }

    // Verificar presencia de diferentes tipos de caracteres
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasSpaces = /\s/.test(password);

    // Validaciones específicas
    if (hasSpaces) {
      feedback.warnings.push('No debe contener espacios');
    }

    // Detectar contraseñas comunes
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey',
      'dragon', 'master', 'sunshine', 'flower', 'iloveyou'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      feedback.warnings.push('Contraseña muy común');
    }

    // Verificar patrones comunes
    const patterns = [
      /(.)\1{2,}/, // Caracteres repetidos 3+ veces
      /\d{4,}/, // 4+ dígitos consecutivos
      /[a-zA-Z]{4,}/ // 4+ letras consecutivas
    ];

    patterns.forEach((pattern, index) => {
      if (pattern.test(password)) {
        switch (index) {
          case 0:
            feedback.warnings.push('Evita caracteres repetidos');
            break;
          case 1:
            feedback.warnings.push('Evita secuencias numéricas');
            break;
          case 2:
            feedback.warnings.push('Evita secuencias de letras');
            break;
        }
      }
    });

    // Calcular puntuación
    let score = 0;

    // Longitud (máximo 40 puntos)
    if (password.length >= 8) score += 10;
    if (password.length >= 10) score += 10;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // Variedad de caracteres (máximo 40 puntos)
    if (hasLowerCase) score += 10;
    if (hasUpperCase) score += 10;
    if (hasNumbers) score += 10;
    if (hasSpecialChars) score += 10;

    // Complejidad adicional (máximo 20 puntos)
    if (password.length >= 12 && hasLowerCase && hasUpperCase && hasNumbers && hasSpecialChars) {
      score += 20;
    }

    feedback.score = Math.min(score, 100);

    // Determinar nivel de fortaleza
    if (score < 30) {
      feedback.label = 'Muy débil';
      feedback.color = 'text-red-600';
      feedback.bgColor = 'bg-red-100';
      feedback.suggestions.push('Usa al menos 8 caracteres');
      feedback.suggestions.push('Agrega números y símbolos');
    } else if (score < 50) {
      feedback.label = 'Débil';
      feedback.color = 'text-orange-600';
      feedback.bgColor = 'bg-orange-100';
      feedback.suggestions.push('Aumenta la longitud');
      if (!hasSpecialChars) {
        feedback.suggestions.push('Agrega símbolos especiales');
      }
    } else if (score < 70) {
      feedback.label = 'Regular';
      feedback.color = 'text-yellow-600';
      feedback.bgColor = 'bg-yellow-100';
      feedback.suggestions.push('Considera una passphrase más larga');
    } else if (score < 85) {
      feedback.label = 'Buena';
      feedback.color = 'text-blue-600';
      feedback.bgColor = 'bg-blue-100';
      feedback.suggestions.push('¡Muy bien! Es segura');
    } else {
      feedback.label = 'Excelente';
      feedback.color = 'text-green-600';
      feedback.bgColor = 'bg-green-100';
      feedback.suggestions.push('¡Contraseña muy segura!');
    }

    return feedback;
  };

  const validation = validatePassword(password);

  return (
    <div className="space-y-2">
      {/* Barra de fortaleza */}
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${
            validation.score < 30
              ? 'bg-red-500'
              : validation.score < 50
              ? 'bg-orange-500'
              : validation.score < 70
              ? 'bg-yellow-500'
              : validation.score < 85
              ? 'bg-blue-500'
              : 'bg-green-500'
          }`}
          style={{ width: `${validation.score}%` }}
        ></div>
      </div>

      {/* Indicador de nivel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${validation.bgColor} ${
              validation.score > 0 ? 'animate-pulse' : ''
            }`}
          ></div>
          <span className={`text-sm font-medium ${validation.color}`}>
            {validation.label}
          </span>
        </div>
        
        {validation.score > 0 && (
          <span className="text-xs text-gray-500">
            {validation.score}/100
          </span>
        )}
      </div>

      {/* Detalles de feedback */}
      {showDetails && password && (
        <div className="space-y-2 text-xs">
          {/* Advertencias */}
          {validation.warnings.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-2">
              <div className="flex items-center mb-1">
                <span className="text-red-500 mr-1">⚠️</span>
                <span className="text-red-700 font-medium">Advertencias:</span>
              </div>
              <ul className="text-red-600 space-y-1">
                {validation.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-1">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sugerencias */}
          {validation.suggestions.length > 0 && validation.score < 85 && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2">
              <div className="flex items-center mb-1">
                <span className="text-blue-500 mr-1">💡</span>
                <span className="text-blue-700 font-medium">Sugerencias:</span>
              </div>
              <ul className="text-blue-600 space-y-1">
                {validation.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-1">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Éxito */}
          {validation.score >= 85 && (
            <div className="bg-green-50 border border-green-200 rounded p-2">
              <div className="flex items-center">
                <span className="text-green-500 mr-1">✅</span>
                <span className="text-green-700 font-medium">
                  ¡Excelente! Tu contraseña es muy segura
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
