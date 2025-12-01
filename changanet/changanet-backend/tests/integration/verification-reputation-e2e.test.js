/**
 * Pruebas End-to-End completas para flujo de verificación y reputación
 * Cubre: REQ-36 a REQ-40 - Flujo completo desde subida de documento hasta ranking final
 * Simula experiencia completa del usuario profesional
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { createTestUser, createTestAdmin, cleanupTestData } = require('../helpers/testHelpers');

const prisma = new PrismaClient();

describe('Verification & Reputation End-to-End Tests', () => {
  let app;
  let server;
  let testProfessional, testAdmin, testClients;
  let professionalToken, adminToken, clientTokens;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';

    const { createServer } = require('../../src/server');
    server = createServer();
    app = server;

    // Crear usuario profesional
    testProfessional = await createTestUser({
      rol: 'profesional',
      perfil_profesional: {
        create: {
          especialidad: 'plomero',
          zona_cobertura: 'Buenos Aires',
          anos_experiencia: 5,
          tarifa_hora: 1500
        }
      }
    });

    // Crear administrador
    testAdmin = await createTestAdmin();

    // Crear 5 clientes para reseñas
    testClients = [];
    clientTokens = [];
    for (let i = 0; i < 5; i++) {
      const client = await createTestUser({ rol: 'cliente' });
      testClients.push(client);

      const loginClient = await request(app)
        .post('/api/auth/login')
        .send({ email: client.email, password: 'testpass123' });
      clientTokens.push(loginClient.body.data.token);
    }

    // Login profesional y admin
    const loginProfessional = await request(app)
      .post('/api/auth/login')
      .send({ email: testProfessional.email, password: 'testpass123' });
    professionalToken = loginProfessional.body.data.token;

    const loginAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: testAdmin.email, password: 'testpass123' });
    adminToken = loginAdmin.body.data.token;
  });

  afterAll(async () => {
    const allUserIds = [testProfessional.id, testAdmin.id, ...testClients.map(c => c.id)];
    await cleanupTestData(allUserIds);
    await prisma.$disconnect();
    if (server) server.close();
  });

  describe('Flujo Completo E2E: Profesional → Verificación → Servicios → Reputación → Ranking', () => {

    test('Paso 1: Profesional sube documento de identidad (REQ-36)', async () => {
      // Generar URL presignada
      const presignedResponse = await request(app)
        .post('/api/verification/presigned-url')
        .set('Authorization', `Bearer ${professionalToken}`)
        .send({
          fileName: 'dni-frente.pdf',
          fileType: 'application/pdf'
        });

      expect(presignedResponse.status).toBe(200);
      expect(presignedResponse.body.success).toBe(true);
      expect(presignedResponse.body.presignedUrl).toBeDefined();
      expect(presignedResponse.body.fileKey).toBeDefined();

      const fileKey = presignedResponse.body.fileKey;

      // Simular subida del documento (en producción se haría con el presigned URL)
      // Aquí simulamos la creación de la solicitud de verificación
      const submitResponse = await request(app)
        .post('/api/verification/submit')
        .set('Authorization', `Bearer ${professionalToken}`)
        .send({ fileKey });

      expect(submitResponse.status).toBe(201);
      expect(submitResponse.body.success).toBe(true);
      expect(submitResponse.body.data.estado).toBe('pendiente');
      expect(submitResponse.body.data.documento_url).toBe(fileKey);

      // Verificar que se creó registro de auditoría
      const auditLogs = await prisma.audit_logs.findMany({
        where: {
          usuario_id: testProfessional.id,
          accion: 'upload_document'
        },
        orderBy: { creado_en: 'desc' },
        take: 1
      });

      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].exito).toBe(true);
    });

    test('Paso 2: Administrador aprueba verificación (REQ-37, REQ-40)', async () => {
      // Obtener solicitud pendiente
      const statusResponse = await request(app)
        .get('/api/verification/status')
        .set('Authorization', `Bearer ${professionalToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.data.estado).toBe('pendiente');

      const requestId = statusResponse.body.data.id;

      // Administrador lista solicitudes pendientes
      const pendingResponse = await request(app)
        .get('/api/admin/verification/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(pendingResponse.status).toBe(200);
      expect(pendingResponse.body.data.length).toBeGreaterThan(0);

      // Administrador aprueba la solicitud
      const approveResponse = await request(app)
        .patch(`/api/admin/verification/${requestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          comentario: 'Documento DNI válido. Verificación completada exitosamente.'
        });

      expect(approveResponse.status).toBe(200);
      expect(approveResponse.body.success).toBe(true);

      // Verificar que el usuario ahora está verificado
      const user = await prisma.usuarios.findUnique({
        where: { id: testProfessional.id }
      });
      expect(user.esta_verificado).toBe(true);

      // Verificar perfil profesional actualizado
      const profile = await prisma.perfiles_profesionales.findUnique({
        where: { usuario_id: testProfessional.id }
      });
      expect(profile.estado_verificacion).toBe('verificado');
      expect(profile.verificado_en).toBeDefined();

      // Verificar insignia de verificación (REQ-37)
      const statusAfterApproval = await request(app)
        .get('/api/verification/status')
        .set('Authorization', `Bearer ${professionalToken}`);

      expect(statusAfterApproval.body.data.estado).toBe('aprobado');
    });

    test('Paso 3: Profesional completa servicios y recibe reseñas', async () => {
      // Crear servicios completados con reseñas
      for (let i = 0; i < 5; i++) {
        const service = await prisma.servicios.create({
          data: {
            cliente_id: testClients[i].id,
            profesional_id: testProfessional.id,
            descripcion: `Servicio de plomería ${i + 1}: Reparación de cañería`,
            estado: 'COMPLETADO',
            fecha_servicio: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
            precio_acordado: 2000 + (i * 500),
            es_urgente: i === 0 // Uno urgente
          }
        });

        // Crear reseña del cliente
        await prisma.resenas.create({
          data: {
            servicio_id: service.id,
            cliente_id: testClients[i].id,
            calificacion: 4 + (i % 2), // Alterna 4 y 5 estrellas
            comentario: `Excelente trabajo del profesional ${i + 1}. Muy recomendado.`,
            url_foto: i === 2 ? 'https://example.com/review-photo.jpg' : null // Una reseña con foto
          }
        });
      }
    });

    test('Paso 4: Sistema calcula reputación y asigna medallas (REQ-38, REQ-39)', async () => {
      // Forzar cálculo de reputación
      const reputationResponse = await request(app)
        .post('/api/reputation/update-own')
        .set('Authorization', `Bearer ${professionalToken}`);

      expect(reputationResponse.status).toBe(200);
      expect(reputationResponse.body.success).toBe(true);

      // Verificar reputación calculada
      const reputation = await prisma.reputation_scores.findUnique({
        where: { usuario_id: testProfessional.id }
      });

      expect(reputation).toBeDefined();
      expect(reputation.average_rating).toBeGreaterThan(4.0); // Promedio alto
      expect(reputation.completed_jobs).toBe(5);
      expect(reputation.ranking_score).toBeGreaterThan(0);

      // Verificar medallas asignadas automáticamente (REQ-38)
      const medals = await prisma.user_medals.findMany({
        where: {
          usuario_id: testProfessional.id,
          is_active: true
        }
      });

      expect(medals.length).toBeGreaterThanOrEqual(2); // Al menos verificación y trabajos completados

      // Verificar medalla de verificación
      const verificationMedal = medals.find(m => m.medal_type === 'verificado');
      expect(verificationMedal).toBeDefined();
      expect(verificationMedal.medal_name).toBe('Identidad Verificada');

      // Verificar medalla de trabajos completados
      const jobsMedal = medals.find(m => m.medal_type === 'trabajos_completados');
      expect(jobsMedal).toBeDefined();
      expect(jobsMedal.medal_name).toBe('Profesional Experto');
    });

    test('Paso 5: Profesional aparece en ranking global (REQ-39)', async () => {
      // Obtener ranking global
      const rankingResponse = await request(app)
        .get('/api/reputation/ranking?limit=20')
        .set('Authorization', `Bearer ${professionalToken}`);

      expect(rankingResponse.status).toBe(200);
      expect(rankingResponse.body.success).toBe(true);
      expect(Array.isArray(rankingResponse.body.data)).toBe(true);

      // Verificar que nuestro profesional está en el ranking
      const professionalInRanking = rankingResponse.body.data.find(
        p => p.usuario.id === testProfessional.id
      );

      expect(professionalInRanking).toBeDefined();
      expect(professionalInRanking.ranking_score).toBeGreaterThan(0);
      expect(professionalInRanking.global_ranking).toBeDefined();

      // Verificar que tiene la insignia de verificación visible
      expect(professionalInRanking.usuario.esta_verificado).toBe(true);
      expect(professionalInRanking.usuario.perfil_profesional.estado_verificacion).toBe('verificado');
    });

    test('Paso 6: Verificación de integridad y auditoría completa', async () => {
      // Verificar logs de auditoría completos
      const auditLogs = await prisma.audit_logs.findMany({
        where: { usuario_id: testProfessional.id },
        orderBy: { creado_en: 'asc' }
      });

      // Debería tener logs de: upload_document, approve_verification, view_reputation, etc.
      const uploadLog = auditLogs.find(log => log.accion === 'upload_document');
      const approvalLog = auditLogs.find(log => log.accion === 'approve_verification');
      const reputationLog = auditLogs.find(log => log.accion === 'view_reputation');

      expect(uploadLog).toBeDefined();
      expect(uploadLog.exito).toBe(true);

      expect(approvalLog).toBeDefined();
      expect(approvalLog.exito).toBe(true);
      expect(approvalLog.usuario_id).toBe(testAdmin.id); // Admin realizó la aprobación

      expect(reputationLog).toBeDefined();
      expect(reputationLog.exito).toBe(true);
    });
  });

  describe('Validación de Seguridad End-to-End', () => {
    let otherProfessional, otherProfessionalToken;

    beforeAll(async () => {
      // Crear otro profesional para pruebas de seguridad
      otherProfessional = await createTestUser({
        rol: 'profesional',
        perfil_profesional: {
          create: {
            especialidad: 'electricista',
            zona_cobertura: 'CABA'
          }
        }
      });

      const loginOther = await request(app)
        .post('/api/auth/login')
        .send({ email: otherProfessional.email, password: 'testpass123' });
      otherProfessionalToken = loginOther.body.data.token;
    });

    test('cliente no puede acceder a reputación de otros usuarios', async () => {
      const clientResponse = await request(app)
        .get(`/api/reputation/${testProfessional.id}`)
        .set('Authorization', `Bearer ${clientTokens[0]}`);

      expect(clientResponse.status).toBe(403);
      expect(clientResponse.body.error).toContain('No tienes permisos');
    });

    test('profesional no puede aprobar verificaciones', async () => {
      const statusResponse = await request(app)
        .get('/api/verification/status')
        .set('Authorization', `Bearer ${otherProfessionalToken}`);

      if (statusResponse.body.data?.id) {
        const approveResponse = await request(app)
          .patch(`/api/admin/verification/${statusResponse.body.data.id}/approve`)
          .set('Authorization', `Bearer ${otherProfessionalToken}`)
          .send({ comentario: 'Intento no autorizado' });

        expect(approveResponse.status).toBe(403);
      }
    });

    test('profesional solo puede ver su propia reputación detallada', async () => {
      // Profesional puede ver su reputación
      const ownReputationResponse = await request(app)
        .get(`/api/reputation/${testProfessional.id}`)
        .set('Authorization', `Bearer ${professionalToken}`);

      expect(ownReputationResponse.status).toBe(200);

      // Pero no puede ver reputación detallada de otros
      const otherReputationResponse = await request(app)
        .get(`/api/reputation/${otherProfessional.id}`)
        .set('Authorization', `Bearer ${professionalToken}`);

      expect(otherReputationResponse.status).toBe(403);
    });

    test('administrador puede acceder a todo', async () => {
      // Admin puede ver cualquier reputación
      const reputationResponse = await request(app)
        .get(`/api/reputation/${testProfessional.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(reputationResponse.status).toBe(200);

      // Admin puede ver solicitudes pendientes
      const pendingResponse = await request(app)
        .get('/api/admin/verification/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(pendingResponse.status).toBe(200);
    });
  });

  describe('Validación de Performance End-to-End', () => {
    test('tiempos de respuesta aceptables para operaciones críticas', async () => {
      const startTime = Date.now();

      // Medir tiempo de consulta de reputación
      await request(app)
        .get(`/api/reputation/${testProfessional.id}`)
        .set('Authorization', `Bearer ${professionalToken}`);

      const reputationTime = Date.now() - startTime;

      // Medir tiempo de consulta de ranking
      const rankingStart = Date.now();
      await request(app)
        .get('/api/reputation/ranking?limit=10')
        .set('Authorization', `Bearer ${professionalToken}`);

      const rankingTime = Date.now() - rankingStart;

      // Medir tiempo de consulta de estado de verificación
      const verificationStart = Date.now();
      await request(app)
        .get('/api/verification/status')
        .set('Authorization', `Bearer ${professionalToken}`);

      const verificationTime = Date.now() - verificationStart;

      console.log(`⏱️ Tiempos de respuesta E2E:`);
      console.log(`📊 Reputación: ${reputationTime}ms`);
      console.log(`🏆 Ranking: ${rankingTime}ms`);
      console.log(`✅ Verificación: ${verificationTime}ms`);

      // Validar tiempos aceptables (< 2 segundos)
      expect(reputationTime).toBeLessThan(2000);
      expect(rankingTime).toBeLessThan(2000);
      expect(verificationTime).toBeLessThan(2000);
    });
  });
});
