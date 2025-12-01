/**
 * Componente de Tutorial Guiado para Primeros Usuarios
 * Guía a los nuevos usuarios a través de las funcionalidades principales
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const OnboardingTutorial = ({ onComplete }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const steps = [
    {
      title: "¡Bienvenido a Changánet! 🎉",
      content: "Tu plataforma de triple impacto para conectar profesionales y clientes. Vamos a mostrarte cómo funciona.",
      action: "Comenzar",
      highlight: null
    },
    {
      title: "Busca Profesionales",
      content: "Encuentra electricistas, plomeros, pintores y más. Usa la barra de búsqueda para filtrar por especialidad y zona.",
      action: "Ir a Buscar",
      highlight: ".search-bar",
      navigateTo: "/profesionales"
    },
    {
      title: "Contacta Profesionales",
      content: "En el perfil de cada profesional puedes solicitar presupuestos o chatear directamente para coordinar servicios.",
      action: "Ver Ejemplo",
      highlight: ".professional-card",
      navigateTo: "/profesionales"
    },
    {
      title: "Gestiona tus Servicios",
      content: "Desde tu cuenta puedes ver cotizaciones, agendar servicios y hacer seguimiento de tus trabajos.",
      action: "Ver Mi Cuenta",
      highlight: "[data-tutorial='mi-cuenta']",
      navigateTo: "/mi-cuenta"
    },
    {
      title: "¡Todo Listo! 🚀",
      content: "Ya conoces lo básico. Recuerda que Changánet garantiza pagos seguros y contribuye al triple impacto positivo.",
      action: "Comenzar a Usar",
      highlight: null
    }
  ];

  const currentStepData = steps[currentStep];

  useEffect(() => {
    // Marcar elementos destacados
    if (currentStepData.highlight) {
      const element = document.querySelector(currentStepData.highlight);
      if (element) {
        element.classList.add('tutorial-highlight');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return () => {
      // Limpiar highlights anteriores
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
      });
    };
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);

      // Navegar si es necesario
      if (currentStepData.navigateTo) {
        setTimeout(() => {
          navigate(currentStepData.navigateTo);
        }, 300);
      }
    } else {
      // Tutorial completado
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem('tutorial_completed', 'true');

    if (onComplete) {
      onComplete();
    }
  };

  // No mostrar si ya se completó el tutorial
  if (!isVisible || localStorage.getItem('tutorial_completed')) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full relative overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200">
          <div
            className="h-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Step Indicator */}
          <div className="flex justify-center mb-6">
            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                    index <= currentStep ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Icon */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {currentStep === 0 && <span className="text-2xl">🎉</span>}
              {currentStep === 1 && <span className="text-2xl">🔍</span>}
              {currentStep === 2 && <span className="text-2xl">💬</span>}
              {currentStep === 3 && <span className="text-2xl">📋</span>}
              {currentStep === 4 && <span className="text-2xl">🚀</span>}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
            {currentStepData.title}
          </h2>

          {/* Content */}
          <p className="text-gray-600 text-center leading-relaxed mb-8">
            {currentStepData.content}
          </p>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Omitir tutorial
            </button>

            <button
              onClick={handleNext}
              className="bg-emerald-500 text-white px-6 py-3 rounded-xl hover:bg-emerald-600 transition-colors duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {currentStepData.action}
            </button>
          </div>
        </div>
      </div>

      {/* Tutorial Highlight Styles */}
      <style jsx>{`
        .tutorial-highlight {
          position: relative;
          z-index: 10;
        }

        .tutorial-highlight::before {
          content: '';
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          background: linear-gradient(45deg, #E30613, #DC3545, #C9050F);
          border-radius: 12px;
          z-index: -1;
          animation: pulse 2s infinite;
        }

        .tutorial-highlight::after {
          content: '👆 ¡Mira aquí!';
          position: absolute;
          top: -40px;
          left: 50%;
          transform: translateX(-50%);
          background: #E30613;
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: bold;
          white-space: nowrap;
          z-index: 20;
        }

        .tutorial-highlight::after::before {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 6px solid transparent;
          border-top-color: #E30613;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
};

export default OnboardingTutorial;
