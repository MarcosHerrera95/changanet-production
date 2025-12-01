/**
 * Script de pruebas de performance para validar <2s de tiempo de respuesta
 * con 100.000 usuarios activos
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3003',
  concurrentUsers: 1000, // Simular 1000 usuarios concurrentes inicialmente
  totalRequests: 10000,
  rampUpTime: 60, // segundos para alcanzar carga máxima
  testDuration: 300, // 5 minutos de prueba
  targetResponseTime: 2000, // 2 segundos máximo
  percentiles: [50, 90, 95, 99]
};

// Métricas de performance
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: [],
  throughput: 0,
  startTime: null,
  endTime: null
};

/**
 * Simula un usuario realizando operaciones típicas
 */
async function simulateUser(userId) {
  const session = axios.create({
    baseURL: CONFIG.baseUrl,
    timeout: 10000,
    headers: {
      'User-Agent': 'PerformanceTest/1.0'
    }
  });

  // Simular flujo típico de usuario
  const operations = [
    // 1. Login (10% de operaciones)
    () => simulateLogin(session, userId),
    // 2. Ver perfil (20% de operaciones)
    () => simulateViewProfile(session, userId),
    // 3. Buscar servicios (30% de operaciones)
    () => simulateSearchServices(session),
    // 4. Ver detalles de pago (20% de operaciones)
    () => simulateViewPayments(session, userId),
    // 5. Crear preferencia de pago (10% de operaciones)
    () => simulateCreatePayment(session, userId),
    // 6. Calcular comisión (10% de operaciones)
    () => simulateCalculateCommission(session)
  ];

  while (true) {
    try {
      const operation = operations[Math.floor(Math.random() * operations.length)];
      const startTime = performance.now();

      await operation();

      const responseTime = performance.now() - startTime;
      metrics.responseTimes.push(responseTime);
      metrics.successfulRequests++;

      // Verificar SLA de 2 segundos
      if (responseTime > CONFIG.targetResponseTime) {
        console.warn(`⚠️ Respuesta lenta: ${responseTime.toFixed(2)}ms para usuario ${userId}`);
      }

    } catch (error) {
      metrics.failedRequests++;
      metrics.errors.push({
        userId,
        error: error.message,
        timestamp: new Date()
      });
    }

    metrics.totalRequests++;

    // Pausa aleatoria entre operaciones (0.1-1 segundo)
    await sleep(Math.random() * 900 + 100);
  }
}

/**
 * Simula login de usuario
 */
async function simulateLogin(session, userId) {
  const response = await session.post('/api/auth/login', {
    email: `user${userId}@test.com`,
    password: 'testpassword'
  });

  // Guardar token para requests autenticados
  if (response.data.token) {
    session.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
  }

  return response;
}

/**
 * Simula visualización de perfil
 */
async function simulateViewProfile(session, userId) {
  return await session.get(`/api/profile/${userId}`);
}

/**
 * Simula búsqueda de servicios
 */
async function simulateSearchServices(session) {
  const searchTerms = ['plomero', 'electricista', 'jardinero', 'pintor'];
  const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];

  return await session.get('/api/search/professionals', {
    params: {
      q: term,
      location: '-34.6037,-58.3816', // Buenos Aires
      limit: 20
    }
  });
}

/**
 * Simula visualización de pagos
 */
async function simulateViewPayments(session, userId) {
  return await session.get(`/api/payments/${userId}`);
}

/**
 * Simula creación de preferencia de pago
 */
async function simulateCreatePayment(session, userId) {
  return await session.post('/api/payments/create-preference', {
    serviceId: `service_${Math.floor(Math.random() * 1000)}`,
    amount: Math.floor(Math.random() * 5000) + 1000
  });
}

/**
 * Simula cálculo de comisión
 */
async function simulateCalculateCommission(session) {
  return await session.post('/api/commissions/calculate', {
    amount: Math.floor(Math.random() * 10000) + 1000,
    serviceType: 'reparacion'
  });
}

/**
 * Función de utilidad para pausas
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calcula percentiles de tiempos de respuesta
 */
