const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function testRegister() {
  const prisma = new PrismaClient();
  try {
    const name = 'Test User';
    const email = 'test@example.com';
    const password = 'password123';
    const rol = 'cliente';

    console.log('Testing registration...');

    // Check if user exists
    const existingUser = await prisma.usuarios.findUnique({ where: { email } });
    console.log('Existing user:', existingUser);

    if (existingUser) {
      console.log('User already exists, deleting...');
      await prisma.usuarios.delete({ where: { email } });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed');

    // Create user
    const user = await prisma.usuarios.create({
      data: {
        nombre: name,
        email,
        hash_contrasena: hashedPassword,
        rol,
        esta_verificado: false
      },
    });
    console.log('User created:', user);

    // Generate token
    const token = jwt.sign(
      { userId: user.id, role: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '24h', algorithm: 'HS256' }
    );
    console.log('Token generated');

    console.log('Registration successful!');
    return { message: 'Usuario registrado exitosamente.', token, user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } };

  } catch (error) {
    console.error('Error in registration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testRegister().then(result => console.log('Result:', result)).catch(err => console.error('Final error:', err));
