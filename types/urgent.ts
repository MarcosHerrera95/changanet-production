// Urgent Services Types for Changánet

export interface UrgentRequest {
  id: string
  client_id: string
  description: string
  latitude: number
  longitude: number
  urgency_level: 'low' | 'medium' | 'high'
  special_requirements?: string
  estimated_budget?: number
  service_category?: string
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'expired'
  created_at: string
  updated_at: string
  client: {
    id: string
    nombre: string
    email: string
  }
  candidates?: UrgentCandidate[]
  assignments?: UrgentAssignment[]
}

export interface UrgentCandidate {
  id: string
  urgent_request_id: string
  professional_id: string
  status: 'available' | 'accepted' | 'declined' | 'expired'
  proposed_price?: number
  notes?: string
  responded_at?: string
  professional: {
    id: string
    nombre: string
    especialidad?: string
    telefono?: string
    avatar?: string
  }
}

export interface UrgentAssignment {
  id: string
  urgent_request_id: string
  professional_id: string
  assigned_at: string
  status: 'active' | 'completed' | 'cancelled'
  final_price?: number
  notes?: string
  professional: {
    id: string
    nombre: string
    telefono: string
    email: string
  }
}

export interface UrgentPricingRule {
  id: string
  service_category: string
  urgency_level: 'low' | 'medium' | 'high'
  base_price: number
  urgency_multiplier: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface NearbyUrgentRequest extends UrgentRequest {
  distance: number // in km
  estimated_arrival?: number // in minutes
}

export interface GeoScanResult {
  professionals_found: number
  radius_searched: number
  service_category?: string
  professionals: Array<{
    id: string
    nombre: string
    especialidad: string
    distance: number
    estimated_arrival: number
    rating?: number
  }>
}

// Form Types
export interface UrgentRequestFormData {
  description: string
  latitude: number
  longitude: number
  urgency_level: 'low' | 'medium' | 'high'
  special_requirements?: string
  estimated_budget?: number
  service_category?: string
}

export interface UrgentResponseFormData {
  proposed_price?: number
  notes?: string
}

export interface PricingRuleFormData {
  service_category: string
  urgency_level: 'low' | 'medium' | 'high'
  base_price: number
  urgency_multiplier?: number
}

// API Response Types
export interface UrgentApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

export interface UrgentPaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Notification Types
export interface UrgentNotification {
  type: 'urgent_request_created' | 'urgent_assigned' | 'urgent_accepted' | 'urgent_rejected' | 'urgent_cancelled' | 'urgent_completed'
  requestId: string
  message: string
  timestamp: string
  data?: Record<string, any>
}

// WebSocket Events
export interface UrgentWebSocketEvent {
  type: 'urgent_request_update' | 'new_urgent_request' | 'urgent_assigned' | 'urgent_status_change'
  data: UrgentRequest | NearbyUrgentRequest
}

// Location Types
export interface LocationData {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp?: number
}

export interface LocationError {
  code: number
  message: string
}