/**
 * Pruebas de seguridad para el módulo de Solicitudes de Presupuesto
 * Cubre vulnerabilidades, validación de accesos no autorizados y ataques comunes
 */

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

describe('Budget Request Security Tests', () => {
  let prisma;
  let testUsers = [];
  let testProfessionals = [];

  beforeAll(async () => {
    prisma = new PrismaClient();

    // Crear usuarios de prueba
    const client = await prisma.usuarios.create({
      data: {
        nombre: 'Security Test Client',
        email: 'security-client@test.com',
        hash_contrasena: 'hashedpassword',
        rol: 'cliente',
        esta_verificado: true,
        bloqueado: false,
      },
    });

    const professional = await prisma.usuarios.create({
      data: {
        nombre: 'Security Test Professional',
        email: 'security-prof@test.com',
        hash_contrasena: 'hashedpassword',
        rol: 'profesional',
        esta_verificado: true,
        bloqueado: false,
      },
    });

    const blockedUser = await prisma.usuarios.create({
      data: {
        nombre: 'Blocked User',
        email: 'blocked@test.com',
        hash_contrasena: 'hashedpassword',
        rol: 'profesional',
        esta_verificado: true,
        bloqueado: true, // Usuario bloqueado
      },
    });

    const unverifiedUser = await prisma.usuarios.create({
      data: {
        nombre: 'Unverified User',
        email: 'unverified@test.com',
        hash_contrasena: 'hashedpassword',
        rol: 'profesional',
        esta_verificado: false, // Usuario no verificado
        bloqueado: false,
      },
    });

    testUsers = [client, blockedUser, unverifiedUser];
    testProfessionals = [professional];

    // Crear perfil profesional
    await prisma.perfiles_profesionales.create({
      data: {
        usuario_id: professional.id,
        especialidad: 'Plomería',
        zona_cobertura: 'Palermo, Buenos Aires',
        anos_experiencia: 5,
        esta_disponible: true,
        calificacion_promedio: 4.5,
      },
    });

    // Crear perfil para usuario bloqueado
    await prisma.perfiles_profesionales.create({
      data: {
        usuario_id: blockedUser.id,
        especialidad: 'Electricidad',
        zona_cobertura: 'Recoleta, Buenos Aires',
        anos_experiencia: 3,
        esta_disponible: false, // No disponible
        calificacion_promedio: 3.0,
      },
    });
  });

  afterAll(async () => {
    const userIds = testUsers.concat(testProfessionals).map(u => u.id);

    await prisma.cotizacion_respuestas.deleteMany({
      where: {
        OR: [
          { profesional_id: { in: userIds } },
          { cotizacion: { cliente_id: { in: userIds } } },
        ],
      },
    });

    await prisma.cotizaciones.deleteMany({
      where: { cliente_id: { in: userIds } },
    });

    await prisma.perfiles_profesionales.deleteMany({
      where: { usuario_id: { in: userIds } },
    });

    await prisma.usuarios.deleteMany({
      where: { id: { in: userIds } },
    });

    await prisma.$disconnect();
  });

  describe('Authorization & Access Control (REQ-31 to REQ-35)', () => {
    test('debe rechazar creación de solicitud sin token (401)', async () => {
      const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3003'}/api/budget-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          descripcion: 'Test request',
          zona_cobertura: 'Test zone',
          especialidad: 'Plomería',
        }),
      });

      expect(response.status).toBe(401);
    });

    test('debe rechazar acceso a solicitudes de otro cliente (403)', async () => {
      // Crear solicitud para cliente 1
      const client1 = testUsers[0];
      const request = await prisma.cotizaciones.create({
        data: {
          cliente_id: client1.id,
          descripcion: 'Private request',
          zona_cobertura: 'Test zone',
        },
      });

      // Intentar acceder con token de cliente 2 (simulado)
      const fakeToken = jwt.sign(
        { id: 'fake-user-id', email: 'fake@test.com', rol: 'cliente' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await fetch(
        `${process.env.BACKEND_URL || 'http://localhost:3003'}/api/budget-requests/client/${client1.id}`,
        {
          headers: {
            'Authorization': `Bearer ${fakeToken}`,
          },
        }
      );

      expect(response.status).toBe(403);

      // Limpiar
      await prisma.cotizaciones.delete({ where: { id: request.id } });
    });

    test('debe rechazar envío de oferta por usuario no profesional', async () => {
      const client = testUsers[0];
      const clientToken = jwt.sign(
        { id: client.id, email: client.email, rol: client.rol },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Crear solicitud
      const request = await prisma.cotizaciones.create({
        data: {
          cliente_id: client.id,
          descripcion: 'Test for offer',
          zona_cobertura: 'Test zone',
        },
      });

      const response = await fetch(
        `${process.env.BACKEND_URL || 'http://localhost:3003'}/api/budget-requests/${request.id}/offers`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${clientToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            precio: 1000,
            comentario: 'Client trying to send offer',
          }),
        }
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Solo los profesionales');

      // Limpiar
      await prisma.cotizaciones.delete({ where: { id: request.id } });
    });

    test('debe rechazar oferta de profesional bloqueado', async () => {
      const blockedUser = testUsers[1]; // Usuario bloqueado
      const blockedToken = jwt.sign(
        { id: blockedUser.id, email: blockedUser.email, rol: blockedUser.rol },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const client = testUsers[0];
      const request = await prisma.cotizaciones.create({
        data: {
          cliente_id: client.id,
          descripcion: 'Test for blocked user',
          zona_cobertura: 'Test zone',
        },
      });

      const response = await fetch(
        `${process.env.BACKEND_URL || 'http://localhost:3003'}/api/budget-requests/${request.id}/offers`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${blockedToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            precio: 1000,
            comentario: 'Blocked user trying to send offer',
          }),
        }
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('bloqueada');

      // Limpiar
      await prisma.cotizaciones.delete({ where: { id: request.id } });
    });

    test('debe rechazar oferta de profesional no verificado', async () => {
      const unverifiedUser = testUsers[2]; // Usuario no verificado
      const unverifiedToken = jwt.sign(
        { id: unverifiedUser.id, email: unverifiedUser.email, rol: unverifiedUser.rol },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const client = testUsers[0];
      const request = await prisma.cotizaciones.create({
        data: {
          cliente_id: client.id,
          descripcion: 'Test for unverified user',
          zona_cobertura: 'Test zone',
        },
      });

      const response = await fetch(
        `${process.env.BACKEND_URL || 'http://localhost:3003'}/api/budget-requests/${request.id}/offers`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${unverifiedToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            precio: 1000,
            comentario: 'Unverified user trying to send offer',
          }),
        }
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('verificado');

      // Limpiar
      await prisma.cotizaciones.delete({ where: { id: request.id } });
    });
  });

  describe('Input Validation & Sanitization', () => {
    test('debe sanitizar y validar descripción con XSS', async () => {
      const client = testUsers[0];
      const token = jwt.sign(
        { id: client.id, email: client.email, rol: client.rol },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const maliciousDescription = '<script>alert("XSS")</script> Necesito servicio <img src=x onerror=alert(1)>';

      const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3003'}/api/budget-requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          descripcion: maliciousDescription,
          zona_cobertura: 'Palermo, Buenos Aires',
          especialidad: 'Plomería',
        }),
      });

      if (response.status === 201) {
        const data = await response.json();
        // Verificar que el script fue sanitizado
        expect(data.descripcion).not.toContain('<script>');
        expect(data.descripcion).not.toContain('onerror');

        // Limpiar
        await prisma.cotizacion_respuestas.deleteMany({
          where: { cotizacion_id: data.id },
        });
        await prisma.cotizaciones.delete({ where: { id: data.id } });
      } else {
        // Si falla validación, verificar que es por longitud o contenido
        expect([400, 500]).toContain(response.status);
      }
    });

    test('debe rechazar descripción demasiado corta', async () => {
      const client = testUsers[0];
      const token = jwt.sign(
        { id: client.id, email: client.email, rol: client.rol },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3003'}/api/budget-requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          descripcion: 'abc', // Demasiado corta
          zona_cobertura: 'Palermo, Buenos Aires',
          especialidad: 'Plomería',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Descripción inválida');
    });

    test('debe validar precio como número positivo', async () => {
      const professional = testProfessionals[0];
      const profToken = jwt.sign(
        { id: professional.id, email: professional.email, rol: professional.rol },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const client = testUsers[0];
      const request = await prisma.cotizaciones.create({
        data: {
          cliente_id: client.id,
          descripcion: 'Test for price validation',
          zona_cobertura: 'Test zone',
        },
      });

      // Crear respuesta pendiente
      await prisma.cotizacion_respuestas.create({
        data: {
          cotizacion_id: request.id,
          profesional_id: professional.id,
          estado: 'PENDIENTE',
        },
      });

      const invalidPrices = ['not-a-number', '-100', '0', '999999999']; // Precios inválidos

      for (const invalidPrice of invalidPrices) {
        const response = await fetch(
          `${process.env.BACKEND_URL || 'http://localhost:3003'}/api/budget-requests/${request.id}/offers`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${profToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              precio: invalidPrice,
              comentario: 'Test offer',
            }),
          }
        );

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('precio válido');
      }

      // Limpiar
      await prisma.cotizacion_respuestas.deleteMany({
        where: { cotizacion_id: request.id },
      });
      await prisma.cotizaciones.delete({ where: { id: request.id } });
    });
  });

  describe('SQL Injection Prevention', () => {
    test('debe prevenir SQL injection en parámetros de búsqueda', async () => {
      const client = testUsers[0];
      const token = jwt.sign(
        { id: client.id, email: client.email, rol: client.rol },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Intentar SQL injection en zona_cobertura
      const sqlInjectionPayload = {
        descripcion: 'Test request',
        zona_cobertura: "'; DROP TABLE usuarios; --",
        especialidad: 'Plomería',
      };

      const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3003'}/api/budget-requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sqlInjectionPayload),
      });

      // Debería fallar por validación, no por SQL injection
      expect([400, 500]).toContain(response.status);

      // Verificar que la tabla usuarios aún existe consultando
      const userCheck = await prisma.usuarios.findFirst();
      expect(userCheck).toBeTruthy(); // Si la tabla fue droppeada, esto fallaría
    });
  });

  describe('Rate Limiting', () => {
    test('debe aplicar rate limiting a creación de solicitudes', async () => {
      const client = testUsers[0];
      const token = jwt.sign(
        { id: client.id, email: client.email, rol: client.rol },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const requests = [];
      for (let i = 0; i < 6; i++) { // Más que el límite de 3 por hora
        requests.push(
          fetch(`${process.env.BACKEND_URL || 'http://localhost:3003'}/api/budget-requests`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              descripcion: `Rate limit test ${i}`,
              zona_cobertura: 'Test zone',
              especialidad: 'Plomería',
            }),
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponse = responses.find(r => r.status === 429);

      expect(rateLimitedResponse).toBeDefined();
    });
  });

  describe('File Upload Security', () => {
    test('debe rechazar archivos no imagen en subida de fotos', async () => {
      const client = testUsers[0];
      const token = jwt.sign(
        { id: client.id, email: client.email, rol: client.rol },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3003'}/api/budget-requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: (() => {
          const formData = new FormData();
          formData.append('descripcion', 'Test with malicious file');
          formData.append('zona_cobertura', 'Test zone');
          formData.append('especialidad', 'Plomería');

          // Archivo que no es imagen
          const maliciousFile = new File(['malicious content'], 'malicious.exe', { type: 'application/x-msdownload' });
          formData.append('fotos', maliciousFile);

          return formData;
        })(),
      });

      expect(response.status).toBe(400); // Debería ser rechazado por multer
    });

    test('debe rechazar archivos demasiado grandes', async () => {
      const client = testUsers[0];
      const token = jwt.sign(
        { id: client.id, email: client.email, rol: client.rol },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3003'}/api/budget-requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: (() => {
          const formData = new FormData();
          formData.append('descripcion', 'Test with large file');
          formData.append('zona_cobertura', 'Test zone');
          formData.append('especialidad', 'Plomería');

          // Archivo de 6MB (límite es 5MB)
          const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
          formData.append('fotos', largeFile);

          return formData;
        })(),
      });

      expect(response.status).toBe(400); // Debería ser rechazado por multer
    });
  });

  describe('Data Exposure Prevention', () => {
    test('debe no exponer datos sensibles en respuestas de error', async () => {
      // Intentar acceder a endpoint con ID malformado
      const response = await fetch(
        `${process.env.BACKEND_URL || 'http://localhost:3003'}/api/budget-requests/invalid-id/offers`,
        {
          headers: {
            'Authorization': 'Bearer invalid-token',
          },
        }
      );

      expect(response.status).toBe(401); // No debería exponer detalles internos

      const data = await response.json();
      expect(data).not.toHaveProperty('stack'); // No debería incluir stack traces
      expect(data).not.toHaveProperty('sql'); // No debería incluir queries SQL
    });

    test('debe validar propiedad de datos en respuestas', async () => {
      const client = testUsers[0];
      const token = jwt.sign(
        { id: client.id, email: client.email, rol: client.rol },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Crear solicitud
      const request = await prisma.cotizaciones.create({
        data: {
          cliente_id: client.id,
          descripcion: 'Test data exposure',
          zona_cobertura: 'Test zone',
        },
      });

      const response = await fetch(
        `${process.env.BACKEND_URL || 'http://localhost:3003'}/api/budget-requests/client/${client.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      // Verificar que no se exponen datos sensibles
      data.forEach(item => {
        expect(item).not.toHaveProperty('hash_contrasena');
        expect(item).not.toHaveProperty('token_verificacion');
        expect(item).not.toHaveProperty('fcm_token');
      });

      // Limpiar
      await prisma.cotizaciones.delete({ where: { id: request.id } });
    });
  });
});
