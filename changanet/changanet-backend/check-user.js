const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUser(userId) {
  try {
    const user = await prisma.usuarios.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        esta_verificado: true
      }
    });

    if (user) {
      console.log('Usuario encontrado:', user);
    } else {
      console.log('Usuario NO encontrado con ID:', userId);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check the specific user ID from the token
checkUser('6b888c3f-2014-4474-8363-47185faa14c6');
