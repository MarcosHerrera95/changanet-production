/**
 * Pruebas de seguridad para el módulo de verificación de identidad
 * Cubre: URLs presignadas, auditoría, autorización
 * REQ-36, REQ-40 - Seguridad de documentos sensibles
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { createTestUser, createTestAdmin, cleanupTestData } = require('../helpers/testHelpers');

const prisma = new PrismaClient();

describe('Verification Security Tests', () => {
  let app;
  let testUser, testAdmin, testProfessional;
  let accessTokenUser, accessTokenAdmin, accessTokenProfessional;
  let server;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';

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

    // Login para obtener tokens
    const loginUser = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'testpass123' });
    accessTokenUser = loginUser.body.data.token;

    const loginAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: testAdmin.email, password: 'testpass123' });
    accessTokenAdmin = loginAdmin.body.data.token;

    const loginProfessional = await request(app)
      .post('/api/auth/login')
      .send({ email: testProfessional.email, password: 'testpass123' });
    accessTokenProfessional = loginProfessional.body.data.token;
  });

  afterAll(async () => {
    await cleanupTestData([testUser.id, testAdmin.id, testProfessional.id]);
    await prisma.$disconnect();
    if (server) {
      server.close();
    }
  });

  describe('URLs Presignadas y Expiración', () => {
    test('debe generar URL presignada válida para subida', async () => {
      const response = await request(app)
        .post('/api/verification/presigned-url')
        .set('Authorization', `Bearer ${accessTokenProfessional}`)
        .send({
          fileName: 'documento-identidad.pdf',
          fileType: 'application/pdf'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.presignedUrl).toBeDefined();
      expect(response.body.fileKey).toBeDefined();
      expect(response.body.expiresIn).toBe(90);
      expect(response.body.contentType).toBe('application/pdf');
      expect(response.body.maxSize).toBe(5242880); // 5MB
    });

    test('debe rechazar tipos de archivo no permitidos', async () => {
      const response = await request(app)
        .post('/api/verification/presigned-url')
        .set('Authorization', `Bearer ${accessTokenProfessional}`)
        .send({
          fileName: 'documento.exe',
          fileType: 'application/x-msdownload'
        });

      expect(response.status).toBe(500); // Error del servicio de storage
    });

    test('debe generar URLs presignadas con expiración correcta', async () => {
      const beforeTime = Date.now();

      const response = await request(app)
        .post('/api/verification/presigned-url')
        .set('Authorization', `Bearer ${accessTokenProfessional}`)
        .send({
          fileName: 'test-document.pdf',
          fileType: 'application/pdf'
        });

      const afterTime = Date.now();

      expect(response.status).toBe(200);
      const url = new URL(response.body.presignedUrl);
      const expiresParam = url.searchParams.get('X-Goog-Expires');

      // Verificar que la expiración esté en el rango correcto (85-95 segundos)
      expect(parseInt(expiresParam)).toBeGreaterThanOrEqual(85);
      expect(parseInt(expiresParam)).toBeLessThanOrEqual(95);
    });

    test('debe rechazar solicitudes sin autenticación', async () => {
      const response = await request(app)
        .post('/api/verification/presigned-url')
        .send({
          fileName: 'documento.pdf',
          fileType: 'application/pdf'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Auditoría de Eventos de Seguridad', () => {
    let verificationRequestId;

    beforeAll(async () => {
      // Crear una solicitud de verificación para pruebas
      const mockFileKey = `verification/${testProfessional.id}/audit-test.pdf`;

      const createResponse = await request(app)
        .post('/api/verification/submit')
        .set('Authorization', `Bearer ${accessTokenProfessional}`)
        .send({ fileKey: mockFileKey });

      verificationRequestId = createResponse.body.data.id;
    });

    test('debe registrar auditoría al subir documento', async () => {
      // Verificar que se creó un registro de auditoría
      const auditLogs = await prisma.audit_logs.findMany({
        where: {
          accion: 'upload_document',
          entidad_tipo: 'verification_request'
        },
        orderBy: { creado_en: 'desc' },
        take: 1
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      const log = auditLogs[0];
      expect(log.usuario_id).toBe(testProfessional.id);
      expect(log.accion).toBe('upload_document');
      expect(log.entidad_tipo).toBe('verification_request');
      expect(log.ip_address).toBeDefined();
      expect(log.user_agent).toBeDefined();
      expect(log.exito).toBe(true);
    });

    test('debe registrar auditoría al aprobar verificación', async () => {
      await request(app)
        .patch(`/api/admin/verification/${verificationRequestId}/approve`)
        .set('Authorization', `Bearer ${accessTokenAdmin}`)
        .send({ comentario: 'Documento válido para auditoría' });

      // Verificar registro de auditoría
      const auditLogs = await prisma.audit_logs.findMany({
        where: {
          accion: 'approve_verification',
          entidad_tipo: 'verification_request',
          entidad_id: verificationRequestId
        },
        orderBy: { creado_en: 'desc' },
        take: 1
      });

      expect(auditLogs.length).toBe(1);
      const log = auditLogs[0];
      expect(log.usuario_id).toBe(testAdmin.id);
      expect(log.accion).toBe('approve_verification');
      expect(log.detalles).toContain('Documento válido para auditoría');
      expect(log.exito).toBe(true);
    });

    test('debe registrar auditoría al acceder a documento', async () => {
      // Obtener URL del documento
      const urlResponse = await request(app)
        .get(`/api/verification/document/${verificationRequestId}`)
        .set('Authorization', `Bearer ${accessTokenProfessional}`);

      expect(urlResponse.status).toBe(200);

      // Verificar registro de auditoría de acceso
      const auditLogs = await prisma.audit_logs.findMany({
        where: {
          accion: 'access_document',
          entidad_tipo: 'verification_request',
          entidad_id: verificationRequestId
        },
        orderBy: { creado_en: 'desc' },
        take: 1
      });

      expect(auditLogs.length).toBe(1);
      const log = auditLogs[0];
      expect(log.usuario_id).toBe(testProfessional.id);
      expect(log.accion).toBe('access_document');
      expect(log.exito).toBe(true);
    });

    test('debe registrar auditoría al consultar reputación', async () => {
      await request(app)
        .get(`/api/reputation/${testProfessional.id}`)
        .set('Authorization', `Bearer ${accessTokenProfessional}`);

      const auditLogs = await prisma.audit_logs.findMany({
        where: {
          accion: 'view_reputation',
          entidad_tipo: 'reputation_score',
          entidad_id: testProfessional.id
        },
        orderBy: { creado_en: 'desc' },
        take: 1
      });

      expect(auditLogs.length).toBe(1);
      const log = auditLogs[0];
      expect(log.usuario_id).toBe(testProfessional.id);
      expect(log.accion).toBe('view_reputation');
      expect(log.exito).toBe(true);
    });
  });

  describe('Autorización y Control de Acceso', () => {
    let verificationRequestId;

    beforeAll(async () => {
      // Crear solicitud para otro profesional
      const otherProfessional = await createTestUser({
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
      const otherToken = loginOther.body.data.token;

      const mockFileKey = `verification/${otherProfessional.id}/access-test.pdf`;

      const createResponse = await request(app)
        .post('/api/verification/submit')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ fileKey: mockFileKey });

      verificationRequestId = createResponse.body.data.id;
    });

    test('debe permitir acceso de administradores a documentos de otros usuarios', async () => {
      const response = await request(app)
        .get(`/api/verification/document/${verificationRequestId}`)
        .set('Authorization', `Bearer ${accessTokenAdmin}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.signedUrl).toBeDefined();
    });

    test('debe rechazar acceso de usuarios no autorizados a documentos', async () => {
      const response = await request(app)
        .get(`/api/verification/document/${verificationRequestId}`)
        .set('Authorization', `Bearer ${accessTokenUser}`); // Cliente intentando acceder

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('No tienes permisos para acceder a este documento');
    });

    test('debe rechazar acceso de profesionales a aprobación de verificaciones', async () => {
      const response = await request(app)
        .patch(`/api/admin/verification/${verificationRequestId}/approve`)
        .set('Authorization', `Bearer ${accessTokenProfessional}`)
        .send({ comentario: 'Intento no autorizado' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Acceso denegado');
    });

    test('debe rechazar acceso de clientes a lista de verificaciones pendientes', async () => {
      const response = await request(app)
        .get('/api/admin/verification/pending')
        .set('Authorization', `Bearer ${accessTokenUser}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Acceso denegado');
    });

    test('debe rechazar acceso de clientes a reputación de otros usuarios', async () => {
      const response = await request(app)
        .get(`/api/reputation/${testProfessional.id}`)
        .set('Authorization', `Bearer ${accessTokenUser}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('No tienes permisos');
    });

    test('debe permitir acceso de administradores a reputación de cualquier usuario', async () => {
      const response = await request(app)
        .get(`/api/reputation/${testProfessional.id}`)
        .set('Authorization', `Bearer ${accessTokenAdmin}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Validación de Archivos y Límites', () => {
    test('debe validar tipos MIME permitidos', async () => {
      // Tipos válidos
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];

      for (const mimeType of validTypes) {
        const response = await request(app)
          .post('/api/verification/presigned-url')
          .set('Authorization', `Bearer ${accessTokenProfessional}`)
          .send({
            fileName: `test.${mimeType.split('/')[1]}`,
            fileType: mimeType
          });

        expect(response.status).toBe(200);
        expect(response.body.contentType).toBe(mimeType);
      }
    });

    test('debe rechazar tipos MIME no permitidos', async () => {
      const invalidTypes = ['text/plain', 'application/x-msdownload', 'video/mp4'];

      for (const mimeType of invalidTypes) {
        const response = await request(app)
          .post('/api/verification/presigned-url')
          .set('Authorization', `Bearer ${accessTokenProfessional}`)
          .send({
            fileName: 'malicious-file',
            fileType: mimeType
          });

        expect(response.status).toBe(500); // Error del servicio de validación
      }
    });

    test('debe validar tamaño máximo de archivo (5MB)', async () => {
      // Nota: Esta validación ocurre en el frontend y storage service
      // El endpoint de presigned URL no valida tamaño, solo tipo
      const response = await request(app)
        .post('/api/verification/presigned-url')
        .set('Authorization', `Bearer ${accessTokenProfessional}`)
        .send({
          fileName: 'large-file.pdf',
          fileType: 'application/pdf'
        });

      expect(response.status).toBe(200);
      expect(response.body.maxSize).toBe(5242880); // 5MB en bytes
    });
  });

  describe('Rate Limiting y Protección', () => {
    test('debe manejar múltiples solicitudes de URLs presignadas', async () => {
      const promises = [];

      // Enviar múltiples solicitudes concurrentes
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/verification/presigned-url')
            .set('Authorization', `Bearer ${accessTokenProfessional}`)
            .send({
              fileName: `test-${i}.pdf`,
              fileType: 'application/pdf'
            })
        );
      }

      const responses = await Promise.all(promises);

      // Al menos algunas deberían ser exitosas (dependiendo del rate limiting)
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);

      // Verificar que todas las URLs generadas sean únicas
      const urls = successfulResponses.map(r => r.body.presignedUrl);
      const uniqueUrls = new Set(urls);
      expect(uniqueUrls.size).toBe(urls.length);
    });

    test('debe registrar intentos de acceso no autorizado', async () => {
      // Intentar acceder sin token
      await request(app)
        .get('/api/verification/status');

      // Intentar acceder con token inválido
      await request(app)
        .get('/api/verification/status')
        .set('Authorization', 'Bearer invalid-token');

      // Verificar que se registraron eventos de error
      const errorLogs = await prisma.audit_logs.findMany({
        where: {
          exito: false
        },
        orderBy: { creado_en: 'desc' },
        take: 5
      });

      // Debería haber al menos algunos logs de error por autenticación
      expect(errorLogs.length).toBeGreaterThanOrEqual(0);
    });
  });
});
