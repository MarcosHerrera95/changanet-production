/**
 * Pruebas de integración para el sistema de verificación de identidad
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const app = require('../../server');

const prisma = new PrismaClient();

describe('Sistema de Verificación de Identidad', () => {
  let testUser;
  let testToken;
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    // Crear usuario de prueba (profesional)
    testUser = await prisma.usuarios.create({
      data: {
        email: 'test.professional@example.com',
        hash_contrasena: '$2a$10$hashedpassword', // Contraseña hasheada
        nombre: 'Juan Profesional',
        rol: 'profesional',
        esta_verificado: false
      }
    });

    // Crear perfil profesional
    await prisma.perfiles_profesionales.create({
      data: {
        usuario_id: testUser.id,
        especialidad: 'Plomero',
        zona_cobertura: 'Buenos Aires',
        tarifa_hora: 1500
      }
    });

    // Crear usuario administrador
    adminUser = await prisma.usuarios.create({
      data: {
        email: 'admin@example.com',
        hash_contrasena: '$2a$10$hashedpassword',
        nombre: 'Admin User',
        rol: 'admin',
        esta_verificado: true
      }
    });

    // Generar tokens JWT (simulados para pruebas)
    testToken = jwt.sign({ userId: testUser.id, role: testUser.rol }, process.env.JWT_SECRET);
    adminToken = jwt.sign({ userId: adminUser.id, role: adminUser.rol }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await prisma.verification_requests.deleteMany({
      where: {
        usuario_id: { in: [testUser.id, adminUser.id] }
      }
    });
    await prisma.perfiles_profesionales.deleteMany({
      where: { usuario_id: { in: [testUser.id, adminUser.id] } }
    });
    await prisma.usuarios.deleteMany({
      where: { id: { in: [testUser.id, adminUser.id] } }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/verification/request', () => {
    test('debe crear una solicitud de verificación exitosamente', async () => {
      const response = await request(app)
        .post('/api/verification/request')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('document', Buffer.from('fake document content'), {
          filename: 'dni.jpg',
          contentType: 'image/jpeg'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.estado).toBe('pendiente');
    });

    test('debe rechazar solicitud sin documento', async () => {
      const response = await request(app)
        .post('/api/verification/request')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Se requiere subir un documento');
    });

    test('debe rechazar solicitud de usuario no profesional', async () => {
      // Crear usuario cliente
      const clientUser = await prisma.usuarios.create({
        data: {
          email: 'client@example.com',
          hash_contrasena: '$2a$10$hashedpassword',
          nombre: 'Cliente',
          rol: 'cliente'
        }
      });

      const clientToken = jwt.sign({ userId: clientUser.id, role: clientUser.rol }, process.env.JWT_SECRET);

      const response = await request(app)
        .post('/api/verification/request')
        .set('Authorization', `Bearer ${clientToken}`)
        .attach('document', Buffer.from('fake document'), {
          filename: 'dni.jpg',
          contentType: 'image/jpeg'
        });

      expect(response.status).toBe(500); // Error del servicio

      // Limpiar
      await prisma.usuarios.delete({ where: { id: clientUser.id } });
    });
  });

  describe('GET /api/verification/status', () => {
    test('debe retornar estado de verificación del usuario', async () => {
      const response = await request(app)
        .get('/api/verification/status')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('estado');
    });
  });

  describe('GET /api/verification/pending', () => {
    test('debe retornar solicitudes pendientes para admin', async () => {
      const response = await request(app)
        .get('/api/verification/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('debe rechazar acceso para no administradores', async () => {
      const response = await request(app)
        .get('/api/verification/pending')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('permisos de administrador');
    });
  });

  describe('PUT /api/verification/:id/approve', () => {
    let requestId;

    beforeAll(async () => {
      // Crear una solicitud de prueba
      const verification = await prisma.verification_requests.create({
        data: {
          usuario_id: testUser.id,
          documento_url: 'https://example.com/document.jpg',
          estado: 'pendiente'
        }
      });
      requestId = verification.id;
    });

    test('debe aprobar solicitud como administrador', async () => {
      const response = await request(app)
        .put(`/api/verification/${requestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ comentario: 'Documento válido' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('aprobada');
    });

    test('debe rechazar aprobación para no administradores', async () => {
      const response = await request(app)
        .put(`/api/verification/${requestId}/approve`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/verification/:id/reject', () => {
    let requestId;

    beforeAll(async () => {
      // Crear otra solicitud de prueba
      const verification = await prisma.verification_requests.create({
        data: {
          usuario_id: testUser.id,
          documento_url: 'https://example.com/document2.jpg',
          estado: 'pendiente'
        }
      });
      requestId = verification.id;
    });

    test('debe rechazar solicitud con comentario', async () => {
      const response = await request(app)
        .put(`/api/verification/${requestId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ comentario: 'Documento ilegible' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('rechazada');
    });

    test('debe rechazar solicitud sin comentario', async () => {
      const response = await request(app)
        .put(`/api/verification/${requestId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('comentario');
    });
  });
});
