const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Datos base para generar variedad
const nombres = [
  'María', 'Carlos', 'Ana', 'Juan', 'Laura', 'Pedro', 'Sofia', 'Diego', 'Valentina', 'Mateo',
  'Camila', 'Lucas', 'Isabella', 'Santiago', 'Emma', 'Leonardo', 'Mia', 'Alejandro', 'Luna', 'Daniel',
  'Victoria', 'Gabriel', 'Olivia', 'Matías', 'Amelia', 'Sebastián', 'Natalia', 'Benjamín', 'Martina', 'Emiliano',
  'Zoe', 'Thiago', 'Abril', 'Felipe', 'Catalina', 'Joaquín', 'Elena', 'Agustín', 'Julia', 'Tomás',
  'Antonia', 'Ciro', 'Florencia', 'Lorenzo', 'Micaela', 'Facundo', 'Renata', 'Luciano', 'Alma', 'Ignacio'
];

const apellidos = [
  'González', 'Rodríguez', 'López', 'Martínez', 'Pérez', 'García', 'Sánchez', 'Ramírez', 'Torres', 'Flores',
  'Rivera', 'Gómez', 'Díaz', 'Morales', 'Ortiz', 'Gutierrez', 'Chavez', 'Ramos', 'Hernández', 'Jiménez',
  'Ruiz', 'Fernández', 'Moreno', 'Álvarez', 'Romero', 'Vargas', 'Castro', 'Paredes', 'Silva', 'Mendoza',
  'Guerrero', 'Cabrera', 'Luna', 'Sosa', 'Rojas', 'Molina', 'Acosta', 'Medina', 'Herrera', 'Aguilar',
  'Vega', 'Santiago', 'Delgado', 'Ponce', 'Castillo', 'Cortés', 'Guzmán', 'Santos', 'Núñez', 'Peña'
];

const especialidades = [
  'Electricista', 'Plomero', 'Pintor', 'Jardinero', 'Climatización', 'Carpintero', 'Cerrajero', 'Gasista',
  'Albañil', 'Techista', 'Mecánico', 'Soldador', 'Vidriero', 'Herrero', 'Fontanero', 'Instalador',
  'Decorador', 'Arquitecto', 'Ingeniero', 'Técnico', 'Especialista', 'Profesional', 'Experto', 'Maestro'
];

const zonas = [
  'Buenos Aires, Argentina', 'Córdoba, Argentina', 'Rosario, Argentina', 'Mendoza, Argentina',
  'La Plata, Argentina', 'Mar del Plata, Argentina', 'Salta, Argentina', 'Santa Fe, Argentina',
  'San Juan, Argentina', 'Resistencia, Argentina', 'Neuquén, Argentina', 'Bahía Blanca, Argentina'
];

function generarNombreCompleto() {
  const nombre = nombres[Math.floor(Math.random() * nombres.length)];
  const apellido1 = apellidos[Math.floor(Math.random() * apellidos.length)];
  const apellido2 = apellidos[Math.floor(Math.random() * apellidos.length)];
  return `${nombre} ${apellido1} ${apellido2}`;
}

function generarEmail(nombreCompleto, tipo, index) {
  const nombreLimpio = nombreCompleto.toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '')
    .substring(0, 20);
  return `${tipo}${index}@${nombreLimpio}.com`;
}

function generarTelefono(index) {
  const prefijos = ['11', '221', '261', '341', '351', '381', '299', '280'];
  const prefijo = prefijos[Math.floor(Math.random() * prefijos.length)];
  const numero = String(index).padStart(7, '0');
  return `+54 9 ${prefijo} ${numero.slice(0, 3)}-${numero.slice(3)}`;
}

function generarEspecialidadCompleta() {
  const base = especialidades[Math.floor(Math.random() * especialidades.length)];
  const sufijos = ['', ' Residencial', ' Profesional', ' Experto', ' Certificado', ' Especialista'];
  return base + sufijos[Math.floor(Math.random() * sufijos.length)];
}

