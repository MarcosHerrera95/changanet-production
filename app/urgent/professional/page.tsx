'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MapPin, Bell, Settings, RefreshCw, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { UrgentAssignmentCard } from '@/components/urgent/professional/UrgentAssignmentCard'
import { RespondUrgentRequestModal } from '@/components/urgent/professional/RespondUrgentRequestModal'
import { UrgentRequest, UrgentAssignment, UrgentResponseFormData, LocationData } from '@/types/urgent'

type ViewMode = 'dashboard' | 'available' | 'active' | 'history'

export default function UrgentProfessionalPage() {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard')
  const [availableRequests, setAvailableRequests] = useState<UrgentRequest[]>([])
  const [activeAssignments, setActiveAssignments] = useState<UrgentRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<UrgentRequest | null>(null)
  const [showResponseModal, setShowResponseModal] = useState(false)
  const [locationData, setLocationData] = useState<LocationData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Mock data for demonstration
  useEffect(() => {
    const mockAvailableRequests: UrgentRequest[] = [
      {
        id: 'req-1',
        client_id: 'client-1',
        description: 'Fuga de agua en cocina principal',
        latitude: -34.6037,
        longitude: -58.3816,
        urgency_level: 'high',
        service_category: 'Plomería',
        status: 'pending',
        created_at: new Date(Date.now() - 300000).toISOString(),
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
        description: 'Cortocircuito en sala de estar',
        latitude: -34.6097,
        longitude: -58.3916,
        urgency_level: 'medium',
        service_category: 'Electricidad',
        status: 'pending',
        created_at: new Date(Date.now() - 600000).toISOString(),
        updated_at: new Date().toISOString(),
        client: {
          id: 'client-2',
          nombre: 'Carlos López',
          email: 'carlos@example.com'
        }
      }
    ]

    const mockActiveAssignments: UrgentRequest[] = [
      {
        id: 'req-3',
        client_id: 'client-3',
        description: 'Reparación de grifería en baño',
        latitude: -34.6157,
        longitude: -58.4016,
        urgency_level: 'high',
        service_category: 'Plomería',
        status: 'assigned',
        created_at: new Date(Date.now() - 900000).toISOString(),
        updated_at: new Date().toISOString(),
        client: {
          id: 'client-3',
          nombre: 'Ana Rodríguez',
          email: 'ana@example.com'
        },
        assignments: [{
          id: 'assign-1',
          urgent_request_id: 'req-3',
          professional_id: 'prof-current',
          assigned_at: new Date(Date.now() - 300000).toISOString(),
          status: 'active',
          final_price: 2500,
          notes: 'En camino, llegaré en 10 minutos',
          professional: {
            id: 'prof-current',
            nombre: 'Juan Pérez',
            telefono: '+5491123456789',
            email: 'juan@example.com'
          }
        }]
      }
    ]

    setAvailableRequests(mockAvailableRequests)
    setActiveAssignments(mockActiveAssignments)
  }, [])

  const handleLocationRequest = async () => {
    if (!navigator.geolocation) {
      setError('La geolocalización no está soportada por este navegador')
      return
    }

    setIsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        }
        setLocationData(location)
        setIsLoading(false)
      },
      (error) => {
        let errorMessage = 'Error obteniendo ubicación'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Ubicación no disponible'
            break
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado'
            break
        }
        setError(errorMessage)
        setIsLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    )
  }

  const handleAcceptRequest = async (requestId: string, data: UrgentResponseFormData) => {
    try {
      // Mock API call
      console.log('Accepting request:', requestId, data)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Move request from available to active
      const acceptedRequest = availableRequests.find(r => r.id === requestId)
      if (acceptedRequest) {
        setAvailableRequests(prev => prev.filter(r => r.id !== requestId))
        setActiveAssignments(prev => [...prev, {
          ...acceptedRequest,
          status: 'assigned',
          assignments: [{
            id: `assign-${Date.now()}`,
            urgent_request_id: requestId,
            professional_id: 'prof-current',
            assigned_at: new Date().toISOString(),
            status: 'active',
            final_price: data.proposed_price,
            notes: data.notes,
            professional: {
              id: 'prof-current',
              nombre: 'Juan Pérez',
              telefono: '+5491123456789',
              email: 'juan@example.com'
            }
          }]
        }])
      }
    } catch (err) {
      throw new Error('Error aceptando la solicitud')
    }
  }

  const handleRejectRequest = async (requestId: string, reason: string) => {
    try {
      // Mock API call
      console.log('Rejecting request:', requestId, reason)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Remove from available requests
      setAvailableRequests(prev => prev.filter(r => r.id !== requestId))
    } catch (err) {
      throw new Error('Error rechazando la solicitud')
    }
  }

  const handleUpdateAssignmentStatus = async (assignmentId: string, status: 'completed' | 'cancelled') => {
    try {
      // Mock API call
      console.log('Updating assignment:', assignmentId, status)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Update assignment status
      setActiveAssignments(prev => prev.map(request => {
        if (request.assignments?.[0]?.id === assignmentId) {
          return {
            ...request,
            status: status === 'completed' ? 'completed' : 'cancelled',
            assignments: request.assignments?.map(assignment =>
              assignment.id === assignmentId
                ? { ...assignment, status }
                : assignment
            )
          }
        }
        return request
      }))
    } catch (err) {
      throw new Error('Error actualizando el estado')
    }
  }

  const handleContactClient = (client: UrgentRequest['client']) => {
    // Mock contact - in real app this would open a chat or call
    console.log('Contacting client:', client)
    alert(`Llamando a ${client.nombre} al ${client.email}`)
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel de Servicios Urgentes</h1>
          <p className="text-gray-600">Gestiona tus solicitudes urgentes y asignaciones activas</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleLocationRequest}
            disabled={isLoading}
          >
            <MapPin className="w-4 h-4 mr-2" />
            {isLoading ? 'Actualizando...' : 'Actualizar Ubicación'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentView('available')}
          >
            <Bell className="w-4 h-4 mr-2" />
            Ver Disponibles
          </Button>
        </div>
      </div>

      {/* Location Status */}
      {locationData && (
        <Alert>
          <MapPin className="h-4 w-4" />
          <AlertDescription>
            Ubicación actualizada: {locationData.latitude.toFixed(4)}, {locationData.longitude.toFixed(4)}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{availableRequests.length}</p>
                <p className="text-sm text-gray-600">Solicitudes disponibles</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activeAssignments.length}</p>
                <p className="text-sm text-gray-600">Asignaciones activas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {availableRequests.filter(r => r.urgency_level === 'high').length}
                </p>
                <p className="text-sm text-gray-600">Urgencias altas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Assignments */}
      {activeAssignments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Asignaciones Activas</h2>
          {activeAssignments.map(request => (
            <UrgentAssignmentCard
              key={request.id}
              request={request}
              assignment={request.assignments?.[0]}
              onContactClient={handleContactClient}
              onUpdateStatus={handleUpdateAssignmentStatus}
            />
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button onClick={() => setCurrentView('available')}>
              Ver todas las solicitudes disponibles
            </Button>
            <Button variant="outline" onClick={() => setCurrentView('active')}>
              Gestionar asignaciones activas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderAvailableRequests = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => setCurrentView('dashboard')}>
          ← Volver al Dashboard
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes Disponibles</h1>
          <p className="text-gray-600">Solicitudes urgentes cerca de tu ubicación</p>
        </div>
      </div>

      {availableRequests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay solicitudes disponibles
            </h3>
            <p className="text-gray-600">
              Las nuevas solicitudes urgentes aparecerán aquí automáticamente
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {availableRequests.map(request => (
            <UrgentAssignmentCard
              key={request.id}
              request={request}
              onAccept={async (requestId) => {
                setSelectedRequest(request)
                setShowResponseModal(true)
              }}
              onReject={async (requestId) => {
                setSelectedRequest(request)
                setShowResponseModal(true)
              }}
              onContactClient={handleContactClient}
            />
          ))}
        </div>
      )}
    </div>
  )

  const renderActiveAssignments = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => setCurrentView('dashboard')}>
          ← Volver al Dashboard
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asignaciones Activas</h1>
          <p className="text-gray-600">Gestiona tus trabajos urgentes en progreso</p>
        </div>
      </div>

      {activeAssignments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tienes asignaciones activas
            </h3>
            <p className="text-gray-600">
              Cuando aceptes una solicitud urgente, aparecerá aquí
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeAssignments.map(request => (
            <UrgentAssignmentCard
              key={request.id}
              request={request}
              assignment={request.assignments?.[0]}
              onContactClient={handleContactClient}
              onUpdateStatus={handleUpdateAssignmentStatus}
            />
          ))}
        </div>
      )}
    </div>
  )

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboard()
      case 'available':
        return renderAvailableRequests()
      case 'active':
        return renderActiveAssignments()
      default:
        return renderDashboard()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {renderCurrentView()}

        {/* Response Modal */}
        {showResponseModal && selectedRequest && (
          <RespondUrgentRequestModal
            isOpen={showResponseModal}
            onClose={() => {
              setShowResponseModal(false)
              setSelectedRequest(null)
            }}
            request={selectedRequest}
            onAccept={(data) => handleAcceptRequest(selectedRequest.id, data)}
            onReject={(reason) => handleRejectRequest(selectedRequest.id, reason)}
          />
        )}
      </div>
    </div>
  )
}