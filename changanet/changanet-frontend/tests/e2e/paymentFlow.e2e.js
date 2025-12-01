/**
 * Pruebas E2E para flujo completo de pagos con custodia
 * Cubre: REQ-41, REQ-42, RB-03, RB-04 (Pagos con Mercado Pago)
 */

describe('Flujo de Pagos con Custodia - E2E Tests', () => {
  beforeEach(() => {
    // Simular usuario cliente autenticado
    cy.window().then((win) => {
      win.localStorage.setItem('changanet_token', 'mock-jwt-token');
      win.localStorage.setItem('user', JSON.stringify({
        id: 'client-123',
        name: 'Cliente Test',
        role: 'cliente',
        email: 'client@example.com'
      }));
    });

    cy.visit('/');
  });

  it('debe mostrar botón de pago en detalles del profesional', () => {
    // Interceptar llamada para obtener profesional
    cy.intercept('GET', '/api/professionals/prof-123', {
      fixture: 'professional-detail.json'
    }).as('getProfessional');

    // Visitar página de profesional
    cy.visit('/profesional/prof-123');

    // Verificar que se cargó el profesional
    cy.wait('@getProfessional');

    // Verificar que se muestra el botón de solicitud de presupuesto
    cy.get('[data-testid="quote-request-button"]').should('be.visible');
  });

  it('debe permitir crear solicitud de presupuesto', () => {
    // Interceptar llamadas
    cy.intercept('GET', '/api/professionals/prof-123', {
      fixture: 'professional-detail.json'
    }).as('getProfessional');

    cy.intercept('POST', '/api/quotes', {
      statusCode: 201,
      body: {
        success: true,
        data: {
          id: 'quote-123',
          estado: 'pendiente',
          precio: 2500
        }
      }
    }).as('createQuote');

    // Visitar página de profesional
    cy.visit('/profesional/prof-123');
    cy.wait('@getProfessional');

    // Abrir modal de solicitud de presupuesto
    cy.get('[data-testid="quote-request-button"]').click();

    // Llenar formulario
    cy.get('[data-testid="quote-description"]').type('Necesito instalación eléctrica completa');
    cy.get('[data-testid="quote-submit"]').click();

    // Verificar que se creó la cotización
    cy.wait('@createQuote');

    // Verificar mensaje de éxito
    cy.get('[data-testid="quote-success-message"]').should('be.visible');
  });

  it('debe mostrar opciones de pago para cotización aceptada', () => {
    // Simular cotización aceptada
    cy.intercept('GET', '/api/quotes', {
      fixture: 'accepted-quote.json'
    }).as('getQuotes');

    // Visitar página de cotizaciones
    cy.visit('/quotes');
    cy.wait('@getQuotes');

    // Verificar que se muestra el botón de pago
    cy.get('[data-testid="pay-button"]').should('be.visible');
    cy.get('[data-testid="pay-button"]').should('contain', 'Pagar $2,500');
  });

  it('debe redirigir a Mercado Pago al hacer click en pagar', () => {
    // Interceptar creación de preferencia de pago
    cy.intercept('POST', '/api/payments/create-preference', {
      statusCode: 201,
      body: {
        success: true,
        data: {
          preferenceId: 'pref-123',
          initPoint: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-123',
          sandboxInitPoint: 'https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-123'
        }
      }
    }).as('createPreference');

    // Simular cotización aceptada
    cy.intercept('GET', '/api/quotes', {
      fixture: 'accepted-quote.json'
    }).as('getQuotes');

    // Visitar página de cotizaciones
    cy.visit('/quotes');
    cy.wait('@getQuotes');

    // Hacer click en pagar
    cy.get('[data-testid="pay-button"]').click();

    // Verificar que se creó la preferencia
    cy.wait('@createPreference');

    // Verificar que se redirigió a Mercado Pago (en entorno de pruebas usa sandbox)
    cy.url().should('include', 'mercadopago.com.ar');
  });

  it('debe manejar pagos rechazados correctamente', () => {
    // Simular pago rechazado por Mercado Pago
    cy.intercept('POST', '/api/payments/webhook', {
      statusCode: 200
    }).as('paymentWebhook');

    // Simular redirección de vuelta desde Mercado Pago con pago rechazado
    cy.visit('/payments/failure?preference_id=pref-123&status=rejected');

    // Verificar que se muestra mensaje de error
    cy.get('[data-testid="payment-failure-message"]').should('be.visible');
    cy.get('[data-testid="payment-failure-message"]').should('contain', 'pago fue rechazado');

    // Verificar que no se creó ningún registro de servicio completado
    cy.intercept('GET', '/api/services', {
      body: [] // No debería haber servicios completados
    }).as('getServices');

    cy.visit('/services');
    cy.wait('@getServices');

    cy.get('[data-testid="completed-service"]').should('not.exist');
  });

  it('debe manejar pagos aprobados y crear custodia de fondos', () => {
    // Simular webhook de pago aprobado
    cy.intercept('POST', '/api/payments/webhook', {
      statusCode: 200
    }).as('paymentWebhook');

    // Simular redirección de vuelta desde Mercado Pago con pago aprobado
    cy.visit('/payments/success?preference_id=pref-123&status=approved&serviceId=service-123');

    // Verificar que se muestra mensaje de éxito
    cy.get('[data-testid="payment-success-message"]').should('be.visible');
    cy.get('[data-testid="payment-success-message"]').should('contain', 'pago fue aprobado');

    // Verificar que se creó el servicio con estado de custodia
    cy.intercept('GET', '/api/services', {
      fixture: 'service-in-custody.json'
    }).as('getServices');

    cy.visit('/services');
    cy.wait('@getServices');

    // Verificar que se muestra el servicio en custodia
    cy.get('[data-testid="service-in-custody"]').should('be.visible');
    cy.get('[data-testid="service-in-custody"]').should('contain', 'Fondos en custodia');
    cy.get('[data-testid="release-funds-button"]').should('not.exist'); // Solo cliente puede liberar
  });

  it('cliente debe poder liberar fondos después de servicio completado', () => {
    // Simular servicio completado
    cy.intercept('GET', '/api/services', {
      fixture: 'service-completed.json'
    }).as('getServices');

    cy.intercept('POST', '/api/payments/release-funds', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Fondos liberados correctamente'
      }
    }).as('releaseFunds');

    // Visitar servicios
    cy.visit('/services');
    cy.wait('@getServices');

    // Verificar que se muestra botón de liberar fondos
    cy.get('[data-testid="release-funds-button"]').should('be.visible');

    // Hacer click en liberar fondos
    cy.get('[data-testid="release-funds-button"]').click();

    // Confirmar liberación
    cy.on('window:confirm', () => true);

    // Verificar que se realizó la liberación
    cy.wait('@releaseFunds');

    // Verificar mensaje de éxito
    cy.get('[data-testid="funds-released-message"]').should('be.visible');
  });

  it('profesional debe recibir notificación de liberación de fondos', () => {
    // Simular notificación push de liberación de fondos
    cy.intercept('GET', '/api/notifications', {
      fixture: 'funds-released-notification.json'
    }).as('getNotifications');

    // Cambiar a usuario profesional
    cy.window().then((win) => {
      win.localStorage.setItem('user', JSON.stringify({
        id: 'prof-123',
        name: 'Profesional Test',
        role: 'profesional',
        email: 'prof@example.com'
      }));
    });

    // Visitar notificaciones
    cy.visit('/notifications');
    cy.wait('@getNotifications');

    // Verificar que se muestra notificación de liberación de fondos
    cy.get('[data-testid="notification-item"]').first().should('contain', 'Fondos liberados');
    cy.get('[data-testid="notification-item"]').first().should('contain', 'pago ha sido liberado');
  });

  it('debe calcular correctamente la comisión del 10%', () => {
    // Verificar cálculo de comisión en la UI
    cy.intercept('GET', '/api/quotes', {
      fixture: 'quote-with-commission.json'
    }).as('getQuotes');

    cy.visit('/quotes');
    cy.wait('@getQuotes');

    // Verificar que se muestra el precio final (con comisión incluida)
    cy.get('[data-testid="final-price"]').should('contain', '$2,750'); // 2500 + 10% = 2750

    // Verificar que se explica la comisión
    cy.get('[data-testid="commission-info"]').should('contain', 'Incluye 10% de comisión');
  });

  it('debe proteger endpoints de pago con autenticación', () => {
    // Limpiar autenticación
    cy.clearLocalStorage();

    // Intentar acceder a endpoints de pago sin autenticación
    cy.request({
      method: 'POST',
      url: '/api/payments/create-preference',
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(401);
    });

    cy.request({
      method: 'POST',
      url: '/api/payments/release-funds',
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(401);
    });
  });
});
