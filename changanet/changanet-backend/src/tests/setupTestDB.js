// src/tests/setupTestDB.js - Configuración de base de datos para pruebas
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configurar variables de entorno para pruebas
require('dotenv').config({ path: '.env.test' });

// Forzar DATABASE_URL para pruebas si estamos en modo test
if (process.env.NODE_ENV === 'test') {
  process.env.DATABASE_URL = "file:./changanet_test.db";
}

const prisma = new PrismaClient();

/**
 * Configurar base de datos de prueba antes de todas las pruebas
 */
beforeAll(async () => {
  try {
    console.log('🗄️ Configurando base de datos de prueba...');
    console.log('📋 NODE_ENV:', process.env.NODE_ENV);
    console.log('📋 DATABASE_URL:', process.env.DATABASE_URL);

    // Para PostgreSQL, verificar conexión y recrear esquema si es necesario
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')) {
      console.log('🔄 Usando PostgreSQL para pruebas');

      // Ejecutar migraciones de Prisma para crear esquema
      console.log('🔄 Ejecutando migraciones de Prisma...');
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
      });

      console.log('✅ Migraciones aplicadas a base de datos de prueba PostgreSQL');
    }
    // Para SQLite (fallback)
    else if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')) {
      const dbPath = process.env.DATABASE_URL.replace('file:', '');
      const dbDir = path.dirname(dbPath);

      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log('✅ Directorio de base de datos creado:', dbDir);
      }

      // Eliminar base de datos de prueba anterior si existe
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log('🗑️ Base de datos de prueba anterior eliminada');
      }

      // Ejecutar migraciones de Prisma para crear esquema
      console.log('🔄 Ejecutando migraciones de Prisma...');
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
      });

      console.log('✅ Migraciones aplicadas a base de datos de prueba SQLite');
    }
  } catch (error) {
    console.error('❌ Error configurando base de datos de prueba:', error.message);
    console.error('❌ Stack trace:', error.stack);
    throw error;
  }
});

/**
 * Limpiar base de datos después de cada prueba
 */
afterEach(async () => {
  try {
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')) {
      // Para PostgreSQL, truncar tablas respetando foreign keys
      const tables = [
        'verification_requests',
        'resenas',
        'mensajes',
        'disponibilidad',
        'notificaciones',
        'cotizaciones',
        'servicios',
        'perfiles_profesionales',
        'usuarios'
      ];

      // Deshabilitar temporalmente las restricciones de foreign keys
      await prisma.$executeRawUnsafe('SET session_replication_role = replica;');

      for (const table of tables) {
        try {
          await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
        } catch (error) {
          console.warn(`⚠️ Error limpiando tabla ${table}:`, error.message);
        }
      }

      // Re-habilitar restricciones de foreign keys
      await prisma.$executeRawUnsafe('SET session_replication_role = origin;');
    } else {
      // Para SQLite, usar PRAGMA
      await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');

      const tables = [
        'verification_requests',
        'resenas',
        'mensajes',
        'disponibilidad',
        'notificaciones',
        'cotizaciones',
        'servicios',
        'perfiles_profesionales',
        'usuarios'
      ];

      for (const table of tables) {
        try {
          await prisma.$executeRawUnsafe(`DELETE FROM "${table}";`);
        } catch (error) {
          console.warn(`⚠️ Error limpiando tabla ${table}:`, error.message);
        }
      }

      await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
    }

    console.log('🧹 Base de datos limpiada después de la prueba');
  } catch (error) {
    console.error('❌ Error limpiando base de datos:', error.message);
  }
});

/**
 * Cerrar conexión después de todas las pruebas
 */
afterAll(async () => {
  await prisma.$disconnect();
  console.log('🔌 Conexión a base de datos cerrada');
});

module.exports = { prisma };
