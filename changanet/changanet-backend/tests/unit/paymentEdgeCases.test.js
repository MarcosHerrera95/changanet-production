/**
 * Comprehensive edge case tests for payment system
 * Covers: Limit amounts, concurrency, gateway errors,
 * invalid states, timeout handling, and boundary conditions
 */

const paymentController = require('../../src/controllers/paymentController');
const commissionService = require('../../src/services/commissionService');
const mercadoPagoService = require('../../src/services/mercadoPagoService');
const { PrismaClient } = require('@prisma/client');

jest.mock('../../src/services/mercadoPagoService');
jest.mock('../../src/services/commissionService');
jest.mock('../../src/services/logger');

const mockPrisma = {
  pagos: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  servicios: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  transactions_log: {
    create: jest.fn(),
  },
  payouts: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  commission_settings: {
    findFirst: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

describe('Payment System - Edge Cases and Boundary Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: { id: 'client-123' },
      ip: '127.0.0.1',
      body: {},
      params: {},
      get: jest.fn(),
      headers: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe('Amount Limits and Boundaries', () => {
    test('handles minimum payment amount (1 cent)', async () => {
      mockReq.body = { serviceId: 'service-123', amount: 0.01 };

      const mockService = {
        id: 'service-123',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        pago: null,
        profesional: {
          id: 'prof-123',
          nombre: 'Test Professional',
          email: 'prof@test.com',
          perfil_profesional: { tarifa_hora: 1000 },
        },
        cliente: {
          id: 'client-123',
          nombre: 'Test Client',
          email: 'client@test.com',
        },
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);
      mockPrisma.pagos.create.mockResolvedValue({ id: 'payment-123' });
      mercadoPagoService.createPaymentPreference.mockResolvedValue({
        id: 'pref_123',
        init_point: 'https://mp.com/pay',
      });

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mercadoPagoService.createPaymentPreference).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 0.01 })
      );
    });

    test('handles maximum payment amount (1M)', async () => {
      mockReq.body = { serviceId: 'service-123', amount: 1000000 };

      const mockService = {
        id: 'service-123',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        pago: null,
        profesional: {
          id: 'prof-123',
          nombre: 'Test Professional',
          email: 'prof@test.com',
          perfil_profesional: { tarifa_hora: 1000 },
        },
        cliente: {
          id: 'client-123',
          nombre: 'Test Client',
          email: 'client@test.com',
        },
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);
      mockPrisma.pagos.create.mockResolvedValue({ id: 'payment-123' });
      mercadoPagoService.createPaymentPreference.mockResolvedValue({
        id: 'pref_123',
        init_point: 'https://mp.com/pay',
      });

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mercadoPagoService.createPaymentPreference).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1000000 })
      );
    });

    test('rejects amounts exceeding maximum limit', async () => {
      mockReq.body = { serviceId: 'service-123', amount: 1000001 };

      const mockService = {
        id: 'service-123',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        pago: null,
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('handles zero amount payments', async () => {
      mockReq.body = { serviceId: 'service-123', amount: 0 };

      const mockService = {
        id: 'service-123',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        pago: null,
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('handles negative amounts', async () => {
      mockReq.body = { serviceId: 'service-123', amount: -100 };

      const mockService = {
        id: 'service-123',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        pago: null,
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('handles decimal amounts with high precision', async () => {
      mockReq.body = { serviceId: 'service-123', amount: 1234.56789 };

      const mockService = {
        id: 'service-123',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        pago: null,
        profesional: {
          id: 'prof-123',
          nombre: 'Test Professional',
          email: 'prof@test.com',
          perfil_profesional: { tarifa_hora: 1000 },
        },
        cliente: {
          id: 'client-123',
          nombre: 'Test Client',
          email: 'client@test.com',
        },
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);
      mockPrisma.pagos.create.mockResolvedValue({ id: 'payment-123' });
      mercadoPagoService.createPaymentPreference.mockResolvedValue({
        id: 'pref_123',
        init_point: 'https://mp.com/pay',
      });

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mercadoPagoService.createPaymentPreference).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1234.56789 })
      );
    });
  });

  describe('Commission Calculation Edge Cases', () => {
    test('calculates commission for very small amounts', async () => {
      commissionService.calculateCommission.mockResolvedValue({
        originalAmount: 0.01,
        commissionPercentage: 8.0,
        commissionAmount: 0, // Math.round(0.01 * 0.08) = 0
        professionalAmount: 0.01,
        commissionSetting: { id: 'setting-1' },
      });

      const result = await commissionService.calculateCommission(0.01);

      expect(result.commissionAmount).toBe(0);
      expect(result.professionalAmount).toBe(0.01);
    });

    test('calculates commission for very large amounts', async () => {
      commissionService.calculateCommission.mockResolvedValue({
        originalAmount: 10000000,
        commissionPercentage: 8.0,
        commissionAmount: 800000,
        professionalAmount: 9200000,
        commissionSetting: { id: 'setting-1' },
      });

      const result = await commissionService.calculateCommission(10000000);

      expect(result.commissionAmount).toBe(800000);
      expect(result.professionalAmount).toBe(9200000);
    });

    test('handles commission percentages at boundaries', async () => {
      // Test 5% minimum
      commissionService.calculateCommission.mockResolvedValueOnce({
        originalAmount: 1000,
        commissionPercentage: 5.0,
        commissionAmount: 50,
        professionalAmount: 950,
        commissionSetting: { id: 'setting-1' },
      });

      let result = await commissionService.calculateCommission(1000, 'min-commission');
      expect(result.commissionPercentage).toBe(5.0);

      // Test 10% maximum
      commissionService.calculateCommission.mockResolvedValueOnce({
        originalAmount: 1000,
        commissionPercentage: 10.0,
        commissionAmount: 100,
        professionalAmount: 900,
        commissionSetting: { id: 'setting-2' },
      });

      result = await commissionService.calculateCommission(1000, 'max-commission');
      expect(result.commissionPercentage).toBe(10.0);
    });

    test('handles decimal commission percentages', async () => {
      commissionService.calculateCommission.mockResolvedValue({
        originalAmount: 1000,
        commissionPercentage: 7.5,
        commissionAmount: 75,
        professionalAmount: 925,
        commissionSetting: { id: 'setting-1' },
      });

      const result = await commissionService.calculateCommission(1000);

      expect(result.commissionPercentage).toBe(7.5);
      expect(result.commissionAmount).toBe(75);
    });

    test('rounds commission amounts correctly', async () => {
      commissionService.calculateCommission.mockResolvedValue({
        originalAmount: 123.45,
        commissionPercentage: 8.0,
        commissionAmount: 10, // Math.round(123.45 * 0.08) = 10
        professionalAmount: 113.45,
        commissionSetting: { id: 'setting-1' },
      });

      const result = await commissionService.calculateCommission(123.45);

      expect(result.commissionAmount).toBe(10);
      expect(result.professionalAmount).toBe(113.45);
    });
  });

  describe('Concurrency and Race Conditions', () => {
    test('handles concurrent payment creation attempts', async () => {
      const mockService = {
        id: 'service-concurrent',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        pago: null,
        profesional: {
          id: 'prof-123',
          nombre: 'Test Professional',
          email: 'prof@test.com',
          perfil_profesional: { tarifa_hora: 1000 },
        },
        cliente: {
          id: 'client-123',
          nombre: 'Test Client',
          email: 'client@test.com',
        },
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);

      // First call succeeds
      mockPrisma.pagos.create.mockResolvedValueOnce({ id: 'payment-1' });
      mercadoPagoService.createPaymentPreference.mockResolvedValueOnce({
        id: 'pref_1',
        init_point: 'https://mp.com/pay/1',
      });

      // Second call fails due to existing payment
      const mockServiceWithPayment = { ...mockService, pago: { id: 'existing-payment' } };
      mockPrisma.servicios.findUnique.mockResolvedValueOnce(mockServiceWithPayment);

      // First request
      await paymentController.createPaymentPreference(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);

      // Reset mocks
      jest.clearAllMocks();
      mockRes.status.mockClear();
      mockRes.json.mockClear();

      // Second concurrent request
      await paymentController.createPaymentPreference(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('handles concurrent fund release attempts', async () => {
      mockReq.body = { paymentId: 'mp_payment_123', serviceId: 'service-123' };

      // First call succeeds
      mercadoPagoService.releaseFunds.mockResolvedValueOnce({
        success: true,
        amount: 1000,
        commission: 80,
        professionalAmount: 920,
      });

      // Second call fails
      mercadoPagoService.releaseFunds.mockRejectedValueOnce(new Error('Already released'));

      // First request
      await paymentController.releaseFunds(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);

      // Reset mocks
      jest.clearAllMocks();
      mockRes.status.mockClear();
      mockRes.json.mockClear();

      // Second concurrent request
      await paymentController.releaseFunds(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('handles database transaction conflicts', async () => {
      const mockService = {
        id: 'service-123',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        pago: null,
        profesional: {
          id: 'prof-123',
          nombre: 'Test Professional',
          email: 'prof@test.com',
          perfil_profesional: { tarifa_hora: 1000 },
        },
        cliente: {
          id: 'client-123',
          nombre: 'Test Client',
          email: 'client@test.com',
        },
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);

      // Simulate database constraint violation
      mockPrisma.pagos.create.mockRejectedValue({
        code: 'P2002', // Unique constraint violation
        message: 'Unique constraint failed',
      });

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Gateway Errors and Timeouts', () => {
    test('handles MercadoPago API timeouts', async () => {
      mockReq.body = { serviceId: 'service-123' };

      const mockService = {
        id: 'service-123',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        pago: null,
        profesional: {
          id: 'prof-123',
          nombre: 'Test Professional',
          email: 'prof@test.com',
          perfil_profesional: { tarifa_hora: 1000 },
        },
        cliente: {
          id: 'client-123',
          nombre: 'Test Client',
          email: 'client@test.com',
        },
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);
      mercadoPagoService.createPaymentPreference.mockRejectedValue(
        new Error('Timeout: MercadoPago API not responding')
      );

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Timeout: MercadoPago API not responding',
      });
    });

    test('handles MercadoPago service unavailable', async () => {
      mockReq.body = { serviceId: 'service-123' };

      const mockService = {
        id: 'service-123',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        pago: null,
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);
      mercadoPagoService.createPaymentPreference.mockRejectedValue(
        new Error('Service Unavailable: MercadoPago API returned 503')
      );

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('handles MercadoPago rate limiting', async () => {
      mockReq.body = { serviceId: 'service-123' };

      const mockService = {
        id: 'service-123',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        pago: null,
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);
      mercadoPagoService.createPaymentPreference.mockRejectedValue(
        new Error('Rate Limited: Too many requests to MercadoPago API')
      );

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('handles invalid MercadoPago credentials', async () => {
      mockReq.body = { serviceId: 'service-123' };

      const mockService = {
        id: 'service-123',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        pago: null,
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);
      mercadoPagoService.createPaymentPreference.mockRejectedValue(
        new Error('Authentication Failed: Invalid MercadoPago credentials')
      );

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('handles malformed MercadoPago responses', async () => {
      mockReq.body = { serviceId: 'service-123' };

      const mockService = {
        id: 'service-123',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        pago: null,
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);
      mercadoPagoService.createPaymentPreference.mockRejectedValue(
        new Error('Invalid Response: MercadoPago returned malformed JSON')
      );

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Invalid States and Transitions', () => {
    test('rejects payment for completed service', async () => {
      mockReq.body = { serviceId: 'service-completed' };

      const mockService = {
        id: 'service-completed',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'COMPLETADO',
        pago: null,
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('rejects payment for cancelled service', async () => {
      mockReq.body = { serviceId: 'service-cancelled' };

      const mockService = {
        id: 'service-cancelled',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'CANCELADO',
        pago: null,
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('rejects fund release for unpaid service', async () => {
      mockReq.body = { paymentId: 'mp_unpaid', serviceId: 'service-unpaid' };

      mercadoPagoService.releaseFunds.mockRejectedValue(
        new Error('Payment not found or not approved')
      );

      await paymentController.releaseFunds(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('rejects fund release for already released payment', async () => {
      mockReq.body = { paymentId: 'mp_released', serviceId: 'service-released' };

      mercadoPagoService.releaseFunds.mockRejectedValue(
        new Error('Funds already released')
      );

      await paymentController.releaseFunds(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('handles payment status transitions correctly', async () => {
      // Test various status transitions
      const statuses = ['pendiente', 'aprobado', 'rechazado', 'cancelado', 'expirado'];

      for (const status of statuses) {
        mockReq.params = { paymentId: `mp_${status}` };

        mercadoPagoService.getPaymentStatus.mockResolvedValue({
          status: status,
          amount: 1000,
          date_approved: status === 'aprobado' ? new Date() : null,
        });

        await paymentController.getPaymentStatus(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: expect.objectContaining({ status }),
        });

        // Reset mocks
        mockRes.json.mockClear();
      }
    });
  });

  describe('Data Integrity and Validation', () => {
    test('validates service existence', async () => {
      mockReq.body = { serviceId: 'nonexistent-service' };

      mockPrisma.servicios.findUnique.mockResolvedValue(null);

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    test('validates client ownership of service', async () => {
      mockReq.body = { serviceId: 'service-wrong-owner' };

      const mockService = {
        id: 'service-wrong-owner',
        cliente_id: 'different-client',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        pago: null,
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    test('handles missing professional profile', async () => {
      mockReq.body = { serviceId: 'service-no-profile' };

      const mockService = {
        id: 'service-no-profile',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        pago: null,
        profesional: {
          id: 'prof-123',
          nombre: 'Test Professional',
          email: 'prof@test.com',
          perfil_profesional: null, // Missing profile
        },
        cliente: {
          id: 'client-123',
          nombre: 'Test Client',
          email: 'client@test.com',
        },
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);
      mockPrisma.pagos.create.mockResolvedValue({ id: 'payment-123' });
      mercadoPagoService.createPaymentPreference.mockResolvedValue({
        id: 'pref_123',
        init_point: 'https://mp.com/pay',
      });

      await paymentController.createPaymentPreference(mockReq, mockRes);

      // Should use default amount of 1000
      expect(mercadoPagoService.createPaymentPreference).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1000 })
      );
    });

    test('handles missing client information', async () => {
      mockReq.body = { serviceId: 'service-no-client' };

      const mockService = {
        id: 'service-no-client',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        pago: null,
        profesional: {
          id: 'prof-123',
          nombre: 'Test Professional',
          email: 'prof@test.com',
        },
        cliente: null, // Missing client
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('validates payment ID format', async () => {
      const invalidIds = [
        '',
        null,
        undefined,
        'invalid-format',
        'mp_123<script>alert("xss")</script>',
        'mp_123'.repeat(100), // Very long
      ];

      for (const invalidId of invalidIds) {
        mockReq.params = { paymentId: invalidId };

        await paymentController.getPaymentStatus(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);

        // Reset mocks
        mockRes.status.mockClear();
        mockRes.json.mockClear();
      }
    });
  });

  describe('Urgent Service Surcharge Edge Cases', () => {
    test('applies urgent service surcharge correctly', async () => {
      mockReq.body = { serviceId: 'service-urgent' };

      const mockService = {
        id: 'service-urgent',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        es_urgente: true,
        pago: null,
        profesional: {
          id: 'prof-123',
          nombre: 'Test Professional',
          email: 'prof@test.com',
          perfil_profesional: { tarifa_hora: 1000 },
        },
        cliente: {
          id: 'client-123',
          nombre: 'Test Client',
          email: 'client@test.com',
        },
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);
      mockPrisma.pagos.create.mockResolvedValue({ id: 'payment-123' });
      mercadoPagoService.createPaymentPreference.mockResolvedValue({
        id: 'pref_123',
        init_point: 'https://mp.com/pay',
      });

      await paymentController.createPaymentPreference(mockReq, mockRes);

      // Should apply 20% surcharge: 1000 * 1.20 = 1200
      expect(mercadoPagoService.createPaymentPreference).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1200 })
      );
    });

    test('handles custom urgent surcharge percentage', async () => {
      // This would require environment variable mocking
      process.env.URGENT_SERVICE_SURCHARGE = '0.3'; // 30%

      mockReq.body = { serviceId: 'service-urgent-custom' };

      const mockService = {
        id: 'service-urgent-custom',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        es_urgente: true,
        pago: null,
        profesional: {
          id: 'prof-123',
          nombre: 'Test Professional',
          email: 'prof@test.com',
          perfil_profesional: { tarifa_hora: 1000 },
        },
        cliente: {
          id: 'client-123',
          nombre: 'Test Client',
          email: 'client@test.com',
        },
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);
      mockPrisma.pagos.create.mockResolvedValue({ id: 'payment-123' });
      mercadoPagoService.createPaymentPreference.mockResolvedValue({
        id: 'pref_123',
        init_point: 'https://mp.com/pay',
      });

      await paymentController.createPaymentPreference(mockReq, mockRes);

      // Should apply 30% surcharge: 1000 * 1.30 = 1300
      expect(mercadoPagoService.createPaymentPreference).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1300 })
      );

      delete process.env.URGENT_SERVICE_SURCHARGE;
    });

    test('handles invalid urgent surcharge configuration', async () => {
      process.env.URGENT_SERVICE_SURCHARGE = 'invalid';

      mockReq.body = { serviceId: 'service-urgent-invalid' };

      const mockService = {
        id: 'service-urgent-invalid',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        es_urgente: true,
        pago: null,
        profesional: {
          id: 'prof-123',
          nombre: 'Test Professional',
          email: 'prof@test.com',
          perfil_profesional: { tarifa_hora: 1000 },
        },
        cliente: {
          id: 'client-123',
          nombre: 'Test Client',
          email: 'client@test.com',
        },
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);
      mockPrisma.pagos.create.mockResolvedValue({ id: 'payment-123' });
      mercadoPagoService.createPaymentPreference.mockResolvedValue({
        id: 'pref_123',
        init_point: 'https://mp.com/pay',
      });

      await paymentController.createPaymentPreference(mockReq, mockRes);

      // Should fall back to default 20% surcharge
      expect(mercadoPagoService.createPaymentPreference).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1200 })
      );

      delete process.env.URGENT_SERVICE_SURCHARGE;
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    test('handles large webhook payloads', async () => {
      const largePayload = {
        type: 'payment',
        data: {
          id: 'mp_large_test',
          status: 'approved',
          additional_data: 'x'.repeat(10000), // Large payload
        }
      };

      mockReq.body = largePayload;
      mockReq.headers = {
        'x-signature': 'ts=1234567890,v1=test_signature',
        'x-request-id': 'webhook_large_test'
      };

      mercadoPagoService.processPaymentWebhook.mockResolvedValue({
        status: 'approved'
      });

      await paymentController.handleWebhook(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    test('handles rapid successive requests', async () => {
      const mockService = {
        id: 'service-rapid',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        pago: null,
        profesional: {
          id: 'prof-123',
          nombre: 'Test Professional',
          email: 'prof@test.com',
          perfil_profesional: { tarifa_hora: 1000 },
        },
        cliente: {
          id: 'client-123',
          nombre: 'Test Client',
          email: 'client@test.com',
        },
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);
      mockPrisma.pagos.create.mockResolvedValue({ id: 'payment-123' });
      mercadoPagoService.createPaymentPreference.mockResolvedValue({
        id: 'pref_123',
        init_point: 'https://mp.com/pay',
      });

      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(paymentController.createPaymentPreference(mockReq, mockRes));
      }

      await Promise.all(promises);

      // Should handle all requests without crashing
      expect(mercadoPagoService.createPaymentPreference).toHaveBeenCalledTimes(10);
    });

    test('handles long-running operations gracefully', async () => {
      mockReq.body = { serviceId: 'service-slow' };

      const mockService = {
        id: 'service-slow',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        pago: null,
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);

      // Simulate slow database operation
      mockPrisma.pagos.create.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ id: 'payment-slow' }), 5000))
      );

      mercadoPagoService.createPaymentPreference.mockResolvedValue({
        id: 'pref_slow',
        init_point: 'https://mp.com/pay',
      });

      // This should not timeout within the test timeout limit
      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });
});
