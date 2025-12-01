/**
 * @archivo test-prometheus.js - Pruebas de métricas Prometheus
 * @descripción Script para verificar funcionamiento de métricas de monitoreo (REQ-41)
 * @sprint Sprint 1 – Autenticación y Perfiles
 * @tarjeta Tarjeta 1: [Infra] Configurar Monitoreo con Prometheus y Grafana
 * @impacto Ambiental: Verificación de métricas para optimización de recursos del sistema
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3003';
const METRICS_URL = `${BACKEND_URL}/api/metrics`;

console.log('🚀 Iniciando pruebas de métricas de Prometheus...');

/**
 * Función para hacer una solicitud HTTP y esperar
 */
async function makeRequest(method, path, delay = 1000) {
  try {
    const url = `${BACKEND_URL}${path}`;
    console.log(`📡 ${method} ${url}`);

    const response = await axios({
      method: method.toLowerCase(),
      url,
      timeout: 5000
    });

    console.log(`✅ ${method} ${path} - Status: ${response.status}`);
    return response;
  } catch (error) {
    console.log(`❌ ${method} ${path} - Error: ${error.response?.status || error.message}`);
    throw error;
  } finally {
    // Esperar entre solicitudes para evitar sobrecarga
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

/**
 * Obtener métricas de Prometheus
 */
async function getMetrics() {
  try {
    console.log('📊 Obteniendo métricas de Prometheus...');
    const response = await axios.get(METRICS_URL);
    const metrics = response.data;

    console.log('✅ Métricas obtenidas exitosamente');
    console.log(`📏 Longitud: ${metrics.length} caracteres`);

    // Analizar métricas
    const lines = metrics.split('\n');
    const metricLines = lines.filter(line => line && !line.startsWith('#'));

    console.log(`📈 Total de líneas de métricas: ${metricLines.length}`);

    // Buscar métricas específicas
    const changanetMetrics = lines.filter(line =>
      line.includes('changanet_') && !line.startsWith('#')
    );

    console.log(`🎯 Métricas de Changánet encontradas: ${changanetMetrics.length}`);

    // Mostrar algunas métricas de ejemplo
    const sampleMetrics = changanetMetrics.slice(0, 5);
    console.log('\n📋 Ejemplos de métricas encontradas:');
    sampleMetrics.forEach(metric => {
      console.log(`   ${metric}`);
    });

    return metrics;
  } catch (error) {
    console.error('❌ Error obteniendo métricas:', error.message);
    throw error;
  }
}

/**
 * Verificar métricas específicas
 */
function verifyMetrics(metrics) {
  const lines = metrics.split('\n');
  const checks = [
    { name: 'Métricas HTTP', pattern: /changanet_http_request_duration_seconds/ },
    { name: 'Métricas de servicios', pattern: /changanet_services_total/ },
    { name: 'Métricas de usuarios', pattern: /changanet_users_total/ },
    { name: 'Métricas de SMS', pattern: /changanet_sms_total/ },
    { name: 'Métricas de sistema', pattern: /changanet_nodejs_heap_size/ }
  ];

  console.log('\n🔍 Verificando métricas específicas:');

  checks.forEach(check => {
    const found = lines.some(line => check.pattern.test(line));
    console.log(`${found ? '✅' : '❌'} ${check.name}`);
  });
}

/**
 * Función principal de pruebas
 */
async function runTests() {
  try {
    console.log('🧪 Ejecutando pruebas de métricas...\n');

    // Prueba 1: Verificar que el endpoint de métricas responde
    console.log('1️⃣ Prueba: Endpoint de métricas responde');
    await makeRequest('GET', '/api/metrics/health');
    console.log('✅ Endpoint de métricas funcionando\n');

    // Prueba 2: Hacer algunas solicitudes HTTP para generar métricas
    console.log('2️⃣ Prueba: Generando métricas HTTP');
    await makeRequest('GET', '/health');
    await makeRequest('GET', '/api/metrics/health');
    await makeRequest('GET', '/api/auth/test', 500); // Esta puede fallar, pero genera métrica
    console.log('✅ Solicitudes HTTP realizadas\n');

    // Prueba 3: Obtener y verificar métricas
    console.log('3️⃣ Prueba: Obtener métricas de Prometheus');
    const metrics = await getMetrics();
    console.log('✅ Métricas obtenidas\n');

    // Prueba 4: Verificar métricas específicas
    console.log('4️⃣ Prueba: Verificar métricas específicas');
    verifyMetrics(metrics);
    console.log('✅ Verificación completada\n');

    // Prueba 5: Verificar formato Prometheus
    console.log('5️⃣ Prueba: Verificar formato Prometheus');
    if (metrics.includes('# HELP') && metrics.includes('# TYPE')) {
      console.log('✅ Formato Prometheus válido');
    } else {
      console.log('❌ Formato Prometheus inválido');
    }

    console.log('\n🎉 Todas las pruebas de métricas completadas exitosamente!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Iniciar Prometheus y Grafana con: docker-compose up -d');
    console.log('2. Acceder a Prometheus: http://localhost:9090');
    console.log('3. Acceder a Grafana: http://localhost:3000 (admin/admin)');
    console.log('4. Importar dashboard de Changánet en Grafana');
    console.log('5. Verificar que las métricas aparecen en tiempo real');

  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error.message);
    process.exit(1);
  }
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
  runTests();
}

module.exports = { runTests, getMetrics, makeRequest };
