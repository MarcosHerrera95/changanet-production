const { PrismaClient } = require('@prisma/client');

async function testDB() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.usuarios.findMany();
    console.log('Users:', users);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDB();
