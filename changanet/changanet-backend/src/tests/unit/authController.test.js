// src/tests/unit/authController.test.js
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../../server');

const prisma = new PrismaClient();

describe('Auth Controller', () => {
  beforeEach(async () => {
    await prisma.usuarios.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123456',
        name: 'Test User',
        rol: 'cliente'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('Usuario registrado exitosamente. Revisa tu email para verificar la cuenta.');

      const user = await prisma.usuarios.findUnique({ where: { email: userData.email } });
      expect(user).toBeTruthy();
      expect(user.email).toBe(userData.email);
      expect(user.nombre).toBe(userData.name);
      expect(await bcrypt.compare(userData.password, user.hash_contrasena)).toBe(true);
    });

    it('should return 400 if email already exists', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: '123456',
        name: 'Duplicate User',
        rol: 'cliente'
      };

      // Crear usuario primero
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Intentar crearlo de nuevo
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.error).toBe('El email ya está registrado.');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login a user with valid credentials', async () => {
      const userData = {
        email: 'login@example.com',
        password: '123456',
        name: 'Login User',
        rol: 'cliente'
      };

      // Registrar usuario primero
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Verificar usuario (simulación)
      await prisma.usuarios.update({
        where: { email: userData.email },
        data: { esta_verificado: true }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid@example.com', password: 'wrong' })
        .expect(401);

      expect(response.body.error).toBe('Credenciales inválidas.');
    });
  });
});
