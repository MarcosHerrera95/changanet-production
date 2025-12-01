'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DollarSign, Clock, MessageSquare } from 'lucide-react'
import { UrgentRequest, UrgentResponseFormData } from '@/types/urgent'

interface RespondUrgentRequestModalProps {
  isOpen: boolean
  onClose: () => void
  request: UrgentRequest
  onAccept: (data: UrgentResponseFormData) => Promise<void>
  onReject: (reason: string) => Promise<void>
  isLoading?: boolean
}

export function RespondUrgentRequestModal({
  isOpen,
  onClose,
  request,
  onAccept,
  onReject,
  isLoading = false
}: RespondUrgentRequestModalProps) {
  const [mode, setMode] = useState<'accept' | 'reject'>('accept')
  const [formData, setFormData] = useState<UrgentResponseFormData>({
    proposed_price: undefined,
    notes: ''
  })
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState('')

  const handleAccept = async () => {
    setError('')
    try {
      await onAccept(formData)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aceptar la solicitud')
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Debes proporcionar una razón para rechazar')
      return
    }

    setError('')
    try {
      await onReject(rejectReason)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al rechazar la solicitud')
    }
  }

  const resetForm = () => {
    setFormData({ proposed_price: undefined, notes: '' })
    setRejectReason('')
    setError('')
    setMode('accept')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Responder Solicitud Urgente
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Cerrar</span>
              ×
            </button>
          </div>

          {/* Información de la solicitud */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Detalles de la solicitud</h3>
            <p className="text-sm text-gray-700 mb-2">{request.description}</p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>Ubicación: {request.latitude.toFixed(4)}, {request.longitude.toFixed(4)}</span>
              {request.service_category && (
                <span>Categoría: {request.service_category}</span>
              )}
            </div>
            {request.estimated_budget && (
              <div className="flex items-center gap-1 mt-2">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Presupuesto estimado: ${request.estimated_budget}
                </span>
              </div>
            )}
          </div>

          {/* Selector de modo */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={mode === 'accept' ? 'default' : 'outline'}
              onClick={() => setMode('accept')}
              className="flex-1"
            >
              Aceptar
            </Button>
            <Button
              variant={mode === 'reject' ? 'destructive' : 'outline'}
              onClick={() => setMode('reject')}
              className="flex-1"
            >
              Rechazar
            </Button>
          </div>

          {/* Formulario de aceptación */}
          {mode === 'accept' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="proposed_price" className="block text-sm font-medium text-gray-700 mb-1">
                  Precio propuesto (opcional)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="proposed_price"
                    type="number"
                    placeholder="Ej: 2500"
                    value={formData.proposed_price || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      proposed_price: e.target.value ? parseFloat(e.target.value) : undefined
                    }))}
                    className="pl-10"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notas adicionales
                </label>
                <Textarea
                  id="notes"
                  placeholder="Tiempo estimado de llegada, materiales necesarios, etc."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              <Button
                onClick={handleAccept}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Aceptando...' : 'Aceptar Solicitud'}
              </Button>
            </div>
          )}

          {/* Formulario de rechazo */}
          {mode === 'reject' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="reject_reason" className="block text-sm font-medium text-gray-700 mb-1">
                  Razón del rechazo *
                </label>
                <Textarea
                  id="reject_reason"
                  placeholder="Explica por qué no puedes atender esta solicitud..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  required
                />
              </div>

              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Rechazando...' : 'Rechazar Solicitud'}
              </Button>
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Información adicional */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-medium">Recuerda:</p>
                <p>Si aceptas, te comprometes a llegar lo antes posible. El cliente será notificado inmediatamente.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}