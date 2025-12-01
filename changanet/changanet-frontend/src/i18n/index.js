/**
 * Configuración de internacionalización (i18n) para Changánet
 * Soporte inicial para español, preparado para múltiples idiomas
 */

import { createContext, useContext, useState, useEffect } from 'react';

// Idiomas soportados
const SUPPORTED_LANGUAGES = {
  es: {
    code: 'es',
    name: 'Español',
    flag: '🇪🇸',
    direction: 'ltr'
  },
  en: {
    code: 'en',
    name: 'English',
    flag: '🇺🇸',
    direction: 'ltr'
  }
};

// Traducciones
const translations = {
  es: {
    // Navegación
    nav: {
      home: 'Inicio',
      professionals: 'Profesionales',
      services: 'Servicios',
      about: 'Nosotros',
      contact: 'Contacto',
      login: 'Iniciar Sesión',
      register: 'Registrarse',
      logout: 'Cerrar Sesión'
    },

    // Autenticación
    auth: {
      loginTitle: 'Iniciar Sesión',
      registerTitle: 'Crear Cuenta',
      email: 'Correo electrónico',
      password: 'Contraseña',
      confirmPassword: 'Confirmar contraseña',
      name: 'Nombre completo',
      loginButton: 'Iniciar Sesión',
      registerButton: 'Crear Cuenta',
      forgotPassword: '¿Olvidaste tu contraseña?',
      noAccount: '¿No tienes cuenta?',
      hasAccount: '¿Ya tienes cuenta?',
      loginWithGoogle: 'Continuar con Google',
      loginWithFacebook: 'Continuar con Facebook',
      or: 'o',
      terms: 'Acepto los términos y condiciones',
      privacy: 'Política de privacidad'
    },

    // Errores
    errors: {
      network: 'Error de conexión. Verifica tu internet.',
      server: 'Error del servidor. Inténtalo más tarde.',
      validation: 'Datos inválidos. Revisa los campos.',
      unauthorized: 'Sesión expirada. Inicia sesión nuevamente.',
      forbidden: 'No tienes permisos para esta acción.',
      notFound: 'Página no encontrada.',
      generic: 'Ha ocurrido un error inesperado.'
    },

    // Mensajes de éxito
    success: {
      login: '¡Bienvenido de vuelta!',
      register: '¡Cuenta creada exitosamente!',
      profileUpdated: 'Perfil actualizado correctamente.',
      messageSent: 'Mensaje enviado.',
      serviceRequested: 'Servicio solicitado correctamente.'
    },

    // Formularios
    forms: {
      required: 'Campo obligatorio',
      invalidEmail: 'Correo electrónico inválido',
      passwordTooShort: 'La contraseña debe tener al menos 6 caracteres',
      passwordsDontMatch: 'Las contraseñas no coinciden',
      save: 'Guardar',
      cancel: 'Cancelar',
      loading: 'Cargando...',
      sending: 'Enviando...'
    },

    // Servicios
    services: {
      title: 'Nuestros Servicios',
      search: 'Buscar servicios...',
      category: 'Categoría',
      location: 'Ubicación',
      price: 'Precio',
      availability: 'Disponibilidad',
      requestQuote: 'Solicitar Cotización',
      contact: 'Contactar',
      reviews: 'reseñas',
      rating: 'calificación'
    },

    // Profesionales
    professionals: {
      title: 'Profesionales Verificados',
      search: 'Buscar profesionales...',
      verified: 'Verificado',
      experience: 'años de experiencia',
      services: 'servicios completados',
      responseTime: 'Tiempo de respuesta',
      about: 'Acerca de',
      specialties: 'Especialidades',
      portfolio: 'Portafolio'
    },

    // Chat
    chat: {
      title: 'Mensajes',
      typeMessage: 'Escribe tu mensaje...',
      send: 'Enviar',
      online: 'En línea',
      offline: 'Desconectado',
      typing: 'escribiendo...',
      newMessage: 'Nuevo mensaje'
    },

    // Notificaciones
    notifications: {
      title: 'Notificaciones',
      markAsRead: 'Marcar como leída',
      markAllAsRead: 'Marcar todas como leídas',
      noNotifications: 'No hay notificaciones nuevas',
      newQuote: 'Nueva cotización recibida',
      messageReceived: 'Mensaje recibido',
      serviceCompleted: 'Servicio completado'
    },

    // Accesibilidad
    accessibility: {
      increaseFontSize: 'Aumentar tamaño de fuente',
      decreaseFontSize: 'Disminuir tamaño de fuente',
      resetFontSize: 'Restablecer tamaño de fuente',
      highContrast: 'Modo alto contraste',
      reducedMotion: 'Movimiento reducido',
      skipToContent: 'Saltar al contenido principal',
      screenReader: 'Lector de pantalla activado'
    },

    // Triple impacto
    impact: {
      social: 'Impacto Social',
      economic: 'Impacto Económico',
      environmental: 'Impacto Ambiental',
      jobsCreated: 'empleos creados',
      servicesProvided: 'servicios prestados',
      co2Saved: 'toneladas de CO₂ ahorradas'
    }
  },

  en: {
    // Navigation
    nav: {
      home: 'Home',
      professionals: 'Professionals',
      services: 'Services',
      about: 'About',
      contact: 'Contact',
      login: 'Login',
      register: 'Register',
      logout: 'Logout'
    },

    // Authentication
    auth: {
      loginTitle: 'Login',
      registerTitle: 'Create Account',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password',
      name: 'Full name',
      loginButton: 'Login',
      registerButton: 'Create Account',
      forgotPassword: 'Forgot password?',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      loginWithGoogle: 'Continue with Google',
      loginWithFacebook: 'Continue with Facebook',
      or: 'or',
      terms: 'I accept the terms and conditions',
      privacy: 'Privacy policy'
    },

    // Errors
    errors: {
      network: 'Connection error. Check your internet.',
      server: 'Server error. Try again later.',
      validation: 'Invalid data. Check the fields.',
      unauthorized: 'Session expired. Please login again.',
      forbidden: 'You do not have permission for this action.',
      notFound: 'Page not found.',
      generic: 'An unexpected error occurred.'
    },

    // Success messages
    success: {
      login: 'Welcome back!',
      register: 'Account created successfully!',
      profileUpdated: 'Profile updated successfully.',
      messageSent: 'Message sent.',
      serviceRequested: 'Service requested successfully.'
    },

    // Forms
    forms: {
      required: 'Required field',
      invalidEmail: 'Invalid email address',
      passwordTooShort: 'Password must be at least 6 characters',
      passwordsDontMatch: 'Passwords do not match',
      save: 'Save',
      cancel: 'Cancel',
      loading: 'Loading...',
      sending: 'Sending...'
    },

    // Services
    services: {
      title: 'Our Services',
      search: 'Search services...',
      category: 'Category',
      location: 'Location',
      price: 'Price',
      availability: 'Availability',
      requestQuote: 'Request Quote',
      contact: 'Contact',
      reviews: 'reviews',
      rating: 'rating'
    },

    // Professionals
    professionals: {
      title: 'Verified Professionals',
      search: 'Search professionals...',
      verified: 'Verified',
      experience: 'years of experience',
      services: 'services completed',
      responseTime: 'Response time',
      about: 'About',
      specialties: 'Specialties',
      portfolio: 'Portfolio'
    },

    // Chat
    chat: {
      title: 'Messages',
      typeMessage: 'Type your message...',
      send: 'Send',
      online: 'Online',
      offline: 'Offline',
      typing: 'typing...',
      newMessage: 'New message'
    },

    // Notifications
    notifications: {
      title: 'Notifications',
      markAsRead: 'Mark as read',
      markAllAsRead: 'Mark all as read',
      noNotifications: 'No new notifications',
      newQuote: 'New quote received',
      messageReceived: 'Message received',
      serviceCompleted: 'Service completed'
    },

    // Accessibility
    accessibility: {
      increaseFontSize: 'Increase font size',
      decreaseFontSize: 'Decrease font size',
      resetFontSize: 'Reset font size',
      highContrast: 'High contrast mode',
      reducedMotion: 'Reduced motion',
      skipToContent: 'Skip to main content',
      screenReader: 'Screen reader enabled'
    },

    // Triple impact
    impact: {
      social: 'Social Impact',
      economic: 'Economic Impact',
      environmental: 'Environmental Impact',
      jobsCreated: 'jobs created',
      servicesProvided: 'services provided',
      co2Saved: 'tons of CO₂ saved'
    }
  }
};

