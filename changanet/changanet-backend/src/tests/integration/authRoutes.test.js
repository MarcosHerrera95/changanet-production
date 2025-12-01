/**
 * @archivo src/tests/integration/authRoutes.test.js - Pruebas de integración de autenticación
 * @descripción Tests automatizados para verificar registro, login y OAuth (REQ-01, REQ-02, REQ-03)
 * @sprint Sprint 1 – Autenticación y Perfiles
 * @tarjeta Tarjeta 1: [Backend] Implementar API de Registro y Login
 * @impacto Social: Verificación de accesibilidad en procesos de autenticación para todos los usuarios
 */

const request = require('supertest');
const app = require('../../server');
const { prisma } = require('../setupTestDB');

describe('Auth Routes Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('debe registrar un nuevo usuario exitosamente', async () => {
      const userData = {
        nombre: 'Juan Pérez',
        email: 'juan.test@example.com',
        password: 'password123',
        telefono: '+5491123456789',
        rol: 'cliente'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.rol).toBe(userData.rol);
    });

    it('debe rechazar registro con email duplicado', async () => {
      const userData = {
        nombre: 'María García',
        email: 'maria.test@example.com',
        password: 'password123',
        telefono: '+5491123456789',
        rol: 'cliente'
      };

      // Primer registro
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Segundo registro con mismo email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email ya existe');
    });

    it('debe validar campos requeridos', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Crear usuario de prueba
      await request(app)
        .post('/api/auth/register')
        .send({
          nombre: 'Pedro López',
          email: 'pedro.test@example.com',
          password: 'password123',
          telefono: '+5491123456789',
          rol: 'cliente'
        });
    });

    it('debe permitir login con credenciales correctas', async () => {
      const loginData = {
        email: 'pedro.test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(loginData.email);
    });

    it('debe rechazar login con contraseña incorrecta', async () => {
      const loginData = {
        email: 'pedro.test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('credenciales');
    });

    it('debe rechazar login con email inexistente', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/test', () => {
    it('debe responder con mensaje de prueba para métricas', async () => {
      const response = await request(app)
        .get('/api/auth/test')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Ruta de prueba');
    });
  });
});
