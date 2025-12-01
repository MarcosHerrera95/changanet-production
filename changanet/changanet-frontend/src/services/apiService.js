/**
 * Servicio de API para el frontend de Changánet
 * Maneja todas las llamadas HTTP al backend con retry logic y manejo de errores
 */

import { API_BASE_URL } from '../config/api.js';

/**
 * Headers de seguridad para todas las peticiones
 */
const getSecurityHeaders = () => ({
  'X-Requested-With': 'XMLHttpRequest',
  'X-Client-Version': '1.0.0',
  'X-Client-Type': 'web',
});

/**
 * Configuración de reintentos para llamadas API
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 segundo
  maxDelay: 10000, // 10 segundos
  backoffFactor: 2
};

/**
 * Configuración de caché para optimización de rendimiento
 */
const CACHE_CONFIG = {
  defaultTTL: 5 * 60 * 1000, // 5 minutos
  maxSize: 50, // Máximo 50 entradas en caché
};

/**
 * Cache simple en memoria para optimizar llamadas API
 */
const apiCache = new Map();

/**
 * Calcula el delay para el siguiente reintento usando backoff exponencial
 */
function calculateRetryDelay(attempt) {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

/**
 * Genera una clave única para el caché basada en URL y opciones
 */
function generateCacheKey(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.stringify(options.body) : '';
  return `${method}:${url}:${body}`;
}

/**
 * Obtiene datos del caché si están disponibles y válidos
 */
function getCachedResponse(cacheKey) {
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.defaultTTL) {
    return cached.data;
  }
  // Limpiar entrada expirada
  if (cached) {
    apiCache.delete(cacheKey);
  }
  return null;
}

/**
 * Almacena respuesta en caché
 */
