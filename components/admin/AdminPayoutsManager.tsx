'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { paymentsApi } from '@/lib/api'
import { formatCurrency, formatDateTime, getPayoutStatusColor, getPayoutStatusText } from '@/utils/format'
import { Payout, PayoutStats } from '@/types/payments'
import {
  Wallet,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  AlertCircle,
  TrendingUp,
  Users,
  DollarSign
} from 'lucide-react'

interface AdminPayoutsManagerProps {
  showStats?: boolean
}

export function AdminPayoutsManager({ showStats = true }: AdminPayoutsManagerProps) {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [stats, setStats] = useState<PayoutStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsRefreshing(true)

      // Load pending payouts (this would need to be implemented in the backend)
      // For now, we'll show a mock implementation
      setPayouts([])

      // Mock stats - in real implementation, this would come from an API
      setStats({
        totalPayouts: 0,
        totalPaid: 0,
        totalCommission: 0,
        pendingPayouts: 0,
        latestPayout: null,
        averagePayout: 0
      })

      setError(null)
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error interno del servidor')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleProcessPayout = async (payoutId: string) => {
    if (!confirm('¿Está seguro de procesar este payout?')) return

    try {
      // This would call an admin API to process the payout
      // const response = await adminApi.processPayout(payoutId, adminId, reference)

      // For now, just show success
      alert('Payout procesado exitosamente (simulado)')
      loadData()
    } catch (error: any) {
      setError('Error al procesar el payout')
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Cargando payouts...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Wallet className="w-5 h-5 mr-2" />
                Gestión de Payouts
              </CardTitle>
              <CardDescription>
                Administra los pagos a profesionales
              </CardDescription>
            </div>
            <Button
              onClick={loadData}
              disabled={isRefreshing}
              variant="outline"
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
          {error && (
            <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-sm text-danger-800 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
              </p>
            </div>
          )}

          {/* Stats Cards */}
          {showStats && stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Pagado</p>
                      <p className="text-2xl font-bold text-success-600">
                        {formatCurrency(stats.totalPaid)}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-success-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Payouts Completados</p>
                      <p className="text-2xl font-bold text-primary-600">
                        {stats.totalPayouts}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-primary-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pendientes</p>
                      <p className="text-2xl font-bold text-warning-600">
                        {stats.pendingPayouts}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-warning-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Promedio</p>
                      <p className="text-2xl font-bold text-primary-600">
                        {formatCurrency(stats.averagePayout)}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-primary-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Payouts List */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Payouts Pendientes</h3>

            {payouts.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay payouts pendientes
                </h3>
                <p className="text-gray-600">
                  Todos los payouts han sido procesados
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {payouts.map((payout) => (
                  <Card key={payout.id} className="border-l-4 border-l-warning-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-warning-100 rounded-full flex items-center justify-center">
                            <Clock className="w-5 h-5 text-warning-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {payout.profesional.nombre}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {payout.servicio?.descripcion || 'Servicio completado'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Solicitado: {formatDateTime(payout.creado_en)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xl font-bold text-success-600 mb-2">
                            {formatCurrency(payout.monto_neto)}
                          </p>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => handleProcessPayout(payout.id)}
                              size="sm"
                              className="bg-success-600 hover:bg-success-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Procesar
                            </Button>
                            <Button variant="outline" size="sm">
                              Ver Detalles
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Monto Bruto:</span>
                          <p className="font-medium">{formatCurrency(payout.monto_bruto)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Comisión:</span>
                          <p className="font-medium">{formatCurrency(payout.comision_plataforma)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Método:</span>
                          <p className="font-medium capitalize">{payout.metodo_pago.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Recent Payouts Summary */}
          <div className="mt-8 pt-6 border-t">
            <h3 className="text-lg font-medium mb-4">Resumen de Actividad Reciente</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <Users className="w-8 h-8 text-primary-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-primary-600">0</p>
                <p className="text-sm text-gray-600">Profesionales Activos</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <CheckCircle className="w-8 h-8 text-success-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-success-600">0</p>
                <p className="text-sm text-gray-600">Payouts Esta Semana</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <DollarSign className="w-8 h-8 text-success-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-success-600">$0</p>
                <p className="text-sm text-gray-600">Total Esta Semana</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}