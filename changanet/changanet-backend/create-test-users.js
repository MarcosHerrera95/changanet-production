const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    console.log('🚀 Creando usuarios de prueba para Changánet...\n');

    // Limpiar datos existentes de prueba (orden inverso por dependencias)
    console.log('🧹 Eliminando datos de prueba existentes...');

    // Eliminar reseñas primero
    await prisma.resenas.deleteMany();

    // Eliminar pagos
    await prisma.pagos.deleteMany();

    // Eliminar servicios
    await prisma.servicios.deleteMany();

    // Eliminar perfiles profesionales
    await prisma.perfiles_profesionales.deleteMany();

    // Eliminar usuarios de prueba
    const testEmails = [
      'maria.gonzalez@email.com', 'carlos.rodriguez@email.com', 'ana.lopez@email.com', 'juan.martinez@email.com',
      'electricista@email.com', 'plomero@email.com', 'pintor@email.com', 'jardinero@email.com', 'aireacondicionado@email.com'
    ];

    for (const email of testEmails) {
      await prisma.usuarios.deleteMany({
        where: { email }
      });
    }
    console.log('✅ Datos de prueba existentes eliminados\n');

    // Datos de prueba para clientes
    const clientsData = [
      {
        nombre: 'María González',
        email: 'maria.gonzalez@email.com',
        telefono: '+54 9 11 5555-0101',
        url_foto_perfil: 'https://randomuser.me/api/portraits/women/1.jpg'
      },
      {
        nombre: 'Carlos Rodríguez',
        email: 'carlos.rodriguez@email.com',
        telefono: '+54 9 11 5555-0102',
        url_foto_perfil: 'https://randomuser.me/api/portraits/men/2.jpg'
      },
      {
        nombre: 'Ana López',
        email: 'ana.lopez@email.com',
        telefono: '+54 9 11 5555-0103',
        url_foto_perfil: 'https://randomuser.me/api/portraits/women/3.jpg'
      },
      {
        nombre: 'Juan Martínez',
        email: 'juan.martinez@email.com',
        telefono: '+54 9 11 5555-0104',
        url_foto_perfil: 'https://randomuser.me/api/portraits/men/4.jpg'
      }
    ];

    // Datos de prueba para profesionales
    const professionalsData = [
      {
        nombre: 'Electricista Profesional',
        email: 'electricista@email.com',
        telefono: '+54 9 11 5555-0201',
        url_foto_perfil: 'https://randomuser.me/api/portraits/men/5.jpg',
        especialidad: 'Electricista',
        descripcion: 'Servicio eléctrico residencial y comercial. Reparaciones, instalaciones y mantenimiento.',
        precio_base: 2500,
        ubicacion: 'Buenos Aires, Argentina'
      },
      {
        nombre: 'Plomero Experto',
        email: 'plomero@email.com',
        telefono: '+54 9 11 5555-0202',
        url_foto_perfil: 'https://randomuser.me/api/portraits/men/6.jpg',
        especialidad: 'Plomero',
        descripcion: 'Instalaciones sanitarias, reparaciones de cañerías, desagües y grifería.',
        precio_base: 2200,
        ubicacion: 'Buenos Aires, Argentina'
      },
      {
        nombre: 'Pintor Decorador',
        email: 'pintor@email.com',
        telefono: '+54 9 11 5555-0203',
        url_foto_perfil: 'https://randomuser.me/api/portraits/women/7.jpg',
        especialidad: 'Pintor',
        descripcion: 'Pintura interior y exterior, decoración, renovación de espacios.',
        precio_base: 1800,
        ubicacion: 'Buenos Aires, Argentina'
      },
      {
        nombre: 'Jardinero Paisajista',
        email: 'jardinero@email.com',
        telefono: '+54 9 11 5555-0204',
        url_foto_perfil: 'https://randomuser.me/api/portraits/men/8.jpg',
        especialidad: 'Jardinero',
        descripcion: 'Diseño de jardines, mantenimiento, poda y paisajismo.',
        precio_base: 2000,
        ubicacion: 'Buenos Aires, Argentina'
      },
      {
        nombre: 'Técnico en Aire Acondicionado',
        email: 'aireacondicionado@email.com',
        telefono: '+54 9 11 5555-0205',
        url_foto_perfil: 'https://randomuser.me/api/portraits/men/9.jpg',
        especialidad: 'Climatización',
        descripcion: 'Instalación, reparación y mantenimiento de aires acondicionados.',
        precio_base: 3000,
        ubicacion: 'Buenos Aires, Argentina'
      }
    ];

    // Crear clientes
    console.log('👥 Creando usuarios clientes...');
    const clients = [];
    for (const clientData of clientsData) {
      const hashedPassword = await bcrypt.hash('cliente123', 10);
      const client = await prisma.usuarios.create({
        data: {
          nombre: clientData.nombre,
          email: clientData.email,
          hash_contrasena: hashedPassword,
          rol: 'cliente',
          telefono: clientData.telefono,
          url_foto_perfil: clientData.url_foto_perfil,
          esta_verificado: true,
          bloqueado: false,
          sms_enabled: true
        }
      });
      clients.push(client);
      console.log(`✅ Cliente creado: ${client.nombre} (${client.email})`);
    }

    // Crear profesionales
    console.log('\n🔧 Creando usuarios profesionales...');
    const professionals = [];
    for (const profData of professionalsData) {
      const hashedPassword = await bcrypt.hash('profesional123', 10);
      const professional = await prisma.usuarios.create({
        data: {
          nombre: profData.nombre,
          email: profData.email,
          hash_contrasena: hashedPassword,
          rol: 'profesional',
          telefono: profData.telefono,
          url_foto_perfil: profData.url_foto_perfil,
          esta_verificado: true,
          bloqueado: false,
          sms_enabled: true
        }
      });

      // Crear perfil profesional
      const profile = await prisma.perfiles_profesionales.create({
        data: {
          usuario_id: professional.id,
          especialidad: profData.especialidad,
          descripcion: profData.descripcion,
          zona_cobertura: profData.ubicacion,
          tarifa_hora: profData.precio_base,
          calificacion_promedio: Math.floor(Math.random() * 2) + 4, // 4-5 estrellas
          estado_verificacion: 'verificado',
          anos_experiencia: Math.floor(Math.random() * 10) + 5, // 5-15 años de experiencia
          latitud: -34.6037 + (Math.random() - 0.5) * 0.1, // Coordenadas de Buenos Aires con variación
          longitud: -58.3816 + (Math.random() - 0.5) * 0.1
        }
      });

      professionals.push({ ...professional, profile });
      console.log(`✅ Profesional creado: ${professional.nombre} - ${profData.especialidad}`);
    }

    // Crear algunos servicios de prueba
    console.log('\n🛠️ Creando servicios de prueba...');
    const servicesData = [
      {
        cliente_id: clients[0].id,
        profesional_id: professionals[0].id,
        descripcion: 'Reparación de tomacorriente en la cocina que dejó de funcionar',
        estado: 'COMPLETADO'
      },
      {
        cliente_id: clients[1].id,
        profesional_id: professionals[1].id,
        descripcion: 'Cañería del lavamanos en el baño está goteando constantemente',
        estado: 'AGENDADO'
      },
      {
        cliente_id: clients[2].id,
        profesional_id: professionals[2].id,
        descripcion: 'Pintura completa de sala de estar con colores modernos',
        estado: 'PENDIENTE'
      },
      {
        cliente_id: clients[3].id,
        profesional_id: professionals[3].id,
        descripcion: 'Mantenimiento mensual de jardín: poda de árboles y limpieza',
        estado: 'COMPLETADO'
      }
    ];

    const services = [];
    for (const serviceData of servicesData) {
      const service = await prisma.servicios.create({
        data: serviceData
      });
      services.push(service);
      console.log(`✅ Servicio creado: ${service.titulo} - ${service.estado}`);
    }

    // Crear algunas reseñas
    console.log('\n⭐ Creando reseñas de prueba...');
    const reviewsData = [
      {
        servicio_id: services[0].id,
        cliente_id: clients[0].id,
        calificacion: 5,
        comentario: 'Excelente trabajo, muy profesional y puntual. Recomiendo ampliamente.'
      },
      {
        servicio_id: services[3].id,
        cliente_id: clients[3].id,
        calificacion: 4,
        comentario: 'Buen trabajo, el jardín quedó perfecto. Un poco caro pero vale la pena.'
      }
    ];

    for (const reviewData of reviewsData) {
      const review = await prisma.resenas.create({
        data: reviewData
      });
      console.log(`✅ Reseña creada: ${review.calificacion} estrellas`);
    }

    console.log('\n🎉 ¡Usuarios de prueba creados exitosamente!');
    console.log('\n📋 Credenciales de acceso:');
    console.log('Clientes:');
    clientsData.forEach(client => {
      console.log(`  ${client.email} / cliente123`);
    });
    console.log('\nProfesionales:');
    professionalsData.forEach(prof => {
      console.log(`  ${prof.email} / profesional123`);
    });
    console.log('\nAdmin:');
    console.log('  admin@changanet.com / admin123456');

    console.log('\n📊 Resumen:');
    console.log(`  👥 ${clients.length} clientes creados`);
    console.log(`  🔧 ${professionals.length} profesionales creados`);
    console.log(`  🛠️ ${services.length} servicios creados`);
    console.log('  ⭐ Algunas reseñas agregadas');

  } catch (error) {
    console.error('❌ Error creando usuarios de prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();
