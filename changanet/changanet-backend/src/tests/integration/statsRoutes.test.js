// src/tests/integration/statsRoutes.test.js
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const app = require('../../server');

const prisma = new PrismaClient();

describe('Stats Routes Integration', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Crear usuario de prueba
    testUser = await prisma.usuarios.create({
      data: {
        email: 'stats-test@example.com',
        nombre: 'Stats Test User',
        hash_contrasena: 'hashed_password',
        rol: 'cliente',
        esta_verificado: true
      }
    });

    // Generar token JWT
    authToken = jwt.sign(
      { userId: testUser.id, role: testUser.rol },
      process.env.JWT_SECRET,
      { expiresIn: '24h', algorithm: 'HS256' }
    );
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await prisma.resenas.deleteMany({});
    await prisma.cotizaciones.deleteMany({});
    await prisma.servicios.deleteMany({});
    await prisma.usuarios.deleteMany({});

    await prisma.$disconnect();
  });

  describe('GET /api/client/stats', () => {
    it('should return client stats with authentication', async () => {
      const response = await request(app)
        .get('/api/client/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('totalServices');
      expect(response.body.data).toHaveProperty('pendingQuotes');
      expect(response.body.data).toHaveProperty('completedServices');
      expect(response.body.data).toHaveProperty('totalSpent');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/client/stats')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/client/activity', () => {
    it('should return client activity with authentication', async () => {
      const response = await request(app)
        .get('/api/client/activity')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/client/activity')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/professionals/stats', () => {
    it('should return professional stats with authentication', async () => {
      const response = await request(app)
        .get('/api/professionals/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('totalServices');
      expect(response.body.data).toHaveProperty('pendingQuotes');
      expect(response.body.data).toHaveProperty('completedServices');
      expect(response.body.data).toHaveProperty('totalEarnings');
      expect(response.body.data).toHaveProperty('averageRating');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/professionals/stats')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/professionals/activity', () => {
    it('should return professional activity with authentication', async () => {
      const response = await request(app)
        .get('/api/professionals/activity')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/professionals/activity')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});
