'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { paymentsApi } from '@/lib/api'
import { formatCurrency, formatDateTime, getPaymentStatusColor, getPaymentStatusText } from '@/utils/format'
import { Payment, PaginatedResponse } from '@/types/payments'
import {
  Table,
  Settings,
  RefreshCw,
  Loader2,
  AlertCircle,
  Eye,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface AdminPaymentsTableProps {
  showFilters?: boolean
  showActions?: boolean
}

export function AdminPaymentsTable({ showFilters = true, showActions = true }: AdminPaymentsTableProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    status: '',
    clientId: '',
    professionalId: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  })

  useEffect(() => {
    loadPayments()
  }, [pagination.page, filters])

  const loadPayments = async () => {
    try {
      setIsRefreshing(true)
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      }

      const response = await paymentsApi.getAllPayments(params)

      if (response.data.success) {
        setPayments(response.data.data)
        setPagination(response.data.pagination)
        setError(null)
      } else {
        setError(response.data.error || 'Error al cargar pagos')
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error interno del servidor')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleReleaseFunds = async (paymentId: string, serviceId: string) => {
    if (!confirm('¿Está seguro de liberar los fondos de este pago?')) return

    try {
      const response = await paymentsApi.releaseFunds(paymentId, serviceId)
      if (response.data.success) {
        // Reload payments to show updated status
        loadPayments()
      } else {
        setError(response.data.error || 'Error al liberar fondos')
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error al liberar fondos')
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }

  const clearFilters = () => {
    setFilters({
      status: '',
      clientId: '',
      professionalId: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Cargando pagos...</span>
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
              <Table className="w-5 h-5 mr-2" />
              Gestión de Pagos
            </CardTitle>
            <CardDescription>
              {pagination.total} pagos totales • Página {pagination.page} de {pagination.pages}
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

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cliente, profesional..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobado">Aprobado</option>
                <option value="liberado">Liberado</option>
                <option value="rechazado">Rechazado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desde
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        )}

        {(Object.values(filters).some(v => v !== '')) && (
          <div className="mt-2">
            <Button onClick={clearFilters} variant="ghost" size="sm">
              Limpiar filtros
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-8">
            <Table className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pagos</h3>
            <p className="text-gray-600">No se encontraron pagos con los filtros aplicados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-medium text-gray-700">ID</th>
                  <th className="text-left p-3 font-medium text-gray-700">Cliente</th>
                  <th className="text-left p-3 font-medium text-gray-700">Profesional</th>
                  <th className="text-left p-3 font-medium text-gray-700">Servicio</th>
                  <th className="text-left p-3 font-medium text-gray-700">Monto</th>
                  <th className="text-left p-3 font-medium text-gray-700">Estado</th>
                  <th className="text-left p-3 font-medium text-gray-700">Fecha</th>
                  {showActions && (
                    <th className="text-left p-3 font-medium text-gray-700">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <span className="font-mono text-xs">{payment.id.slice(0, 8)}...</span>
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {payment.servicio?.cliente.nombre}
                        </div>
                        <div className="text-xs text-gray-600">
                          {payment.servicio?.cliente.email}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {payment.servicio?.profesional.nombre}
                        </div>
                        <div className="text-xs text-gray-600">
                          {payment.servicio?.profesional.email}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="max-w-xs truncate" title={payment.servicio?.descripcion}>
                        {payment.servicio?.descripcion}
                      </div>
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatCurrency(payment.monto_total)}
                        </div>
                        <div className="text-xs text-gray-600">
                          Comisión: {formatCurrency(payment.comision_plataforma)}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.estado)}`}>
                        {getPaymentStatusText(payment.estado)}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600">
                      {formatDateTime(payment.creado_en)}
                    </td>
                    {showActions && (
                      <td className="p-3">
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {payment.estado === 'aprobado' && (
                            <Button
                              onClick={() => handleReleaseFunds(payment.id, payment.servicio_id)}
                              variant="outline"
                              size="sm"
                              className="text-success-600 hover:text-success-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Liberar
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-600">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} resultados
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Button>
              <span className="text-sm text-gray-600">
                Página {pagination.page} de {pagination.pages}
              </span>
              <Button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                variant="outline"
                size="sm"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}