function setCachedResponse(cacheKey, data) {
  // Limpiar caché si excede el tamaño máximo
  if (apiCache.size >= CACHE_CONFIG.maxSize) {
    const firstKey = apiCache.keys().next().value;
    apiCache.delete(firstKey);
  }

  apiCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Limpia el caché (útil para operaciones de escritura)
 */
export const clearCache = () => {
  apiCache.clear();
};

/**
 * Obtiene estadísticas del caché
 */
export const getCacheStats = () => ({
  size: apiCache.size,
  maxSize: CACHE_CONFIG.maxSize
});


/**
 * Determina si un error es reintentable
 */
function isRetryableError(error) {
  // Reintentar en errores de red, timeouts, y errores del servidor (5xx)
  if (!error.response) return true; // Error de red
  const status = error.response.status;
  return status >= 500 || status === 408 || status === 429 || status === 503;
}

/**
 * Clase de error personalizada para mejor manejo de errores
 */
export class APIError extends Error {
  constructor(message, status, code, data = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

/**
 * Detecta si el usuario está offline
 */
function isOffline() {
  return !navigator.onLine;
}

/**
 * Espera a que la conexión se restablezca
 */
function waitForConnection() {
  return new Promise((resolve) => {
    if (navigator.onLine) {
      resolve();
      return;
    }

    const handleOnline = () => {
      window.removeEventListener('online', handleOnline);
      resolve();
    };

    window.addEventListener('online', handleOnline);
  });
}

/**
 * Función principal para hacer llamadas API con retry logic y caché
 */
async function apiRequest(url, options = {}, retryCount = 0) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  const method = (options.method || 'GET').toUpperCase();
  const useCache = options.useCache !== false && method === 'GET'; // Cache solo para GET por defecto

  // Verificar caché para operaciones GET
  if (useCache && retryCount === 0) {
    const cacheKey = generateCacheKey(fullUrl, options);
    const cachedData = getCachedResponse(cacheKey);
    if (cachedData) {
      console.log('🚀 API Cache Hit:', url);
      return cachedData;
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

    // Incluir automáticamente el token JWT si existe
    const token = sessionStorage.getItem('changanet_token');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    const response = await fetch(fullUrl, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...getSecurityHeaders(),
        ...authHeaders,
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    // Si la respuesta es exitosa, retornarla y cachearla si corresponde
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = response;
      }

      // Almacenar en caché para operaciones GET exitosas
      if (useCache && method === 'GET') {
        const cacheKey = generateCacheKey(fullUrl, options);
        setCachedResponse(cacheKey, data);
        console.log('💾 API Response Cached:', url);
      }

      // Limpiar caché para operaciones de escritura exitosas
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        clearCache();
        console.log('🗑️ API Cache Cleared after write operation');
      }

      return data;
    }

    // Si es un error 401 (no autorizado), redirigir al login
    if (response.status === 401) {
      console.warn('🔐 Token expirado o inválido, redirigiendo al login');
      localStorage.removeItem('changanet_token');
      localStorage.removeItem('changanet_user');
      window.location.href = '/';
      throw new Error('Sesión expirada');
    }

    // Si es un error 403 (prohibido), verificar si es usuario no encontrado
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({ message: 'No tienes permisos para realizar esta acción' }));
      // Si el mensaje indica que el usuario no existe, limpiar token y recargar
      if (errorData.message && errorData.message.includes('Usuario no encontrado')) {
        console.warn('Usuario no encontrado en la base de datos. Limpiando token y recargando...');
        localStorage.removeItem('changanet_token');
        localStorage.removeItem('changanet_user');
        window.location.reload();
        throw new Error('Sesión inválida - recargando página');
      }
      throw new Error(errorData.message || 'No tienes permisos para realizar esta acción');
    }

    // Para otros errores, intentar reintento si es apropiado
    if (isRetryableError({ response }) && retryCount < RETRY_CONFIG.maxRetries) {
      const delay = calculateRetryDelay(retryCount);
      console.warn(`⚠️ Reintentando solicitud en ${delay}ms (intento ${retryCount + 1}/${RETRY_CONFIG.maxRetries})`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return apiRequest(url, options, retryCount + 1);
    }

    // Si no se puede reintentar, lanzar error
    const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);

  } catch (error) {
    // Manejar errores de red y timeouts
    if (error.name === 'AbortError') {
      throw new Error('La solicitud tardó demasiado tiempo. Verifica tu conexión a internet.');
    }

    if (!error.response && retryCount < RETRY_CONFIG.maxRetries) {
      const delay = calculateRetryDelay(retryCount);
      console.warn(`🌐 Error de conexión, reintentando en ${delay}ms (intento ${retryCount + 1}/${RETRY_CONFIG.maxRetries})`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return apiRequest(url, options, retryCount + 1);
    }

    // Si es el último intento o error no reintentable, lanzar el error
    throw error;
  }
}

/**
 * Métodos HTTP convenientes
 */
export const api = {
  get: (url, options = {}) => apiRequest(url, { ...options, method: 'GET' }),
  post: (url, data, options = {}) => apiRequest(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data)
  }),
  put: (url, data, options = {}) => apiRequest(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (url, options = {}) => apiRequest(url, { ...options, method: 'DELETE' }),
  patch: (url, data, options = {}) => apiRequest(url, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data)
  })
};

/**
 * Funciones específicas para Changánet
 */

// Autenticación
export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (userData) => api.post('/api/auth/register', userData),
  registerProfessional: (userData) => api.post('/api/auth/register-professional', userData),
  logout: () => api.post('/api/auth/logout'),
  refreshToken: () => api.post('/api/auth/refresh'),
  getProfile: () => api.get('/api/profile'),
  updateProfile: (data) => api.put('/api/profile', data)
};

// Servicios
export const servicesAPI = {
  getAll: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return api.get(`/api/services?${queryString}`);
  },
  getById: (id) => api.get(`/api/services/${id}`),
  create: (serviceData) => api.post('/api/services', serviceData),
  update: (id, serviceData) => api.put(`/api/services/${id}`, serviceData),
  delete: (id) => api.delete(`/api/services/${id}`)
};

// Profesionales
export const professionalsAPI = {
  search: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return api.get(`/api/professionals?${queryString}`);
  },
  getById: (id) => api.get(`/api/professionals/${id}`),
  getReviews: (id) => api.get(`/api/professionals/${id}/reviews`)
};

