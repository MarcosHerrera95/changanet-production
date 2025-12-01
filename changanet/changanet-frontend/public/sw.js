// Service Worker para Changánet - Optimizaciones de rendimiento
const CACHE_NAME = 'changanet-v1.0.0';
const API_CACHE_NAME = 'changanet-api-v1.0.0';

// Recursos a cachear inmediatamente
const STATIC_CACHE_URLS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
];

// URLs de API a cachear
const API_CACHE_URLS = [
  '/api/v2/search/professionals',
  '/api/v2/search/autocomplete'
];

// Evento de instalación
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando...');

  event.waitUntil(
    Promise.all([
      // Cachear recursos estáticos
      caches.open(CACHE_NAME).then((cache) => {
        console.log('Service Worker: Cacheando recursos estáticos');
        return cache.addAll(STATIC_CACHE_URLS);
      }),

      // Cachear API responses comunes (si están disponibles)
      caches.open(API_CACHE_NAME).then((cache) => {
        console.log('Service Worker: Preparando caché de API');
        // No precacheamos APIs ya que requieren autenticación
      })
    ]).then(() => {
      console.log('Service Worker: Instalación completada');
      return self.skipWaiting();
    })
  );
});

// Evento de activación
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activando...');

  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('Service Worker: Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),

      // Tomar control inmediatamente
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker: Activación completada');
    })
  );
});

// Evento de fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Estrategia de cache para recursos estáticos
  if (STATIC_CACHE_URLS.some(staticUrl => request.url.includes(staticUrl))) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((response) => {
          // Cachear la respuesta para futuras solicitudes
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Estrategia de cache para APIs de búsqueda
  if (API_CACHE_URLS.some(apiUrl => request.url.includes(apiUrl))) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) => {
        return cache.match(request).then((response) => {
          // Si está en cache y es fresco (menos de 5 minutos), usar cache
          if (response) {
            const cachedTime = new Date(response.headers.get('sw-cache-time') || 0);
            const now = new Date();
            const age = (now - cachedTime) / 1000 / 60; // en minutos

            if (age < 5) { // 5 minutos
              console.log('Service Worker: Usando respuesta cacheada para', request.url);
              return response;
            } else {
              // Cache expirado, eliminar
              cache.delete(request);
            }
          }

          // Fetch nueva respuesta
          return fetch(request).then((response) => {
            if (response.status === 200) {
              // Clonar respuesta para cachear
              const responseClone = response.clone();
              const responseWithTimestamp = new Response(responseClone.body, {
                status: responseClone.status,
                statusText: responseClone.statusText,
                headers: {
                  ...Object.fromEntries(responseClone.headers.entries()),
                  'sw-cache-time': new Date().toISOString()
                }
              });

              // Cachear con timestamp
              cache.put(request, responseWithTimestamp);
              console.log('Service Worker: Cacheando respuesta para', request.url);
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // Para otras solicitudes, usar estrategia network-first
  event.respondWith(
    fetch(request).catch(() => {
      // Fallback para cuando no hay conexión
      return caches.match('/').then((response) => {
        return response || new Response('Sin conexión a internet', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    })
  );
});

// Evento de mensaje (para comunicación con la app)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_CACHE_STATS') {
    Promise.all([
      caches.open(CACHE_NAME).then(cache => cache.keys()),
      caches.open(API_CACHE_NAME).then(cache => cache.keys())
    ]).then(([staticKeys, apiKeys]) => {
      event.ports[0].postMessage({
        staticCacheEntries: staticKeys.length,
        apiCacheEntries: apiKeys.length
      });
    });
  }
});

// Limpiar cache periódicamente
setInterval(() => {
  caches.open(API_CACHE_NAME).then((cache) => {
    cache.keys().then((keys) => {
      keys.forEach((request) => {
        cache.match(request).then((response) => {
          if (response) {
            const cachedTime = new Date(response.headers.get('sw-cache-time') || 0);
            const now = new Date();
            const age = (now - cachedTime) / 1000 / 60; // en minutos

            // Eliminar entradas cacheadas hace más de 10 minutos
            if (age > 10) {
              cache.delete(request);
              console.log('Service Worker: Eliminando entrada cacheada expirada');
            }
          }
        });
      });
    });
  });
}, 5 * 60 * 1000); // Ejecutar cada 5 minutos
