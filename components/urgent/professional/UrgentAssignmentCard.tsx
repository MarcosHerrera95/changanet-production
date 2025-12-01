'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  MapPin,
  Clock,
  DollarSign,
  User,
  Phone,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import { UrgentRequest, UrgentAssignment } from '@/types/urgent'

interface UrgentAssignmentCardProps {
  request: UrgentRequest
  assignment?: UrgentAssignment
  onAccept?: (requestId: string, proposedPrice?: number, notes?: string) => Promise<void>
  onReject?: (requestId: string, reason?: string) => Promise<void>
  onContactClient?: (clientInfo: UrgentRequest['client']) => void
  onUpdateStatus?: (assignmentId: string, status: 'completed' | 'cancelled') => Promise<void>
  onComplete?: (assignmentId: string) => Promise<void>
}

export function UrgentAssignmentCard({
  request,
  assignment,
  onAccept,
  onReject,
  onContactClient,
  onUpdateStatus,
  onComplete
}: UrgentAssignmentCardProps) {
  const isAssigned = assignment && assignment.status === 'active'
  const isCompleted = assignment && assignment.status === 'completed'

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getUrgencyLabel = (level: string) => {
    switch (level) {
      case 'high': return 'Alta - Inmediato'
      case 'medium': return 'Media - 1 hora'
      case 'low': return 'Baja - Horas'
      default: return level
    }
  }

  return (
    <Card className={`w-full max-w-2xl mx-auto ${isAssigned ? 'border-green-200 bg-green-50/30' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Solicitud Urgente
          </CardTitle>
          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(request.urgency_level)}`}>
            {getUrgencyLabel(request.urgency_level)}
          </div>
        </div>
        <CardDescription>
          ID: {request.id} • Creada: {new Date(request.created_at).toLocaleString('es-AR')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Información del cliente */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{request.client.nombre}</p>
                <p className="text-sm text-gray-600">{request.client.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onContactClient?.(request.client)}
              >
                <Phone className="w-4 h-4 mr-1" />
                Llamar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onContactClient?.(request.client)}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Mensaje
              </Button>
            </div>
          </div>
        </div>

        {/* Detalles de la solicitud */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Detalles del trabajo</h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Descripción</p>
              <p className="text-sm text-gray-700">{request.description}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {request.latitude.toFixed(4)}, {request.longitude.toFixed(4)}
                </span>
              </div>
              {request.service_category && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{request.service_category}</span>
                </div>
              )}
            </div>

            {request.special_requirements && (
              <div>
                <p className="text-sm font-medium text-gray-900">Requisitos especiales</p>
                <p className="text-sm text-gray-700">{request.special_requirements}</p>
              </div>
            )}

            {request.estimated_budget && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Presupuesto estimado: ${request.estimated_budget}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Información de asignación */}
        {assignment && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Asignación activa</p>
                <p className="text-xs text-green-600">
                  Asignada: {new Date(assignment.assigned_at).toLocaleString('es-AR')}
                </p>
              </div>
              {assignment.final_price && (
                <div className="text-right">
                  <p className="text-sm font-medium text-green-800">
                    ${assignment.final_price}
                  </p>
                  <p className="text-xs text-green-600">Precio acordado</p>
                </div>
              )}
            </div>
            {assignment.notes && (
              <div className="mt-2 p-2 bg-white rounded border">
                <p className="text-xs text-gray-700">{assignment.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        {!isAssigned && !isCompleted && (
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={() => onAccept?.(request.id)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Aceptar solicitud
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onReject?.(request.id)}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Rechazar
            </Button>
          </div>
        )}

        {isAssigned && !isCompleted && (
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={() => onComplete?.(assignment.id)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Completar y liberar fondos
            </Button>
            <Button
              variant="outline"
              onClick={() => onUpdateStatus?.(assignment.id, 'cancelled')}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancelar trabajo
            </Button>
          </div>
        )}

        {isCompleted && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Este trabajo ha sido completado exitosamente.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}