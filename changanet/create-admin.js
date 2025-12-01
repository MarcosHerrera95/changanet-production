// Script para crear usuario administrador directamente en la base de datos
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Verificar si ya existe un usuario admin
    const existingAdmin = await prisma.usuarios.findUnique({
      where: { email: 'admin@changanet.com' }
    });

    if (existingAdmin) {
      console.log('✅ Usuario administrador ya existe:', existingAdmin);
      return;
    }

    // Crear hash de la contraseña
    const hashedPassword = await bcrypt.hash('admin123456', 10);

    // Crear usuario administrador
    const adminUser = await prisma.usuarios.create({
      data: {
        nombre: 'Admin Test',
        email: 'admin@changanet.com',
        password: hashedPassword,
        rol: 'admin',
        esta_verificado: true,
        bloqueado: false
      }
    });

    console.log('✅ Usuario administrador creado exitosamente:', {
      id: adminUser.id,
      nombre: adminUser.nombre,
      email: adminUser.email,
      rol: adminUser.rol
    });
  } catch (error) {
    console.error('❌ Error creando usuario admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