// Búsqueda y filtros
export const searchAPI = {
  searchProfessionals: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return api.get(`/api/search?${queryString}`);
  },
  autocomplete: (query, type = 'all', limit = 10) => {
    const params = new URLSearchParams({ q: query, type, limit: limit.toString() });
    return api.get(`/api/search/autocomplete?${params}`);
  }
};

// Cotizaciones
export const quotesAPI = {
  create: (quoteData) => api.post('/api/quotes', quoteData),
  getMyQuotes: () => api.get('/api/quotes/client'), // Para clientes
  getProfessionalQuotes: () => api.get('/api/quotes/professional', { useCache: false }), // Para profesionales - sin caché
  getById: (id) => api.get(`/api/quotes/${id}`),
  respond: (quoteId, action, data = {}) => api.post('/api/quotes/respond', { quoteId, action, ...data }),
  getClientServices: () => api.get('/api/quotes/client/services'),
  getProfessionalServices: () => api.get('/api/quotes/professional/services', { useCache: false }) // También sin caché
};

// Mensajes
export const messagesAPI = {
  getConversation: (userId) => api.get(`/api/messages?with=${userId}`),
  sendMessage: (messageData) => api.post('/api/messages', messageData),
  markAsRead: (senderId) => api.put(`/api/messages/mark-read`, { senderId })
};

// Notificaciones
export const notificationsAPI = {
  getAll: () => api.get('/api/notifications'),
  markAsRead: (id) => api.put(`/api/notifications/${id}/read`),
  markAllAsRead: () => api.put('/api/notifications/mark-all-read'),
  delete: (id) => api.delete(`/api/notifications/${id}`)
};

// Reseñas y Valoraciones
export const reviewsAPI = {
  create: (reviewData) => {
    // Para envío con FormData (incluye imagen)
    const formData = new FormData();
    formData.append('servicio_id', reviewData.servicio_id);
    formData.append('calificacion', reviewData.calificacion);
    if (reviewData.comentario) {
      formData.append('comentario', reviewData.comentario);
    }
    if (reviewData.url_foto) {
      formData.append('url_foto', reviewData.url_foto);
    }

    return apiRequest('/api/reviews', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('changanet_token')}`
      }
    }, 0);
  },
  checkEligibility: (serviceId) => api.get(`/api/reviews/check/${serviceId}`),
  getProfessionalReviews: (professionalId, page = 1, limit = 10, sortBy = 'newest') => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy
    });
    return api.get(`/api/reviews/professional/${professionalId}?${params}`);
  },
  getProfessionalStats: (professionalId) => api.get(`/api/reviews/professional/${professionalId}/stats`),
  getClientReviews: () => api.get('/api/reviews/client')
};

// Verificación de Identidad
export const verificationAPI = {
  submit: (formData) => {
    // Para envío con FormData (documentos)
    return apiRequest('/api/verification/submit', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('changanet_token')}`
      }
    }, 0);
  },
  getStatus: () => api.get('/api/verification/status'),
  getPresignedUrl: (fileName, fileType) => api.post('/api/verification/presigned-url', { fileName, fileType }),
  uploadDocument: (presignedUrl, file) => {
    return fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });
  }
};

// Reputación y Rankings
export const reputationAPI = {
  getProfile: () => api.get('/api/reputation/profile'),
  getRanking: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return api.get(`/api/reputation/ranking?${queryString}`);
  },
  getMedals: () => api.get('/api/reputation/medals'),
  getGlobalStats: () => api.get('/api/reputation/stats')
};

// Panel de Administración de Verificaciones
export const adminVerificationAPI = {
  getPendingRequests: (page = 1, limit = 10) => {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    return api.get(`/api/admin/verification/pending?${params}`);
  },
  reviewRequest: (requestId, action, notes = '') => api.post('/api/admin/verification/review', {
    requestId,
    action,
    notes
  }),
  getRequestDetails: (requestId) => api.get(`/api/admin/verification/${requestId}`)
};

// Health check
export const healthAPI = {
  check: () => api.get('/health'),
  status: () => api.get('/api/status')
};

export default api;
