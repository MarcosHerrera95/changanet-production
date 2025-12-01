/**
 * Script para verificar que los usuarios existen en Firebase Auth
 */

const admin = require('firebase-admin');
const { PrismaClient } = require('@prisma/client');

require('dotenv').config();

// Configurar Firebase Admin
const serviceAccount = require('./src/config/serviceAccountKey.json');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || 'changanet-notifications'
  });
}

const prisma = new PrismaClient();

async function verifyUsers() {
  console.log('🔍 Verificando usuarios en Firebase Auth...\n');

  const testEmails = [
    'cliente1@changanet.com',
    'cliente2@changanet.com',
    'profesional1@changanet.com'
  ];

  for (const email of testEmails) {
    try {
      console.log(`👤 Verificando: ${email}`);

      // Verificar en Firebase Auth
      const userRecord = await admin.auth().getUserByEmail(email);
      console.log(`✅ Existe en Firebase Auth: ${userRecord.uid}`);
      console.log(`   Email verificado: ${userRecord.emailVerified}`);
      console.log(`   Deshabilitado: ${userRecord.disabled}`);

      // Verificar en base de datos
      const dbUser = await prisma.usuarios.findUnique({
        where: { email }
      });

      if (dbUser) {
        console.log(`✅ Existe en BD: ${dbUser.id}`);
        console.log(`   Nombre: ${dbUser.nombre}`);
        console.log(`   Rol: ${dbUser.rol}`);
        console.log(`   Verificado: ${dbUser.esta_verificado}`);
      } else {
        console.log(`❌ NO existe en BD`);
      }

      console.log('---');

    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`❌ NO existe en Firebase Auth: ${email}`);
      } else {
        console.log(`❌ Error verificando ${email}:`, error.message);
      }
    }
  }

  // Verificar configuración de Firebase Auth
  console.log('\n🔧 Verificando configuración de Firebase...');
  try {
    const config = await admin.auth().projectConfig.get();
    console.log('✅ Configuración obtenida');
    console.log(`📧 Email/Password habilitado: ${config.signInMethods?.includes('password') ? 'Sí' : 'No'}`);
    console.log(`🌐 Dominios autorizados: ${config.authorizedDomains?.join(', ') || 'Ninguno'}`);
  } catch (error) {
    console.log('❌ Error obteniendo configuración:', error.message);
  }

  await prisma.$disconnect();
}

verifyUsers().catch(console.error);
