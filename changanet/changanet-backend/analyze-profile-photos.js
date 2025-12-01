/**
 * Script to analyze profile photos and verify they are valid URLs
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeProfilePhotos() {
  try {
    console.log('🔍 Analyzing profile photo URLs...');
    
    // Get users with their profile photos
    const usuarios = await prisma.usuarios.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        url_foto_perfil: true
      },
      where: {
        url_foto_perfil: {
          not: null
        }
      },
      take: 20 // Just sample first 20 users
    });
    
    console.log('📊 Sample Profile Photos:');
    console.log('='.repeat(60));
    
    usuarios.forEach((user, index) => {
      console.log(`${index + 1}. ${user.nombre} (${user.rol})`);
      console.log(`   Photo URL: ${user.url_foto_perfil}`);
      console.log(`   URL Length: ${user.url_foto_perfil.length} characters`);
      
      // Check if URL looks like a valid image URL
      const looksValid = user.url_foto_perfil.includes('cloudinary') || 
                        user.url_foto_perfil.includes('http') ||
                        user.url_foto_perfil.includes('.jpg') ||
                        user.url_foto_perfil.includes('.jpeg') ||
                        user.url_foto_perfil.includes('.png');
      
      console.log(`   Valid format: ${looksValid ? '✅' : '❌'}`);
      console.log('');
    });
    
    // Check if we have diverse photo sources
    const photoSources = usuarios.map(user => {
      if (user.url_foto_perfil.includes('cloudinary')) return 'Cloudinary';
      if (user.url_foto_perfil.includes('http')) return 'External URL';
      return 'Other';
    });
    
    const sourceCounts = {};
    photoSources.forEach(source => {
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    
    console.log('📈 Photo Source Distribution:');
    Object.entries(sourceCounts).forEach(([source, count]) => {
      console.log(`   ${source}: ${count}`);
    });
    
    // Get professional profiles with cover photos too
    const perfilesProfesionales = await prisma.perfiles_profesionales.findMany({
      select: {
        usuario: {
          select: {
            nombre: true,
            email: true,
            url_foto_perfil: true
          }
        },
        url_foto_perfil: true,
        url_foto_portada: true
      },
      take: 10
    });
    
    console.log('\n📋 Professional Profile Photos (including cover photos):');
    console.log('='.repeat(60));
    
    perfilesProfesionales.forEach((perfil, index) => {
      console.log(`${index + 1}. ${perfil.usuario.nombre}`);
      console.log(`   Profile Photo: ${perfil.usuario.url_foto_perfil || 'None'}`);
      console.log(`   Professional Photo: ${perfil.url_foto_perfil || 'None'}`);
      console.log(`   Cover Photo: ${perfil.url_foto_portada || 'None'}`);
      console.log('');
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Error analyzing photos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use in other scripts
module.exports = { analyzeProfilePhotos };

// Run if called directly
if (require.main === module) {
  analyzeProfilePhotos()
    .then(() => {
      console.log('✅ Profile photo analysis complete!');
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}
