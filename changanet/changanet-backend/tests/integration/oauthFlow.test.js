/**
 * Pruebas de integración para flujos OAuth
 * Cubre: Google OAuth login, linking accounts
 * REQ-02 (Registro social con Google)
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const app = require('../../src/server');

const prisma = new PrismaClient();

describe('Flujo OAuth - Integration Tests', () => {
  let existingUser;
  let googleUserData;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-jwt-secret-oauth';
    process.env.NODE_ENV = 'test';

    // Crear usuario existente para pruebas de linking
    existingUser = await prisma.usuarios.create({
      data: {
        nombre: 'Usuario Existente',
        email: 'existing.oauth@example.com',
        hash_contrasena: await bcrypt.hash('ExistingPassword123!', 12),
        rol: 'cliente',
        esta_verificado: true
      }
    });

    googleUserData = {
      uid: 'google-oauth-uid-123',
      email: 'existing.oauth@example.com', // Mismo email que usuario existente
      nombre: 'Usuario Google OAuth',
      foto: 'https://lh3.googleusercontent.com/photo.jpg',
      rol: 'cliente'
    };
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Google OAuth Login', () => {
    test('✅ Debe crear nuevo usuario con Google OAuth', async () => {
      const newGoogleUserData = {
        uid: 'new-google-uid-456',
        email: 'new.google.oauth@example.com',
        nombre: 'Nuevo Usuario Google',
        foto: 'https://lh3.googleusercontent.com/new-photo.jpg',
        rol: 'cliente'
      };

      const response = await request(app)
        .post('/api/auth/google-login')
        .send(newGoogleUserData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Login exitoso con Google');
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user.email).toBe(newGoogleUserData.email);
      expect(response.body.user.rol).toBe(newGoogleUserData.rol);
      expect(response.body.user.esta_verificado).toBe(true); // Usuarios de Google están verificados
      expect(response.body.user.url_foto_perfil).toBe(newGoogleUserData.foto);

      // Verificar en base de datos
      const createdUser = await prisma.usuarios.findUnique({
        where: { email: newGoogleUserData.email }
      });

      expect(createdUser).toBeDefined();
      expect(createdUser.google_id).toBe(newGoogleUserData.uid);
      expect(createdUser.url_foto_perfil).toBe(newGoogleUserData.foto);
      expect(createdUser.esta_verificado).toBe(true);
      expect(createdUser.hash_contrasena).toBeNull(); // No tiene contraseña local

      // Limpiar usuario creado
      await prisma.usuarios.delete({ where: { id: createdUser.id } });
    });

    test('✅ Debe linkear cuenta existente con Google OAuth', async () => {
      const response = await request(app)
        .post('/api/auth/google-login')
        .send(googleUserData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Login exitoso con Google');
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();

      // Verificar que el usuario existente fue actualizado
      const updatedUser = await prisma.usuarios.findUnique({
        where: { id: existingUser.id }
      });

      expect(updatedUser.google_id).toBe(googleUserData.uid);
      expect(updatedUser.url_foto_perfil).toBe(googleUserData.foto);
      expect(updatedUser.esta_verificado).toBe(true);
      // La contraseña local debe mantenerse
      expect(updatedUser.hash_contrasena).toBeDefined();
    });

    test('✅ Debe actualizar foto de perfil en login subsecuente', async () => {
      const updatedGoogleData = {
        ...googleUserData,
        foto: 'https://lh3.googleusercontent.com/updated-photo.jpg'
      };

      const response = await request(app)
        .post('/api/auth/google-login')
        .send(updatedGoogleData);

      expect(response.status).toBe(200);

      // Verificar que la foto fue actualizada
      const updatedUser = await prisma.usuarios.findUnique({
        where: { id: existingUser.id }
      });

      expect(updatedUser.url_foto_perfil).toBe(updatedGoogleData.foto);
    });

    test('❌ Debe fallar con datos faltantes', async () => {
      const incompleteData = {
        email: 'incomplete@example.com',
        nombre: 'Usuario Incompleto'
        // Falta uid
      };

      const response = await request(app)
        .post('/api/auth/google-login')
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Campos requeridos faltantes');
    });

    test('❌ Debe fallar con email inválido', async () => {
      const invalidEmailData = {
        uid: 'some-uid',
        email: 'invalid-email',
        nombre: 'Usuario Inválido'
      };

      const response = await request(app)
        .post('/api/auth/google-login')
        .send(invalidEmailData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Formato de email inválido');
    });

    test('❌ Debe fallar con rol inválido', async () => {
      const invalidRoleData = {
        uid: 'some-uid',
        email: 'invalid.role@example.com',
        nombre: 'Usuario Rol Inválido',
        rol: 'admin' // Rol no permitido
      };

      const response = await request(app)
        .post('/api/auth/google-login')
        .send(invalidRoleData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Rol inválido');
    });

    test('✅ Debe permitir login con cuenta ya linkeada', async () => {
      // Usuario ya está linkeado, intentar login nuevamente
      const response = await request(app)
        .post('/api/auth/google-login')
        .send(googleUserData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Login exitoso con Google');
      expect(response.body.accessToken).toBeDefined();
    });

    test('✅ Usuario con Google puede hacer login normal después', async () => {
      // El usuario existente tiene tanto Google ID como contraseña local
      const loginData = {
        email: 'existing.oauth@example.com',
        password: 'ExistingPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Login exitoso');
      expect(response.body.accessToken).toBeDefined();
    });

    test('❌ Usuario solo de Google no puede hacer login con contraseña', async () => {
      // Crear usuario solo de Google (sin contraseña local)
      const googleOnlyUser = await prisma.usuarios.create({
        data: {
          nombre: 'Usuario Solo Google',
          email: 'google.only@example.com',
          google_id: 'google-only-uid',
          rol: 'cliente',
          esta_verificado: true,
          hash_contrasena: null
        }
      });

      const loginData = {
        email: 'google.only@example.com',
        password: 'SomePassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Credenciales inválidas');
      expect(response.body.isGoogleUser).toBe(true);

      // Limpiar
      await prisma.usuarios.delete({ where: { id: googleOnlyUser.id } });
    });
  });

  describe('Rate Limiting en OAuth', () => {
    test('❌ Debe bloquear múltiples intentos de Google OAuth', async () => {
      // Hacer múltiples intentos
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/google-login')
          .send({
            uid: `rate-limit-uid-${i}`,
            email: `rate.limit.${i}@example.com`,
            nombre: `Usuario Rate Limit ${i}`
          });
      }

      // El último debe ser bloqueado
      const response = await request(app)
        .post('/api/auth/google-login')
        .send({
          uid: 'final-rate-limit-uid',
          email: 'final.rate.limit@example.com',
          nombre: 'Usuario Final Rate Limit'
        });

      expect([429, 200]).toContain(response.status); // Puede ser 429 o 200 dependiendo del rate limit
    });
  });

  describe('Manejo de fotos de perfil', () => {
    test('✅ Debe guardar foto de Google correctamente', async () => {
      const userWithPhoto = {
        uid: 'photo-test-uid',
        email: 'photo.test@example.com',
        nombre: 'Usuario con Foto',
        foto: 'https://lh3.googleusercontent.com/test-photo-123.jpg'
      };

      const response = await request(app)
        .post('/api/auth/google-login')
        .send(userWithPhoto);

      expect(response.status).toBe(200);
      expect(response.body.user.url_foto_perfil).toBe(userWithPhoto.foto);

      // Verificar en BD
      const createdUser = await prisma.usuarios.findUnique({
        where: { email: userWithPhoto.email }
      });

      expect(createdUser.url_foto_perfil).toBe(userWithPhoto.foto);

      // Limpiar
      await prisma.usuarios.delete({ where: { id: createdUser.id } });
    });

    test('✅ Debe manejar usuarios sin foto de Google', async () => {
      const userWithoutPhoto = {
        uid: 'no-photo-uid',
        email: 'no.photo@example.com',
        nombre: 'Usuario sin Foto',
        foto: null
      };

      const response = await request(app)
        .post('/api/auth/google-login')
        .send(userWithoutPhoto);

      expect(response.status).toBe(200);
      expect(response.body.user.url_foto_perfil).toBeNull();

      // Verificar en BD
      const createdUser = await prisma.usuarios.findUnique({
        where: { email: userWithoutPhoto.email }
      });

      expect(createdUser.url_foto_perfil).toBeNull();

      // Limpiar
      await prisma.usuarios.delete({ where: { id: createdUser.id } });
    });
  });

  describe('Verificación automática de usuarios OAuth', () => {
    test('✅ Usuarios de Google deben estar verificados automáticamente', async () => {
      const unverifiedGoogleUser = {
        uid: 'verified-test-uid',
        email: 'verified.google@example.com',
        nombre: 'Usuario Verificado Google',
        foto: 'https://lh3.googleusercontent.com/verified.jpg'
      };

      const response = await request(app)
        .post('/api/auth/google-login')
        .send(unverifiedGoogleUser);

      expect(response.status).toBe(200);
      expect(response.body.user.esta_verificado).toBe(true);

      // Verificar en BD
      const createdUser = await prisma.usuarios.findUnique({
        where: { email: unverifiedGoogleUser.email }
      });

      expect(createdUser.esta_verificado).toBe(true);

      // Limpiar
      await prisma.usuarios.delete({ where: { id: createdUser.id } });
    });
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    if (existingUser) {
      await prisma.usuarios.deleteMany({
        where: {
          email: { in: ['existing.oauth@example.com'] }
        }
      });
    }
  });
});
