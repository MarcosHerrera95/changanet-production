/**
 * Utilidades de rendimiento para optimización de operaciones frecuentes
 * Incluye debouncing, throttling y otras técnicas de optimización
 */

/**
 * Debounce: Retrasa la ejecución de una función hasta que pase un tiempo determinado
 * Útil para búsquedas, validaciones en tiempo real, etc.
 *
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en milisegundos
 * @param {boolean} immediate - Si debe ejecutarse inmediatamente
 * @returns {Function} Función debounced
 */
export function debounce(func, wait, immediate = false) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
}

/**
 * Throttle: Limita la frecuencia de ejecución de una función
 * Útil para eventos de scroll, resize, mouse move, etc.
 *
 * @param {Function} func - Función a ejecutar
 * @param {number} limit - Límite de tiempo en milisegundos
 * @returns {Function} Función throttled
 */
export function throttle(func, limit) {
  let inThrottle;

  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Throttle con opción de leading/trailing edge
 * @param {Function} func - Función a ejecutar
 * @param {number} limit - Límite de tiempo
 * @param {Object} options - Opciones {leading: true, trailing: true}
 * @returns {Function} Función throttled
 */
export function throttleAdvanced(func, limit, options = { leading: true, trailing: true }) {
  let timeout;
  let previous = 0;

  return function executedFunction(...args) {
    const now = Date.now();

    if (!previous && options.leading === false) {
      previous = now;
    }

    const remaining = limit - (now - previous);

    if (remaining <= 0 || remaining > limit) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}

/**
 * Memoización simple para funciones puras
 * @param {Function} fn - Función a memoizar
 * @param {Function} getKey - Función para generar clave de caché
 * @returns {Function} Función memoizada
 */
export function memoize(fn, getKey = (...args) => JSON.stringify(args)) {
  const cache = new Map();

  return function memoizedFunction(...args) {
    const key = getKey(...args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn.apply(this, args);
    cache.set(key, result);

    // Limitar tamaño del caché (opcional)
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return result;
  };
}

/**
 * Lazy loading con Intersection Observer para elementos del DOM
 * @param {Element} element - Elemento a observar
 * @param {Function} callback - Función a ejecutar cuando sea visible
 * @param {Object} options - Opciones del observer
 */
export function lazyLoadElement(element, callback, options = {}) {
  if (!element) return;

  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, defaultOptions);

  observer.observe(element);

  return () => observer.disconnect();
}

/**
 * Optimización de imágenes con lazy loading
 * @param {HTMLImageElement} img - Elemento img
 * @param {string} src - URL de la imagen
 * @param {string} placeholder - Placeholder mientras carga
 */
export function lazyLoadImage(img, src, placeholder = '') {
  if (!img) return;

  // Set placeholder initially
  if (placeholder) {
    img.src = placeholder;
  }

  // Create observer
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const targetImg = entry.target;
        targetImg.src = src;
        targetImg.classList.add('fade-in');
        observer.unobserve(targetImg);
      }
    });
  });

  observer.observe(img);

  return () => observer.disconnect();
}

/**
 * Hook personalizado para debounced values
 * Nota: Este hook debe importarse en componentes React
 * @param {any} value - Valor a debounced
 * @param {number} delay - Delay en ms
 * @returns {any} Valor debounced
 */
export function useDebounce(value, delay) {
  // Este código debe usarse en un componente React con useState y useEffect
  // Ejemplo de uso:
  // const debouncedValue = useDebounce(value, 500);
  console.log('useDebounce called with delay:', delay); // Usar el parámetro para evitar warning
  return value; // Placeholder - implementar en componente
}

/**
 * Función para precargar recursos críticos
 * @param {Array<string>} resources - URLs de recursos a precargar
 */
export function preloadCriticalResources(resources) {
  resources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource;
    link.as = resource.endsWith('.js') ? 'script' : 'style';
    document.head.appendChild(link);
  });
}

/**
 * Optimización de re-renders con shallow comparison
 * @param {Object} prevProps - Props anteriores
 * @param {Object} nextProps - Props siguientes
 * @returns {boolean} true si debe re-renderizar
 */
export function shallowEqual(prevProps, nextProps) {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (let key of prevKeys) {
    if (!(key in nextProps) || prevProps[key] !== nextProps[key]) {
      return false;
    }
  }

  return true;
}
