/**
 * Controlador de autenticación que maneja registro, login y autenticación OAuth de usuarios.
 * Gestiona la creación de cuentas, validación de credenciales y generación de tokens JWT.
 * Incluye logging estructurado para auditoría (REQ-42, RB-04)
 *
 * Implementa los requerimientos funcionales de la sección 7.1 del PRD:
 * - REQ-01: Registro con correo y contraseña
 * - REQ-02: Registro social (Google)
 * - REQ-03: Envío de correo de verificación
 * - REQ-04: Validación de email único
 * - REQ-05: Recuperación de contraseña por correo
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../services/logger');
const { sendEmail } = require('../services/emailService');

/**
 * Función avanzada de validación de fortaleza de contraseña
 * Evalúa múltiples criterios de seguridad y proporciona feedback detallado
 */
function validatePasswordStrength(password) {
  const feedback = {
    isValid: false,
    score: 0,
    suggestions: [],
    warnings: []
  };

  if (!password) {
    feedback.warnings.push('La contraseña es requerida');
    return feedback;
  }

  // Validación básica de longitud - mínimo 10 caracteres
  if (password.length < 10) {
    feedback.warnings.push('La contraseña debe tener al menos 10 caracteres');
    return feedback;
  }

  // Verificar presencia de diferentes tipos de caracteres
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasSpaces = /\s/.test(password);

  // Validaciones específicas
  if (hasSpaces) {
    feedback.warnings.push('La contraseña no debe contener espacios');
  }

  // Detectar contraseñas comunes
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey',
    'dragon', 'master', 'sunshine', 'flower', 'iloveyou'
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    feedback.warnings.push('Esta contraseña es muy común y fácilmente adivinable');
    return feedback;
  }

  // Verificar patrones comunes
  const patterns = [
    /(.)\1{2,}/, // Caracteres repetidos 3+ veces
    /\d{4,}/, // 4+ dígitos consecutivos
    /[a-zA-Z]{4,}/, // 4+ letras consecutivas
    /^[A-Z]/, // Empieza con mayúscula
    /[a-z]$/ // Termina con minúscula
  ];

  patterns.forEach((pattern, index) => {
    if (pattern.test(password)) {
      switch (index) {
        case 0:
          feedback.warnings.push('Evita caracteres repetidos consecutivamente');
          break;
        case 1:
          feedback.warnings.push('Evita secuencias numéricas largas');
          break;
        case 2:
          feedback.warnings.push('Evita secuencias de letras largas');
          break;
      }
    }
  });

  // Calcular puntuación basada en factores de seguridad
  let score = 0;

  // Longitud (máximo 25 puntos)
  if (password.length >= 8) score += 5;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Variedad de caracteres (máximo 30 puntos)
  if (hasLowerCase) score += 5;
  if (hasUpperCase) score += 5;
  if (hasNumbers) score += 5;
  if (hasSpecialChars) score += 15; // Los caracteres especiales valen más

  // Complejidad adicional (máximo 45 puntos)
  if (password.length >= 12 && hasLowerCase && hasUpperCase && hasNumbers && hasSpecialChars) {
    score += 25; // Bonus por contraseña muy fuerte
  }

  feedback.score = Math.min(score, 100);

  // Generar sugerencias basadas en la puntuación
  if (score < 30) {
    feedback.suggestions.push('Usa una combinación de letras, números y símbolos');
    feedback.suggestions.push('Aumenta la longitud de la contraseña');
  } else if (score < 60) {
    feedback.suggestions.push('Considera usar una passphrase más larga');
    if (!hasSpecialChars) {
      feedback.suggestions.push('Agrega símbolos especiales para mayor seguridad');
    }
  } else if (score < 80) {
    feedback.suggestions.push('Tu contraseña es buena, pero podría ser mejor');
  } else {
    feedback.suggestions.push('¡Excelente! Tu contraseña es muy segura');
  }

  // Validación estricta: requiere mayúsculas, minúsculas, números y símbolos
  feedback.isValid = password.length >= 10 && hasLowerCase && hasUpperCase && hasNumbers && hasSpecialChars && !hasSpaces && !feedback.warnings.some(w => w.includes('común'));

  return feedback;
}

/**
 * Registro de usuario cliente
 * REQ-01: Permite el registro con correo y contraseña
 * REQ-03: Envía correo de verificación al registrarse
 * REQ-04: Valida que el correo no esté previamente registrado
 * Implementa validaciones de formato de email, longitud de contraseña y rol válido
 */
