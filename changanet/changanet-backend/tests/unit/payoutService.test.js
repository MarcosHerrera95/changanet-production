/**
 * Comprehensive unit tests for payoutService.js
 * Covers: Payout creation, processing, retrieval, statistics, and edge cases
 */

const payoutService = require('../../src/services/payoutService');
const { PrismaClient } = require('@prisma/client');
const { TestDataFactory } = require('./testData.test');

jest.mock('@prisma/client');
jest.mock('../../src/services/notificationService');

const mockPrisma = {
  payouts: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn()
  },
  usuarios: {
    findUnique: jest.fn()
  },
  transactions_log: {
    create: jest.fn()
  }
};

PrismaClient.mockImplementation(() => mockPrisma);

describe('Payout Service - Unit Tests', () => {
  let testDataFactory;

  beforeEach(() => {
    jest.clearAllMocks();
    testDataFactory = new TestDataFactory();
  });

  describe('createPayout', () => {
    const validPayoutData = {
      professionalId: 'prof-123',
      serviceId: 'service-123',
      grossAmount: 1000,
      commissionAmount: 80,
      netAmount: 920,
      paymentMethod: 'bank_transfer'
    };

    test('debe crear payout exitosamente con validación de montos', async () => {
      const mockProfessional = {
        id: 'prof-123',
        rol: 'profesional',
        nombre: 'Juan Pérez',
        email: 'juan@example.com'
      };

      const mockPayout = {
        id: 'payout-123',
        profesional_id: 'prof-123',
        servicio_id: 'service-123',
        monto_bruto: 1000,
        comision_plataforma: 80,
        monto_neto: 920,
        metodo_pago: 'bank_transfer',
        estado: 'pendiente',
        creado_en: new Date(),
        profesional: {
          nombre: 'Juan Pérez',
          email: 'juan@example.com'
        },
        servicio: {
          descripcion: 'Servicio de plomería',
          cliente: {
            nombre: 'Cliente Test'
          }
        }
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockProfessional);
      mockPrisma.payouts.create.mockResolvedValue(mockPayout);
      mockPrisma.transactions_log.create.mockResolvedValue({});

      const result = await payoutService.createPayout(
        validPayoutData.professionalId,
        validPayoutData.serviceId,
        validPayoutData.grossAmount,
        validPayoutData.commissionAmount,
        validPayoutData.netAmount,
        validPayoutData.paymentMethod
      );

      expect(result).toEqual(mockPayout);
      expect(mockPrisma.payouts.create).toHaveBeenCalledWith({
        data: {
          profesional_id: 'prof-123',
          servicio_id: 'service-123',
          monto_bruto: 1000,
          comision_plataforma: 80,
          monto_neto: 920,
          metodo_pago: 'bank_transfer',
          estado: 'pendiente'
        },
        include: {
          profesional: {
            select: {
              nombre: true,
              email: true
            }
          },
          servicio: {
            select: {
              descripcion: true,
              cliente: {
                select: {
                  nombre: true
                }
              }
            }
          }
        }
      });
    });

    test('debe validar que el usuario sea profesional', async () => {
      const mockClient = {
        id: 'client-123',
        rol: 'cliente'
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockClient);

      await expect(
        payoutService.createPayout(
          'client-123',
          validPayoutData.serviceId,
          validPayoutData.grossAmount,
          validPayoutData.commissionAmount,
          validPayoutData.netAmount
        )
      ).rejects.toThrow('Solo se pueden crear payouts para profesionales');
    });

    test('debe validar que los montos sean positivos', async () => {
      const mockProfessional = {
        id: 'prof-123',
        rol: 'profesional'
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockProfessional);

      // Test negative gross amount
      await expect(
        payoutService.createPayout(
          'prof-123',
          'service-123',
          -1000,
          80,
          920
        )
      ).rejects.toThrow('Los montos deben ser positivos');

      // Test zero commission
      await expect(
        payoutService.createPayout(
          'prof-123',
          'service-123',
          1000,
          -80,
          920
        )
      ).rejects.toThrow('Los montos deben ser positivos');

      // Test zero net amount
      await expect(
        payoutService.createPayout(
          'prof-123',
          'service-123',
          1000,
          80,
          0
        )
      ).rejects.toThrow('Los montos deben ser positivos');
    });

    test('debe validar consistencia de montos (net = gross - commission)', async () => {
      const mockProfessional = {
        id: 'prof-123',
        rol: 'profesional'
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockProfessional);

      await expect(
        payoutService.createPayout(
          'prof-123',
          'service-123',
          1000,
          80,
          950 // Should be 920 (1000 - 80)
        )
      ).rejects.toThrow('El monto neto debe ser igual al monto bruto menos la comisión');
    });

    test('debe usar método de pago por defecto', async () => {
      const mockProfessional = {
        id: 'prof-123',
        rol: 'profesional'
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockProfessional);
      mockPrisma.payouts.create.mockResolvedValue({
        id: 'payout-default',
        metodo_pago: 'bank_transfer'
      });
      mockPrisma.transactions_log.create.mockResolvedValue({});

      await payoutService.createPayout(
        'prof-123',
        'service-123',
        1000,
        80,
        920
        // No paymentMethod provided
      );

      expect(mockPrisma.payouts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metodo_pago: 'bank_transfer'
          })
        })
      );
    });
  });

  describe('processPayout', () => {
    test('debe procesar payout exitosamente y enviar notificación', async () => {
      const mockPayout = {
        id: 'payout-123',
        profesional_id: 'prof-123',
        monto_neto: 920,
        estado: 'pendiente',
        servicio_id: 'service-123',
        profesional: {
          nombre: 'Juan Pérez',
          email: 'juan@example.com'
        },
        servicio: {
          descripcion: 'Servicio de plomería'
        }
      };

      const mockProcessedPayout = {
        ...mockPayout,
        estado: 'completado',
        referencia_pago: 'REF123456',
        fecha_pago: new Date(),
        procesado_en: new Date()
      };

      mockPrisma.payouts.findUnique.mockResolvedValue(mockPayout);
      mockPrisma.payouts.update.mockResolvedValue(mockProcessedPayout);
      mockPrisma.transactions_log.create.mockResolvedValue({});

      const { createNotification } = require('../../src/services/notificationService');
      createNotification.mockResolvedValue({});

      const result = await payoutService.processPayout('payout-123', 'admin-123', 'REF123456');

      expect(result).toEqual(mockProcessedPayout);
      expect(mockPrisma.payouts.update).toHaveBeenCalledWith({
        where: { id: 'payout-123' },
        data: {
          estado: 'completado',
          referencia_pago: 'REF123456',
          fecha_pago: expect.any(Date),
          procesado_en: expect.any(Date)
        },
        include: expect.any(Object)
      });

      // Verify notification was sent
      expect(createNotification).toHaveBeenCalledWith(
        'prof-123',
        'pago_recibido',
        'Has recibido un pago de 920 ARS. Referencia: REF123456',
        {
          payoutId: 'payout-123',
          amount: 920,
          reference: 'REF123456',
          serviceId: 'service-123'
        }
      );
    });

    test('debe procesar payout sin referencia opcional', async () => {
      const mockPayout = {
        id: 'payout-123',
        profesional_id: 'prof-123',
        monto_neto: 920,
        estado: 'pendiente',
        profesional: { nombre: 'Juan Pérez' }
      };

      mockPrisma.payouts.findUnique.mockResolvedValue(mockPayout);
      mockPrisma.payouts.update.mockResolvedValue({
        ...mockPayout,
        estado: 'completado'
      });
      mockPrisma.transactions_log.create.mockResolvedValue({});

      const { createNotification } = require('../../src/services/notificationService');
      createNotification.mockResolvedValue({});

      await payoutService.processPayout('payout-123', 'admin-123');

      expect(createNotification).toHaveBeenCalledWith(
        'prof-123',
        'pago_recibido',
        'Has recibido un pago de 920 ARS. ',
        expect.objectContaining({
          reference: undefined
        })
      );
    });

    test('debe rechazar procesamiento de payout no encontrado', async () => {
      mockPrisma.payouts.findUnique.mockResolvedValue(null);

      await expect(
        payoutService.processPayout('nonexistent', 'admin-123')
      ).rejects.toThrow('Payout no encontrado');
    });

    test('debe rechazar procesamiento de payout ya completado', async () => {
      const mockCompletedPayout = {
        id: 'payout-123',
        estado: 'completado'
      };

      mockPrisma.payouts.findUnique.mockResolvedValue(mockCompletedPayout);

      await expect(
        payoutService.processPayout('payout-123', 'admin-123')
      ).rejects.toThrow('El payout ya ha sido procesado');
    });
  });

  describe('getPayouts', () => {
    test('debe retornar payouts de un profesional con filtros', async () => {
      const mockPayouts = [
        {
          id: 'payout-1',
          monto_neto: 920,
          estado: 'completado',
          fecha_pago: new Date('2024-01-15'),
          servicio: {
            descripcion: 'Servicio 1',
            cliente: { nombre: 'Cliente 1' }
          }
        },
        {
          id: 'payout-2',
          monto_neto: 1500,
          estado: 'pendiente',
          servicio: {
            descripcion: 'Servicio 2',
            cliente: { nombre: 'Cliente 2' }
          }
        }
      ];

      mockPrisma.payouts.findMany.mockResolvedValue(mockPayouts);

      const result = await payoutService.getPayouts('prof-123', {
        status: 'completado',
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31'
      });

      expect(result).toEqual(mockPayouts);
      expect(mockPrisma.payouts.findMany).toHaveBeenCalledWith({
        where: {
          profesional_id: 'prof-123',
          estado: 'completado',
          fecha_pago: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31')
          }
        },
        include: {
          servicio: {
            select: {
              descripcion: true,
              cliente: {
                select: {
                  nombre: true
                }
              }
            }
          }
        },
        orderBy: { creado_en: 'desc' }
      });
    });

    test('debe aplicar filtro por serviceId', async () => {
      mockPrisma.payouts.findMany.mockResolvedValue([]);

      await payoutService.getPayouts('prof-123', {
        serviceId: 'service-123'
      });

      expect(mockPrisma.payouts.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            servicio_id: 'service-123'
          })
        })
      );
    });

    test('debe retornar payouts sin filtros opcionales', async () => {
      mockPrisma.payouts.findMany.mockResolvedValue([]);

      await payoutService.getPayouts('prof-123');

      expect(mockPrisma.payouts.findMany).toHaveBeenCalledWith({
        where: { profesional_id: 'prof-123' },
        include: expect.any(Object),
        orderBy: { creado_en: 'desc' }
      });
    });
  });

  describe('getPayoutById', () => {
    test('debe retornar payout específico con verificación de propietario', async () => {
      const mockPayout = {
        id: 'payout-123',
        profesional_id: 'prof-123',
        monto_neto: 920,
        servicio: {
          descripcion: 'Servicio test',
          cliente: { nombre: 'Cliente Test' }
        }
      };

      mockPrisma.payouts.findFirst.mockResolvedValue(mockPayout);

      const result = await payoutService.getPayoutById('payout-123', 'prof-123');

      expect(result).toEqual(mockPayout);
      expect(mockPrisma.payouts.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'payout-123',
          profesional_id: 'prof-123'
        },
        include: {
          servicio: {
            select: {
              descripcion: true,
              cliente: {
                select: {
                  nombre: true
                }
              }
            }
          }
        }
      });
    });

    test('debe rechazar acceso a payout de otro profesional', async () => {
      mockPrisma.payouts.findFirst.mockResolvedValue(null);

      await expect(
        payoutService.getPayoutById('payout-123', 'prof-123')
      ).rejects.toThrow('Payout no encontrado');
    });
  });

  describe('getPendingPayouts', () => {
    test('debe retornar todos los payouts pendientes para admins', async () => {
      const mockPendingPayouts = [
        {
          id: 'payout-1',
          estado: 'pendiente',
          monto_neto: 920,
          profesional: {
            id: 'prof-1',
            nombre: 'Juan Pérez',
            email: 'juan@example.com'
          },
          servicio: {
            descripcion: 'Servicio 1',
            cliente: { nombre: 'Cliente 1' }
          }
        }
      ];

      mockPrisma.payouts.findMany.mockResolvedValue(mockPendingPayouts);

      const result = await payoutService.getPendingPayouts();

      expect(result).toEqual(mockPendingPayouts);
      expect(mockPrisma.payouts.findMany).toHaveBeenCalledWith({
        where: { estado: 'pendiente' },
        include: {
          profesional: {
            select: {
              id: true,
              nombre: true,
              email: true
            }
          },
          servicio: {
            select: {
              descripcion: true,
              cliente: {
                select: {
                  nombre: true
                }
              }
            }
          }
        },
        orderBy: { creado_en: 'asc' }
      });
    });
  });

  describe('getPayoutStats', () => {
    test('debe calcular estadísticas completas de payouts', async () => {
      mockPrisma.payouts.count
        .mockResolvedValueOnce(5) // Completed payouts
        .mockResolvedValueOnce(2); // Pending payouts

      mockPrisma.payouts.aggregate.mockResolvedValue({
        _sum: {
          monto_neto: 10000,
          comision_plataforma: 800
        }
      });

      mockPrisma.payouts.findFirst.mockResolvedValue({
        fecha_pago: new Date('2024-01-15'),
        monto_neto: 2000
      });

      const result = await payoutService.getPayoutStats('prof-123');

      expect(result).toEqual({
        totalPayouts: 5,
        totalPaid: 10000,
        totalCommission: 800,
        pendingPayouts: 2,
        latestPayout: {
          date: expect.any(Date),
          amount: 2000
        },
        averagePayout: 2000 // 10000 / 5
      });
    });

    test('debe manejar caso sin payouts completados', async () => {
      mockPrisma.payouts.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

      mockPrisma.payouts.aggregate.mockResolvedValue({
        _sum: { monto_neto: null, comision_plataforma: null }
      });

      mockPrisma.payouts.findFirst.mockResolvedValue(null);

      const result = await payoutService.getPayoutStats('prof-123');

      expect(result).toEqual({
        totalPayouts: 0,
        totalPaid: 0,
        totalCommission: 0,
        pendingPayouts: 1,
        latestPayout: null,
        averagePayout: 0
      });
    });
  });

  describe('getGlobalPayoutStats', () => {
    test('debe retornar estadísticas globales para admins', async () => {
      mockPrisma.payouts.count
        .mockResolvedValueOnce(10) // Total completed
        .mockResolvedValueOnce(3) // Pending
        .mockResolvedValueOnce(1); // Failed

      mockPrisma.payouts.aggregate.mockResolvedValue({
        _sum: {
          monto_neto: 25000,
          comision_plataforma: 2000
        }
      });

      const result = await payoutService.getGlobalPayoutStats();

      expect(result).toEqual({
        totalCompleted: 10,
        totalPaid: 25000,
        totalCommission: 2000,
        pendingCount: 3,
        failedCount: 1,
        averagePayout: 2500 // 25000 / 10
      });
    });
  });

  // Edge Cases and Security Tests
  describe('Edge Cases and Security', () => {
    test('debe manejar montos límite en creación de payouts', async () => {
      const mockProfessional = {
        id: 'prof-123',
        rol: 'profesional'
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockProfessional);
      mockPrisma.payouts.create.mockResolvedValue({
        id: 'large-payout',
        monto_bruto: 1000000,
        monto_neto: 900000
      });
      mockPrisma.transactions_log.create.mockResolvedValue({});

      await payoutService.createPayout(
        'prof-123',
        'service-123',
        1000000, // Large amount
        100000,
        900000
      );

      expect(mockPrisma.payouts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            monto_bruto: 1000000,
            monto_neto: 900000
          })
        })
      );
    });

    test('debe validar inyección SQL en IDs', async () => {
      const maliciousId = "'; DROP TABLE payouts; --";

      mockPrisma.payouts.findUnique.mockResolvedValue(null);

      await expect(
        payoutService.processPayout(maliciousId, 'admin-123')
      ).rejects.toThrow('Payout no encontrado');
    });

    test('debe manejar concurrencia en procesamiento de payouts', async () => {
      // Simulate concurrent processing attempts
      const mockPayout = {
        id: 'payout-concurrent',
        estado: 'pendiente',
        profesional: { nombre: 'Test' }
      };

      mockPrisma.payouts.findUnique.mockResolvedValue(mockPayout);
      mockPrisma.payouts.update.mockRejectedValueOnce(
        new Error('Unique constraint violation') // Simulate concurrent update
      );

      await expect(
        payoutService.processPayout('payout-concurrent', 'admin-123')
      ).rejects.toThrow('Unique constraint violation');
    });

    test('debe manejar errores de notificación gracefully', async () => {
      const mockPayout = {
        id: 'payout-notification-error',
        profesional_id: 'prof-123',
        monto_neto: 920,
        estado: 'pendiente',
        profesional: { nombre: 'Juan Pérez' }
      };

      mockPrisma.payouts.findUnique.mockResolvedValue(mockPayout);
      mockPrisma.payouts.update.mockResolvedValue({
        ...mockPayout,
        estado: 'completado'
      });
      mockPrisma.transactions_log.create.mockResolvedValue({});

      const { createNotification } = require('../../src/services/notificationService');
      createNotification.mockRejectedValue(new Error('Notification service error'));

      // Should not throw, should log error but complete payout
      const result = await payoutService.processPayout('payout-notification-error', 'admin-123');

      expect(result.estado).toBe('completado');
      expect(createNotification).toHaveBeenCalled();
    });

    test('debe validar formato de fechas en filtros', async () => {
      mockPrisma.payouts.findMany.mockResolvedValue([]);

      await payoutService.getPayouts('prof-123', {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31'
      });

      const call = mockPrisma.payouts.findMany.mock.calls[0][0];
      expect(call.where.fecha_pago.gte).toBeInstanceOf(Date);
      expect(call.where.fecha_pago.lte).toBeInstanceOf(Date);
    });
  });
});
