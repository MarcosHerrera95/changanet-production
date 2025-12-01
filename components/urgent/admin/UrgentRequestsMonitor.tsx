'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Monitor,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  User,
  MapPin,
  TrendingUp,
  Activity
} from 'lucide-react'
import { UrgentRequest } from '@/types/urgent'

interface UrgentRequestsMonitorProps {
  onRefresh?: () => Promise<void>
  onTriggerDispatch?: (requestId: string) => Promise<void>
  isLoading?: boolean
}

interface StatsData {
  total_requests: number
  pending_requests: number
  assigned_requests: number
  completed_requests: number
  cancelled_requests: number
  avg_response_time: number
  success_rate: number
}

export function UrgentRequestsMonitor({
  onRefresh,
  onTriggerDispatch,
  isLoading = false
}: UrgentRequestsMonitorProps) {
  const [requests, setRequests] = useState<UrgentRequest[]>([])
  const [stats, setStats] = useState<StatsData | null>(null)
  const [error, setError] = useState('')

  // Mock data for demonstration
  useEffect(() => {
    const mockRequests: UrgentRequest[] = [
      {
        id: 'req-1',
        client_id: 'client-1',
        description: 'Fuga de agua en cocina',
        latitude: -34.6037,
        longitude: -58.3816,
        urgency_level: 'high',
        service_category: 'Plomería',
        status: 'pending',
        created_at: new Date(Date.now() - 300000).toISOString(), // 5 min ago
        updated_at: new Date().toISOString(),
        client: {
          id: 'client-1',
          nombre: 'María García',
          email: 'maria@example.com'
        }
      },
      {
        id: 'req-2',
        client_id: 'client-2',
        description: 'Cortocircuito en sala',
        latitude: -34.6097,
        longitude: -58.3916,
        urgency_level: 'high',
        service_category: 'Electricidad',
        status: 'assigned',
        created_at: new Date(Date.now() - 600000).toISOString(), // 10 min ago
        updated_at: new Date().toISOString(),
        client: {
          id: 'client-2',
          nombre: 'Carlos López',
          email: 'carlos@example.com'
        },
        assignments: [{
          id: 'assign-1',
          urgent_request_id: 'req-2',
          professional_id: 'prof-1',
          assigned_at: new Date(Date.now() - 120000).toISOString(), // 2 min ago
          status: 'active',
          final_price: 3000,
          professional: {
            id: 'prof-1',
            nombre: 'Juan Electricista',
            telefono: '+5491123456789',
            email: 'juan@example.com'
          }
        }]
      }
    ]

    const mockStats: StatsData = {
      total_requests: 24,
      pending_requests: 3,
      assigned_requests: 8,
      completed_requests: 12,
      cancelled_requests: 1,
      avg_response_time: 8.5, // minutes
      success_rate: 92.3
    }

    setRequests(mockRequests)
    setStats(mockStats)
  }, [])

  const handleRefresh = async () => {
    if (onRefresh) {
      try {
        await onRefresh()
      } catch (err) {
        setError('Error al actualizar datos')
      }
    }
  }

  const handleTriggerDispatch = async (requestId: string) => {
    if (onTriggerDispatch) {
      try {
        await onTriggerDispatch(requestId)
        setError('')
      } catch (err) {
        setError('Error al disparar asignación automática')
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'assigned': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'in_progress': return 'text-green-600 bg-green-50 border-green-200'
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock
      case 'assigned': return CheckCircle
      case 'in_progress': return Activity
      case 'completed': return CheckCircle
      case 'cancelled': return XCircle
      default: return AlertTriangle
    }
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Ahora'
    if (diffInMinutes < 60) return `${diffInMinutes}min`
    const hours = Math.floor(diffInMinutes / 60)
    return `${hours}h ${diffInMinutes % 60}min`
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Monitor className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_requests}</p>
                  <p className="text-sm text-gray-600">Total solicitudes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending_requests}</p>
                  <p className="text-sm text-gray-600">Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.success_rate}%</p>
                  <p className="text-sm text-gray-600">Tasa de éxito</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.avg_response_time}min</p>
                  <p className="text-sm text-gray-600">Tiempo respuesta</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de solicitudes activas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Solicitudes Urgentes Activas
              </CardTitle>
              <CardDescription>
                Monitoreo en tiempo real de todas las solicitudes urgentes
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {requests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay solicitudes urgentes activas en este momento
            </p>
          ) : (
            <div className="space-y-4">
              {requests.map(request => {
                const StatusIcon = getStatusIcon(request.status)
                const activeAssignment = request.assignments?.find(a => a.status === 'active')

                return (
                  <div
                    key={request.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <StatusIcon className={`w-5 h-5 ${getStatusColor(request.status).split(' ')[0]}`} />
                          <span className="font-medium text-gray-900">
                            {request.description}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{request.client.nombre}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{request.latitude.toFixed(4)}, {request.longitude.toFixed(4)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>Hace {getTimeAgo(request.created_at)}</span>
                          </div>
                        </div>

                        {activeAssignment && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                            <p className="text-sm font-medium text-green-800">
                              Asignado a: {activeAssignment.professional.nombre}
                            </p>
                            <p className="text-xs text-green-600">
                              Precio acordado: ${activeAssignment.final_price}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="ml-4">
                        {request.status === 'pending' && onTriggerDispatch && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTriggerDispatch(request.id)}
                          >
                            Forzar asignación
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}