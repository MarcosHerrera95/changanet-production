/**
 * Script para visualizar profesionales disponibles en la base de datos
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listProfessionals() {
  console.log('🔧 Profesionales Disponibles en la Plataforma\n');

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

    console.log(`Total de profesionales: ${professionals.length}\n`);

    professionals.forEach((prof, index) => {
      const perfil = prof.perfil_profesional;
      console.log(`${index + 1}. ${prof.nombre}`);
      console.log(`   📧 Email: ${prof.email}`);
      console.log(`   📱 Teléfono: ${prof.telefono}`);
      console.log(`   🛠️  Especialidad: ${perfil?.especialidad || 'No especificada'}`);
      console.log(`   📍 Zona: ${perfil?.zona_cobertura || 'No especificada'}`);
      console.log(`   💰 Tarifa/hora: $${perfil?.tarifa_hora || 'No especificada'}`);
      console.log(`   ⭐ Calificación: ${perfil?.calificacion_promedio || 'Sin reseñas'}`);
      console.log(`   ✅ Verificado: ${prof.esta_verificado ? 'Sí' : 'No'} (${perfil?.estado_verificacion || 'pendiente'})`);
      console.log(`   📸 Foto: ${prof.url_foto_perfil}`);
      console.log('');
    });

    // Estadísticas por especialidad
    console.log('📊 Estadísticas por Especialidad:');
    const especialidadesCount = {};
    professionals.forEach(prof => {
      const esp = prof.perfil_profesional?.especialidad;
      if (esp) {
        especialidadesCount[esp] = (especialidadesCount[esp] || 0) + 1;
      }
    });

    Object.entries(especialidadesCount).forEach(([esp, count]) => {
      console.log(`   ${esp}: ${count} profesionales`);
    });

  } catch (error) {
    console.error('❌ Error al consultar profesionales:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listProfessionals();
