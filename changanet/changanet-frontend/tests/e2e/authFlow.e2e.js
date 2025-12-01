/**
 * Pruebas E2E para flujo completo de autenticación
 * Cubre: REQ-01, REQ-02, REQ-03 (Registro, Login, Verificación)
 */

describe('Flujo de Autenticación Completo - E2E Tests', () => {
  beforeEach(() => {
    // Limpiar localStorage y cookies antes de cada test
    cy.clearLocalStorage();
    cy.clearCookies();

    // Visitar la página principal
    cy.visit('/');
  });

  it('debe permitir registro completo con Google OAuth', () => {
    // Interceptar llamadas a la API
    cy.intercept('POST', '/api/auth/google/firebase', { fixture: 'google-auth-success.json' }).as('googleAuth');

    // Hacer click en el botón de Google
    cy.get('[aria-label="Iniciar sesión con Google"]').click();

    // Verificar que se realizó la llamada a la API
    cy.wait('@googleAuth');

    // Verificar que se redirigió al dashboard
    cy.url().should('eq', Cypress.config().baseUrl + '/');

    // Verificar que el usuario está autenticado
    cy.window().its('localStorage.changanet_token').should('exist');

    // Verificar que se muestra el nombre del usuario
    cy.get('[data-testid="user-name"]').should('be.visible');
  });

  it('debe manejar errores de autenticación con Google', () => {
    // Interceptar llamada con error
    cy.intercept('POST', '/api/auth/google/firebase', {
      statusCode: 401,
      body: { error: 'Token de Firebase inválido' }
    }).as('googleAuthError');

    // Mock de alert
    cy.on('window:alert', (text) => {
      expect(text).to.contain('Error al iniciar sesión con Google');
    });

    // Hacer click en el botón de Google
    cy.get('[aria-label="Iniciar sesión con Google"]').click();

    // Verificar que se mostró el error
    cy.wait('@googleAuthError');
  });

  it('debe mantener la sesión después de recargar la página', () => {
    // Simular usuario autenticado
    cy.window().then((win) => {
      win.localStorage.setItem('changanet_token', 'mock-jwt-token');
      win.localStorage.setItem('user', JSON.stringify({
        id: 'user-123',
        name: 'Test User',
        role: 'cliente'
      }));
    });

    // Recargar la página
    cy.reload();

    // Verificar que la sesión se mantiene
    cy.window().its('localStorage.changanet_token').should('eq', 'mock-jwt-token');

    // Verificar que se muestra el usuario autenticado
    cy.get('[data-testid="user-menu"]').should('be.visible');
  });

  it('debe permitir logout correctamente', () => {
    // Simular usuario autenticado
    cy.window().then((win) => {
      win.localStorage.setItem('changanet_token', 'mock-jwt-token');
      win.localStorage.setItem('user', JSON.stringify({
        id: 'user-123',
        name: 'Test User',
        role: 'cliente'
      }));
    });

    // Recargar para aplicar el estado
    cy.reload();

    // Hacer click en logout
    cy.get('[data-testid="logout-button"]').click();

    // Verificar que se limpió el localStorage
    cy.window().its('localStorage.changanet_token').should('not.exist');

    // Verificar que se redirigió al home
    cy.url().should('eq', Cypress.config().baseUrl + '/');

    // Verificar que se muestra el botón de login
    cy.get('[aria-label="Iniciar sesión con Google"]').should('be.visible');
  });

  it('debe proteger rutas que requieren autenticación', () => {
    // Intentar acceder a una ruta protegida sin estar autenticado
    cy.visit('/mi-cuenta');

    // Debería redirigir al home o mostrar mensaje de login requerido
    cy.url().should('not.include', '/mi-cuenta');

    // Verificar que se muestra el botón de login
    cy.get('[aria-label="Iniciar sesión con Google"]').should('be.visible');
  });

  it('debe permitir acceso a rutas protegidas cuando está autenticado', () => {
    // Simular usuario autenticado
    cy.window().then((win) => {
      win.localStorage.setItem('changanet_token', 'mock-jwt-token');
      win.localStorage.setItem('user', JSON.stringify({
        id: 'user-123',
        name: 'Test User',
        role: 'cliente'
      }));
    });

    // Visitar ruta protegida
    cy.visit('/mi-cuenta');

    // Debería permitir el acceso
    cy.url().should('include', '/mi-cuenta');

    // Verificar que se muestra el contenido del perfil
    cy.get('[data-testid="profile-content"]').should('be.visible');
  });

  it('debe manejar tokens expirados correctamente', () => {
    // Simular token expirado
    cy.window().then((win) => {
      win.localStorage.setItem('changanet_token', 'expired-jwt-token');
      win.localStorage.setItem('user', JSON.stringify({
        id: 'user-123',
        name: 'Test User',
        role: 'cliente'
      }));
    });

    // Interceptar llamada que fallará por token expirado
    cy.intercept('GET', '/api/profile', {
      statusCode: 401,
      body: { error: 'Token expirado' }
    }).as('profileRequest');

    // Visitar página que requiere autenticación
    cy.visit('/mi-cuenta');

    // Debería detectar el token expirado y redirigir
    cy.wait('@profileRequest');

    // Verificar que se limpió la sesión
    cy.window().its('localStorage.changanet_token').should('not.exist');

    // Verificar que se muestra login
    cy.get('[aria-label="Iniciar sesión con Google"]').should('be.visible');
  });
});
