/**
 * Script to analyze current users in the database and their profile photo status
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsersAndPhotos() {
  try {
    console.log('🔍 Analyzing current users in database...');
    
    const users = await prisma.usuarios.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        url_foto_perfil: true
      },
      orderBy: {
        creado_en: 'asc'
      }
    });
    
    console.log('📊 Database Summary:');
    console.log(`Total users: ${users.length}`);
    
    const clientes = users.filter(user => user.rol === 'cliente');
    const profesionales = users.filter(user => user.rol === 'profesional');
    const admins = users.filter(user => user.rol === 'admin');
    
    console.log(`Clients: ${clientes.length}`);
    console.log(`Professionals: ${profesionales.length}`);
    console.log(`Admins: ${admins.length}`);
    
    // Count users with and without photos
    const clientesConFoto = clientes.filter(user => user.url_foto_perfil).length;
    const clientesSinFoto = clientes.length - clientesConFoto;
    const profesionalesConFoto = profesionales.filter(user => user.url_foto_perfil).length;
    const profesionalesSinFoto = profesionales.length - profesionalesConFoto;
    
    console.log('\n📸 Profile Photo Status:');
    console.log(`Clients with photos: ${clientesConFoto}`);
    console.log(`Clients without photos: ${clientesSinFoto}`);
    console.log(`Professionals with photos: ${profesionalesConFoto}`);
    console.log(`Professionals without photos: ${profesionalesSinFoto}`);
    
    // Show first few users without photos
    console.log('\n👥 Sample clients without photos:');
    clientes.filter(user => !user.url_foto_perfil).slice(0, 10).forEach(user => {
      console.log(`- ${user.nombre} (${user.email})`);
    });
    
    console.log('\n👨‍💼 Sample professionals without photos:');
    profesionales.filter(user => !user.url_foto_perfil).slice(0, 10).forEach(user => {
      console.log(`- ${user.nombre} (${user.email})`);
    });
    
    return {
      totalUsers: users.length,
      clientes: clientes.length,
      profesionales: profesionales.length,
      clientesSinFoto,
      profesionalesSinFoto,
      clientsToUpdate: clientes.filter(user => !user.url_foto_perfil),
      professionalsToUpdate: profesionales.filter(user => !user.url_foto_perfil)
    };
    
  } catch (error) {
    console.error('❌ Error analyzing users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use in other scripts
module.exports = { checkUsersAndPhotos };

// Run if called directly
if (require.main === module) {
  checkUsersAndPhotos()
    .then(result => {
      console.log('\n✅ Analysis complete!');
      console.log(`Ready to update ${result.clientesSinFoto} clients and ${result.profesionalesSinFoto} professionals with profile photos.`);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}
