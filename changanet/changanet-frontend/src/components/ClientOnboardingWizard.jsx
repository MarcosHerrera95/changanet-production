/**
 * @component ClientOnboardingWizard - Asistente de onboarding para nuevos clientes
 * @descripción Guía paso a paso para que los clientes entiendan y utilicen la plataforma
 * @funcionalidad REQ-01 a REQ-05: Registro y navegación inicial
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ClientOnboardingWizard = ({ onComplete }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const steps = [
    {
      id: 'welcome',
      title: '¡Bienvenido a Changánet!',
      description: 'Tu plataforma de confianza para encontrar profesionales calificados',
      icon: '👋',
      content: (
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">🏠</div>
          <p className="text-lg text-gray-600">
            Conectamos a personas como tú con profesionales verificados para servicios técnicos urbanos.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">¿Qué puedes hacer?</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Buscar profesionales por especialidad y ubicación</li>
              <li>• Solicitar presupuestos personalizados</li>
              <li>• Leer reseñas y calificaciones verificadas</li>
              <li>• Pagar de forma segura con custodia de fondos</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'profile',
      title: 'Completa tu Perfil',
      description: 'Ayúdanos a personalizar tu experiencia',
      icon: '👤',
      content: (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">📝</div>
            <p className="text-gray-600">
              Un perfil completo nos ayuda a encontrar los mejores profesionales para ti.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Información Básica</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Nombre completo</li>
                <li>• Correo electrónico</li>
                <li>• Número de teléfono</li>
              </ul>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Preferencias</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Dirección habitual</li>
                <li>• Tipo de servicios preferidos</li>
                <li>• Horarios de preferencia</li>
              </ul>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <div className="flex items-start">
              <span className="text-yellow-500 mr-2">💡</span>
              <div>
                <h4 className="font-semibold text-yellow-800">Consejo</h4>
                <p className="text-sm text-yellow-700">
                  Los profesionales verificados tienen prioridad en las búsquedas. ¡Completa tu perfil para mejores resultados!
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      action: () => navigate('/cliente/perfil')
    },
    {
      id: 'dashboard',
      title: 'Tu Dashboard Personal',
      description: 'Gestiona todos tus servicios desde un solo lugar',
      icon: '📊',
      content: (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-gray-600">
              Tu dashboard es el centro de control de todos tus servicios en Changánet.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">📋 Servicios</h4>
              <p className="text-sm text-blue-700">
                Visualiza todos tus servicios contratados, pendientes y completados.
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">💰 Cotizaciones</h4>
              <p className="text-sm text-green-700">
                Gestiona tus solicitudes de presupuesto y respuestas de profesionales.
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">⭐ Reseñas</h4>
              <p className="text-sm text-purple-700">
                Ve todas las reseñas que has escrito y tu impacto en la comunidad.
              </p>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="font-semibold text-orange-800 mb-2">💳 Pagos</h4>
              <p className="text-sm text-orange-700">
                Controla tus transacciones seguras con custodia de fondos.
              </p>
            </div>
          </div>
        </div>
      ),
      action: () => navigate('/cliente/dashboard')
    },
    {
      id: 'search',
      title: 'Busca Profesionales',
      description: 'Encuentra el profesional perfecto para tu necesidad',
      icon: '🔍',
      content: (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔧</div>
            <p className="text-gray-600">
              Nuestra plataforma cuenta con miles de profesionales verificados listos para ayudarte.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl mb-2">🏠</div>
              <h4 className="font-semibold">Plomería</h4>
              <p className="text-sm text-gray-600">Reparaciones y instalaciones</p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl mb-2">⚡</div>
              <h4 className="font-semibold">Electricidad</h4>
              <p className="text-sm text-gray-600">Instalaciones y reparaciones</p>
            </div>

            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl mb-2">🔨</div>
              <h4 className="font-semibold">Albañilería</h4>
              <p className="text-sm text-gray-600">Construcción y reformas</p>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
            <h4 className="font-semibold text-emerald-800 mb-2">Filtros Disponibles</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded">⭐ Calificación</span>
              <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded">📍 Ubicación</span>
              <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded">💰 Precio</span>
              <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded">✅ Verificado</span>
            </div>
          </div>
        </div>
      ),
      action: () => navigate('/profesionales')
    },
    {
      id: 'quotes',
      title: 'Solicita Presupuestos',
      description: 'Obtén cotizaciones personalizadas de múltiples profesionales',
      icon: '💰',
      content: (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-gray-600">
              Describe tu proyecto y recibe presupuestos detallados de profesionales interesados.
            </p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold text-purple-800 mb-2">¿Cómo funciona?</h4>
            <div className="space-y-3 text-sm text-purple-700">
              <div className="flex items-start">
                <span className="bg-purple-200 text-purple-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                <div>
                  <strong>Describe tu necesidad</strong>
                  <p>Explica detalladamente qué necesitas, incluyendo fotos si es posible</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="bg-purple-200 text-purple-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                <div>
                  <strong>Selecciona profesionales</strong>
                  <p>Elige a los profesionales que más te interesen</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="bg-purple-200 text-purple-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                <div>
                  <strong>Recibe cotizaciones</strong>
                  <p>Compara ofertas y elige la mejor opción</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <div className="flex items-center">
              <span className="text-green-500 mr-3">🛡️</span>
              <div>
                <h4 className="font-semibold text-green-800">Pago Seguro</h4>
                <p className="text-sm text-green-700">
                  Los fondos quedan en custodia hasta que confirmes que el servicio fue completado satisfactoriamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      action: () => navigate('/cliente/cotizaciones')
    },
    {
      id: 'reviews',
      title: 'Sistema de Reseñas',
      description: 'Lee opiniones verificadas y deja tus comentarios',
      icon: '⭐',
      content: (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">📝</div>
            <p className="text-gray-600">
              Las reseñas ayudan a otros clientes a tomar decisiones informadas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">⭐ Calificación por Estrellas</h4>
              <p className="text-sm text-yellow-700">
                Califica del 1 al 5 estrellas basado en tu experiencia general.
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">📝 Comentarios Detallados</h4>
              <p className="text-sm text-blue-700">
                Describe tu experiencia, aspectos positivos y áreas de mejora.
              </p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <div className="flex items-start">
              <span className="text-red-500 mr-2">⚠️</span>
              <div>
                <h4 className="font-semibold text-red-800">Importante</h4>
                <p className="text-sm text-red-700">
                  Solo puedes dejar reseñas después de que el servicio haya sido completado. Esto asegura opiniones honestas y útiles.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      action: () => navigate('/cliente/resenas')
    },
    {
      id: 'complete',
      title: '¡Listo para Empezar!',
      description: 'Ya conoces lo básico, ¡comienza a usar Changánet!',
      icon: '🚀',
      content: (
        <div className="text-center space-y-6">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-gray-800">¡Felicitaciones!</h3>
          <p className="text-lg text-gray-600">
            Ya conoces todo lo necesario para usar Changánet de manera efectiva.
          </p>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-4">Próximos Pasos</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl mb-2">🔍</div>
                <p>Busca el servicio que necesitas</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">💬</div>
                <p>Contacta a profesionales verificados</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">⭐</div>
                <p>Deja reseñas después de los servicios</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <div className="flex items-center justify-center">
              <span className="text-green-500 mr-3">💡</span>
              <p className="text-green-700">
                <strong>¿Necesitas ayuda?</strong> Nuestro soporte está disponible 24/7 para resolver tus dudas.
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, steps[currentStep].id]));
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      setCompletedSteps(prev => new Set([...prev, steps[currentStep].id]));
      if (onComplete) {
        onComplete();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (onComplete) {
      onComplete();
    }
  };

  const handleStepAction = () => {
    const step = steps[currentStep];
    if (step.action) {
      step.action();
    }
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-3xl mr-4">{currentStepData.icon}</span>
              <div>
                <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
                <p className="text-blue-100">{currentStepData.description}</p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="text-blue-100 hover:text-white text-sm underline"
            >
              Omitir tutorial
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-blue-100 mb-2">
              <span>Paso {currentStep + 1} de {steps.length}</span>
              <span>{Math.round(progress)}% completado</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[60vh]">
          {currentStepData.content}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-6 flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Anterior
          </button>

          <div className="flex space-x-3">
            {currentStepData.action && (
              <button
                onClick={handleStepAction}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Ir a {currentStepData.title.toLowerCase()}
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-semibold"
            >
              {currentStep === steps.length - 1 ? '¡Comenzar!' : 'Siguiente →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientOnboardingWizard;
