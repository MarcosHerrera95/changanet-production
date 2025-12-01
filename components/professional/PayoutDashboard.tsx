'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { paymentsApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/utils/format'
import { Payout, Payment, PayoutStats } from '@/types/payments'
import {
  DollarSign,
  Clock,
  CheckCircle,
  TrendingUp,
  RefreshCw,
  Loader2,
  AlertCircle,
  Wallet
} from 'lucide-react'

interface PayoutDashboardProps {
  professionalId: string
}

export function PayoutDashboard({ professionalId }: PayoutDashboardProps) {
  const [stats, setStats] = useState<PayoutStats | null>(null)
  const [recentPayments, setRecentPayments] = useState<Payment[]>([])
  const [pendingPayouts, setPendingPayouts] = useState<Payout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [professionalId])

  const loadDashboardData = async () => {
    try {
      setIsRefreshing(true)

      // Load payments received by professional
      const paymentsResponse = await paymentsApi.getProfessionalPayments(professionalId)

      if (paymentsResponse.data.success) {
        const payments = paymentsResponse.data.data
        setRecentPayments(payments.slice(0, 5)) // Last 5 payments

        // Calculate stats from payments data
        const completedPayments = payments.filter(p => p.estado === 'liberado')
        const pendingPayments = payments.filter(p => p.estado === 'aprobado')

        const totalEarned = completedPayments.reduce((sum, p) => sum + p.monto_profesional, 0)
        const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.monto_profesional, 0)

        const latestPayment = completedPayments[0] // Most recent completed payment

        setStats({
          totalPayouts: completedPayments.length,
          totalPaid: totalEarned,
          totalCommission: completedPayments.reduce((sum, p) => sum + p.comision_plataforma, 0),
          pendingPayouts: pendingPayments.length,
          latestPayout: latestPayment ? {
            date: latestPayment.actualizado_en,
            amount: latestPayment.monto_profesional
          } : null,
          averagePayout: completedPayments.length > 0 ? totalEarned / completedPayments.length : 0
        })

        // Mock pending payouts (in real app, this would come from a separate API)
        setPendingPayouts([])
      } else {
        setError(paymentsResponse.data.error || 'Error al cargar datos del dashboard')
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error interno del servidor')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Cargando dashboard...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-danger-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-danger-800 mb-2">Error</h3>
            <p className="text-danger-600 mb-4">{error}</p>
            <Button onClick={loadDashboardData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Pagos</h1>
          <p className="text-gray-600">Gestiona tus ingresos y retiros</p>
        </div>
        <Button
          onClick={loadDashboardData}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Earned */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ganado</CardTitle>
            <DollarSign className="h-4 w-4 text-success-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success-600">
              {formatCurrency(stats?.totalPaid || 0)}
            </div>
            <p className="text-xs text-gray-600">
              {stats?.totalPayouts || 0} pago{stats?.totalPayouts !== 1 ? 's' : ''} completado{stats?.totalPayouts !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Pending Amount */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendiente</CardTitle>
            <Clock className="h-4 w-4 text-warning-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning-600">
              {formatCurrency(recentPayments
                .filter(p => p.estado === 'aprobado')
                .reduce((sum, p) => sum + p.monto_profesional, 0)
              )}
            </div>
            <p className="text-xs text-gray-600">
              {recentPayments.filter(p => p.estado === 'aprobado').length} pago{recentPayments.filter(p => p.estado === 'aprobado').length !== 1 ? 's' : ''} aprobado{recentPayments.filter(p => p.estado === 'aprobado').length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Average Payout */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Servicio</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-600">
              {formatCurrency(stats?.averagePayout || 0)}
            </div>
            <p className="text-xs text-gray-600">
              Por servicio completado
            </p>
          </CardContent>
        </Card>

        {/* Commission Paid */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comisiones Pagadas</CardTitle>
            <Wallet className="h-4 w-4 text-danger-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger-600">
              {formatCurrency(stats?.totalCommission || 0)}
            </div>
            <p className="text-xs text-gray-600">
              Total de comisiones
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Pagos Recientes</CardTitle>
          <CardDescription>
            Tus últimos pagos procesados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pagos</h3>
              <p className="text-gray-600">Aún no has recibido pagos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      payment.estado === 'liberado' ? 'bg-success-500' :
                      payment.estado === 'aprobado' ? 'bg-primary-500' :
                      'bg-gray-400'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {payment.servicio?.cliente.nombre || 'Cliente'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {payment.servicio?.descripcion || 'Servicio'} • {formatDate(payment.creado_en)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-success-600">
                      +{formatCurrency(payment.monto_profesional)}
                    </p>
                    <p className="text-xs text-gray-600">
                      Comisión: {formatCurrency(payment.comision_plataforma)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Payouts Alert */}
      {pendingPayouts.length > 0 && (
        <Card className="border-warning-200 bg-warning-50">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-warning-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-warning-800">
                  Tienes {pendingPayouts.length} payout{pendingPayouts.length !== 1 ? 's' : ''} pendiente{pendingPayouts.length !== 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-warning-700">
                  Los fondos serán transferidos a tu cuenta bancaria en las próximas 24-48 horas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}