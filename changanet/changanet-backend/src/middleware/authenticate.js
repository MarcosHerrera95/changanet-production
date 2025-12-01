/**
 * @archivo src/middleware/authenticate.js - Middleware de autenticación JWT
 * @descripción Verifica tokens JWT en rutas protegidas y carga datos del usuario (REQ-03)
 * @sprint Sprint 1 – Autenticación y Perfiles
 * @tarjeta Tarjeta 1: [Backend] Implementar API de Registro y Login
 * @impacto Económico: Seguridad robusta para todas las transacciones de la plataforma
 */

const jwt = require('jsonwebtoken'); // Librería para verificar tokens JWT
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Función middleware que se ejecuta antes de las rutas protegidas
/**
 * @función authenticateToken - Middleware de autenticación JWT
 * @descripción Verifica token JWT y carga datos completos del usuario desde BD (REQ-03)
 * @sprint Sprint 1 – Autenticación y Perfiles
 * @tarjeta Tarjeta 1: [Backend] Implementar API de Registro y Login
 * @impacto Social: Protección de datos personales y privacidad de usuarios
 * @param {Object} req - Request con header Authorization
 * @param {Object} res - Response
 * @param {Function} next - Función para continuar al siguiente middleware
 */
exports.authenticateToken = (req, res, next) => {
  // Obtener el token de las cookies httpOnly (prioridad) o del header 'Authorization'
  let token = req.cookies.accessToken;

  // Si no hay token en cookies, verificar header Authorization (compatibilidad)
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1]; // Extraer el token, ignorando la palabra "Bearer"
  }

  // Si no hay token, devolver error 401 (No autorizado)
  // Esto protege las rutas contra accesos no autenticados.
  if (!token) {
    return res.status(401).json({
      error: 'Token de autenticación requerido',
      message: 'Debes iniciar sesión para acceder a este recurso'
    });
  }

  // Verificar el token usando la clave secreta (JWT_SECRET del .env)
  // La clave secreta debe coincidir con la usada al generar el token en el login.
  jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }, async (err, user) => {
    if (err) {
      console.error('Error al verificar token JWT:', err);
      let errorMessage = 'Token inválido o expirado';

      if (err.name === 'TokenExpiredError') {
        errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
      } else if (err.name === 'JsonWebTokenError') {
        errorMessage = 'Token de autenticación inválido.';
      }

      return res.status(403).json({
        error: 'Token inválido',
        message: errorMessage
      });
    }

    console.log('Token verificado, user:', user);

    // FCM Integration: Obtener información adicional del usuario desde la base de datos
    try {
      const userData = await prisma.usuarios.findUnique({
        where: { id: user.userId || user.id },
        select: {
          id: true,
          email: true,
          nombre: true,
          rol: true,
          esta_verificado: true,
          bloqueado: true
        }
      });

      if (!userData) {
        console.error('Usuario no encontrado en la base de datos:', user.userId);
        return res.sendStatus(403); // Usuario no encontrado
      }

      // RB-05: Los usuarios bloqueados por mal comportamiento no pueden acceder al sistema
      if (userData.bloqueado) {
        console.warn('Acceso denegado: usuario bloqueado', {
          userId: userData.id,
          email: userData.email,
          ip: req.ip
        });
        return res.status(403).json({
          error: 'Cuenta suspendida',
          message: 'Tu cuenta ha sido bloqueada. Contacta al soporte para más información.'
        });
      }

      req.user = {
        ...user,
        ...userData,
        role: userData.rol // Mantener compatibilidad con código existente
      };

      console.log('req.user set to:', req.user);
      next(); // Pasar al siguiente middleware o controlador, permitiendo el acceso a la ruta solicitada
    } catch (dbError) {
      console.error('Error al obtener datos del usuario:', dbError);
      return res.status(500).json({
        error: 'Error interno del servidor',
        message: 'Error al verificar autenticación. Inténtalo de nuevo.'
      });
    }
  });
};
