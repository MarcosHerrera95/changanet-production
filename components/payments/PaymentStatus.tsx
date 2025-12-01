'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { paymentsApi, paymentWebSocket } from '@/lib/api'
import { formatCurrency, formatDateTime, getPaymentStatusColor, getPaymentStatusText } from '@/utils/format'
import { Payment, PaymentStatus as PaymentStatusType } from '@/types/payments'
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Download,
  AlertCircle
} from 'lucide-react'

interface PaymentStatusProps {
  paymentId: string
  onStatusChange?: (status: PaymentStatusType) => void
  showActions?: boolean
}

export function PaymentStatus({ paymentId, onStatusChange, showActions = true }: PaymentStatusProps) {
  const [payment, setPayment] = useState<Payment | null>(null)
  const [status, setStatus] = useState<PaymentStatusType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load initial payment data
  useEffect(() => {
    loadPaymentData()
  }, [paymentId])

  // Set up real-time updates
  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const userId = localStorage.getItem('userId')
    if (userId) {
      paymentWebSocket.connect(userId)

      // Listen for payment status updates
      const handleStatusUpdate = (event: CustomEvent) => {
        const update = event.detail
        if (update.paymentId === paymentId) {
          setStatus(update.status)
          if (onStatusChange) {
            onStatusChange(update.status)
          }
          // Reload payment data when status changes
          loadPaymentData()
        }
      }

      window.addEventListener('paymentStatusUpdate', handleStatusUpdate as EventListener)

      return () => {
        window.removeEventListener('paymentStatusUpdate', handleStatusUpdate as EventListener)
        paymentWebSocket.disconnect()
      }
    }
  }, [paymentId, onStatusChange])

  const loadPaymentData = async () => {
    try {
      setIsRefreshing(true)
      const response = await paymentsApi.getPaymentStatus(paymentId)

      if (response.data.success) {
        setPayment(response.data.data.payment)
        setStatus(response.data.data)
        setError(null)
      } else {
        setError(response.data.error || 'Error al cargar el estado del pago')
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error interno del servidor')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleDownloadReceipt = async () => {
    try {
      const response = await paymentsApi.generateReceipt(paymentId)
      if (response.data.success) {
        // Open receipt URL in new tab
        window.open(response.data.data.receiptUrl, '_blank')
      }
    } catch (error: any) {
      setError('Error al generar el comprobante')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-6 h-6 text-success-600" />
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-6 h-6 text-danger-600" />
      case 'pending':
        return <Clock className="w-6 h-6 text-warning-600" />
      default:
        return <AlertCircle className="w-6 h-6 text-gray-600" />
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Pago aprobado exitosamente'
      case 'rejected':
        return 'Pago rechazado'
      case 'cancelled':
        return 'Pago cancelado'
      case 'pending':
        return 'Pago pendiente de aprobación'
      default:
        return 'Estado desconocido'
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Cargando estado del pago...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="py-8">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-danger-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-danger-800 mb-2">Error</h3>
            <p className="text-danger-600 mb-4">{error}</p>
            <Button onClick={loadPaymentData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status || !payment) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="py-8">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Pago no encontrado</h3>
            <p className="text-gray-600">No se pudo encontrar información del pago</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          {getStatusIcon(status.status)}
        </div>
        <CardTitle className={`text-xl ${getPaymentStatusColor(status.status)}`}>
          {getPaymentStatusText(status.status)}
        </CardTitle>
        <CardDescription>
          {getStatusMessage(status.status)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Payment Details */}
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-gray-600">ID de Pago:</span>
            <span className="text-sm font-mono">{paymentId}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-gray-600">Monto:</span>
            <span className="text-sm font-medium">
              {formatCurrency(payment.monto_total)}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-gray-600">Fecha:</span>
            <span className="text-sm">
              {formatDateTime(payment.creado_en)}
            </span>
          </div>

          {status.date_approved && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-gray-600">Aprobado:</span>
              <span className="text-sm">
                {formatDateTime(status.date_approved)}
              </span>
            </div>
          )}

          {payment.commission_setting && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-gray-600">Comisión:</span>
              <span className="text-sm">
                {payment.commission_setting.porcentaje}% ({formatCurrency(payment.comision_plataforma)})
              </span>
            </div>
          )}
        </div>

        {/* Service Info */}
        {payment.servicio && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm mb-1">Servicio</h4>
            <p className="text-sm text-gray-600">{payment.servicio.descripcion}</p>
            <p className="text-xs text-gray-500">
              Profesional: {payment.servicio.profesional.nombre}
            </p>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex space-x-3 pt-4">
            <Button
              onClick={() => loadPaymentData()}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Actualizar
            </Button>

            {status.status === 'approved' && (
              <Button
                onClick={handleDownloadReceipt}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Comprobante
              </Button>
            )}
          </div>
        )}

        {/* Real-time indicator */}
        <div className="flex items-center justify-center text-xs text-gray-500 pt-2">
          <div className="w-2 h-2 bg-success-500 rounded-full mr-2 animate-pulse"></div>
          Actualización en tiempo real
        </div>
      </CardContent>
    </Card>
  )
}