/**
 * Script to update professional profiles with profile photos and cover photos
 * This enhances the existing user photos with professional-specific images
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Generate RandomUser.me URLs for different photos
const generateRandomPhoto = (type = 'profile') => {
  const randNum = Math.floor(Math.random() * 1000);
  
  if (type === 'cover') {
    // For cover photos, use landscape images
    return `https://randomuser.me/api/portraits/landscape/${randNum % 2 === 0 ? 'men' : 'women'}/${randNum}.jpg`;
  } else {
    // For profile photos, use portrait images
    const gender = randNum % 2 === 0 ? 'men' : 'women';
    return `https://randomuser.me/api/portraits/${gender}/${randNum}.jpg`;
  }
};

async function updateProfessionalPhotos() {
  try {
    console.log('🔄 Updating professional profile photos...');
    
    // Get all professionals with their current profiles
    const profesionales = await prisma.usuarios.findMany({
      where: {
        rol: 'profesional'
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        url_foto_perfil: true,
        perfil_profesional: {
          select: {
            usuario_id: true,
            url_foto_perfil: true,
            url_foto_portada: true
          }
        }
      }
    });
    
    console.log(`📊 Found ${profesionales.length} professionals`);
    
    let updatedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const profesional of profesionales) {
      try {
        const userPhoto = profesional.url_foto_perfil;
        const currentProfessionalPhoto = profesional.perfil_profesional?.url_foto_perfil;
        const currentCoverPhoto = profesional.perfil_profesional?.url_foto_portada;
        
        // Determine new photos
        const newProfessionalPhoto = userPhoto; // Use the same photo as the user profile
        const newCoverPhoto = currentCoverPhoto || generateRandomPhoto('cover');
        
        // Check if we need to update
        const needsUpdate = !currentProfessionalPhoto || !currentCoverPhoto;
        
        if (!needsUpdate) {
          console.log(`⏭️  Skipping ${profesional.nombre} - already has both photos`);
          skippedCount++;
          continue;
        }
        
        if (profesional.perfil_profesional) {
          // Update existing professional profile
          const updated = await prisma.perfiles_profesionales.update({
            where: { usuario_id: profesional.id },
            data: {
              url_foto_perfil: newProfessionalPhoto,
              url_foto_portada: newCoverPhoto
            }
          });
          updatedCount++;
          console.log(`✅ Updated ${profesional.nombre}`);
          console.log(`   Profile: ${newProfessionalPhoto}`);
          console.log(`   Cover: ${newCoverPhoto}`);
        } else {
          // Create new professional profile
          const created = await prisma.perfiles_profesionales.create({
            data: {
              usuario_id: profesional.id,
              especialidad: 'Servicios Profesionales', // Default specialty
              zona_cobertura: 'Argentina',
              tipo_tarifa: 'hora',
              url_foto_perfil: newProfessionalPhoto,
              url_foto_portada: newCoverPhoto,
              esta_disponible: true
            }
          });
          createdCount++;
          console.log(`🆕 Created profile for ${profesional.nombre}`);
          console.log(`   Profile: ${newProfessionalPhoto}`);
          console.log(`   Cover: ${newCoverPhoto}`);
        }
        
        // Add a small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error updating ${profesional.nombre}:`, error);
      }
    }
    
    console.log('\n📈 Summary:');
    console.log(`✅ Updated: ${updatedCount} professionals`);
    console.log(`🆕 Created: ${createdCount} professional profiles`);
    console.log(`⏭️  Skipped: ${skippedCount} professionals (already complete)`);
    console.log(`📊 Total processed: ${updatedCount + createdCount + skippedCount}`);
    
    return {
      updated: updatedCount,
      created: createdCount,
      skipped: skippedCount,
      total: profesionales.length
    };
    
  } catch (error) {
    console.error('❌ Error updating professional photos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use in other scripts
module.exports = { updateProfessionalPhotos, generateRandomPhoto };

// Run if called directly
if (require.main === module) {
  updateProfessionalPhotos()
    .then(result => {
      console.log('\n🎉 Professional photo update complete!');
      console.log(`Successfully processed ${result.total} professionals`);
      console.log(`${result.updated + result.created} profiles were enhanced with photos`);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}