// Contexto de internacionalización
const I18nContext = createContext();

// Hook para usar traducciones
export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation debe usarse dentro de I18nProvider');
  }
  return context;
}

// Función para obtener traducción anidada
function getNestedTranslation(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Provider de internacionalización
export function I18nProvider({ children }) {
  const [currentLanguage, setCurrentLanguage] = useState('es');
  const [isLoading, setIsLoading] = useState(false);

  // Cargar idioma desde localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('changanet_language');
    if (savedLanguage && SUPPORTED_LANGUAGES[savedLanguage]) {
      setCurrentLanguage(savedLanguage);
    }
  }, []);

  // Cambiar idioma
  const changeLanguage = async (languageCode) => {
    if (!SUPPORTED_LANGUAGES[languageCode]) {
      console.warn(`Idioma no soportado: ${languageCode}`);
      return;
    }

    setIsLoading(true);

    try {
      // Aquí se podría cargar traducciones dinámicamente desde un servidor
      setCurrentLanguage(languageCode);
      localStorage.setItem('changanet_language', languageCode);

      // Aplicar dirección del texto
      document.documentElement.dir = SUPPORTED_LANGUAGES[languageCode].direction;
      document.documentElement.lang = languageCode;

      console.log(`🌐 Idioma cambiado a: ${SUPPORTED_LANGUAGES[languageCode].name}`);
    } catch (error) {
      console.error('Error cambiando idioma:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Función de traducción
  const t = (key, variables = {}) => {
    const keys = key.split('.');
    let translation = getNestedTranslation(translations[currentLanguage], key);

    if (!translation) {
      // Fallback al español si no existe la traducción
      translation = getNestedTranslation(translations.es, key);
    }

    if (!translation) {
      console.warn(`Traducción no encontrada para: ${key}`);
      return key;
    }

    // Reemplazar variables
    if (variables && typeof translation === 'string') {
      return Object.keys(variables).reduce((str, varKey) => {
        return str.replace(new RegExp(`{{${varKey}}}`, 'g'), variables[varKey]);
      }, translation);
    }

    return translation;
  };

  // Función para formatear números según el idioma
  const formatNumber = (number, options = {}) => {
    return new Intl.NumberFormat(currentLanguage, options).format(number);
  };

  // Función para formatear fechas según el idioma
  const formatDate = (date, options = {}) => {
    return new Intl.DateTimeFormat(currentLanguage, options).format(new Date(date));
  };

  // Función para formatear moneda
  const formatCurrency = (amount, currency = 'ARS') => {
    return new Intl.NumberFormat(currentLanguage, {
      style: 'currency',
      currency
    }).format(amount);
  };

  const value = {
    currentLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
    changeLanguage,
    t,
    formatNumber,
    formatDate,
    formatCurrency,
    isLoading
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

// Componente para texto traducido
export function Trans({ id, variables = {}, children }) {
  const { t } = useTranslation();
  return children || t(id, variables);
}

// Hook para detectar idioma del navegador
export function useBrowserLanguage() {
  const [browserLanguage, setBrowserLanguage] = useState('es');

  useEffect(() => {
    const detected = navigator.language.split('-')[0];
    if (SUPPORTED_LANGUAGES[detected]) {
      setBrowserLanguage(detected);
    }
  }, []);

  return browserLanguage;
}

// Utilidad para extraer placeholders de traducciones
export function extractPlaceholders(text) {
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  const placeholders = [];
  let match;

  while ((match = placeholderRegex.exec(text)) !== null) {
    placeholders.push(match[1]);
  }

  return placeholders;
}

// Validar que todas las traducciones tengan los mismos placeholders
export function validateTranslations() {
  const errors = [];

  Object.keys(translations.es).forEach(section => {
    Object.keys(translations.es[section]).forEach(key => {
      const esText = translations.es[section][key];
      const enText = translations.en[section]?.[key];

      if (!enText) {
        errors.push(`Traducción faltante en inglés: ${section}.${key}`);
        return;
      }

      const esPlaceholders = extractPlaceholders(esText);
      const enPlaceholders = extractPlaceholders(enText);

      if (esPlaceholders.length !== enPlaceholders.length ||
          !esPlaceholders.every(p => enPlaceholders.includes(p))) {
        errors.push(`Placeholders no coinciden en ${section}.${key}`);
      }
    });
  });

  return errors;
}

export { translations, SUPPORTED_LANGUAGES };
export default I18nProvider;
