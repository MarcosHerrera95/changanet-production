'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Clock,
  CheckCircle,
  XCircle,
  User,
  MapPin,
  Phone,
  MessageSquare,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'
import { UrgentRequest, UrgentAssignment } from '@/types/urgent'

interface UrgentStatusTrackerProps {
  requestId: string
  onRefresh?: () => Promise<void>
  onCancel?: () => Promise<void>
  onContactProfessional?: (assignment: UrgentAssignment) => void
}

const STATUS_CONFIG = {
  pending: {
    label: 'Buscando profesional',
    description: 'Estamos buscando profesionales disponibles cerca de tu ubicación',
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  assigned: {
    label: 'Profesional asignado',
    description: 'Un profesional ha aceptado tu solicitud',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  in_progress: {
    label: 'En progreso',
    description: 'El profesional está trabajando en tu solicitud',
    icon: User,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  completed: {
    label: 'Completado',
    description: 'El servicio ha sido completado exitosamente',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  cancelled: {
    label: 'Cancelado',
    description: 'La solicitud ha sido cancelada',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  expired: {
    label: 'Expirado',
    description: 'No se encontró un profesional disponible',
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  }
}

export function UrgentStatusTracker({
  requestId,
  onRefresh,
  onCancel,
  onContactProfessional
}: UrgentStatusTrackerProps) {
  const [request, setRequest] = useState<UrgentRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // Mock data for demonstration - in real app this would come from API
  useEffect(() => {
    const mockRequest: UrgentRequest = {
      id: requestId,
      client_id: 'client-1',
      description: 'Reparación de grifería en baño principal',
      latitude: -34.6037,
      longitude: -58.3816,
      urgency_level: 'high',
      special_requirements: 'Traer herramientas específicas',
      service_category: 'Plomería',
      status: 'assigned',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      client: {
        id: 'client-1',
        nombre: 'Juan Pérez',
        email: 'juan@example.com'
      },
      assignments: [{
        id: 'assignment-1',
        urgent_request_id: requestId,
        professional_id: 'prof-1',
        assigned_at: new Date().toISOString(),
        status: 'active',
        final_price: 2500,
        notes: 'Llegaré en 15 minutos',
        professional: {
          id: 'prof-1',
          nombre: 'María González',
          telefono: '+5491123456789',
          email: 'maria@example.com'
        }
      }]
    }

    setTimeout(() => {
      setRequest(mockRequest)
      setLoading(false)
    }, 1000)
  }, [requestId])

  const handleRefresh = async () => {
    if (onRefresh) {
      setLoading(true)
      try {
        await onRefresh()
      } catch (err) {
        setError('Error al actualizar el estado')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleCancel = async () => {
    if (onCancel && request?.status === 'pending') {
      try {
        await onCancel()
        setRequest(prev => prev ? { ...prev, status: 'cancelled' } : null)
      } catch (err) {
        setError('Error al cancelar la solicitud')
      }
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Cargando estado de la solicitud...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!request) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <Alert>
            <AlertDescription>
              No se pudo cargar la información de la solicitud.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const statusConfig = STATUS_CONFIG[request.status]
  const StatusIcon = statusConfig.icon
  const activeAssignment = request.assignments?.find(a => a.status === 'active')

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
          Estado de tu Solicitud Urgente
        </CardTitle>
        <CardDescription>
          ID de solicitud: {request.id}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Estado actual */}
        <div className={`p-4 rounded-lg border ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
          <div className="flex items-center gap-3">
            <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
            <div>
              <h3 className="font-medium text-gray-900">{statusConfig.label}</h3>
              <p className="text-sm text-gray-600">{statusConfig.description}</p>
            </div>
          </div>
        </div>

        {/* Detalles de la solicitud */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Detalles de la solicitud</h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Descripción</p>
                <p className="text-sm text-gray-600">{request.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Ubicación: {request.latitude.toFixed(4)}, {request.longitude.toFixed(4)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Creada: {new Date(request.created_at).toLocaleString('es-AR')}
              </span>
            </div>
            {request.service_category && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Categoría: {request.service_category}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Información del profesional asignado */}
        {activeAssignment && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Profesional asignado</h4>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{activeAssignment.professional.nombre}</p>
                    <p className="text-sm text-gray-600">{activeAssignment.professional.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    ${activeAssignment.final_price}
                  </p>
                  <p className="text-xs text-gray-600">Precio final</p>
                </div>
              </div>

              {activeAssignment.notes && (
                <div className="mt-3 p-3 bg-white rounded border">
                  <p className="text-sm text-gray-700">{activeAssignment.notes}</p>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onContactProfessional?.(activeAssignment)}
                >
                  <Phone className="w-4 h-4 mr-1" />
                  Llamar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onContactProfessional?.(activeAssignment)}
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Mensaje
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Acciones */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          {request.status === 'pending' && onCancel && (
            <Button
              variant="destructive"
              onClick={handleCancel}
            >
              Cancelar solicitud
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}