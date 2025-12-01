/**
 * Script to verify that all professional profiles have profile photos and cover photos properly set
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyProfessionalPhotos() {
  try {
    console.log('🔍 Verifying professional profile photos...');
    
    // Get all professionals with their complete profile information
    const profesionales = await prisma.perfiles_profesionales.findMany({
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
            url_foto_perfil: true
          }
        }
      },
      orderBy: {
        usuario: {
          nombre: 'asc'
        }
      }
    });
    
    console.log(`📊 Found ${profesionales.length} professional profiles`);
    
    let completeProfiles = 0;
    let missingUserPhoto = 0;
    let missingProfilePhoto = 0;
    let missingCoverPhoto = 0;
    let missingAnyPhoto = 0;
    
    const detailedResults = [];
    
    profesionales.forEach((profesional, index) => {
      const userPhoto = profesional.usuario?.url_foto_perfil;
      const profilePhoto = profesional.url_foto_perfil;
      const coverPhoto = profesional.url_foto_portada;
      
      const hasUserPhoto = !!userPhoto;
      const hasProfilePhoto = !!profilePhoto;
      const hasCoverPhoto = !!coverPhoto;
      
      if (hasUserPhoto && hasProfilePhoto && hasCoverPhoto) {
        completeProfiles++;
      } else {
        missingAnyPhoto++;
      }
      
      if (!hasUserPhoto) missingUserPhoto++;
      if (!hasProfilePhoto) missingProfilePhoto++;
      if (!hasCoverPhoto) missingCoverPhoto++;
      
      detailedResults.push({
        name: profesional.usuario?.nombre,
        email: profesional.usuario?.email,
        hasUserPhoto,
        hasProfilePhoto,
        hasCoverPhoto,
        userPhoto: userPhoto || 'None',
        profilePhoto: profilePhoto || 'None',
        coverPhoto: coverPhoto || 'None'
      });
    });
    
    // Show summary statistics
    console.log('\n📈 Verification Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Complete profiles (all 3 photos): ${completeProfiles}`);
    console.log(`❌ Profiles missing any photo: ${missingAnyPhoto}`);
    console.log(`👤 Missing user photos: ${missingUserPhoto}`);
    console.log(`👨‍💼 Missing profile photos: ${missingProfilePhoto}`);
    console.log(`🖼️  Missing cover photos: ${missingCoverPhoto}`);
    console.log(`📊 Total professional profiles: ${profesionales.length}`);
    
    // Show sample of complete profiles
    console.log('\n✅ Sample Complete Profiles:');
    console.log('='.repeat(60));
    const completeProfilesSample = detailedResults.filter(p => 
      p.hasUserPhoto && p.hasProfilePhoto && p.hasCoverPhoto
    ).slice(0, 5);
    
    completeProfilesSample.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.name}`);
      console.log(`   User Photo: ${profile.userPhoto.substring(0, 50)}...`);
      console.log(`   Profile Photo: ${profile.profilePhoto.substring(0, 50)}...`);
      console.log(`   Cover Photo: ${profile.coverPhoto.substring(0, 50)}...`);
      console.log('');
    });
    
    // Check if there are any profiles with issues
    const incompleteProfiles = detailedResults.filter(p => 
      !p.hasUserPhoto || !p.hasProfilePhoto || !p.hasCoverPhoto
    );
    
    if (incompleteProfiles.length > 0) {
      console.log('❌ Profiles with missing photos:');
      console.log('='.repeat(60));
      incompleteProfiles.forEach((profile, index) => {
        console.log(`${index + 1}. ${profile.name}`);
        console.log(`   Missing: ${[
          !profile.hasUserPhoto && 'User Photo',
          !profile.hasProfilePhoto && 'Profile Photo',
          !profile.hasCoverPhoto && 'Cover Photo'
        ].filter(Boolean).join(', ')}`);
        console.log('');
      });
    }
    
    // Calculate success rate
    const successRate = (completeProfiles / profesionales.length * 100).toFixed(1);
    console.log(`\n🎯 Success Rate: ${successRate}%`);
    
    if (completeProfiles === profesionales.length) {
      console.log('🎉 All professional profiles have complete photo sets!');
    } else {
      console.log(`⚠️  ${profesionales.length - completeProfiles} profiles still need attention.`);
    }
    
    return {
      total: profesionales.length,
      complete: completeProfiles,
      incomplete: missingAnyPhoto,
      successRate: parseFloat(successRate),
      details: detailedResults
    };
    
  } catch (error) {
    console.error('❌ Error verifying professional photos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use in other scripts
module.exports = { verifyProfessionalPhotos };

// Run if called directly
if (require.main === module) {
  verifyProfessionalPhotos()
    .then(result => {
      console.log('\n✅ Professional photo verification complete!');
      if (result.successRate === 100) {
        console.log('🚀 Ready for production! All profiles have complete photo sets.');
      } else {
        console.log(`📋 Action needed: ${result.incomplete} profiles require photo updates.`);
      }
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}
