// Script para crear usuario administrador directamente en la base de datos
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Configuración de email y contraseña
    const adminEmail = 'admin@changanet.com';
    const adminPassword = 'admin123456';

    // Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      throw new Error('Formato de email inválido');
    }

    // Validación de contraseña: mínimo 10 caracteres y al menos una mayúscula, una minúscula, un número y un caracter especial
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{10,}$/;
    if (!passwordRegex.test(adminPassword)) {
      throw new Error('La contraseña debe tener al menos 10 caracteres, incluir mayúsculas, minúsculas, números y caracteres especiales.');
    }

    // Verificar si ya existe un usuario admin
    const existingAdmin = await prisma.usuarios.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      console.log('✅ Usuario administrador ya existe:', existingAdmin);
      return;
    }

    // Crear hash de la contraseña
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Crear usuario administrador
    const adminUser = await prisma.usuarios.create({
      data: {
        nombre: 'Admin Test',
        email: adminEmail,
        hash_contrasena: hashedPassword,
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
    console.error('❌ Error creando usuario admin:', error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