exports.register = async (req, res) => {
  // Extraer datos del cuerpo de la solicitud HTTP (REQ-01: campos básicos para registro)
  const { name, email, password, rol } = req.body;

  try {
    // Validar que todos los campos requeridos estén presentes (REQ-01: validación de campos obligatorios)
    if (!name || !email || !password || !rol) {
      return res.status(400).json({ error: 'Todos los campos son requeridos: name, email, password, rol.' });
    }

    // Validar formato del email usando expresión regular (REQ-01: formato válido de email)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Formato de email inválido.' });
    }

    // Validar fortaleza de contraseña usando sistema avanzado de scoring
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      logger.warn('Registration failed: weak password', {
        service: 'auth',
        email,
        passwordScore: passwordValidation.score,
        warnings: passwordValidation.warnings,
        ip: req.ip
      });
      return res.status(400).json({ 
        error: 'La contraseña no cumple con los requisitos de seguridad.',
        details: {
          score: passwordValidation.score,
          warnings: passwordValidation.warnings,
          suggestions: passwordValidation.suggestions
        }
      });
    }

    // Log de contraseña aceptable para auditoría
    logger.info('Password validation passed', {
      service: 'auth',
      email,
      passwordScore: passwordValidation.score,
      ip: req.ip
    });

    // Validar que el rol sea uno de los valores permitidos (cliente o profesional)
    if (!['cliente', 'profesional'].includes(rol)) {
      // Registrar intento de registro con rol inválido para auditoría
      logger.warn('Registration failed: invalid role', {
        service: 'auth',
        email,
        rol,
        ip: req.ip
      });
      return res.status(400).json({ error: 'Rol inválido. Use "cliente" o "profesional".' });
    }

    // Verificar si ya existe un usuario con este email (REQ-04: email único)
    const existingUser = await prisma.usuarios.findUnique({ where: { email } });
    if (existingUser) {
      // Registrar intento de registro duplicado para auditoría
      logger.warn('Registration failed: email already exists', {
        service: 'auth',
        email,
        ip: req.ip
      });
      return res.status(409).json({ error: 'El email ya está registrado.' });
    }

    // Hashear la contraseña usando bcrypt con factor de costo 12 (seguridad)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generar token único de verificación usando crypto (REQ-03: token para verificación)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    // Establecer expiración del token en 24 horas
    const tokenExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Crear nuevo usuario en la base de datos con todos los campos requeridos
    const user = await prisma.usuarios.create({
      data: {
        nombre: name, // Nombre del usuario
        email, // Email único
        hash_contrasena: hashedPassword, // Contraseña hasheada
        rol: rol, // Rol explícitamente asignado desde el frontend
        esta_verificado: false, // Usuario no verificado inicialmente
        token_verificacion: verificationToken, // Token para verificar email
        token_expiracion: tokenExpiration // Fecha de expiración del token
      },
    });

    // Verificar límite de envío de emails (máximo 1 email por hora por usuario)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 hora atrás
    if (user.ultimo_email_verificacion && user.ultimo_email_verificacion > oneHourAgo) {
      const timeUntilNextEmail = Math.ceil((user.ultimo_email_verificacion.getTime() + 60 * 60 * 1000 - Date.now()) / 60000); // minutos restantes
      logger.warn('Verification email rate limit exceeded', {
        service: 'auth',
        userId: user.id,
        email: user.email,
        lastEmailSent: user.ultimo_email_verificacion,
        minutesUntilNext: timeUntilNextEmail
      });
      return res.status(429).json({
        error: 'Límite de envío de emails excedido.',
        message: `Puedes enviar otro email de verificación en ${timeUntilNextEmail} minutos.`,
        retryAfter: timeUntilNextEmail * 60 // segundos
      });
    }

    // Intentar enviar email de verificación (REQ-03: envío automático de email)
    try {
      const { sendVerificationEmail } = require('../services/emailService');
      await sendVerificationEmail(user.email, verificationToken);

      // Actualizar timestamp del último email enviado
      await prisma.usuarios.update({
        where: { id: user.id },
        data: { ultimo_email_verificacion: new Date() }
      });

      // Registrar envío exitoso del email
      logger.info('Verification email sent', {
        service: 'auth',
        userId: user.id,
        email: user.email
      });
    } catch (emailError) {
      // Registrar error pero no fallar el registro (email es secundario)
      logger.error('Failed to send verification email', {
        service: 'auth',
        userId: user.id,
        email: user.email,
        error: emailError.message,
        stack: emailError.stack
      });
      // No fallar el registro por error en email - continúa el proceso
    }

    // Generar tokens JWT para autenticación inmediata (REQ-01: acceso después de registro)
    const accessToken = jwt.sign(
      { userId: user.id, role: user.rol }, // Payload con ID y rol del usuario
      process.env.JWT_SECRET, // Clave secreta desde variables de entorno
      { expiresIn: '15m', algorithm: 'HS256' } // 15 minutos para access token
    );

    // Generar refresh token JWT
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: '7d', algorithm: 'HS256' }
    );
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    // Almacenar hash del refresh token en DB
    await prisma.usuarios.update({
      where: { id: user.id },
      data: { refresh_token_hash: refreshTokenHash }
    });

    // Registrar registro exitoso para auditoría
    logger.info('User registered successfully', {
      service: 'auth',
      userId: user.id,
      email: user.email,
      rol: user.rol,
      ip: req.ip
    });

    // Establecer cookies httpOnly para tokens
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutos
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });

    // Responder con éxito y datos del usuario (sin tokens en el body)
    res.status(201).json({
      message: 'Usuario registrado exitosamente. Revisa tu email para verificar la cuenta.',
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }, // Datos públicos del usuario
      token: accessToken, // Incluir access token en la respuesta para compatibilidad con frontend
      requiresVerification: true // Indica que necesita verificar email
    });
  } catch (error) {
    // Registrar error de registro para debugging
    logger.error('Registration error', {
      service: 'auth',
      email,
      rol,
      error,
      ip: req.ip
    });
    // Responder con error interno del servidor
    res.status(500).json({ error: 'Error al registrar el usuario.', details: error.message });
  }
};

/**
 * Verificar si usuario/IP está bloqueado por intentos fallidos
 */
