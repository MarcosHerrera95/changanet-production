const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProfessionals() {
  try {
    const professionals = await prisma.usuarios.findMany({
      where: { rol: 'profesional' },
      select: { id: true, nombre: true, email: true, esta_verificado: true, rol: true }
    });

    console.log('Profesionales encontrados:');
    professionals.forEach(p => {
      console.log(`ID: ${p.id}, Nombre: ${p.nombre}, Verificado: ${p.esta_verificado}, Rol: ${p.rol}`);
    });

    const verifiedProfessionals = professionals.filter(p => p.esta_verificado);
    console.log(`\nTotal profesionales: ${professionals.length}`);
    console.log(`Profesionales verificados: ${verifiedProfessionals.length}`);

    // También verificar si hay algún usuario con rol profesional pero no verificado
    const allUsers = await prisma.usuarios.findMany({
      select: { id: true, nombre: true, email: true, esta_verificado: true, rol: true }
    });

    console.log('\nTodos los usuarios:');
    allUsers.forEach(u => {
      console.log(`ID: ${u.id}, Nombre: ${u.nombre}, Rol: ${u.rol}, Verificado: ${u.esta_verificado}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProfessionals();