async function createMassiveTestUsers() {
  try {
    console.log('🚀 Creando 200 usuarios de prueba masivos para Changánet...\n');

    // Limpiar datos existentes
    console.log('🧹 Eliminando datos existentes...');
    await prisma.resenas.deleteMany();
    await prisma.pagos.deleteMany();
    await prisma.servicios.deleteMany();
    await prisma.perfiles_profesionales.deleteMany();

    // Eliminar usuarios de prueba (mantener admin)
    const testEmails = [];
    for (let i = 0; i < 200; i++) {
      testEmails.push(`cliente${i}@test.com`, `profesional${i}@test.com`);
    }
    testEmails.push(
      'maria.gonzalez@email.com', 'carlos.rodriguez@email.com', 'ana.lopez@email.com', 'juan.martinez@email.com',
      'electricista@email.com', 'plomero@email.com', 'pintor@email.com', 'jardinero@email.com', 'aireacondicionado@email.com'
    );

    for (const email of testEmails) {
      await prisma.usuarios.deleteMany({ where: { email } });
    }
    console.log('✅ Datos limpios\n');

    // Crear 100 clientes
    console.log('👥 Creando 100 usuarios clientes...');
    const clients = [];
    for (let i = 0; i < 100; i++) {
      const nombreCompleto = generarNombreCompleto();
      const email = generarEmail(nombreCompleto, 'cliente', i);
      const hashedPassword = await bcrypt.hash('cliente123', 10);

      const client = await prisma.usuarios.create({
        data: {
          nombre: nombreCompleto,
          email,
          hash_contrasena: hashedPassword,
          rol: 'cliente',
          telefono: generarTelefono(i),
          url_foto_perfil: `https://randomuser.me/api/portraits/${i % 2 === 0 ? 'women' : 'men'}/${i % 99 + 1}.jpg`,
          esta_verificado: Math.random() > 0.1, // 90% verificados
          bloqueado: false,
          sms_enabled: Math.random() > 0.3 // 70% con SMS habilitado
        }
      });
      clients.push(client);

      if ((i + 1) % 20 === 0) {
        console.log(`✅ ${i + 1} clientes creados`);
      }
    }

    // Crear 100 profesionales
    console.log('\n🔧 Creando 100 usuarios profesionales...');
    const professionals = [];
    for (let i = 0; i < 100; i++) {
      const nombreCompleto = generarNombreCompleto();
      const email = generarEmail(nombreCompleto, 'profesional', i);
      const hashedPassword = await bcrypt.hash('profesional123', 10);

      const professional = await prisma.usuarios.create({
        data: {
          nombre: nombreCompleto,
          email,
          hash_contrasena: hashedPassword,
          rol: 'profesional',
          telefono: generarTelefono(100 + i),
          url_foto_perfil: `https://randomuser.me/api/portraits/${i % 2 === 0 ? 'women' : 'men'}/${(i % 99 + 1)}.jpg`,
          esta_verificado: Math.random() > 0.05, // 95% verificados
          bloqueado: false,
          sms_enabled: Math.random() > 0.2 // 80% con SMS habilitado
        }
      });

      // Crear perfil profesional
      const especialidad = generarEspecialidadCompleta();
      const tarifaBase = Math.floor(Math.random() * 5000) + 1000; // $1000-$6000
      const anosExperiencia = Math.floor(Math.random() * 20) + 1; // 1-20 años
      const zona = zonas[Math.floor(Math.random() * zonas.length)];

      const profile = await prisma.perfiles_profesionales.create({
        data: {
          usuario_id: professional.id,
          especialidad,
          descripcion: `Servicio profesional de ${especialidad.toLowerCase()}. ${anosExperiencia} años de experiencia. Trabajo garantizado y precios competitivos.`,
          zona_cobertura: zona,
          tarifa_hora: tarifaBase,
          calificacion_promedio: Math.floor(Math.random() * 2) + 3 + Math.random(), // 3.0-5.0
          estado_verificacion: Math.random() > 0.1 ? 'verificado' : 'pendiente',
          anos_experiencia: anosExperiencia,
          latitud: -34.6037 + (Math.random() - 0.5) * 0.2, // Área de Buenos Aires
          longitud: -58.3816 + (Math.random() - 0.5) * 0.2
        }
      });

      professionals.push({ ...professional, profile });

      if ((i + 1) % 20 === 0) {
        console.log(`✅ ${i + 1} profesionales creados`);
      }
    }

    // Crear algunos servicios aleatorios
    console.log('\n🛠️ Creando servicios de prueba...');
    const services = [];
    const serviceDescriptions = [
      'Reparación de instalación eléctrica',
      'Mantenimiento de cañerías',
      'Pintura interior completa',
      'Jardinería y mantenimiento',
      'Instalación de aire acondicionado',
      'Reparación de puerta',
      'Instalación de cerrajería',
      'Revisión de instalación de gas',
      'Revoque y preparación de paredes',
      'Instalación de techo',
      'Reparación de electrodomésticos',
      'Soldadura especializada',
      'Instalación de vidrios',
      'Trabajo en herrería',
      'Reparación de grifería',
      'Instalación eléctrica residencial',
      'Decoración de interiores',
      'Asesoría técnica',
      'Mantenimiento preventivo',
      'Servicio de urgencia'
    ];

    for (let i = 0; i < 50; i++) {
      const cliente = clients[Math.floor(Math.random() * clients.length)];
      const profesional = professionals[Math.floor(Math.random() * professionals.length)];
      const descripcion = serviceDescriptions[Math.floor(Math.random() * serviceDescriptions.length)];
      const estados = ['PENDIENTE', 'AGENDADO', 'COMPLETADO', 'CANCELADO'];
      const estado = estados[Math.floor(Math.random() * estados.length)];

      const service = await prisma.servicios.create({
        data: {
          cliente_id: cliente.id,
          profesional_id: profesional.id,
          descripcion: `${descripcion} - ${cliente.nombre}`,
          estado
        }
      });
      services.push(service);
    }
    console.log(`✅ ${services.length} servicios creados`);

    // Crear reseñas para servicios completados
    console.log('\n⭐ Creando reseñas...');
    const completedServices = services.filter(s => s.estado === 'COMPLETADO');
    let reviewsCount = 0;

    for (const service of completedServices) {
      if (Math.random() > 0.3) { // 70% de servicios completados tienen reseña
        const cliente = clients.find(c => c.id === service.cliente_id);
        const calificacion = Math.floor(Math.random() * 3) + 3; // 3-5 estrellas
        const comentarios = [
          'Excelente trabajo, muy profesional y puntual.',
          'Buen servicio, recomendado.',
          'Trabajo bien hecho, precio justo.',
          'Muy satisfecho con el resultado.',
          'Profesional competente y amable.',
          'Servicio de calidad, volveré a contratar.',
          'Cumplió con lo acordado perfectamente.',
          'Excelente atención al cliente.'
        ];
        const comentario = comentarios[Math.floor(Math.random() * comentarios.length)];

        await prisma.resenas.create({
          data: {
            servicio_id: service.id,
            cliente_id: cliente.id,
            calificacion,
            comentario
          }
        });
        reviewsCount++;
      }
    }
    console.log(`✅ ${reviewsCount} reseñas creadas`);

    console.log('\n🎉 ¡200 usuarios de prueba creados exitosamente!');
    console.log('\n📋 Credenciales de acceso:');
    console.log('Clientes: [nombre].[apellido]@cliente[0-99].com / cliente123');
    console.log('Profesionales: [nombre].[apellido]@profesional[0-99].com / profesional123');
    console.log('Admin: admin@changanet.com / admin123456');

    console.log('\n📊 Resumen:');
    console.log(`  👥 ${clients.length} clientes creados`);
    console.log(`  🔧 ${professionals.length} profesionales creados`);
    console.log(`  🛠️ ${services.length} servicios creados`);
    console.log(`  ⭐ ${reviewsCount} reseñas agregadas`);

    // Mostrar algunas estadísticas
    const stats = await prisma.usuarios.count();
    const profCount = await prisma.usuarios.count({ where: { rol: 'profesional' } });
    const clientCount = await prisma.usuarios.count({ where: { rol: 'cliente' } });
    const serviceCount = await prisma.servicios.count();

    console.log('\n📈 Estadísticas finales:');
    console.log(`  Total usuarios: ${stats}`);
    console.log(`  Clientes: ${clientCount}`);
    console.log(`  Profesionales: ${profCount}`);
    console.log(`  Servicios: ${serviceCount}`);

  } catch (error) {
    console.error('❌ Error creando usuarios masivos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMassiveTestUsers();
