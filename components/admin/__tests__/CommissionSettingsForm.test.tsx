/**
 * Comprehensive unit tests for CommissionSettingsForm component
 * Covers: CRUD operations, form validation, admin permissions,
 * error handling, and edge cases
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommissionSettingsForm } from '../CommissionSettingsForm'
import { commissionsApi } from '@/lib/api'

// Mock APIs
jest.mock('@/lib/api', () => ({
  commissionsApi: {
    getSettings: jest.fn(),
    createSetting: jest.fn(),
    updateSetting: jest.fn(),
    deactivateSetting: jest.fn(),
  },
}))

// Mock window.confirm
const mockConfirm = jest.fn()
global.confirm = mockConfirm

describe('CommissionSettingsForm Component', () => {
  const mockSettings = [
    {
      id: 'setting-1',
      nombre: 'Comisión Global',
      porcentaje: 8.0,
      tipo_servicio: null,
      descripcion: 'Configuración global por defecto',
      activo: true,
      fecha_creacion: '2024-01-01T00:00:00Z',
      creado_por: 'admin-1',
    },
    {
      id: 'setting-2',
      nombre: 'Comisión Plomeros',
      porcentaje: 9.0,
      tipo_servicio: 'plomero',
      descripcion: 'Comisión específica para plomeros',
      activo: true,
      fecha_creacion: '2024-01-02T00:00:00Z',
      creado_por: 'admin-1',
    },
  ]

  const mockApiResponse = {
    data: {
      success: true,
      data: mockSettings,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockConfirm.mockClear()
  })

  describe('Initial Loading', () => {
    test('shows loading state initially', () => {
      commissionsApi.getSettings.mockImplementation(() => new Promise(() => {}))

      render(<CommissionSettingsForm />)

      expect(screen.getByText('Cargando configuraciones...')).toBeInTheDocument()
    })

    test('loads and displays settings successfully', async () => {
      commissionsApi.getSettings.mockResolvedValue(mockApiResponse)

      render(<CommissionSettingsForm />)

      await waitFor(() => {
        expect(screen.getByText('Comisión Global')).toBeInTheDocument()
        expect(screen.getByText('Comisión Plomeros')).toBeInTheDocument()
      })

      expect(screen.getByText('8%')).toBeInTheDocument()
      expect(screen.getByText('9%')).toBeInTheDocument()
    })

    test('handles loading error', async () => {
      commissionsApi.getSettings.mockRejectedValue({
        response: { data: { error: 'Error de servidor' } }
      })

      render(<CommissionSettingsForm />)

      await waitFor(() => {
        expect(screen.getByText('Error de servidor')).toBeInTheDocument()
      })
    })
  })

  describe('Settings Display', () => {
    beforeEach(() => {
      commissionsApi.getSettings.mockResolvedValue(mockApiResponse)
    })

    test('displays global settings correctly', async () => {
      render(<CommissionSettingsForm />)

      await waitFor(() => {
        expect(screen.getByText('Configuración Global')).toBeInTheDocument()
      })
    })

    test('displays specific service settings correctly', async () => {
      render(<CommissionSettingsForm />)

      await waitFor(() => {
        expect(screen.getByText('Tipo: plomero')).toBeInTheDocument()
      })
    })

    test('shows active status indicator', async () => {
      render(<CommissionSettingsForm />)

      await waitFor(() => {
        expect(screen.getAllByText('Activa')).toHaveLength(2)
      })
    })

    test('displays creation dates', async () => {
      render(<CommissionSettingsForm />)

      await waitFor(() => {
        expect(screen.getByText(/Creado:/)).toBeInTheDocument()
      })
    })
  })

  describe('Create New Setting', () => {
    beforeEach(() => {
      commissionsApi.getSettings.mockResolvedValue(mockApiResponse)
    })

    test('shows create form when button is clicked', async () => {
      render(<CommissionSettingsForm />)

      await waitFor(() => {
        expect(screen.getByText('Nueva Configuración')).toBeInTheDocument()
      })

      const createButton = screen.getByRole('button', { name: /nueva configuración/i })
      fireEvent.click(createButton)

      expect(screen.getByText('Nueva Configuración')).toBeInTheDocument()
      expect(screen.getByLabelText('Nombre *')).toBeInTheDocument()
      expect(screen.getByLabelText('Porcentaje (%) *')).toBeInTheDocument()
    })

    test('creates new setting successfully', async () => {
      const user = userEvent.setup()
      const newSetting = {
        nombre: 'Comisión Electricistas',
        porcentaje: 7.5,
        tipo_servicio: 'electricista',
        descripcion: 'Comisión para electricistas',
      }

      commissionsApi.createSetting.mockResolvedValue({
        data: { success: true, data: { id: 'new-setting', ...newSetting } }
      })

      render(<CommissionSettingsForm />)

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /nueva configuración/i })
        fireEvent.click(createButton)
      })

      // Fill form
      const nombreInput = screen.getByLabelText('Nombre *')
      const porcentajeInput = screen.getByLabelText('Porcentaje (%) *')
      const tipoServicioInput = screen.getByLabelText('Tipo de Servicio')
      const descripcionInput = screen.getByLabelText('Descripción')

      await user.type(nombreInput, newSetting.nombre)
      await user.clear(porcentajeInput)
      await user.type(porcentajeInput, newSetting.porcentaje.toString())
      await user.type(tipoServicioInput, newSetting.tipo_servicio)
      await user.type(descripcionInput, newSetting.descripcion)

      // Submit
      const submitButton = screen.getByRole('button', { name: /crear/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(commissionsApi.createSetting).toHaveBeenCalledWith(newSetting)
      })

      expect(commissionsApi.getSettings).toHaveBeenCalledTimes(2) // Initial + after create
    })

    test('validates required fields', async () => {
      const user = userEvent.setup()

      render(<CommissionSettingsForm />)

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /nueva configuración/i })
        fireEvent.click(createButton)
      })

      const submitButton = screen.getByRole('button', { name: /crear/i })
      await user.click(submitButton)

      expect(screen.getByText('El nombre es requerido')).toBeInTheDocument()
    })

    test('validates percentage range', async () => {
      const user = userEvent.setup()

      render(<CommissionSettingsForm />)

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /nueva configuración/i })
        fireEvent.click(createButton)
      })

      const nombreInput = screen.getByLabelText('Nombre *')
      const porcentajeInput = screen.getByLabelText('Porcentaje (%) *')

      await user.type(nombreInput, 'Test Setting')
      await user.clear(porcentajeInput)
      await user.type(porcentajeInput, '15')

      const submitButton = screen.getByRole('button', { name: /crear/i })
      await user.click(submitButton)

      expect(screen.getByText('Máximo 10%')).toBeInTheDocument()
    })

    test('handles creation error', async () => {
      const user = userEvent.setup()

      commissionsApi.createSetting.mockRejectedValue({
        response: { data: { error: 'Error de validación' } }
      })

      render(<CommissionSettingsForm />)

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /nueva configuración/i })
        fireEvent.click(createButton)
      })

      const nombreInput = screen.getByLabelText('Nombre *')
      const porcentajeInput = screen.getByLabelText('Porcentaje (%) *')

      await user.type(nombreInput, 'Test Setting')
      await user.clear(porcentajeInput)
      await user.type(porcentajeInput, '8')

      const submitButton = screen.getByRole('button', { name: /crear/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Error de validación')).toBeInTheDocument()
      })
    })
  })

  describe('Edit Setting', () => {
    beforeEach(() => {
      commissionsApi.getSettings.mockResolvedValue(mockApiResponse)
    })

    test('populates form with existing data when editing', async () => {
      render(<CommissionSettingsForm />)

      await waitFor(() => {
        const editButtons = screen.getAllByRole('button', { name: /edit/i })
        fireEvent.click(editButtons[0]) // Edit first setting
      })

      expect(screen.getByDisplayValue('Comisión Global')).toBeInTheDocument()
      expect(screen.getByDisplayValue('8')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Configuración global por defecto')).toBeInTheDocument()
    })

    test('updates setting successfully', async () => {
      const user = userEvent.setup()

      commissionsApi.updateSetting.mockResolvedValue({
        data: { success: true }
      })

      render(<CommissionSettingsForm />)

      await waitFor(() => {
        const editButtons = screen.getAllByRole('button', { name: /edit/i })
        fireEvent.click(editButtons[0])
      })

      const porcentajeInput = screen.getByLabelText('Porcentaje (%) *')
      await user.clear(porcentajeInput)
      await user.type(porcentajeInput, '7.5')

      const submitButton = screen.getByRole('button', { name: /actualizar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(commissionsApi.updateSetting).toHaveBeenCalledWith('setting-1', {
          nombre: 'Comisión Global',
          porcentaje: 7.5,
          tipo_servicio: '',
          descripcion: 'Configuración global por defecto',
        })
      })
    })
  })

  describe('Delete Setting', () => {
    beforeEach(() => {
      commissionsApi.getSettings.mockResolvedValue(mockApiResponse)
      mockConfirm.mockReturnValue(true)
    })

    test('deletes setting after confirmation', async () => {
      commissionsApi.deactivateSetting.mockResolvedValue({
        data: { success: true }
      })

      render(<CommissionSettingsForm />)

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /trash/i })
        fireEvent.click(deleteButtons[0])
      })

      expect(mockConfirm).toHaveBeenCalledWith('¿Está seguro de desactivar esta configuración de comisión?')

      await waitFor(() => {
        expect(commissionsApi.deactivateSetting).toHaveBeenCalledWith('setting-1')
      })
    })

    test('does not delete when user cancels confirmation', async () => {
      mockConfirm.mockReturnValue(false)

      render(<CommissionSettingsForm />)

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /trash/i })
        fireEvent.click(deleteButtons[0])
      })

      expect(commissionsApi.deactivateSetting).not.toHaveBeenCalled()
    })

    test('handles delete error', async () => {
      commissionsApi.deactivateSetting.mockRejectedValue({
        response: { data: { error: 'No se puede eliminar' } }
      })

      render(<CommissionSettingsForm />)

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /trash/i })
        fireEvent.click(deleteButtons[0])
      })

      await waitFor(() => {
        expect(screen.getByText('No se puede eliminar')).toBeInTheDocument()
      })
    })
  })

  describe('Form State Management', () => {
    beforeEach(() => {
      commissionsApi.getSettings.mockResolvedValue(mockApiResponse)
    })

    test('cancels form and resets state', async () => {
      const user = userEvent.setup()

      render(<CommissionSettingsForm />)

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /nueva configuración/i })
        fireEvent.click(createButton)
      })

      const nombreInput = screen.getByLabelText('Nombre *')
      await user.type(nombreInput, 'Test Name')

      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      fireEvent.click(cancelButton)

      expect(screen.queryByDisplayValue('Test Name')).not.toBeInTheDocument()
      expect(screen.queryByText('Nueva Configuración')).not.toBeInTheDocument()
    })

    test('shows loading state during submission', async () => {
      const user = userEvent.setup()

      commissionsApi.createSetting.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 100))
      )

      render(<CommissionSettingsForm />)

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /nueva configuración/i })
        fireEvent.click(createButton)
      })

      const nombreInput = screen.getByLabelText('Nombre *')
      const porcentajeInput = screen.getByLabelText('Porcentaje (%) *')

      await user.type(nombreInput, 'Test Setting')
      await user.clear(porcentajeInput)
      await user.type(porcentajeInput, '8')

      const submitButton = screen.getByRole('button', { name: /crear/i })
      await user.click(submitButton)

      expect(screen.getByText('Guardando...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      await waitFor(() => {
        expect(screen.queryByText('Guardando...')).not.toBeInTheDocument()
      })
    })

    test('toggles create form visibility', async () => {
      render(<CommissionSettingsForm />)

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /nueva configuración/i })
        fireEvent.click(createButton)
      })

      expect(screen.getByText('Nueva Configuración')).toBeInTheDocument()

      const cancelToggleButton = screen.getByRole('button', { name: /cancelar/i })
      fireEvent.click(cancelToggleButton)

      expect(screen.queryByText('Nueva Configuración')).not.toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    test('shows empty state when no settings exist', async () => {
      commissionsApi.getSettings.mockResolvedValue({
        data: { success: true, data: [] }
      })

      render(<CommissionSettingsForm />)

      await waitFor(() => {
        expect(screen.getByText('No hay configuraciones')).toBeInTheDocument()
        expect(screen.getByText('Crea tu primera configuración de comisión')).toBeInTheDocument()
      })

      const createButton = screen.getByRole('button', { name: /crear configuración/i })
      expect(createButton).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      commissionsApi.getSettings.mockResolvedValue(mockApiResponse)
    })

    test('has proper ARIA labels and form structure', async () => {
      render(<CommissionSettingsForm />)

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /nueva configuración/i })
        fireEvent.click(createButton)
      })

      expect(screen.getByLabelText('Nombre *')).toHaveAttribute('id', 'nombre')
      expect(screen.getByLabelText('Porcentaje (%) *')).toHaveAttribute('type', 'number')
      expect(screen.getByLabelText('Tipo de Servicio')).toHaveAttribute('id', 'tipo_servicio')
    })

    test('shows error messages with proper styling', async () => {
      const user = userEvent.setup()

      render(<CommissionSettingsForm />)

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /nueva configuración/i })
        fireEvent.click(createButton)
      })

      const submitButton = screen.getByRole('button', { name: /crear/i })
      await user.click(submitButton)

      const errorMessage = screen.getByText('El nombre es requerido')
      expect(errorMessage).toHaveClass('text-danger-600')
    })

    test('disables form during submission for accessibility', async () => {
      const user = userEvent.setup()

      commissionsApi.createSetting.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 100))
      )

      render(<CommissionSettingsForm />)

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /nueva configuración/i })
        fireEvent.click(createButton)
      })

      const nombreInput = screen.getByLabelText('Nombre *')
      const porcentajeInput = screen.getByLabelText('Porcentaje (%) *')
      const submitButton = screen.getByRole('button', { name: /crear/i })

      await user.type(nombreInput, 'Test Setting')
      await user.clear(porcentajeInput)
      await user.type(porcentajeInput, '8')

      await user.click(submitButton)

      expect(submitButton).toBeDisabled()
      expect(nombreInput).toBeDisabled()
      expect(porcentajeInput).toBeDisabled()
    })
  })

  describe('Callbacks', () => {
    test('calls onSuccess callback after successful operations', async () => {
      const mockOnSuccess = jest.fn()
      const user = userEvent.setup()

      commissionsApi.createSetting.mockResolvedValue({
        data: { success: true }
      })

      render(<CommissionSettingsForm onSuccess={mockOnSuccess} />)

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /nueva configuración/i })
        fireEvent.click(createButton)
      })

      const nombreInput = screen.getByLabelText('Nombre *')
      const porcentajeInput = screen.getByLabelText('Porcentaje (%) *')

      await user.type(nombreInput, 'Test Setting')
      await user.clear(porcentajeInput)
      await user.type(porcentajeInput, '8')

      const submitButton = screen.getByRole('button', { name: /crear/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Edge Cases', () => {
    test('handles decimal percentages', async () => {
      const user = userEvent.setup()

      commissionsApi.createSetting.mockResolvedValue({
        data: { success: true }
      })

      render(<CommissionSettingsForm />)

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /nueva configuración/i })
        fireEvent.click(createButton)
      })

      const nombreInput = screen.getByLabelText('Nombre *')
      const porcentajeInput = screen.getByLabelText('Porcentaje (%) *')

      await user.type(nombreInput, 'Test Setting')
      await user.clear(porcentajeInput)
      await user.type(porcentajeInput, '7.5')

      const submitButton = screen.getByRole('button', { name: /crear/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(commissionsApi.createSetting).toHaveBeenCalledWith(
          expect.objectContaining({ porcentaje: 7.5 })
        )
      })
    })

    test('handles network errors gracefully', async () => {
      commissionsApi.getSettings.mockRejectedValue(new Error('Network Error'))

      render(<CommissionSettingsForm />)

      await waitFor(() => {
        expect(screen.getByText('Error interno del servidor')).toBeInTheDocument()
      })
    })

    test('prevents multiple simultaneous submissions', async () => {
      const user = userEvent.setup()

      commissionsApi.createSetting.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 200))
      )

      render(<CommissionSettingsForm />)

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /nueva configuración/i })
        fireEvent.click(createButton)
      })

      const nombreInput = screen.getByLabelText('Nombre *')
      const porcentajeInput = screen.getByLabelText('Porcentaje (%) *')
      const submitButton = screen.getByRole('button', { name: /crear/i })

      await user.type(nombreInput, 'Test Setting')
      await user.clear(porcentajeInput)
      await user.type(porcentajeInput, '8')

      // Click multiple times quickly
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      expect(commissionsApi.createSetting).toHaveBeenCalledTimes(1)
    })

    test('handles very long input values', async () => {
      const user = userEvent.setup()
      const longName = 'A'.repeat(200)
      const longDescription = 'B'.repeat(500)

      commissionsApi.createSetting.mockResolvedValue({
        data: { success: true }
      })

      render(<CommissionSettingsForm />)

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /nueva configuración/i })
        fireEvent.click(createButton)
      })

      const nombreInput = screen.getByLabelText('Nombre *')
      const descripcionInput = screen.getByLabelText('Descripción')

      await user.type(nombreInput, longName)
      await user.type(descripcionInput, longDescription)

      const porcentajeInput = screen.getByLabelText('Porcentaje (%) *')
      await user.clear(porcentajeInput)
      await user.type(porcentajeInput, '8')

      const submitButton = screen.getByRole('button', { name: /crear/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(commissionsApi.createSetting).toHaveBeenCalledWith(
          expect.objectContaining({
            nombre: longName,
            descripcion: longDescription
          })
        )
      })
    })
  })
})