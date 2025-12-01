/**
 * Pruebas de integración para flujos completos de verificación de identidad y reputación
 * Cubre: REQ-36, REQ-37, REQ-38, REQ-39, REQ-40
 * Flujos: subida → revisión admin → aprobación/rechazo, ranking actualizado después de reseñas/trabajos
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { createTestUser, createTestAdmin, cleanupTestData } = require('../helpers/testHelpers');

const prisma = new PrismaClient();

describe('Verification & Reputation Integration Tests', () => {
  let app;
  let testUser, testAdmin, testProfessional;
  let server;

  beforeAll(async () => {
    // Importar app después de configurar variables de entorno de test
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/changanet_test';

    const { createServer } = require('../../src/server');
    server = createServer();
    app = server;

    // Crear usuarios de prueba
    testUser = await createTestUser({ rol: 'cliente' });
    testAdmin = await createTestAdmin();
    testProfessional = await createTestUser({
      rol: 'profesional',
      perfil_profesional: {
        create: {
          especialidad: 'plomero',
          zona_cobertura: 'Buenos Aires'
        }
      }
    });
  });

  afterAll(async () => {
    await cleanupTestData([testUser.id, testAdmin.id, testProfessional.id]);
    await prisma.$disconnect();
    if (server) {
      server.close();
    }
  });

  describe('Flujo Completo de Verificación de Identidad', () => {
    let verificationRequestId;
    let accessTokenProfessional, accessTokenAdmin;

    beforeAll(async () => {
      // Login para obtener tokens
      const loginProfessional = await request(app)
        .post('/api/auth/login')
        .send({ email: testProfessional.email, password: 'testpass123' });
      accessTokenProfessional = loginProfessional.body.data.token;

      const loginAdmin = await request(app)
        .post('/api/auth/login')
        .send({ email: testAdmin.email, password: 'testpass123' });
      accessTokenAdmin = loginAdmin.body.data.token;
    });

    test('debe crear solicitud de verificación exitosamente', async () => {
      // Simular subida de documento primero
      const mockFileKey = `verification/${testProfessional.id}/test-document.pdf`;

      const response = await request(app)
        .post('/api/verification/submit')
        .set('Authorization', `Bearer ${accessTokenProfessional}`)
        .send({ fileKey: mockFileKey });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.estado).toBe('pendiente');
      expect(response.body.data.documento_url).toBe(mockFileKey);

      verificationRequestId = response.body.data.id;
    });

    test('debe obtener estado de verificación del usuario', async () => {
      const response = await request(app)
        .get('/api/verification/status')
        .set('Authorization', `Bearer ${accessTokenProfessional}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.estado).toBe('pendiente');
      expect(response.body.data.id).toBe(verificationRequestId);
    });

    test('debe listar solicitudes pendientes para administradores', async () => {
      const response = await request(app)
        .get('/api/admin/verification/pending')
        .set('Authorization', `Bearer ${accessTokenAdmin}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verificar que la solicitud del profesional esté en la lista
      const userRequest = response.body.data.find(req => req.usuario_id === testProfessional.id);
      expect(userRequest).toBeDefined();
      expect(userRequest.estado).toBe('pendiente');
    });

    test('debe aprobar solicitud de verificación', async () => {
      const response = await request(app)
        .patch(`/api/admin/verification/${verificationRequestId}/approve`)
        .set('Authorization', `Bearer ${accessTokenAdmin}`)
        .send({ comentario: 'Documento válido y legible' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Verificación aprobada correctamente');
    });

    test('debe actualizar estado de verificación después de aprobación', async () => {
      const response = await request(app)
        .get('/api/verification/status')
        .set('Authorization', `Bearer ${accessTokenProfessional}`);

      expect(response.status).toBe(200);
      expect(response.body.data.estado).toBe('aprobado');
      expect(response.body.data.comentario_admin).toBe('Documento válido y legible');
    });

    test('debe verificar que el usuario esté marcado como verificado', async () => {
      const user = await prisma.usuarios.findUnique({
        where: { id: testProfessional.id }
      });

      expect(user.esta_verificado).toBe(true);
    });

    test('debe asignar medalla de verificación automáticamente', async () => {
      const medals = await prisma.user_medals.findMany({
        where: {
          usuario_id: testProfessional.id,
          medal_type: 'verificado',
          is_active: true
        }
      });

      expect(medals.length).toBe(1);
      expect(medals[0].medal_name).toBe('Identidad Verificada');
    });
  });

  describe('Flujo de Rechazo de Verificación y Reintento', () => {
    let rejectedRequestId;
    let accessTokenProfessional2, accessTokenAdmin;
    let testProfessional2;

    beforeAll(async () => {
      // Crear otro profesional para este flujo
      testProfessional2 = await createTestUser({
        rol: 'profesional',
        perfil_profesional: {
          create: {
            especialidad: 'electricista',
            zona_cobertura: 'CABA'
          }
        }
      });

      // Login
      const loginProfessional2 = await request(app)
        .post('/api/auth/login')
        .send({ email: testProfessional2.email, password: 'testpass123' });
      accessTokenProfessional2 = loginProfessional2.body.data.token;

      const loginAdmin = await request(app)
        .post('/api/auth/login')
        .send({ email: testAdmin.email, password: 'testpass123' });
      accessTokenAdmin = loginAdmin.body.data.token;

      // Crear solicitud que será rechazada
      const mockFileKey = `verification/${testProfessional2.id}/bad-document.pdf`;

      const createResponse = await request(app)
        .post('/api/verification/submit')
        .set('Authorization', `Bearer ${accessTokenProfessional2}`)
        .send({ fileKey: mockFileKey });

      rejectedRequestId = createResponse.body.data.id;
    });

    test('debe rechazar solicitud de verificación', async () => {
      const response = await request(app)
        .patch(`/api/admin/verification/${rejectedRequestId}/reject`)
        .set('Authorization', `Bearer ${accessTokenAdmin}`)
        .send({ comentario: 'Documento ilegible, subir imagen más clara' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Verificación rechazada correctamente');
    });

    test('debe actualizar estado después de rechazo', async () => {
      const response = await request(app)
        .get('/api/verification/status')
        .set('Authorization', `Bearer ${accessTokenProfessional2}`);

      expect(response.status).toBe(200);
      expect(response.body.data.estado).toBe('rechazado');
      expect(response.body.data.comentario_admin).toBe('Documento ilegible, subir imagen más clara');
    });

    test('debe permitir crear nueva solicitud después de rechazo', async () => {
      const newFileKey = `verification/${testProfessional.id}/corrected-document.pdf`;

      const response = await request(app)
        .post('/api/verification/submit')
        .set('Authorization', `Bearer ${accessTokenProfessional2}`)
        .send({ fileKey: newFileKey });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.estado).toBe('pendiente');
    });
  });

  describe('Sistema de Reputación y Rankings', () => {
    let accessTokenProfessional, accessTokenClient;

    beforeAll(async () => {
      // Crear cliente para reseñas
      const testClient = await createTestUser({ rol: 'cliente' });

      // Login
      const loginProfessional = await request(app)
        .post('/api/auth/login')
        .send({ email: testProfessional.email, password: 'testpass123' });
      accessTokenProfessional = loginProfessional.body.data.token;

      const loginClient = await request(app)
        .post('/api/auth/login')
        .send({ email: testClient.email, password: 'testpass123' });
      accessTokenClient = loginClient.body.data.token;

      // Crear algunos servicios completados para el profesional
      await prisma.servicios.create({
        data: {
          cliente_id: testClient.id,
          profesional_id: testProfessional.id,
          estado: 'COMPLETADO',
          fecha_servicio: new Date(),
          precio_acordado: 1000
        }
      });

      // Crear reseñas
      await prisma.resenas.create({
        data: {
          servicio_id: (await prisma.servicios.findFirst({
            where: { profesional_id: testProfessional.id }
          })).id,
          calificacion: 5,
          comentario: 'Excelente trabajo'
        }
      });
    });

    test('debe calcular y mostrar reputación del profesional', async () => {
      const response = await request(app)
        .get(`/api/reputation/${testProfessional.id}`)
        .set('Authorization', `Bearer ${accessTokenProfessional}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reputation).toBeDefined();
      expect(response.body.data.reputation.average_rating).toBeDefined();
      expect(response.body.data.reputation.ranking_score).toBeDefined();
    });

    test('debe mostrar ranking global', async () => {
      const response = await request(app)
        .get('/api/reputation/ranking')
        .set('Authorization', `Bearer ${accessTokenProfessional}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toBeDefined();
    });

    test('debe actualizar reputación manualmente', async () => {
      const response = await request(app)
        .post('/api/reputation/update-own')
        .set('Authorization', `Bearer ${accessTokenProfessional}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Tu reputación ha sido actualizada');
    });

    test('debe asignar medallas automáticamente por logros', async () => {
      // Crear más servicios para alcanzar medalla de trabajos completados
      for (let i = 0; i < 55; i++) {
        await prisma.servicios.create({
          data: {
            cliente_id: testUser.id,
            profesional_id: testProfessional.id,
            estado: 'COMPLETADO',
            fecha_servicio: new Date(),
            precio_acordado: 1000
          }
        });
      }

      // Actualizar reputación para activar medallas
      await request(app)
        .post('/api/reputation/update-own')
        .set('Authorization', `Bearer ${accessTokenProfessional}`);

      // Verificar medallas
      const medalsResponse = await request(app)
        .get(`/api/reputation/${testProfessional.id}/medals`)
        .set('Authorization', `Bearer ${accessTokenProfessional}`);

      expect(medalsResponse.status).toBe(200);
      expect(Array.isArray(medalsResponse.body.data)).toBe(true);
      // Debería tener al menos la medalla de verificación y trabajos completados
      expect(medalsResponse.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Permisos y Seguridad', () => {
    let accessTokenClient, accessTokenProfessional;

    beforeAll(async () => {
      const loginClient = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'testpass123' });
      accessTokenClient = loginClient.body.data.token;

      const loginProfessional = await request(app)
        .post('/api/auth/login')
        .send({ email: testProfessional.email, password: 'testpass123' });
      accessTokenProfessional = loginProfessional.body.data.token;
    });

    test('debe rechazar acceso de clientes a lista de verificaciones pendientes', async () => {
      const response = await request(app)
        .get('/api/admin/verification/pending')
        .set('Authorization', `Bearer ${accessTokenClient}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Acceso denegado');
    });

    test('debe rechazar acceso de profesionales a aprobación de verificaciones', async () => {
      const response = await request(app)
        .patch('/api/admin/verification/123/approve')
        .set('Authorization', `Bearer ${accessTokenProfessional}`)
        .send({ comentario: 'Aprobado' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Acceso denegado');
    });

    test('debe rechazar acceso de clientes a reputación de otros usuarios', async () => {
      const response = await request(app)
        .get(`/api/reputation/${testProfessional.id}`)
        .set('Authorization', `Bearer ${accessTokenClient}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('No tienes permisos');
    });

    test('debe permitir acceso de profesionales a su propia reputación', async () => {
      const response = await request(app)
        .get(`/api/reputation/${testProfessional.id}`)
        .set('Authorization', `Bearer ${accessTokenProfessional}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Casos Edge y Validación', () => {
    let accessTokenProfessional;

    beforeAll(async () => {
      const loginProfessional = await request(app)
        .post('/api/auth/login')
        .send({ email: testProfessional.email, password: 'testpass123' });
      accessTokenProfessional = loginProfessional.body.data.token;
    });

    test('debe rechazar solicitud de verificación sin fileKey', async () => {
      const response = await request(app)
        .post('/api/verification/submit')
        .set('Authorization', `Bearer ${accessTokenProfessional}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Se requiere fileKey');
    });

    test('debe rechazar aprobación de solicitud ya procesada', async () => {
      // Crear y aprobar una solicitud primero
      const mockFileKey = `verification/${testProfessional.id}/duplicate-test.pdf`;

      const createResponse = await request(app)
        .post('/api/verification/submit')
        .set('Authorization', `Bearer ${accessTokenProfessional}`)
        .send({ fileKey: mockFileKey });

      const requestId = createResponse.body.data.id;

      // Login admin para este test
      const loginAdmin = await request(app)
        .post('/api/auth/login')
        .send({ email: testAdmin.email, password: 'testpass123' });
      const adminToken = loginAdmin.body.data.token;

      // Aprobar
      await request(app)
        .patch(`/api/admin/verification/${requestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ comentario: 'Aprobado' });

      // Intentar aprobar nuevamente
      const response = await request(app)
        .patch(`/api/admin/verification/${requestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ comentario: 'Duplicado' });

      expect(response.status).toBe(500); // Error del servicio
    });

    test('debe manejar límite de ranking correctamente', async () => {
      const response = await request(app)
        .get('/api/reputation/ranking?limit=50')
        .set('Authorization', `Bearer ${accessTokenProfessional}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(50);
      expect(response.body.meta.limit).toBe(50);
    });

    test('debe rechazar límite de ranking inválido', async () => {
      const response = await request(app)
        .get('/api/reputation/ranking?limit=1500')
        .set('Authorization', `Bearer ${accessTokenProfessional}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('El límite debe estar entre 1 y 1000');
    });
  });
});