const checkLockout = async (email, ip) => {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  // Verificar bloqueo por email
  const emailAttempts = await prisma.failed_attempts.findMany({
    where: {
      email: email,
      attempt_time: { gte: fifteenMinutesAgo },
      blocked_until: { gte: new Date() }
    }
  });

  // Verificar bloqueo por IP
  const ipAttempts = await prisma.failed_attempts.findMany({
    where: {
      ip_address: ip,
      attempt_time: { gte: fifteenMinutesAgo },
      blocked_until: { gte: new Date() }
    }
  });

  if (emailAttempts.length >= 5 || ipAttempts.length >= 5) {
    const latestBlock = [...emailAttempts, ...ipAttempts]
      .sort((a, b) => b.blocked_until.getTime() - a.blocked_until.getTime())[0];

    return {
      isLocked: true,
      unlockTime: latestBlock.blocked_until,
      remainingMinutes: Math.ceil((latestBlock.blocked_until.getTime() - Date.now()) / (1000 * 60))
    };
  }

  return { isLocked: false };
};

/**
 * Registrar intento fallido de login
 */
const recordFailedAttempt = async (email, userId, ip, reason, userAgent) => {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  // Contar intentos recientes por email
  const recentEmailAttempts = await prisma.failed_attempts.count({
    where: {
      email: email,
      attempt_time: { gte: fifteenMinutesAgo }
    }
  });

  // Contar intentos recientes por IP
  const recentIpAttempts = await prisma.failed_attempts.count({
    where: {
      ip_address: ip,
      attempt_time: { gte: fifteenMinutesAgo }
    }
  });

  // Determinar si bloquear (5+ intentos)
  const shouldBlock = recentEmailAttempts >= 4 || recentIpAttempts >= 4;
  const blockedUntil = shouldBlock ? new Date(Date.now() + 15 * 60 * 1000) : null;

  // Registrar el intento fallido
  await prisma.failed_attempts.create({
    data: {
      email: email,
      user_id: userId,
      ip_address: ip,
      user_agent: userAgent,
      reason: reason,
      blocked_until: blockedUntil
    }
  });

  return { shouldBlock, blockedUntil };
};

/**
 * Limpiar intentos fallidos después de login exitoso
 */
const clearFailedAttempts = async (email, ip) => {
  await prisma.failed_attempts.deleteMany({
    where: {
      OR: [
        { email: email },
        { ip_address: ip }
      ]
    }
  });
};

/**
 * Login de usuario
 * Valida credenciales de email y contraseña, genera token JWT
 * Incluye lógica de bloqueo por intentos fallidos
 */
exports.login = async (req, res) => {
  // Extraer credenciales del cuerpo de la solicitud (email y contraseña)
  const { email, password } = req.body;

  try {
    // Normalizar email a minúsculas para case-insensitive login
    const normalizedEmail = email.toLowerCase().trim();

    // Validar que ambos campos estén presentes (seguridad básica)
    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
    }

    // Verificar si el usuario/IP está bloqueado
    const lockoutCheck = await checkLockout(normalizedEmail, req.ip);
    if (lockoutCheck.isLocked) {
      logger.warn('Login blocked: account locked', {
        service: 'auth',
        email,
        ip: req.ip,
        unlockTime: lockoutCheck.unlockTime,
        remainingMinutes: lockoutCheck.remainingMinutes
      });
      return res.status(429).json({
        error: 'Cuenta bloqueada por múltiples intentos fallidos.',
        message: `Demasiados intentos fallidos. Inténtalo de nuevo en ${lockoutCheck.remainingMinutes} minutos.`,
        retryAfter: lockoutCheck.remainingMinutes * 60
      });
    }

    // Buscar usuario en la base de datos por email único
    const user = await prisma.usuarios.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      // Usuario no encontrado - registrar intento fallido
      await recordFailedAttempt(normalizedEmail, null, req.ip, 'user_not_found', req.get('User-Agent'));
      logger.warn('Login failed: user not found', {
        service: 'auth',
        email,
        ip: req.ip
      });
      // Responder genéricamente para no revelar existencia de usuarios
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // Debug: Verificar el tipo y contenido de hash_contrasena
    logger.info('Debug: hash_contrasena info', {
      service: 'auth',
      email,
      hash_contrasena_type: typeof user.hash_contrasena,
      hash_contrasena_value: user.hash_contrasena ? '[EXISTS]' : '[NULL]',
      hash_contrasena_length: user.hash_contrasena ? user.hash_contrasena.length : 0
    });

    // Verificar si el usuario tiene contraseña local (no es usuario de Google)
    if (!user.hash_contrasena || user.hash_contrasena === null) {
      // Usuario de Google o sin contraseña local - registrar intento fallido
      await recordFailedAttempt(normalizedEmail, user.id, req.ip, 'no_local_password', req.get('User-Agent'));
      logger.warn('Login failed: Google user or no password', {
        service: 'auth',
        email,
        ip: req.ip
      });
      return res.status(401).json({
        error: 'Credenciales inválidas.',
        isGoogleUser: true
      });
    }

    // Convertir hash_contrasena a string si es Buffer
    let hashString;
    try {
      if (Buffer.isBuffer(user.hash_contrasena)) {
        hashString = user.hash_contrasena.toString('utf8');
      } else if (typeof user.hash_contrasena !== 'string') {
        throw new Error(`Hash type invalid: ${typeof user.hash_contrasena}`);
      } else {
        hashString = user.hash_contrasena;
      }
    } catch (conversionError) {
      logger.error('Login failed: hash conversion error', {
        service: 'auth',
        error: conversionError.message,
        hash_type: typeof user.hash_contrasena,
        userId: user.id,
        email,
        ip: req.ip
      });
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }

    // Comparar contraseña proporcionada con hash almacenado usando bcrypt
    try {
      const isValidPassword = await bcrypt.compare(password, hashString);
      if (!isValidPassword) {
        // Contraseña incorrecta - registrar intento fallido
        await recordFailedAttempt(normalizedEmail, user.id, req.ip, 'invalid_password', req.get('User-Agent'));
        logger.warn('Login failed: invalid password', {
          service: 'auth',
          userId: user.id,
          email,
          ip: req.ip
        });
        // Responder genéricamente para no revelar información
        return res.status(401).json({ error: 'Credenciales inválidas.' });
      }
    } catch (bcryptError) {
      // Error en bcrypt - registrar intento fallido
      await recordFailedAttempt(normalizedEmail, user.id, req.ip, 'bcrypt_error', req.get('User-Agent'));
      logger.error('Login failed: bcrypt error', {
        service: 'auth',
        error: bcryptError.message,
        userId: user.id,
        email,
        ip: req.ip
      });
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }

    // Credenciales válidas - limpiar intentos fallidos previos
    await clearFailedAttempts(normalizedEmail, req.ip);

    // Generar tokens JWT para sesión
    const accessToken = jwt.sign(
      { userId: user.id, role: user.rol }, // Incluir ID y rol del usuario
      process.env.JWT_SECRET, // Clave secreta desde variables de entorno
      { expiresIn: '15m', algorithm: 'HS256' } // 15 minutos de validez para access token
    );

    // Generar refresh token
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    // Almacenar hash del refresh token en DB
    await prisma.usuarios.update({
      where: { id: user.id },
      data: { refresh_token_hash: refreshTokenHash }
    });

    // Registrar login exitoso para auditoría
    logger.info('User login successful', {
      service: 'auth',
      userId: user.id,
      email: user.email,
      rol: user.rol,
      ip: req.ip
    });

    // Establecer cookies httpOnly para tokens
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutos
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });

    // Responder con datos básicos del usuario (sin tokens en el body)
    res.status(200).json({
      message: 'Login exitoso.',
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }, // Datos públicos del usuario
      token: accessToken // Incluir access token en la respuesta para compatibilidad con frontend
    });
  } catch (error) {
    // Registrar error de login para debugging
    logger.error('Login error', {
      service: 'auth',
      email,
      error,
      ip: req.ip
    });
    // Responder con error genérico
    res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
};

