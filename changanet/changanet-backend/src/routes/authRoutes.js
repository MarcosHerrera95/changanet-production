/**
 * Rutas de autenticación
 * Implementa endpoints para registro, login, verificación y recuperación de contraseña
 * Según sección 7.1 del PRD: Registro y Autenticación de Usuarios
 */

const express = require('express');
const passport = require('../config/passport');
const { authenticateToken } = require('../middleware/authenticate');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
// Importar los controladores que contienen la lógica de negocio para registro y login.
const { register, login, googleCallback, googleLogin, registerProfessional, getCurrentUser, verifyEmail, forgotPassword, resetPassword, refreshToken, logout, resendVerificationEmail, resendPasswordResetEmail } = require('../controllers/authController');

const router = express.Router();

// Configuración de Rate Limiting con express-rate-limit
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 intentos de login por IP
  message: {
    error: 'Demasiados intentos de login',
    message: 'Has excedido el límite de intentos de login. Inténtalo de nuevo en 15 minutos.',
    retryAfter: 15 * 60 // segundos
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No cuenta los logins exitosos
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Máximo 3 registros por IP
  message: {
    error: 'Demasiados intentos de registro',
    message: 'Has excedido el límite de registros. Inténtalo de nuevo en 1 hora.',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Máximo 3 solicitudes de reset por IP
  message: {
    error: 'Demasiados intentos de recuperación',
    message: 'Has excedido el límite de solicitudes de recuperación. Inténtalo de nuevo en 1 hora.',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware para validación de errores de express-validator
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Datos de entrada inválidos',
      details: errors.array()
    });
  }
  next();
};

// Validaciones de entrada con express-validator
const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('El nombre debe tener entre 2 y 50 caracteres'),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 10 }).withMessage('La contraseña debe tener al menos 10 caracteres'),
  body('rol').isIn(['cliente', 'profesional']).withMessage('Rol inválido'),
  handleValidationErrors
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Contraseña requerida'),
  handleValidationErrors
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  handleValidationErrors
];

// Rutas de autenticación con Rate Limiting y Validación
// POST /api/auth/register - REQ-01: Registro de usuario cliente con email y contraseña
router.post('/register', registerLimiter, registerValidation, register);
// POST /api/auth/login - Validación de credenciales para login con JWT access/refresh
router.post('/login', loginLimiter, loginValidation, login);
// POST /api/auth/verify - REQ-03: Verificar email mediante token (POST, GET opcional)
router.post('/verify', verifyEmail);
// POST /api/auth/refresh - Renovar tokens JWT usando refresh token
router.post('/refresh', refreshToken);
// POST /api/auth/logout - Revocar refresh token
router.post('/logout', logout);
// POST /api/auth/forgot-password - REQ-05: Solicitar recuperación de contraseña
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordValidation, forgotPassword);
// POST /api/auth/reset-password - REQ-05: Restablecer contraseña con token
router.post('/reset-password', loginLimiter, resetPassword);
// POST /api/auth/resend-verification - Reenviar email de verificación
router.post('/resend-verification', registerLimiter, resendVerificationEmail);
// POST /api/auth/resend-password-reset - Reenviar email de recuperación de contraseña
router.post('/resend-password-reset', forgotPasswordLimiter, resendPasswordResetEmail);
// POST /api/auth/register-professional - Registro de profesional con perfil completo
router.post('/register-professional', registerLimiter, registerProfessional);
// GET /api/auth/me - Obtener datos del usuario autenticado
router.get('/me', authenticateToken, getCurrentUser);

// Rutas OAuth genéricas
router.get('/oauth/:provider', (req, res, next) => {
  const { provider } = req.params;
  const supportedProviders = ['google', 'facebook'];

  if (!supportedProviders.includes(provider)) {
    return res.status(400).json({ error: 'Proveedor OAuth no soportado' });
  }

  // Generar state parameter para protección CSRF
  const state = require('crypto').randomBytes(32).toString('hex');
  req.session.oauthState = state;

  const scopes = provider === 'google'
    ? ['profile', 'email']
    : ['email'];

  const options = provider === 'google'
    ? {
        scope: scopes,
        accessType: 'offline',
        prompt: 'consent',
        responseType: 'code',
        state: state
      }
    : {
        scope: scopes,
        state: state
      };

  passport.authenticate(provider, options)(req, res, next);
});

router.get('/oauth/:provider/callback', (req, res, next) => {
  const { provider } = req.params;
  const supportedProviders = ['google', 'facebook'];

  if (!supportedProviders.includes(provider)) {
    return res.status(400).json({ error: 'Proveedor OAuth no soportado' });
  }

  // Validar state parameter para protección CSRF
  const { state } = req.query;
  if (!state || state !== req.session.oauthState) {
    console.error('OAuth CSRF protection: Invalid state parameter');
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_csrf`);
  }

  // Limpiar state de la sesión después de validarlo
  delete req.session.oauthState;

  passport.authenticate(provider, { failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed` }, (err, user) => {
    if (err) {
      console.error(`OAuth ${provider} error:`, err);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_error`);
    }

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed`);
    }

    // Codificar datos del usuario para pasar por URL
    const userData = encodeURIComponent(JSON.stringify({
      id: user.user.id,
      nombre: user.user.nombre,
      email: user.user.email,
      rol: user.user.rol,
      esta_verificado: user.user.esta_verificado
    }));

    console.log(`${provider} OAuth: Redirecting to frontend with token and user data`);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${user.token}&user=${userData}`);
  })(req, res, next);
});

// Nueva ruta para login con Google desde frontend (con rate limiting)
router.post('/google-login', loginLimiter, googleLogin);

module.exports = router;
