// Admin API Service for ChangAnet
// Handles all API calls for admin functionality with robust error handling

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

class AdminApiService {
  constructor() {
    this.baseURL = API_BASE_URL
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  // Utility method to get auth headers
  getAuthHeaders() {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Generic API call method with error handling
  async apiCall(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      headers: {
        ...this.defaultHeaders,
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        // Handle specific error codes
        switch (response.status) {
          case 401:
            // Token expired or invalid
            localStorage.removeItem('adminToken')
            localStorage.removeItem('token')
            window.location.href = '/admin/login'
            throw new Error('Sesión expirada. Redirigiendo al login...')
          case 403:
            throw new Error('No tienes permisos para realizar esta acción')
          case 404:
            throw new Error('Recurso no encontrado')
          case 422:
            // Validation errors
            const validationErrors = data.errors || data.message
            throw new Error(typeof validationErrors === 'string' ? validationErrors : 'Datos inválidos')
          case 429:
            throw new Error('Demasiadas solicitudes. Inténtalo más tarde')
          case 500:
            throw new Error('Error interno del servidor. Inténtalo más tarde')
          default:
            throw new Error(data.message || `Error ${response.status}: ${response.statusText}`)
        }
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
        pagination: data.pagination,
      }
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Error de conexión. Verifica tu conexión a internet')
      }

      throw error
    }
  }

  // Dashboard APIs
  async getDashboardStats() {
    return this.apiCall('/admin/dashboard/stats')
  }

  async getDashboardData() {
    return this.apiCall('/admin/dashboard')
  }

  async getRecentActivity(limit = 10) {
    return this.apiCall(`/admin/dashboard/activity?limit=${limit}`)
  }

