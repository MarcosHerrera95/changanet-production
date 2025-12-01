/**
 * Comprehensive unit tests for paymentsService.js
 * Covers: Payment state changes (pending → approved → released),
 * fund releases, automatic releases (24h), withdrawals, and edge cases
 */

const paymentsService = require('../../src/services/paymentsService');
const { PrismaClient } = require('@prisma/client');
const { TestDataFactory } = require('./testData.test');

jest.mock('@prisma/client');
jest.mock('mercadopago');
jest.mock('../../src/services/commissionService');
jest.mock('../../src/services/payoutService');
jest.mock('../../src/services/notificationService');

const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const mockPrisma = {
  servicios: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn()
  },
  usuarios: {
    findUnique: jest.fn()
  },
  pagos: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    aggregate: jest.fn()
  }
};

PrismaClient.mockImplementation(() => mockPrisma);

describe('Payments Service - Unit Tests', () => {
  let testDataFactory;

  beforeEach(() => {
    jest.clearAllMocks();
    testDataFactory = new TestDataFactory();

    // Mock MercadoPago
    const mockPreferenceInstance = {
      create: jest.fn()
    };
    const mockPaymentInstance = {
      update: jest.fn(),
      get: jest.fn()
    };

    Preference.mockImplementation(() => mockPreferenceInstance);
    Payment.mockImplementation(() => mockPaymentInstance);
  });

  describe('createPaymentPreference', () => {
    const validPaymentData = {
      serviceId: 'service-123',
      amount: 1500,
      professionalEmail: 'prof@example.com',
      specialty: 'Plomero',
      clientId: 'client-123'
    };

    test('debe crear preferencia de pago exitosamente con custodia de fondos', async () => {
      const mockService = {
        id: 'service-123',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        profesional: { rol: 'profesional' }
      };

      const mockPreferenceResponse = {
        body: {
          id: 'pref_123',
          init_point: 'https://mercadopago.com/pay',
          sandbox_init_point: 'https://sandbox.mercadopago.com/pay'
        }
      };

      const mockPaymentRecord = {
        id: 'payment-123',
        servicio_id: 'service-123',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        monto_total: 1500,
        comision_plataforma: 0,
        monto_profesional: 1500,
        estado: 'pendiente',
        mercado_pago_id: 'pref_123'
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);
      mockPrisma.usuarios.findUnique.mockResolvedValue({ id: 'client-123' });
      mockPrisma.pagos.create.mockResolvedValue(mockPaymentRecord);
      mockPrisma.pagos.update.mockResolvedValue({ ...mockPaymentRecord, mercado_pago_id: 'pref_123' });

      const mockPreferenceInstance = { create: jest.fn().mockResolvedValue(mockPreferenceResponse) };
      Preference.mockImplementation(() => mockPreferenceInstance);

      const result = await paymentsService.createPaymentPreference(validPaymentData);

      expect(result).toEqual({
        preferenceId: 'pref_123',
        initPoint: 'https://mercadopago.com/pay',
        sandboxInitPoint: 'https://sandbox.mercadopago.com/pay',
        paymentRecordId: 'payment-123'
      });

      // Verify binary_mode for escrow
      const createCall = mockPreferenceInstance.create.mock.calls[0][0];
      expect(createCall.body.binary_mode).toBe(true);
      expect(createCall.body.marketplace_fee).toBeUndefined(); // No commission at creation
    });

    test('debe aplicar recargo por servicio urgente', async () => {
      const mockService = {
        id: 'service-urgent',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        es_urgente: true,
        profesional: { rol: 'profesional' }
      };

      const mockPreferenceResponse = {
        body: {
          id: 'pref_urgent',
          init_point: 'https://mercadopago.com/pay',
          sandbox_init_point: 'https://sandbox.mercadopago.com/pay'
        }
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);
      mockPrisma.usuarios.findUnique.mockResolvedValue({ id: 'client-123' });
      mockPrisma.pagos.create.mockResolvedValue({
        id: 'payment-urgent',
        monto_total: 2000 // 2000 * 1.2 = 2400 with surcharge
      });

      const mockPreferenceInstance = { create: jest.fn().mockResolvedValue(mockPreferenceResponse) };
      Preference.mockImplementation(() => mockPreferenceInstance);

      // Mock process.env.URGENT_SERVICE_SURCHARGE
      const originalEnv = process.env.URGENT_SERVICE_SURCHARGE;
      process.env.URGENT_SERVICE_SURCHARGE = '0.2';

      await paymentsService.createPaymentPreference({
        ...validPaymentData,
        serviceId: 'service-urgent',
        amount: 2000
      });

      const createCall = mockPreferenceInstance.create.mock.calls[0][0];
      expect(createCall.body.items[0].unit_price).toBe(2400); // 2000 * 1.2

      process.env.URGENT_SERVICE_SURCHARGE = originalEnv;
    });

    test('debe validar límites de monto de pago', async () => {
      const mockService = {
        id: 'service-123',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        profesional: { rol: 'profesional' }
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);
      mockPrisma.usuarios.findUnique.mockResolvedValue({ id: 'client-123' });

      // Test minimum amount
      await expect(
        paymentsService.createPaymentPreference({
          ...validPaymentData,
          amount: 200 // Below minimum
        })
      ).rejects.toThrow('El monto mínimo de pago es 500 ARS');

      // Test maximum amount
      await expect(
        paymentsService.createPaymentPreference({
          ...validPaymentData,
          amount: 600000 // Above maximum
        })
      ).rejects.toThrow('El monto máximo de pago es 500000 ARS');
    });

    test('debe rechazar pago para servicio no perteneciente al cliente', async () => {
      const mockService = {
        id: 'service-123',
        cliente_id: 'different-client',
        estado: 'PENDIENTE'
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);

      await expect(
        paymentsService.createPaymentPreference(validPaymentData)
      ).rejects.toThrow('No tienes permiso para crear un pago para este servicio');
    });

    test('debe rechazar pago para servicio no pendiente', async () => {
      const mockService = {
        id: 'service-123',
        cliente_id: 'client-123',
        estado: 'COMPLETADO'
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);
      mockPrisma.usuarios.findUnique.mockResolvedValue({ id: 'client-123' });

      await expect(
        paymentsService.createPaymentPreference(validPaymentData)
      ).rejects.toThrow('El servicio debe estar en estado pendiente para crear un pago');
    });

    test('debe rechazar pago duplicado para el mismo servicio', async () => {
      const mockService = {
        id: 'service-123',
        cliente_id: 'client-123',
        estado: 'PENDIENTE',
        profesional: { rol: 'profesional' },
        pago: { id: 'existing-payment' }
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);
      mockPrisma.usuarios.findUnique.mockResolvedValue({ id: 'client-123' });

      await expect(
        paymentsService.createPaymentPreference(validPaymentData)
      ).rejects.toThrow('Ya existe un pago para este servicio');
    });
  });

  describe('releaseFunds', () => {
    test('debe liberar fondos exitosamente aplicando comisión al completar servicio', async () => {
      const mockService = {
        id: 'service-123',
        cliente_id: 'client-123',
        estado: 'COMPLETADO',
        profesional_id: 'prof-123',
        pago: {
          id: 'payment-123',
          monto_total: 1000,
          estado: 'aprobado'
        }
      };

      const mockCommissionSetting = {
        id: 'commission-1',
        porcentaje: 8.0,
        nombre: 'Global 8%'
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);
      mockPrisma.pagos.update.mockResolvedValue({});
      mockPrisma.servicios.update.mockResolvedValue({});

      // Mock commission service
      const { getApplicableCommission } = require('../../src/services/commissionService');
      getApplicableCommission.mockResolvedValue(mockCommissionSetting);

      // Mock payout service
      const { createPayout } = require('../../src/services/payoutService');
      createPayout.mockResolvedValue({ id: 'payout-123' });

      // Mock notification service
      const { createNotification } = require('../../src/services/notificationService');
      createNotification.mockResolvedValue({});

      const mockPaymentInstance = { update: jest.fn().mockResolvedValue({}) };
      Payment.mockImplementation(() => mockPaymentInstance);

      const result = await paymentsService.releaseFunds('mp_payment_123', 'service-123', 'client-123');

      expect(result).toEqual({
        success: true,
        paymentId: 'mp_payment_123',
        serviceId: 'service-123',
        totalAmount: 1000,
        commission: 80, // 1000 * 0.08
        professionalAmount: 920, // 1000 - 80
        releasedAt: expect.any(Date)
      });

      // Verify commission was applied to MercadoPago
      expect(mockPaymentInstance.update).toHaveBeenCalledWith({
        id: 'mp_payment_123',
        updatePaymentRequest: {
          status: 'approved',
          marketplace_fee: 80
        }
      });

      // Verify payout creation
      expect(createPayout).toHaveBeenCalledWith(
        'prof-123',
        'service-123',
        1000,
        80,
        920,
        'platform_manual_release'
      );
    });

    test('debe rechazar liberación de fondos para servicio no completado', async () => {
      const mockService = {
        id: 'service-123',
        cliente_id: 'client-123',
        estado: 'PENDIENTE',
        pago: { id: 'payment-123' }
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);

      await expect(
        paymentsService.releaseFunds('mp_payment_123', 'service-123', 'client-123')
      ).rejects.toThrow('El servicio debe estar completado para liberar fondos');
    });

    test('debe rechazar liberación de fondos por cliente no autorizado', async () => {
      const mockService = {
        id: 'service-123',
        cliente_id: 'different-client',
        estado: 'COMPLETADO',
        pago: { id: 'payment-123' }
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);

      await expect(
        paymentsService.releaseFunds('mp_payment_123', 'service-123', 'client-123')
      ).rejects.toThrow('No tienes permiso para liberar fondos de este servicio');
    });
  });

  describe('autoReleaseFunds', () => {
    test('debe liberar fondos automáticamente después de 24h de servicios completados', async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const mockServices = [
        {
          id: 'service-24h-1',
          cliente_id: 'client-123',
          profesional_id: 'prof-123',
          estado: 'COMPLETADO',
          completado_en: new Date(twentyFourHoursAgo.getTime() - 60 * 60 * 1000), // 25 hours ago
          pago: {
            id: 'payment-24h-1',
            monto_total: 2000,
            estado: 'aprobado',
            fecha_liberacion: null
          }
        }
      ];

      mockPrisma.servicios.findMany.mockResolvedValue(mockServices);
      mockPrisma.pagos.update.mockResolvedValue({});
      mockPrisma.servicios.update.mockResolvedValue({});

      // Mock commission service
      const { getApplicableCommission } = require('../../src/services/commissionService');
      getApplicableCommission.mockResolvedValue({
        id: 'commission-1',
        porcentaje: 7.0
      });

      // Mock payout service
      const { createPayout } = require('../../src/services/payoutService');
      createPayout.mockResolvedValue({ id: 'auto-payout-1' });

      // Mock notification service
      const { createNotification } = require('../../src/services/notificationService');
      createNotification.mockResolvedValue({});

      const mockPaymentInstance = { update: jest.fn().mockResolvedValue({}) };
      Payment.mockImplementation(() => mockPaymentInstance);

      const result = await paymentsService.autoReleaseFunds();

      expect(result.success).toBe(true);
      expect(result.releasedCount).toBe(1);
      expect(result.processed).toBe(1);

      expect(result.results[0]).toEqual({
        serviceId: 'service-24h-1',
        payoutId: 'auto-payout-1',
        status: 'released',
        totalAmount: 2000,
        commission: 140, // 2000 * 0.07
        professionalAmount: 1860, // 2000 - 140
        commissionRate: 7.0,
        releasedAt: expect.any(Date)
      });

      // Verify payout creation with auto_release method
      expect(createPayout).toHaveBeenCalledWith(
        'prof-123',
        'service-24h-1',
        2000,
        140,
        1860,
        'platform_auto_release'
      );
    });

    test('debe omitir servicios con deadline de escrow pendiente', async () => {
      const futureDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      const mockServices = [
        {
          id: 'service-deadline',
          estado: 'COMPLETADO',
          pago: {
            id: 'payment-deadline',
            estado: 'aprobado',
            escrow_release_deadline: futureDeadline
          }
        }
      ];

      mockPrisma.servicios.findMany.mockResolvedValue(mockServices);

      const result = await paymentsService.autoReleaseFunds();

      expect(result.skippedCount).toBe(1);
      expect(result.results[0].reason).toBe('escrow deadline not reached');
    });

    test('debe manejar errores individuales sin detener el proceso completo', async () => {
      const mockServices = [
        {
          id: 'service-error',
          cliente_id: 'client-123',
          profesional_id: 'prof-123',
          estado: 'COMPLETADO',
          pago: {
            id: 'payment-error',
            monto_total: 1000,
            estado: 'aprobado'
          }
        },
        {
          id: 'service-ok',
          cliente_id: 'client-123',
          profesional_id: 'prof-123',
          estado: 'COMPLETADO',
          pago: {
            id: 'payment-ok',
            monto_total: 1500,
            estado: 'aprobado'
          }
        }
      ];

      mockPrisma.servicios.findMany.mockResolvedValue(mockServices);

      // First service fails
      mockPrisma.pagos.update
        .mockRejectedValueOnce(new Error('DB Error'))
        .mockResolvedValueOnce({});

      mockPrisma.servicios.update.mockResolvedValue({});

      const { getApplicableCommission } = require('../../src/services/commissionService');
      getApplicableCommission.mockResolvedValue({ porcentaje: 8.0 });

      const { createPayout } = require('../../src/services/payoutService');
      createPayout.mockResolvedValue({ id: 'payout-ok' });

      const { createNotification } = require('../../src/services/notificationService');
      createNotification.mockResolvedValue({});

      const mockPaymentInstance = { update: jest.fn().mockResolvedValue({}) };
      Payment.mockImplementation(() => mockPaymentInstance);

      const result = await paymentsService.autoReleaseFunds();

      expect(result.processed).toBe(2);
      expect(result.releasedCount).toBe(1);
      expect(result.errorCount).toBe(1);

      expect(result.results[0].status).toBe('error');
      expect(result.results[1].status).toBe('released');
    });
  });

  describe('withdrawFunds', () => {
    const validWithdrawalData = {
      professionalId: 'prof-123',
      amount: 1000,
      bankDetails: {
        cvu: '1234567890123456789012',
        alias: 'mi.cuenta.banco'
      }
    };

    test('debe procesar retiro exitosamente con validación de datos bancarios', async () => {
      const mockProfessional = {
        id: 'prof-123',
        rol: 'profesional',
        nombre: 'Juan Pérez',
        email: 'juan@example.com'
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockProfessional);

      // Mock calculateAvailableFunds
      paymentsService.calculateAvailableFunds = jest.fn().mockResolvedValue(2000);

      const { createNotification } = require('../../src/services/notificationService');
      createNotification.mockResolvedValue({});

      const result = await paymentsService.withdrawFunds(
        validWithdrawalData.professionalId,
        validWithdrawalData.amount,
        validWithdrawalData.bankDetails
      );

      expect(result.success).toBe(true);
      expect(result.amount).toBe(1000);
      expect(result.withdrawalId).toMatch(/^wd_/);
      expect(result.processedAt).toBeInstanceOf(Date);
      expect(result.estimatedArrival).toBeInstanceOf(Date);
      expect(result.bankDetails.cvuMasked).toBe('***56789012');
    });

    test('debe validar límites de retiro', async () => {
      const mockProfessional = {
        id: 'prof-123',
        rol: 'profesional'
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockProfessional);
      paymentsService.calculateAvailableFunds = jest.fn().mockResolvedValue(10000);

      // Test minimum withdrawal
      await expect(
        paymentsService.withdrawFunds('prof-123', 50, validWithdrawalData.bankDetails)
      ).rejects.toThrow('El monto mínimo de retiro es 100 ARS');

      // Test maximum withdrawal
      await expect(
        paymentsService.withdrawFunds('prof-123', 60000, validWithdrawalData.bankDetails)
      ).rejects.toThrow('El monto máximo de retiro es 50000 ARS');
    });

    test('debe validar formato de CVU', async () => {
      const mockProfessional = {
        id: 'prof-123',
        rol: 'profesional'
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockProfessional);
      paymentsService.calculateAvailableFunds = jest.fn().mockResolvedValue(2000);

      const invalidBankDetails = {
        cvu: '123456789', // Too short
        alias: 'mi.cuenta'
      };

      await expect(
        paymentsService.withdrawFunds('prof-123', 1000, invalidBankDetails)
      ).rejects.toThrow('El CVU debe tener exactamente 22 dígitos');
    });

    test('debe validar alias bancario', async () => {
      const mockProfessional = {
        id: 'prof-123',
        rol: 'profesional'
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockProfessional);
      paymentsService.calculateAvailableFunds = jest.fn().mockResolvedValue(2000);

      const invalidBankDetails = {
        cvu: '1234567890123456789012',
        alias: 'ab' // Too short
      };

      await expect(
        paymentsService.withdrawFunds('prof-123', 1000, invalidBankDetails)
      ).rejects.toThrow('El alias bancario es requerido y debe tener al menos 3 caracteres');
    });

    test('debe rechazar retiro con fondos insuficientes', async () => {
      const mockProfessional = {
        id: 'prof-123',
        rol: 'profesional'
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockProfessional);
      paymentsService.calculateAvailableFunds = jest.fn().mockResolvedValue(500); // Less than requested

      await expect(
        paymentsService.withdrawFunds('prof-123', 1000, validWithdrawalData.bankDetails)
      ).rejects.toThrow('Fondos insuficientes para el retiro solicitado');
    });

    test('debe rechazar retiro para usuarios no profesionales', async () => {
      const mockClient = {
        id: 'client-123',
        rol: 'cliente'
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockClient);

      await expect(
        paymentsService.withdrawFunds('client-123', 1000, validWithdrawalData.bankDetails)
      ).rejects.toThrow('Solo los profesionales pueden retirar fondos');
    });
  });

  describe('calculateAvailableFunds', () => {
    test('debe calcular fondos disponibles correctamente', async () => {
      const mockPayments = [
        { monto_profesional: 1000 },
        { monto_profesional: 1500 },
        { monto_profesional: 800 }
      ];

      mockPrisma.pagos.findMany.mockResolvedValue(mockPayments);

      const result = await paymentsService.calculateAvailableFunds('prof-123');

      expect(result).toBe(3300); // 1000 + 1500 + 800
    });

    test('debe retornar 0 cuando no hay pagos liberados', async () => {
      mockPrisma.pagos.findMany.mockResolvedValue([]);

      const result = await paymentsService.calculateAvailableFunds('prof-123');

      expect(result).toBe(0);
    });

    test('debe manejar errores de base de datos', async () => {
      mockPrisma.pagos.findMany.mockRejectedValue(new Error('DB Error'));

      const result = await paymentsService.calculateAvailableFunds('prof-123');

      expect(result).toBe(0);
    });
  });

  // Edge Cases and Security Tests
  describe('Edge Cases and Security', () => {
    test('debe manejar montos límite en liberación de fondos', async () => {
      const mockService = {
        id: 'service-large',
        cliente_id: 'client-123',
        estado: 'COMPLETADO',
        profesional_id: 'prof-123',
        pago: {
          id: 'payment-large',
          monto_total: 500000, // Maximum allowed
          estado: 'aprobado'
        }
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);
      mockPrisma.pagos.update.mockResolvedValue({});
      mockPrisma.servicios.update.mockResolvedValue({});

      const { getApplicableCommission } = require('../../src/services/commissionService');
      getApplicableCommission.mockResolvedValue({ porcentaje: 10.0 });

      const { createPayout } = require('../../src/services/payoutService');
      createPayout.mockResolvedValue({ id: 'large-payout' });

      const { createNotification } = require('../../src/services/notificationService');
      createNotification.mockResolvedValue({});

      const mockPaymentInstance = { update: jest.fn().mockResolvedValue({}) };
      Payment.mockImplementation(() => mockPaymentInstance);

      const result = await paymentsService.releaseFunds('mp_large', 'service-large', 'client-123');

      expect(result.commission).toBe(50000); // 500,000 * 0.10
      expect(result.professionalAmount).toBe(450000);
    });

    test('debe manejar concurrencia en liberación automática', async () => {
      // Simulate multiple services being processed concurrently
      const mockServices = Array.from({ length: 5 }, (_, i) => ({
        id: `service-concurrent-${i}`,
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'COMPLETADO',
        completado_en: new Date(Date.now() - 25 * 60 * 60 * 1000),
        pago: {
          id: `payment-concurrent-${i}`,
          monto_total: 1000,
          estado: 'aprobado',
          fecha_liberacion: null
        }
      }));

      mockPrisma.servicios.findMany.mockResolvedValue(mockServices);
      mockPrisma.pagos.update.mockResolvedValue({});
      mockPrisma.servicios.update.mockResolvedValue({});

      const { getApplicableCommission } = require('../../src/services/commissionService');
      getApplicableCommission.mockResolvedValue({ porcentaje: 8.0 });

      const { createPayout } = require('../../src/services/payoutService');
      createPayout.mockResolvedValue({ id: 'concurrent-payout' });

      const { createNotification } = require('../../src/services/notificationService');
      createNotification.mockResolvedValue({});

      const mockPaymentInstance = { update: jest.fn().mockResolvedValue({}) };
      Payment.mockImplementation(() => mockPaymentInstance);

      const result = await paymentsService.autoReleaseFunds();

      expect(result.releasedCount).toBe(5);
      expect(createPayout).toHaveBeenCalledTimes(5);
    });

    test('debe validar inyección SQL en IDs de servicio', async () => {
      const maliciousServiceId = "'; DROP TABLE pagos; --";

      mockPrisma.servicios.findUnique.mockResolvedValue(null);

      await expect(
        paymentsService.releaseFunds('mp_123', maliciousServiceId, 'client-123')
      ).rejects.toThrow('Servicio no encontrado');
    });

    test('debe manejar errores de MercadoPago gracefully', async () => {
      const mockService = {
        id: 'service-mp-error',
        cliente_id: 'client-123',
        estado: 'COMPLETADO',
        pago: { id: 'payment-mp-error', monto_total: 1000, estado: 'aprobado' }
      };

      mockPrisma.servicios.findUnique.mockResolvedValue(mockService);

      const mockPaymentInstance = {
        update: jest.fn().mockRejectedValue(new Error('MercadoPago API Error'))
      };
      Payment.mockImplementation(() => mockPaymentInstance);

      await expect(
        paymentsService.releaseFunds('mp_error', 'service-mp-error', 'client-123')
      ).rejects.toThrow('MercadoPago API Error');
    });
  });
});
