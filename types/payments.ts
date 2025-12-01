// Payment and Commission Types for Changánet

export interface User {
  id: string
  nombre: string
  email: string
  rol: 'cliente' | 'profesional' | 'admin'
  telefono?: string
  avatar?: string
}

export interface Service {
  id: string
  descripcion: string
  cliente_id: string
  profesional_id: string
  estado: string
  es_urgente: boolean
  tarifa_hora?: number
  cliente: User
  profesional: {
    id: string
    nombre: string
    email: string
    perfil_profesional?: {
      tarifa_hora: number
    }
  }
}

export interface Payment {
  id: string
  servicio_id: string
  cliente_id: string
  profesional_id: string
  monto_total: number
  comision_plataforma: number
  monto_profesional: number
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'liberado' | 'cancelado'
  mercado_pago_preference_id?: string
  creado_en: string
  actualizado_en: string
  servicio: Service
  commission_setting?: CommissionSetting
  payouts?: Payout[]
}

export interface CommissionSetting {
  id: string
  nombre: string
  porcentaje: number
  tipo_servicio?: string
  descripcion?: string
  activo: boolean
  fecha_creacion: string
  creado_por: string
}

export interface Payout {
  id: string
  profesional_id: string
  servicio_id?: string
  monto_bruto: number
  comision_plataforma: number
  monto_neto: number
  metodo_pago: string
  estado: 'pendiente' | 'procesando' | 'completado' | 'fallido'
  referencia_pago?: string
  fecha_pago?: string
  procesado_en?: string
  creado_en: string
  profesional: {
    nombre: string
    email: string
  }
  servicio?: {
    descripcion: string
    cliente: {
      nombre: string
    }
  }
}

export interface PaymentPreference {
  id: string
  init_point: string
  sandbox_init_point: string
  operation_type: string
  items: PaymentItem[]
  payer: PayerInfo
  back_urls?: BackUrls
  auto_return?: string
  payment_methods?: PaymentMethods
  client_id?: string
  simulated?: boolean
}

export interface PaymentItem {
  id: string
  title: string
  description: string
  quantity: number
  unit_price: number
  currency_id: string
}

export interface PayerInfo {
  name: string
  surname: string
  email: string
}

export interface BackUrls {
  success: string
  failure: string
  pending: string
}

export interface PaymentMethods {
  excluded_payment_methods: Array<{ id: string }>
  excluded_payment_types: Array<{ id: string }>
  installments: number
}

export interface PaymentStatus {
  id: string
  status: string
  status_detail: string
  payment_method_id?: string
  payment_type_id?: string
  transaction_amount: number
  installments?: number
  date_created: string
  date_approved?: string
  date_last_updated: string
  metadata?: Record<string, any>
}

export interface CommissionCalculation {
  originalAmount: number
  commissionPercentage: number
  commissionAmount: number
  professionalAmount: number
  commissionSetting: {
    id: string | null
    nombre: string
    tipo_servicio?: string
  }
}

export interface CommissionStats {
  totalPayments: number
  totalCommission: number
  totalProfessionalPayments: number
  activeCommissionSettings: number
  averageCommissionRate: number
}

export interface PayoutStats {
  totalPayouts: number
  totalPaid: number
  totalCommission: number
  pendingPayouts: number
  latestPayout?: {
    date: string
    amount: number
  }
  averagePayout: number
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Form Types
export interface PaymentFormData {
  serviceId: string
  amount?: number
}

export interface CommissionFormData {
  nombre: string
  porcentaje: number
  tipo_servicio?: string
  descripcion?: string
}

export interface WithdrawalFormData {
  amount: number
  bankDetails: {
    bankName: string
    accountNumber: string
    accountHolder: string
    cbu?: string
  }
}

// Notification Types
export interface PaymentNotification {
  type: 'payment_created' | 'payment_approved' | 'payment_rejected' | 'funds_released' | 'payout_processed'
  paymentId: string
  amount: number
  message: string
  timestamp: string
}