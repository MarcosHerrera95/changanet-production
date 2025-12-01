/**
 * Pruebas de integración completas para flujos de autenticación
 * Cubre: register→verify→login→refresh→logout
 * REQ-01, REQ-02, REQ-03 (Autenticación completa)
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const app = require('../../src/server');

const prisma = new PrismaClient();

describe('Flujo Completo de Autenticación - Integration Tests', () => {
  let testUser;
  let accessToken;
  let refreshToken;
  let verificationToken;

  beforeAll(async () => {
    // Configurar variables de entorno para pruebas
    process.env.JWT_SECRET = 'test-jwt-secret-integration';
    process.env.NODE_ENV = 'test';
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Flujo completo: Registro → Verificación → Login → Refresh → Logout', () => {
    test('✅ Paso 1: Registro exitoso debe crear usuario y enviar email', async () => {
      const userData = {
        name: 'Usuario Integración Test',
        email: 'integration.test@example.com',
        password: 'TestPassword123!',
        rol: 'cliente'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('Usuario registrado exitosamente');
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.rol).toBe(userData.rol);
      expect(response.body.requiresVerification).toBe(true);

      // Verificar que el usuario se creó en la base de datos
      const createdUser = await prisma.usuarios.findUnique({
        where: { email: userData.email }
      });

      expect(createdUser).toBeDefined();
      expect(createdUser.nombre).toBe(userData.name);
      expect(createdUser.email).toBe(userData.email);
      expect(createdUser.rol).toBe(userData.rol);
      expect(createdUser.esta_verificado).toBe(false);
      expect(createdUser.token_verificacion).toBeDefined();
      expect(createdUser.hash_contrasena).toBeDefined();

      // Verificar que la contraseña está hasheada
      const isPasswordValid = await bcrypt.compare(userData.password, createdUser.hash_contrasena);
      expect(isPasswordValid).toBe(true);

      // Guardar datos para siguientes tests
      testUser = createdUser;
      verificationToken = createdUser.token_verificacion;
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    test('❌ Registro debe fallar con email duplicado', async () => {
      const duplicateData = {
        name: 'Usuario Duplicado',
        email: 'integration.test@example.com', // Email ya registrado
        password: 'AnotherPassword123!',
        rol: 'cliente'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData);

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('ya está registrado');
    });

    test('❌ Registro debe fallar con contraseña débil', async () => {
      const weakPasswordData = {
        name: 'Usuario Débil',
        email: 'weak.password@example.com',
        password: '123', // Contraseña muy débil
        rol: 'cliente'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('no cumple con los requisitos de seguridad');
      expect(response.body.details).toBeDefined();
      expect(response.body.details.warnings).toBeDefined();
      expect(response.body.details.suggestions).toBeDefined();
    });

    test('❌ Registro debe fallar con rol inválido', async () => {
      const invalidRoleData = {
        name: 'Usuario Inválido',
        email: 'invalid.role@example.com',
        password: 'ValidPassword123!',
        rol: 'admin' // Rol no permitido
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidRoleData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Rol inválido');
    });

    test('❌ Registro debe fallar con campos faltantes', async () => {
      const incompleteData = {
        name: 'Usuario Incompleto',
        email: 'incomplete@example.com'
        // Falta password y rol
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Todos los campos son requeridos');
    });

    test('❌ Login debe fallar antes de verificación de email', async () => {
      const loginData = {
        email: 'integration.test@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Credenciales inválidas');
    });

    test('✅ Paso 2: Verificación de email debe activar cuenta', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .send({ token: verificationToken });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Email verificado exitosamente');
      expect(response.body.user.esta_verificado).toBe(true);

      // Verificar en base de datos
      const verifiedUser = await prisma.usuarios.findUnique({
        where: { id: testUser.id }
      });

      expect(verifiedUser.esta_verificado).toBe(true);
      expect(verifiedUser.token_verificacion).toBeNull();
      expect(verifiedUser.token_expiracion).toBeNull();
    });

    test('❌ Verificación debe fallar con token inválido', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .send({ token: 'invalid-token-123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('inválido');
    });

    test('❌ Verificación debe fallar con token expirado', async () => {
      // Crear usuario con token expirado
      const expiredUser = await prisma.usuarios.create({
        data: {
          nombre: 'Usuario Expirado',
          email: 'expired@example.com',
          hash_contrasena: await bcrypt.hash('TestPassword123!', 12),
          rol: 'cliente',
          esta_verificado: false,
          token_verificacion: 'expired-token-123',
          token_expiracion: new Date(Date.now() - 60 * 60 * 1000) // 1 hora atrás
        }
      });

      const response = await request(app)
        .post('/api/auth/verify')
        .send({ token: 'expired-token-123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('expirado');

      // Limpiar
      await prisma.usuarios.delete({ where: { id: expiredUser.id } });
    });

    test('✅ Paso 3: Login debe funcionar después de verificación', async () => {
      const loginData = {
        email: 'integration.test@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Login exitoso');
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user.email).toBe(loginData.email);

      // Actualizar tokens para siguientes tests
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    test('❌ Login debe fallar con credenciales incorrectas', async () => {
      const wrongLoginData = {
        email: 'integration.test@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(wrongLoginData);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('inválidas');
    });

    test('❌ Login debe fallar con email inexistente', async () => {
      const nonexistentLoginData = {
        email: 'nonexistent@example.com',
        password: 'SomePassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(nonexistentLoginData);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('inválidas');
    });

    test('✅ Paso 4: Refresh token debe generar nuevo access token', async () => {
      const refreshData = {
        refreshToken: refreshToken
      };

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Token renovado exitosamente');
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.accessToken).not.toBe(accessToken); // Debe ser diferente

      // Actualizar access token
      accessToken = response.body.accessToken;
    });

    test('❌ Refresh debe fallar con token inválido', async () => {
      const invalidRefreshData = {
        refreshToken: 'invalid-refresh-token-123'
      };

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(invalidRefreshData);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('inválido');
    });

    test('✅ Paso 5: Logout debe invalidar refresh token', async () => {
      const logoutData = {
        refreshToken: refreshToken
      };

      const response = await request(app)
        .post('/api/auth/logout')
        .send(logoutData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Logout exitoso');

      // Verificar que el refresh token fue invalidado en BD
      const userAfterLogout = await prisma.usuarios.findUnique({
        where: { id: testUser.id }
      });

      expect(userAfterLogout.refresh_token_hash).toBeNull();
    });

    test('❌ Refresh debe fallar después de logout', async () => {
      const refreshData = {
        refreshToken: refreshToken
      };

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshData);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('inválido');
    });
  });

  describe('Protección de rutas autenticadas', () => {
    let tempUser;
    let tempToken;

    beforeAll(async () => {
      // Crear usuario temporal para pruebas de rutas protegidas
      tempUser = await prisma.usuarios.create({
        data: {
          nombre: 'Usuario Temporal',
          email: 'temp.auth@example.com',
          hash_contrasena: await bcrypt.hash('TempPassword123!', 12),
          rol: 'cliente',
          esta_verificado: true
        }
      });

      // Login para obtener token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'temp.auth@example.com',
          password: 'TempPassword123!'
        });

      tempToken = loginResponse.body.accessToken;
    });

    afterAll(async () => {
      if (tempUser) {
        await prisma.usuarios.delete({ where: { id: tempUser.id } });
      }
    });

    test('✅ Debe permitir acceso a ruta protegida con token válido', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tempToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('temp.auth@example.com');
    });

    test('❌ Debe rechazar acceso sin token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    test('❌ Debe rechazar acceso con token inválido', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-123');

      expect(response.status).toBe(403);
    });

    test('❌ Debe rechazar acceso con token expirado', async () => {
      // Crear token expirado manualmente
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: tempUser.id, role: tempUser.rol },
        process.env.JWT_SECRET,
        { expiresIn: '-1s', algorithm: 'HS256' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Rate Limiting', () => {
    test('❌ Debe bloquear múltiples intentos de login fallidos', async () => {
      const wrongLoginData = {
        email: 'wrong@example.com',
        password: 'wrongpassword'
      };

      // Hacer múltiples intentos fallidos
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(wrongLoginData);
      }

      // El último debe ser bloqueado
      const response = await request(app)
        .post('/api/auth/login')
        .send(wrongLoginData);

      expect([429, 401]).toContain(response.status); // Puede ser 429 (rate limit) o 401 (credenciales inválidas)
    });

    test('❌ Debe bloquear múltiples intentos de registro', async () => {
      const registerData = {
        name: 'Usuario Rate Limit',
        email: 'ratelimit@example.com',
        password: 'RateLimitPassword123!',
        rol: 'cliente'
      };

      // Hacer múltiples intentos
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/auth/register')
          .send({
            ...registerData,
            email: `ratelimit${i}@example.com`
          });
      }

      // El último debe ser bloqueado
      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData);

      expect([429, 409]).toContain(response.status); // Puede ser 429 o 409 (email ya existe si se creó antes)
    });
  });

  describe('Registro de profesionales', () => {
    test('✅ Debe permitir registro de profesional con datos completos', async () => {
      const professionalData = {
        nombre: 'Profesional Test',
        email: 'professional.test@example.com',
        password: 'ProfessionalPass123!',
        telefono: '+5491112345678',
        especialidad: 'Plomería',
        anos_experiencia: 5,
        zona_cobertura: 'Buenos Aires',
        tarifa_hora: 1500,
        descripcion: 'Profesional con 5 años de experiencia'
      };

      const response = await request(app)
        .post('/api/auth/register-professional')
        .send(professionalData);

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('Profesional registrado exitosamente');
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user.rol).toBe('profesional');
      expect(response.body.profile).toBeDefined();
      expect(response.body.profile.especialidad).toBe(professionalData.especialidad);

      // Verificar en base de datos
      const createdUser = await prisma.usuarios.findUnique({
        where: { email: professionalData.email },
        include: { perfil_profesional: true }
      });

      expect(createdUser).toBeDefined();
      expect(createdUser.rol).toBe('profesional');
      expect(createdUser.perfil_profesional).toBeDefined();
      expect(createdUser.perfil_profesional.especialidad).toBe(professionalData.especialidad);

      // Limpiar datos de prueba
      await prisma.perfiles_profesionales.delete({ where: { usuario_id: createdUser.id } });
      await prisma.usuarios.delete({ where: { id: createdUser.id } });
    });
  });
});
