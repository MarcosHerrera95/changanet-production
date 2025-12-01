/**
 * Service Worker para Changánet
 * Implementa caching avanzado, sincronización en segundo plano y notificaciones push
 */

const CACHE_NAME = 'changanet-v1.0.0';
const STATIC_CACHE = 'changanet-static-v1.0.0';
const DYNAMIC_CACHE = 'changanet-dynamic-v1.0.0';
const API_CACHE = 'changanet-api-v1.0.0';

// Recursos estáticos para cachear
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/vite.svg',
  '/src/main.jsx',
  '/src/index.css',
  '/src/App.jsx'
];

// URLs de API que se pueden cachear
const API_ENDPOINTS_TO_CACHE = [
  '/api/status',
  '/api/services',
  '/api/professionals'
];

// Recursos que nunca se cachean
const NO_CACHE_PATTERNS = [
  /\/api\/auth\//,
  /\/api\/messages/,
  /\/api\/notifications/,
  /\/api\/profile/
];

/**
 * Instalación del Service Worker
 */
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker instalándose...');

  event.waitUntil(
    Promise.all([
      // Cache de recursos estáticos
      caches.open(STATIC_CACHE).then(cache => {
        console.log('📦 Cacheando recursos estáticos...');
        return cache.addAll(STATIC_ASSETS);
      }),

      // Cache de API esencial
      caches.open(API_CACHE).then(cache => {
        console.log('📡 Cacheando endpoints de API...');
        return Promise.all(
          API_ENDPOINTS_TO_CACHE.map(url =>
            fetch(url).then(response => {
              if (response.ok) {
                cache.put(url, response);
              }
            }).catch(() => {
              console.log(`⚠️ No se pudo cachear ${url}`);
            })
          )
        );
      })
    ]).then(() => {
      console.log('✅ Service Worker instalado correctamente');
      return self.skipWaiting();
    })
  );
});

/**
 * Activación del Service Worker
 */
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activándose...');

  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE &&
                cacheName !== API_CACHE) {
              console.log(`🗑️ Eliminando cache antiguo: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      }),

      // Tomar control inmediato
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker activado correctamente');
    })
  );
});

/**
 * Estrategia de cache: Cache First para recursos estáticos, Network First para API
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptar requests del mismo origen
  if (url.origin !== location.origin) return;

  // No cachear patrones específicos
  if (NO_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    return;
  }

  // Estrategia para recursos estáticos
  if (STATIC_ASSETS.includes(url.pathname) ||
      request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'image' ||
      request.destination === 'font') {

    event.respondWith(cacheFirst(request));
    return;
  }

  // Estrategia para API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Estrategia por defecto: Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request));
});

/**
 * Estrategia Cache First: Busca en cache primero, luego red
 */
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('❌ Error en cacheFirst:', error);
    // Fallback a offline page si está disponible
    return caches.match('/offline.html') || new Response('Offline', { status: 503 });
  }
}

/**
 * Estrategia Network First: Busca en red primero, luego cache
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('🌐 Red no disponible, buscando en cache...');

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback para API
    return new Response(JSON.stringify({
      error: 'Servicio no disponible',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Estrategia Stale While Revalidate: Retorna cache inmediatamente, actualiza en background
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}

/**
 * Manejo de notificaciones push
 */
self.addEventListener('push', (event) => {
  console.log('📨 Notificación push recibida:', event);

  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: '/vite.svg',
    badge: '/vite.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      {
        action: 'view',
        title: 'Ver',
        icon: '/vite.svg'
      },
      {
        action: 'dismiss',
        title: 'Descartar'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Manejo de clics en notificaciones
 */
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notificación clickeada:', event);

  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.openWindow(url)
  );
});

/**
 * Sincronización en segundo plano
 */
self.addEventListener('sync', (event) => {
  console.log('🔄 Sincronización en segundo plano:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

/**
 * Función de sincronización en segundo plano
 */
async function doBackgroundSync() {
  try {
    // Aquí iría la lógica para sincronizar datos pendientes
    console.log('🔄 Ejecutando sincronización en segundo plano...');

    // Ejemplo: reenviar mensajes pendientes
    const pendingMessages = await getPendingMessages();

    for (const message of pendingMessages) {
      try {
        await sendMessageToServer(message);
        await markMessageAsSent(message.id);
      } catch (error) {
        console.error('❌ Error enviando mensaje pendiente:', error);
      }
    }

    console.log('✅ Sincronización completada');
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
  }
}

/**
 * Funciones auxiliares para sincronización
 */
async function getPendingMessages() {
  // Implementar lógica para obtener mensajes pendientes
  return [];
}

async function sendMessageToServer(message) {
  // Implementar lógica para enviar mensaje al servidor
  return fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });
}

async function markMessageAsSent(messageId) {
  // Implementar lógica para marcar mensaje como enviado
  console.log(`✅ Mensaje ${messageId} marcado como enviado`);
}

/**
 * Manejo de mensajes desde el cliente
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
