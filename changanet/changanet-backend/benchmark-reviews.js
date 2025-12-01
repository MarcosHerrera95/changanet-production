/**
 * Script de benchmarking para el sistema de reseñas optimizado
 * Mide rendimiento de consultas, caché y operaciones de reseñas
 */

const { PrismaClient } = require('@prisma/client');
const { get, set, del } = require('./src/services/cacheService');
const prisma = new PrismaClient();

class ReviewBenchmark {
  constructor() {
    this.results = {};
    this.testData = {
      professionalIds: [],
      reviewIds: []
    };
  }

  /**
   * Medir tiempo de ejecución de una función
   */
  async measureTime(label, fn, iterations = 1) {
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      await fn();
      const end = process.hrtime.bigint();
      const timeMs = Number(end - start) / 1_000_000; // Convertir a milisegundos
      times.push(timeMs);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    this.results[label] = {
      average: avg.toFixed(2) + 'ms',
      min: min.toFixed(2) + 'ms',
      max: max.toFixed(2) + 'ms',
      iterations,
      total: (avg * iterations).toFixed(2) + 'ms'
    };

    console.log(`📊 ${label}: ${avg.toFixed(2)}ms (avg), ${min.toFixed(2)}ms (min), ${max.toFixed(2)}ms (max)`);
  }

  /**
   * Preparar datos de prueba
   */
  async setupTestData() {
    console.log('🔧 Preparando datos de prueba...');

    // Obtener algunos profesionales existentes
    const professionals = await prisma.perfiles_profesionales.findMany({
      take: 5,
      select: { usuario_id: true }
    });

    this.testData.professionalIds = professionals.map(p => p.usuario_id);

    // Obtener algunas reseñas existentes
    const reviews = await prisma.resenas.findMany({
      take: 10,
      select: { id: true, servicio: { select: { profesional_id: true } } }
    });

    this.testData.reviewIds = reviews.map(r => r.id);

    console.log(`✅ Datos preparados: ${this.testData.professionalIds.length} profesionales, ${this.testData.reviewIds.length} reseñas`);
  }

  /**
   * Benchmark de consultas de reseñas sin caché
   */
  async benchmarkReviewQueries() {
    console.log('\n🔍 Benchmarking consultas de reseñas...');

    const professionalId = this.testData.professionalIds[0];

    // Consulta sin caché (simular primera vez)
    await this.measureTime('Consulta reseñas (sin caché)', async () => {
      const cacheKey = `review:stats:${professionalId}`;
      await del(cacheKey); // Limpiar caché

      const reviews = await prisma.resenas.findMany({
        where: {
          servicio: {
            profesional_id: professionalId
          }
        },
        select: {
          calificacion: true,
          creado_en: true
        },
        orderBy: { creado_en: 'desc' }
      });

      // Calcular estadísticas
      const totalReviews = reviews.length;
      const averageRating = totalReviews > 0
        ? reviews.reduce((sum, review) => sum + review.calificacion, 0) / totalReviews
        : 0;
    }, 5);

    // Consulta con caché
    await this.measureTime('Consulta reseñas (con caché)', async () => {
      const cacheKey = `review:stats:${professionalId}`;
      const cached = await get(cacheKey);

      if (!cached) {
        const reviews = await prisma.resenas.findMany({
          where: {
            servicio: {
              profesional_id: professionalId
            }
          },
          select: {
            calificacion: true,
            creado_en: true
          },
          orderBy: { creado_en: 'desc' }
        });

        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0
          ? reviews.reduce((sum, review) => sum + review.calificacion, 0) / totalReviews
          : 0;

        const stats = {
          totalReviews,
          averageRating: Math.round(averageRating * 10) / 10
        };

        await set(cacheKey, JSON.stringify(stats), 900);
      }
    }, 10);
  }

