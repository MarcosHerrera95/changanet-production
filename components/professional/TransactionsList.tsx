'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { paymentsApi } from '@/lib/api'
import { formatCurrency, formatDateTime, getPaymentStatusColor, getPaymentStatusText } from '@/utils/format'
import { Payment } from '@/types/payments'
import {
  List,
  Download,
  Eye,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  Search
} from 'lucide-react'

interface TransactionsListProps {
  professionalId: string
  showFilters?: boolean
}

export function TransactionsList({ professionalId, showFilters = true }: TransactionsListProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadPayments()
  }, [professionalId])

  useEffect(() => {
    filterAndSortPayments()
  }, [payments, searchTerm, statusFilter, sortBy, sortOrder])

  const loadPayments = async () => {
    try {
      setIsRefreshing(true)
      const response = await paymentsApi.getProfessionalPayments(professionalId)

      if (response.data.success) {
        setPayments(response.data.data)
        setError(null)
      } else {
        setError(response.data.error || 'Error al cargar transacciones')
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error interno del servidor')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const filterAndSortPayments = () => {
    let filtered = payments

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.servicio?.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.servicio?.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.estado === statusFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      if (sortBy === 'date') {
        aValue = new Date(a.creado_en)
        bValue = new Date(b.creado_en)
      } else {
        aValue = a.monto_profesional
        bValue = b.monto_profesional
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredPayments(filtered)
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

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Cargando transacciones...</span>
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
              <List className="w-5 h-5 mr-2" />
              Lista de Transacciones
            </CardTitle>
            <CardDescription>
              {filteredPayments.length} de {payments.length} transacciones
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
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, servicio o ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobado">Aprobado</option>
                <option value="liberado">Liberado</option>
                <option value="rechazado">Rechazado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {filteredPayments.length === 0 ? (
          <div className="text-center py-8">
            <List className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {payments.length === 0 ? 'No hay transacciones' : 'No se encontraron resultados'}
            </h3>
            <p className="text-gray-600">
              {payments.length === 0
                ? 'Aún no has recibido pagos'
                : 'Intenta ajustar los filtros de búsqueda'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 p-3 bg-gray-50 rounded-lg font-medium text-sm text-gray-700">
              <div className="col-span-3">
                <button
                  onClick={() => toggleSort('date')}
                  className="flex items-center hover:text-gray-900"
                >
                  Fecha
                  {sortBy === 'date' && (
                    sortOrder === 'asc' ?
                      <ChevronUp className="w-4 h-4 ml-1" /> :
                      <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </button>
              </div>
              <div className="col-span-4">Cliente / Servicio</div>
              <div className="col-span-2">Estado</div>
              <div className="col-span-2">
                <button
                  onClick={() => toggleSort('amount')}
                  className="flex items-center hover:text-gray-900"
                >
                  Monto
                  {sortBy === 'amount' && (
                    sortOrder === 'asc' ?
                      <ChevronUp className="w-4 h-4 ml-1" /> :
                      <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </button>
              </div>
              <div className="col-span-1">Acciones</div>
            </div>

            {/* Transactions List */}
            {filteredPayments.map((payment) => (
              <div key={payment.id} className="border rounded-lg overflow-hidden">
                {/* Mobile View */}
                <div className="md:hidden p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        payment.estado === 'liberado' ? 'bg-success-500' :
                        payment.estado === 'aprobado' ? 'bg-primary-500' :
                        payment.estado === 'pendiente' ? 'bg-warning-500' :
                        'bg-danger-500'
                      }`} />
                      <span className={`text-sm font-medium ${getPaymentStatusColor(payment.estado)}`}>
                        {getPaymentStatusText(payment.estado)}
                      </span>
                    </div>
                    <span className="text-lg font-semibold text-success-600">
                      {formatCurrency(payment.monto_profesional)}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Cliente:</strong> {payment.servicio?.cliente.nombre}</p>
                    <p><strong>Servicio:</strong> {payment.servicio?.descripcion}</p>
                    <p><strong>Fecha:</strong> {formatDateTime(payment.creado_en)}</p>
                    <p><strong>ID:</strong> {payment.id}</p>
                  </div>

                  <div className="flex space-x-2 mt-3">
                    <Button
                      onClick={() => toggleExpanded(payment.id)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Detalles
                    </Button>
                    {payment.estado === 'aprobado' || payment.estado === 'liberado' ? (
                      <Button
                        onClick={() => handleDownloadReceipt(payment.id)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Recibo
                      </Button>
                    ) : null}
                  </div>
                </div>

                {/* Desktop View */}
                <div className="hidden md:grid grid-cols-12 gap-4 p-4 items-center">
                  <div className="col-span-3 text-sm text-gray-600">
                    {formatDateTime(payment.creado_en)}
                  </div>
                  <div className="col-span-4">
                    <div className="text-sm font-medium text-gray-900">
                      {payment.servicio?.cliente.nombre}
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      {payment.servicio?.descripcion}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.estado)}`}>
                      {getPaymentStatusText(payment.estado)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm font-semibold text-success-600">
                      {formatCurrency(payment.monto_profesional)}
                    </div>
                    <div className="text-xs text-gray-600">
                      Comisión: {formatCurrency(payment.comision_plataforma)}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Button
                      onClick={() => toggleExpanded(payment.id)}
                      variant="ghost"
                      size="sm"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedPayment === payment.id && (
                  <div className="border-t bg-gray-50 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Detalles del Pago</h4>
                        <dl className="space-y-1">
                          <div className="flex justify-between">
                            <dt className="text-gray-600">ID de Pago:</dt>
                            <dd className="font-mono text-xs">{payment.id}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-600">Monto Total:</dt>
                            <dd className="font-medium">{formatCurrency(payment.monto_total)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-600">Comisión Plataforma:</dt>
                            <dd>{formatCurrency(payment.comision_plataforma)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-600">Monto Profesional:</dt>
                            <dd className="font-medium text-success-600">{formatCurrency(payment.monto_profesional)}</dd>
                          </div>
                          {payment.commission_setting && (
                            <div className="flex justify-between">
                              <dt className="text-gray-600">Tasa de Comisión:</dt>
                              <dd>{payment.commission_setting.porcentaje}%</dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Información del Servicio</h4>
                        <dl className="space-y-1">
                          <div className="flex justify-between">
                            <dt className="text-gray-600">Cliente:</dt>
                            <dd>{payment.servicio?.cliente.nombre}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-600">Email:</dt>
                            <dd className="text-xs">{payment.servicio?.cliente.email}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-600">Servicio:</dt>
                            <dd>{payment.servicio?.descripcion}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-600">Urgente:</dt>
                            <dd>{payment.servicio?.es_urgente ? 'Sí' : 'No'}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
                      {payment.estado === 'aprobado' || payment.estado === 'liberado' ? (
                        <Button
                          onClick={() => handleDownloadReceipt(payment.id)}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Descargar Comprobante
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}