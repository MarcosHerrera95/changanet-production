/**
 * Pruebas de carga para el módulo de Solicitudes de Presupuesto
 * Simula múltiples usuarios creando solicitudes concurrentemente
 * Mide rendimiento, tiempos de respuesta y estabilidad del sistema
 */

const { performance } = require('perf_hooks');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

describe('Budget Request Load Tests', () => {
  let prisma;
  let testUsers = [];
  let testProfessionals = [];
  const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3003';

  beforeAll(async () => {
    prisma = new PrismaClient();

    // Crear usuarios de prueba masivos
    console.log('🚀 Creando usuarios de prueba para load testing...');

    for (let i = 0; i < 50; i++) {
      const client = await prisma.usuarios.create({
        data: {
          nombre: `Load Test Client ${i}`,
          email: `loadclient${i}@test.com`,
          hash_contrasena: 'hashedpassword',
          rol: 'cliente',
          esta_verificado: true,
          bloqueado: false,
        },
      });
      testUsers.push(client);

      if (i < 20) { // Crear 20 profesionales
        const professional = await prisma.usuarios.create({
          data: {
            nombre: `Load Test Professional ${i}`,
            email: `loadprof${i}@test.com`,
            hash_contrasena: 'hashedpassword',
            rol: 'profesional',
            esta_verificado: true,
            bloqueado: false,
          },
        });
        testProfessionals.push(professional);

        // Crear perfil profesional
        await prisma.perfiles_profesionales.create({
          data: {
            usuario_id: professional.id,
            especialidad: ['Plomería', 'Electricidad', 'Pintura', 'Albañilería'][i % 4],
            zona_cobertura: ['Palermo', 'Recoleta', 'Belgrano', 'Almagro'][i % 4] + ', Buenos Aires',
            anos_experiencia: Math.floor(Math.random() * 20) + 1,
            esta_disponible: true,
            calificacion_promedio: (Math.random() * 2) + 3, // 3.0 - 5.0
          },
        });
      }
    }

    console.log(`✅ Creados ${testUsers.length} clientes y ${testProfessionals.length} profesionales de prueba`);
  }, 60000); // Timeout extendido para creación masiva

  afterAll(async () => {
    console.log('🧹 Limpiando datos de prueba...');

    // Limpiar en orden inverso para evitar restricciones de FK
    const userIds = [...testUsers.map(u => u.id), ...testProfessionals.map(p => p.id)];

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
    console.log('✅ Limpieza completada');
  }, 60000);

  describe('Concurrent Budget Request Creation', () => {
    test('debe manejar 10 solicitudes concurrentes exitosamente', async () => {
      const concurrentRequests = 10;
      const startTime = performance.now();

      const promises = [];
      const results = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const user = testUsers[i];
        const token = jwt.sign(
          { id: user.id, email: user.email, rol: user.rol },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );

        const requestPromise = makeBudgetRequest(token, i).then(result => {
          results.push({ index: i, success: true, duration: performance.now() - startTime, ...result });
          return result;
        }).catch(error => {
          results.push({ index: i, success: false, error: error.message, duration: performance.now() - startTime });
          throw error;
        });

        promises.push(requestPromise);
      }

      // Ejecutar todas las solicitudes concurrentemente
      const settledResults = await Promise.allSettled(promises);
      const endTime = performance.now();

      // Analizar resultados
      const successful = settledResults.filter(r => r.status === 'fulfilled').length;
      const failed = settledResults.filter(r => r.status === 'rejected').length;
      const totalDuration = endTime - startTime;
      const avgDuration = totalDuration / concurrentRequests;

      console.log(`📊 Resultados de carga - 10 solicitudes concurrentes:`);
      console.log(`✅ Exitosas: ${successful}`);
      console.log(`❌ Fallidas: ${failed}`);
      console.log(`⏱️ Duración total: ${totalDuration.toFixed(2)}ms`);
      console.log(`📈 Duración promedio: ${avgDuration.toFixed(2)}ms`);

      // Validar que al menos el 80% de las solicitudes tuvieron éxito
      expect(successful / concurrentRequests).toBeGreaterThanOrEqual(0.8);

      // Validar que ninguna solicitud tomó más de 30 segundos
      results.forEach(result => {
        if (result.success) {
          expect(result.duration).toBeLessThan(30000); // 30 segundos máximo
        }
      });
    }, 60000);

    test('debe manejar 25 solicitudes concurrentes con degradación aceptable', async () => {
      const concurrentRequests = 25;
      const startTime = performance.now();

      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const user = testUsers[i % testUsers.length]; // Reutilizar usuarios
        const token = jwt.sign(
          { id: user.id, email: user.email, rol: user.rol },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );

        promises.push(makeBudgetRequest(token, i));
      }

      const startExecution = performance.now();
      const settledResults = await Promise.allSettled(promises);
      const endTime = performance.now();

      const successful = settledResults.filter(r => r.status === 'fulfilled').length;
      const failed = settledResults.filter(r => r.status === 'rejected').length;
      const totalDuration = endTime - startTime;
      const executionDuration = endTime - startExecution;
      const avgDuration = executionDuration / concurrentRequests;

      console.log(`📊 Resultados de carga - 25 solicitudes concurrentes:`);
      console.log(`✅ Exitosas: ${successful}`);
      console.log(`❌ Fallidas: ${failed}`);
      console.log(`⏱️ Duración total de ejecución: ${executionDuration.toFixed(2)}ms`);
      console.log(`📈 Duración promedio por solicitud: ${avgDuration.toFixed(2)}ms`);
      console.log(`🎯 Tasa de éxito: ${((successful / concurrentRequests) * 100).toFixed(1)}%`);

      // En carga alta, aceptar al menos 60% de éxito
      expect(successful / concurrentRequests).toBeGreaterThanOrEqual(0.6);

      // El tiempo promedio no debería exceder 10 segundos por solicitud
      expect(avgDuration).toBeLessThan(10000);
    }, 120000); // 2 minutos timeout
  });

  describe('Offer Submission Load Test', () => {
    let testRequest;

    beforeAll(async () => {
      // Crear una solicitud de prueba con múltiples respuestas pendientes
      const client = testUsers[0];
      testRequest = await prisma.cotizaciones.create({
        data: {
          cliente_id: client.id,
          descripcion: 'Solicitud de prueba para ofertas concurrentes',
          zona_cobertura: 'Palermo, Buenos Aires',
          especialidad: 'Plomería',
        },
      });

      // Crear respuestas pendientes para múltiples profesionales
      const responses = testProfessionals.slice(0, 10).map(prof => ({
        cotizacion_id: testRequest.id,
        profesional_id: prof.id,
      }));

      await prisma.cotizacion_respuestas.createMany({
        data: responses,
      });

      console.log(`📝 Creada solicitud de prueba con ${responses.length} respuestas pendientes`);
    });

    test('debe manejar ofertas concurrentes de múltiples profesionales', async () => {
      const concurrentOffers = 8; // 8 profesionales enviando ofertas simultáneamente
      const startTime = performance.now();

      const promises = [];

      for (let i = 0; i < concurrentOffers; i++) {
        const professional = testProfessionals[i];
        const token = jwt.sign(
          { id: professional.id, email: professional.email, rol: professional.rol },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );

        promises.push(makeOfferSubmission(token, testRequest.id, 1000 + (i * 100), i));
      }

      const settledResults = await Promise.allSettled(promises);
      const endTime = performance.now();

      const successful = settledResults.filter(r => r.status === 'fulfilled').length;
      const failed = settledResults.filter(r => r.status === 'rejected').length;
      const totalDuration = endTime - startTime;
      const avgDuration = totalDuration / concurrentOffers;

      console.log(`📊 Resultados de carga - ${concurrentOffers} ofertas concurrentes:`);
      console.log(`✅ Exitosas: ${successful}`);
      console.log(`❌ Fallidas: ${failed}`);
      console.log(`⏱️ Duración total: ${totalDuration.toFixed(2)}ms`);
      console.log(`📈 Duración promedio: ${avgDuration.toFixed(2)}ms`);

      // Validar alta tasa de éxito para ofertas
      expect(successful / concurrentOffers).toBeGreaterThanOrEqual(0.9);

      // Verificar que no se aceptaron ofertas duplicadas (race condition)
      const acceptedOffers = await prisma.cotizacion_respuestas.findMany({
        where: {
          cotizacion_id: testRequest.id,
          estado: 'ACEPTADO',
        },
      });

      expect(acceptedOffers.length).toBe(concurrentOffers); // Todas deberían haber sido aceptadas
    }, 60000);
  });

  describe('Database Performance Under Load', () => {
    test('debe mantener rendimiento de consultas con datos masivos', async () => {
      // Crear 100 solicitudes de prueba
      const bulkRequests = [];
      for (let i = 0; i < 100; i++) {
        const client = testUsers[i % testUsers.length];
        bulkRequests.push({
          cliente_id: client.id,
          descripcion: `Solicitud masiva ${i} para testing de rendimiento`,
          zona_cobertura: ['Palermo', 'Recoleta', 'Belgrano'][i % 3] + ', Buenos Aires',
          especialidad: ['Plomería', 'Electricidad', 'Pintura'][i % 3],
          creado_en: new Date(Date.now() - (i * 1000)), // Diferentes timestamps
        });
      }

      const insertStart = performance.now();
      await prisma.cotizaciones.createMany({ data: bulkRequests });
      const insertEnd = performance.now();

      console.log(`📊 Inserción masiva: ${bulkRequests.length} registros en ${(insertEnd - insertStart).toFixed(2)}ms`);

      // Probar consulta de búsqueda
      const searchStart = performance.now();
      const searchResults = await prisma.cotizaciones.findMany({
        where: {
          zona_cobertura: { contains: 'Palermo' },
          especialidad: 'Plomería',
        },
        include: {
          cliente: { select: { nombre: true } },
          respuestas: { select: { estado: true } },
        },
        orderBy: { creado_en: 'desc' },
        take: 20,
      });
      const searchEnd = performance.now();

      console.log(`🔍 Búsqueda: ${searchResults.length} resultados en ${(searchEnd - searchStart).toFixed(2)}ms`);

      // Validar rendimiento
      expect(insertEnd - insertStart).toBeLessThan(5000); // Inserción < 5 segundos
      expect(searchEnd - searchStart).toBeLessThan(1000); // Búsqueda < 1 segundo
      expect(searchResults.length).toBeGreaterThan(0);

      // Limpiar datos masivos
      await prisma.cotizacion_respuestas.deleteMany({
        where: { cotizacion: { descripcion: { contains: 'Solicitud masiva' } } },
      });
      await prisma.cotizaciones.deleteMany({
        where: { descripcion: { contains: 'Solicitud masiva' } },
      });
    }, 30000);
  });
});

/**
 * Función auxiliar para crear solicitud de presupuesto
 */
async function makeBudgetRequest(token, index) {
  const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3003'}/api/budget-requests`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      descripcion: `Solicitud de carga ${index}: Necesito servicio profesional urgente`,
      zona_cobertura: ['Palermo', 'Recoleta', 'Belgrano', 'Almagro'][index % 4] + ', Buenos Aires',
      especialidad: ['Plomería', 'Electricidad', 'Pintura', 'Albañilería'][index % 4],
      presupuesto_estimado: 5000 + (index * 100),
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Función auxiliar para enviar oferta
 */
async function makeOfferSubmission(token, requestId, precio, index) {
  const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3003'}/api/budget-requests/${requestId}/offers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      precio: precio,
      comentario: `Oferta de carga ${index}: Precio competitivo y servicio garantizado`,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}
