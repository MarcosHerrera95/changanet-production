// src/tests/integration/authFlow.test.js
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../../server');

const prisma = new PrismaClient();

describe('Auth Flow Integration', () => {
  const userData = {
    email: `integration${Date.now()}@example.com`,
    password: '123456',
    name: 'Integration Test User',
    role: 'cliente'
  };

  beforeEach(async () => {
    await prisma.usuarios.deleteMany({ where: { email: { startsWith: 'integration' } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should complete full registration and login flow', async () => {
    // 1. Register
    await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    // 2. Verify user (simulate)
    await prisma.usuarios.update({
      where: { email: userData.email },
      data: { esta_verificado: true }
    });

    // 3. Login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: userData.email, password: userData.password })
      .expect(200);

    expect(loginResponse.body.token).toBeDefined();
    expect(loginResponse.body.user.email).toBe(userData.email);

    // 4. Use token to access protected route
    const profileResponse = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${loginResponse.body.token}`)
      .expect(200);

    expect(profileResponse.body.usuario).toBeDefined();
    expect(profileResponse.body.usuario.id).toBe(loginResponse.body.user.id);
  });
});
