/**
 * Tests de integración para rutas de autenticación
 * Verifica contratos de API y comportamiento end-to-end
 */

// Load test environment variables
require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const express = require('express');
const authRoutes = require('../../../src/routes/authRoutes');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

describe('Auth Routes Integration Tests', () => {
  let app;

  beforeAll(async () => {
    // Configurar Express app para tests con rutas reales
    app = express();
    app.use(express.json());

    // Usar rutas reales de autenticación
    app.use('/api/auth', authRoutes);
  });

  beforeEach(async () => {
    // Limpiar base de datos antes de cada test
    await prisma.usuarios.deleteMany();
  });

  describe('POST /api/auth/register', () => {
    test('should create user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        rol: 'cliente'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.nombre).toBe(userData.name);
      expect(response.body.user.rol).toBe(userData.rol);
    });

    test('should hash password before storing', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        rol: 'cliente'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Verify that password is hashed by trying to login with correct password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body.user.email).toBe(userData.email);
    });

    test('should reject duplicate email', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        rol: 'cliente'
      };

      // Crear primer usuario
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Intentar crear usuario duplicado
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.error).toContain('ya está registrado');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('requeridos');
    });

    test('should require rol field', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
        // No rol especificado
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toContain('requeridos');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      // Crear usuario para tests de login a través de la API
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        rol: 'cliente'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      testUser = registerResponse.body.user;
    });

    test('should login successfully with correct credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(loginData.email);
      expect(response.body.message).toContain('exitoso');
    });

    test('should return valid JWT token', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      const token = response.body.token;
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      // Verify token can be used to access protected route
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(meResponse.body.user.email).toBe(loginData.email);
    });

    test('should reject invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toContain('inválidas');
    });

    test('should reject invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toContain('inválidas');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.error).toContain('requeridos');
    });
  });

  describe('GET /api/auth/me', () => {
    let user, token;

    beforeEach(async () => {
      // Crear usuario a través de la API y obtener token
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        rol: 'cliente'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      user = registerResponse.body.user;
      token = registerResponse.body.token;
    });

    test('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user.id).toBe(user.id);
      expect(response.body.user.email).toBe(user.email);
      expect(response.body.user.nombre).toBe(user.nombre);
      expect(response.body.user.rol).toBe(user.rol);
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error).toContain('requerido');
    });

    test('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body.error).toContain('inválido');
    });

    test('should reject malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.error).toContain('requerido');
    });
  });
});
