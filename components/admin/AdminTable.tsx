'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  DollarSign,
  Users,
  Activity,
} from 'lucide-react'
import { AdminTableColumn, AdminAction, AdminFilter as AdminFilterType } from '@/types/admin'
import { cn } from '@/lib/utils'

interface AdminTableProps<T = any> {
  data: T[]
  columns: AdminTableColumn[]
  actions?: AdminAction[]
  loading?: boolean
  error?: string | null
  filters?: AdminFilterType
  onFiltersChange?: (filters: AdminFilterType) => void
  onRefresh?: () => void
  onExport?: (format: 'csv' | 'excel' | 'pdf') => void
  selectable?: boolean
  selectedItems?: T[]
  onSelectionChange?: (items: T[]) => void
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
  onPageChange?: (page: number) => void
  onLimitChange?: (limit: number) => void
  emptyMessage?: string
  className?: string
  compact?: boolean
  striped?: boolean
  bordered?: boolean
}

export function AdminTable<T = any>({
  data,
  columns,
  actions = [],
  loading = false,
  error = null,
  filters = {},
  onFiltersChange,
  onRefresh,
  onExport,
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  pagination,
  onPageChange,
  onLimitChange,
  emptyMessage = 'No se encontraron registros',
  className,
  compact = false,
  striped = true,
  bordered = true,
}: AdminTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [searchTerm, setSearchTerm] = useState(filters.search || '')
  const [showFilters, setShowFilters] = useState(false)

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let result = [...data]

    // Apply search filter
    if (searchTerm) {
      result = result.filter(item =>
        columns.some(column => {
          const value = item[column.key]
          return value && String(value).toLowerCase().includes(searchTerm.toLowerCase())
        })
      )
    }

    // Apply status filters
    if (filters.status && filters.status.length > 0) {
      result = result.filter(item => filters.status!.includes(item.status || item.estado))
    }

    // Apply category filters
    if (filters.category && filters.category.length > 0) {
      result = result.filter(item => {
        const categoryId = item.categoria_id || item.category_id || item.categoria?.id
        return filters.category!.includes(categoryId)
      })
    }

    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aValue = a[sortColumn]
        const bValue = b[sortColumn]

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [data, columns, searchTerm, filters, sortColumn, sortDirection])

  // Handle sorting
  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }, [sortColumn, sortDirection])

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    onFiltersChange?.({ ...filters, search: value })
  }, [filters, onFiltersChange])

  // Handle selection
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      onSelectionChange?.(filteredAndSortedData)
    } else {
      onSelectionChange?.([])
    }
  }, [filteredAndSortedData, onSelectionChange])

  const handleSelectItem = useCallback((item: T, checked: boolean) => {
    if (checked) {
      onSelectionChange?.([...selectedItems, item])
    } else {
      onSelectionChange?.(selectedItems.filter(selected => selected.id !== item.id))
    }
  }, [selectedItems, onSelectionChange])

  // Handle actions
  const handleAction = useCallback((action: AdminAction, item: T) => {
    if (action.disabled && action.disabled(item)) return
    action.onClick(item)
  }, [])

  // Render cell content
  const renderCell = useCallback((column: AdminTableColumn, item: T) => {
    const value = item[column.key]

    if (column.render) {
      return column.render(value, item)
    }

    // Default rendering based on value type
    if (value === null || value === undefined) {
      return <span className="text-gray-400">-</span>
    }

    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'success' : 'secondary'}>
          {value ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
          {value ? 'Sí' : 'No'}
        </Badge>
      )
    }

    if (column.key === 'estado' || column.key === 'status') {
      const statusConfigs = {
        activo: { variant: 'success' as const, icon: CheckCircle, label: 'Activo' },
        active: { variant: 'success' as const, icon: CheckCircle, label: 'Activo' },
        inactivo: { variant: 'secondary' as const, icon: XCircle, label: 'Inactivo' },
        inactive: { variant: 'secondary' as const, icon: XCircle, label: 'Inactivo' },
        suspendido: { variant: 'warning' as const, icon: AlertTriangle, label: 'Suspendido' },
        suspended: { variant: 'warning' as const, icon: AlertTriangle, label: 'Suspendido' },
        baneado: { variant: 'destructive' as const, icon: Ban, label: 'Baneado' },
        banned: { variant: 'destructive' as const, icon: Ban, label: 'Baneado' },
        pendiente: { variant: 'warning' as const, icon: Clock, label: 'Pendiente' },
        pending: { variant: 'warning' as const, icon: Clock, label: 'Pendiente' },
        aprobado: { variant: 'success' as const, icon: CheckCircle, label: 'Aprobado' },
        approved: { variant: 'success' as const, icon: CheckCircle, label: 'Aprobado' },
        rechazado: { variant: 'destructive' as const, icon: XCircle, label: 'Rechazado' },
        rejected: { variant: 'destructive' as const, icon: XCircle, label: 'Rechazado' },
        completado: { variant: 'success' as const, icon: CheckCircle, label: 'Completado' },
        completed: { variant: 'success' as const, icon: CheckCircle, label: 'Completado' },
        cancelado: { variant: 'destructive' as const, icon: XCircle, label: 'Cancelado' },
        cancelled: { variant: 'destructive' as const, icon: XCircle, label: 'Cancelado' },
        verificado: { variant: 'success' as const, icon: Shield, label: 'Verificado' },
        verified: { variant: 'success' as const, icon: Shield, label: 'Verificado' },
        bloqueado: { variant: 'destructive' as const, icon: Ban, label: 'Bloqueado' },
        blocked: { variant: 'destructive' as const, icon: Ban, label: 'Bloqueado' },
      } as const

      const config = statusConfigs[value as keyof typeof statusConfigs]
      if (config) {
        const IconComponent = config.icon
        return (
          <Badge variant={config.variant} className="flex items-center gap-1">
            <IconComponent className="w-3 h-3" />
            {config.label}
          </Badge>
        )
      }

      return <Badge variant="secondary">{String(value)}</Badge>
    }

    if (column.key === 'rol' || column.key === 'role') {
      const roleConfigs = {
        cliente: { variant: 'secondary' as const, icon: Users, label: 'Cliente' },
        profesional: { variant: 'primary' as const, icon: Activity, label: 'Profesional' },
        admin: { variant: 'destructive' as const, icon: Shield, label: 'Admin' },
        customer: { variant: 'secondary' as const, icon: Users, label: 'Cliente' },
        professional: { variant: 'primary' as const, icon: Activity, label: 'Profesional' },
        administrator: { variant: 'destructive' as const, icon: Shield, label: 'Admin' },
      } as const

      const config = roleConfigs[value as keyof typeof roleConfigs]
      if (config) {
        const IconComponent = config.icon
        return (
          <Badge variant={config.variant} className="flex items-center gap-1">
            <IconComponent className="w-3 h-3" />
            {config.label}
          </Badge>
        )
      }

      return <Badge variant="secondary">{String(value)}</Badge>
    }

    if (column.key === 'esta_verificado' || column.key === 'verified' || column.key === 'verificado') {
      return (
        <Badge variant={value ? 'success' : 'warning'} className="flex items-center gap-1">
          {value ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
          {value ? 'Verificado' : 'Pendiente'}
        </Badge>
      )
    }

    if (column.key === 'bloqueado' || column.key === 'blocked') {
      return (
        <Badge variant={value ? 'destructive' : 'success'} className="flex items-center gap-1">
          {value ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
          {value ? 'Bloqueado' : 'Activo'}
        </Badge>
      )
    }

    if (column.key.includes('fecha') || column.key.includes('date') || column.key.includes('creado') || column.key.includes('actualizado')) {
      return new Date(value).toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    if (typeof value === 'number' && (column.key.includes('monto') || column.key.includes('precio') || column.key.includes('amount') || column.key.includes('comision'))) {
      const IconComponent = column.key.includes('comision') ? DollarSign : Activity
      return (
        <div className="flex items-center gap-1">
          <IconComponent className="w-3 h-3 text-green-600" />
          <span className="font-medium">
            {new Intl.NumberFormat('es-AR', {
              style: 'currency',
              currency: 'ARS',
            }).format(value)}
          </span>
        </div>
      )
    }

    if (column.key === 'prioridad' || column.key === 'priority') {
      const priorityConfigs = {
        baja: { variant: 'secondary' as const, icon: Clock, label: 'Baja' },
        normal: { variant: 'primary' as const, icon: Activity, label: 'Normal' },
        alta: { variant: 'warning' as const, icon: AlertTriangle, label: 'Alta' },
        critica: { variant: 'destructive' as const, icon: Ban, label: 'Crítica' },
        low: { variant: 'secondary' as const, icon: Clock, label: 'Low' },
        medium: { variant: 'primary' as const, icon: Activity, label: 'Medium' },
        high: { variant: 'warning' as const, icon: AlertTriangle, label: 'High' },
        critical: { variant: 'destructive' as const, icon: Ban, label: 'Critical' },
      } as const

      const config = priorityConfigs[value as keyof typeof priorityConfigs]
      if (config) {
        const IconComponent = config.icon
        return (
          <Badge variant={config.variant} className="flex items-center gap-1">
            <IconComponent className="w-3 h-3" />
            {config.label}
          </Badge>
        )
      }
    }

    return String(value)
  }, [])

  // Pagination
  const renderPagination = () => {
    if (!pagination) return null

    const { page, pages, total } = pagination
    const startItem = (page - 1) * pagination.limit + 1
    const endItem = Math.min(page * pagination.limit, total)

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
        <div className="flex items-center space-x-2 text-sm text-gray-700">
          <span>Mostrando {startItem} a {endItem} de {total} resultados</span>
        </div>

        <div className="flex items-center space-x-2">
          <Select
            value={pagination.limit.toString()}
            onValueChange={(value) => onLimitChange?.(parseInt(value))}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(1)}
              disabled={page === 1}
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="px-3 py-1 text-sm border rounded">
              {page} de {pages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(page + 1)}
              disabled={page === pages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pages)}
              disabled={page === pages}
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar datos</h3>
        <p className="text-gray-600">{error}</p>
        {onRefresh && (
          <Button onClick={onRefresh} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={cn('bg-white rounded-lg shadow', bordered && 'border', className)}>
      {/* Header with search and filters */}
      <div className="p-4 border-b">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center space-x-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </Button>
            )}
            {onExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => onExport('csv')}>
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport('excel')}>
                    Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport('pdf')}>
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <Select
                  value={filters.status?.[0] || ''}
                  onValueChange={(value) => {
                    const newStatus = value ? [value] : []
                    onFiltersChange?.({ ...filters, status: newStatus })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                    <SelectItem value="suspendido">Suspendido</SelectItem>
                    <SelectItem value="baneado">Baneado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date range filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha desde
                </label>
                <Input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => {
                    const start = e.target.value
                    onFiltersChange?.({
                      ...filters,
                      dateRange: { ...filters.dateRange, start }
                    })
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha hasta
                </label>
                <Input
                  type="date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => {
                    const end = e.target.value
                    onFiltersChange?.({
                      ...filters,
                      dateRange: { ...filters.dateRange, end }
                    })
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedItems.length === filteredAndSortedData.length && filteredAndSortedData.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    column.sortable && 'cursor-pointer hover:bg-gray-50',
                    column.width && `w-${column.width}`
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <SortAsc
                          className={cn(
                            'w-3 h-3',
                            sortColumn === column.key && sortDirection === 'asc'
                              ? 'text-blue-600'
                              : 'text-gray-300'
                          )}
                        />
                        <SortDesc
                          className={cn(
                            'w-3 h-3 -mt-1',
                            sortColumn === column.key && sortDirection === 'desc'
                              ? 'text-blue-600'
                              : 'text-gray-300'
                          )}
                        />
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}
              {actions.length > 0 && (
                <TableHead className="w-12">Acciones</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                  className="text-center py-8"
                >
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-gray-600">Cargando...</p>
                </TableCell>
              </TableRow>
            ) : filteredAndSortedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                  className="text-center py-8"
                >
                  <p className="text-gray-600">{emptyMessage}</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedData.map((item, index) => (
                <TableRow
                  key={item.id || index}
                  className={cn(
                    striped && index % 2 === 1 && 'bg-gray-50',
                    compact ? 'h-12' : 'h-16'
                  )}
                >
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.some(selected => selected.id === item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item, checked as boolean)}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.key} className={compact ? 'py-2' : 'py-4'}>
                      {renderCell(column, item)}
                    </TableCell>
                  ))}
                  {actions.length > 0 && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {actions.map((action, actionIndex) => (
                            <React.Fragment key={action.id}>
                              <DropdownMenuItem
                                onClick={() => handleAction(action, item)}
                                disabled={action.disabled && action.disabled(item)}
                                className={cn(
                                  action.variant === 'danger' && 'text-red-600',
                                  action.variant === 'success' && 'text-green-600'
                                )}
                              >
                                {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                                {action.label}
                              </DropdownMenuItem>
                              {actionIndex < actions.length - 1 && <DropdownMenuSeparator />}
                            </React.Fragment>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && renderPagination()}

      {/* Selection info */}
      {selectable && selectedItems.length > 0 && (
        <div className="px-4 py-3 bg-blue-50 border-t flex items-center justify-between">
          <span className="text-sm text-blue-700">
            {selectedItems.length} elemento{selectedItems.length !== 1 ? 's' : ''} seleccionado{selectedItems.length !== 1 ? 's' : ''}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectionChange?.([])}
          >
            Limpiar selección
          </Button>
        </div>
      )}
    </div>
  )
}