/**
 * Callback de Google OAuth
 */
exports.googleCallback = (req, res) => {
  try {
    // El token ya fue generado en la estrategia de Passport
    const { token, user } = req.user;

    if (!token || !user) {
      console.error('Google callback: Missing token or user data');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?error=auth_failed`);
    }

    // Codificar datos del usuario para pasar por URL
    const userData = encodeURIComponent(JSON.stringify({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      esta_verificado: user.esta_verificado
    }));

    console.log('Google callback: Redirecting to frontend with token and user data');
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}&user=${userData}`);
  } catch (error) {
    console.error('Error in Google callback:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?error=auth_error`);
  }
};

/**
 * Registro de profesional
 */
exports.registerProfessional = async (req, res) => {
  const { nombre, email, password, telefono, especialidad, anos_experiencia, zona_cobertura, tarifa_hora, descripcion } = req.body;

  try {
    // Verificar si el usuario ya existe
    const existingUser = await prisma.usuarios.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado.' });
    }

    // RB-01: Un profesional solo puede tener un perfil activo
    // Nota: Esta validación se aplica al crear el perfil, pero el usuario aún no existe

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generar token de verificación de email
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Crear usuario
    const user = await prisma.usuarios.create({
      data: {
        nombre,
        email,
        hash_contrasena: hashedPassword,
        telefono,
        rol: 'profesional',
        esta_verificado: false,
        token_verificacion: verificationToken,
        token_expiracion: tokenExpiration
      },
    });

    // Crear perfil profesional
    const profile = await prisma.perfiles_profesionales.create({
      data: {
        usuario_id: user.id,
        especialidad,
        anos_experiencia,
        zona_cobertura,
        tarifa_hora: parseFloat(tarifa_hora),
        descripcion,
      },
    });

    // Enviar email de verificación
    try {
      const { sendVerificationEmail } = require('../services/emailService');
      await sendVerificationEmail(user.email, verificationToken);
      logger.info('Verification email sent to professional', {
        service: 'auth',
        userId: user.id,
        email: user.email
      });
    } catch (emailError) {
      logger.warn('Failed to send verification email to professional', {
        service: 'auth',
        userId: user.id,
        email: user.email,
        error: emailError.message
      });
      // No fallar el registro por error en email
    }

    // Generar tokens JWT
    const accessToken = jwt.sign(
      { userId: user.id, role: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '15m', algorithm: 'HS256' }
    );

    // Generar refresh token JWT
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: '7d', algorithm: 'HS256' }
    );
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    // Almacenar hash del refresh token en DB
    await prisma.usuarios.update({
      where: { id: user.id },
      data: { refresh_token_hash: refreshTokenHash }
    });

    // Establecer cookies httpOnly para tokens
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutos
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });

    res.status(201).json({
      message: 'Profesional registrado exitosamente. Revisa tu email para verificar la cuenta.',
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
      profile,
      requiresVerification: true
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar el profesional.' });
  }
};

/**
 * Obtiene los datos del usuario actualmente autenticado
 */
