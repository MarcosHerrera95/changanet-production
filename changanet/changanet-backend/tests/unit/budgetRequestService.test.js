/**
 * Pruebas unitarias para budgetRequestService.js
 * Cubre: REQ-31, REQ-32, REQ-33, REQ-34, REQ-35 (Solicitud de Presupuestos)
 * Incluye pruebas de expiración automática y lógica de negocio
 */

const { PrismaClient } = require('@prisma/client');

// Mock de Prisma
jest.mock('@prisma/client');
jest.mock('../../src/services/notificationService');

const mockPrisma = {
  cotizaciones: {
    count: jest.fn(),
  },
  cotizacion_respuestas: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
};

PrismaClient.mockImplementation(() => mockPrisma);

// Mock del servicio de notificaciones
const mockCreateNotification = jest.fn();
jest.mock('../../src/services/notificationService', () => ({
  createNotification: mockCreateNotification,
}));

const {
  checkAndExpireBudgetRequests,
  getExpirationDate,
  isExpired,
  startExpirationScheduler,
  getExpirationStats,
  EXPIRATION_DAYS
} = require('../../src/services/budgetRequestService');

describe('Budget Request Service - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Expiration Logic', () => {
    test('debe calcular fecha de expiración correctamente', () => {
      const createdDate = new Date('2025-01-01T10:00:00Z');
      const expectedExpiration = new Date('2025-01-08T10:00:00Z'); // 7 días después

      const result = getExpirationDate(createdDate);

      expect(result).toEqual(expectedExpiration);
      expect(EXPIRATION_DAYS).toBe(7);
    });

    test('debe usar fecha actual si no se proporciona createdDate', () => {
      const now = new Date('2025-01-01T10:00:00Z');
      jest.setSystemTime(now);

      const result = getExpirationDate();
      const expected = new Date('2025-01-08T10:00:00Z');

      expect(result).toEqual(expected);
    });

    test('debe detectar solicitud expirada correctamente', () => {
      const expiredDate = new Date('2025-01-01T10:00:00Z'); // Hace 7 días
      const currentDate = new Date('2025-01-10T10:00:00Z'); // Ahora
      jest.setSystemTime(currentDate);

      const result = isExpired(expiredDate);
      expect(result).toBe(true);
    });

    test('debe detectar solicitud no expirada correctamente', () => {
      const recentDate = new Date('2025-01-05T10:00:00Z'); // Hace 2 días
      const currentDate = new Date('2025-01-06T10:00:00Z'); // Ahora
      jest.setSystemTime(currentDate);

      const result = isExpired(recentDate);
      expect(result).toBe(false);
    });
  });

  describe('checkAndExpireBudgetRequests', () => {
    test('debe expirar solicitudes correctamente cuando hay respuestas pendientes', async () => {
      const mockExpiredResponses = [
        {
          id: 'response-1',
          cotizacion: {
            id: 'quote-1',
            descripcion: 'Test quote',
            cliente: { id: 'client-1', nombre: 'Client One', email: 'client1@test.com' }
          },
          profesional: { id: 'prof-1', nombre: 'Professional One', email: 'prof1@test.com' }
        }
      ];

      mockPrisma.cotizacion_respuestas.findMany.mockResolvedValue(mockExpiredResponses);
      mockPrisma.cotizacion_respuestas.updateMany.mockResolvedValue({ count: 1 });
      mockCreateNotification.mockResolvedValue();

      const currentDate = new Date('2025-01-10T10:00:00Z');
      jest.setSystemTime(currentDate);

      await checkAndExpireBudgetRequests();

      expect(mockPrisma.cotizacion_respuestas.findMany).toHaveBeenCalledWith({
        where: {
          estado: 'PENDIENTE',
          cotizacion: {
            creado_en: {
              lt: expect.any(Date)
            }
          }
        },
        include: expect.any(Object)
      });

      expect(mockPrisma.cotizacion_respuestas.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['response-1'] }
        },
        data: {
          estado: 'EXPIRADO',
          comentario: 'Solicitud expirada automáticamente'
        }
      });

      expect(mockCreateNotification).toHaveBeenCalledWith(
        'client-1',
        'solicitud_expirada',
        'Tu solicitud de presupuesto "Test quote..." ha expirado',
        { requestId: 'quote-1' }
      );
    });

    test('no debe hacer nada cuando no hay solicitudes expiradas', async () => {
      mockPrisma.cotizacion_respuestas.findMany.mockResolvedValue([]);

      await checkAndExpireBudgetRequests();

      expect(mockPrisma.cotizacion_respuestas.updateMany).not.toHaveBeenCalled();
      expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    test('debe manejar errores de notificación gracefully', async () => {
      const mockExpiredResponses = [
        {
          id: 'response-1',
          cotizacion: {
            id: 'quote-1',
            descripcion: 'Test quote',
            cliente: { id: 'client-1', nombre: 'Client One', email: 'client1@test.com' }
          },
          profesional: { id: 'prof-1', nombre: 'Professional One', email: 'prof1@test.com' }
        }
      ];

      mockPrisma.cotizacion_respuestas.findMany.mockResolvedValue(mockExpiredResponses);
      mockPrisma.cotizacion_respuestas.updateMany.mockResolvedValue({ count: 1 });
      mockCreateNotification.mockRejectedValue(new Error('Notification failed'));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await checkAndExpireBudgetRequests();

      expect(mockPrisma.cotizacion_respuestas.updateMany).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Error notificando expiración a cliente client-1:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('startExpirationScheduler', () => {
    test('debe iniciar el scheduler correctamente', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      startExpirationScheduler();

      expect(setTimeoutSpy).toHaveBeenCalledWith(
        expect.any(Function),
        60000 // 1 minuto
      );

      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        24 * 60 * 60 * 1000 // 24 horas
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Budget request expiration scheduler started')
      );

      setTimeoutSpy.mockRestore();
      setIntervalSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('getExpirationStats', () => {
    test('debe retornar estadísticas correctas', async () => {
      const currentDate = new Date('2025-01-10T10:00:00Z');
      jest.setSystemTime(currentDate);

      mockPrisma.cotizaciones.count
        .mockResolvedValueOnce(5) // expired
        .mockResolvedValueOnce(3); // expiring soon

      const result = await getExpirationStats();

      expect(result).toEqual({
        expired: 5,
        expiring_soon: 3,
        expiration_days: 7,
        last_check: currentDate.toISOString()
      });

      expect(mockPrisma.cotizaciones.count).toHaveBeenCalledTimes(2);
    });

    test('debe manejar errores y retornar valores por defecto', async () => {
      mockPrisma.cotizaciones.count.mockRejectedValue(new Error('DB Error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getExpirationStats();

      expect(result).toEqual({
        expired: 0,
        expiring_soon: 0,
        error: 'Error al obtener estadísticas'
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error getting expiration stats:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    test('debe manejar respuestas vacías correctamente', async () => {
      mockPrisma.cotizacion_respuestas.findMany.mockResolvedValue([]);

      await checkAndExpireBudgetRequests();

      expect(mockPrisma.cotizacion_respuestas.updateMany).not.toHaveBeenCalled();
    });

    test('debe manejar múltiples clientes con notificaciones', async () => {
      const mockExpiredResponses = [
        {
          id: 'response-1',
          cotizacion: {
            id: 'quote-1',
            descripcion: 'Quote 1',
            cliente: { id: 'client-1', nombre: 'Client One', email: 'client1@test.com' }
          },
          profesional: { id: 'prof-1', nombre: 'Prof One', email: 'prof1@test.com' }
        },
        {
          id: 'response-2',
          cotizacion: {
            id: 'quote-2',
            descripcion: 'Quote 2',
            cliente: { id: 'client-1', nombre: 'Client One', email: 'client1@test.com' } // Mismo cliente
          },
          profesional: { id: 'prof-2', nombre: 'Prof Two', email: 'prof2@test.com' }
        },
        {
          id: 'response-3',
          cotizacion: {
            id: 'quote-3',
            descripcion: 'Quote 3',
            cliente: { id: 'client-2', nombre: 'Client Two', email: 'client2@test.com' } // Cliente diferente
          },
          profesional: { id: 'prof-3', nombre: 'Prof Three', email: 'prof3@test.com' }
        }
      ];

      mockPrisma.cotizacion_respuestas.findMany.mockResolvedValue(mockExpiredResponses);
      mockPrisma.cotizacion_respuestas.updateMany.mockResolvedValue({ count: 3 });
      mockCreateNotification.mockResolvedValue();

      await checkAndExpireBudgetRequests();

      // Debe notificar solo 2 veces (2 clientes únicos)
      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
      expect(mockCreateNotification).toHaveBeenCalledWith(
        'client-1',
        'solicitud_expirada',
        expect.stringContaining('Quote 1'),
        { requestId: 'quote-1' }
      );
      expect(mockCreateNotification).toHaveBeenCalledWith(
        'client-2',
        'solicitud_expirada',
        expect.stringContaining('Quote 3'),
        { requestId: 'quote-3' }
      );
    });
  });
});
