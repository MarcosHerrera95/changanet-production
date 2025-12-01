const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteProfessionals() {
  console.log('🧹 Starting deletion of professional data...');

  try {
    // Delete profiles first (due to foreign key)
    const deletedProfiles = await prisma.perfiles_profesionales.deleteMany({
      where: {
        usuario: {
          rol: 'profesional'
        }
      }
    });

    // Delete users
    const deletedUsers = await prisma.usuarios.deleteMany({
      where: {
        rol: 'profesional'
      }
    });

    console.log(`🗑️  Deleted ${deletedProfiles.count} profiles`);
    console.log(`🗑️  Deleted ${deletedUsers.count} users`);
    console.log('✅ Deletion completed successfully!');

  } catch (error) {
    console.error('💥 Error during deletion:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the deletion
deleteProfessionals()
  .then(() => {
    console.log('🏁 Deletion script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Deletion script failed:', error);
    process.exit(1);
  });