  /**
   * Benchmark de paginación
   */
  async benchmarkPagination() {
    console.log('\n📄 Benchmarking paginación...');

    const professionalId = this.testData.professionalIds[0];

    // Paginación offset/limit
    await this.measureTime('Paginación offset/limit', async () => {
      const page = 1;
      const limit = 10;
      const offset = (page - 1) * limit;

      const [reviews, totalCount] = await Promise.all([
        prisma.resenas.findMany({
          where: {
            servicio: {
              profesional_id: professionalId
            }
          },
          include: {
            servicio: true,
            cliente: {
              select: { nombre: true, email: true }
            }
          },
          orderBy: { creado_en: 'desc' },
          skip: offset,
          take: limit
        }),
        prisma.resenas.count({
          where: {
            servicio: {
              profesional_id: professionalId
            }
          }
        })
      ]);
    }, 5);
  }

  /**
   * Benchmark de operaciones de escritura
   */
  async benchmarkWriteOperations() {
    console.log('\n✍️ Benchmarking operaciones de escritura...');

    // Simular creación de reseña (sin realmente crearla)
    await this.measureTime('Cálculo de promedio después de reseña', async () => {
      const professionalId = this.testData.professionalIds[0];

      // Simular actualización de promedio
      const reviews = await prisma.resenas.findMany({
        where: {
          servicio: {
            profesional_id: professionalId
          }
        },
        select: { calificacion: true }
      });

      const averageRating = reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.calificacion, 0) / reviews.length
        : 0;

      // Actualizar perfil (sin guardar realmente)
      // await prisma.perfiles_profesionales.update({...})
    }, 5);
  }

  /**
   * Benchmark de índices de base de datos
   */
  async benchmarkDatabaseIndices() {
    console.log('\n🗂️ Benchmarking índices de base de datos...');

    const professionalId = this.testData.professionalIds[0];

    // Consulta que usa índices compuestos
    await this.measureTime('Consulta con índices cliente_id, creado_en', async () => {
      await prisma.resenas.findMany({
        where: { cliente_id: professionalId },
        orderBy: { creado_en: 'desc' },
        take: 5
      });
    }, 5);

    // Consulta que usa índices de calificación
    await this.measureTime('Consulta ordenada por calificación', async () => {
      await prisma.resenas.findMany({
        where: {
          servicio: {
            profesional_id: professionalId
          }
        },
        orderBy: { calificacion: 'desc' },
        take: 10
      });
    }, 5);
  }

  /**
   * Ejecutar todos los benchmarks
   */
  async runAllBenchmarks() {
    console.log('🚀 Iniciando benchmarks del sistema de reseñas...\n');

    try {
      await this.setupTestData();
      await this.benchmarkReviewQueries();
      await this.benchmarkPagination();
      await this.benchmarkWriteOperations();
      await this.benchmarkDatabaseIndices();

      this.printResults();
    } catch (error) {
      console.error('❌ Error en benchmarks:', error);
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Imprimir resultados finales
   */
  printResults() {
    console.log('\n📈 RESULTADOS FINALES DEL BENCHMARK');
    console.log('=' .repeat(50));

    Object.entries(this.results).forEach(([label, data]) => {
      console.log(`\n${label}:`);
      console.log(`  Promedio: ${data.average}`);
      console.log(`  Mínimo: ${data.min}`);
      console.log(`  Máximo: ${data.max}`);
      console.log(`  Iteraciones: ${data.iterations}`);
      console.log(`  Total: ${data.total}`);
    });

    console.log('\n✅ Benchmarks completados exitosamente!');
    console.log('\n💡 Recomendaciones de optimización:');
    console.log('- Mantener caché Redis para estadísticas');
    console.log('- Usar paginación offset/limit para listas grandes');
    console.log('- Índices compuestos mejoran rendimiento de consultas');
    console.log('- Lazy loading reduce tiempo de carga inicial');
  }
}

// Ejecutar benchmarks si se llama directamente
if (require.main === module) {
  const benchmark = new ReviewBenchmark();
  benchmark.runAllBenchmarks().catch(console.error);
}

module.exports = ReviewBenchmark;
