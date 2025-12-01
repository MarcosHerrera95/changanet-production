/**
 * @archivo src/tests/integration/serviceRoutes.test.js - Pruebas de integración de servicios
 * @descripción Tests automatizados para verificar agendamiento y gestión de servicios (REQ-07, REQ-08, REQ-09)
 * @sprint Sprint 3 – Servicios y Transacciones
 * @tarjeta Tarjeta 5: [Backend] Implementar API de Servicios y Agendamiento
 * @impacto Económico: Verificación de procesos transaccionales seguros y confiables
 */

const request = require('supertest');
const app = require('../../server');
const { prisma } = require('../setupTestDB');

describe('Service Routes Integration Tests', () => {
  let clientToken, professionalToken;
  let clientId, professionalId;

  beforeEach(async () => {
    // Crear usuario cliente
    const clientResponse = await request(app)
      .post('/api/auth/register')
      .send({
        nombre: 'Ana Cliente',
        email: 'ana.cliente@example.com',
        password: 'password123',
        telefono: '+5491123456789',
        rol: 'cliente'
      });

    clientId = clientResponse.body.user.id;

    // Login cliente
    const clientLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'ana.cliente@example.com',
        password: 'password123'
      });

    clientToken = clientLogin.body.token;

    // Crear usuario profesional
    const professionalResponse = await request(app)
      .post('/api/auth/register')
      .send({
        nombre: 'Carlos Profesional',
        email: 'carlos.profesional@example.com',
        password: 'password123',
        telefono: '+5491123456789',
        rol: 'profesional'
      });

    professionalId = professionalResponse.body.user.id;

    // Login profesional
    const professionalLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'carlos.profesional@example.com',
        password: 'password123'
      });

    professionalToken = professionalLogin.body.token;
  });

  describe('POST /api/services', () => {
    it('debe permitir agendar un servicio a un cliente autenticado', async () => {
      const serviceData = {
        titulo: 'Reparación de electrodomésticos',
        descripcion: 'Reparar lavadora que no centrifuga',
        categoria: 'mantenimiento_hogar',
        precio_estimado: 1500,
        fecha_solicitada: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mañana
        ubicacion: 'Buenos Aires, Argentina',
        impacto_social: 'ayuda_familiar',
        impacto_economico: 'generacion_ingresos',
        impacto_ambiental: 'reutilizacion'
      };

      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(serviceData)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('service');
      expect(response.body.service.titulo).toBe(serviceData.titulo);
      expect(response.body.service.estado).toBe('pendiente');
      expect(response.body.service.cliente_id).toBe(clientId);
    });

    it('debe rechazar agendamiento sin autenticación', async () => {
      const serviceData = {
        titulo: 'Servicio de prueba',
        descripcion: 'Descripción de prueba',
        categoria: 'limpieza',
        precio_estimado: 1000
      };

      const response = await request(app)
        .post('/api/services')
        .send(serviceData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('debe validar campos requeridos', async () => {
      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/services/client', () => {
    beforeEach(async () => {
      // Crear un servicio para el cliente
      await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          titulo: 'Servicio de prueba cliente',
          descripcion: 'Descripción de prueba',
          categoria: 'limpieza',
          precio_estimado: 1000,
          fecha_solicitada: new Date().toISOString(),
          ubicacion: 'Buenos Aires',
          impacto_social: 'ayuda_familiar',
          impacto_economico: 'generacion_ingresos',
          impacto_ambiental: 'reutilizacion'
        });
    });

    it('debe retornar servicios del cliente autenticado', async () => {
      const response = await request(app)
        .get('/api/services/client')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('titulo');
      expect(response.body[0]).toHaveProperty('estado');
      expect(response.body[0].cliente_id).toBe(clientId);
    });

    it('debe rechazar acceso sin autenticación', async () => {
      const response = await request(app)
        .get('/api/services/client')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/services/professional', () => {
    beforeEach(async () => {
      // Crear un servicio disponible para profesionales
      await prisma.servicios.create({
        data: {
          titulo: 'Servicio disponible',
          descripcion: 'Servicio disponible para profesionales',
          categoria: 'limpieza',
          precio_estimado: 1000,
          fecha_solicitada: new Date().toISOString(),
          ubicacion: 'Buenos Aires',
          estado: 'disponible',
          cliente_id: clientId,
          impacto_social: 'ayuda_familiar',
          impacto_economico: 'generacion_ingresos',
          impacto_ambiental: 'reutilizacion'
        }
      });
    });

    it('debe retornar servicios disponibles para profesionales', async () => {
      const response = await request(app)
        .get('/api/services/professional')
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('titulo');
      expect(response.body[0]).toHaveProperty('estado');
    });

    it('debe rechazar acceso sin autenticación', async () => {
      const response = await request(app)
        .get('/api/services/professional')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/services/:serviceId/status', () => {
    let serviceId;

    beforeEach(async () => {
      // Crear un servicio asignado al profesional
      const service = await prisma.servicios.create({
        data: {
          titulo: 'Servicio para actualizar',
          descripcion: 'Servicio para pruebas de actualización',
          categoria: 'limpieza',
          precio_estimado: 1000,
          fecha_solicitada: new Date().toISOString(),
          ubicacion: 'Buenos Aires',
          estado: 'asignado',
          cliente_id: clientId,
          profesional_id: professionalId,
          impacto_social: 'ayuda_familiar',
          impacto_economico: 'generacion_ingresos',
          impacto_ambiental: 'reutilizacion'
        }
      });
      serviceId = service.id;
    });

    it('debe permitir actualizar estado del servicio', async () => {
      const updateData = {
        estado: 'completado',
        precio_final: 1200
      };

      const response = await request(app)
        .put(`/api/services/${serviceId}/status`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('service');
      expect(response.body.service.estado).toBe(updateData.estado);
      expect(response.body.service.precio_final).toBe(updateData.precio_final);
    });

    it('debe rechazar actualización sin autenticación', async () => {
      const updateData = { estado: 'completado' };

      const response = await request(app)
        .put(`/api/services/${serviceId}/status`)
        .send(updateData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('debe rechazar actualización de servicio inexistente', async () => {
      const updateData = { estado: 'completado' };

      const response = await request(app)
        .put('/api/services/99999/status')
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});
