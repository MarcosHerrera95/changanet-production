const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyProfessional() {
  try {
    console.log('Verificando profesional 1fa17737-af37-42cf-b194-38e1946ceab4...');

    // Primero verificar el estado actual
    const current = await prisma.usuarios.findUnique({
      where: { id: '1fa17737-af37-42cf-b194-38e1946ceab4' },
      select: { id: true, nombre: true, esta_verificado: true, rol: true }
    });

    console.log('Estado actual:', current);

    if (!current.esta_verificado) {
      // Verificar el profesional
      const updated = await prisma.usuarios.update({
        where: { id: '1fa17737-af37-42cf-b194-38e1946ceab4' },
        data: { esta_verificado: true },
        select: { id: true, nombre: true, esta_verificado: true, rol: true }
      });

      console.log('✅ Profesional verificado exitosamente:', updated);
    } else {
      console.log('ℹ️ El profesional ya está verificado');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyProfessional();
