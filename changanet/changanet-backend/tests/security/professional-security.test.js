/**
 * Tests de seguridad para endpoints de profesionales
 * Valida todas las correcciones de vulnerabilidades críticas implementadas
 */

// Mock de dependencias problemáticas para Jest
const mockDOMPurify = jest.fn((window) => ({
  sanitize: jest.fn((html, options) => {
    if (typeof html !== 'string') return html;
    // Simular sanitización básica
    return html.replace(/<script[^>]*>.*?<\/script>/gi, '').replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
  })
}));

jest.mock('dompurify', () => mockDOMPurify);

jest.mock('jsdom', () => ({
  JSDOM: jest.fn(() => ({
    window: {
      document: {}
    }
  }))
}));

const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Configurar app de prueba
const app = express();
app.use(express.json());

// Importar rutas y middlewares después de los mocks
const professionalsRoutes = require('../../src/routes/professionalsRoutes');
app.use('/api/professionals', professionalsRoutes);

// Configurar variables de entorno para pruebas
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

describe('Professional Endpoints Security Tests', () => {
  let testUser, testToken, otherUser, otherToken, adminUser, adminToken;
  let testProfile;

  beforeAll(async () => {
    // Crear usuarios de prueba
    testUser = await prisma.usuarios.create({
      data: {
        email: 'test-professional@example.com',
        nombre: 'Test Professional',
        hash_contrasena: 'hashedpassword',
        rol: 'profesional',
        esta_verificado: true
      }
    });

    otherUser = await prisma.usuarios.create({
      data: {
        email: 'other-professional@example.com',
        nombre: 'Other Professional',
        hash_contrasena: 'hashedpassword',
        rol: 'profesional',
        esta_verificado: true
      }
    });

    adminUser = await prisma.usuarios.create({
      data: {
        email: 'admin@example.com',
        nombre: 'Admin User',
        hash_contrasena: 'hashedpassword',
        rol: 'admin',
        esta_verificado: true
      }
    });

    // Crear perfil de prueba
    testProfile = await prisma.perfiles_profesionales.create({
      data: {
        usuario_id: testUser.id,
        especialidad: 'Plomero',
        zona_cobertura: 'Palermo',
        tarifa_hora: 500,
        anos_experiencia: 5,
        descripcion: 'Profesional confiable con 5 años de experiencia',
        esta_disponible: true
      }
    });

    // Generar tokens
    testToken = jwt.sign({ userId: testUser.id, role: 'profesional' }, process.env.JWT_SECRET);
    otherToken = jwt.sign({ userId: otherUser.id, role: 'profesional' }, process.env.JWT_SECRET);
    adminToken = jwt.sign({ userId: adminUser.id, role: 'admin' }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await prisma.perfiles_profesionales.deleteMany({
      where: { usuario_id: { in: [testUser.id, otherUser.id] } }
    });
    await prisma.usuarios.deleteMany({
      where: { id: { in: [testUser.id, otherUser.id, adminUser.id] } }
    });
    await prisma.$disconnect();
  });

  describe('Authentication & Authorization', () => {
    test('❌ Debe rechazar acceso a perfil sin autenticación', async () => {
      const response = await request(app)
        .get(`/api/professionals/${testUser.id}`)
        .expect(401);

      expect(response.body.error).toContain('Autenticación requerida');
    });

    test('✅ Debe permitir acceso al propio perfil', async () => {
      const response = await request(app)
        .get(`/api/professionals/${testUser.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.usuario_id).toBe(testUser.id);
    });

    test('❌ Debe rechazar acceso a perfil de otro usuario (IDOR)', async () => {
      const response = await request(app)
        .get(`/api/professionals/${testUser.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.error).toContain('No tienes permisos');
    });

    test('✅ Admin debe poder acceder a cualquier perfil', async () => {
      const response = await request(app)
        .get(`/api/professionals/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.usuario_id).toBe(testUser.id);
    });

    test('❌ Debe rechazar actualización de perfil de otro usuario', async () => {
      const response = await request(app)
        .put(`/api/professionals/${testUser.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          especialidad: 'Electricista',
          zona_cobertura: 'Recoleta',
          tarifa_hora: 600,
          anos_experiencia: 3,
          descripcion: 'Intento de actualización no autorizada'
        })
        .expect(403);

      expect(response.body.error).toContain('No tienes permisos');
    });
  });

  describe('XSS Protection', () => {
    test('❌ Debe sanitizar scripts maliciosos en descripción', async () => {
      const maliciousDescription = '<script>alert("XSS")</script><p>Descripción normal</p>';

      const response = await request(app)
        .put(`/api/professionals/${testUser.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          especialidad: 'Plomero',
          zona_cobertura: 'Palermo',
          tarifa_hora: 500,
          anos_experiencia: 5,
          descripcion: maliciousDescription
        })
        .expect(200);

      // Verificar que el script fue removido
      const updatedProfile = await prisma.perfiles_profesionales.findUnique({
        where: { usuario_id: testUser.id }
      });

      expect(updatedProfile.descripcion).not.toContain('<script>');
      expect(updatedProfile.descripcion).toContain('Descripción normal');
    });

    test('✅ Debe permitir HTML seguro en descripciones', async () => {
      const safeHtml = '<p>Descripción <strong>importante</strong></p><ul><li>Item 1</li><li>Item 2</li></ul>';

      const response = await request(app)
        .put(`/api/professionals/${testUser.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          especialidad: 'Plomero',
          zona_cobertura: 'Palermo',
          tarifa_hora: 500,
          anos_experiencia: 5,
          descripcion: safeHtml
        })
        .expect(200);

      const updatedProfile = await prisma.perfiles_profesionales.findUnique({
        where: { usuario_id: testUser.id }
      });

      expect(updatedProfile.descripcion).toContain('<p>');
      expect(updatedProfile.descripcion).toContain('<strong>');
      expect(updatedProfile.descripcion).toContain('<ul>');
    });
  });

  describe('File Upload Security', () => {
    test('❌ Debe rechazar archivos que no son imágenes', async () => {
      const fakeImageBuffer = Buffer.from('This is not an image file');

      const response = await request(app)
        .post('/api/professionals/upload-photo')
        .set('Authorization', `Bearer ${testToken}`)
        .set('Content-Type', 'multipart/form-data')
        .field('foto_tipo', 'perfil')
        .attach('foto', fakeImageBuffer, 'fake.txt')
        .expect(400);

      expect(response.body.error).toContain('Tipo de archivo no permitido');
    });

    test('❌ Debe rechazar archivos con contenido malicioso', async () => {
      // Crear un archivo que parece imagen pero contiene código ejecutable
      const maliciousBuffer = Buffer.from('<script>alert("XSS")</script>');

      const response = await request(app)
        .post('/api/professionals/upload-photo')
        .set('Authorization', `Bearer ${testToken}`)
        .set('Content-Type', 'multipart/form-data')
        .field('foto_tipo', 'perfil')
        .attach('foto', maliciousBuffer, 'malicious.jpg')
        .expect(400);

      expect(response.body.code).toBe('INVALID_IMAGE_CONTENT');
    });

    test('❌ Debe rechazar archivos demasiado grandes', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB

      const response = await request(app)
        .post('/api/professionals/upload-photo')
        .set('Authorization', `Bearer ${testToken}`)
        .set('Content-Type', 'multipart/form-data')
        .field('foto_tipo', 'perfil')
        .attach('foto', largeBuffer, 'large.jpg')
        .expect(400);

      expect(response.body.error).toContain('demasiado grande');
    });
  });

  describe('Rate Limiting', () => {
    test('❌ Debe limitar creación excesiva de perfiles', async () => {
      // Hacer múltiples solicitudes de creación de perfil
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .post('/api/professionals')
            .set('Authorization', `Bearer ${otherToken}`)
            .send({
              especialidad: 'Cerrajero',
              zona_cobertura: 'Centro',
              tarifa_hora: 400,
              anos_experiencia: 2,
              descripcion: 'Perfil de prueba'
            })
        );
      }

      const responses = await Promise.all(requests);

      // Al menos una respuesta debe ser 429 (rate limited)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('❌ Debe limitar actualizaciones excesivas de perfil', async () => {
      const updateRequests = [];
      for (let i = 0; i < 12; i++) {
        updateRequests.push(
          request(app)
            .put(`/api/professionals/${testUser.id}`)
            .set('Authorization', `Bearer ${testToken}`)
            .send({
              especialidad: 'Plomero',
              zona_cobertura: 'Palermo',
              tarifa_hora: 500 + i,
              anos_experiencia: 5,
              descripcion: `Actualización ${i}`
            })
        );
      }

      const responses = await Promise.all(updateRequests);

      // Al menos una respuesta debe ser 429
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('SQL Injection Protection', () => {
    test('❌ Debe prevenir inyección SQL en parámetros de búsqueda', async () => {
      const maliciousQuery = "'; DROP TABLE usuarios; --";

      const response = await request(app)
        .get('/api/professionals')
        .query({ especialidad: maliciousQuery })
        .expect(200);

      // La consulta debe ejecutarse sin problemas (no debe haber error de SQL)
      expect(response.body.professionals).toBeDefined();
    });

    test('❌ Debe prevenir inyección SQL en zona de cobertura', async () => {
      const maliciousZone = "Palermo'; UPDATE perfiles_profesionales SET tarifa_hora = 0; --";

      const response = await request(app)
        .get('/api/professionals')
        .query({ zona_cobertura: maliciousZone })
        .expect(200);

      // Verificar que no se modificaron datos
      const profile = await prisma.perfiles_profesionales.findUnique({
        where: { usuario_id: testUser.id }
      });
      expect(profile.tarifa_hora).toBe(500); // Debe mantener el valor original
    });
  });

  describe('Information Disclosure Protection', () => {
    test('❌ No debe exponer emails sensibles en perfiles públicos', async () => {
      const response = await request(app)
        .get(`/api/professionals/${testUser.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      // No debe contener información sensible
      expect(response.body.usuario?.email).toBeUndefined();
    });

    test('✅ Admin debe ver información completa', async () => {
      const response = await request(app)
        .get(`/api/professionals/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.usuario.email).toBe(testUser.email);
    });

    test('❌ Debe ocultar perfiles no disponibles para usuarios no propietarios', async () => {
      // Marcar perfil como no disponible
      await prisma.perfiles_profesionales.update({
        where: { usuario_id: testUser.id },
        data: { esta_disponible: false }
      });

      const response = await request(app)
        .get(`/api/professionals/${testUser.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.error).toContain('No tienes permisos');

      // Restaurar disponibilidad
      await prisma.perfiles_profesionales.update({
        where: { usuario_id: testUser.id },
        data: { esta_disponible: true }
      });
    });
  });

  describe('Input Validation', () => {
    test('❌ Debe rechazar datos con tipos incorrectos', async () => {
      const response = await request(app)
        .put(`/api/professionals/${testUser.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          especialidad: 'Plomero',
          zona_cobertura: 'Palermo',
          tarifa_hora: 'no-es-numero', // Debe ser número
          anos_experiencia: 5,
          descripcion: 'Descripción válida'
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    test('❌ Debe rechazar valores fuera de rango', async () => {
      const response = await request(app)
        .put(`/api/professionals/${testUser.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          especialidad: 'Plomero',
          zona_cobertura: 'Palermo',
          tarifa_hora: 500,
          anos_experiencia: 100, // Fuera de rango (máx 50)
          descripcion: 'Descripción válida'
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });
});
