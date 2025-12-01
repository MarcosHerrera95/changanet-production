/**
 * Pruebas de carga para módulos de verificación de identidad y reputación
 * Simula 100+ usuarios concurrentes realizando operaciones críticas
 * REQ-36, REQ-37, REQ-38, REQ-39, REQ-40
 */

const { performance } = require('perf_hooks');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

describe('Verification & Reputation Load Tests', () => {
  let prisma;
  let testUsers = [];
  let testProfessionals = [];
  const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3003';

  beforeAll(async () => {
    prisma = new PrismaClient();

    console.log('🚀 Creando usuarios de prueba para load testing de verificación y reputación...');

    // Crear 100 usuarios de prueba
    for (let i = 0; i < 100; i++) {
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

      // Crear 50 profesionales
      if (i < 50) {
        const professional = await prisma.usuarios.create({
          data: {
            nombre: `Load Test Professional ${i}`,
            email: `loadprof${i}@test.com`,
            hash_contrasena: 'hashedpassword',
            rol: 'profesional',
            esta_verificado: Math.random() > 0.5, // 50% verificados
            bloqueado: false,
          },
        });
        testProfessionals.push(professional);

        // Crear perfil profesional
        await prisma.perfiles_profesionales.create({
          data: {
            usuario_id: professional.id,
            especialidad: ['Plomería', 'Electricidad', 'Pintura', 'Albañilería', 'Jardinería'][i % 5],
            zona_cobertura: ['Palermo', 'Recoleta', 'Belgrano', 'Almagro', 'Villa Crespo'][i % 5] + ', Buenos Aires',
            anos_experiencia: Math.floor(Math.random() * 20) + 1,
            esta_disponible: true,
            calificacion_promedio: (Math.random() * 2) + 3, // 3.0 - 5.0
            estado_verificacion: professional.esta_verificado ? 'verificado' : 'pendiente'
          },
        });

        // Crear servicios completados para generar reputación
        const servicesCount = Math.floor(Math.random() * 50) + 10; // 10-60 servicios
        for (let j = 0; j < servicesCount; j++) {
          await prisma.servicios.create({
            data: {
              cliente_id: testUsers[j % testUsers.length].id,
              profesional_id: professional.id,
              estado: 'COMPLETADO',
              fecha_servicio: new Date(Date.now() - (j * 24 * 60 * 60 * 1000)), // Diferentes fechas
              precio_acordado: Math.floor(Math.random() * 5000) + 1000,
              descripcion: `Servicio ${j} para load testing`
            }
          });

          // Crear reseñas para algunos servicios
          if (Math.random() > 0.3) { // 70% de servicios tienen reseñas
            await prisma.resenas.create({
              data: {
                servicio_id: (await prisma.servicios.findFirst({
                  where: { profesional_id: professional.id },
                  orderBy: { creado_en: 'desc' }
                })).id,
                cliente_id: testUsers[j % testUsers.length].id,
                calificacion: Math.floor(Math.random() * 2) + 4, // 4-5 estrellas
                comentario: `Excelente servicio de load testing ${j}`
              }
            });
          }
        }
      }
    }

    console.log(`✅ Creados ${testUsers.length} clientes y ${testProfessionals.length} profesionales con datos de reputación`);
  }, 120000); // Timeout extendido

  afterAll(async () => {
    console.log('🧹 Limpiando datos de prueba de carga...');

    const allUserIds = [...testUsers.map(u => u.id), ...testProfessionals.map(p => p.id)];

    // Limpiar en orden inverso
    await prisma.audit_logs.deleteMany({
      where: { usuario_id: { in: allUserIds } }
    });

    await prisma.user_medals.deleteMany({
      where: { usuario_id: { in: allUserIds } }
    });

    await prisma.reputation_scores.deleteMany({
      where: { usuario_id: { in: allUserIds } }
    });

    await prisma.resenas.deleteMany({
      where: {
        OR: [
          { cliente_id: { in: allUserIds } },
          { servicio: { profesional_id: { in: allUserIds } } }
        ]
      }
    });

    await prisma.verification_requests.deleteMany({
      where: { usuario_id: { in: allUserIds } }
    });

    await prisma.servicios.deleteMany({
      where: {
        OR: [
          { cliente_id: { in: allUserIds } },
          { profesional_id: { in: allUserIds } }
        ]
      }
    });

    await prisma.perfiles_profesionales.deleteMany({
      where: { usuario_id: { in: allUserIds } }
    });

    await prisma.usuarios.deleteMany({
      where: { id: { in: allUserIds } }
    });

    await prisma.$disconnect();
    console.log('✅ Limpieza completada');
  }, 60000);

  describe('Concurrent Verification Requests', () => {
    test('debe manejar 50 solicitudes de verificación concurrentes', async () => {
      const concurrentRequests = 50;
      const startTime = performance.now();

      const promises = [];
      const results = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const professional = testProfessionals[i % testProfessionals.length];
        const token = jwt.sign(
          { id: professional.id, email: professional.email, rol: professional.rol },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );

        const requestPromise = makeVerificationRequest(token, professional.id, i)
          .then(result => {
            results.push({ index: i, success: true, duration: performance.now() - startTime, ...result });
            return result;
          })
          .catch(error => {
            results.push({ index: i, success: false, error: error.message, duration: performance.now() - startTime });
            throw error;
          });

        promises.push(requestPromise);
      }

      const settledResults = await Promise.allSettled(promises);
      const endTime = performance.now();

      const successful = settledResults.filter(r => r.status === 'fulfilled').length;
      const failed = settledResults.filter(r => r.status === 'rejected').length;
      const totalDuration = endTime - startTime;
      const avgDuration = totalDuration / concurrentRequests;

      console.log(`📊 Resultados de carga - ${concurrentRequests} solicitudes de verificación concurrentes:`);
      console.log(`✅ Exitosas: ${successful}`);
      console.log(`❌ Fallidas: ${failed}`);
      console.log(`⏱️ Duración total: ${totalDuration.toFixed(2)}ms`);
      console.log(`📈 Duración promedio: ${avgDuration.toFixed(2)}ms`);
      console.log(`🎯 Tasa de éxito: ${((successful / concurrentRequests) * 100).toFixed(1)}%`);

      // Validar alta tasa de éxito
      expect(successful / concurrentRequests).toBeGreaterThanOrEqual(0.9);

      // Validar tiempos de respuesta aceptables
      results.forEach(result => {
        if (result.success) {
          expect(result.duration).toBeLessThan(10000); // Máximo 10 segundos
        }
      });
    }, 120000);

    test('debe manejar aprobación masiva de verificaciones por administradores', async () => {
      // Crear solicitudes pendientes primero
      const pendingRequests = [];
      for (let i = 0; i < 30; i++) {
        const professional = testProfessionals[i];
        const request = await prisma.verification_requests.create({
          data: {
            usuario_id: professional.id,
            documento_url: `https://storage.example.com/docs/${professional.id}/doc.pdf`,
            estado: 'pendiente'
          }
        });
        pendingRequests.push(request);
      }

      // Simular aprobaciones concurrentes
      const concurrentApprovals = 30;
      const startTime = performance.now();

      const promises = [];
      for (let i = 0; i < concurrentApprovals; i++) {
        const request = pendingRequests[i];
        const adminToken = jwt.sign(
          { id: 'admin-123', email: 'admin@test.com', rol: 'admin' },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );

        promises.push(makeVerificationApproval(adminToken, request.id, i));
      }

      const settledResults = await Promise.allSettled(promises);
      const endTime = performance.now();

      const successful = settledResults.filter(r => r.status === 'fulfilled').length;
      const failed = settledResults.filter(r => r.status === 'rejected').length;
      const totalDuration = endTime - startTime;
      const avgDuration = totalDuration / concurrentApprovals;

      console.log(`📊 Resultados de carga - ${concurrentApprovals} aprobaciones concurrentes:`);
      console.log(`✅ Exitosas: ${successful}`);
      console.log(`❌ Fallidas: ${failed}`);
      console.log(`⏱️ Duración total: ${totalDuration.toFixed(2)}ms`);
      console.log(`📈 Duración promedio: ${avgDuration.toFixed(2)}ms`);

      expect(successful / concurrentApprovals).toBeGreaterThanOrEqual(0.95);
      expect(avgDuration).toBeLessThan(5000); // Máximo 5 segundos por aprobación
    }, 120000);
  });

  describe('Reputation Calculation Load Test', () => {
    test('debe calcular reputación para 50 profesionales concurrentemente', async () => {
      const concurrentCalculations = 50;
      const startTime = performance.now();

      const promises = [];
      for (let i = 0; i < concurrentCalculations; i++) {
        const professional = testProfessionals[i];
        promises.push(calculateReputationForUser(professional.id, i));
      }

      const settledResults = await Promise.allSettled(promises);
      const endTime = performance.now();

      const successful = settledResults.filter(r => r.status === 'fulfilled').length;
      const failed = settledResults.filter(r => r.status === 'rejected').length;
      const totalDuration = endTime - startTime;
      const avgDuration = totalDuration / concurrentCalculations;

      console.log(`📊 Resultados de carga - ${concurrentCalculations} cálculos de reputación:`);
      console.log(`✅ Exitosas: ${successful}`);
      console.log(`❌ Fallidas: ${failed}`);
      console.log(`⏱️ Duración total: ${totalDuration.toFixed(2)}ms`);
      console.log(`📈 Duración promedio: ${avgDuration.toFixed(2)}ms`);

      expect(successful / concurrentCalculations).toBeGreaterThanOrEqual(0.95);
      expect(avgDuration).toBeLessThan(3000); // Máximo 3 segundos por cálculo
    }, 120000);

    test('debe generar ranking global con 50+ profesionales', async () => {
      // Asegurar que existan puntuaciones de reputación
      for (const professional of testProfessionals.slice(0, 40)) {
        await prisma.reputation_scores.upsert({
          where: { usuario_id: professional.id },
          update: {
            average_rating: (Math.random() * 2) + 3,
            completed_jobs: Math.floor(Math.random() * 100) + 10,
            ranking_score: Math.random() * 50 + 10,
            last_calculated: new Date()
          },
          create: {
            usuario_id: professional.id,
            average_rating: (Math.random() * 2) + 3,
            completed_jobs: Math.floor(Math.random() * 100) + 10,
            ranking_score: Math.random() * 50 + 10,
            last_calculated: new Date()
          }
        });
      }

      const startTime = performance.now();
      const ranking = await getGlobalRanking(50);
      const endTime = performance.now();

      const duration = endTime - startTime;

      console.log(`📊 Ranking global generado en ${duration.toFixed(2)}ms`);
      console.log(`🏆 Profesionales en ranking: ${ranking.length}`);

      expect(ranking.length).toBeGreaterThanOrEqual(40);
      expect(duration).toBeLessThan(2000); // Máximo 2 segundos

      // Verificar ordenamiento
      for (let i = 1; i < ranking.length; i++) {
        expect(ranking[i-1].ranking_score).toBeGreaterThanOrEqual(ranking[i].ranking_score);
      }
    }, 30000);
  });

  describe('Medals Assignment Load Test', () => {
    test('debe asignar medallas a 50 profesionales concurrentemente', async () => {
      const concurrentAssignments = 50;
      const startTime = performance.now();

      const promises = [];
      for (let i = 0; i < concurrentAssignments; i++) {
        const professional = testProfessionals[i];
        promises.push(assignMedalsForUser(professional.id, i));
      }

      const settledResults = await Promise.allSettled(promises);
      const endTime = performance.now();

      const successful = settledResults.filter(r => r.status === 'fulfilled').length;
      const failed = settledResults.filter(r => r.status === 'rejected').length;
      const totalDuration = endTime - startTime;
      const avgDuration = totalDuration / concurrentAssignments;

      console.log(`📊 Resultados de carga - ${concurrentAssignments} asignaciones de medallas:`);
      console.log(`✅ Exitosas: ${successful}`);
      console.log(`❌ Fallidas: ${failed}`);
      console.log(`⏱️ Duración total: ${totalDuration.toFixed(2)}ms`);
      console.log(`📈 Duración promedio: ${avgDuration.toFixed(2)}ms`);

      expect(successful / concurrentAssignments).toBeGreaterThanOrEqual(0.9);
      expect(avgDuration).toBeLessThan(2000); // Máximo 2 segundos por asignación
    }, 120000);
  });

  describe('Database Performance Under Load', () => {
    test('debe mantener rendimiento con consultas complejas de reputación', async () => {
      const queries = 100;
      const startTime = performance.now();

      const promises = [];
      for (let i = 0; i < queries; i++) {
        const professional = testProfessionals[i % testProfessionals.length];
        promises.push(
          prisma.reputation_scores.findUnique({
            where: { usuario_id: professional.id },
            include: {
              usuario: {
                include: {
                  perfil_profesional: true,
                  user_medals: {
                    where: { is_active: true }
                  }
                }
              }
            }
          })
        );
      }

      await Promise.all(promises);
      const endTime = performance.now();

      const totalDuration = endTime - startTime;
      const avgDuration = totalDuration / queries;

      console.log(`📊 ${queries} consultas complejas de reputación:`);
      console.log(`⏱️ Duración total: ${totalDuration.toFixed(2)}ms`);
      console.log(`📈 Duración promedio: ${avgDuration.toFixed(2)}ms`);

      expect(avgDuration).toBeLessThan(100); // Máximo 100ms por consulta
      expect(totalDuration).toBeLessThan(10000); // Máximo 10 segundos total
    }, 30000);

    test('debe manejar bulk operations de auditoría eficientemente', async () => {
      const auditEntries = [];
      for (let i = 0; i < 200; i++) {
        auditEntries.push({
          usuario_id: testUsers[i % testUsers.length].id,
          accion: ['upload_document', 'view_reputation', 'approve_verification'][i % 3],
          entidad_tipo: 'verification_request',
          entidad_id: `test-entity-${i}`,
          detalles: `Operación de carga ${i}`,
          exito: Math.random() > 0.1, // 90% exitosas
          ip_address: `192.168.1.${i % 255}`,
          user_agent: 'LoadTest/1.0'
        });
      }

      const insertStart = performance.now();
      await prisma.audit_logs.createMany({ data: auditEntries });
      const insertEnd = performance.now();

      console.log(`📊 Inserción masiva de ${auditEntries.length} registros de auditoría:`);
      console.log(`⏱️ Duración: ${(insertEnd - insertStart).toFixed(2)}ms`);

      expect(insertEnd - insertStart).toBeLessThan(5000); // Máximo 5 segundos
    }, 30000);
  });
});

