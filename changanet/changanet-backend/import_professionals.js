const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function importProfessionals() {
  console.log('🚀 Starting import of professional data...');

  try {
    // Read JSON files
    const usersPath = path.join(__dirname, 'usuarios_profesionales.json');
    const profilesPath = path.join(__dirname, 'perfiles_profesionales.json');

    console.log('📖 Reading JSON files...');
    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    const profilesData = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));

    console.log(`📊 Found ${usersData.length} users and ${profilesData.length} profiles to import`);

    let importedUsers = 0;
    let importedProfiles = 0;
    let errors = [];

    // Process in batches for better performance
    const batchSize = 10;

    for (let i = 0; i < usersData.length; i += batchSize) {
      const userBatch = usersData.slice(i, i + batchSize);
      const profileBatch = profilesData.slice(i, i + batchSize);

      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(usersData.length / batchSize)}`);

      await prisma.$transaction(async (tx) => {
        for (let j = 0; j < userBatch.length; j++) {
          const userData = userBatch[j];
          const profileData = profileBatch[j];

          try {
            // Upsert user
            const newUser = await tx.usuarios.upsert({
              where: { id: userData.id },
              update: {
                url_foto_perfil: userData.url_foto_perfil,
                // Update other fields if necessary
              },
              create: {
                id: userData.id,
                email: userData.email,
                hash_contrasena: userData.hash_contrasena,
                nombre: userData.nombre,
                telefono: userData.telefono,
                rol: userData.rol,
                esta_verificado: userData.esta_verificado,
                bloqueado: userData.bloqueado,
                url_foto_perfil: userData.url_foto_perfil,
                sms_enabled: userData.sms_enabled,
                notificaciones_push: userData.notificaciones_push,
                notificaciones_email: userData.notificaciones_email,
                notificaciones_sms: userData.notificaciones_sms,
                notificaciones_servicios: userData.notificaciones_servicios,
                notificaciones_mensajes: userData.notificaciones_mensajes,
                notificaciones_pagos: userData.notificaciones_pagos,
                notificaciones_marketing: userData.notificaciones_marketing,
                creado_en: new Date(userData.creado_en)
              }
            });

            // Upsert profile
            await tx.perfiles_profesionales.upsert({
              where: { usuario_id: newUser.id },
              update: {
                url_foto_perfil: profileData.url_foto_perfil,
                // Update other fields if necessary
              },
              create: {
                usuario_id: newUser.id,
                especialidad: profileData.especialidad,
                especialidades: profileData.especialidades,
                anos_experiencia: profileData.anos_experiencia,
                zona_cobertura: profileData.zona_cobertura,
                ubicacion: profileData.ubicacion,
                latitud: profileData.latitud,
                longitud: profileData.longitud,
                tipo_tarifa: profileData.tipo_tarifa,
                tarifa_hora: profileData.tarifa_hora,
                descripcion: profileData.descripcion,
                url_foto_perfil: profileData.url_foto_perfil,
                esta_disponible: profileData.esta_disponible,
                calificacion_promedio: profileData.calificacion_promedio,
                estado_verificacion: profileData.estado_verificacion,
                creado_en: new Date(profileData.creado_en)
              }
            });

            importedUsers++;
            importedProfiles++;
            console.log(`✅ Imported/Updated user and profile: ${userData.nombre} (${userData.email})`);

          } catch (error) {
            console.error(`❌ Error importing user ${userData.email}:`, error.message);
            errors.push({
              user: userData.email,
              error: error.message
            });
          }
        }
      }, { timeout: 30000 });
    }

    // Summary
    console.log('\n📈 Import Summary:');
    console.log(`✅ Users imported/updated: ${importedUsers}`);
    console.log(`✅ Profiles imported/updated: ${importedProfiles}`);
    console.log(`❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n🚨 Errors encountered:');
      errors.forEach(err => {
        console.log(`  - ${err.user}: ${err.error}`);
      });
    }

    const totalExpected = usersData.length;
    const totalImported = importedUsers;
    const success = totalImported === totalExpected && errors.length === 0;

    if (success) {
      console.log(`\n🎉 Import completed successfully! All ${totalExpected} users and profiles imported.`);
    } else {
      console.log(`\n⚠️  Import completed with issues. Expected: ${totalExpected}, Imported: ${totalImported}, Errors: ${errors.length}`);
    }

  } catch (error) {
    console.error('💥 Fatal error during import:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importProfessionals()
  .then(() => {
    console.log('🏁 Import script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Import script failed:', error);
    process.exit(1);
  });