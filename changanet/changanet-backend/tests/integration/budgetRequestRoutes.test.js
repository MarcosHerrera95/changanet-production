/**
 * Pruebas de integración para budgetRequestRoutes.js
 * Cubre: REQ-31, REQ-32, REQ-33, REQ-34, REQ-35 (Solicitud de Presupuestos)
 * Incluye pruebas de autenticación, rate limiting y flujo completo
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

// Mock de servicios externos
jest.mock('../services/storageService');
jest.mock('../services/pushNotificationService');
jest.mock('../services/emailService');

const mockUploadImage = require('../services/storageService').uploadImage;
const mockSendPushNotification = require('../services/pushNotificationService').sendPushNotification;

describe('Budget Request Routes - Integration Tests', () => {
  let app, prisma, testUser, testProfessional, testToken, profToken;

  beforeAll(async () => {
    // Configurar base de datos de prueba
    prisma = new PrismaClient();

    // Crear usuarios de prueba
    testUser = await prisma.usuarios.create({
      data: {
        nombre: 'Test Client',
        email: 'testclient@example.com',
        hash_contrasena: 'hashedpassword',
        rol: 'cliente',
        esta_verificado: true,
        bloqueado: false,
      },
    });

    testProfessional = await prisma.usuarios.create({
      data: {
        nombre: 'Test Professional',
        email: 'testprof@example.com',
        hash_contrasena: 'hashedpassword',
        rol: 'profesional',
        esta_verificado: true,
        bloqueado: false,
      },
    });

    // Crear perfil profesional
    await prisma.perfiles_profesionales.create({
      data: {
        usuario_id: testProfessional.id,
        especialidad: 'Plomería',
        zona_cobertura: 'Palermo, Buenos Aires',
        anos_experiencia: 5,
        esta_disponible: true,
        calificacion_promedio: 4.5,
      },
    });

    // Generar tokens JWT
    testToken = jwt.sign(
      { id: testUser.id, email: testUser.email, rol: testUser.rol },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    profToken = jwt.sign(
      { id: testProfessional.id, email: testProfessional.email, rol: testProfessional.rol },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Importar app después de configurar la DB
    const server = require('../../src/server');
    app = server.app;
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await prisma.cotizacion_respuestas.deleteMany({
      where: {
        OR: [
          { profesional_id: testProfessional.id },
          { cotizacion: { cliente_id: testUser.id } },
        ],
      },
    });

    await prisma.cotizaciones.deleteMany({
      where: { cliente_id: testUser.id },
    });

    await prisma.perfiles_profesionales.deleteMany({
      where: { usuario_id: testProfessional.id },
    });

    await prisma.usuarios.deleteMany({
      where: {
        id: { in: [testUser.id, testProfessional.id] },
      },
    });

    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadImage.mockResolvedValue({ secure_url: 'https://cloudinary.com/test.jpg' });
    mockSendPushNotification.mockResolvedValue();
  });

  describe('POST /api/budget-requests - Create Budget Request', () => {
    test('debe crear solicitud exitosamente con fotos (REQ-31)', async () => {
      const response = await request(app)
        .post('/api/budget-requests')
        .set('Authorization', `Bearer ${testToken}`)
        .field('descripcion', 'Necesito reparar mi grifo que gotea')
        .field('zona_cobertura', 'Palermo, Buenos Aires')
        .field('especialidad', 'Plomería')
        .field('presupuesto_estimado', '15000')
        .attach('fotos', Buffer.from('fake-image-data'), 'grifo.jpg')
        .attach('fotos', Buffer.from('fake-image-data2'), 'baño.jpg');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.fotos_urls).toHaveLength(2);
      expect(response.body.profesionales_solicitados).toContain(testProfessional.id);
      expect(response.body.respuestas_pendientes).toBeGreaterThan(0);

      // Verificar que se creó en la base de datos
      const createdRequest = await prisma.cotizaciones.findUnique({
        where: { id: response.body.id },
        include: { respuestas: true },
      });

      expect(createdRequest).toBeTruthy();
      expect(createdRequest.descripcion).toBe('Necesito reparar mi grifo que gotea');
      expect(createdRequest.zona_cobertura).toBe('Palermo, Buenos Aires');
      expect(createdRequest.respuestas).toHaveLength(1);
    });

    test('debe crear solicitud sin fotos exitosamente', async () => {
      const response = await request(app)
        .post('/api/budget-requests')
        .set('Authorization', `Bearer ${testToken}`)
        .field('descripcion', 'Necesito pintar mi living')
        .field('zona_cobertura', 'Recoleta, Buenos Aires')
        .field('especialidad', 'Pintura');

      expect(response.status).toBe(201);
      expect(response.body.fotos_urls).toBeNull();
    });

    test('debe rechazar solicitud sin autenticación (401)', async () => {
      const response = await request(app)
        .post('/api/budget-requests')
        .field('descripcion', 'Test description')
        .field('zona_cobertura', 'Test zone')
        .field('especialidad', 'Plomería');

      expect(response.status).toBe(401);
    });

    test('debe rechazar solicitud con datos inválidos (400)', async () => {
      const response = await request(app)
        .post('/api/budget-requests')
        .set('Authorization', `Bearer ${testToken}`)
        .field('descripcion', 'abc') // Demasiado corta
        .field('zona_cobertura', '')
        .field('especialidad', '');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('inválida');
    });

    test('debe aplicar rate limiting (429)', async () => {
      // Hacer múltiples solicitudes rápidas para activar rate limit
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .post('/api/budget-requests')
            .set('Authorization', `Bearer ${testToken}`)
            .field('descripcion', `Test request ${i}`)
            .field('zona_cobertura', 'Test zone')
            .field('especialidad', 'Plomería')
        );
      }

      const responses = await Promise.all(requests);

      // Al menos una debería ser rate limited
      const rateLimitedResponse = responses.find(r => r.status === 429);
      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.body.error).toContain('demasiadas solicitudes');
    });
  });

  describe('GET /api/budget-requests/client/:clientId - Get Client Requests', () => {
    let testRequest;

    beforeEach(async () => {
      // Crear una solicitud de prueba
      testRequest = await prisma.cotizaciones.create({
        data: {
          cliente_id: testUser.id,
          descripcion: 'Test request for client',
          zona_cobertura: 'Test zone',
          fotos_urls: JSON.stringify(['url1.jpg']),
        },
      });
    });

    afterEach(async () => {
      if (testRequest) {
        await prisma.cotizacion_respuestas.deleteMany({
          where: { cotizacion_id: testRequest.id },
        });
        await prisma.cotizaciones.delete({ where: { id: testRequest.id } });
        testRequest = null;
      }
    });

    test('debe retornar solicitudes del cliente correctamente', async () => {
      const response = await request(app)
        .get(`/api/budget-requests/client/${testUser.id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const request = response.body.find(r => r.id === testRequest.id);
      expect(request).toBeDefined();
      expect(request.descripcion).toBe('Test request for client');
      expect(request.fotos_urls).toEqual(['url1.jpg']);
    });

    test('debe rechazar acceso a solicitudes de otro cliente (403)', async () => {
      const otherUser = await prisma.usuarios.create({
        data: {
          nombre: 'Other Client',
          email: 'other@example.com',
          hash_contrasena: 'hashed',
          rol: 'cliente',
          esta_verificado: true,
        },
      });

      const response = await request(app)
        .get(`/api/budget-requests/client/${otherUser.id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('No tienes permiso');

      await prisma.usuarios.delete({ where: { id: otherUser.id } });
    });
  });

  describe('GET /api/budget-requests/:id/offers - Get Request Offers', () => {
    let testRequest, testOffer;

    beforeEach(async () => {
      // Crear solicitud y oferta de prueba
      testRequest = await prisma.cotizaciones.create({
        data: {
          cliente_id: testUser.id,
          descripcion: 'Test request for offers',
          zona_cobertura: 'Test zone',
        },
      });

      testOffer = await prisma.cotizacion_respuestas.create({
        data: {
          cotizacion_id: testRequest.id,
          profesional_id: testProfessional.id,
          precio: 2000,
          comentario: 'Buena oferta de prueba',
          estado: 'ACEPTADO',
          respondido_en: new Date(),
        },
      });
    });

    afterEach(async () => {
      if (testOffer) {
        await prisma.cotizacion_respuestas.delete({ where: { id: testOffer.id } });
      }
      if (testRequest) {
        await prisma.cotizaciones.delete({ where: { id: testRequest.id } });
      }
      testRequest = null;
      testOffer = null;
    });

    test('debe retornar ofertas con estadísticas de comparación (REQ-34)', async () => {
      const response = await request(app)
        .get(`/api/budget-requests/${testRequest.id}/offers`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('request');
      expect(response.body).toHaveProperty('offers');
      expect(response.body).toHaveProperty('comparison_stats');

      expect(response.body.offers).toHaveLength(1);
      expect(response.body.offers[0].precio).toBe(2000);
      expect(response.body.offers[0].estado).toBe('ACEPTADO');

      expect(response.body.comparison_stats.total_offers).toBe(1);
      expect(response.body.comparison_stats.price_range.min).toBe(2000);
      expect(response.body.comparison_stats.price_range.max).toBe(2000);
    });

    test('debe rechazar acceso a ofertas de solicitud inexistente (404)', async () => {
      const response = await request(app)
        .get('/api/budget-requests/non-existent-id/offers')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('no encontrada');
    });
  });

  describe('GET /api/budget-requests/inbox/:professionalId - Get Professional Inbox', () => {
    let testRequest, testResponse;

    beforeEach(async () => {
      // Crear solicitud y respuesta pendiente
      testRequest = await prisma.cotizaciones.create({
        data: {
          cliente_id: testUser.id,
          descripcion: 'Test request for inbox',
          zona_cobertura: 'Test zone',
        },
      });

      testResponse = await prisma.cotizacion_respuestas.create({
        data: {
          cotizacion_id: testRequest.id,
          profesional_id: testProfessional.id,
          estado: 'PENDIENTE',
        },
      });
    });

    afterEach(async () => {
      if (testResponse) {
        await prisma.cotizacion_respuestas.delete({ where: { id: testResponse.id } });
      }
      if (testRequest) {
        await prisma.cotizaciones.delete({ where: { id: testRequest.id } });
      }
      testRequest = null;
      testResponse = null;
    });

    test('debe retornar bandeja del profesional correctamente', async () => {
      const response = await request(app)
        .get(`/api/budget-requests/inbox/${testProfessional.id}`)
        .set('Authorization', `Bearer ${profToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const inboxItem = response.body.find(item => item.id === testRequest.id);
      expect(inboxItem).toBeDefined();
      expect(inboxItem.descripcion).toBe('Test request for inbox');
      expect(inboxItem.mi_respuesta.estado).toBe('PENDIENTE');
    });

    test('debe rechazar acceso a bandeja de otro profesional (403)', async () => {
      const response = await request(app)
        .get(`/api/budget-requests/inbox/${testUser.id}`) // Usuario cliente intentando acceder
        .set('Authorization', `Bearer ${profToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('No tienes permiso');
    });
  });

  describe('POST /api/budget-requests/:id/offers - Create Offer', () => {
    let testRequest, testResponse;

    beforeEach(async () => {
      // Crear solicitud y respuesta pendiente
      testRequest = await prisma.cotizaciones.create({
        data: {
          cliente_id: testUser.id,
          descripcion: 'Test request for offer',
          zona_cobertura: 'Test zone',
        },
      });

      testResponse = await prisma.cotizacion_respuestas.create({
        data: {
          cotizacion_id: testRequest.id,
          profesional_id: testProfessional.id,
          estado: 'PENDIENTE',
        },
      });
    });

    afterEach(async () => {
      if (testResponse) {
        await prisma.cotizacion_respuestas.delete({ where: { id: testResponse.id } });
      }
      if (testRequest) {
        await prisma.cotizaciones.delete({ where: { id: testRequest.id } });
      }
      testRequest = null;
      testResponse = null;
    });

    test('debe crear oferta exitosamente (REQ-33)', async () => {
      const response = await request(app)
        .post(`/api/budget-requests/${testRequest.id}/offers`)
        .set('Authorization', `Bearer ${profToken}`)
        .send({
          precio: 2500,
          comentario: 'Precio competitivo por el trabajo',
        });

      expect(response.status).toBe(200);
      expect(response.body.precio).toBe(2500);
      expect(response.body.comentario).toBe('Precio competitivo por el trabajo');
      expect(response.body.estado).toBe('ACEPTADO');

      // Verificar que se actualizó en la base de datos
      const updatedResponse = await prisma.cotizacion_respuestas.findUnique({
        where: { id: testResponse.id },
      });

      expect(updatedResponse.estado).toBe('ACEPTADO');
      expect(updatedResponse.precio).toBe(2500);
      expect(updatedResponse.respondido_en).toBeDefined();
    });

    test('debe rechazar oferta sin precio válido (400)', async () => {
      const response = await request(app)
        .post(`/api/budget-requests/${testRequest.id}/offers`)
        .set('Authorization', `Bearer ${profToken}`)
        .send({
          precio: 'invalid-price',
          comentario: 'Test comment',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('precio válido');
    });

    test('debe rechazar oferta para solicitud ya respondida (400)', async () => {
      // Marcar como respondida
      await prisma.cotizacion_respuestas.update({
        where: { id: testResponse.id },
        data: { estado: 'ACEPTADO' },
      });

      const response = await request(app)
        .post(`/api/budget-requests/${testRequest.id}/offers`)
        .set('Authorization', `Bearer ${profToken}`)
        .send({
          precio: 3000,
          comentario: 'Otra oferta',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('ya ha sido respondida');
    });

    test('debe rechazar oferta de cliente en lugar de profesional (403)', async () => {
      const response = await request(app)
        .post(`/api/budget-requests/${testRequest.id}/offers`)
        .set('Authorization', `Bearer ${testToken}`) // Token de cliente
        .send({
          precio: 3000,
          comentario: 'Oferta de cliente',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Solo los profesionales');
    });
  });
});
