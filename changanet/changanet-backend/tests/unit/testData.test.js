/**
 * Test data utilities for payments and commissions testing
 * Provides comprehensive test data setup for all payment-related scenarios
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Test data factory for creating consistent test scenarios
 */
class TestDataFactory {
  constructor() {
    this.createdData = {
      users: [],
      services: [],
      payments: [],
      commissions: [],
      payouts: []
    };
  }

  /**
   * Create test users with different roles
   */
  async createTestUsers() {
    const users = [
      {
        id: 'client-test-1',
        nombre: 'Cliente Test',
        email: 'cliente@test.com',
        rol: 'cliente',
        esta_verificado: true,
        bloqueado: false
      },
      {
        id: 'professional-test-1',
        nombre: 'Profesional Test',
        email: 'profesional@test.com',
        rol: 'profesional',
        esta_verificado: true,
        bloqueado: false
      },
      {
        id: 'admin-test-1',
        nombre: 'Admin Test',
        email: 'admin@test.com',
        rol: 'admin',
        esta_verificado: true,
        bloqueado: false
      }
    ];

    for (const user of users) {
      await prisma.usuarios.upsert({
        where: { id: user.id },
        update: user,
        create: user
      });
    }

    this.createdData.users = users;
    return users;
  }

  /**
   * Create test professional profiles
   */
  async createTestProfessionalProfiles() {
    const profiles = [
      {
        id: 'profile-test-1',
        usuario_id: 'professional-test-1',
        tarifa_hora: 1500,
        estado_verificacion: 'verificado',
        especialidad: 'plomero'
      }
    ];

    for (const profile of profiles) {
      await prisma.perfiles_profesionales.upsert({
        where: { id: profile.id },
        update: profile,
        create: profile
      });
    }

    return profiles;
  }

  /**
   * Create test services in different states
   */
  async createTestServices() {
    const services = [
      {
        id: 'service-pending-1',
        cliente_id: 'client-test-1',
        profesional_id: 'professional-test-1',
        descripcion: 'Servicio de plomería urgente',
        estado: 'PENDIENTE',
        es_urgente: false,
        fecha_solicitud: new Date()
      },
      {
        id: 'service-completed-1',
        cliente_id: 'client-test-1',
        profesional_id: 'professional-test-1',
        descripcion: 'Servicio completado',
        estado: 'COMPLETADO',
        es_urgente: false,
        fecha_solicitud: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        completado_en: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      },
      {
        id: 'service-completed-24h-1',
        cliente_id: 'client-test-1',
        profesional_id: 'professional-test-1',
        descripcion: 'Servicio completado hace 24h',
        estado: 'COMPLETADO',
        es_urgente: false,
        fecha_solicitud: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        completado_en: new Date(Date.now() - 24 * 60 * 60 * 1000) // Exactly 24 hours ago
      }
    ];

    for (const service of services) {
      await prisma.servicios.upsert({
        where: { id: service.id },
        update: service,
        create: service
      });
    }

    this.createdData.services = services;
    return services;
  }

  /**
   * Create test commission settings
   */
  async createTestCommissionSettings() {
    const settings = [
      {
        id: 'commission-global-1',
        nombre: 'Comisión Global 8%',
        porcentaje: 8.0,
        tipo_servicio: null,
        descripcion: 'Configuración global de comisión',
        activo: true,
        creado_por: 'admin-test-1'
      },
      {
        id: 'commission-plumber-1',
        nombre: 'Comisión Plomeros 7%',
        porcentaje: 7.0,
        tipo_servicio: 'plomero',
        descripcion: 'Comisión específica para plomeros',
        activo: true,
        creado_por: 'admin-test-1'
      }
    ];

    for (const setting of settings) {
      await prisma.commission_settings.upsert({
        where: { id: setting.id },
        update: setting,
        create: setting
      });
    }

    this.createdData.commissions = settings;
    return settings;
  }

  /**
   * Create test payments in different states
   */
  async createTestPayments() {
    const payments = [
      {
        id: 'payment-pending-1',
        servicio_id: 'service-pending-1',
        cliente_id: 'client-test-1',
        profesional_id: 'professional-test-1',
        monto_total: 2000,
        comision_plataforma: 0,
        monto_profesional: 2000,
        estado: 'pendiente',
        metodo_pago: 'mercado_pago',
        mercado_pago_id: 'mp_pref_123'
      },
      {
        id: 'payment-approved-1',
        servicio_id: 'service-completed-1',
        cliente_id: 'client-test-1',
        profesional_id: 'professional-test-1',
        monto_total: 1500,
        comision_plataforma: 0,
        monto_profesional: 1500,
        estado: 'aprobado',
        metodo_pago: 'mercado_pago',
        mercado_pago_id: 'mp_pref_456',
        fecha_aprobacion: new Date()
      },
      {
        id: 'payment-released-1',
        servicio_id: 'service-completed-1',
        cliente_id: 'client-test-1',
        profesional_id: 'professional-test-1',
        monto_total: 1000,
        comision_plataforma: 80,
        monto_profesional: 920,
        estado: 'liberado',
        metodo_pago: 'mercado_pago',
        mercado_pago_id: 'mp_pref_789',
        fecha_aprobacion: new Date(),
        fecha_liberacion: new Date(),
        commission_setting_id: 'commission-global-1'
      }
    ];

    for (const payment of payments) {
      await prisma.pagos.upsert({
        where: { id: payment.id },
        update: payment,
        create: payment
      });
    }

    this.createdData.payments = payments;
    return payments;
  }

  /**
   * Create test payouts
   */
  async createTestPayouts() {
    const payouts = [
      {
        id: 'payout-pending-1',
        profesional_id: 'professional-test-1',
        servicio_id: 'service-completed-1',
        monto_bruto: 1000,
        comision_plataforma: 80,
        monto_neto: 920,
        metodo_pago: 'bank_transfer',
        estado: 'pendiente'
      },
      {
        id: 'payout-completed-1',
        profesional_id: 'professional-test-1',
        servicio_id: 'service-completed-1',
        monto_bruto: 1500,
        comision_plataforma: 120,
        monto_neto: 1380,
        metodo_pago: 'bank_transfer',
        estado: 'completado',
        fecha_pago: new Date(),
        referencia_pago: 'REF123456'
      }
    ];

    for (const payout of payouts) {
      await prisma.payouts.upsert({
        where: { id: payout.id },
        update: payout,
        create: payout
      });
    }

    this.createdData.payouts = payouts;
    return payouts;
  }

  /**
   * Setup complete test scenario
   */
  async setupCompleteTestScenario() {
    await this.createTestUsers();
    await this.createTestProfessionalProfiles();
    await this.createTestCommissionSettings();
    await this.createTestServices();
    await this.createTestPayments();
    await this.createTestPayouts();

    return this.createdData;
  }

  /**
   * Clean up all created test data
   */
  async cleanup() {
    // Clean up in reverse order to respect foreign keys
    const tables = ['payouts', 'pagos', 'servicios', 'commission_settings', 'perfiles_profesionales', 'usuarios'];

    for (const table of tables) {
      try {
        await prisma[table].deleteMany({
          where: {
            id: {
              contains: 'test-'
            }
          }
        });
      } catch (error) {
        console.warn(`Warning: Could not clean up ${table}:`, error.message);
      }
    }

    this.createdData = {
      users: [],
      services: [],
      payments: [],
      commissions: [],
      payouts: []
    };
  }
}

module.exports = { TestDataFactory };