exports.getCurrentUser = async (req, res) => {
  try {
    // Los datos del usuario ya están disponibles en req.user gracias al middleware authenticateToken
    const user = req.user;

    res.status(200).json({
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        esta_verificado: user.esta_verificado,
        url_foto_perfil: user.url_foto_perfil // Incluir foto de perfil
      }
    });
  } catch (error) {
    console.error('Error obteniendo usuario actual:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Solicitar recuperación de contraseña
 * REQ-05: Permite recuperación de contraseña mediante correo
 * Genera token y envía enlace de recuperación por email
 */
exports.forgotPassword = async (req, res) => {
  // Extraer email del cuerpo de la solicitud (REQ-05: recuperación por correo)
  const { email } = req.body;

  try {
    // Validar que el email esté presente
    if (!email) {
      return res.status(400).json({ error: 'Email requerido' });
    }

    // Buscar usuario por email en la base de datos
    const user = await prisma.usuarios.findUnique({ where: { email } });
    if (!user) {
      // Usuario no encontrado - responder genéricamente por seguridad
      // No revelar si el email existe para evitar enumeración de usuarios
      return res.status(200).json({ message: 'Si el email existe, se enviará un enlace de recuperación.' });
    }

    // Verificar límite de envío de emails (máximo 1 email por hora por usuario)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 hora atrás
    if (user.ultimo_email_reset_password && user.ultimo_email_reset_password > oneHourAgo) {
      const timeUntilNextEmail = Math.ceil((user.ultimo_email_reset_password.getTime() + 60 * 60 * 1000 - Date.now()) / 60000); // minutos restantes
      logger.warn('Password reset email rate limit exceeded', {
        service: 'auth',
        userId: user.id,
        email: user.email,
        lastEmailSent: user.ultimo_email_reset_password,
        minutesUntilNext: timeUntilNextEmail
      });
      return res.status(429).json({
        error: 'Límite de envío de emails excedido.',
        message: `Puedes solicitar otro enlace de recuperación en ${timeUntilNextEmail} minutos.`,
        retryAfter: timeUntilNextEmail * 60 // segundos
      });
    }

    // Usuario encontrado - generar token único para recuperación
    const resetToken = crypto.randomBytes(32).toString('hex');
    // Establecer expiración en 1 hora por seguridad
    const tokenExpiration = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Actualizar usuario con token de recuperación temporal
    await prisma.usuarios.update({
      where: { id: user.id },
      data: {
        token_verificacion: resetToken, // Reutilizar campo de verificación para token de reset
        token_expiracion: tokenExpiration, // Fecha de expiración del token
        ultimo_email_reset_password: new Date() // Actualizar timestamp del último email
      }
    });

    // Intentar enviar email con enlace de recuperación (REQ-05: envío por correo)
    try {
      const { sendPasswordResetEmail } = require('../services/emailService');
      await sendPasswordResetEmail(user.email, resetToken);
      // Registrar envío exitoso para auditoría
      logger.info('Password reset email sent', {
        service: 'auth',
        userId: user.id,
        email: user.email
      });
    } catch (emailError) {
      // Registrar error pero no fallar la solicitud (email es secundario)
      logger.error('Failed to send password reset email', {
        service: 'auth',
        userId: user.id,
        email: user.email,
        error: emailError.message,
        stack: emailError.stack
      });
      // Continuar sin fallar - el token está guardado para uso futuro
    }

    // Responder siempre con el mismo mensaje por seguridad
    res.status(200).json({ message: 'Si el email existe, se enviará un enlace de recuperación.' });
  } catch (error) {
    // Registrar error para debugging
    logger.error('Forgot password error', {
      service: 'auth',
      email,
      error: error.message
    });
    // Responder con error genérico
    res.status(500).json({ error: 'Error al procesar la solicitud de recuperación.' });
  }
};

/**
 * Restablecer contraseña
 * REQ-05: Restablece contraseña usando token enviado por correo
 * Valida token y actualiza contraseña del usuario
 */
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token y nueva contraseña requeridos' });
    }

    // Validar fortaleza de contraseña usando sistema avanzado de scoring
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      logger.warn('Password reset failed: weak password', {
        service: 'auth',
        userId: user.id,
        email: user.email,
        passwordScore: passwordValidation.score,
        warnings: passwordValidation.warnings,
        ip: req.ip
      });
      return res.status(400).json({ 
        error: 'La nueva contraseña no cumple con los requisitos de seguridad.',
        details: {
          score: passwordValidation.score,
          warnings: passwordValidation.warnings,
          suggestions: passwordValidation.suggestions
        }
      });
    }

    // Log de contraseña aceptable para auditoría
    logger.info('Password reset validation passed', {
      service: 'auth',
      userId: user.id,
      email: user.email,
      passwordScore: passwordValidation.score,
      ip: req.ip
    });

    // Buscar usuario con el token
    const user = await prisma.usuarios.findUnique({
      where: { token_verificacion: token }
    });

    if (!user) {
      return res.status(400).json({ error: 'Token inválido' });
    }

    // Verificar si el token no ha expirado
    if (user.token_expiracion && user.token_expiracion < new Date()) {
      return res.status(400).json({ error: 'Token expirado' });
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Actualizar contraseña y limpiar tokens
    await prisma.usuarios.update({
      where: { id: user.id },
      data: {
        hash_contrasena: hashedPassword,
        token_verificacion: null,
        token_expiracion: null
      }
    });

    logger.info('Password reset successfully', {
      service: 'auth',
      userId: user.id,
      email: user.email
    });

    res.status(200).json({ message: 'Contraseña restablecida exitosamente' });
  } catch (error) {
    logger.error('Reset password error', {
      service: 'auth',
      error: error.message
    });
    res.status(500).json({ error: 'Error al restablecer contraseña' });
  }
};

/**
 * Verificar email del usuario
 * REQ-03: Verifica email del usuario mediante token de verificación
 * Marca email como verificado y limpia tokens temporales
 */
