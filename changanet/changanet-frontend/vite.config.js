/**
 * Configuración de Vite para el frontend de Changánet.
 * Configura el servidor de desarrollo con proxy para APIs backend y headers de seguridad relajados para desarrollo.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  build: {
    // Optimize build for production
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@heroicons/react']
        }
      }
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize assets
    assetsInlineLimit: 4096,
    // Generate sourcemaps for debugging
    sourcemap: false
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    pool: 'threads',
    server: {
      deps: {
        inline: ['@sentry/browser', '@sentry/react', 'react', 'react-dom']
      }
    }
  },
  server: {
    host: 'localhost',
    port: 5175,
    deps: {
      inline: ['react', 'react-dom']
    },
    headers: {
      // Headers de desarrollo - CSP movida a meta tag en HTML para mejor control
      // COOP/COEP deshabilitados para compatibilidad con Firebase Auth
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
      // Headers de seguridad adicionales
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
