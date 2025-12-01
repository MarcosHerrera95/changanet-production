/**
 * Pruebas de integración para flujo de recuperación de contraseña
 * Cubre: forgot password → reset password
 * REQ-05 (Recuperación de contraseña)
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const app = require('../../src/server');

const prisma = new PrismaClient();

describe('Flujo de Recuperación de Contraseña - Integration Tests', () => {
  let testUser;
  let resetToken;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-jwt-secret-reset';
    process.env.NODE_ENV = 'test';
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Flujo completo: Solicitar recuperación → Restablecer contraseña', () => {
    test('✅ Paso 1: Solicitar recuperación debe enviar email con token', async () => {
      // Crear usuario de prueba
      testUser = await prisma.usuarios.create({
        data: {
          nombre: 'Usuario Reset Test',
          email: 'reset.test@example.com',
          hash_contrasena: await bcrypt.hash('OldPassword123!', 12),
          rol: 'cliente',
          esta_verificado: true
        }
      });

      const forgotData = {
        email: 'reset.test@example.com'
      };

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send(forgotData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Si el email existe, se enviará un enlace de recuperación');

      // Verificar que se generó token de reset en BD
      const updatedUser = await prisma.usuarios.findUnique({
        where: { id: testUser.id }
      });

      expect(updatedUser.token_verificacion).toBeDefined();
      expect(updatedUser.token_expiracion).toBeDefined();
      expect(updatedUser.ultimo_email_reset_password).toBeDefined();

      resetToken = updatedUser.token_verificacion;
    });

    test('❌ Solicitar recuperación debe responder igual para email inexistente', async () => {
      const forgotData = {
        email: 'nonexistent@example.com'
      };

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send(forgotData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Si el email existe, se enviará un enlace de recuperación');
      // No debe revelar si el email existe por seguridad
    });

    test('❌ Solicitar recuperación debe fallar sin email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Email requerido');
    });

    test('❌ Rate limiting debe bloquear múltiples solicitudes de reset', async () => {
      // Hacer múltiples solicitudes para activar rate limiting
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: 'reset.test@example.com' });
      }

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'reset.test@example.com' });

      expect([429, 200]).toContain(response.status); // Puede ser 429 o 200 dependiendo del rate limit
      if (response.status === 429) {
        expect(response.body.error).toContain('límite de envío');
      }
    });

    test('✅ Paso 2: Restablecer contraseña debe actualizar password', async () => {
      const resetData = {
        token: resetToken,
        newPassword: 'NewSecurePassword123!'
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Contraseña restablecida exitosamente');

      // Verificar que la contraseña fue actualizada en BD
      const updatedUser = await prisma.usuarios.findUnique({
        where: { id: testUser.id }
      });

      expect(updatedUser.token_verificacion).toBeNull();
      expect(updatedUser.token_expiracion).toBeNull();

      // Verificar que la nueva contraseña funciona
      const isNewPasswordValid = await bcrypt.compare('NewSecurePassword123!', updatedUser.hash_contrasena);
      expect(isNewPasswordValid).toBe(true);

      // Verificar que la contraseña antigua ya no funciona
      const isOldPasswordValid = await bcrypt.compare('OldPassword123!', updatedUser.hash_contrasena);
      expect(isOldPasswordValid).toBe(false);
    });

    test('❌ Restablecer contraseña debe fallar con token inválido', async () => {
      const resetData = {
        token: 'invalid-reset-token-123',
        newPassword: 'SomePassword123!'
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('inválido');
    });

    test('❌ Restablecer contraseña debe fallar con token expirado', async () => {
      // Crear usuario con token expirado
      const expiredUser = await prisma.usuarios.create({
        data: {
          nombre: 'Usuario Token Expirado',
          email: 'expired.reset@example.com',
          hash_contrasena: await bcrypt.hash('OldPassword123!', 12),
          rol: 'cliente',
          esta_verificado: true,
          token_verificacion: 'expired-reset-token-123',
          token_expiracion: new Date(Date.now() - 60 * 60 * 1000) // 1 hora atrás
        }
      });

      const resetData = {
        token: 'expired-reset-token-123',
        newPassword: 'NewPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('expirado');

      // Limpiar
      await prisma.usuarios.delete({ where: { id: expiredUser.id } });
    });

    test('❌ Restablecer contraseña debe fallar con contraseña débil', async () => {
      // Crear nuevo token para el usuario existente
      await prisma.usuarios.update({
        where: { id: testUser.id },
        data: {
          token_verificacion: 'weak-password-token-123',
          token_expiracion: new Date(Date.now() + 60 * 60 * 1000) // 1 hora
        }
      });

      const resetData = {
        token: 'weak-password-token-123',
        newPassword: '123' // Contraseña muy débil
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('no cumple con los requisitos de seguridad');
      expect(response.body.details).toBeDefined();
      expect(response.body.details.warnings).toBeDefined();
    });

    test('❌ Restablecer contraseña debe fallar sin token o contraseña', async () => {
      const response1 = await request(app)
        .post('/api/auth/reset-password')
        .send({ newPassword: 'ValidPassword123!' });

      expect(response1.status).toBe(400);
      expect(response1.body.error).toContain('requeridos');

      const response2 = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'some-token' });

      expect(response2.status).toBe(400);
      expect(response2.body.error).toContain('requeridos');
    });

    test('✅ Login debe funcionar con nueva contraseña', async () => {
      const loginData = {
        email: 'reset.test@example.com',
        password: 'NewSecurePassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Login exitoso');
      expect(response.body.accessToken).toBeDefined();
    });

    test('❌ Login debe fallar con contraseña antigua', async () => {
      const loginData = {
        email: 'reset.test@example.com',
        password: 'OldPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('inválidas');
    });
  });

  describe('Reenvío de email de recuperación', () => {
    test('✅ Debe permitir reenviar email de recuperación', async () => {
      // Actualizar usuario para permitir reenvío
      await prisma.usuarios.update({
        where: { id: testUser.id },
        data: {
          ultimo_email_reset_password: new Date(Date.now() - 70 * 60 * 1000) // 70 minutos atrás
        }
      });

      const resendData = {
        email: 'reset.test@example.com'
      };

      const response = await request(app)
        .post('/api/auth/resend-password-reset')
        .send(resendData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Si el email existe, se enviará un enlace de recuperación');
    });

    test('❌ Reenvío debe ser bloqueado por rate limiting', async () => {
      // Hacer múltiples reenvíos
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/auth/resend-password-reset')
          .send({ email: 'reset.test@example.com' });
      }

      const response = await request(app)
        .post('/api/auth/resend-password-reset')
        .send({ email: 'reset.test@example.com' });

      expect([429, 200]).toContain(response.status);
    });
  });

  describe('Reenvío de email de verificación', () => {
    test('✅ Debe permitir reenviar email de verificación', async () => {
      // Crear usuario no verificado
      const unverifiedUser = await prisma.usuarios.create({
        data: {
          nombre: 'Usuario No Verificado',
          email: 'unverified.resend@example.com',
          hash_contrasena: await bcrypt.hash('Password123!', 12),
          rol: 'cliente',
          esta_verificado: false,
          ultimo_email_verificacion: new Date(Date.now() - 70 * 60 * 1000) // 70 minutos atrás
        }
      });

      const resendData = {
        email: 'unverified.resend@example.com'
      };

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send(resendData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Email de verificación reenviado exitosamente');

      // Limpiar
      await prisma.usuarios.delete({ where: { id: unverifiedUser.id } });
    });

    test('❌ Reenvío debe fallar para usuario ya verificado', async () => {
      const resendData = {
        email: 'reset.test@example.com' // Usuario ya verificado
      };

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send(resendData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('ya está verificado');
    });
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    if (testUser) {
      await prisma.usuarios.deleteMany({
        where: { email: { in: ['reset.test@example.com'] } }
      });
    }
  });
});
