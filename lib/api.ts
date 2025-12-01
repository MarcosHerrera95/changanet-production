import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { ApiResponse, PaginatedResponse } from '@/types/payments'

// Create axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Generic API methods
export const apiClient = {
  get: <T>(url: string, params?: Record<string, any>): Promise<AxiosResponse<ApiResponse<T>>> => {
    return api.get(url, { params })
  },

  post: <T>(
    url: string,
    data?: any,
    config?: any
  ): Promise<AxiosResponse<ApiResponse<T>>> => {
    return api.post(url, data, config)
  },

  put: <T>(url: string, data?: any): Promise<AxiosResponse<ApiResponse<T>>> => {
    return api.put(url, data)
  },

  delete: <T>(url: string): Promise<AxiosResponse<ApiResponse<T>>> => {
    return api.delete(url)
  },

  patch: <T>(url: string, data?: any): Promise<AxiosResponse<ApiResponse<T>>> => {
    return api.patch(url, data)
  },
}

// Payment-specific API methods
export const paymentsApi = {
  // Client payments
  createPreference: (serviceId: string, amount?: number) => {
    return apiClient.post('/payments/create-preference', { serviceId, amount })
  },

  getClientPayments: (clientId: string) => {
    return apiClient.get(`/payments/${clientId}`)
  },

  getPaymentStatus: (paymentId: string) => {
    return apiClient.get(`/payments/status/${paymentId}`)
  },

  generateReceipt: (paymentId: string) => {
    return apiClient.get(`/payments/receipt/${paymentId}`)
  },

  downloadReceipt: (fileName: string) => {
    return api.get(`/payments/receipts/${fileName}`, { responseType: 'blob' })
  },

  // Professional payments
  getProfessionalPayments: (professionalId: string) => {
    return apiClient.get(`/payments/received/${professionalId}`)
  },

  withdrawFunds: (amount: number, bankDetails: any) => {
    return apiClient.post('/payments/withdraw', { amount, bankDetails })
  },

  // Admin payments
  getAllPayments: (params?: {
    status?: string
    clientId?: string
    professionalId?: string
    dateFrom?: string
    dateTo?: string
    page?: number
    limit?: number
  }) => {
    return apiClient.get('/admin/payments', params)
  },

  releaseFunds: (paymentId: string, serviceId: string) => {
    return apiClient.post('/admin/payments/release-funds', { paymentId, serviceId })
  },
}

// Commission API methods
export const commissionsApi = {
  getSettings: () => {
    return apiClient.get('/commissions')
  },

  getApplicableCommission: (serviceType?: string) => {
    return apiClient.get('/commissions/applicable', { serviceType })
  },

  createSetting: (data: any) => {
    return apiClient.post('/commissions', data)
  },

  updateSetting: (settingId: string, data: any) => {
    return apiClient.put(`/commissions/${settingId}`, data)
  },

  deactivateSetting: (settingId: string) => {
    return apiClient.delete(`/commissions/${settingId}`)
  },

  calculateCommission: (amount: number, serviceType?: string) => {
    return apiClient.post('/commissions/calculate', { amount, serviceType })
  },

  getStats: () => {
    return apiClient.get('/commissions/stats')
  },

  updateGlobalCommission: (percentage: number, minimumFee?: number) => {
    return apiClient.post('/admin/commission/update', { percentage, minimumFee })
  },
}

// WebSocket connection for real-time updates
export class PaymentWebSocket {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 3000

  connect(userId: string) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
    this.ws = new WebSocket(`${wsUrl}?userId=${userId}`)

    this.ws.onopen = () => {
      console.log('Payment WebSocket connected')
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handleMessage(data)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    this.ws.onclose = () => {
      console.log('Payment WebSocket disconnected')
      this.attemptReconnect(userId)
    }

    this.ws.onerror = (error) => {
      console.error('Payment WebSocket error:', error)
    }
  }

  private attemptReconnect(userId: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

      setTimeout(() => {
        this.connect(userId)
      }, this.reconnectInterval)
    }
  }

  private handleMessage(data: any) {
    // Handle different types of payment notifications
    switch (data.type) {
      case 'payment_status_update':
        // Emit custom event for payment status updates
        window.dispatchEvent(new CustomEvent('paymentStatusUpdate', { detail: data }))
        break
      case 'payout_processed':
        window.dispatchEvent(new CustomEvent('payoutProcessed', { detail: data }))
        break
      case 'commission_updated':
        window.dispatchEvent(new CustomEvent('commissionUpdated', { detail: data }))
        break
      default:
        console.log('Unknown WebSocket message type:', data.type)
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }
}

export const paymentWebSocket = new PaymentWebSocket()