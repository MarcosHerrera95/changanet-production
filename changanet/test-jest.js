// test-jest.js - Script ejecutable para ejecutar pruebas de Jest en Changánet
const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Ejecutando pruebas automatizadas de Changánet con Jest...\n');

// Función para ejecutar comando
function runCommand(command, args, description) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 ${description}...`);

    const child = spawn(command, args, {
      cwd: path.join(__dirname, 'changanet-backend'),
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} completado exitosamente\n`);
        resolve();
      } else {
        console.log(`❌ ${description} falló con código ${code}\n`);
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      console.error(`❌ Error ejecutando ${description}:`, error.message);
      reject(error);
    });
  });
}

// Función principal
async function runTests() {
  try {
    // 1. Ejecutar pruebas unitarias y de integración
    await runCommand(
      'npm',
      ['test'],
      'Ejecutando pruebas unitarias e integración'
    );

    // 2. Generar reporte de cobertura
    await runCommand(
      'npm',
      ['run', 'test:coverage'],
      'Generando reporte de cobertura'
    );

    console.log('🎉 Todas las pruebas completadas exitosamente!');
    console.log('\n📊 Reportes disponibles:');
    console.log('- Cobertura HTML: changanet-backend/coverage/lcov-report/index.html');
    console.log('- Resumen en consola: Ver arriba');

    console.log('\n📋 Próximos pasos recomendados:');
    console.log('1. Revisar reportes de cobertura para identificar áreas sin pruebas');
    console.log('2. Agregar más pruebas para funcionalidades críticas');
    console.log('3. Configurar CI/CD para ejecutar pruebas automáticamente');
    console.log('4. Monitorear métricas de calidad del código');

  } catch (error) {
    console.error('\n❌ Error en la ejecución de pruebas:', error.message);
    process.exit(1);
  }
}

// Verificar que estamos en el directorio correcto
if (!require('fs').existsSync('changanet-backend')) {
  console.error('❌ Error: Ejecutar desde el directorio raíz del proyecto');
  process.exit(1);
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
