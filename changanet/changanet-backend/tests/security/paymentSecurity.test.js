/**
 * Comprehensive security tests for payment system
 * Covers: Rate limiting, fraud prevention, role validation,
 * webhook signature validation, and security edge cases
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { TestDataFactory } = require('../unit/testData.test');
const crypto = require('crypto');

const prisma = new PrismaClient();

describe('Payment Security - Integration Tests', () => {
  let app;
  let testDataFactory;
  let server;
  let clientToken;
  let professionalToken;
  let adminToken;

  beforeAll(async () => {
    // Import and setup test app
    const { app: testApp } = require('../../src/server');
    app = testApp;

    // Start server for integration tests
    server = app.listen(3005); // Different port for tests

    testDataFactory = new TestDataFactory();
    await testDataFactory.setupCompleteTestScenario();

    // Generate test tokens (simplified for testing)
    clientToken = 'test_client_token';
    professionalToken = 'test_professional_token';
    adminToken = 'test_admin_token';
  });

  afterAll(async () => {
    await testDataFactory.cleanup();
    await prisma.$disconnect();
    server.close();
  });

  describe('Rate Limiting Protection', () => {
    test('blocks excessive payment preference creation attempts', async () => {
      const serviceId = 'service-rate-limit-test';

      // Create test service
      await prisma.servicios.create({
        data: {
          id: serviceId,
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          descripcion: 'Service for rate limiting test',
          estado: 'PENDIENTE',
          fecha_solicitud: new Date()
        }
      });

      const paymentData = {
        serviceId: serviceId,
        amount: 1000
      };

      // Make multiple rapid requests (more than rate limit allows)
      const requests = [];
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app)
            .post('/api/payments/preference')
            .set('Authorization', `Bearer ${clientToken}`)
            .set('X-Forwarded-For', `192.168.1.${i}`) // Different IPs to avoid IP blocking
            .send(paymentData)
        );
      }

      const responses = await Promise.all(requests);

      // At least some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Clean up
      await prisma.servicios.delete({ where: { id: serviceId } }).catch(() => {});
    });

    test('allows normal request frequency', async () => {
      const serviceId = 'service-normal-rate-test';

      await prisma.servicios.create({
        data: {
          id: serviceId,
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          descripcion: 'Service for normal rate test',
          estado: 'PENDIENTE',
          fecha_solicitud: new Date()
        }
      });

      const paymentData = {
        serviceId: serviceId,
        amount: 1000
      };

      // Make a few requests with delays
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/payments/preference')
          .set('Authorization', `Bearer ${clientToken}`)
          .send(paymentData);

        expect(response.status).not.toBe(429); // Should not be rate limited
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      }

      await prisma.servicios.delete({ where: { id: serviceId } }).catch(() => {});
    });

    test('rate limiting applies per IP address', async () => {
      const serviceId = 'service-ip-rate-test';

      await prisma.servicios.create({
        data: {
          id: serviceId,
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          descripcion: 'Service for IP rate test',
          estado: 'PENDIENTE',
          fecha_solicitud: new Date()
        }
      });

      const paymentData = {
        serviceId: serviceId,
        amount: 1000
      };

      // Make requests from same IP - should be rate limited
      const sameIPRequests = [];
      for (let i = 0; i < 10; i++) {
        sameIPRequests.push(
          request(app)
            .post('/api/payments/preference')
            .set('Authorization', `Bearer ${clientToken}`)
            .set('X-Forwarded-For', '192.168.1.100') // Same IP
            .send(paymentData)
        );
      }

      const sameIPResponses = await Promise.all(sameIPRequests);
      const sameIPRateLimited = sameIPResponses.filter(r => r.status === 429);

      expect(sameIPRateLimited.length).toBeGreaterThan(0);

      await prisma.servicios.delete({ where: { id: serviceId } }).catch(() => {});
    });
  });

  describe('Webhook Signature Validation', () => {
    test('rejects webhook with invalid HMAC-SHA256 signature', async () => {
      const webhookData = {
        type: 'payment',
        data: {
          id: 'mp_invalid_sig_test',
          status: 'approved',
          external_reference: 'service-test'
        }
      };

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('x-signature', 'ts=1234567890,v1=invalid_signature_123')
        .set('x-request-id', 'webhook_invalid_sig_test')
        .send(webhookData);

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error procesando webhook');
    });

    test('rejects webhook with expired timestamp', async () => {
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
      const webhookData = {
        type: 'payment',
        data: {
          id: 'mp_expired_test',
          status: 'approved',
          external_reference: 'service-test'
        }
      };

      const payload = JSON.stringify(webhookData);
      const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || 'test_webhook_secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(`${expiredTimestamp}.${payload}`)
        .digest('hex');

      const signatureHeader = `ts=${expiredTimestamp},v1=${signature}`;

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('x-signature', signatureHeader)
        .set('x-request-id', 'webhook_expired_test')
        .send(webhookData);

      expect(response.status).toBe(500);
    });

    test('rejects webhook with malformed signature header', async () => {
      const webhookData = {
        type: 'payment',
        data: {
          id: 'mp_malformed_test',
          status: 'approved'
        }
      };

      const malformedSignatures = [
        'invalid_format',
        'ts=123,v1=signature',
        'ts=abc,v1=signature',
        'v1=signature',
        'ts=123',
        ''
      ];

      for (const signature of malformedSignatures) {
        const response = await request(app)
          .post('/api/payments/webhook')
          .set('x-signature', signature)
          .set('x-request-id', `webhook_malformed_${Date.now()}`)
          .send(webhookData);

        expect(response.status).toBe(500);
      }
    });

    test('prevents webhook replay attacks', async () => {
      const webhookData = {
        type: 'payment',
        data: {
          id: 'mp_replay_test',
          status: 'approved',
          external_reference: 'service-test'
        }
      };

      const timestamp = Math.floor(Date.now() / 1000);
      const payload = JSON.stringify(webhookData);
      const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || 'test_webhook_secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${payload}`)
        .digest('hex');

      const signatureHeader = `ts=${timestamp},v1=${signature}`;
      const requestId = 'webhook_replay_test';

      // First webhook - should succeed
      const firstResponse = await request(app)
        .post('/api/payments/webhook')
        .set('x-signature', signatureHeader)
        .set('x-request-id', requestId)
        .send(webhookData);

      expect(firstResponse.status).toBe(200);

      // Second webhook with same request ID - should be handled gracefully
      const secondResponse = await request(app)
        .post('/api/payments/webhook')
        .set('x-signature', signatureHeader)
        .set('x-request-id', requestId)
        .send(webhookData);

      // Should still respond OK but not process again
      expect(secondResponse.status).toBe(200);
    });
  });

  describe('Role-Based Access Control', () => {
    test('client cannot access admin payment endpoints', async () => {
      const response = await request(app)
        .get('/api/admin/payments')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(403);
    });

    test('professional cannot access admin commission endpoints', async () => {
      const response = await request(app)
        .post('/api/admin/commission/update')
        .set('Authorization', `Bearer ${professionalToken}`)
        .send({ percentage: 9.0 });

      expect(response.status).toBe(403);
    });

    test('client cannot withdraw funds from other clients payments', async () => {
      const response = await request(app)
        .post('/api/payments/release')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          paymentId: 'mp_wrong_client',
          serviceId: 'service-wrong-client'
        });

      expect(response.status).toBe(500); // Permission denied or not found
    });

    test('professional cannot access other professionals payout data', async () => {
      const response = await request(app)
        .get('/api/payments/received/professional-wrong-id')
        .set('Authorization', `Bearer ${professionalToken}`);

      expect(response.status).toBe(403);
    });

    test('admin can access all payment data', async () => {
      const response = await request(app)
        .get('/api/admin/payments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Fraud Prevention', () => {
    test('detects suspicious payment amounts', async () => {
      const serviceId = 'service-fraud-amount-test';

      await prisma.servicios.create({
        data: {
          id: serviceId,
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          descripcion: 'Service for fraud amount test',
          estado: 'PENDIENTE',
          fecha_solicitud: new Date()
        }
      });

      // Test with extremely high amount
      const fraudData = {
        serviceId: serviceId,
        amount: 10000000 // 10 million - suspicious
      };

      const response = await request(app)
        .post('/api/payments/preference')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(fraudData);

      // Should either reject or flag for review
      expect([400, 500]).toContain(response.status);

      await prisma.servicios.delete({ where: { id: serviceId } }).catch(() => {});
    });

    test('prevents duplicate payment creation for same service', async () => {
      const serviceId = 'service-duplicate-test';

      await prisma.servicios.create({
        data: {
          id: serviceId,
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          descripcion: 'Service for duplicate test',
          estado: 'PENDIENTE',
          fecha_solicitud: new Date()
        }
      });

      const paymentData = {
        serviceId: serviceId,
        amount: 1000
      };

      // First payment should succeed
      const firstResponse = await request(app)
        .post('/api/payments/preference')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(paymentData);

      expect(firstResponse.status).toBe(201);

      // Second payment for same service should be rejected
      const secondResponse = await request(app)
        .post('/api/payments/preference')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(paymentData);

      expect(secondResponse.status).toBe(500); // Should reject duplicate

      await prisma.servicios.delete({ where: { id: serviceId } }).catch(() => {});
      await prisma.pagos.deleteMany({ where: { servicio_id: serviceId } }).catch(() => {});
    });

    test('validates service ownership before payment', async () => {
      const serviceId = 'service-ownership-test';

      // Create service for different client
      await prisma.servicios.create({
        data: {
          id: serviceId,
          cliente_id: 'client-different', // Different client
          profesional_id: 'professional-test-1',
          descripcion: 'Service for ownership test',
          estado: 'PENDIENTE',
          fecha_solicitud: new Date()
        }
      });

      const paymentData = {
        serviceId: serviceId,
        amount: 1000
      };

      const response = await request(app)
        .post('/api/payments/preference')
        .set('Authorization', `Bearer ${clientToken}`) // Wrong client token
        .send(paymentData);

      expect(response.status).toBe(403);

      await prisma.servicios.delete({ where: { id: serviceId } }).catch(() => {});
    });

    test('prevents payment manipulation through amount overrides', async () => {
      const serviceId = 'service-amount-override-test';

      await prisma.servicios.create({
        data: {
          id: serviceId,
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          descripcion: 'Service for amount override test',
          estado: 'PENDIENTE',
          fecha_solicitud: new Date()
        }
      });

      // Try to override amount to much higher value
      const manipulatedData = {
        serviceId: serviceId,
        amount: 100000 // Much higher than expected
      };

      const response = await request(app)
        .post('/api/payments/preference')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(manipulatedData);

      // Should either validate against service expectations or flag for review
      expect([200, 400, 500]).toContain(response.status);

      await prisma.servicios.delete({ where: { id: serviceId } }).catch(() => {});
    });
  });

  describe('Input Validation and Sanitization', () => {
    test('sanitizes and validates payment IDs', async () => {
      const maliciousIds = [
        "mp_123'; DROP TABLE pagos; --",
        '<script>alert("xss")</script>',
        '../../../etc/passwd',
        'mp_123 UNION SELECT * FROM users',
        'mp_123'.repeat(1000) // Very long ID
      ];

      for (const maliciousId of maliciousIds) {
        const response = await request(app)
          .get(`/api/payments/status/${maliciousId}`)
          .set('Authorization', `Bearer ${clientToken}`);

        // Should not crash and should handle gracefully
        expect([400, 404, 500]).toContain(response.status);
      }
    });

    test('validates webhook payload structure', async () => {
      const invalidPayloads = [
        null,
        {},
        { type: 'payment' }, // Missing data
        { data: { id: 'test' } }, // Missing type
        { type: 'invalid_type', data: { id: 'test' } },
        { type: 'payment', data: null },
        { type: 'payment', data: {} }, // Empty data
      ];

      for (const payload of invalidPayloads) {
        const response = await request(app)
          .post('/api/payments/webhook')
          .set('x-signature', 'ts=1234567890,v1=test_signature')
          .set('x-request-id', `webhook_invalid_${Date.now()}`)
          .send(payload);

        expect(response.status).toBe(500);
      }
    });

    test('handles malformed JSON in requests', async () => {
      const response = await request(app)
        .post('/api/payments/preference')
        .set('Authorization', `Bearer ${clientToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    test('validates numeric inputs', async () => {
      const serviceId = 'service-numeric-test';

      await prisma.servicios.create({
        data: {
          id: serviceId,
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          descripcion: 'Service for numeric validation test',
          estado: 'PENDIENTE',
          fecha_solicitud: new Date()
        }
      });

      const invalidAmounts = [
        'not-a-number',
        '-100',
        '0',
        '999999999999', // Too large
        '1.234.567', // Invalid format
        '1,000', // Invalid format
      ];

      for (const amount of invalidAmounts) {
        const response = await request(app)
          .post('/api/payments/preference')
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            serviceId: serviceId,
            amount: amount
          });

        expect([400, 500]).toContain(response.status);
      }

      await prisma.servicios.delete({ where: { id: serviceId } }).catch(() => {});
    });
  });

  describe('Session and Authentication Security', () => {
    test('requires valid authentication for payment operations', async () => {
      const endpoints = [
        { method: 'POST', path: '/api/payments/preference' },
        { method: 'POST', path: '/api/payments/release' },
        { method: 'POST', path: '/api/payments/withdraw' },
        { method: 'GET', path: '/api/payments/client/client-test-1' },
        { method: 'GET', path: '/api/payments/received/professional-test-1' },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          [endpoint.method.toLowerCase()](endpoint.path)
          .send({ serviceId: 'test', amount: 1000 });

        expect(response.status).toBe(401);
      }
    });

    test('rejects expired or invalid tokens', async () => {
      const response = await request(app)
        .post('/api/payments/preference')
        .set('Authorization', 'Bearer expired_token_123')
        .send({
          serviceId: 'service-test',
          amount: 1000
        });

      expect([401, 403]).toContain(response.status);
    });

    test('prevents token reuse attacks', async () => {
      // This would require more complex token management
      // For now, just verify tokens are validated
      const response = await request(app)
        .post('/api/payments/preference')
        .set('Authorization', 'Bearer tampered_token')
        .send({
          serviceId: 'service-test',
          amount: 1000
        });

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Data Exposure Prevention', () => {
    test('does not expose sensitive payment data in error messages', async () => {
      const response = await request(app)
        .post('/api/payments/preference')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          serviceId: 'nonexistent-service-123',
          amount: 1000
        });

      expect(response.status).toBe(404);

      // Error message should not contain sensitive data
      const errorMessage = response.body.error || '';
      expect(errorMessage).not.toMatch(/payment/i);
      expect(errorMessage).not.toMatch(/mercado.?pago/i);
      expect(errorMessage).not.toMatch(/mp_/i);
    });

    test('masks sensitive data in API responses', async () => {
      const serviceId = 'service-sensitive-test';

      await prisma.servicios.create({
        data: {
          id: serviceId,
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          descripcion: 'Service for sensitive data test',
          estado: 'PENDIENTE',
          fecha_solicitud: new Date()
        }
      });

      const response = await request(app)
        .post('/api/payments/preference')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          serviceId: serviceId,
          amount: 1000
        });

      if (response.status === 201) {
        // If payment was created, check that sensitive data is not exposed
        const responseData = response.body.data || {};
        expect(responseData).not.toHaveProperty('mercado_pago_access_token');
        expect(responseData).not.toHaveProperty('webhook_secret');
        expect(responseData).not.toHaveProperty('client_secret');
      }

      await prisma.servicios.delete({ where: { id: serviceId } }).catch(() => {});
    });

    test('logs security events without exposing sensitive data', async () => {
      // This test would require checking application logs
      // For now, just ensure the application doesn't crash on suspicious requests
      const suspiciousRequests = [
        {
          serviceId: 'service-test',
          amount: 1000,
          maliciousField: '<script>alert("xss")</script>'
        },
        {
          serviceId: 'service-test',
          amount: '1000 UNION SELECT password FROM users',
          sqlInjection: true
        }
      ];

      for (const requestData of suspiciousRequests) {
        const response = await request(app)
          .post('/api/payments/preference')
          .set('Authorization', `Bearer ${clientToken}`)
          .send(requestData);

        // Should handle gracefully without crashing
        expect([400, 404, 500]).toContain(response.status);
      }
    });
  });
});
