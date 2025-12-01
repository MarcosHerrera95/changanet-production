/**
 * Test utilities and mocks for external services
 * Provides reusable mocks for MercadoPago, Prisma, and other dependencies
 */

const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { PrismaClient } = require('@prisma/client');

// Mock MercadoPago SDK
const createMercadoPagoMocks = () => {
  const mockPreferenceInstance = {
    create: jest.fn(),
    update: jest.fn(),
    get: jest.fn()
  };

  const mockPaymentInstance = {
    create: jest.fn(),
    update: jest.fn(),
    get: jest.fn(),
    capture: jest.fn()
  };

  // Mock the constructors
  Preference.mockImplementation(() => mockPreferenceInstance);
  Payment.mockImplementation(() => mockPaymentInstance);
  MercadoPagoConfig.mockImplementation(() => ({}));

  return {
    mockPreferenceInstance,
    mockPaymentInstance,
    mockPreferenceResponse: (data) => ({
      body: {
        id: data.id || 'pref_test_123',
        init_point: data.initPoint || 'https://mercadopago.com/pay',
        sandbox_init_point: data.sandboxInitPoint || 'https://sandbox.mercadopago.com/pay',
        ...data
      }
    }),
    mockPaymentResponse: (data) => ({
      body: {
        id: data.id || 'mp_payment_123',
        status: data.status || 'approved',
        status_detail: data.statusDetail || 'accredited',
        transaction_amount: data.amount || 1000,
        external_reference: data.externalReference || 'service_123',
        payment_method_id: data.paymentMethod || 'visa',
        payment_type_id: data.paymentType || 'credit_card',
        ...data
      }
    })
  };
};

// Mock Prisma Client
const createPrismaMocks = () => {
  const mockPrisma = {
    usuarios: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn()
    },
    servicios: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn()
    },
    pagos: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      aggregate: jest.fn()
    },
    commission_settings: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn()
    },
    payouts: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn()
    },
    transactions_log: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    },
    $executeRawUnsafe: jest.fn(),
    $transaction: jest.fn(),
    $disconnect: jest.fn()
  };

  PrismaClient.mockImplementation(() => mockPrisma);

  return mockPrisma;
};

// Mock Services
const createServiceMocks = () => {
  const mockCommissionService = {
    getApplicableCommission: jest.fn(),
    calculateCommission: jest.fn(),
    createCommissionSetting: jest.fn(),
    updateCommissionSetting: jest.fn(),
    deactivateCommissionSetting: jest.fn(),
    getCommissionSettings: jest.fn(),
    getCommissionStats: jest.fn()
  };

  const mockPayoutService = {
    createPayout: jest.fn(),
    processPayout: jest.fn(),
    getPayouts: jest.fn(),
    getPayoutById: jest.fn(),
    getPendingPayouts: jest.fn(),
    getPayoutStats: jest.fn(),
    getGlobalPayoutStats: jest.fn()
  };

  const mockNotificationService = {
    createNotification: jest.fn()
  };

  const mockReceiptService = {
    generatePaymentReceipt: jest.fn(),
    getReceiptFile: jest.fn()
  };

  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  };

  // Mock the services
  jest.doMock('../../src/services/commissionService', () => mockCommissionService);
  jest.doMock('../../src/services/payoutService', () => mockPayoutService);
  jest.doMock('../../src/services/notificationService', () => mockNotificationService);
  jest.doMock('../../src/services/receiptService', () => mockReceiptService);
  jest.doMock('../../src/services/logger', () => mockLogger);

  return {
    mockCommissionService,
    mockPayoutService,
    mockNotificationService,
    mockReceiptService,
    mockLogger
  };
};

// Test data generators
const generateTestData = {
  user: (overrides = {}) => ({
    id: 'user_test_123',
    nombre: 'Usuario Test',
    email: 'test@example.com',
    rol: 'cliente',
    esta_verificado: true,
    bloqueado: false,
    ...overrides
  }),

  service: (overrides = {}) => ({
    id: 'service_test_123',
    cliente_id: 'client_test_123',
    profesional_id: 'prof_test_123',
    descripcion: 'Servicio de prueba',
    estado: 'PENDIENTE',
    es_urgente: false,
    fecha_solicitud: new Date(),
    ...overrides
  }),

  payment: (overrides = {}) => ({
    id: 'payment_test_123',
    servicio_id: 'service_test_123',
    cliente_id: 'client_test_123',
    profesional_id: 'prof_test_123',
    monto_total: 1000,
    comision_plataforma: 0,
    monto_profesional: 1000,
    estado: 'pendiente',
    metodo_pago: 'mercado_pago',
    mercado_pago_id: 'mp_pref_123',
    ...overrides
  }),

  commissionSetting: (overrides = {}) => ({
    id: 'commission_test_123',
    nombre: 'Comisión Test 8%',
    porcentaje: 8.0,
    tipo_servicio: null,
    descripcion: 'Configuración de prueba',
    activo: true,
    creado_por: 'admin_test_123',
    fecha_creacion: new Date(),
    ...overrides
  }),

  payout: (overrides = {}) => ({
    id: 'payout_test_123',
    profesional_id: 'prof_test_123',
    servicio_id: 'service_test_123',
    monto_bruto: 1000,
    comision_plataforma: 80,
    monto_neto: 920,
    metodo_pago: 'bank_transfer',
    estado: 'pendiente',
    creado_en: new Date(),
    ...overrides
  }),

  webhookPayload: (overrides = {}) => ({
    type: 'payment',
    data: {
      id: 'mp_payment_123',
      status: 'approved',
      status_detail: 'accredited',
      transaction_amount: 1000,
      external_reference: 'service_test_123',
      payment_method_id: 'visa',
      payment_type_id: 'credit_card',
      date_approved: new Date().toISOString(),
      ...overrides.data
    },
    ...overrides
  }),

  hmacSignature: (payload, secret = 'test_webhook_secret') => {
    const crypto = require('crypto');
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${JSON.stringify(payload)}`)
      .digest('hex');

    return {
      signature: `ts=${timestamp},v1=${signature}`,
      timestamp,
      signatureOnly: signature
    };
  }
};

// HTTP request helpers for integration tests
const createAuthenticatedRequest = (token) => {
  return {
    set: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    expect: jest.fn().mockReturnThis()
  };
};

// Database cleanup helpers
const cleanupTestData = async (prisma) => {
  const tables = [
    'transactions_log',
    'payouts',
    'pagos',
    'servicios',
    'commission_settings',
    'perfiles_profesionales',
    'usuarios'
  ];

  for (const table of tables) {
    try {
      await prisma[table].deleteMany({
        where: {
          id: { contains: 'test_' }
        }
      });
    } catch (error) {
      console.warn(`Warning: Could not cleanup ${table}:`, error.message);
    }
  }
};

module.exports = {
  createMercadoPagoMocks,
  createPrismaMocks,
  createServiceMocks,
  generateTestData,
  createAuthenticatedRequest,
  cleanupTestData
};