  // User Management APIs
  async getUsers(filters = {}) {
    const queryParams = new URLSearchParams()

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v))
        } else {
          queryParams.append(key, value)
        }
      }
    })

    const queryString = queryParams.toString()
    return this.apiCall(`/admin/users${queryString ? `?${queryString}` : ''}`)
  }

  async getUserById(id) {
    return this.apiCall(`/admin/users/${id}`)
  }

  async createUser(userData) {
    return this.apiCall('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async updateUser(id, userData) {
    return this.apiCall(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    })
  }

  async deleteUser(id) {
    return this.apiCall(`/admin/users/${id}`, {
      method: 'DELETE',
    })
  }

  async suspendUser(id, reason) {
    return this.apiCall(`/admin/users/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }

  async activateUser(id) {
    return this.apiCall(`/admin/users/${id}/activate`, {
      method: 'POST',
    })
  }

  async banUser(id, reason) {
    return this.apiCall(`/admin/users/${id}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }

  async unbanUser(id) {
    return this.apiCall(`/admin/users/${id}/unban`, {
      method: 'POST',
    })
  }

  // Category Management APIs
  async getCategories() {
    return this.apiCall('/admin/categories')
  }

  async getCategoryById(id) {
    return this.apiCall(`/admin/categories/${id}`)
  }

  async createCategory(categoryData) {
    return this.apiCall('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    })
  }

  async updateCategory(id, categoryData) {
    return this.apiCall(`/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    })
  }

  async deleteCategory(id) {
    return this.apiCall(`/admin/categories/${id}`, {
      method: 'DELETE',
    })
  }

  async reorderCategories(orderData) {
    return this.apiCall('/admin/categories/reorder', {
      method: 'POST',
      body: JSON.stringify(orderData),
    })
  }

  // Service Management APIs
  async getServices(filters = {}) {
    const queryParams = new URLSearchParams()

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v))
        } else {
          queryParams.append(key, value)
        }
      }
    })

    const queryString = queryParams.toString()
    return this.apiCall(`/admin/services${queryString ? `?${queryString}` : ''}`)
  }

  async getServiceById(id) {
    return this.apiCall(`/admin/services/${id}`)
  }

  async updateServiceStatus(id, status, reason = '') {
    return this.apiCall(`/admin/services/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason }),
    })
  }

  async assignServiceToProfessional(serviceId, professionalId) {
    return this.apiCall(`/admin/services/${serviceId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ professional_id: professionalId }),
    })
  }

  // Payment Management APIs
  async getPayments(filters = {}) {
    const queryParams = new URLSearchParams()

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v))
        } else {
          queryParams.append(key, value)
        }
      }
    })

    const queryString = queryParams.toString()
    return this.apiCall(`/admin/payments${queryString ? `?${queryString}` : ''}`)
  }

  async getPaymentById(id) {
    return this.apiCall(`/admin/payments/${id}`)
  }

  async processPaymentRefund(paymentId, amount, reason) {
    return this.apiCall(`/admin/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
    })
  }

  async releasePayment(paymentId) {
    return this.apiCall(`/admin/payments/${paymentId}/release`, {
      method: 'POST',
    })
  }

  // Payout Management APIs
  async getPayouts(filters = {}) {
    const queryParams = new URLSearchParams()

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v))
        } else {
          queryParams.append(key, value)
        }
      }
    })

    const queryString = queryParams.toString()
    return this.apiCall(`/admin/payouts${queryString ? `?${queryString}` : ''}`)
  }

  async processPayout(payoutId) {
    return this.apiCall(`/admin/payouts/${payoutId}/process`, {
      method: 'POST',
    })
  }

  async cancelPayout(payoutId, reason) {
    return this.apiCall(`/admin/payouts/${payoutId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }

  // Urgent Services APIs
  async getUrgentRequests(filters = {}) {
    const queryParams = new URLSearchParams()

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v))
        } else {
          queryParams.append(key, value)
        }
      }
    })

    const queryString = queryParams.toString()
    return this.apiCall(`/admin/urgent${queryString ? `?${queryString}` : ''}`)
  }

  async getUrgentRequestById(id) {
    return this.apiCall(`/admin/urgent/${id}`)
  }

  async assignUrgentRequest(requestId, professionalId) {
    return this.apiCall(`/admin/urgent/${requestId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ professional_id: professionalId }),
    })
  }

  async updateUrgentPriority(requestId, priority) {
    return this.apiCall(`/admin/urgent/${requestId}/priority`, {
      method: 'PUT',
      body: JSON.stringify({ priority }),
    })
  }

  async cancelUrgentRequest(requestId, reason) {
    return this.apiCall(`/admin/urgent/${requestId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }

  // Commission Settings APIs
  async getCommissionSettings() {
    return this.apiCall('/admin/commissions')
  }

  async updateCommissionSettings(settings) {
    return this.apiCall('/admin/commissions', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  }

  async createCommissionRule(rule) {
    return this.apiCall('/admin/commissions/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    })
  }

  async updateCommissionRule(ruleId, rule) {
    return this.apiCall(`/admin/commissions/rules/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify(rule),
    })
  }

  async deleteCommissionRule(ruleId) {
    return this.apiCall(`/admin/commissions/rules/${ruleId}`, {
      method: 'DELETE',
    })
  }

  // Audit Log APIs
  async getAuditLogs(filters = {}) {
    const queryParams = new URLSearchParams()

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v))
        } else {
          queryParams.append(key, value)
        }
      }
    })

    const queryString = queryParams.toString()
    return this.apiCall(`/admin/audit${queryString ? `?${queryString}` : ''}`)
  }

  // System Settings APIs
  async getSystemSettings() {
    return this.apiCall('/admin/settings')
  }

  async updateSystemSettings(settings) {
    return this.apiCall('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  }

  // File Upload APIs
  async uploadFile(file, type = 'general') {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    return this.apiCall('/admin/upload', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        // Don't set Content-Type, let browser set it with boundary
      },
      body: formData,
    })
  }

  // Bulk Operations APIs
  async bulkUpdateUsers(userIds, updates) {
    return this.apiCall('/admin/users/bulk', {
      method: 'POST',
      body: JSON.stringify({ userIds, updates }),
    })
  }

  async bulkDeleteUsers(userIds) {
    return this.apiCall('/admin/users/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    })
  }

  async bulkUpdateServices(serviceIds, updates) {
    return this.apiCall('/admin/services/bulk', {
      method: 'POST',
      body: JSON.stringify({ serviceIds, updates }),
    })
  }

  // Export APIs
  async exportData(type, filters = {}) {
    const queryParams = new URLSearchParams({ type, ...filters })
    const queryString = queryParams.toString()

    return this.apiCall(`/admin/export?${queryString}`)
  }

  // Real-time subscription (if WebSocket is available)
  subscribeToUpdates(callback) {
    // This would integrate with WebSocket service
    // For now, return a mock subscription
    console.log('Admin real-time updates subscription requested')
    return {
      unsubscribe: () => {
        console.log('Admin real-time updates unsubscribed')
      }
    }
  }
}

// Create and export singleton instance
const adminApiService = new AdminApiService()
export default adminApiService

// Export class for testing purposes
export { AdminApiService }