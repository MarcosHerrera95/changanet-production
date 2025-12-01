/**
 * Hook personalizado para manejar el onboarding interactivo
 * Utiliza driver.js para guiar a los usuarios nuevos
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export const useOnboarding = () => {
  const { user } = useAuth();
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);

  // Verificar si el usuario ya completó el onboarding
  const hasCompletedOnboarding = (role) => {
    const key = role === 'profesional' ? 'professional-onboarding-done' : 'client-onboarding-done';
    return localStorage.getItem(key) === 'true';
  };

  // Marcar onboarding como completado
  const markOnboardingComplete = (role) => {
    const key = role === 'profesional' ? 'professional-onboarding-done' : 'client-onboarding-done';
    localStorage.setItem(key, 'true');
  };

  // Configuración del onboarding para clientes
  const getClientSteps = () => [
    {
      element: '#search-bar',
      popover: {
        title: '🔍 Busca servicios',
        description: 'Escribe un servicio como "plomero" o "electricista" para encontrar profesionales cerca de ti.',
        side: 'bottom',
        align: 'start'
      }
    },
    {
      element: '#location-filter',
      popover: {
        title: '📍 Filtra por ubicación',
        description: 'Selecciona tu barrio para ver solo profesionales disponibles en tu zona.',
        side: 'bottom',
        align: 'start'
      }
    },
    {
      element: '#price-filter',
      popover: {
        title: '💰 Ordena por precio',
        description: 'Ordena los resultados por precio para encontrar la mejor opción para tu presupuesto.',
        side: 'bottom',
        align: 'start'
      }
    },
    {
      element: '#quote-button',
      popover: {
        title: '📝 Solicita presupuesto',
        description: 'Haz clic aquí para contactar al profesional y solicitar un presupuesto personalizado.',
        side: 'top',
        align: 'center'
      }
    },
    {
      element: '#chat-widget',
      popover: {
        title: '💬 Comunicación segura',
        description: 'Aquí gestionarás toda la comunicación con los profesionales sin compartir tu número de teléfono.',
        side: 'left',
        align: 'center'
      }
    }
  ];

  // Configuración del onboarding para profesionales
  const getProfessionalSteps = () => [
    {
      element: '#profile-completion',
      popover: {
        title: '👤 Completa tu perfil',
        description: 'Agrega fotos de tu trabajo, descripción de servicios y experiencia para aparecer en más búsquedas.',
        side: 'bottom',
        align: 'start'
      }
    },
    {
      element: '#availability-calendar',
      popover: {
        title: '📅 Configura tu agenda',
        description: 'Marca los días y horarios en que estás disponible para trabajar. Los clientes solo te verán cuando estés libre.',
        side: 'bottom',
        align: 'start'
      }
    },
    {
      element: '#quotes-section',
      popover: {
        title: '📋 Gestiona cotizaciones',
        description: 'Aquí recibirás las solicitudes de presupuesto de los clientes. Responde rápidamente para ganar más trabajo.',
        side: 'top',
        align: 'center'
      }
    },
    {
      element: '#verification-badge',
      popover: {
        title: '✅ Verificación de identidad',
        description: 'Sube tu DNI o documento de identidad para obtener la insignia "Verificado" y generar más confianza.',
        side: 'left',
        align: 'center'
      }
    }
  ];

  // Iniciar onboarding
  const startOnboarding = (role) => {
    if (!user || hasCompletedOnboarding(role)) {
      return;
    }

    const steps = role === 'profesional' ? getProfessionalSteps() : getClientSteps();

    const driverObj = driver({
      showProgress: true,
      steps: steps.map(step => ({
        ...step,
        popover: {
          ...step.popover,
          onNextClick: () => {
            driverObj.moveNext();
          },
          onPrevClick: () => {
            driverObj.movePrevious();
          },
          onCloseClick: () => {
            driverObj.destroy();
            markOnboardingComplete(role);
            setIsOnboardingActive(false);
          }
        }
      })),
      onDestroyed: () => {
        markOnboardingComplete(role);
        setIsOnboardingActive(false);
      },
      onHighlightStarted: () => {
        setIsOnboardingActive(true);
      }
    });

    // Esperar a que los elementos estén disponibles
    setTimeout(() => {
      driverObj.drive();
    }, 1000);
  };

  // Hook para iniciar onboarding automáticamente
  useEffect(() => {
    if (user && user.rol) {
      const role = user.rol === 'cliente' ? 'cliente' : 'profesional';
      if (!hasCompletedOnboarding(role)) {
        // Pequeño delay para asegurar que el DOM esté listo
        const timer = setTimeout(() => {
          startOnboarding(role);
        }, 1500);

        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  return {
    startOnboarding,
    isOnboardingActive,
    hasCompletedOnboarding: (role) => hasCompletedOnboarding(role)
  };
};
