/**
 * Script para reemplazar todas las URLs de fotos con URLs de UI Avatars que funcionan
 * Esta solución asegura que todas las fotos sean visibles en el frontend
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Función para generar URL de UI Avatar
function generateUIAvatarUrl(name) {
  const encodedName = encodeURIComponent(name);
  return `https://ui-avatars.com/api/?name=${encodedName}&size=400&background=random&color=fff&bold=true&format=png`;
}

// Función para generar URL de foto de portada (landscape)
function generateLandscapePhoto(name) {
  const colors = ['E3F2FD', 'F3E5F5', 'E8F5E8', 'FFF3E0', 'E1F5FE', 'F1F8E9'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const encodedName = encodeURIComponent(name);
  return `https://ui-avatars.com/api/?name=${encodedName}&size=800x400&background=${randomColor}&color=fff&bold=true&format=png`;
}

async function fixProfilePhotosWithUIAvatars() {
  try {
    console.log('🔧 Fixing Profile Photos with UI Avatars (Working URLs)');
    console.log('='.repeat(70));
    
    // Update all users with working photo URLs
    const usuarios = await prisma.usuarios.findMany({
      select: {
        id: true,
        nombre: true,
        rol: true,
        url_foto_perfil: true
      }
    });
    
    console.log(`📊 Found ${usuarios.length} users to update`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const usuario of usuarios) {
      try {
        // Generate new working photo URL
        const newPhotoUrl = generateUIAvatarUrl(usuario.nombre);
        
        // Check if we need to update
        if (usuario.url_foto_perfil === newPhotoUrl) {
          console.log(`⏭️  Skipping ${usuario.nombre} - already has correct URL`);
          skippedCount++;
          continue;
        }
        
        // Update user's photo URL
        await prisma.usuarios.update({
          where: { id: usuario.id },
          data: { url_foto_perfil: newPhotoUrl }
        });
        
        updatedCount++;
        console.log(`✅ Updated ${usuario.nombre} (${usuario.rol})`);
        console.log(`   New URL: ${newPhotoUrl}`);
        
        // Add small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`❌ Error updating ${usuario.nombre}:`, error);
      }
    }
    
    // Update professional profiles with cover photos
    console.log('\n👨‍💼 Updating Professional Profile Cover Photos...');
    console.log('='.repeat(70));
    
    const perfilesProfesionales = await prisma.perfiles_profesionales.findMany({
      include: {
        usuario: {
          select: {
            nombre: true
          }
        }
      }
    });
    
    let coverUpdatedCount = 0;
    
    for (const perfil of perfilesProfesionales) {
      try {
        const newCoverUrl = generateLandscapePhoto(perfil.usuario.nombre);
        
        await prisma.perfiles_profesionales.update({
          where: { usuario_id: perfil.usuario_id },
          data: { 
            url_foto_portada: newCoverUrl,
            url_foto_perfil: perfil.url_foto_perfil // Keep existing profile photo
          }
        });
        
        coverUpdatedCount++;
        console.log(`✅ Updated cover for ${perfil.usuario.nombre}`);
        console.log(`   Cover URL: ${newCoverUrl}`);
        
        // Add small delay
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`❌ Error updating cover for ${perfil.usuario.nombre}:`, error);
      }
    }
    
    console.log('\n📈 Summary:');
    console.log('='.repeat(70));
    console.log(`✅ User photos updated: ${updatedCount}`);
    console.log(`⏭️  Users skipped: ${skippedCount}`);
    console.log(`✅ Cover photos updated: ${coverUpdatedCount}`);
    console.log(`📊 Total users processed: ${updatedCount + skippedCount}`);
    
    // Test a few updated URLs to make sure they work
    console.log('\n🧪 Testing Updated URLs...');
    console.log('='.repeat(50));
    
    const testUsers = await prisma.usuarios.findMany({
      select: {
        nombre: true,
        url_foto_perfil: true
      },
      take: 5
    });
    
    const https = require('https');
    
    function testUrl(url) {
      return new Promise((resolve) => {
        https.get(url, (res) => {
          resolve(res.statusCode === 200);
        }).on('error', () => {
          resolve(false);
        });
      });
    }
    
    let workingCount = 0;
    for (const user of testUsers) {
      const isWorking = await testUrl(user.url_foto_perfil);
      console.log(`${user.nombre}: ${isWorking ? '✅ Working' : '❌ Not working'}`);
      if (isWorking) workingCount++;
    }
    
    console.log(`\n🎯 URL Test Results: ${workingCount}/${testUsers.length} URLs working`);
    
    return {
      usersUpdated: updatedCount,
      coversUpdated: coverUpdatedCount,
      workingUrls: workingCount,
      totalTested: testUsers.length
    };
    
  } catch (error) {
    console.error('❌ Error fixing profile photos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use in other scripts
module.exports = { fixProfilePhotosWithUIAvatars, generateUIAvatarUrl, generateLandscapePhoto };

// Run if called directly
if (require.main === module) {
  fixProfilePhotosWithUIAvatars()
    .then(result => {
      console.log('\n🎉 Profile Photos Fix Completed!');
      console.log(`✅ Successfully updated ${result.usersUpdated} user photos`);
      console.log(`✅ Successfully updated ${result.coversUpdated} cover photos`);
      console.log(`✅ URL test results: ${result.workingUrls}/${result.totalTested} working`);
      console.log('\n🚀 All profile photos should now be visible in the frontend!');
    })
    .catch(error => {
      console.error('❌ Fix failed:', error);
      process.exit(1);
    });
}
