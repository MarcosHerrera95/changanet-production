/**
 * @service quoteNotificationService - Servicio de notificaciones para presupuestos
 * @descripción Maneja notificaciones específicas para solicitudes y ofertas de presupuesto (REQ-35)
 * @sprint Sprint 2 – Solicitudes y Presupuestos
 * @tarjeta Tarjeta 7: [Frontend] Implementar Sistema de Notificaciones de Presupuesto
 * @impacto Comunicación: Notificaciones en tiempo real para mejorar la experiencia del usuario
 */

/**
 * @función sendQuoteNotification - Enviar notificación de presupuesto
 * @descripción Envía notificación específica cuando se recibe una nueva oferta de presupuesto
 * @param {Object} notificationContext - Contexto de notificaciones de React
 * @param {Object} offer - Datos de la oferta recibida
 * @param {string} offer.precio - Precio ofrecido
 * @param {string} offer.comentario - Comentario del profesional
 * @param {Object} offer.profesional - Datos del profesional
 * @param {Object} offer.solicitud - Datos de la solicitud
 */
export const sendQuoteNotification = async (notificationContext, offer) => {
  try {
    const notification = {
      id: `quote-offer-${offer.id}-${Date.now()}`,
      titulo: '💰 Nueva Oferta de Presupuesto',
      mensaje: `${offer.profesional.nombre} respondió a tu solicitud con $${offer.precio || 'precio a convenir'}`,
      fecha_creacion: new Date().toISOString(),
      leida: false,
      tipo: 'quote_offer',
      datos: {
        quoteId: offer.solicitud.id,
        professionalId: offer.profesional.id,
        price: offer.precio,
        professionalName: offer.profesional.nombre,
        action: 'view_quote',
        ...offer
      }
    };

    notificationContext.addNotification(notification);

    // Notificación del navegador
    if (Notification.permission === 'granted') {
      new Notification(notification.titulo, {
        body: notification.mensaje,
        icon: '/vite.svg',
        tag: `quote-offer-${offer.solicitud.id}`,
        requireInteraction: true
      });
    }

    console.log('Notificación de presupuesto enviada:', notification);
  } catch (error) {
    console.error('Error enviando notificación de presupuesto:', error);
  }
};

/**
 * @función sendQuoteAcceptedNotification - Notificación de presupuesto aceptado
 * @descripción Envía notificación cuando un profesional acepta/rechaza una solicitud
 * @param {Object} notificationContext - Contexto de notificaciones de React
 * @param {Object} quote - Datos de la cotización
 * @param {string} action - 'accept' o 'reject'
 */
export const sendQuoteAcceptedNotification = async (notificationContext, quote, action = 'accept') => {
  try {
    const isAccepted = action === 'accept';
    const notification = {
      id: `quote-${action}-${quote.id}-${Date.now()}`,
      titulo: isAccepted ? '✅ Solicitud Aceptada' : '❌ Solicitud Rechazada',
      mensaje: isAccepted 
        ? `Respondiste positivamente a la oferta de ${quote.profesional.nombre}`
        : `Rechazaste la oferta de ${quote.profesional.nombre}`,
      fecha_creacion: new Date().toISOString(),
      leida: false,
      tipo: isAccepted ? 'quote_accepted' : 'quote_rejected',
      datos: {
        quoteId: quote.id,
        professionalId: quote.profesional.id,
        action: action,
        professionalName: quote.profesional.nombre
      }
    };

    notificationContext.addNotification(notification);

    console.log('Notificación de respuesta enviada:', notification);
  } catch (error) {
    console.error('Error enviando notificación de respuesta:', error);
  }
};

/**
 * @función sendQuoteSubmittedNotification - Notificación de solicitud enviada
 * @descripción Envía confirmación cuando se envía una solicitud de presupuesto
 * @param {Object} notificationContext - Contexto de notificaciones de React
 * @param {Object} request - Datos de la solicitud enviada
 * @param {Array} selectedProfessionals - Profesionales seleccionados
 */
export const sendQuoteSubmittedNotification = async (notificationContext, request, selectedProfessionals) => {
  try {
    const notification = {
      id: `quote-submitted-${request.id}-${Date.now()}`,
      titulo: '📋 Solicitud de Presupuesto Enviada',
      mensaje: `Tu solicitud fue enviada a ${selectedProfessionals.length} profesional(es). Recibirás sus ofertas pronto.`,
      fecha_creacion: new Date().toISOString(),
      leida: false,
      tipo: 'quote_submitted',
      datos: {
        quoteId: request.id,
        professionalCount: selectedProfessionals.length,
        action: 'view_requests'
      }
    };

    notificationContext.addNotification(notification);

    console.log('Notificación de envío de solicitud:', notification);
  } catch (error) {
    console.error('Error enviando notificación de envío:', error);
  }
};

/**
 * @función scheduleQuoteReminders - Programar recordatorios de cotización
 * @descripción Programa recordatorios automáticos para ofertas pendientes
 * @param {Object} notificationContext - Contexto de notificaciones de React
 * @param {Array} pendingOffers - Ofertas pendientes
 */
export const scheduleQuoteReminders = async (notificationContext, pendingOffers) => {
  try {
    // Filtrar ofertas con más de 24 horas sin respuesta
    const oldOffers = pendingOffers.filter(offer => {
      const offerDate = new Date(offer.respondido_en || offer.creado_en);
      const now = new Date();
      const hoursPassed = (now - offerDate) / (1000 * 60 * 60);
      return hoursPassed > 24 && offer.estado === 'PENDIENTE';
    });

    oldOffers.forEach(offer => {
      const notification = {
        id: `quote-reminder-${offer.id}-${Date.now()}`,
        titulo: '⏰ Recordatorio de Cotización',
        mensaje: `Aún no has respondido a la oferta de ${offer.profesional.nombre}. ¿Quieres ver las opciones disponibles?`,
        fecha_creacion: new Date().toISOString(),
        leida: false,
        tipo: 'quote_reminder',
        datos: {
          quoteId: offer.solicitud.id,
          professionalId: offer.profesional.id,
          action: 'view_offers',
          professionalName: offer.profesional.nombre
        }
      };

      notificationContext.addNotification(notification);
    });

    console.log(`${oldOffers.length} recordatorios programados`);
  } catch (error) {
    console.error('Error programando recordatorios:', error);
  }
};
