'use client'

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import {
  AdminContextState,
  AdminContextActions,
  AdminFilter,
  AdminViewType,
  AdminApiResponse,
  AdminNotification
} from '@/types/admin'

// Action types
type AdminAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SUCCESS'; payload: string | null }
  | { type: 'UPDATE_FILTERS'; payload: { view: string; filters: AdminFilter } }
  | { type: 'SET_SELECTED_ITEMS'; payload: any[] }
  | { type: 'SET_CURRENT_VIEW'; payload: string }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'ADD_NOTIFICATION'; payload: AdminNotification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }

// Initial state
const initialState: AdminContextState & { notifications: AdminNotification[] } = {
  loading: false,
  error: null,
  success: null,
  filters: {},
  selectedItems: [],
  currentView: 'dashboard',
  notifications: []
}

// Reducer
function adminReducer(
  state: AdminContextState & { notifications: AdminNotification[] },
  action: AdminAction
): AdminContextState & { notifications: AdminNotification[] } {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, success: null }
    case 'SET_SUCCESS':
      return { ...state, success: action.payload, error: null }
    case 'UPDATE_FILTERS':
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.view]: action.payload.filters
        }
      }
    case 'SET_SELECTED_ITEMS':
      return { ...state, selectedItems: action.payload }
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.payload }
    case 'CLEAR_MESSAGES':
      return { ...state, error: null, success: null }
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications.slice(0, 9)] // Keep only 10 notifications
      }
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      }
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] }
    default:
      return state
  }
}

// Context
const AdminContext = createContext<{
  state: AdminContextState & { notifications: AdminNotification[] }
  actions: AdminContextActions & {
    addNotification: (notification: Omit<AdminNotification, 'id' | 'timestamp'>) => void
    removeNotification: (id: string) => void
    clearNotifications: () => void
  }
} | null>(null)

// Provider component
export function AdminProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(adminReducer, initialState)

  // Actions
  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading })
  }, [])

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error })
  }, [])

  const setSuccess = useCallback((message: string | null) => {
    dispatch({ type: 'SET_SUCCESS', payload: message })
  }, [])

  const updateFilters = useCallback((view: string, filters: AdminFilter) => {
    dispatch({ type: 'UPDATE_FILTERS', payload: { view, filters } })
  }, [])

  const setSelectedItems = useCallback((items: any[]) => {
    dispatch({ type: 'SET_SELECTED_ITEMS', payload: items })
  }, [])

  const setCurrentView = useCallback((view: string) => {
    dispatch({ type: 'SET_CURRENT_VIEW', payload: view })
  }, [])

  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' })
  }, [])

  const addNotification = useCallback((notification: Omit<AdminNotification, 'id' | 'timestamp'>) => {
    const newNotification: AdminNotification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    }
    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification })
  }, [])

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id })
  }, [])

  const clearNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' })
  }, [])

  const contextValue = {
    state,
    actions: {
      setLoading,
      setError,
      setSuccess,
      updateFilters,
      setSelectedItems,
      setCurrentView,
      clearMessages,
      addNotification,
      removeNotification,
      clearNotifications
    }
  }

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  )
}

// Hook to use the context
export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}

// Higher-order component for admin pages
export function withAdmin<T extends {}>(Component: React.ComponentType<T>) {
  return function AdminWrappedComponent(props: T) {
    return (
      <AdminProvider>
        <Component {...props} />
      </AdminProvider>
    )
  }
}

// Utility hooks
export function useAdminFilters(view: string) {
  const { state, actions } = useAdmin()
  const filters = state.filters[view] || {}

  const updateFilters = useCallback((newFilters: Partial<AdminFilter>) => {
    actions.updateFilters(view, { ...filters, ...newFilters })
  }, [view, filters, actions])

  const clearFilters = useCallback(() => {
    actions.updateFilters(view, {})
  }, [view, actions])

  return { filters, updateFilters, clearFilters }
}

export function useAdminLoading() {
  const { state, actions } = useAdmin()
  return {
    loading: state.loading,
    setLoading: actions.setLoading
  }
}

export function useAdminMessages() {
  const { state, actions } = useAdmin()
  return {
    error: state.error,
    success: state.success,
    setError: actions.setError,
    setSuccess: actions.setSuccess,
    clearMessages: actions.clearMessages
  }
}

export function useAdminNotifications() {
  const { state, actions } = useAdmin()
  return {
    notifications: state.notifications,
    addNotification: actions.addNotification,
    removeNotification: actions.removeNotification,
    clearNotifications: actions.clearNotifications
  }
}

// API wrapper with error handling
export async function adminApiCall<T>(
  apiCall: () => Promise<AdminApiResponse<T>>,
  options: {
    setLoading?: boolean
    showSuccessMessage?: boolean
    successMessage?: string
  } = {}
): Promise<AdminApiResponse<T> | null> {
  const { setLoading = true, showSuccessMessage = false, successMessage } = options

  try {
    if (setLoading) {
      // This would need to be called from a component with access to the context
      // For now, we'll handle this in the components that use this function
    }

    const response = await apiCall()

    if (!response.success) {
      throw new Error(response.error || 'Error en la operación')
    }

    if (showSuccessMessage && successMessage) {
      // This would also need context access
    }

    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    // Error handling would also need context access
    return null
  }
}