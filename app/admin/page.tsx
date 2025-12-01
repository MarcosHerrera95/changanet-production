'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { AdminProvider, useAdmin } from '@/context/AdminContext'
import { AdminCharts } from '@/components/admin/AdminCharts'
import { AdminTable } from '@/components/admin/AdminTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Users,
  Briefcase,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Settings,
  BarChart3,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react'
import adminApiService from '@/lib/adminApiService'
import {
  AdminStats,
  AdminUser,
  AdminService,
  AdminUrgentRequest,
  AdminAction,
  AdminTableColumn,
  AdminDashboardData
} from '@/types/admin'

function AdminDashboardContent() {
  const { state, actions } = useAdmin()
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null)
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([])
  const [recentServices, setRecentServices] = useState<AdminService[]>([])
  const [urgentRequests, setUrgentRequests] = useState<AdminUrgentRequest[]>([])

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      actions.setLoading(true)
      actions.clearMessages()

      const [dashboardResponse, usersResponse, servicesResponse, urgentResponse] = await Promise.all([
        adminApiService.getDashboardData(),
        adminApiService.getUsers({ limit: 5, sortBy: 'fecha_registro', sortOrder: 'desc' }),
        adminApiService.getServices({ limit: 5, sortBy: 'fecha_creacion', sortOrder: 'desc' }),
        adminApiService.getUrgentRequests({ limit: 5, status: 'pendiente' })
      ])

      if (dashboardResponse.success) {
        setDashboardData(dashboardResponse.data)
      }

      if (usersResponse.success) {
        setRecentUsers(usersResponse.data)
      }

      if (servicesResponse.success) {
        setRecentServices(servicesResponse.data)
      }

      if (urgentResponse.success) {
        setUrgentRequests(urgentResponse.data)
      }

      actions.setSuccess('Datos del dashboard actualizados correctamente')
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      actions.setError(error instanceof Error ? error.message : 'Error al cargar datos del dashboard')
    } finally {
      actions.setLoading(false)
    }
  }, [actions])

  // Load data on mount
  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Table columns for recent users
  const userColumns: AdminTableColumn[] = [
    { key: 'nombre', label: 'Nombre', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'rol', label: 'Rol', sortable: true },
    { key: 'estado', label: 'Estado', sortable: true },
    { key: 'fecha_registro', label: 'Registro', sortable: true }
  ]

  // Table columns for recent services
  const serviceColumns: AdminTableColumn[] = [
    { key: 'descripcion', label: 'Descripción', sortable: true },
    { key: 'cliente.nombre', label: 'Cliente', sortable: true },
    { key: 'profesional.nombre', label: 'Profesional', sortable: true },
    { key: 'estado', label: 'Estado', sortable: true },
    { key: 'fecha_creacion', label: 'Fecha', sortable: true }
  ]

  // Table columns for urgent requests
  const urgentColumns: AdminTableColumn[] = [
    { key: 'servicio.descripcion', label: 'Servicio', sortable: true },
    { key: 'cliente.nombre', label: 'Cliente', sortable: true },
    { key: 'prioridad', label: 'Prioridad', sortable: true },
    { key: 'estado', label: 'Estado', sortable: true },
    { key: 'fecha_creacion', label: 'Solicitado', sortable: true }
  ]

  // Actions for users table
  const userActions: AdminAction[] = [
    {
      id: 'view',
      label: 'Ver',
      icon: Eye,
      onClick: (user) => console.log('View user:', user)
    },
    {
      id: 'edit',
      label: 'Editar',
      icon: Edit,
      onClick: (user) => console.log('Edit user:', user)
    },
    {
      id: 'delete',
      label: 'Eliminar',
      icon: Trash2,
      variant: 'danger',
      onClick: (user) => console.log('Delete user:', user),
      confirmMessage: '¿Estás seguro de que quieres eliminar este usuario?'
    }
  ]

  // Actions for services table
  const serviceActions: AdminAction[] = [
    {
      id: 'view',
      label: 'Ver',
      icon: Eye,
      onClick: (service) => console.log('View service:', service)
    },
    {
      id: 'edit',
      label: 'Editar',
      icon: Edit,
      onClick: (service) => console.log('Edit service:', service)
    }
  ]

  // Actions for urgent requests table
  const urgentActions: AdminAction[] = [
    {
      id: 'assign',
      label: 'Asignar',
      icon: CheckCircle,
      variant: 'success',
      onClick: (request) => console.log('Assign urgent request:', request)
    },
    {
      id: 'view',
      label: 'Ver',
      icon: Eye,
      onClick: (request) => console.log('View urgent request:', request)
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrativo</h1>
              <p className="text-gray-600 mt-2">
                Vista general del sistema ChangAnet
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={loadDashboardData}
                disabled={state.loading}
                variant="outline"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${state.loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Sistema Operativo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {state.error && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {state.success && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{state.success}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        {dashboardData?.stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.stats.total_usuarios.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData.stats.usuarios_activos} activos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Servicios Activos</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.stats.total_servicios}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData.stats.servicios_urgentes} urgentes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${dashboardData.stats.ingresos_totales.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Comisión: ${dashboardData.stats.comision_total}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alertas</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {dashboardData.stats.pagos_pendientes}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pagos pendientes
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts Section */}
        {dashboardData?.charts_data && (
          <div className="mb-8">
            <AdminCharts data={dashboardData.charts_data} loading={state.loading} />
          </div>
        )}

        {/* Recent Activity Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Usuarios Recientes
              </CardTitle>
              <CardDescription>
                Últimos usuarios registrados en la plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminTable
                data={recentUsers}
                columns={userColumns}
                actions={userActions}
                loading={state.loading}
                emptyMessage="No hay usuarios recientes"
                compact
              />
            </CardContent>
          </Card>

          {/* Recent Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Servicios Recientes
              </CardTitle>
              <CardDescription>
                Últimos servicios solicitados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminTable
                data={recentServices}
                columns={serviceColumns}
                actions={serviceActions}
                loading={state.loading}
                emptyMessage="No hay servicios recientes"
                compact
              />
            </CardContent>
          </Card>
        </div>

        {/* Urgent Requests */}
        {urgentRequests.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Solicitudes Urgentes Pendientes
              </CardTitle>
              <CardDescription>
                Servicios urgentes que requieren atención inmediata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminTable
                data={urgentRequests}
                columns={urgentColumns}
                actions={urgentActions}
                loading={state.loading}
                emptyMessage="No hay solicitudes urgentes pendientes"
                compact
              />
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>
              Operaciones administrativas comunes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium">Gestionar Usuarios</div>
                    <div className="text-sm text-gray-600">Ver y administrar usuarios</div>
                  </div>
                </div>
              </Button>

              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="flex items-center space-x-3">
                  <Briefcase className="w-5 h-5 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium">Gestionar Servicios</div>
                    <div className="text-sm text-gray-600">Supervisar servicios activos</div>
                  </div>
                </div>
              </Button>

              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="flex items-center space-x-3">
                  <Settings className="w-5 h-5 text-purple-600" />
                  <div className="text-left">
                    <div className="font-medium">Configuración</div>
                    <div className="text-sm text-gray-600">Ajustes del sistema</div>
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <AdminProvider>
      <AdminDashboardContent />
    </AdminProvider>
  )
}