exports.verifyEmail = async (req, res) => {
  const { token } = req.body || req.query; // Support both POST and GET

  try {
    if (!token) {
      return res.status(400).json({ error: 'Token de verificación requerido' });
    }

    // Buscar usuario con el token de verificación
    const user = await prisma.usuarios.findUnique({
      where: { token_verificacion: token }
    });

    if (!user) {
      return res.status(400).json({ error: 'Token de verificación inválido' });
    }

    // Verificar si el token no ha expirado
    if (user.token_expiracion && user.token_expiracion < new Date()) {
      return res.status(400).json({ error: 'Token de verificación expirado' });
    }

    // Marcar email como verificado y limpiar tokens
    await prisma.usuarios.update({
      where: { id: user.id },
      data: {
        esta_verificado: true,
        token_verificacion: null,
        token_expiracion: null
      }
    });

    logger.info('Email verified successfully', {
      service: 'auth',
      userId: user.id,
      email: user.email
    });

    res.status(200).json({
      message: 'Email verificado exitosamente',
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, esta_verificado: true }
    });
  } catch (error) {
    logger.error('Email verification error', {
      service: 'auth',
      error: error.message
    });
    res.status(500).json({ error: 'Error al verificar email' });
  }
};

/**
 * Refresh access token
 * Genera nuevo access token usando refresh token válido
 */
exports.refreshToken = async (req, res) => {
  // Obtener refresh token de cookies o body (compatibilidad)
  let refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    refreshToken = req.body.refreshToken;
  }

  try {
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }

    // Verificar refresh token JWT
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const userId = decoded.userId;

    // Buscar usuario
    const user = await prisma.usuarios.findUnique({
      where: { id: userId }
    });

    if (!user || !user.refresh_token_hash) {
      return res.status(401).json({ error: 'Refresh token inválido' });
    }

    // Verificar hash del refresh token
    const isValidRefreshToken = await bcrypt.compare(refreshToken, user.refresh_token_hash);
    if (!isValidRefreshToken) {
      return res.status(401).json({ error: 'Refresh token inválido' });
    }

    // Generar nuevo access token
    const accessToken = jwt.sign(
      { userId: user.id, role: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '15m', algorithm: 'HS256' }
    );

    logger.info('Token refreshed successfully', {
      service: 'auth',
      userId: user.id,
      email: user.email
    });

    // Establecer nueva cookie httpOnly para access token
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutos
    });

    res.status(200).json({
      message: 'Token renovado exitosamente'
    });
  } catch (error) {
    logger.error('Refresh token error', {
      service: 'auth',
      error: error.message
    });
    res.status(500).json({ error: 'Error al renovar token' });
  }
};

/**
 * Logout - revocar refresh token
 */
exports.logout = async (req, res) => {
  // Obtener refresh token de cookies o body (compatibilidad)
  let refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    refreshToken = req.body.refreshToken;
  }

  try {
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }

    // Verificar refresh token JWT
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const userId = decoded.userId;

    // Buscar usuario
    const user = await prisma.usuarios.findUnique({
      where: { id: userId }
    });

    if (!user || !user.refresh_token_hash) {
      return res.status(401).json({ error: 'Refresh token inválido' });
    }

    // Verificar hash del refresh token
    const isValidRefreshToken = await bcrypt.compare(refreshToken, user.refresh_token_hash);
    if (!isValidRefreshToken) {
      return res.status(401).json({ error: 'Refresh token inválido' });
    }

    // Revocar refresh token
    await prisma.usuarios.update({
      where: { id: user.id },
      data: { refresh_token_hash: null }
    });

    logger.info('User logged out successfully', {
      service: 'auth',
      userId: user.id,
      email: user.email
    });

    // Limpiar cookies httpOnly
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({ message: 'Logout exitoso' });
  } catch (error) {
    logger.error('Logout error', {
      service: 'auth',
      error: error.message
    });
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
};

/**
 * Endpoint para login con Google desde el frontend
 * REQ-02: Permite registro/login social con Google
 * Crea usuario si no existe, actualiza información y genera token JWT
 */