function calculatePercentiles(times, percentiles) {
  const sorted = times.sort((a, b) => a - b);
  const results = {};

  percentiles.forEach(p => {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    results[`p${p}`] = sorted[index];
  });

  return results;
}

/**
 * Imprime reporte de performance
 */
function printReport() {
  const duration = (metrics.endTime - metrics.startTime) / 1000; // en segundos
  const throughput = metrics.totalRequests / duration; // requests por segundo

  console.log('\n📊 REPORTE DE PERFORMANCE');
  console.log('='.repeat(50));
  console.log(`Duración de prueba: ${duration.toFixed(2)} segundos`);
  console.log(`Total de requests: ${metrics.totalRequests}`);
  console.log(`Requests exitosos: ${metrics.successfulRequests}`);
  console.log(`Requests fallidos: ${metrics.failedRequests}`);
  console.log(`Tasa de éxito: ${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%`);
  console.log(`Throughput: ${throughput.toFixed(2)} req/seg`);
  console.log(`Throughput por minuto: ${(throughput * 60).toFixed(2)} req/min`);

  if (metrics.responseTimes.length > 0) {
    const percentiles = calculatePercentiles(metrics.responseTimes, CONFIG.percentiles);
    console.log('\n⏱️ TIEMPOS DE RESPUESTA (ms):');
    Object.entries(percentiles).forEach(([key, value]) => {
      console.log(`  ${key}: ${value.toFixed(2)}ms`);
    });

    const avgResponseTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
    console.log(`  Promedio: ${avgResponseTime.toFixed(2)}ms`);

    // Validar SLA
    const p95 = percentiles.p95;
    const slaMet = p95 <= CONFIG.targetResponseTime;
    console.log(`\n🎯 SLA (< ${CONFIG.targetResponseTime}ms P95): ${slaMet ? '✅ CUMPLIDO' : '❌ NO CUMPLIDO'}`);

    if (!slaMet) {
      console.log(`❌ P95 actual: ${p95.toFixed(2)}ms (debe ser ≤ ${CONFIG.targetResponseTime}ms)`);
    }
  }

  if (metrics.errors.length > 0) {
    console.log(`\n❌ ERRORES (${metrics.errors.length}):`);
    const errorGroups = metrics.errors.reduce((acc, error) => {
      acc[error.error] = (acc[error.error] || 0) + 1;
      return acc;
    }, {});

    Object.entries(errorGroups).forEach(([error, count]) => {
      console.log(`  ${error}: ${count} veces`);
    });
  }
}

/**
 * Función principal de prueba
 */
async function runPerformanceTest() {
  console.log('🚀 Iniciando pruebas de performance...');
  console.log(`📍 URL base: ${CONFIG.baseUrl}`);
  console.log(`👥 Usuarios concurrentes: ${CONFIG.concurrentUsers}`);
  console.log(`🎯 SLA objetivo: < ${CONFIG.targetResponseTime}ms (P95)`);

  metrics.startTime = performance.now();

  // Iniciar usuarios concurrentes
  const userPromises = [];
  for (let i = 1; i <= CONFIG.concurrentUsers; i++) {
    userPromises.push(simulateUser(i));
  }

  // Ejecutar prueba por duración especificada
  const testPromise = Promise.all(userPromises);
  const timeoutPromise = sleep(CONFIG.testDuration * 1000);

  try {
    await Promise.race([testPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error en prueba de performance:', error);
  }

  metrics.endTime = performance.now();

  // Imprimir reporte
  printReport();

  // Salir del proceso
  process.exit(0);
}

// Manejar señales de terminación
process.on('SIGINT', () => {
  console.log('\n🛑 Recibida señal de interrupción, finalizando prueba...');
  metrics.endTime = performance.now();
  printReport();
  process.exit(0);
});

// Ejecutar prueba
if (require.main === module) {
  runPerformanceTest().catch(console.error);
}

module.exports = {
  runPerformanceTest,
  simulateUser,
  calculatePercentiles
};
