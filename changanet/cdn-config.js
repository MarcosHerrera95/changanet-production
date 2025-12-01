/**
 * Configuración de CDN para distribución de assets estáticos
 * Implementa optimización de assets para <2s de tiempo de respuesta
 */

const CDN_CONFIG = {
  // Configuración principal
  provider: process.env.CDN_PROVIDER || 'cloudflare', // 'cloudflare', 'aws', 'azure'

  // Zonas de CDN
  zones: {
    primary: {
      domain: 'cdn.changanet.com',
      region: 'south-america-east1', // São Paulo para latencia baja en LATAM
      origins: [
        'https://changanet.com',
        'https://api.changanet.com'
      ]
    },
    secondary: {
      domain: 'cdn-secondary.changanet.com',
      region: 'us-east1', // Backup en US East
      origins: [
        'https://changanet.com'
      ]
    }
  },

  // Configuración de cache
  cache: {
    // TTL para diferentes tipos de contenido
    ttl: {
      static: 31536000, // 1 año para assets estáticos
      images: 86400,    // 24 horas para imágenes
      fonts: 604800,    // 1 semana para fonts
      api: 300,         // 5 minutos para respuestas de API
      dynamic: 0        // No cache para contenido dinámico
    },

    // Reglas de cache inteligentes
    rules: [
      {
        pattern: '/_next/static/*',
        ttl: 31536000,
        cacheControl: 'public, max-age=31536000, immutable'
      },
      {
        pattern: '/api/payments/*',
        ttl: 0,
        cacheControl: 'no-cache, no-store, must-revalidate'
      },
      {
        pattern: '/api/commission/*',
        ttl: 300,
        cacheControl: 'public, max-age=300'
      },
      {
        pattern: '/*.js',
        ttl: 86400,
        cacheControl: 'public, max-age=86400'
      },
      {
        pattern: '/*.css',
        ttl: 86400,
        cacheControl: 'public, max-age=86400'
      },
      {
        pattern: '/*.{png,jpg,jpeg,gif,webp,svg}',
        ttl: 604800,
        cacheControl: 'public, max-age=604800'
      }
    ]
  },

  // Optimización de imágenes
  imageOptimization: {
    enabled: true,
    formats: ['webp', 'avif', 'jpg', 'png'],
    qualities: {
      webp: 85,
      avif: 80,
      jpg: 90,
      png: 95
    },
    sizes: [
      { width: 320, height: null },
      { width: 640, height: null },
      { width: 768, height: null },
      { width: 1024, height: null },
      { width: 1280, height: null },
      { width: 1920, height: null }
    ]
  },

  // Compresión
  compression: {
    enabled: true,
    algorithms: ['gzip', 'brotli'],
    minSize: 1024, // Solo comprimir archivos > 1KB
    contentTypes: [
      'text/html',
      'text/css',
      'text/javascript',
      'application/javascript',
      'application/json',
      'application/xml',
      'text/xml'
    ]
  },

  // Load balancing y failover
  loadBalancing: {
    enabled: true,
    strategy: 'geo', // 'round-robin', 'geo', 'weighted'
    healthChecks: {
      enabled: true,
      interval: 30, // segundos
      timeout: 5,   // segundos
      unhealthyThreshold: 3,
      healthyThreshold: 2
    },
    geoRouting: {
      enabled: true,
      regions: {
        'south-america': ['primary'],
        'north-america': ['secondary', 'primary'],
        'europe': ['secondary', 'primary'],
        'asia': ['secondary', 'primary'],
        'default': ['primary', 'secondary']
      }
    }
  },

  // Seguridad
  security: {
    waf: {
      enabled: true,
      rules: [
        'OWASP_CoreRuleSet',
        'custom_payment_protection',
        'rate_limiting'
      ]
    },
    ddos: {
      enabled: true,
      threshold: 10000, // requests per minute
      action: 'challenge' // 'block', 'challenge', 'allow'
    },
    ssl: {
      enabled: true,
      minVersion: 'TLSv1.2',
      ciphers: [
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-GCM-SHA256'
      ]
    }
  },

  // Monitoreo y analytics
  monitoring: {
    enabled: true,
    metrics: [
      'requests_total',
      'bytes_transferred',
      'cache_hit_ratio',
      'response_time',
      'error_rate'
    ],
    alerts: [
      {
        name: 'High Error Rate',
        condition: 'error_rate > 0.05',
        duration: '5m',
        channels: ['slack', 'email']
      },
      {
        name: 'Low Cache Hit Ratio',
        condition: 'cache_hit_ratio < 0.8',
        duration: '10m',
        channels: ['slack']
      }
    ]
  }
};

// Función para obtener configuración de CDN para un asset específico
function getCDNConfig(assetPath) {
  const config = { ...CDN_CONFIG };

  // Determinar TTL basado en el tipo de asset
  if (assetPath.match(/\.(js|css)$/)) {
    config.cache.ttl = config.cache.ttl.static;
  } else if (assetPath.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) {
    config.cache.ttl = config.cache.ttl.images;
  } else if (assetPath.match(/\.(woff|woff2|ttf|eot)$/)) {
    config.cache.ttl = config.cache.ttl.fonts;
  } else if (assetPath.startsWith('/api/')) {
    config.cache.ttl = config.cache.ttl.api;
  } else {
    config.cache.ttl = config.cache.ttl.dynamic;
  }

  return config;
}

// Función para generar URL de CDN
function getCDNUrl(originalUrl, options = {}) {
  const { region = 'auto', format = null } = options;

  // Lógica para seleccionar el mejor CDN basado en la región
  let cdnDomain = CDN_CONFIG.zones.primary.domain;

  if (region === 'secondary' || (region === 'auto' && shouldUseSecondary())) {
    cdnDomain = CDN_CONFIG.zones.secondary.domain;
  }

  // Agregar optimización de imagen si aplica
  if (format && CDN_CONFIG.imageOptimization.enabled) {
    return `https://${cdnDomain}${originalUrl}?format=${format}&quality=${CDN_CONFIG.imageOptimization.qualities[format] || 85}`;
  }

  return `https://${cdnDomain}${originalUrl}`;
}

// Función auxiliar para determinar si usar CDN secundario
function shouldUseSecondary() {
  // Lógica basada en latencia, carga, etc.
  // Por ahora, usar primario por defecto
  return false;
}

module.exports = {
  CDN_CONFIG,
  getCDNConfig,
  getCDNUrl,
  shouldUseSecondary
};
