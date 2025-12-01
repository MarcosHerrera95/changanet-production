const { PrismaClient } = require('@prisma/client');

async function checkUsersStats() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n📊 ESTADÍSTICAS DE USUARIOS EN LA BASE DE DATOS:\n');
    console.log('='.repeat(60));
    
    // Contar por rol usando Prisma
    const roleStats = await prisma.usuarios.groupBy({
      by: ['rol'],
      _count: {
        id: true
      },
      orderBy: {
        rol: 'asc'
      }
    });
    
    console.log('\n👥 Por Rol:');
    roleStats.forEach(row => {
      console.log(`   ${row.rol.toUpperCase().padEnd(15)}: ${row._count.id} usuarios`);
    });
    
    // Total de usuarios
    const totalUsers = await prisma.usuarios.count();
    console.log(`\n   ${'TOTAL'.padEnd(15)}: ${totalUsers} usuarios`);
    
    // Profesionales verificados
    const verifiedProfs = await prisma.usuarios.count({
      where: {
        rol: 'profesional',
        esta_verificado: true
      }
    });
    
    console.log('\n✅ Profesionales Verificados:', verifiedProfs);
    
    // Profesionales pendientes de verificación
    const pendingProfs = await prisma.usuarios.count({
      where: {
        rol: 'profesional',
        esta_verificado: false
      }
    });
    
    console.log('⏳ Profesionales Pendientes:', pendingProfs);
    
    // Total de profesionales (verificados + pendientes)
    const totalProfs = verifiedProfs + pendingProfs;
    console.log('📋 Total Profesionales:', totalProfs);
    
    // Contar clientes
    const totalClients = await prisma.usuarios.count({
      where: {
        rol: 'cliente'
      }
    });
    
    console.log('👤 Total Clientes:', totalClients);
    
    // Análisis específico de la pregunta
    console.log('\n🔍 ANÁLISIS ESPECÍFICO:');
    console.log('='.repeat(40));
    
    if (totalClients >= 100) {
      console.log(`✅ SÍ hay ${totalClients} clientes (más de 100)`);
    } else {
      console.log(`❌ NO hay 100 clientes, solo ${totalClients}`);
    }
    
    if (totalProfs >= 100) {
      console.log(`✅ SÍ hay ${totalProfs} profesionales (más de 100)`);
    } else {
      console.log(`❌ NO hay 100 profesionales, solo ${totalProfs}`);
    }
    
    console.log('\n📈 RESUMEN EJECUTIVO:');
    console.log('='.repeat(30));
    
    const hasEnoughClients = totalClients >= 100;
    const hasEnoughProfessionals = totalProfs >= 100;
    
    if (hasEnoughClients && hasEnoughProfessionals) {
      console.log('🎉 OBJETIVO CUMPLIDO: Ambos grupos tienen >= 100 usuarios');
    } else if (hasEnoughClients) {
      console.log('⚠️  Parcial: Clientes >= 100, pero profesionales < 100');
    } else if (hasEnoughProfessionals) {
      console.log('⚠️  Parcial: Profesionales >= 100, pero clientes < 100');
    } else {
      console.log('❌ OBJETIVO NO CUMPLIDO: Ambos grupos tienen < 100 usuarios');
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsersStats();
