const { PrismaClient } = require('./changanet-backend/node_modules/@prisma/client');

async function checkQuotes() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Verificando cotizaciones en la base de datos...\n');

    // Ver todas las cotizaciones
    const quotes = await prisma.cotizaciones.findMany({
      include: {
        cliente: { select: { nombre: true, email: true } },
        respuestas: {
          include: {
            profesional: { select: { nombre: true, email: true } }
          }
        }
      },
      orderBy: { creado_en: 'desc' },
      take: 5
    });

    console.log(`📋 Total de cotizaciones: ${quotes.length}\n`);

    quotes.forEach((quote, index) => {
      console.log(`📝 Cotización ${index + 1}:`);
      console.log(`   ID: ${quote.id}`);
      console.log(`   Cliente: ${quote.cliente.nombre} (${quote.cliente.email})`);
      console.log(`   Descripción: ${quote.descripcion}`);
      console.log(`   Zona: ${quote.zona_cobertura}`);
      console.log(`   Profesionales solicitados: ${quote.profesionales_solicitados}`);
      console.log(`   Respuestas: ${quote.respuestas.length}`);

      quote.respuestas.forEach((respuesta, rIndex) => {
        console.log(`     Respuesta ${rIndex + 1}:`);
        console.log(`       Profesional ID: ${respuesta.profesional_id}`);
        console.log(`       Profesional: ${respuesta.profesional.nombre} (${respuesta.profesional.email})`);
        console.log(`       Estado: ${respuesta.estado}`);
        console.log(`       Precio: ${respuesta.precio || 'No establecido'}`);
      });

      console.log('');
    });

    // Verificar específicamente para el profesional c4b5ae51-4b78-47b8-afc7-263028f0a608
    const professionalId = 'c4b5ae51-4b78-47b8-afc7-263028f0a608';
    console.log(`🔍 Cotizaciones para profesional ${professionalId}:`);

    const professionalQuotes = await prisma.cotizacion_respuestas.findMany({
      where: { profesional_id: professionalId },
      include: {
        cotizacion: {
          include: {
            cliente: { select: { nombre: true, email: true } }
          }
        }
      },
      orderBy: { creado_en: 'desc' }
    });

    console.log(`   Total de respuestas encontradas: ${professionalQuotes.length}`);

    professionalQuotes.forEach((response, index) => {
      console.log(`   ${index + 1}. Cotización ${response.cotizacion.id}`);
      console.log(`      Cliente: ${response.cotizacion.cliente.nombre}`);
      console.log(`      Descripción: ${response.cotizacion.descripcion}`);
      console.log(`      Estado: ${response.estado}`);
      console.log(`      Creado: ${response.creado_en}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkQuotes();
