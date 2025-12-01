/**
 * Comprehensive integration tests for complete payment checkout flow
 * Covers: Payment creation → Webhook processing → Fund release → Payout creation
 * Tests the complete end-to-end payment process with HMAC validation
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { TestDataFactory } = require('../unit/testData.test');

const prisma = new PrismaClient();

describe('Payment Checkout Flow - Integration Tests', () => {
  let app;
  let testDataFactory;
  let server;
  let serviceId;
  let clientToken;
  let professionalToken;

  beforeAll(async () => {
    // Import and setup test app
    const { app: testApp } = require('../../src/server');
    app = testApp;

    // Start server for integration tests
    server = app.listen(3004); // Different port for tests

    testDataFactory = new TestDataFactory();
    await testDataFactory.setupCompleteTestScenario();

    // Setup test data
    serviceId = 'service-pending-1'; // From test data

    // Generate test tokens (simplified for testing)
    clientToken = 'test_client_token';
    professionalToken = 'test_professional_token';
  });

  afterAll(async () => {
    await testDataFactory.cleanup();
    await prisma.$disconnect();
    server.close();
  });

  describe('Complete Checkout Flow: Payment Creation → Webhook → Fund Release', () => {
    let paymentRecord;

    test('Paso 1: Cliente crea preferencia de pago exitosamente', async () => {
      const paymentData = {
        serviceId: serviceId,
        amount: 1500
      };

      const response = await request(app)
        .post('/api/payments/preference')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(paymentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('preferenceId');
      expect(response.body.data).toHaveProperty('initPoint');
      expect(response.body.data).toHaveProperty('paymentRecordId');

      paymentRecord = response.body.data;
    });

    test('Paso 2: Webhook de MercadoPago procesa pago aprobado con validación HMAC-SHA256', async () => {
      const webhookData = {
        type: 'payment',
        data: {
          id: 'mp_payment_123',
          status: 'approved',
          status_detail: 'accredited',
          date_approved: new Date().toISOString(),
          transaction_amount: 1500,
          external_reference: serviceId,
          payment_method_id: 'visa',
          payment_type_id: 'credit_card'
        }
      };

      // Generate valid HMAC-SHA256 signature
      const crypto = require('crypto');
      const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || 'test_webhook_secret';
      const timestamp = Math.floor(Date.now() / 1000);
      const payload = JSON.stringify(webhookData);
      const signature = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${payload}`)
        .digest('hex');

      const signatureHeader = `ts=${timestamp},v1=${signature}`;

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('x-signature', signatureHeader)
        .set('x-request-id', `webhook_${Date.now()}`)
        .send(webhookData);

      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');

      // Verify payment status was updated
      const updatedPayment = await prisma.pagos.findUnique({
        where: { id: paymentRecord.paymentRecordId }
      });

      expect(updatedPayment.estado).toBe('aprobado');
      expect(updatedPayment.mercado_pago_id).toBe('mp_payment_123');
    });

    test('Paso 3: Servicio se marca como completado', async () => {
      // Update service to completed status
      await prisma.servicios.update({
        where: { id: serviceId },
        data: {
          estado: 'COMPLETADO',
          completado_en: new Date()
        }
      });

      const updatedService = await prisma.servicios.findUnique({
        where: { id: serviceId }
      });

      expect(updatedService.estado).toBe('COMPLETADO');
      expect(updatedService.completado_en).toBeInstanceOf(Date);
    });

    test('Paso 4: Cliente libera fondos con cálculo de comisión', async () => {
      const releaseData = {
        paymentId: 'mp_payment_123',
        serviceId: serviceId
      };

      const response = await request(app)
        .post('/api/payments/release')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(releaseData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalAmount', 1500);
      expect(response.body.data).toHaveProperty('commission'); // 8% of 1500 = 120
      expect(response.body.data).toHaveProperty('professionalAmount', 1380); // 1500 - 120
      expect(response.body.data).toHaveProperty('releasedAt');

      // Verify commission calculation (8% of 1500 = 120)
      expect(response.body.data.commission).toBe(120);
      expect(response.body.data.professionalAmount).toBe(1380);
    });

    test('Paso 5: Verificar que se creó registro de payout', async () => {
      const payout = await prisma.payouts.findFirst({
        where: {
          servicio_id: serviceId,
          profesional_id: 'professional-test-1'
        }
      });

      expect(payout).toBeTruthy();
      expect(payout.monto_bruto).toBe(1500);
      expect(payout.comision_plataforma).toBe(120);
      expect(payout.monto_neto).toBe(1380);
      expect(payout.estado).toBe('pendiente');
      expect(payout.metodo_pago).toBe('platform_manual_release');
    });

    test('Paso 6: Verificar estado final del pago y servicio', async () => {
      const finalPayment = await prisma.pagos.findUnique({
        where: { id: paymentRecord.paymentRecordId }
      });

      expect(finalPayment.estado).toBe('liberado');
      expect(finalPayment.comision_plataforma).toBe(120);
      expect(finalPayment.monto_profesional).toBe(1380);
      expect(finalPayment.fecha_liberacion).toBeInstanceOf(Date);

      const finalService = await prisma.servicios.findUnique({
        where: { id: serviceId }
      });

      expect(finalService.estado).toBe('pagado');
    });

    test('Paso 7: Generar comprobante de pago', async () => {
      const response = await request(app)
        .get(`/api/payments/${paymentRecord.paymentRecordId}/receipt`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('receiptUrl');
      expect(response.body.data.message).toBe('Comprobante generado exitosamente');
    });
  });

  describe('Automatic Fund Release (24h Rule)', () => {
    let autoReleaseServiceId;
    let autoReleasePaymentId;

    beforeAll(async () => {
      // Create a service that was completed 25 hours ago
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);

      const service = await prisma.servicios.create({
        data: {
          id: 'service-auto-release-test',
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          descripcion: 'Servicio para liberación automática',
          estado: 'COMPLETADO',
          completado_en: twentyFiveHoursAgo,
          fecha_solicitud: twentyFiveHoursAgo
        }
      });

      const payment = await prisma.pagos.create({
        data: {
          id: 'payment-auto-release-test',
          servicio_id: service.id,
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          monto_total: 2000,
          comision_plataforma: 0,
          monto_profesional: 2000,
          estado: 'aprobado',
          metodo_pago: 'mercado_pago',
          mercado_pago_id: 'mp_auto_release_123'
        }
      });

      autoReleaseServiceId = service.id;
      autoReleasePaymentId = payment.id;
    });

    test('Liberación automática de fondos después de 24h', async () => {
      // Trigger auto release (normally done by cron job)
      const paymentsService = require('../../src/services/paymentsService');
      const result = await paymentsService.autoReleaseFunds();

      expect(result.success).toBe(true);
      expect(result.releasedCount).toBeGreaterThan(0);

      // Find our test service in results
      const ourRelease = result.results.find(r => r.serviceId === autoReleaseServiceId);
      expect(ourRelease).toBeTruthy();
      expect(ourRelease.status).toBe('released');
      expect(ourRelease.totalAmount).toBe(2000);
      expect(ourRelease.commission).toBe(160); // 8% of 2000
      expect(ourRelease.professionalAmount).toBe(1840); // 2000 - 160

      // Verify database state
      const updatedPayment = await prisma.pagos.findUnique({
        where: { id: autoReleasePaymentId }
      });

      expect(updatedPayment.estado).toBe('liberado');
      expect(updatedPayment.comision_plataforma).toBe(160);
      expect(updatedPayment.monto_profesional).toBe(1840);

      const updatedService = await prisma.servicios.findUnique({
        where: { id: autoReleaseServiceId }
      });

      expect(updatedService.estado).toBe('pagado');

      // Verify payout was created
      const payout = await prisma.payouts.findFirst({
        where: {
          servicio_id: autoReleaseServiceId,
          metodo_pago: 'platform_auto_release'
        }
      });

      expect(payout).toBeTruthy();
      expect(payout.monto_neto).toBe(1840);
    });
  });

  describe('Security and Error Handling', () => {
    test('Webhook rechaza firma HMAC-SHA256 inválida', async () => {
      const webhookData = {
        type: 'payment',
        data: { id: 'payment_fraudulent' }
      };

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('x-signature', 'ts=1234567890,v1=invalid_signature')
        .set('x-request-id', `webhook_fraud_${Date.now()}`)
        .send(webhookData);

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error procesando webhook');
    });

    test('Cliente no puede liberar fondos de servicio ajeno', async () => {
      const releaseData = {
        paymentId: 'mp_payment_wrong',
        serviceId: 'service-wrong-client'
      };

      const response = await request(app)
        .post('/api/payments/release')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(releaseData);

      expect(response.status).toBe(500); // Service not found or permission denied
    });

    test('No se puede liberar fondos de servicio no completado', async () => {
      const pendingService = await prisma.servicios.create({
        data: {
          id: 'service-pending-release-test',
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          descripcion: 'Servicio pendiente',
          estado: 'PENDIENTE'
        }
      });

      const pendingPayment = await prisma.pagos.create({
        data: {
          id: 'payment-pending-release-test',
          servicio_id: pendingService.id,
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          monto_total: 1000,
          estado: 'aprobado',
          metodo_pago: 'mercado_pago'
        }
      });

      const releaseData = {
        paymentId: 'mp_pending_test',
        serviceId: pendingService.id
      };

      const response = await request(app)
        .post('/api/payments/release')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(releaseData);

      expect(response.status).toBe(500); // Service not completed

      // Cleanup
      await prisma.pagos.delete({ where: { id: pendingPayment.id } });
      await prisma.servicios.delete({ where: { id: pendingService.id } });
    });

    test('Webhook maneja payloads malformados', async () => {
      const malformedData = {
        type: 'payment'
        // Missing data field
      };

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('x-signature', 'ts=1234567890,v1=some_signature')
        .set('x-request-id', `webhook_malformed_${Date.now()}`)
        .send(malformedData);

      expect(response.status).toBe(500);
    });

    test('Prevención de pagos duplicados', async () => {
      const duplicatePaymentData = {
        serviceId: serviceId, // Same service
        amount: 1500
      };

      const response = await request(app)
        .post('/api/payments/preference')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(duplicatePaymentData);

      expect(response.status).toBe(500); // Should reject duplicate payment
    });
  });

  describe('Commission Integration', () => {
    test('Comisión configurable se aplica correctamente en liberación', async () => {
      // Create specific commission for electricians
      await prisma.commission_settings.create({
        data: {
          id: 'commission-electrician-test',
          nombre: 'Electricistas 9%',
          porcentaje: 9.0,
          tipo_servicio: 'electricista',
          activo: true,
          creado_por: 'admin-test-1'
        }
      });

      // Create service with electrician specialty
      const electricianService = await prisma.servicios.create({
        data: {
          id: 'service-electrician-test',
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          descripcion: 'Servicio eléctrico',
          estado: 'COMPLETADO',
          completado_en: new Date(),
          fecha_solicitud: new Date()
        }
      });

      const electricianPayment = await prisma.pagos.create({
        data: {
          id: 'payment-electrician-test',
          servicio_id: electricianService.id,
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          monto_total: 3000,
          comision_plataforma: 0,
          monto_profesional: 3000,
          estado: 'aprobado',
          metodo_pago: 'mercado_pago',
          mercado_pago_id: 'mp_electrician_123'
        }
      });

      // Release funds - should use 9% commission
      const releaseData = {
        paymentId: 'mp_electrician_123',
        serviceId: electricianService.id
      };

      const response = await request(app)
        .post('/api/payments/release')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(releaseData);

      expect(response.status).toBe(200);
      expect(response.body.data.commission).toBe(270); // 9% of 3000
      expect(response.body.data.professionalAmount).toBe(2730); // 3000 - 270

      // Cleanup
      await prisma.payouts.deleteMany({ where: { servicio_id: electricianService.id } });
      await prisma.pagos.delete({ where: { id: electricianPayment.id } });
      await prisma.servicios.delete({ where: { id: electricianService.id } });
      await prisma.commission_settings.delete({ where: { id: 'commission-electrician-test' } });
    });
  });

  describe('Professional Withdrawal Flow', () => {
    test('Profesional puede retirar fondos disponibles', async () => {
      const withdrawalData = {
        amount: 500,
        bankDetails: {
          cvu: '1234567890123456789012',
          alias: 'cuenta.profesional'
        }
      };

      const response = await request(app)
        .post('/api/payments/withdraw')
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(withdrawalData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('withdrawalId');
      expect(response.body.data.amount).toBe(500);
      expect(response.body.data).toHaveProperty('processedAt');
      expect(response.body.data.bankDetails.cvuMasked).toMatch(/\*\*\*\d{4}/);
    });

    test('Profesional no puede retirar más de lo disponible', async () => {
      const excessiveWithdrawal = {
        amount: 100000, // Much more than available
        bankDetails: {
          cvu: '1234567890123456789012',
          alias: 'cuenta.profesional'
        }
      };

      const response = await request(app)
        .post('/api/payments/withdraw')
        .set('Authorization', `Bearer ${professionalToken}`)
        .send(excessiveWithdrawal);

      expect(response.status).toBe(500); // Insufficient funds
    });
  });
});
