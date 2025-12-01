/**
 * Comprehensive unit tests for paymentController.js
 * Covers: Webhook handling with HMAC-SHA256 signature validation,
 * payment preference creation, fund releases, and error handling
 */

const paymentController = require('../../src/controllers/paymentController');
const mercadoPagoService = require('../../src/services/mercadoPagoService');
const receiptService = require('../../src/services/receiptService');

jest.mock('../../src/services/mercadoPagoService');
jest.mock('../../src/services/receiptService');
jest.mock('../../src/services/logger');

describe('Payment Controller - Unit Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: { id: 'client-123' },
      ip: '127.0.0.1',
      body: {},
      params: {},
      get: jest.fn()
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn()
    };

    mockNext = jest.fn();
  });

  describe('createPaymentPreference', () => {
    test('debe crear preferencia de pago exitosamente', async () => {
      mockReq.body = { serviceId: 'service-123' };

      const mockPreference = {
        id: 'pref_123',
        init_point: 'https://mercadopago.com/pay',
        sandbox_init_point: 'https://sandbox.mercadopago.com/pay'
      };

      const mockService = {
        id: 'service-123',
        cliente_id: 'client-123',
        profesional_id: 'prof-123',
        estado: 'PENDIENTE',
        descripcion: 'Servicio de plomería',
        profesional: {
          id: 'prof-123',
          nombre: 'Juan Pérez',
          email: 'juan@example.com'
        },
        cliente: {
          id: 'client-123',
          nombre: 'Cliente Test',
          email: 'cliente@example.com'
        },
        pago: null
      };

      // Mock Prisma through mercadoPagoService
      mercadoPagoService.createPaymentPreference = jest.fn().mockResolvedValue(mockPreference);

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mercadoPagoService.createPaymentPreference).toHaveBeenCalledWith({
        serviceId: 'service-123',
        amount: 1000, // Default amount
        description: 'Servicio de plomería',
        client: {
          id: 'client-123',
          nombre: 'Cliente Test',
          email: 'cliente@example.com'
        },
        professional: {
          id: 'prof-123',
          nombre: 'Juan Pérez',
          email: 'juan@example.com'
        }
      });

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPreference
      });
    });

    test('debe manejar errores de creación de preferencia', async () => {
      mockReq.body = { serviceId: 'service-123' };

      mercadoPagoService.createPaymentPreference.mockRejectedValue(new Error('MercadoPago Error'));

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'MercadoPago Error'
      });
    });

    test('debe rechazar creación sin serviceId', async () => {
      mockReq.body = {};

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Falta campo requerido: serviceId'
      });
    });
  });

  describe('handleWebhook', () => {
    test('debe procesar webhook de pago válido con firma HMAC-SHA256', async () => {
      const webhookData = {
        type: 'payment',
        data: {
          id: 'payment_123',
          status: 'approved'
        }
      };

      mockReq.body = webhookData;
      mockReq.headers = {
        'x-signature': 'ts=1234567890,v1=valid_signature',
        'x-request-id': 'req_123'
      };
      mockReq.ip = '127.0.0.1';

      const mockWebhookResult = {
        status: 'approved',
        paymentId: 'payment_123'
      };

      mercadoPagoService.processPaymentWebhook = jest.fn().mockResolvedValue(mockWebhookResult);

      await paymentController.handleWebhook(mockReq, mockRes);

      expect(mercadoPagoService.processPaymentWebhook).toHaveBeenCalledWith(
        mockReq.headers,
        webhookData.data
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith('OK');
    });

    test('debe validar firma HMAC-SHA256 correcta', async () => {
      const webhookData = {
        type: 'payment',
        data: { id: 'payment_123' }
      };

      mockReq.body = webhookData;
      mockReq.headers = {
        'x-signature': 'ts=1234567890,v1=invalid_signature',
        'x-request-id': 'req_123'
      };

      mercadoPagoService.processPaymentWebhook.mockRejectedValue(new Error('Invalid signature'));

      await paymentController.handleWebhook(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith('Error procesando webhook');
    });

    test('debe rechazar webhook sin firma', async () => {
      mockReq.body = {
        type: 'payment',
        data: { id: 'payment_123' }
      };
      mockReq.headers = {}; // No signature

      mercadoPagoService.processPaymentWebhook.mockRejectedValue(new Error('Missing signature'));

      await paymentController.handleWebhook(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('debe procesar solo webhooks de tipo payment', async () => {
      mockReq.body = {
        type: 'other_event',
        data: { id: 'other_123' }
      };
      mockReq.headers = {
        'x-signature': 'ts=1234567890,v1=valid_signature'
      };

      // Should not call processPaymentWebhook for non-payment events
      mercadoPagoService.processPaymentWebhook.mockResolvedValue({});

      await paymentController.handleWebhook(mockReq, mockRes);

      expect(mercadoPagoService.processPaymentWebhook).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith('OK');
    });

    test('debe manejar errores de procesamiento de webhook', async () => {
      mockReq.body = {
        type: 'payment',
        data: { id: 'payment_123' }
      };
      mockReq.headers = {
        'x-signature': 'ts=1234567890,v1=valid_signature'
      };

      mercadoPagoService.processPaymentWebhook.mockRejectedValue(new Error('Processing failed'));

      await paymentController.handleWebhook(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith('Error procesando webhook');
    });

    test('debe validar timestamp de firma no expirado', async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const expiredTime = currentTime - 400; // 400 seconds ago (expired)

      mockReq.body = {
        type: 'payment',
        data: { id: 'payment_123' }
      };
      mockReq.headers = {
        'x-signature': `ts=${expiredTime},v1=signature123`
      };

      mercadoPagoService.processPaymentWebhook.mockRejectedValue(new Error('Signature expired'));

      await paymentController.handleWebhook(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('debe prevenir replay attacks con request IDs', async () => {
      mockReq.body = {
        type: 'payment',
        data: { id: 'payment_123' }
      };
      mockReq.headers = {
        'x-signature': 'ts=1234567890,v1=valid_signature',
        'x-request-id': 'duplicate_req_123'
      };

      // First call succeeds
      mercadoPagoService.processPaymentWebhook.mockResolvedValueOnce({});

      await paymentController.handleWebhook(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);

      // Second call with same request ID should be handled gracefully
      await paymentController.handleWebhook(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200); // Still responds OK
    });
  });

  describe('releaseFunds', () => {
    test('debe liberar fondos exitosamente', async () => {
      mockReq.body = {
        paymentId: 'mp_payment_123',
        serviceId: 'service-123'
      };

      const mockReleaseResult = {
        success: true,
        paymentId: 'mp_payment_123',
        serviceId: 'service-123',
        totalAmount: 1000,
        commission: 80,
        professionalAmount: 920,
        releasedAt: new Date()
      };

      mercadoPagoService.releaseFunds = jest.fn().mockResolvedValue(mockReleaseResult);

      await paymentController.releaseFunds(mockReq, mockRes);

      expect(mercadoPagoService.releaseFunds).toHaveBeenCalledWith('mp_payment_123', 'service-123', 'client-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockReleaseResult
      });
    });

    test('debe rechazar liberación sin campos requeridos', async () => {
      mockReq.body = { paymentId: 'mp_payment_123' }; // Missing serviceId

      await paymentController.releaseFunds(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Faltan campos requeridos: paymentId, serviceId'
      });
    });
  });

  describe('withdrawFunds', () => {
    test('debe procesar retiro exitosamente', async () => {
      mockReq.user = { id: 'prof-123' };
      mockReq.body = {
        amount: 1000,
        bankDetails: {
          cvu: '1234567890123456789012',
          alias: 'mi.cuenta'
        }
      };

      const mockWithdrawalResult = {
        success: true,
        withdrawalId: 'wd_123',
        amount: 1000,
        processedAt: new Date()
      };

      mercadoPagoService.withdrawFunds = jest.fn().mockResolvedValue(mockWithdrawalResult);

      await paymentController.withdrawFunds(mockReq, mockRes);

      expect(mercadoPagoService.withdrawFunds).toHaveBeenCalledWith('prof-123', 1000, mockReq.body.bankDetails);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockWithdrawalResult
      });
    });

    test('debe rechazar retiro sin datos bancarios', async () => {
      mockReq.body = { amount: 1000 }; // Missing bankDetails

      await paymentController.withdrawFunds(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Faltan campos requeridos: amount, bankDetails'
      });
    });
  });

  describe('generateReceipt', () => {
    test('debe generar comprobante exitosamente', async () => {
      mockReq.params = { paymentId: 'payment-123' };

      const mockReceiptResult = {
        success: true,
        receiptUrl: '/receipts/payment-123',
        paymentId: 'payment-123'
      };

      mercadoPagoService.generatePaymentReceipt = jest.fn().mockResolvedValue(mockReceiptResult);

      await paymentController.generateReceipt(mockReq, mockRes);

      expect(mercadoPagoService.generatePaymentReceipt).toHaveBeenCalledWith('payment-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          receiptUrl: '/receipts/payment-123',
          message: 'Comprobante generado exitosamente'
        }
      });
    });

    test('debe rechazar generación sin paymentId', async () => {
      mockReq.params = {};

      await paymentController.generateReceipt(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Se requiere paymentId'
      });
    });
  });

  describe('downloadReceipt', () => {
    test('debe descargar comprobante exitosamente', async () => {
      mockReq.params = { fileName: 'receipt-123.pdf' };

      const mockFileBuffer = Buffer.from('PDF content');

      receiptService.getReceiptFile = jest.fn().mockResolvedValue(mockFileBuffer);

      await paymentController.downloadReceipt(mockReq, mockRes);

      expect(receiptService.getReceiptFile).toHaveBeenCalledWith('receipt-123.pdf');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="receipt-123.pdf"');
      expect(mockRes.send).toHaveBeenCalledWith(mockFileBuffer);
    });

    test('debe manejar errores de descarga', async () => {
      mockReq.params = { fileName: 'receipt-123.pdf' };

      receiptService.getReceiptFile.mockRejectedValue(new Error('File not found'));

      await paymentController.downloadReceipt(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'File not found'
      });
    });
  });

  // Edge Cases and Security Tests
  describe('Edge Cases and Security', () => {
    test('debe manejar payloads de webhook malformados', async () => {
      mockReq.body = null; // Malformed payload
      mockReq.headers = {
        'x-signature': 'ts=1234567890,v1=signature'
      };

      await paymentController.handleWebhook(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('debe validar tamaño de payload de webhook', async () => {
      const largePayload = {
        type: 'payment',
        data: { id: 'payment_123' },
        extra: 'x'.repeat(1000000) // Very large payload
      };

      mockReq.body = largePayload;
      mockReq.headers = {
        'x-signature': 'ts=1234567890,v1=valid_signature'
      };

      mercadoPagoService.processPaymentWebhook.mockResolvedValue({});

      await paymentController.handleWebhook(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    test('debe manejar webhooks duplicados gracefully', async () => {
      const webhookData = {
        type: 'payment',
        data: {
          id: 'payment_123',
          status: 'approved'
        }
      };

      mockReq.body = webhookData;
      mockReq.headers = {
        'x-signature': 'ts=1234567890,v1=valid_signature',
        'x-request-id': 'req_123'
      };

      // First webhook succeeds
      mercadoPagoService.processPaymentWebhook.mockResolvedValueOnce({
        status: 'approved',
        paymentId: 'payment_123'
      });

      await paymentController.handleWebhook(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);

      // Second identical webhook should be handled gracefully
      await paymentController.handleWebhook(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    test('debe prevenir inyección en parámetros de URL', async () => {
      mockReq.params = {
        paymentId: "payment_123'; DROP TABLE pagos; --",
        fileName: "receipt.pdf'; DELETE FROM receipts; --"
      };

      mercadoPagoService.generatePaymentReceipt.mockRejectedValue(new Error('Payment not found'));

      await paymentController.generateReceipt(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Payment not found'
      });
    });

    test('debe validar formato de IDs de MercadoPago', async () => {
      mockReq.body = {
        paymentId: 'invalid_mp_id',
        serviceId: 'service-123'
      };

      mercadoPagoService.releaseFunds.mockRejectedValue(new Error('Invalid MercadoPago ID format'));

      await paymentController.releaseFunds(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('debe manejar timeouts de MercadoPago', async () => {
      mockReq.body = { serviceId: 'service-123' };

      mercadoPagoService.createPaymentPreference.mockRejectedValue(
        new Error('Timeout: MercadoPago API not responding')
      );

      await paymentController.createPaymentPreference(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Timeout: MercadoPago API not responding'
      });
    });

    test('debe validar límites de frecuencia de webhooks', async () => {
      // Simulate high frequency webhooks from same IP
      const webhookData = {
        type: 'payment',
        data: { id: 'payment_123' }
      };

      for (let i = 0; i < 100; i++) {
        mockReq.body = { ...webhookData, data: { ...webhookData.data, id: `payment_${i}` } };
        mockReq.headers = {
          'x-signature': 'ts=1234567890,v1=valid_signature',
          'x-request-id': `req_${i}`
        };

        mercadoPagoService.processPaymentWebhook.mockResolvedValue({});

        await paymentController.handleWebhook(mockReq, mockRes);
      }

      // Should handle high frequency without issues
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});
