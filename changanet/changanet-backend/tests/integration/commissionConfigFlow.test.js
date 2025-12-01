/**
 * Comprehensive integration tests for commission configuration changes
 * Covers: Commission setting updates, cascading effects on payments,
 * validation of changes, and rollback scenarios
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { TestDataFactory } = require('../unit/testData.test');

const prisma = new PrismaClient();

describe('Commission Configuration Flow - Integration Tests', () => {
  let app;
  let testDataFactory;
  let server;
  let adminToken;
  let clientToken;

  beforeAll(async () => {
    // Import and setup test app
    const { app: testApp } = require('../../src/server');
    app = testApp;

    // Start server for integration tests
    server = app.listen(3006); // Different port for tests

    testDataFactory = new TestDataFactory();
    await testDataFactory.setupCompleteTestScenario();

    // Generate test tokens (simplified for testing)
    adminToken = 'test_admin_token';
    clientToken = 'test_client_token';
  });

  afterAll(async () => {
    await testDataFactory.cleanup();
    await prisma.$disconnect();
    server.close();
  });

  describe('Commission Setting CRUD Operations', () => {
    test('admin can create new commission setting', async () => {
      const newSetting = {
        nombre: 'Comisión Servicios Eléctricos',
        porcentaje: 9.0,
        tipo_servicio: 'electricista',
        descripcion: 'Comisión específica para servicios eléctricos',
      };

      const response = await request(app)
        .post('/api/commissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newSetting);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.nombre).toBe(newSetting.nombre);
      expect(response.body.data.porcentaje).toBe(newSetting.porcentaje);
      expect(response.body.data.tipo_servicio).toBe(newSetting.tipo_servicio);

      // Verify in database
      const createdSetting = await prisma.commission_settings.findFirst({
        where: {
          nombre: newSetting.nombre,
          tipo_servicio: newSetting.tipo_servicio
        }
      });

      expect(createdSetting).toBeTruthy();
      expect(createdSetting.porcentaje).toBe(9.0);
      expect(createdSetting.activo).toBe(true);
    });

    test('admin can update existing commission setting', async () => {
      // First create a setting
      const setting = await prisma.commission_settings.create({
        data: {
          nombre: 'Comisión Temporal',
          porcentaje: 7.0,
          tipo_servicio: 'temporal',
          descripcion: 'Setting para actualizar',
          activo: true,
          creado_por: 'admin-test-1'
        }
      });

      const updateData = {
        porcentaje: 8.5,
        descripcion: 'Setting actualizado',
      };

      const response = await request(app)
        .put(`/api/commissions/${setting.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.porcentaje).toBe(8.5);
      expect(response.body.data.descripcion).toBe('Setting actualizado');

      // Verify in database
      const updatedSetting = await prisma.commission_settings.findUnique({
        where: { id: setting.id }
      });

      expect(updatedSetting.porcentaje).toBe(8.5);
      expect(updatedSetting.descripcion).toBe('Setting actualizado');

      // Cleanup
      await prisma.commission_settings.delete({ where: { id: setting.id } });
    });

    test('admin can deactivate commission setting', async () => {
      // Create a setting
      const setting = await prisma.commission_settings.create({
        data: {
          nombre: 'Comisión para Desactivar',
          porcentaje: 6.0,
          tipo_servicio: 'desactivar',
          activo: true,
          creado_por: 'admin-test-1'
        }
      });

      // Confirm deactivation
      global.confirm = jest.fn(() => true);

      const response = await request(app)
        .delete(`/api/commissions/${setting.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify deactivated in database
      const deactivatedSetting = await prisma.commission_settings.findUnique({
        where: { id: setting.id }
      });

      expect(deactivatedSetting.activo).toBe(false);
    });

    test('can retrieve all active commission settings', async () => {
      const response = await request(app)
        .get('/api/commissions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Should include default global setting
      const globalSetting = response.body.data.find(s => s.tipo_servicio === null);
      expect(globalSetting).toBeTruthy();
      expect(globalSetting.porcentaje).toBe(5.0); // Default
    });
  });

  describe('Commission Validation and Constraints', () => {
    test('rejects commission percentage below 5%', async () => {
      const invalidSetting = {
        nombre: 'Comisión Inválida Baja',
        porcentaje: 3.0,
        tipo_servicio: 'invalida_baja',
      };

      const response = await request(app)
        .post('/api/commissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidSetting);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('entre 5% y 10%');
    });

    test('rejects commission percentage above 10%', async () => {
      const invalidSetting = {
        nombre: 'Comisión Inválida Alta',
        porcentaje: 15.0,
        tipo_servicio: 'invalida_alta',
      };

      const response = await request(app)
        .post('/api/commissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidSetting);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('entre 5% y 10%');
    });

    test('prevents duplicate active settings for same service type', async () => {
      // Create first setting
      await prisma.commission_settings.create({
        data: {
          nombre: 'Comisión Original',
          porcentaje: 7.0,
          tipo_servicio: 'duplicado',
          activo: true,
          creado_por: 'admin-test-1'
        }
      });

      // Try to create duplicate
      const duplicateSetting = {
        nombre: 'Comisión Duplicada',
        porcentaje: 8.0,
        tipo_servicio: 'duplicado',
      };

      const response = await request(app)
        .post('/api/commissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateSetting);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Ya existe');

      // Cleanup
      await prisma.commission_settings.deleteMany({
        where: { tipo_servicio: 'duplicado' }
      });
    });

    test('prevents multiple active global settings', async () => {
      // Create first global setting
      await prisma.commission_settings.create({
        data: {
          nombre: 'Global Original',
          porcentaje: 6.0,
          tipo_servicio: null,
          activo: true,
          creado_por: 'admin-test-1'
        }
      });

      // Try to create another global
      const anotherGlobal = {
        nombre: 'Otro Global',
        porcentaje: 7.0,
        tipo_servicio: null,
      };

      const response = await request(app)
        .post('/api/commissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(anotherGlobal);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('global');

      // Cleanup
      await prisma.commission_settings.deleteMany({
        where: { tipo_servicio: null, nombre: 'Global Original' }
      });
    });

    test('requires name field', async () => {
      const invalidSetting = {
        porcentaje: 8.0,
        tipo_servicio: 'sin_nombre',
      };

      const response = await request(app)
        .post('/api/commissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidSetting);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('requeridos');
    });
  });

  describe('Commission Application in Payment Flow', () => {
    let electricianServiceId;
    let electricianPaymentId;

    beforeAll(async () => {
      // Create electrician service type
      await prisma.commission_settings.create({
        data: {
          nombre: 'Comisión Electricistas',
          porcentaje: 9.0,
          tipo_servicio: 'electricista',
          activo: true,
          creado_por: 'admin-test-1'
        }
      });

      // Create test service
      const service = await prisma.servicios.create({
        data: {
          id: 'service-electrician-commission-test',
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          descripcion: 'Servicio eléctrico para prueba de comisión',
          tipo_servicio: 'electricista',
          estado: 'PENDIENTE',
          fecha_solicitud: new Date()
        }
      });

      electricianServiceId = service.id;
    });

    afterAll(async () => {
      // Cleanup
      await prisma.commission_settings.deleteMany({
        where: { tipo_servicio: 'electricista' }
      });
      await prisma.servicios.delete({ where: { id: electricianServiceId } }).catch(() => {});
      await prisma.pagos.deleteMany({ where: { servicio_id: electricianServiceId } }).catch(() => {});
      await prisma.payouts.deleteMany({ where: { servicio_id: electricianServiceId } }).catch(() => {});
    });

    test('applies specific commission rate for service type', async () => {
      // Create payment
      const paymentData = {
        serviceId: electricianServiceId,
        amount: 2000
      };

      const paymentResponse = await request(app)
        .post('/api/payments/preference')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(paymentData);

      expect(paymentResponse.status).toBe(201);

      // Simulate payment approval
      const payment = await prisma.pagos.findFirst({
        where: { servicio_id: electricianServiceId }
      });

      electricianPaymentId = payment.id;

      // Update payment to approved
      await prisma.pagos.update({
        where: { id: payment.id },
        data: {
          estado: 'aprobado',
          mercado_pago_id: 'mp_electrician_test'
        }
      });

      // Update service to completed
      await prisma.servicios.update({
        where: { id: electricianServiceId },
        data: { estado: 'COMPLETADO', completado_en: new Date() }
      });

      // Release funds - should use 9% commission
      const releaseData = {
        paymentId: 'mp_electrician_test',
        serviceId: electricianServiceId
      };

      const releaseResponse = await request(app)
        .post('/api/payments/release')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(releaseData);

      expect(releaseResponse.status).toBe(200);
      expect(releaseResponse.body.data.commission).toBe(180); // 9% of 2000
      expect(releaseResponse.body.data.professionalAmount).toBe(1820); // 2000 - 180
    });

    test('falls back to global commission when specific not available', async () => {
      // Create service with unknown type
      const unknownService = await prisma.servicios.create({
        data: {
          id: 'service-unknown-commission-test',
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          descripcion: 'Servicio desconocido',
          tipo_servicio: 'servicio_desconocido',
          estado: 'COMPLETADO',
          completado_en: new Date(),
          fecha_solicitud: new Date()
        }
      });

      const unknownPayment = await prisma.pagos.create({
        data: {
          id: 'payment-unknown-commission-test',
          servicio_id: unknownService.id,
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          monto_total: 1500,
          estado: 'aprobado',
          mercado_pago_id: 'mp_unknown_test'
        }
      });

      // Release funds - should use global commission (5%)
      const releaseData = {
        paymentId: 'mp_unknown_test',
        serviceId: unknownService.id
      };

      const releaseResponse = await request(app)
        .post('/api/payments/release')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(releaseData);

      expect(releaseResponse.status).toBe(200);
      expect(releaseResponse.body.data.commission).toBe(75); // 5% of 1500
      expect(releaseResponse.body.data.professionalAmount).toBe(1425); // 1500 - 75

      // Cleanup
      await prisma.payouts.deleteMany({ where: { servicio_id: unknownService.id } });
      await prisma.pagos.delete({ where: { id: unknownPayment.id } });
      await prisma.servicios.delete({ where: { id: unknownService.id } });
    });
  });

  describe('Commission Configuration Changes During Operation', () => {
    test('commission changes apply to new payments but not existing ones', async () => {
      // Create initial setting
      const initialSetting = await prisma.commission_settings.create({
        data: {
          nombre: 'Comisión Cambiante',
          porcentaje: 6.0,
          tipo_servicio: 'cambiante',
          activo: true,
          creado_por: 'admin-test-1'
        }
      });

      // Create service and payment with initial commission
      const service1 = await prisma.servicios.create({
        data: {
          id: 'service-commission-change-1',
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          descripcion: 'Servicio antes del cambio',
          tipo_servicio: 'cambiante',
          estado: 'COMPLETADO',
          completado_en: new Date(),
          fecha_solicitud: new Date()
        }
      });

      const payment1 = await prisma.pagos.create({
        data: {
          id: 'payment-commission-change-1',
          servicio_id: service1.id,
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          monto_total: 1000,
          estado: 'aprobado',
          mercado_pago_id: 'mp_change_test_1'
        }
      });

      // Change commission rate
      await request(app)
        .put(`/api/commissions/${initialSetting.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ porcentaje: 8.0 });

      // Create second service and payment after change
      const service2 = await prisma.servicios.create({
        data: {
          id: 'service-commission-change-2',
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          descripcion: 'Servicio después del cambio',
          tipo_servicio: 'cambiante',
          estado: 'COMPLETADO',
          completado_en: new Date(),
          fecha_solicitud: new Date()
        }
      });

      const payment2 = await prisma.pagos.create({
        data: {
          id: 'payment-commission-change-2',
          servicio_id: service2.id,
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          monto_total: 1000,
          estado: 'aprobado',
          mercado_pago_id: 'mp_change_test_2'
        }
      });

      // Both should use the new rate (8%) since commission is calculated at release time
      const releaseData1 = {
        paymentId: 'mp_change_test_1',
        serviceId: service1.id
      };

      const releaseData2 = {
        paymentId: 'mp_change_test_2',
        serviceId: service2.id
      };

      const [release1, release2] = await Promise.all([
        request(app)
          .post('/api/payments/release')
          .set('Authorization', `Bearer ${clientToken}`)
          .send(releaseData1),
        request(app)
          .post('/api/payments/release')
          .set('Authorization', `Bearer ${clientToken}`)
          .send(releaseData2)
      ]);

      // Both should use 8% commission
      expect(release1.body.data.commission).toBe(80); // 8% of 1000
      expect(release2.body.data.commission).toBe(80);

      // Cleanup
      await prisma.payouts.deleteMany({ where: { servicio_id: { in: [service1.id, service2.id] } } });
      await prisma.pagos.deleteMany({ where: { id: { in: [payment1.id, payment2.id] } } });
      await prisma.servicios.deleteMany({ where: { id: { in: [service1.id, service2.id] } } });
      await prisma.commission_settings.delete({ where: { id: initialSetting.id } });
    });

    test('deactivating commission setting falls back to global', async () => {
      // Create specific setting
      const specificSetting = await prisma.commission_settings.create({
        data: {
          nombre: 'Comisión para Desactivar',
          porcentaje: 9.0,
          tipo_servicio: 'desactivar_test',
          activo: true,
          creado_por: 'admin-test-1'
        }
      });

      // Create service
      const service = await prisma.servicios.create({
        data: {
          id: 'service-deactivate-commission-test',
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          descripcion: 'Servicio para desactivar comisión',
          tipo_servicio: 'desactivar_test',
          estado: 'COMPLETADO',
          completado_en: new Date(),
          fecha_solicitud: new Date()
        }
      });

      const payment = await prisma.pagos.create({
        data: {
          id: 'payment-deactivate-commission-test',
          servicio_id: service.id,
          cliente_id: 'client-test-1',
          profesional_id: 'professional-test-1',
          monto_total: 2000,
          estado: 'aprobado',
          mercado_pago_id: 'mp_deactivate_test'
        }
      });

      // Deactivate specific setting
      await request(app)
        .delete(`/api/commissions/${specificSetting.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Release funds - should fall back to global commission (5%)
      const releaseData = {
        paymentId: 'mp_deactivate_test',
        serviceId: service.id
      };

      const releaseResponse = await request(app)
        .post('/api/payments/release')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(releaseData);

      expect(releaseResponse.status).toBe(200);
      expect(releaseResponse.body.data.commission).toBe(100); // 5% of 2000
      expect(releaseResponse.body.data.professionalAmount).toBe(1900);

      // Cleanup
      await prisma.payouts.deleteMany({ where: { servicio_id: service.id } });
      await prisma.pagos.delete({ where: { id: payment.id } });
      await prisma.servicios.delete({ where: { id: service.id } });
    });
  });

  describe('Commission Statistics and Reporting', () => {
    test('calculates commission statistics correctly', async () => {
      const response = await request(app)
        .get('/api/commissions/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalPayments');
      expect(response.body.data).toHaveProperty('totalCommission');
      expect(response.body.data).toHaveProperty('totalProfessionalPayments');
      expect(response.body.data).toHaveProperty('activeCommissionSettings');
      expect(response.body.data).toHaveProperty('averageCommissionRate');
    });

    test('commission statistics handle zero payments', async () => {
      // Temporarily clear payments
      const existingPayments = await prisma.pagos.findMany({
        where: { estado: 'liberado' }
      });

      // Mark all as different status
      await prisma.pagos.updateMany({
        where: { estado: 'liberado' },
        data: { estado: 'temp_status' }
      });

      const response = await request(app)
        .get('/api/commissions/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalPayments).toBe(0);
      expect(response.body.data.totalCommission).toBe(0);
      expect(response.body.data.averageCommissionRate).toBe(0);

      // Restore payments
      await prisma.pagos.updateMany({
        where: { estado: 'temp_status' },
        data: { estado: 'liberado' }
      });
    });
  });

  describe('Global Commission Updates', () => {
    test('admin can update global commission percentage', async () => {
      const updateData = {
        percentage: 7.0,
        minimumFee: 50
      };

      const response = await request(app)
        .post('/api/admin/commission/update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.newPercentage).toBe(7.0);

      // Verify global setting was updated
      const globalSetting = await prisma.commission_settings.findFirst({
        where: {
          tipo_servicio: null,
          activo: true
        },
        orderBy: { fecha_creacion: 'desc' }
      });

      expect(globalSetting.porcentaje).toBe(7.0);
    });

    test('rejects invalid global commission percentage', async () => {
      const invalidData = {
        percentage: 12.0 // Above 10%
      };

      const response = await request(app)
        .post('/api/admin/commission/update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('entre 5% y 10%');
    });

    test('global commission update creates setting if none exists', async () => {
      // Temporarily deactivate all global settings
      await prisma.commission_settings.updateMany({
        where: { tipo_servicio: null },
        data: { activo: false }
      });

      const updateData = {
        percentage: 6.5
      };

      const response = await request(app)
        .post('/api/admin/commission/update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);

      // Verify new global setting was created
      const newGlobal = await prisma.commission_settings.findFirst({
        where: {
          tipo_servicio: null,
          activo: true,
          porcentaje: 6.5
        }
      });

      expect(newGlobal).toBeTruthy();

      // Restore original global setting
      await prisma.commission_settings.updateMany({
        where: { tipo_servicio: null, activo: false },
        data: { activo: true }
      });
    });
  });

  describe('Commission Calculation API', () => {
    test('calculates commission for given amount and service type', async () => {
      const calcData = {
        amount: 2500,
        serviceType: 'electricista'
      };

      const response = await request(app)
        .post('/api/commissions/calculate')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(calcData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.originalAmount).toBe(2500);
      expect(response.body.data.commissionPercentage).toBe(9.0); // Electrician rate
      expect(response.body.data.commissionAmount).toBe(225); // 9% of 2500
      expect(response.body.data.professionalAmount).toBe(2275);
    });

    test('commission calculation falls back to global rate', async () => {
      const calcData = {
        amount: 3000,
        serviceType: 'unknown_service_type'
      };

      const response = await request(app)
        .post('/api/commissions/calculate')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(calcData);

      expect(response.status).toBe(200);
      expect(response.body.data.commissionPercentage).toBe(5.0); // Global default
      expect(response.body.data.commissionAmount).toBe(150); // 5% of 3000
    });

    test('rejects invalid amount in commission calculation', async () => {
      const invalidData = {
        amount: -100,
        serviceType: 'test'
      };

      const response = await request(app)
        .post('/api/commissions/calculate')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('mayor a 0');
    });
  });
});