exports.googleLogin = async (req, res) => {
  try {
    console.log('🟡 Google OAuth request received:', req.body);
    const { uid, email, nombre, foto, rol } = req.body;

    console.log('🟡 Google OAuth attempt:', { 
      email, 
      uid, 
      nombre, 
      rol,
      foto: foto || 'NO PHOTO PROVIDED' // 🔍 DEBUG PHOTO
    });

    // Validar campos requeridos
    if (!uid || !email || !nombre) {
      console.error('Google OAuth validation failed: missing required fields', { uid, email, nombre });
      return res.status(400).json({
        error: 'Campos requeridos faltantes: uid, email, nombre son obligatorios'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('Google OAuth validation failed: invalid email format', { email });
      return res.status(400).json({ error: 'Formato de email inválido' });
    }

    // Buscar usuario existente por email
    let user = await prisma.usuarios.findUnique({
      where: { email }
    });

    console.log('🟡 EXISTING USER CHECK:');
    console.log('🟡 User found:', user ? 'YES' : 'NO');
    if (user) {
      console.log('🟡 Current user data BEFORE update:', {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        google_id: user.google_id,
        url_foto_perfil: user.url_foto_perfil,
        rol: user.rol
      });
    }

    if (user) {
      console.log('🟡 EXISTING USER SCENARIO:');
      console.log('🟡 Current google_id:', user.google_id);
      console.log('🟡 Incoming foto from Google:', foto);
      console.log('🟡 Current photo in DB:', user.url_foto_perfil);
      
      // Usuario existe, actualizar información si es necesario
      if (!user.google_id) {
        console.log('🟡 User has no Google ID - FIRST TIME GOOGLE LOGIN');
        console.log('🟡 Will update with Google data');
        
        user = await prisma.usuarios.update({
          where: { id: user.id },
          data: {
            google_id: uid,
            nombre: nombre, // Actualizar nombre si cambió
            url_foto_perfil: foto || user.url_foto_perfil, // 🔍 CRÍTICO: siempre usar foto de Google si está disponible
            esta_verificado: true, // Los usuarios de Google están verificados
          }
        });
        
        console.log('🟡 AFTER FIRST GOOGLE LOGIN - USER DATA:', {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          google_id: user.google_id,
          url_foto_perfil: user.url_foto_perfil,
          photoSource: user.url_foto_perfil?.includes('googleusercontent') ? 'GOOGLE' : 'OTHER'
        });
        
        logger.info('Google OAuth: existing user updated', {
          service: 'auth',
          userId: user.id,
          email: user.email,
          ip: req.ip
        });
        console.log('Google OAuth: existing user updated:', user.email);
      } else {
        console.log('🟡 User already has Google ID - CHECK IF PHOTO NEEDS UPDATE');
        
        // 🔍 NUEVA LÓGICA: Actualizar foto de Google siempre que sea diferente
        const shouldUpdatePhoto = foto && foto !== user.url_foto_perfil;
        
        if (shouldUpdatePhoto) {
          console.log('🟡 PHOTO UPDATE NEEDED - Google photo different from current');
          console.log('🟡 Current DB photo:', user.url_foto_perfil);
          console.log('🟡 New Google photo:', foto);
          
          user = await prisma.usuarios.update({
            where: { id: user.id },
            data: {
              url_foto_perfil: foto, // 🔍 ACTUALIZAR SIEMPRE LA FOTO DE GOOGLE
              nombre: nombre, // Actualizar nombre si cambió
            }
          });
          
          console.log('🟡 AFTER PHOTO UPDATE - USER DATA:', {
            id: user.id,
            nombre: user.nombre,
            email: user.email,
            google_id: user.google_id,
            url_foto_perfil: user.url_foto_perfil,
            photoSource: user.url_foto_perfil?.includes('googleusercontent') ? 'GOOGLE' : 'OTHER'
          });
          
        } else {
          console.log('🟡 NO PHOTO UPDATE NEEDED');
          if (!foto) {
            console.log('🟡 No Google photo provided in this login');
          } else {
            console.log('🟡 Google photo same as current DB photo');
          }
          console.log('🟡 Current photo stays as:', user.url_foto_perfil);
        }
        
        logger.info('Google OAuth: existing user login', {
          service: 'auth',
          userId: user.id,
          email: user.email,
          ip: req.ip
        });
        console.log('Google OAuth: existing user login:', user.email);
      }
    } else {
      // Usuario no existe - crear automáticamente (REQ-02: registro social)
      console.log('Google OAuth: creating new user:', email);

      // Determinar rol basado en el parámetro o default a 'cliente'
      const userRole = rol || 'cliente';
      if (!['cliente', 'profesional'].includes(userRole)) {
        return res.status(400).json({ error: 'Rol inválido para registro social.' });
      }

      user = await prisma.usuarios.create({
        data: {
          nombre,
          email,
          google_id: uid,
          url_foto_perfil: foto, // 🔍 GUARDANDO FOTO DE GOOGLE
          rol: userRole,
          esta_verificado: true, // Los usuarios de Google están verificados automáticamente
          hash_contrasena: null, // No tienen contraseña local
        }
      });

      console.log('🟡 Google OAuth: new user created with photo:', {
        email: user.email,
        url_foto_perfil: user.url_foto_perfil,
        photoWasSaved: !!user.url_foto_perfil
      });

      logger.info('Google OAuth: new user registered', {
        service: 'auth',
        userId: user.id,
        email: user.email,
        rol: user.rol,
        ip: req.ip
      });
      console.log('Google OAuth: new user created:', user.email);
    }

    // Generar tokens JWT
    const accessToken = jwt.sign(
      { userId: user.id, role: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '15m', algorithm: 'HS256' }
    );

    // Generar refresh token JWT
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: '7d', algorithm: 'HS256' }
    );
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    // Almacenar hash del refresh token en DB
    await prisma.usuarios.update({
      where: { id: user.id },
      data: { refresh_token_hash: refreshTokenHash }
    });

    console.log('Google OAuth: successful login for:', user.email);
    console.log('Google OAuth: Generated accessToken:', accessToken ? 'PRESENT' : 'MISSING');
    console.log('Google OAuth: Generated refreshToken:', refreshToken ? 'PRESENT' : 'MISSING');

    // Establecer cookies httpOnly para tokens
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutos
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });

    const responseData = {
      message: 'Login exitoso con Google',
      token: accessToken, // 🔍 DEBUG: Incluir token en respuesta
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        esta_verificado: user.esta_verificado,
        url_foto_perfil: user.url_foto_perfil // Incluir foto de perfil en la respuesta
      }
    };

    console.log('Google OAuth: Response data being sent:', {
      hasToken: !!responseData.token,
      hasUser: !!responseData.user,
      userId: responseData.user?.id,
      userEmail: responseData.user?.email
    });

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Google OAuth login error:', error);
    logger.error('Google OAuth login error', {
      service: 'auth',
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    res.status(500).json({
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Error procesando autenticación con Google'
    });
  }
};

/**
 * Reenviar email de verificación
 * Permite reenviar el email de verificación con límite de 1 por hora
 */
