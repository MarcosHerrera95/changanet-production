/**
 * Script para mostrar listado compacto de profesionales disponibles
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listProfessionalsCompact() {
  console.log('🔧 LISTADO DE PROFESIONALES DISPONIBLES\n');

  try {
    const professionals = await prisma.usuarios.findMany({
      where: {
        rol: 'profesional'
      },
      include: {
        perfil_profesional: true
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    console.log(`Total: ${professionals.length} profesionales\n`);

    // Encabezado de tabla
    console.log('┌─────┬─────────────────────┬─────────────────┬─────────────┬─────────────┬─────────┬────────────┐');
    console.log('│  #  │ Nombre              │ Especialidad    │ Zona        │ Tarifa/hora │ Rating  │ Verificado │');
    console.log('├─────┼─────────────────────┼─────────────────┼─────────────┼─────────────┼─────────┼────────────┤');

    professionals.forEach((prof, index) => {
      const perfil = prof.perfil_profesional;
      const num = String(index + 1).padStart(3, ' ');
      const nombre = prof.nombre.padEnd(19, ' ').substring(0, 19);
      const especialidad = (perfil?.especialidad || 'N/A').padEnd(15, ' ').substring(0, 15);
      const zona = (perfil?.zona_cobertura || 'N/A').padEnd(11, ' ').substring(0, 11);
      const tarifa = `$${perfil?.tarifa_hora || 0}`.padEnd(11, ' ').substring(0, 11);
      const rating = String(perfil?.calificacion_promedio || 0).padEnd(7, ' ').substring(0, 7);
      const verificado = prof.esta_verificado ? '   Sí      ' : '   No      ';

      console.log(`│ ${num} │ ${nombre} │ ${especialidad} │ ${zona} │ ${tarifa} │ ${rating} │ ${verificado} │`);
    });

    console.log('└─────┴─────────────────────┴─────────────────┴─────────────┴─────────────┴─────────┴────────────┘\n');

    // Estadísticas por especialidad
    console.log('📊 DISTRIBUCIÓN POR ESPECIALIDAD:');
    const especialidadesCount = {};
    professionals.forEach(prof => {
      const esp = prof.perfil_profesional?.especialidad;
      if (esp) {
        especialidadesCount[esp] = (especialidadesCount[esp] || 0) + 1;
      }
    });

    Object.entries(especialidadesCount).forEach(([esp, count]) => {
      console.log(`   ${esp.padEnd(12, ' ')}: ${count} profesionales`);
    });

    console.log('\n📧 ACCESO PARA TESTING:');
    console.log('   Email: profesional001@profesional.changanet.com a profesional100@profesional.changanet.com');
    console.log('   Password: 123456');

  } catch (error) {
    console.error('❌ Error al consultar profesionales:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listProfessionalsCompact();
