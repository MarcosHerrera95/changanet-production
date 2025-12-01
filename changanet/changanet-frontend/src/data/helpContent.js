/**
 * Contenido de ayuda contextual para Changánet
 * Organizado por rutas y roles de usuario
 */

export const helpContent = {
  // Páginas generales (disponibles para todos)
  '/': {
    title: 'Página Principal',
    questions: [
      {
        question: '¿Cómo busco un servicio?',
        answer: 'Usa la barra de búsqueda para escribir el servicio que necesitas, como "plomero" o "electricista".'
      },
      {
        question: '¿Qué significa la insignia "Verificado"?',
        answer: 'Los profesionales verificados han subido su documento de identidad y sido aprobados por nuestro equipo.'
      },
      {
        question: '¿Es seguro usar Changánet?',
        answer: 'Sí, todos los pagos están protegidos y nunca compartimos tu información personal con terceros.'
      }
    ]
  },

  '/profesionales': {
    title: 'Buscar Profesionales',
    questions: [
      {
        question: '¿Cómo filtro los resultados?',
        answer: 'Usa los filtros por barrio, precio y calificación para encontrar el profesional ideal.'
      },
      {
        question: '¿Puedo ver reseñas antes de contactar?',
        answer: 'Sí, cada profesional muestra su calificación promedio y reseñas de clientes anteriores.'
      },
      {
        question: '¿Cuánto cuesta solicitar un presupuesto?',
        answer: 'Es completamente gratis. Solo pagas cuando aceptas el servicio final.'
      }
    ]
  },

  '/profesional/:id': {
    title: 'Perfil del Profesional',
    questions: [
      {
        question: '¿Cómo contacto a este profesional?',
        answer: 'Haz clic en "Solicitar Presupuesto" y describe tu necesidad. El profesional te responderá pronto.'
      },
      {
        question: '¿Puedo ver trabajos anteriores?',
        answer: 'Revisa la galería de fotos y reseñas para ver ejemplos de trabajos realizados.'
      }
    ]
  },

  // Páginas de clientes
  '/mi-cuenta': {
    title: 'Mi Cuenta - Cliente',
    questions: [
      {
        question: '¿Cómo contacto a un profesional?',
        answer: 'Ve a "Cotizaciones", selecciona una y usa el chat para comunicarte sin compartir tu número.'
      },
      {
        question: '¿Cómo dejo una reseña?',
        answer: 'Después de completar un servicio, ve a "Mis Reseñas" y califica tu experiencia.'
      },
      {
        question: '¿Dónde veo mis pagos?',
        answer: 'En la pestaña "Pagos" encontrarás el historial completo de tus transacciones.'
      }
    ]
  },

  '/mis-cotizaciones': {
    title: 'Mis Cotizaciones',
    questions: [
      {
        question: '¿Cómo acepto una cotización?',
        answer: 'Revisa las ofertas recibidas y haz clic en "Aceptar" en la que prefieras.'
      },
      {
        question: '¿Puedo cancelar una cotización?',
        answer: 'Sí, puedes cancelar en cualquier momento antes de que el profesional comience el trabajo.'
      }
    ]
  },

  '/mi-perfil-cliente': {
    title: 'Mi Perfil - Cliente',
    questions: [
      {
        question: '¿Por qué actualizar mi perfil?',
        answer: 'Un perfil completo ayuda a los profesionales a entender mejor tus necesidades.'
      },
      {
        question: '¿Es obligatoria la verificación?',
        answer: 'No es obligatoria, pero ayuda a generar confianza con los profesionales.'
      }
    ]
  },

  // Páginas de profesionales
  '/dashboard-profesional': {
    title: 'Dashboard Profesional',
    questions: [
      {
        question: '¿Cómo configuro mi agenda?',
        answer: 'Ve a "Mi Agenda" y marca los días y horarios en que estás disponible para trabajar.'
      },
      {
        question: '¿Cómo verifico mi identidad?',
        answer: 'En "Verificación", sube una foto de tu DNI o documento de identidad para obtener la insignia "Verificado".'
      },
      {
        question: '¿Dónde veo las cotizaciones?',
        answer: 'En la pestaña "Cotizaciones" encontrarás todas las solicitudes de presupuesto de clientes.'
      }
    ]
  },

  '/mi-perfil-profesional': {
    title: 'Mi Perfil - Profesional',
    questions: [
      {
        question: '¿Por qué completar mi perfil?',
        answer: 'Un perfil detallado con fotos de trabajos aumenta tu visibilidad y genera más clientes.'
      },
      {
        question: '¿Cómo agrego fotos de mis trabajos?',
        answer: 'En la sección "Galería" puedes subir fotos de trabajos realizados para mostrar tu experiencia.'
      }
    ]
  },

  '/agenda-profesional': {
    title: 'Mi Agenda',
    questions: [
      {
        question: '¿Cómo marco mis horarios disponibles?',
        answer: 'Selecciona los días de la semana y horas en que puedes trabajar. Los clientes solo te verán cuando estés libre.'
      },
      {
        question: '¿Puedo cambiar mi agenda después?',
        answer: 'Sí, puedes modificar tu disponibilidad en cualquier momento desde esta sección.'
      }
    ]
  },

  '/cotizaciones-profesional': {
    title: 'Cotizaciones Recibidas',
    questions: [
      {
        question: '¿Cómo respondo a una cotización?',
        answer: 'Revisa la solicitud del cliente y envía tu presupuesto usando el chat integrado.'
      },
      {
        question: '¿Cuánto tiempo tengo para responder?',
        answer: 'Te recomendamos responder dentro de 24 horas para no perder la oportunidad.'
      }
    ]
  },

  '/verificacion-profesional': {
    title: 'Verificación de Identidad',
    questions: [
      {
        question: '¿Por qué verificar mi identidad?',
        answer: 'La verificación aumenta la confianza de los clientes y te hace aparecer más arriba en las búsquedas.'
      },
      {
        question: '¿Qué documentos necesito?',
        answer: 'Una foto clara de tu DNI, cédula o pasaporte. Nuestro equipo lo revisa manualmente.'
      },
      {
        question: '¿Cuánto tarda la verificación?',
        answer: 'Generalmente 24-48 horas hábiles. Recibirás una notificación cuando esté aprobado.'
      }
    ]
  },

  // Páginas generales
  '/terminos': {
    title: 'Términos y Condiciones',
    questions: [
      {
        question: '¿Dónde puedo leer los términos completos?',
        answer: 'Estás en la página correcta. Lee toda la información importante sobre el uso de Changánet.'
      }
    ]
  },

  '/privacidad': {
    title: 'Política de Privacidad',
    questions: [
      {
        question: '¿Cómo protege Changánet mis datos?',
        answer: 'Nunca compartimos tu información personal. Lee aquí cómo manejamos y protegemos tus datos.'
      }
    ]
  },

  '/contacto': {
    title: 'Contacto',
    questions: [
      {
        question: '¿Necesitas ayuda adicional?',
        answer: 'Estamos aquí para ayudarte. Usa el formulario de contacto o llámanos directamente.'
      }
    ]
  }
};

/**
 * Función para obtener contenido de ayuda basado en la ruta actual
 * @param {string} pathname - Ruta actual del navegador
 * @param {string} userRole - Rol del usuario ('cliente' o 'profesional')
 * @returns {Object} Contenido de ayuda para la ruta
 */
export const getHelpContent = (pathname, userRole = null) => {
  // Primero intentar encontrar una coincidencia exacta
  if (helpContent[pathname]) {
    return helpContent[pathname];
  }

  // Si no hay coincidencia exacta, buscar patrones dinámicos
  if (pathname.startsWith('/profesional/') && pathname !== '/profesionales') {
    return helpContent['/profesional/:id'];
  }

  // Si no se encuentra contenido específico, devolver contenido general
  return helpContent['/'] || {
    title: 'Ayuda General',
    questions: [
      {
        question: '¿Necesitas ayuda?',
        answer: 'Navega por las diferentes secciones para encontrar información específica sobre cada funcionalidad.'
      }
    ]
  };
};
