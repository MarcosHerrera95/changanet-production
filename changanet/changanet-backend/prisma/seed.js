/**
 * Seed script para Changánet - Genera datos de prueba
 * Crea 100 clientes y 100 profesionales con perfiles completos
 * PRD v1.0 - REQ-01 a REQ-10
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Datos base para generar usuarios realistas
const nombresClientes = [
  'María López', 'Carlos García', 'Ana Martínez', 'José Rodríguez', 'Laura González',
  'Miguel Pérez', 'Carmen Sánchez', 'David Ramírez', 'Isabel Torres', 'Francisco Ruiz',
  'Patricia Jiménez', 'Antonio Moreno', 'Rosa Navarro', 'Juan Díaz', 'Silvia Muñoz',
  'Luis Álvarez', 'Teresa Romero', 'Diego Alonso', 'Cristina Gutiérrez', 'Manuel Herrera',
  'Pilar Morales', 'Rafael Ortega', 'Mercedes Delgado', 'Ángel Castro', 'Lucía Rubio',
  'Fernando Serrano', 'Raquel Medina', 'Sergio Aguilar', 'Nuria Vega', 'Adrián Gil',
  'Alicia Ramos', 'Rubén Domínguez', 'Inés Guerrero', 'Óscar Flores', 'Beatriz León',
  'Mario Peña', 'Sonia Cortés', 'Iván Vázquez', 'Natalia Mendoza', 'Hugo Sanz',
  'Clara Márquez', 'Alberto Cruz', 'Eva Blanco', 'Roberto Salinas', 'Mónica Cabrera',
  'Pablo Reyes', 'Irene Molina', 'Jorge Campos', 'Susana Ortega', 'Enrique Delgado'
];

const nombresProfesionales = [
  'Juan Pérez', 'María García', 'Carlos López', 'Ana Martínez', 'José Rodríguez',
  'Laura González', 'Miguel Sánchez', 'Carmen Ramírez', 'David Torres', 'Isabel Ruiz',
  'Francisco Jiménez', 'Patricia Moreno', 'Antonio Navarro', 'Rosa Díaz', 'Silvia Muñoz',
  'Luis Álvarez', 'Teresa Romero', 'Diego Alonso', 'Cristina Gutiérrez', 'Manuel Herrera',
  'Pilar Morales', 'Rafael Ortega', 'Mercedes Delgado', 'Ángel Castro', 'Lucía Rubio',
  'Fernando Serrano', 'Raquel Medina', 'Sergio Aguilar', 'Nuria Vega', 'Adrián Gil',
  'Alicia Ramos', 'Rubén Domínguez', 'Inés Guerrero', 'Óscar Flores', 'Beatriz León',
  'Mario Peña', 'Sonia Cortés', 'Iván Vázquez', 'Natalia Mendoza', 'Hugo Sanz',
  'Clara Márquez', 'Alberto Cruz', 'Eva Blanco', 'Roberto Salinas', 'Mónica Cabrera',
  'Pablo Reyes', 'Irene Molina', 'Jorge Campos', 'Susana Ortega', 'Enrique Delgado'
];

const especialidades = [
  'Plomero', 'Electricista', 'Pintor', 'Albañil', 'Gasista',
  'Carpintero', 'Herrería', 'Cerrajería', 'Mecánica', 'Jardinería'
];

const zonasCABA = [
  'Palermo, CABA', 'Recoleta, CABA', 'Belgrano, CABA', 'Almagro, CABA', 'Villa Crespo, CABA',
  'Caballito, CABA', 'Flores, CABA', 'Boedo, CABA', 'San Telmo, CABA', 'Monserrat, CABA',
  'Retiro, CABA', 'San Nicolás, CABA', 'Balvanera, CABA', 'Barracas, CABA', 'Chacarita, CABA'
];

const zonasGBA = [
  'Quilmes, Buenos Aires', 'Lanús, Buenos Aires', 'Avellaneda, Buenos Aires', 'Lomas de Zamora, Buenos Aires',
  'Banfield, Buenos Aires', 'Temperley, Buenos Aires', 'Adrogué, Buenos Aires', 'Burzaco, Buenos Aires'
];

const zonasInterior = [
  'Córdoba Capital, Córdoba', 'Rosario, Santa Fe', 'Mendoza Capital, Mendoza', 'Tucumán Capital, Tucumán'
];

const zonasCobertura = [...zonasCABA, ...zonasGBA, ...zonasInterior];

const descripciones = [
  'Servicio profesional con más de 10 años de experiencia en el rubro.',
  'Trabajo garantizado con materiales de primera calidad.',
  'Atención personalizada y presupuestos sin compromiso.',
  'Especialista en mantenimiento y reparaciones de urgencia.',
  'Servicio completo con garantía escrita incluida.',
  'Profesional matriculado con seguros de responsabilidad civil.',
  'Experiencia en obras residenciales y comerciales.',
  'Utilizo técnicas modernas y materiales certificados.',
  'Disponibilidad inmediata para emergencias.',
  'Precios competitivos sin intermediarios.'
];

function generarTelefono() {
  const prefijos = ['11', '221', '223', '261', '264', '266', '280', '299', '342', '351'];
  const prefijo = prefijos[Math.floor(Math.random() * prefijos.length)];
  const numero = Math.floor(Math.random() * 9000000) + 1000000;
  return `+54 9 ${prefijo} ${numero.toString().slice(0, 4)}-${numero.toString().slice(4)}`;
}

function generarFotoPerfil(genero = 'men', index) {
  // Usar randomuser.me para fotos realistas
  const gender = Math.random() > 0.5 ? 'men' : 'women';
  const seed = index + 100; // Evitar colisiones con usuarios existentes
  return `https://randomuser.me/api/portraits/${gender}/${seed}.jpg`;
}

function determinarEstadoVerificacion() {
  const rand = Math.random();
  if (rand < 0.6) return 'verificado';      // 60%
  if (rand < 0.9) return 'pendiente';       // 30%
  return 'rechazado';                       // 10%
}

async function main() {
  console.log('🌱 Iniciando seed de datos de prueba...');

  try {
    // Limpiar datos existentes en orden correcto (dependencias primero)
    console.log('🧹 Limpiando datos existentes...');
    await prisma.logros_usuario.deleteMany();
    await prisma.favoritos.deleteMany();
    await prisma.servicios_recurrrentes.deleteMany();
    await prisma.pagos.deleteMany();
    await prisma.cotizacion_respuestas.deleteMany();
    await prisma.cotizaciones.deleteMany();
    await prisma.notificaciones.deleteMany();
    await prisma.disponibilidad.deleteMany();
    await prisma.mensajes.deleteMany();
    await prisma.resenas.deleteMany();
    await prisma.servicios.deleteMany();
    await prisma.perfiles_profesionales.deleteMany();
    await prisma.verification_requests.deleteMany();
    await prisma.usuarios.deleteMany();

    // Crear hash de contraseña común
    const hashedPassword = await bcrypt.hash('123456', 10);

    // Crear 100 clientes
    console.log('👥 Creando 100 clientes...');
    const clientes = [];

    for (let i = 0; i < 100; i++) {
      const nombre = nombresClientes[i % nombresClientes.length];
      const apellido = nombre.split(' ')[1];
      const email = `cliente${String(i + 1).padStart(3, '0')}@cliente.changanet.com`;

      const cliente = await prisma.usuarios.create({
        data: {
          nombre,
          email,
          hash_contrasena: hashedPassword,
          rol: 'cliente',
          telefono: generarTelefono(),
          url_foto_perfil: generarFotoPerfil('men', i),
          esta_verificado: Math.random() > 0.3 // 70% verificados
        }
      });

      clientes.push(cliente);
    }

    // Crear 100 profesionales
    console.log('🔧 Creando 100 profesionales...');
    const profesionales = [];

    for (let i = 0; i < 100; i++) {
      const nombre = nombresProfesionales[i % nombresProfesionales.length];
      const email = `profesional${String(i + 1).padStart(3, '0')}@profesional.changanet.com`;
      const especialidad = especialidades[i % especialidades.length];
      const zonaCobertura = zonasCobertura[i % zonasCobertura.length];
      const anosExperiencia = Math.floor(Math.random() * 20) + 1; // 1-20 años
      const tarifaHora = Math.floor(Math.random() * 11000) + 4000; // 4000-15000
      const calificacionPromedio = (Math.random() * 2 + 3).toFixed(1); // 3.0-5.0
      const descripcion = descripciones[i % descripciones.length];
      const estadoVerificacion = determinarEstadoVerificacion();

      const profesional = await prisma.usuarios.create({
        data: {
          nombre,
          email,
          hash_contrasena: hashedPassword,
          rol: 'profesional',
          telefono: generarTelefono(),
          url_foto_perfil: generarFotoPerfil('men', i + 100),
          esta_verificado: estadoVerificacion === 'verificado'
        }
      });

      // Crear perfil profesional
      await prisma.perfiles_profesionales.create({
        data: {
          usuario_id: profesional.id,
          especialidad,
          zona_cobertura: zonaCobertura,
          anos_experiencia: anosExperiencia,
          tarifa_hora: tarifaHora,
          calificacion_promedio: parseFloat(calificacionPromedio),
          descripcion,
          estado_verificacion: estadoVerificacion,
          verificado_en: estadoVerificacion === 'verificado' ? new Date() : null
        }
      });

      profesionales.push(profesional);
    }

    console.log('✅ Seed completado exitosamente!');
    console.log(`📊 Estadísticas:`);
    console.log(`   👥 Clientes creados: ${clientes.length}`);
    console.log(`   🔧 Profesionales creados: ${profesionales.length}`);
    console.log(`   📧 Emails únicos generados: ${clientes.length + profesionales.length}`);
    console.log(`   🔐 Contraseñas hasheadas: Todas con '123456'`);

    // Mostrar distribución de especialidades
    const especialidadesCount = {};
    especialidades.forEach(esp => especialidadesCount[esp] = 0);

    // Contar especialidades (aproximadamente 10 de cada una)
    especialidades.forEach((esp, index) => {
      especialidadesCount[esp] = Math.floor(100 / especialidades.length);
    });

    console.log(`   🛠️  Distribución de especialidades:`);
    Object.entries(especialidadesCount).forEach(([esp, count]) => {
      console.log(`      ${esp}: ~${count} profesionales`);
    });

    // Mostrar distribución de estados de verificación
    console.log(`   ✅ Estados de verificación:`);
    console.log(`      Verificado: ~60 profesionales`);
    console.log(`      Pendiente: ~30 profesionales`);
    console.log(`      Rechazado: ~10 profesionales`);

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