exports.resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  try {
    // Validar que el email esté presente
    if (!email) {
      return res.status(400).json({ error: 'Email requerido' });
    }

    // Buscar usuario por email
    const user = await prisma.usuarios.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que el usuario no esté ya verificado
    if (user.esta_verificado) {
      return res.status(400).json({ error: 'El usuario ya está verificado' });
    }

    // Verificar límite de envío de emails (máximo 1 email por hora por usuario)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (user.ultimo_email_verificacion && user.ultimo_email_verificacion > oneHourAgo) {
      const timeUntilNextEmail = Math.ceil((user.ultimo_email_verificacion.getTime() + 60 * 60 * 1000 - Date.now()) / 60000);
      logger.warn('Resend verification email rate limit exceeded', {
        service: 'auth',
        userId: user.id,
        email: user.email,
        lastEmailSent: user.ultimo_email_verificacion,
        minutesUntilNext: timeUntilNextEmail
      });
      return res.status(429).json({
        error: 'Límite de envío de emails excedido.',
        message: `Puedes reenviar el email de verificación en ${timeUntilNextEmail} minutos.`,
        retryAfter: timeUntilNextEmail * 60
      });
    }

    // Generar nuevo token de verificación
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Actualizar usuario con nuevo token
    await prisma.usuarios.update({
      where: { id: user.id },
      data: {
        token_verificacion: verificationToken,
        token_expiracion: tokenExpiration,
        ultimo_email_verificacion: new Date()
      }
    });

    // Enviar email de verificación
    try {
      const { sendVerificationEmail } = require('../services/emailService');
      await sendVerificationEmail(user.email, verificationToken);

      logger.info('Verification email resent', {
        service: 'auth',
        userId: user.id,
        email: user.email
      });

      res.status(200).json({
        message: 'Email de verificación reenviado exitosamente.',
        nextResendAvailable: new Date(Date.now() + 60 * 60 * 1000) // 1 hora desde ahora
      });
    } catch (emailError) {
      logger.error('Failed to resend verification email', {
        service: 'auth',
        userId: user.id,
        email: user.email,
        error: emailError.message,
        stack: emailError.stack
      });
      res.status(500).json({ error: 'Error al enviar el email de verificación.' });
    }
  } catch (error) {
    logger.error('Resend verification email error', {
      service: 'auth',
      email,
      error: error.message
    });
    res.status(500).json({ error: 'Error al reenviar el email de verificación.' });
  }
};

/**
 * Reenviar email de recuperación de contraseña
 * Permite reenviar el email de recuperación con límite de 1 por hora
 */
exports.resendPasswordResetEmail = async (req, res) => {
  const { email } = req.body;

  try {
    // Validar que el email esté presente
    if (!email) {
      return res.status(400).json({ error: 'Email requerido' });
    }

    // Buscar usuario por email
    const user = await prisma.usuarios.findUnique({ where: { email } });
    if (!user) {
      // Por seguridad, no revelar si el email existe
      return res.status(200).json({ message: 'Si el email existe, se enviará un enlace de recuperación.' });
    }

    // Verificar límite de envío de emails (máximo 1 email por hora por usuario)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (user.ultimo_email_reset_password && user.ultimo_email_reset_password > oneHourAgo) {
      const timeUntilNextEmail = Math.ceil((user.ultimo_email_reset_password.getTime() + 60 * 60 * 1000 - Date.now()) / 60000);
      logger.warn('Resend password reset email rate limit exceeded', {
        service: 'auth',
        userId: user.id,
        email: user.email,
        lastEmailSent: user.ultimo_email_reset_password,
        minutesUntilNext: timeUntilNextEmail
      });
      return res.status(429).json({
        error: 'Límite de envío de emails excedido.',
        message: `Puedes solicitar otro enlace de recuperación en ${timeUntilNextEmail} minutos.`,
        retryAfter: timeUntilNextEmail * 60
      });
    }

    // Generar nuevo token de recuperación
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiration = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Actualizar usuario con nuevo token
    await prisma.usuarios.update({
      where: { id: user.id },
      data: {
        token_verificacion: resetToken,
        token_expiracion: tokenExpiration,
        ultimo_email_reset_password: new Date()
      }
    });

    // Enviar email de recuperación
    try {
      const { sendPasswordResetEmail } = require('../services/emailService');
      await sendPasswordResetEmail(user.email, resetToken);

      logger.info('Password reset email resent', {
        service: 'auth',
        userId: user.id,
        email: user.email
      });

      res.status(200).json({
        message: 'Si el email existe, se enviará un enlace de recuperación.',
        nextResendAvailable: new Date(Date.now() + 60 * 60 * 1000)
      });
    } catch (emailError) {
      logger.error('Failed to resend password reset email', {
        service: 'auth',
        userId: user.id,
        email: user.email,
        error: emailError.message,
        stack: emailError.stack
      });
      // No fallar la solicitud por error en email
      res.status(200).json({ message: 'Si el email existe, se enviará un enlace de recuperación.' });
    }
  } catch (error) {
    logger.error('Resend password reset email error', {
      service: 'auth',
      email,
      error: error.message
    });
    res.status(500).json({ error: 'Error al procesar la solicitud.' });
  }
};

module.exports = {
  register: exports.register,
  login: exports.login,
  googleCallback: exports.googleCallback,
  googleLogin: exports.googleLogin,
  registerProfessional: exports.registerProfessional,
  getCurrentUser: exports.getCurrentUser,
  verifyEmail: exports.verifyEmail,
  forgotPassword: exports.forgotPassword,
  resetPassword: exports.resetPassword,
  refreshToken: exports.refreshToken,
  logout: exports.logout,
  resendVerificationEmail: exports.resendVerificationEmail,
  resendPasswordResetEmail: exports.resendPasswordResetEmail
};
