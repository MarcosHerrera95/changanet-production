const { PrismaClient } = require('@prisma/client');

async function checkProfessionalProfiles() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔍 ANÁLISIS DE PERFILES PROFESIONALES:\n');
    console.log('='.repeat(50));
    
    // 1. Contar usuarios con rol profesional
    const totalProfessionals = await prisma.usuarios.count({
      where: { rol: 'profesional' }
    });
    
    console.log(`📋 Total de usuarios con rol 'profesional': ${totalProfessionals}`);
    
    // 2. Contar perfiles profesionales
    const totalProfiles = await prisma.perfiles_profesionales.count();
    console.log(`📋 Total de perfiles_profesionales: ${totalProfiles}`);
    
    // 3. Verificar usuarios profesionales CON perfil
    const professionalsWithProfile = await prisma.usuarios.count({
      where: {
        rol: 'profesional',
        perfil_profesional: {
          isNot: null
        }
      }
    });
    
    console.log(`✅ Profesionales CON perfil: ${professionalsWithProfile}`);
    
    // 4. Verificar usuarios profesionales SIN perfil
    const professionalsWithoutProfile = totalProfessionals - professionalsWithProfile;
    console.log(`❌ Profesionales SIN perfil: ${professionalsWithoutProfile}`);
    
    // 5. Obtener algunos ejemplos de profesionales sin perfil
    if (professionalsWithoutProfile > 0) {
      console.log('\n🔍 Ejemplos de profesionales SIN perfil:');
      const professionalsNoProfile = await prisma.usuarios.findMany({
        where: { rol: 'profesional' },
        include: {
          perfiles_profesionales: true
        },
        take: 5
      });
      
      professionalsNoProfile.forEach(prof => {
        const hasProfile = prof.perfiles_profesionales && prof.perfiles_profesionales.length > 0;
        console.log(`   - ${prof.nombre} (${prof.email}) - Tiene perfil: ${hasProfile}`);
      });
    }
    
    // 6. Verificar si hay un campo diferente para la relación
    console.log('\n🔍 Verificando estructura de datos:');
    
    // Intentar buscar con el nombre de tabla correcto
    try {
      const professionalsWithProfile2 = await prisma.usuarios.count({
        where: {
          rol: 'profesional',
          perfiles_profesionales: {
            some: {}
          }
        }
      });
      console.log(`✅ Con perfiles_profesionales (some): ${professionalsWithProfile2}`);
    } catch (error) {
      console.log(`❌ Error con perfiles_profesionales: ${error.message}`);
    }
    
    // 7. Verificar los campos disponibles en la tabla usuarios
    console.log('\n🔍 Estructura de tabla usuarios (campos relevantes):');
    const sampleUser = await prisma.usuarios.findFirst({
      where: { rol: 'profesional' }
    });
    
    if (sampleUser) {
      console.log('Campos disponibles:', Object.keys(sampleUser));
      console.log('Ejemplo de usuario profesional:', {
        id: sampleUser.id,
        nombre: sampleUser.nombre,
        email: sampleUser.email,
        rol: sampleUser.rol,
        esta_verificado: sampleUser.esta_verificado
      });
    }
    
    // 8. Verificar si la tabla se llama diferente
    console.log('\n🔍 Verificando nombres de tablas en el esquema:');
    try {
      // Intentar acceder directamente a perfiles_profesionales
      const profileCount = await prisma.perfiles_profesionales.count();
      console.log(`✅ Tabla 'perfiles_profesionales' existe con ${profileCount} registros`);
    } catch (error) {
      console.log(`❌ Tabla 'perfiles_profesionales' no encontrada: ${error.message}`);
      
      // Intentar con nombre diferente
      try {
        const alternativeName = 'PerfilesProfesionales';
        const altCount = await prisma[alternativeName].count();
        console.log(`✅ Tabla '${alternativeName}' existe con ${altCount} registros`);
      } catch (error2) {
        console.log(`❌ Tabla '${alternativeName}' no encontrada: ${error2.message}`);
      }
    }
    
    // 9. Mostrar algunos ejemplos de perfiles si existen
    if (totalProfiles > 0) {
      console.log('\n🔍 Ejemplos de perfiles profesionales:');
      const sampleProfiles = await prisma.perfiles_profesionales.findMany({
        take: 3,
        include: {
          usuarios: {
            select: {
              nombre: true,
              email: true,
              rol: true
            }
          }
        }
      });
      
      sampleProfiles.forEach(profile => {
        console.log(`   - Usuario: ${profile.usuarios?.nombre} (${profile.usuarios?.email})`);
        console.log(`     Especialidad: ${profile.especialidad || 'No especificada'}`);
        console.log(`     Zona: ${profile.zona_cobertura || 'No especificada'}`);
        console.log(`     Estado: ${profile.estado_verificacion || 'No especificado'}`);
        console.log('');
      });
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 RESUMEN DEL PROBLEMA:');
    console.log('='.repeat(30));
    
    if (professionalsWithoutProfile > 0) {
      console.log(`❌ PROBLEMA IDENTIFICADO: ${professionalsWithoutProfile} profesionales no tienen perfil profesional`);
      console.log('🔧 SOLUCIÓN: Crear perfiles profesionales para estos usuarios');
      console.log('📝 Para solucionarlo, se debe ejecutar el script de creación de perfiles');
    } else {
      console.log('✅ Todos los profesionales tienen perfiles asociados');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkProfessionalProfiles();
