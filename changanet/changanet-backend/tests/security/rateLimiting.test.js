/**
 * Tests de seguridad para rate limiting
 * Verifica que el rate limiting funcione correctamente y prevenga ataques DoS
 */

const request = require('supertest');
const express = require('express');
const rateLimit = require('rate-limiter-flexible').RateLimiterMemory;

describe('Rate Limiting Security', () => {
  let app, limiter;

  beforeEach(() => {
    app = express();

    // Configurar rate limiter igual que en producción
    limiter = new rateLimit.RateLimiterMemory({
      points: process.env.NODE_ENV === 'production' ? 30 : 100,
      duration: 60, // 1 minuto
    });

    // Middleware de rate limiting
    const rateLimiterMiddleware = (req, res, next) => {
      limiter.consume(req.ip)
        .then(() => {
          next();
        })
        .catch(() => {
          res.status(429).send('Demasiadas solicitudes desde esta IP, inténtalo de nuevo más tarde.');
        });
    };

    app.use(rateLimiterMiddleware);
    app.get('/api/test', (req, res) => res.json({ success: true }));
    app.get('/api/health', (req, res) => res.json({ status: 'OK' }));
  });

  describe('Normal Usage', () => {
    test('should allow requests within limit', async () => {
      const requests = Array(25).fill().map(() =>
        request(app).get('/api/test')
      );

      const responses = await Promise.all(requests);
      const successCount = responses.filter(r => r.status === 200).length;

      expect(successCount).toBe(25);
    });

    test('should return correct response for allowed requests', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });
  });

  describe('Rate Limit Enforcement', () => {
    test('should block requests over limit in production', async () => {
      // Forzar modo producción para test
      process.env.NODE_ENV = 'production';

      // Recrear app con configuración de producción
      app = express();
      limiter = new rateLimit.RateLimiterMemory({
        points: 30,
        duration: 60,
      });

      const rateLimiterMiddleware = (req, res, next) => {
        limiter.consume(req.ip)
          .then(() => next())
          .catch(() => {
            res.status(429).send('Demasiadas solicitudes desde esta IP, inténtalo de nuevo más tarde.');
          });
      };

      app.use(rateLimiterMiddleware);
      app.get('/api/test', (req, res) => res.json({ success: true }));

      // Hacer 35 solicitudes (5 sobre el límite de 30)
      const requests = Array(35).fill().map(() =>
        request(app).get('/api/test')
      );

      const responses = await Promise.all(requests);
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      const successCount = responses.filter(r => r.status === 200).length;

      expect(successCount).toBe(30); // Deberían pasar las primeras 30
      expect(rateLimitedCount).toBe(5);  // Deberían bloquearse las últimas 5

      // Reset environment
      process.env.NODE_ENV = 'test';
    });

    test('should return 429 status for rate limited requests', async () => {
      // Configurar límite muy bajo para test
      limiter = new rateLimit.RateLimiterMemory({
        points: 1,
        duration: 60,
      });

      app = express();
      const rateLimiterMiddleware = (req, res, next) => {
        limiter.consume(req.ip)
          .then(() => next())
          .catch(() => {
            res.status(429).send('Demasiadas solicitudes desde esta IP, inténtalo de nuevo más tarde.');
          });
      };

      app.use(rateLimiterMiddleware);
      app.get('/api/test', (req, res) => res.json({ success: true }));

      // Primera solicitud debería pasar
      await request(app).get('/api/test').expect(200);

      // Segunda solicitud debería bloquearse
      const response = await request(app).get('/api/test').expect(429);

      expect(response.text).toContain('Demasiadas solicitudes');
    });
  });

  describe('Rate Limit Reset', () => {
    test('should reset limit after duration', async () => {
      // Configurar duración muy corta para test
      limiter = new rateLimit.RateLimiterMemory({
        points: 2,
        duration: 1, // 1 segundo
      });

      app = express();
      const rateLimiterMiddleware = (req, res, next) => {
        limiter.consume(req.ip)
          .then(() => next())
          .catch(() => {
            res.status(429).send('Rate limited');
          });
      };

      app.use(rateLimiterMiddleware);
      app.get('/api/test', (req, res) => res.json({ success: true }));

      // Usar las 2 solicitudes permitidas
      await request(app).get('/api/test').expect(200);
      await request(app).get('/api/test').expect(200);

      // Tercera debería bloquearse
      await request(app).get('/api/test').expect(429);

      // Esperar a que resetee el límite
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Ahora debería permitir nuevamente
      await request(app).get('/api/test').expect(200);
    });
  });

  describe('Different Endpoints', () => {
    test('should apply rate limiting per IP across different endpoints', async () => {
      // Configurar límite bajo
      limiter = new rateLimit.RateLimiterMemory({
        points: 3,
        duration: 60,
      });

      app = express();
      const rateLimiterMiddleware = (req, res, next) => {
        limiter.consume(req.ip)
          .then(() => next())
          .catch(() => {
            res.status(429).send('Rate limited');
          });
      };

      app.use(rateLimiterMiddleware);
      app.get('/api/test1', (req, res) => res.json({ endpoint: 1 }));
      app.get('/api/test2', (req, res) => res.json({ endpoint: 2 }));

      // Hacer 3 solicitudes a diferentes endpoints
      await request(app).get('/api/test1').expect(200);
      await request(app).get('/api/test2').expect(200);
      await request(app).get('/api/test1').expect(200);

      // Cuarta solicitud debería bloquearse (comparten el límite por IP)
      await request(app).get('/api/test2').expect(429);
    });
  });

  describe('Edge Cases', () => {
    test('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '') // IP vacía
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    test('should work with different IP headers', async () => {
      const testIP = '192.168.1.100';

      // Test with X-Forwarded-For
      await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', testIP)
        .expect(200);

      // Test with X-Real-IP
      await request(app)
        .get('/api/test')
        .set('X-Real-IP', testIP)
        .expect(200);
    });
  });
});
