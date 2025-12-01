'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { paymentsApi } from '@/lib/api'
import { formatCurrency, formatDate, getPaymentStatusColor, getPaymentStatusText } from '@/utils/format'
import { Payment } from '@/types/payments'
import {
  History,
  Download,
  Eye,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface PaymentHistoryProps {
  clientId: string
  limit?: number
  showDetails?: boolean
}

export function PaymentHistory({ clientId, limit = 10, showDetails = true }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null)

  useEffect(() => {
    loadPayments()
  }, [clientId])

  const loadPayments = async () => {
    try {
      setIsRefreshing(true)
      const response = await paymentsApi.getClientPayments(clientId)

      if (response.data.success) {
        setPayments(response.data.data)
        setError(null)
      } else {
        setError(response.data.error || 'Error al cargar el historial de pagos')
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error interno del servidor')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleDownloadReceipt = async (paymentId: string) => {
    try {
      const response = await paymentsApi.generateReceipt(paymentId)
      if (response.data.success) {
        window.open(response.data.data.receiptUrl, '_blank')
      }
    } catch (error: any) {
      setError('Error al generar el comprobante')
    }
  }

  const toggleExpanded = (paymentId: string) => {
    setExpandedPayment(expandedPayment === paymentId ? null : paymentId)
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Cargando historial de pagos...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="py-8">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-danger-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-danger-800 mb-2">Error</h3>
            <p className="text-danger-600 mb-4">{error}</p>
            <Button onClick={loadPayments} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <History className="w-5 h-5 mr-2" />
              Historial de Pagos
            </CardTitle>
            <CardDescription>
              {payments.length} pago{payments.length !== 1 ? 's' : ''} realizado{payments.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Button
            onClick={loadPayments}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Actualizar
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-8">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pagos</h3>
            <p className="text-gray-600">Aún no has realizado ningún pago</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.slice(0, limit).map((payment) => (
              <div key={payment.id} className="border rounded-lg p-4">
                {/* Payment Summary */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full ${
                        payment.estado === 'liberado' ? 'bg-success-500' :
                        payment.estado === 'aprobado' ? 'bg-primary-500' :
                        payment.estado === 'pendiente' ? 'bg-warning-500' :
                        'bg-danger-500'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {payment.servicio?.descripcion || 'Servicio'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatDate(payment.creado_en)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {formatCurrency(payment.monto_total)}
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.estado)}`}>
                      {getPaymentStatusText(payment.estado)}
                    </span>
                  </div>
                </div>

                {/* Expandable Details */}
                {showDetails && (
                  <div className="mt-3">
                    <Button
                      onClick={() => toggleExpanded(payment.id)}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between"
                    >
                      <span>Ver detalles</span>
                      {expandedPayment === payment.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>

                    {expandedPayment === payment.id && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">ID de Pago:</span>
                            <p className="font-mono text-xs">{payment.id}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Profesional:</span>
                            <p>{payment.servicio?.profesional.nombre}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Monto Total:</span>
                            <p className="font-medium">{formatCurrency(payment.monto_total)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Comisión:</span>
                            <p>{formatCurrency(payment.comision_plataforma)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Profesional Recibe:</span>
                            <p className="font-medium text-success-600">
                              {formatCurrency(payment.monto_profesional)}
                            </p>
                          </div>
                          {payment.commission_setting && (
                            <div>
                              <span className="text-gray-600">Tasa de Comisión:</span>
                              <p>{payment.commission_setting.porcentaje}%</p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex space-x-2 pt-3 border-t">
                          <Button
                            onClick={() => handleDownloadReceipt(payment.id)}
                            variant="outline"
                            size="sm"
                            disabled={payment.estado !== 'aprobado' && payment.estado !== 'liberado'}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Comprobante
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {payments.length > limit && (
              <div className="text-center pt-4">
                <p className="text-sm text-gray-600">
                  Mostrando {limit} de {payments.length} pagos
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}