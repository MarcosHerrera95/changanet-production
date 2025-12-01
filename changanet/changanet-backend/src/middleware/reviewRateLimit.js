/**
 * Middleware de Limitación de Tasa para Reseñas
 * Implementa protección contra abuso en la creación de reseñas
 *
 * FUNCIONALIDADES:
 * - Límite de reseñas por usuario (5 por 15 minutos)
 * - Prevención de spam y abuso
 * - Logging de intentos excesivos
 */

const rateLimit = require('rate-limiter-flexible');

/**
 * Limitador de reseñas por usuario
 * Permite máximo 5 reseñas cada 15 minutos por usuario
 */
const reviewRateLimiter = new rateLimit.RateLimiterMemory({
  keyPrefix: 'review_limit',
  points: 5, // Número de reseñas permitidas
  duration: 15 * 60, // Ventana de tiempo en segundos (15 minutos)
  blockDuration: 15 * 60, // Duración del bloqueo si se excede (15 minutos)
});

/**
 * Middleware para limitar la creación de reseñas
 * Protege contra spam y abuso del sistema de reseñas
 */
const reviewRateLimit = async (req, res, next) => {
  try {
    // Usar el ID del usuario como clave para el limitador
    const userId = req.user?.id;

    if (!userId) {
      console.warn('⚠️ Intento de reseña sin usuario autenticado');
      return res.status(401).json({
        error: 'Usuario no autenticado',
        message: 'Debes iniciar sesión para dejar reseñas'
      });
    }

    // Consumir un punto del limitador
    await reviewRateLimiter.consume(userId);

    // Si llega aquí, el límite no se ha excedido
    next();

  } catch (rejRes) {
    // El límite se ha excedido
    const msBeforeNext = rejRes.msBeforeNext / 1000; // Convertir a segundos
    const minutesLeft = Math.ceil(msBeforeNext / 60);

    console.warn(`🚨 Límite de reseñas excedido para usuario ${req.user?.id}. Próximo intento en ${minutesLeft} minutos`);

    return res.status(429).json({
      error: 'Demasiadas reseñas',
      message: `Has alcanzado el límite de reseñas. Inténtalo de nuevo en ${minutesLeft} minuto${minutesLeft !== 1 ? 's' : ''}.`,
      retryAfter: msBeforeNext
    });
  }
};

/**
 * Función para verificar el estado actual del límite de un usuario
 * Útil para mostrar información al usuario sobre sus límites
 *
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Estado del límite
 */
const getReviewLimitStatus = async (userId) => {
  try {
    const resConsumed = await reviewRateLimiter.get(userId);

    if (!resConsumed) {
      // No hay registros previos, límite disponible
      return {
        remainingPoints: 5,
        msBeforeNext: 0,
        isBlocked: false
      };
    }

    const remainingPoints = 5 - resConsumed.consumedPoints;
    const msBeforeNext = resConsumed.msBeforeNext || 0;

    return {
      remainingPoints: Math.max(0, remainingPoints),
      msBeforeNext,
      isBlocked: msBeforeNext > 0
    };
  } catch (error) {
    console.error('Error checking review limit status:', error);
    return {
      remainingPoints: 0,
      msBeforeNext: 0,
      isBlocked: true,
      error: 'Error al verificar límite'
    };
  }
};

/**
 * Middleware opcional para incluir información de límites en la respuesta
 * Agrega headers con información sobre el estado del límite
 */
const reviewRateLimitWithHeaders = async (req, res, next) => {
  // Aplicar el limitador normal primero
  await reviewRateLimit(req, res, () => {
    // Si no fue bloqueado, agregar headers informativos
    if (req.user?.id) {
      getReviewLimitStatus(req.user.id).then(status => {
        res.set({
          'X-RateLimit-Remaining': status.remainingPoints,
          'X-RateLimit-Reset': Math.ceil((Date.now() + status.msBeforeNext) / 1000)
        });
        next();
      }).catch(() => {
        // En caso de error, continuar sin headers
        next();
      });
    } else {
      next();
    }
  });
};

module.exports = {
  reviewRateLimit,
  reviewRateLimitWithHeaders,
  getReviewLimitStatus
};
