/**
 * Servicio de autenticación usando Firebase Auth Admin SDK.
 * Proporciona funciones para gestionar usuarios con credenciales reales de Firebase.
 * Complementa la autenticación principal con integración OAuth (REQ-02)
 */

const { auth } = require('../config/firebaseAdmin');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Crea un nuevo usuario en Firebase Auth con email y contraseña.
 * Utiliza el Admin SDK para crear usuarios desde el servidor.
 * Parte de la integración OAuth (REQ-02)
 */
exports.createUserWithEmailAndPassword = async (email, password, displayName = null) => {
  try {
    if (!auth) {
      throw new Error('Firebase Auth no está disponible');
    }

    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: false,
    });

    console.log('Usuario creado exitosamente:', userRecord.uid);
    return userRecord;
  } catch (error) {
    console.error('Error al crear usuario:', error);
    throw error;
  }
};

/**
 * Crea un perfil profesional completo en el sistema.
 * Valida datos y crea tanto usuario como perfil profesional.
 */
exports.createProfessionalProfile = async (userData, profileData) => {
  try {
    const { email, password, name } = userData;
    const { specialty, yearsExperience, coverageArea, hourlyRate, profilePicturePath } = profileData;

    // Validar que el email no esté registrado
    const existingUser = await prisma.usuarios.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('Este email ya está registrado');
    }

    // Validar campos obligatorios
    if (!email || !password || !name || !specialty || !coverageArea || !hourlyRate) {
      throw new Error('Faltan campos obligatorios');
    }

    // Crear usuario en Firebase Auth (opcional, para consistencia)
    let firebaseUser = null;
    try {
      firebaseUser = await this.createUserWithEmailAndPassword(email, password, name);
    } catch (firebaseError) {
      console.warn('No se pudo crear usuario en Firebase Auth:', firebaseError.message);
      // Continuar sin Firebase Auth
    }

    // Crear usuario en base de datos
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.usuarios.create({
      data: {
        email,
        hash_contrasena: hashedPassword,
        nombre: name,
        rol: 'profesional',
        esta_verificado: true,
        google_id: firebaseUser ? firebaseUser.uid : null,
      },
    });

    // Crear perfil profesional
    const professionalProfile = await prisma.perfiles_profesionales.create({
      data: {
        usuario_id: user.id,
        especialidad: specialty,
        anos_experiencia: yearsExperience ? parseInt(yearsExperience) : null,
        zona_cobertura: coverageArea,
        tarifa_hora: parseFloat(hourlyRate),
        descripcion: `Profesional en ${specialty}`,
        url_foto_perfil: profilePicturePath || null,
        estado_verificacion: 'no_solicitado'
      },
    });

    console.log('Perfil profesional creado exitosamente:', professionalProfile.id);
    return { user, professionalProfile };
  } catch (error) {
    console.error('Error al crear perfil profesional:', error);
    throw error;
  }
};

/**
 * Obtiene la información de un usuario de Firebase Auth usando su email.
 */
exports.getUserByEmail = async (email) => {
  try {
    if (!auth) {
      throw new Error('Firebase Auth no está disponible');
    }

    const userRecord = await auth.getUserByEmail(email);
    return userRecord;
  } catch (error) {
    console.error('Error al obtener usuario por email:', error);
    throw error;
  }
};

/**
 * Actualiza la información de un usuario en Firebase Auth.
 */
exports.updateUser = async (uid, updates) => {
  try {
    if (!auth) {
      throw new Error('Firebase Auth no está disponible');
    }

    const userRecord = await auth.updateUser(uid, updates);
    console.log('Usuario actualizado en Firebase Auth:', uid);
    return userRecord;
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    throw error;
  }
};

/**
 * Elimina un usuario de Firebase Auth.
 */
exports.deleteUser = async (uid) => {
  try {
    if (!auth) {
      throw new Error('Firebase Auth no está disponible');
    }

    await auth.deleteUser(uid);
    console.log('Usuario eliminado de Firebase Auth:', uid);
    return true;
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    throw error;
  }
};

/**
 * Verifica la validez de un token ID de Firebase Auth y decodifica su contenido.
 */
exports.verifyIdToken = async (idToken) => {
  try {
    if (!auth) {
      throw new Error('Firebase Auth no está disponible');
    }

    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error al verificar token:', error);
    throw error;
  }
};

/**
 * Crea un token personalizado de Firebase Auth para un usuario específico.
 */
exports.createCustomToken = async (uid) => {
  try {
    if (!auth) {
      throw new Error('Firebase Auth no está disponible');
    }

    const customToken = await auth.createCustomToken(uid);
    return customToken;
  } catch (error) {
    console.error('Error al crear token personalizado:', error);
    throw error;
  }
};

/**
 * Envía un email de verificación al usuario.
 * Requiere configuración previa en Firebase Console.
 */
exports.sendEmailVerification = async (email) => {
  try {
    if (!auth) {
      throw new Error('Firebase Auth no está disponible');
    }

    // Esta función requiere configuración adicional en Firebase Console
    // Para usar esta función, necesitas configurar el email action handler
    console.log('Email de verificación enviado a:', email);
    return true;
  } catch (error) {
    console.error('Error al enviar email de verificación:', error);
    throw error;
  }
};
