/**
 * Comprehensive unit tests for PaymentCheckout component
 * Covers: Form validation, commission calculation, payment flow,
 * error handling, accessibility, and edge cases
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentCheckout } from '../PaymentCheckout'
import { paymentsApi, commissionsApi } from '@/lib/api'

// Mock APIs
jest.mock('@/lib/api', () => ({
  paymentsApi: {
    createPreference: jest.fn(),
  },
  commissionsApi: {
    calculateCommission: jest.fn(),
  },
}))

// Mock utilities
jest.mock('@/utils/format', () => ({
  formatCurrency: jest.fn((amount) => `$${amount.toLocaleString()}`),
  cn: jest.fn((...classes) => classes.filter(Boolean).join(' ')),
}))

// Mock window.open
const mockWindowOpen = jest.fn()
Object.defineProperty(window, 'open', {
  writable: true,
  value: mockWindowOpen,
})

describe('PaymentCheckout Component', () => {
  const mockService = {
    id: 'service-123',
    descripcion: 'Servicio de plomería',
    tipo_servicio: 'plomero',
    es_urgente: false,
    profesional: {
      id: 'prof-123',
      nombre: 'Juan Pérez',
      perfil_profesional: {
        tarifa_hora: 1500,
      },
    },
  }

  const mockCommissionResponse = {
    data: {
      success: true,
      data: {
        originalAmount: 1500,
        commissionPercentage: 8.0,
        commissionAmount: 120,
        professionalAmount: 1380,
        commissionSetting: {
          id: 'commission-1',
          nombre: 'Comisión Global',
          tipo_servicio: null,
        },
      },
    },
  }

  const mockPaymentResponse = {
    data: {
      success: true,
      data: {
        id: 'pref_123',
        init_point: 'https://mercadopago.com/pay/123',
        paymentId: 'payment-123',
      },
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockWindowOpen.mockClear()
  })

  describe('Initial Rendering', () => {
    test('renders checkout form with default values', () => {
      render(<PaymentCheckout service={mockService} />)

      expect(screen.getByText('Checkout de Pago')).toBeInTheDocument()
      expect(screen.getByDisplayValue('1500')).toBeInTheDocument()
      expect(screen.getByText('Servicio de plomería')).toBeInTheDocument()
      expect(screen.getByText('Profesional: Juan Pérez')).toBeInTheDocument()
    })

    test('renders without service prop', () => {
      render(<PaymentCheckout />)

      expect(screen.getByText('Checkout de Pago')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Ingrese el monto')).toBeInTheDocument()
    })

    test('displays urgent service indicator', () => {
      const urgentService = { ...mockService, es_urgente: true }
      render(<PaymentCheckout service={urgentService} />)

      expect(screen.getByText('⚡ Servicio urgente (+20% adicional)')).toBeInTheDocument()
    })
  })

  describe('Commission Calculation', () => {
    test('calculates commission when amount changes', async () => {
      commissionsApi.calculateCommission.mockResolvedValue(mockCommissionResponse)

      render(<PaymentCheckout service={mockService} />)

      const amountInput = screen.getByDisplayValue('1500')
      fireEvent.change(amountInput, { target: { value: '2000' } })

      await waitFor(() => {
        expect(commissionsApi.calculateCommission).toHaveBeenCalledWith(2000, 'plomero')
      })

      await waitFor(() => {
        expect(screen.getByText('Desglose del pago')).toBeInTheDocument()
        expect(screen.getByText('$1,500')).toBeInTheDocument()
        expect(screen.getByText('-$120')).toBeInTheDocument()
        expect(screen.getByText('$1,380')).toBeInTheDocument()
      })
    })

    test('handles commission calculation errors gracefully', async () => {
      commissionsApi.calculateCommission.mockRejectedValue(new Error('API Error'))

      render(<PaymentCheckout service={mockService} />)

      const amountInput = screen.getByDisplayValue('1500')
      fireEvent.change(amountInput, { target: { value: '2000' } })

      // Should not crash, commission section should not appear
      await waitFor(() => {
        expect(commissionsApi.calculateCommission).toHaveBeenCalled()
      })

      expect(screen.queryByText('Desglose del pago')).not.toBeInTheDocument()
    })

    test('does not calculate commission for invalid amounts', () => {
      render(<PaymentCheckout service={mockService} />)

      const amountInput = screen.getByDisplayValue('1500')
      fireEvent.change(amountInput, { target: { value: '0' } })

      expect(commissionsApi.calculateCommission).not.toHaveBeenCalled()
    })
  })

  describe('Form Validation', () => {
    test('validates required service ID', async () => {
      const user = userEvent.setup()
      render(<PaymentCheckout />)

      const submitButton = screen.getByRole('button', { name: /pagar con mercadopago/i })
      await user.click(submitButton)

      expect(screen.getByText('Debe seleccionar un servicio')).toBeInTheDocument()
    })

    test('validates minimum amount', async () => {
      const user = userEvent.setup()
      render(<PaymentCheckout service={mockService} />)

      const amountInput = screen.getByDisplayValue('1500')
      fireEvent.change(amountInput, { target: { value: '0' } })

      const submitButton = screen.getByRole('button', { name: /pagar con mercadopago/i })
      await user.click(submitButton)

      expect(screen.getByText('El monto debe ser mayor a 0')).toBeInTheDocument()
    })

    test('validates maximum amount', async () => {
      const user = userEvent.setup()
      render(<PaymentCheckout service={mockService} />)

      const amountInput = screen.getByDisplayValue('1500')
      fireEvent.change(amountInput, { target: { value: '2000000' } })

      const submitButton = screen.getByRole('button', { name: /pagar con mercadopago/i })
      await user.click(submitButton)

      expect(screen.getByText('Monto máximo excedido')).toBeInTheDocument()
    })

    test('validates numeric input', async () => {
      const user = userEvent.setup()
      render(<PaymentCheckout service={mockService} />)

      const amountInput = screen.getByDisplayValue('1500')
      fireEvent.change(amountInput, { target: { value: 'abc' } })

      const submitButton = screen.getByRole('button', { name: /pagar con mercadopago/i })
      await user.click(submitButton)

      // HTML5 validation should prevent submission
      expect(paymentsApi.createPreference).not.toHaveBeenCalled()
    })
  })

  describe('Payment Submission', () => {
    test('successfully creates payment preference and opens MercadoPago', async () => {
      const user = userEvent.setup()
      const mockOnSuccess = jest.fn()

      commissionsApi.calculateCommission.mockResolvedValue(mockCommissionResponse)
      paymentsApi.createPreference.mockResolvedValue(mockPaymentResponse)

      render(<PaymentCheckout service={mockService} onSuccess={mockOnSuccess} />)

      const submitButton = screen.getByRole('button', { name: /pagar con mercadopago/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(paymentsApi.createPreference).toHaveBeenCalledWith('service-123', 1500)
      })

      expect(mockWindowOpen).toHaveBeenCalledWith('https://mercadopago.com/pay/123', '_blank')
      expect(mockOnSuccess).toHaveBeenCalledWith('payment-123')
    })

    test('shows success state after payment creation', async () => {
      const user = userEvent.setup()

      commissionsApi.calculateCommission.mockResolvedValue(mockCommissionResponse)
      paymentsApi.createPreference.mockResolvedValue(mockPaymentResponse)

      render(<PaymentCheckout service={mockService} />)

      const submitButton = screen.getByRole('button', { name: /pagar con mercadopago/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Pago Iniciado')).toBeInTheDocument()
        expect(screen.getByText('Se ha abierto MercadoPago en una nueva ventana para completar el pago.')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: /reabrir mercadopago/i })).toBeInTheDocument()
    })

    test('handles payment creation errors', async () => {
      const user = userEvent.setup()

      commissionsApi.calculateCommission.mockResolvedValue(mockCommissionResponse)
      paymentsApi.createPreference.mockRejectedValue({
        response: { data: { error: 'Error de MercadoPago' } }
      })

      render(<PaymentCheckout service={mockService} />)

      const submitButton = screen.getByRole('button', { name: /pagar con mercadopago/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Error de MercadoPago')).toBeInTheDocument()
      })

      expect(submitButton).not.toBeDisabled()
    })

    test('shows loading state during submission', async () => {
      const user = userEvent.setup()

      commissionsApi.calculateCommission.mockResolvedValue(mockCommissionResponse)
      paymentsApi.createPreference.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockPaymentResponse), 100))
      )

      render(<PaymentCheckout service={mockService} />)

      const submitButton = screen.getByRole('button', { name: /pagar con mercadopago/i })
      await user.click(submitButton)

      expect(screen.getByText('Procesando...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      await waitFor(() => {
        expect(screen.queryByText('Procesando...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Success State', () => {
    test('allows reopening MercadoPago checkout', async () => {
      commissionsApi.calculateCommission.mockResolvedValue(mockCommissionResponse)
      paymentsApi.createPreference.mockResolvedValue(mockPaymentResponse)

      render(<PaymentCheckout service={mockService} />)

      // Trigger successful payment creation
      const submitButton = screen.getByRole('button', { name: /pagar con mercadopago/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Pago Iniciado')).toBeInTheDocument()
      })

      const reopenButton = screen.getByRole('button', { name: /reabrir mercadopago/i })
      fireEvent.click(reopenButton)

      expect(mockWindowOpen).toHaveBeenCalledTimes(2)
      expect(mockWindowOpen).toHaveBeenLastCalledWith('https://mercadopago.com/pay/123', '_blank')
    })

    test('calls onCancel when volver button is clicked', async () => {
      const mockOnCancel = jest.fn()

      commissionsApi.calculateCommission.mockResolvedValue(mockCommissionResponse)
      paymentsApi.createPreference.mockResolvedValue(mockPaymentResponse)

      render(<PaymentCheckout service={mockService} onCancel={mockOnCancel} />)

      // Trigger successful payment creation
      const submitButton = screen.getByRole('button', { name: /pagar con mercadopago/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Pago Iniciado')).toBeInTheDocument()
      })

      const volverButton = screen.getByRole('button', { name: /volver/i })
      fireEvent.click(volverButton)

      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    test('has proper ARIA labels and roles', () => {
      render(<PaymentCheckout service={mockService} />)

      const amountInput = screen.getByLabelText('Monto a pagar')
      expect(amountInput).toHaveAttribute('type', 'number')
      expect(amountInput).toHaveAttribute('id', 'amount')
    })

    test('shows error messages with proper styling', async () => {
      const user = userEvent.setup()
      render(<PaymentCheckout />)

      const submitButton = screen.getByRole('button', { name: /pagar con mercadopago/i })
      await user.click(submitButton)

      const errorMessage = screen.getByText('Debe seleccionar un servicio')
      expect(errorMessage).toHaveClass('text-danger-600')
    })

    test('disables form during submission for accessibility', async () => {
      commissionsApi.calculateCommission.mockResolvedValue(mockCommissionResponse)
      paymentsApi.createPreference.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockPaymentResponse), 100))
      )

      render(<PaymentCheckout service={mockService} />)

      const submitButton = screen.getByRole('button', { name: /pagar con mercadopago/i })
      const amountInput = screen.getByDisplayValue('1500')

      fireEvent.click(submitButton)

      expect(submitButton).toBeDisabled()
      expect(amountInput).toBeDisabled()
    })
  })

  describe('Edge Cases', () => {
    test('handles service prop changes', () => {
      const { rerender } = render(<PaymentCheckout service={mockService} />)

      expect(screen.getByDisplayValue('1500')).toBeInTheDocument()

      const newService = {
        ...mockService,
        id: 'service-456',
        profesional: {
          ...mockService.profesional,
          perfil_profesional: {
            tarifa_hora: 2000,
          },
        },
      }

      rerender(<PaymentCheckout service={newService} />)

      expect(screen.getByDisplayValue('2000')).toBeInTheDocument()
    })

    test('handles decimal amounts', async () => {
      commissionsApi.calculateCommission.mockResolvedValue({
        data: {
          success: true,
          data: {
            originalAmount: 1500.50,
            commissionPercentage: 8.0,
            commissionAmount: 120.04,
            professionalAmount: 1380.46,
            commissionSetting: {
              id: 'commission-1',
              nombre: 'Comisión Global',
              tipo_servicio: null,
            },
          },
        },
      })

      render(<PaymentCheckout service={mockService} />)

      const amountInput = screen.getByDisplayValue('1500')
      fireEvent.change(amountInput, { target: { value: '1500.50' } })

      await waitFor(() => {
        expect(screen.getByText('$1,500.5')).toBeInTheDocument()
      })
    })

    test('handles very large amounts', async () => {
      commissionsApi.calculateCommission.mockResolvedValue({
        data: {
          success: true,
          data: {
            originalAmount: 999999,
            commissionPercentage: 8.0,
            commissionAmount: 79999.92,
            professionalAmount: 919999.08,
            commissionSetting: {
              id: 'commission-1',
              nombre: 'Comisión Global',
              tipo_servicio: null,
            },
          },
        },
      })

      render(<PaymentCheckout service={mockService} />)

      const amountInput = screen.getByDisplayValue('1500')
      fireEvent.change(amountInput, { target: { value: '999999' } })

      await waitFor(() => {
        expect(screen.getByText('$999,999')).toBeInTheDocument()
      })
    })

    test('handles API failures gracefully', async () => {
      const user = userEvent.setup()

      commissionsApi.calculateCommission.mockRejectedValue(new Error('Network Error'))
      paymentsApi.createPreference.mockRejectedValue(new Error('Server Error'))

      render(<PaymentCheckout service={mockService} />)

      const submitButton = screen.getByRole('button', { name: /pagar con mercadopago/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Error interno del servidor')).toBeInTheDocument()
      })
    })

    test('prevents multiple simultaneous submissions', async () => {
      const user = userEvent.setup()

      commissionsApi.calculateCommission.mockResolvedValue(mockCommissionResponse)
      paymentsApi.createPreference.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockPaymentResponse), 500))
      )

      render(<PaymentCheckout service={mockService} />)

      const submitButton = screen.getByRole('button', { name: /pagar con mercadopago/i })

      // Click multiple times quickly
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      expect(paymentsApi.createPreference).toHaveBeenCalledTimes(1)
    })
  })
})