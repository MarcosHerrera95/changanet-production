const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createUser() {
  try {
    // Eliminar usuario existente si existe
    await prisma.usuarios.deleteMany({
      where: { email: 'diegoeuler@gmail.com' }
    });

    console.log('Usuario anterior eliminado (si existía)');

    const hashedPassword = await bcrypt.hash('123456', 10);
    const user = await prisma.usuarios.create({
      data: {
        id: 'c06f5942-ec52-472b-b982-6e9545bc9a93',
        nombre: 'Diego Eduardo Euler',
        email: 'diegoeuler@gmail.com',
        hash_contrasena: hashedPassword,
        rol: 'cliente',
        telefono: '+54 9 11 4007-7599',
        url_foto_perfil: 'https://randomuser.me/api/portraits/men/1.jpg',
        esta_verificado: true,
        google_id: 'O6Wl2iejTSeg6iygPqqPxltBFgc2'
      }
    });
    console.log('Usuario creado exitosamente:', user);
  } catch (error) {
    console.error('Error creando usuario:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
