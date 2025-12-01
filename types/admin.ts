// Admin Module Types for ChangAnet

export interface AdminUser {
  id: string
  nombre: string
  email: string
  rol: 'cliente' | 'profesional' | 'admin'
  telefono?: string
  avatar?: string
  fecha_registro: string
  ultimo_acceso?: string
  estado: 'activo' | 'inactivo' | 'suspendido' | 'baneado'
  verificado: boolean
  perfil_profesional?: {
    id: string
    especialidades: string[]
    tarifa_hora: number
    calificacion_promedio: number
    total_resenas: number
  }
  estadisticas?: {
    servicios_completados: number
    servicios_activos: number
    ingresos_totales: number
  }
}

export interface AdminCategory {
  id: string
  nombre: string
  descripcion?: string
  icono?: string
  color?: string
  activo: boolean
  orden: number
  fecha_creacion: string
  servicios_count: number
  profesionales_count: number
  subcategories?: AdminCategory[]
}

export interface AdminService {
  id: string
  descripcion: string
  cliente_id: string
  profesional_id: string
  categoria_id: string
  estado: 'pendiente' | 'aceptado' | 'en_progreso' | 'completado' | 'cancelado'
  es_urgente: boolean
  tarifa_hora: number
  horas_estimadas?: number
  monto_total: number
  fecha_creacion: string
  fecha_actualizacion: string
  cliente: AdminUser
  profesional: AdminUser
  categoria: AdminCategory
  ubicacion?: {
    latitud: number
    longitud: number
    direccion: string
  }
}

export interface AdminUrgentRequest {
  id: string
  servicio_id: string
  cliente_id: string
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  tiempo_maximo_respuesta: number // minutos
  precio_dinamico: number
  estado: 'pendiente' | 'asignado' | 'en_progreso' | 'completado' | 'expirado'
  fecha_creacion: string
  fecha_asignacion?: string
  fecha_completado?: string
  profesional_asignado?: AdminUser
  servicio: AdminService
  notificaciones_enviadas: number
}

export interface AdminStats {
  total_usuarios: number
  usuarios_activos: number
  total_servicios: number
  servicios_activos: number
  servicios_urgentes: number
  ingresos_totales: number
  comision_total: number
  pagos_pendientes: number
  categorias_activas: number
  profesionales_verificados: number
}

export interface AdminDashboardData {
  stats: AdminStats
  recent_users: AdminUser[]
  recent_services: AdminService[]
  urgent_requests: AdminUrgentRequest[]
  payments_pending: any[]
  charts_data: {
    users_growth: ChartDataPoint[]
    services_distribution: ChartDataPoint[]
    revenue_trend: ChartDataPoint[]
    categories_usage: ChartDataPoint[]
  }
}

export interface ChartDataPoint {
  label: string
  value: number
  color?: string
  date?: string
}

export interface AdminFilter {
  search?: string
  status?: string[]
  category?: string[]
  dateRange?: {
    start: string
    end: string
  }
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface AdminTableColumn {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  width?: string
  render?: (value: any, row: any) => React.ReactNode
}

export interface AdminAction {
  id: string
  label: string
  icon?: string
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  onClick: (item: any) => void
  disabled?: (item: any) => boolean
  confirmMessage?: string
}

export interface AdminContextState {
  loading: boolean
  error: string | null
  success: string | null
  filters: Record<string, AdminFilter>
  selectedItems: any[]
  currentView: string
}

export interface AdminContextActions {
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSuccess: (message: string | null) => void
  updateFilters: (view: string, filters: AdminFilter) => void
  setSelectedItems: (items: any[]) => void
  setCurrentView: (view: string) => void
  clearMessages: () => void
}

export interface AdminApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface AdminFormData {
  [key: string]: any
}

export interface AdminModalConfig {
  isOpen: boolean
  title: string
  content: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  onClose: () => void
  onConfirm?: () => void
  confirmText?: string
  cancelText?: string
  showConfirmButton?: boolean
}

export interface AdminNotification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
  actionText?: string
}

export interface AdminAuditLog {
  id: string
  admin_id: string
  action: string
  entity_type: string
  entity_id: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string
  user_agent?: string
  timestamp: string
  admin: AdminUser
}

// Form validation types
export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => boolean | string
}

export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'date' | 'file'
  placeholder?: string
  validation?: ValidationRule
  options?: Array<{ value: string | number; label: string }>
  disabled?: boolean
  required?: boolean
}

// Export types for use in components
export type AdminViewType = 'dashboard' | 'users' | 'categories' | 'payments' | 'urgent' | 'settings'
export type AdminUserStatus = AdminUser['estado']
export type AdminServiceStatus = AdminService['estado']
export type AdminUrgentStatus = AdminUrgentRequest['estado']