/**
 * Comprehensive unit tests for commissionService.js
 * Covers: REQ-43 (5-10% commission range), commission calculations,
 * CRUD operations, validation, and edge cases
 */

const commissionService = require('../../src/services/commissionService');
const { PrismaClient } = require('@prisma/client');
const { TestDataFactory } = require('./testData.test');

jest.mock('@prisma/client');
jest.mock('../../src/services/logger');

const mockPrisma = {
  commission_settings: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn()
  },
  pagos: {
    count: jest.fn(),
    aggregate: jest.fn()
  },
  transactions_log: {
    create: jest.fn()
  }
};

PrismaClient.mockImplementation(() => mockPrisma);

describe('Commission Service - Unit Tests', () => {
  let testDataFactory;

  beforeEach(() => {
    jest.clearAllMocks();
    testDataFactory = new TestDataFactory();
  });

  describe('getCommissionSettings', () => {
    test('debe retornar todas las configuraciones activas ordenadas correctamente', async () => {
      const mockSettings = [
        {
          id: 'global-1',
          nombre: 'Global 8%',
          porcentaje: 8.0,
          tipo_servicio: null,
          activo: true,
          fecha_creacion: new Date('2024-01-01')
        },
        {
          id: 'plumber-1',
          nombre: 'Plomeros 7%',
          porcentaje: 7.0,
          tipo_servicio: 'plomero',
          activo: true,
          fecha_creacion: new Date('2024-01-02')
        }
      ];

      mockPrisma.commission_settings.findMany.mockResolvedValue(mockSettings);

      const result = await commissionService.getCommissionSettings();

      expect(result).toEqual(mockSettings);
      expect(mockPrisma.commission_settings.findMany).toHaveBeenCalledWith({
        where: { activo: true },
        orderBy: [
          { tipo_servicio: 'asc' },
          { fecha_creacion: 'desc' }
        ]
      });
    });

    test('debe manejar errores de base de datos', async () => {
      mockPrisma.commission_settings.findMany.mockRejectedValue(new Error('DB Error'));

      await expect(commissionService.getCommissionSettings()).rejects.toThrow('DB Error');
    });
  });

  describe('getApplicableCommission', () => {
    test('debe retornar configuración específica para tipo de servicio', async () => {
      const mockSetting = {
        id: 'plumber-1',
        nombre: 'Plomeros 7%',
        porcentaje: 7.0,
        tipo_servicio: 'plomero',
        activo: true
      };

      mockPrisma.commission_settings.findFirst
        .mockResolvedValueOnce(mockSetting) // Specific setting
        .mockResolvedValueOnce(null); // No global fallback needed

      const result = await commissionService.getApplicableCommission('plomero');

      expect(result).toEqual(mockSetting);
      expect(mockPrisma.commission_settings.findFirst).toHaveBeenCalledWith({
        where: {
          tipo_servicio: 'plomero',
          activo: true
        },
        orderBy: { fecha_creacion: 'desc' }
      });
    });

    test('debe retornar configuración global cuando no hay específica', async () => {
      const mockGlobalSetting = {
        id: 'global-1',
        nombre: 'Global 8%',
        porcentaje: 8.0,
        tipo_servicio: null,
        activo: true
      };

      mockPrisma.commission_settings.findFirst
        .mockResolvedValueOnce(null) // No specific setting
        .mockResolvedValueOnce(mockGlobalSetting); // Global setting

      const result = await commissionService.getApplicableCommission('electricista');

      expect(result).toEqual(mockGlobalSetting);
    });

    test('debe retornar configuración por defecto cuando no hay ninguna configuración', async () => {
      mockPrisma.commission_settings.findFirst
        .mockResolvedValueOnce(null) // No specific
        .mockResolvedValueOnce(null); // No global

      const result = await commissionService.getApplicableCommission('plomero');

      expect(result).toEqual({
        id: null,
        nombre: 'Comisión por Defecto',
        porcentaje: 5.0,
        tipo_servicio: null,
        descripcion: 'Configuración por defecto del sistema',
        activo: true,
        fecha_creacion: expect.any(Date),
        creado_por: null
      });
    });
  });

  describe('createCommissionSetting', () => {
    const validCommissionData = {
      nombre: 'Nueva Comisión 9%',
      porcentaje: 9.0,
      tipo_servicio: 'electricista',
      descripcion: 'Comisión para electricistas'
    };

    test('debe crear configuración específica exitosamente', async () => {
      const mockCreatedSetting = {
        id: 'new-setting-1',
        ...validCommissionData,
        activo: true,
        creado_por: 'admin-1',
        fecha_creacion: new Date()
      };

      mockPrisma.commission_settings.findFirst.mockResolvedValue(null); // No conflicts
      mockPrisma.commission_settings.create.mockResolvedValue(mockCreatedSetting);
      mockPrisma.transactions_log.create.mockResolvedValue({});

      const result = await commissionService.createCommissionSetting(validCommissionData, 'admin-1');

      expect(result).toEqual(mockCreatedSetting);
      expect(mockPrisma.commission_settings.create).toHaveBeenCalledWith({
        data: {
          nombre: validCommissionData.nombre,
          porcentaje: validCommissionData.porcentaje,
          tipo_servicio: validCommissionData.tipo_servicio,
          descripcion: validCommissionData.descripcion,
          activo: true,
          creado_por: 'admin-1'
        }
      });
    });

    test('debe crear configuración global exitosamente', async () => {
      const globalData = {
        nombre: 'Global 6%',
        porcentaje: 6.0,
        tipo_servicio: null,
        descripcion: 'Configuración global'
      };

      mockPrisma.commission_settings.findFirst.mockResolvedValue(null); // No existing global
      mockPrisma.commission_settings.create.mockResolvedValue({
        id: 'global-new',
        ...globalData,
        activo: true,
        creado_por: 'admin-1'
      });
      mockPrisma.transactions_log.create.mockResolvedValue({});

      const result = await commissionService.createCommissionSetting(globalData, 'admin-1');

      expect(result.tipo_servicio).toBeNull();
    });

    test('REQ-43: debe rechazar porcentaje menor a 5%', async () => {
      const invalidData = { ...validCommissionData, porcentaje: 3.0 };

      await expect(
        commissionService.createCommissionSetting(invalidData, 'admin-1')
      ).rejects.toThrow('El porcentaje de comisión debe estar entre 5% y 10% según requisitos del sistema');
    });

    test('REQ-43: debe rechazar porcentaje mayor a 10%', async () => {
      const invalidData = { ...validCommissionData, porcentaje: 12.0 };

      await expect(
        commissionService.createCommissionSetting(invalidData, 'admin-1')
      ).rejects.toThrow('El porcentaje de comisión debe estar entre 5% y 10% según requisitos del sistema');
    });

    test('debe rechazar porcentaje no numérico', async () => {
      const invalidData = { ...validCommissionData, porcentaje: '8%' };

      await expect(
        commissionService.createCommissionSetting(invalidData, 'admin-1')
      ).rejects.toThrow('Nombre y porcentaje son campos requeridos');
    });

    test('debe rechazar creación sin nombre', async () => {
      const invalidData = { ...validCommissionData, nombre: null };

      await expect(
        commissionService.createCommissionSetting(invalidData, 'admin-1')
      ).rejects.toThrow('Nombre y porcentaje son campos requeridos');
    });

    test('debe rechazar configuración global duplicada', async () => {
      const globalData = {
        nombre: 'Otra Global',
        porcentaje: 7.0,
        tipo_servicio: null
      };

      mockPrisma.commission_settings.findFirst.mockResolvedValue({
        id: 'existing-global',
        activo: true
      });

      await expect(
        commissionService.createCommissionSetting(globalData, 'admin-1')
      ).rejects.toThrow('Ya existe una configuración global de comisión activa. Desactívela primero.');
    });

    test('debe rechazar configuración específica duplicada', async () => {
      const specificData = {
        nombre: 'Plomeros Duplicado',
        porcentaje: 8.0,
        tipo_servicio: 'plomero'
      };

      mockPrisma.commission_settings.findFirst.mockResolvedValue({
        id: 'existing-plumber',
        activo: true
      });

      await expect(
        commissionService.createCommissionSetting(specificData, 'admin-1')
      ).rejects.toThrow('Ya existe una configuración de comisión activa para el tipo de servicio "plomero"');
    });
  });

  describe('updateCommissionSetting', () => {
    test('debe actualizar porcentaje exitosamente', async () => {
      const existingSetting = {
        id: 'setting-1',
        porcentaje: 8.0,
        tipo_servicio: 'plomero'
      };

      const updateData = { porcentaje: 9.0 };

      mockPrisma.commission_settings.findUnique.mockResolvedValue(existingSetting);
      mockPrisma.commission_settings.findFirst.mockResolvedValue(null); // No conflicts
      mockPrisma.commission_settings.update.mockResolvedValue({
        ...existingSetting,
        ...updateData
      });
      mockPrisma.transactions_log.create.mockResolvedValue({});

      const result = await commissionService.updateCommissionSetting('setting-1', updateData, 'admin-1');

      expect(result.porcentaje).toBe(9.0);
    });

    test('debe rechazar porcentaje inválido en actualización', async () => {
      const existingSetting = {
        id: 'setting-1',
        porcentaje: 8.0,
        tipo_servicio: 'plomero'
      };

      mockPrisma.commission_settings.findUnique.mockResolvedValue(existingSetting);

      await expect(
        commissionService.updateCommissionSetting('setting-1', { porcentaje: 15.0 }, 'admin-1')
      ).rejects.toThrow('El porcentaje de comisión debe estar entre 5% y 10%');
    });

    test('debe rechazar configuración no encontrada', async () => {
      mockPrisma.commission_settings.findUnique.mockResolvedValue(null);

      await expect(
        commissionService.updateCommissionSetting('nonexistent', { porcentaje: 7.0 }, 'admin-1')
      ).rejects.toThrow('Configuración de comisión no encontrada');
    });

    test('debe manejar cambio de tipo_servicio con validación de conflictos', async () => {
      const existingSetting = {
        id: 'setting-1',
        porcentaje: 8.0,
        tipo_servicio: null // Era global
      };

      mockPrisma.commission_settings.findUnique.mockResolvedValue(existingSetting);
      mockPrisma.commission_settings.findFirst.mockResolvedValue(null); // No conflicts
      mockPrisma.commission_settings.update.mockResolvedValue({
        ...existingSetting,
        tipo_servicio: 'plomero'
      });
      mockPrisma.transactions_log.create.mockResolvedValue({});

      const result = await commissionService.updateCommissionSetting(
        'setting-1',
        { tipo_servicio: 'plomero' },
        'admin-1'
      );

      expect(result.tipo_servicio).toBe('plomero');
    });
  });

  describe('deactivateCommissionSetting', () => {
    test('debe desactivar configuración exitosamente', async () => {
      const existingSetting = {
        id: 'setting-1',
        nombre: 'Test Setting',
        porcentaje: 8.0,
        tipo_servicio: 'plomero',
        activo: true
      };

      mockPrisma.commission_settings.findUnique.mockResolvedValue(existingSetting);
      mockPrisma.commission_settings.count.mockResolvedValue(1); // Hay otras globales
      mockPrisma.commission_settings.update.mockResolvedValue({
        ...existingSetting,
        activo: false
      });
      mockPrisma.transactions_log.create.mockResolvedValue({});

      const result = await commissionService.deactivateCommissionSetting('setting-1', 'admin-1');

      expect(result).toBe(true);
      expect(mockPrisma.commission_settings.update).toHaveBeenCalledWith({
        where: { id: 'setting-1' },
        data: { activo: false }
      });
    });

    test('debe rechazar desactivar la última configuración global', async () => {
      const globalSetting = {
        id: 'global-1',
        tipo_servicio: null,
        activo: true
      };

      mockPrisma.commission_settings.findUnique.mockResolvedValue(globalSetting);
      mockPrisma.commission_settings.count.mockResolvedValue(0); // No hay otras globales

      await expect(
        commissionService.deactivateCommissionSetting('global-1', 'admin-1')
      ).rejects.toThrow('No se puede desactivar la última configuración global de comisión');
    });

    test('debe rechazar desactivar configuración ya inactiva', async () => {
      const inactiveSetting = {
        id: 'setting-1',
        activo: false
      };

      mockPrisma.commission_settings.findUnique.mockResolvedValue(inactiveSetting);

      await expect(
        commissionService.deactivateCommissionSetting('setting-1', 'admin-1')
      ).rejects.toThrow('La configuración ya está desactivada');
    });
  });

  describe('calculateCommission', () => {
    test('debe calcular comisión correctamente con configuración específica', async () => {
      const mockCommissionSetting = {
        id: 'setting-1',
        nombre: 'Plomeros 7%',
        porcentaje: 7.0,
        tipo_servicio: 'plomero'
      };

      mockPrisma.commission_settings.findFirst
        .mockResolvedValueOnce(mockCommissionSetting) // Specific setting
        .mockResolvedValueOnce(null); // No fallback needed

      const result = await commissionService.calculateCommission(1000, 'plomero');

      expect(result).toEqual({
        originalAmount: 1000,
        commissionPercentage: 7.0,
        commissionAmount: 70, // 1000 * 0.07
        professionalAmount: 930, // 1000 - 70
        commissionSetting: {
          id: 'setting-1',
          nombre: 'Plomeros 7%',
          tipo_servicio: 'plomero'
        }
      });
    });

    test('debe calcular comisión con redondeo correcto', async () => {
      const mockCommissionSetting = {
        id: 'setting-1',
        porcentaje: 8.5,
        tipo_servicio: null
      };

      mockPrisma.commission_settings.findFirst
        .mockResolvedValueOnce(null) // No specific
        .mockResolvedValueOnce(mockCommissionSetting); // Global

      const result = await commissionService.calculateCommission(1234.56);

      expect(result.commissionAmount).toBe(105); // Math.round(1234.56 * 0.085) = 105
      expect(result.professionalAmount).toBe(1129.56); // 1234.56 - 105
    });

    test('debe usar configuración por defecto cuando no hay configuraciones', async () => {
      mockPrisma.commission_settings.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await commissionService.calculateCommission(2000);

      expect(result.commissionPercentage).toBe(5.0); // Default 5%
      expect(result.commissionAmount).toBe(100); // 2000 * 0.05
      expect(result.professionalAmount).toBe(1900);
    });

    test('debe manejar errores de base de datos', async () => {
      mockPrisma.commission_settings.findFirst.mockRejectedValue(new Error('DB Error'));

      await expect(commissionService.calculateCommission(1000)).rejects.toThrow('DB Error');
    });
  });

  describe('getCommissionStats', () => {
    test('debe retornar estadísticas completas de comisiones', async () => {
      mockPrisma.pagos.count.mockResolvedValue(10);
      mockPrisma.pagos.aggregate
        .mockResolvedValueOnce({ _sum: { comision_plataforma: 500 } }) // Commission sum
        .mockResolvedValueOnce({ _sum: { monto_profesional: 4500 } }); // Professional payments sum
      mockPrisma.commission_settings.count.mockResolvedValue(3);

      const result = await commissionService.getCommissionStats();

      expect(result).toEqual({
        totalPayments: 10,
        totalCommission: 500,
        totalProfessionalPayments: 4500,
        activeCommissionSettings: 3,
        averageCommissionRate: 10 // (500 / (500 + 4500)) * 100
      });
    });

    test('debe manejar caso sin pagos', async () => {
      mockPrisma.pagos.count.mockResolvedValue(0);
      mockPrisma.pagos.aggregate
        .mockResolvedValueOnce({ _sum: { comision_plataforma: null } })
        .mockResolvedValueOnce({ _sum: { monto_profesional: null } });
      mockPrisma.commission_settings.count.mockResolvedValue(1);

      const result = await commissionService.getCommissionStats();

      expect(result).toEqual({
        totalPayments: 0,
        totalCommission: 0,
        totalProfessionalPayments: 0,
        activeCommissionSettings: 1,
        averageCommissionRate: 0
      });
    });
  });

  // Edge Cases and Security Tests
  describe('Edge Cases and Security', () => {
    test('debe manejar montos límite para cálculo de comisión', async () => {
      const mockCommissionSetting = {
        id: 'setting-1',
        porcentaje: 10.0,
        tipo_servicio: null
      };

      mockPrisma.commission_settings.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockCommissionSetting);

      // Test with very large amount
      const result = await commissionService.calculateCommission(1000000);

      expect(result.commissionAmount).toBe(100000); // 1,000,000 * 0.10
      expect(result.professionalAmount).toBe(900000);
    });

    test('debe manejar montos decimales correctamente', async () => {
      const mockCommissionSetting = {
        id: 'setting-1',
        porcentaje: 5.5,
        tipo_servicio: null
      };

      mockPrisma.commission_settings.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockCommissionSetting);

      const result = await commissionService.calculateCommission(99.99);

      expect(result.commissionAmount).toBe(5); // Math.round(99.99 * 0.055) = 5
      expect(result.professionalAmount).toBe(94.99);
    });

    test('debe validar inyección SQL en tipo_servicio', async () => {
      const maliciousServiceType = "'; DROP TABLE commission_settings; --";

      mockPrisma.commission_settings.findFirst.mockResolvedValue(null);

      // Should not throw SQL injection error, should handle as normal string
      const result = await commissionService.getApplicableCommission(maliciousServiceType);

      expect(result.porcentaje).toBe(5.0); // Default
    });

    test('debe manejar concurrencia en creación de configuraciones', async () => {
      // Simulate race condition where another global setting is created between checks
      mockPrisma.commission_settings.findFirst
        .mockResolvedValueOnce(null) // First check - no global
        .mockResolvedValueOnce({ id: 'concurrent-global', activo: true }); // Second check - concurrent creation

      const globalData = {
        nombre: 'Global Concurrent',
        porcentaje: 6.0,
        tipo_servicio: null
      };

      await expect(
        commissionService.createCommissionSetting(globalData, 'admin-1')
      ).rejects.toThrow('Ya existe una configuración global de comisión activa');
    });
  });
});
