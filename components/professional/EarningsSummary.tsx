'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { paymentsApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/utils/format'
import { Payment } from '@/types/payments'
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  RefreshCw,
  Loader2,
  AlertCircle,
  BarChart3
} from 'lucide-react'

interface EarningsSummaryProps {
  professionalId: string
  period?: 'week' | 'month' | 'year' | 'all'
}

export function EarningsSummary({ professionalId, period = 'month' }: EarningsSummaryProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(period)

  useEffect(() => {
    loadEarningsData()
  }, [professionalId, selectedPeriod])

  const loadEarningsData = async () => {
    try {
      setIsRefreshing(true)

      const paymentsResponse = await paymentsApi.getProfessionalPayments(professionalId)

      if (paymentsResponse.data.success) {
        let filteredPayments = paymentsResponse.data.data

        // Filter by period
        const now = new Date()
        const periodStart = new Date()

        switch (selectedPeriod) {
          case 'week':
            periodStart.setDate(now.getDate() - 7)
            break
          case 'month':
            periodStart.setMonth(now.getMonth() - 1)
            break
          case 'year':
            periodStart.setFullYear(now.getFullYear() - 1)
            break
          case 'all':
          default:
            // No filtering
            break
        }

        if (selectedPeriod !== 'all') {
          filteredPayments = filteredPayments.filter(
            payment => new Date(payment.creado_en) >= periodStart
          )
        }

        setPayments(filteredPayments)
        setError(null)
      } else {
        setError(paymentsResponse.data.error || 'Error al cargar datos de ganancias')
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error interno del servidor')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const calculateStats = () => {
    const completedPayments = payments.filter(p => p.estado === 'liberado')
    const totalEarnings = completedPayments.reduce((sum, p) => sum + p.monto_profesional, 0)
    const totalCommission = completedPayments.reduce((sum, p) => sum + p.comision_plataforma, 0)
    const averageEarnings = completedPayments.length > 0 ? totalEarnings / completedPayments.length : 0

    // Calculate trend (compare with previous period)
    const now = new Date()
    const currentPeriodStart = new Date()
    const previousPeriodStart = new Date()
    const previousPeriodEnd = new Date(currentPeriodStart)

    switch (selectedPeriod) {
      case 'week':
        currentPeriodStart.setDate(now.getDate() - 7)
        previousPeriodStart.setDate(now.getDate() - 14)
        previousPeriodEnd.setDate(now.getDate() - 7)
        break
      case 'month':
        currentPeriodStart.setMonth(now.getMonth() - 1)
        previousPeriodStart.setMonth(now.getMonth() - 2)
        previousPeriodEnd.setMonth(now.getMonth() - 1)
        break
      case 'year':
        currentPeriodStart.setFullYear(now.getFullYear() - 1)
        previousPeriodStart.setFullYear(now.getFullYear() - 2)
        previousPeriodEnd.setFullYear(now.getFullYear() - 1)
        break
    }

    const previousPeriodPayments = payments.filter(p =>
      new Date(p.creado_en) >= previousPeriodStart &&
      new Date(p.creado_en) < previousPeriodEnd &&
      p.estado === 'liberado'
    )

    const previousEarnings = previousPeriodPayments.reduce((sum, p) => sum + p.monto_profesional, 0)
    const trend = previousEarnings > 0 ? ((totalEarnings - previousEarnings) / previousEarnings) * 100 : 0

    return {
      totalEarnings,
      totalCommission,
      averageEarnings,
      completedServices: completedPayments.length,
      trend,
      previousEarnings
    }
  }

  const periodLabels = {
    week: 'Esta semana',
    month: 'Este mes',
    year: 'Este año',
    all: 'Todo el tiempo'
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Cargando resumen de ganancias...</span>
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
            <Button onClick={loadEarningsData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const stats = calculateStats()

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Resumen de Ganancias
            </CardTitle>
            <CardDescription>
              {periodLabels[selectedPeriod]}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex rounded-lg border">
              {Object.entries(periodLabels).map(([key, label]) => (
                <Button
                  key={key}
                  variant={selectedPeriod === key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedPeriod(key as any)}
                  className="rounded-none first:rounded-l-lg last:rounded-r-lg"
                >
                  {label}
                </Button>
              ))}
            </div>
            <Button
              onClick={loadEarningsData}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Ganado</p>
                <p className="text-2xl font-bold text-success-600">
                  {formatCurrency(stats.totalEarnings)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-success-600" />
            </div>
            {stats.trend !== 0 && (
              <div className="flex items-center mt-2">
                {stats.trend > 0 ? (
                  <TrendingUp className="w-4 h-4 text-success-600 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-danger-600 mr-1" />
                )}
                <span className={`text-sm ${stats.trend > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                  {Math.abs(stats.trend).toFixed(1)}% vs período anterior
                </span>
              </div>
            )}
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Comisiones</p>
                <p className="text-2xl font-bold text-danger-600">
                  {formatCurrency(stats.totalCommission)}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-danger-600" />
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {((stats.totalCommission / (stats.totalEarnings + stats.totalCommission)) * 100).toFixed(1)}% del total
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Servicios</p>
                <p className="text-2xl font-bold text-primary-600">
                  {stats.completedServices}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary-600" />
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Completados
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Promedio</p>
                <p className="text-2xl font-bold text-primary-600">
                  {formatCurrency(stats.averageEarnings)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary-600" />
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Por servicio
            </p>
          </div>
        </div>

        {/* Recent Earnings */}
        <div>
          <h3 className="text-lg font-medium mb-4">Ganancias Recientes</h3>
          {payments.filter(p => p.estado === 'liberado').length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay ganancias</h3>
              <p className="text-gray-600">
                {selectedPeriod === 'all'
                  ? 'Aún no has completado ningún servicio'
                  : `No hay ganancias en ${periodLabels[selectedPeriod].toLowerCase()}`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments
                .filter(p => p.estado === 'liberado')
                .slice(0, 10)
                .map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-success-500 rounded-full"></div>
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
                      <p className="text-sm font-semibold text-success-600">
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
        </div>
      </CardContent>
    </Card>
  )
}