/**
 * Función auxiliar para crear solicitud de verificación
 */
async function makeVerificationRequest(token, userId, index) {
  const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3003'}/api/verification/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileKey: `verification/${userId}/load-test-${index}.pdf`
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Función auxiliar para aprobar verificación
 */
async function makeVerificationApproval(token, requestId, index) {
  const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3003'}/api/admin/verification/${requestId}/approve`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      comentario: `Aprobación automática de load test ${index}`
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Función auxiliar para calcular reputación
 */
async function calculateReputationForUser(userId, index) {
  const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3003'}/api/reputation/update-own`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt.sign(
        { id: userId, email: `prof${index}@test.com`, rol: 'profesional' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      )}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Función auxiliar para obtener ranking global
 */
async function getGlobalRanking(limit = 100) {
  const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3003'}/api/reputation/ranking?limit=${limit}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwt.sign(
        { id: 'test-user', email: 'test@test.com', rol: 'profesional' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      )}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Función auxiliar para asignar medallas
 */
async function assignMedalsForUser(userId, index) {
  // Simular métricas que activan medallas
  const metrics = {
    averageRating: 4.5 + (Math.random() * 0.5), // 4.5-5.0
    completedJobs: Math.floor(Math.random() * 100) + 50, // 50-150
    onTimePercentage: 90 + (Math.random() * 10) // 90-100
  };

  // Llamar al endpoint que recalcula reputación y asigna medallas
  return await calculateReputationForUser(userId, index);
}
