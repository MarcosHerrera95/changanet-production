/**
 * Script para eliminar los usuarios de prueba generados
 * Elimina 100 clientes y 100 profesionales de test
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteTestUsers() {
  console.log('🗑️ Eliminando usuarios de prueba...\n');

  try {
    // Contar usuarios antes de eliminar
    const totalBefore = await prisma.usuarios.count();
    console.log(`📊 Total de usuarios antes: ${totalBefore}`);

    // Generar listas de emails de prueba
    const clientEmails = [];
    const professionalEmails = [];
    for (let i = 1; i <= 100; i++) {
      clientEmails.push(`cliente${String(i).padStart(3, '0')}@cliente.changanet.com`);
      professionalEmails.push(`profesional${String(i).padStart(3, '0')}@profesional.changanet.com`);
    }

    // Obtener IDs de los usuarios a eliminar
    const testUsers = await prisma.usuarios.findMany({
      where: {
        OR: [
          { email: { in: clientEmails } },
          { email: { in: professionalEmails } }
        ]
      },
      select: { id: true, email: true }
    });

    const testUserIds = testUsers.map(u => u.id);
    console.log(`🔍 Encontrados ${testUserIds.length} usuarios de prueba para eliminar`);

    if (testUserIds.length === 0) {
      console.log('ℹ️ No se encontraron usuarios de prueba para eliminar');
      return;
    }

    // Eliminar en orden correcto (dependencias primero)
    console.log('🧹 Limpiando datos relacionados...');

    // Eliminar logros_usuario relacionados
    await prisma.logros_usuario.deleteMany({
      where: { usuario_id: { in: testUserIds } }
    });

    // Eliminar favoritos relacionados
    await prisma.favoritos.deleteMany({
      where: {
        OR: [
          { cliente_id: { in: testUserIds } },
          { profesional_id: { in: testUserIds } }
        ]
      }
    });

    // Eliminar servicios recurrentes relacionados
    await prisma.servicios_recurrrentes.deleteMany({
      where: {
        OR: [
          { cliente_id: { in: testUserIds } },
          { profesional_id: { in: testUserIds } }
        ]
      }
    });

    // Eliminar pagos relacionados
    await prisma.pagos.deleteMany({
      where: {
        OR: [
          { cliente_id: { in: testUserIds } },
          { profesional_id: { in: testUserIds } }
        ]
      }
    });

    // Eliminar respuestas de cotizaciones
    await prisma.cotizacion_respuestas.deleteMany({
      where: { profesional_id: { in: testUserIds } }
    });

    // Eliminar cotizaciones
    await prisma.cotizaciones.deleteMany({
      where: { cliente_id: { in: testUserIds } }
    });

    // Eliminar notificaciones
    await prisma.notificaciones.deleteMany({
      where: { usuario_id: { in: testUserIds } }
    });

    // Eliminar disponibilidad
    await prisma.disponibilidad.deleteMany({
      where: {
        OR: [
          { profesional_id: { in: testUserIds } },
          { reservado_por: { in: testUserIds } }
        ]
      }
    });

    // Eliminar mensajes
    await prisma.mensajes.deleteMany({
      where: {
        OR: [
          { remitente_id: { in: testUserIds } },
          { destinatario_id: { in: testUserIds } }
        ]
      }
    });

    // Eliminar reseñas
    await prisma.resenas.deleteMany({
      where: {
        OR: [
          { cliente_id: { in: testUserIds } },
          { servicio: { profesional_id: { in: testUserIds } } }
        ]
      }
    });

    // Eliminar servicios
    await prisma.servicios.deleteMany({
      where: {
        OR: [
          { cliente_id: { in: testUserIds } },
          { profesional_id: { in: testUserIds } }
        ]
      }
    });

    // Eliminar perfiles profesionales
    await prisma.perfiles_profesionales.deleteMany({
      where: { usuario_id: { in: testUserIds } }
    });

    // Eliminar verification_requests
    await prisma.verification_requests.deleteMany({
      where: { usuario_id: { in: testUserIds } }
    });

    // Finalmente eliminar los usuarios
    const deletedUsers = await prisma.usuarios.deleteMany({
      where: { id: { in: testUserIds } }
    });

    console.log(`👥 Usuarios eliminados: ${deletedUsers.count}`);

    // Contar usuarios después de eliminar
    const totalAfter = await prisma.usuarios.count();
    console.log(`📊 Total de usuarios después: ${totalAfter}`);

    console.log(`\n✅ Eliminación completada:`);
    console.log(`   Total usuarios eliminados: ${deletedUsers.count}`);
    console.log(`   Usuarios restantes: ${totalAfter}`);

  } catch (error) {
    console.error('❌ Error al eliminar usuarios de prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestUsers();
