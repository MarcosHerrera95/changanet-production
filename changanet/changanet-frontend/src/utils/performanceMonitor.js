/**
 * Performance Monitor for Changánet
 * Tracks resource loading, preload effectiveness, and performance metrics
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      resources: new Map(),
      navigation: null,
      marks: new Set()
    };
    this.init();
  }

  init() {
    // Monitor resource loading
    if ('PerformanceObserver' in window) {
      try {
        // Monitor resource loading
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.trackResource(entry);
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });

        // Monitor navigation timing
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.trackNavigation(entry);
          }
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });

        console.log('🚀 Changánet: Performance monitoring initialized');
      } catch (error) {
        console.warn('⚠️ Changánet: Performance monitoring failed to initialize:', error);
      }
    }
  }

  trackResource(entry) {
    const resource = {
      name: entry.name,
      type: this.getResourceType(entry.name),
      duration: entry.duration,
      size: entry.transferSize || 0,
      startTime: entry.startTime
    };

    this.metrics.resources.set(entry.name, resource);

    // Log resource loading in development
    if (import.meta.env.DEV) {
      console.log(`📊 Resource: ${resource.type} - ${resource.name} (${resource.duration.toFixed(2)}ms)`);
    }

    // Check for preload warnings
    this.checkPreloadWarnings(resource);
  }

  trackNavigation(entry) {
    this.metrics.navigation = {
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
      totalTime: entry.loadEventEnd - entry.navigationStart
    };

    if (import.meta.env.DEV) {
      console.log('📊 Navigation Timing:', this.metrics.navigation);
    }
  }

  getResourceType(url) {
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.js') || url.includes('.jsx')) return 'script';
    if (url.includes('.woff') || url.includes('.woff2') || url.includes('.ttf')) return 'font';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.includes('chunk')) return 'chunk';
    return 'other';
  }

  checkPreloadWarnings(resource) {
    // Check if resources were preloaded but not used efficiently
    const preloadHints = Array.from(document.querySelectorAll('link[rel="preload"]'));
    
    if (preloadHints.length > 0 && resource.duration > 5000) {
      console.warn(`⚠️ Slow resource: ${resource.name} took ${resource.duration.toFixed(2)}ms`);
    }
  }

  // Custom performance marks
  mark(name) {
    if ('performance' in window && performance.mark) {
      performance.mark(name);
      this.metrics.marks.add(name);
      
      if (import.meta.env.DEV) {
        console.log(`🏁 Mark: ${name}`);
      }
    }
  }

  // Get performance report
  getReport() {
    const resources = Array.from(this.metrics.resources.values());
    
    return {
      navigation: this.metrics.navigation,
      resources: {
        total: resources.length,
        slowest: resources.sort((a, b) => b.duration - a.duration).slice(0, 5)
      }
    };
  }

  // Log performance summary
  logSummary() {
    const report = this.getReport();
    
    console.group('🚀 Changánet Performance Report');
    console.log('Navigation:', report.navigation);
    console.log('Total resources:', report.resources.total);
    console.groupEnd();
  }
}

// Create global instance
const performanceMonitor = new PerformanceMonitor();

// Auto-log summary on page load
if (document.readyState === 'complete') {
  performanceMonitor.logSummary();
} else {
  window.addEventListener('load', () => {
    setTimeout(() => performanceMonitor.logSummary(), 1000);
  });
}

export default performanceMonitor;
export { PerformanceMonitor };
