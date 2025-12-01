'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertTriangle, MapPin, CheckCircle, Clock } from 'lucide-react'
import { UrgentServiceRequestForm } from '@/components/urgent/client/UrgentServiceRequestForm'
import { UrgentStatusTracker } from '@/components/urgent/client/UrgentStatusTracker'
import { NearestProfessionalsPreview } from '@/components/urgent/client/NearestProfessionalsPreview'
import { UrgentRequestFormData, LocationData } from '@/types/urgent'

type FlowStep = 'welcome' | 'request' | 'preview' | 'status'

export default function UrgentClientPage() {
  const [currentStep, setCurrentStep] = useState<FlowStep>('welcome')
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null)
  const [locationData, setLocationData] = useState<LocationData | null>(null)
  const [error, setError] = useState<string>('')

  const handleStartRequest = () => {
    setCurrentStep('request')
  }

  const handleLocationRequest = async (): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('La geolocalización no está soportada por este navegador'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          }
          setLocationData(location)
          resolve(location)
        },
        (error) => {
          let errorMessage = 'Error obteniendo ubicación'
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permiso de ubicación denegado. Por favor, permite el acceso a tu ubicación.'
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Ubicación no disponible. Verifica tu conexión GPS.'
              break
            case error.TIMEOUT:
              errorMessage = 'Tiempo de espera agotado al obtener ubicación.'
              break
          }
          reject(new Error(errorMessage))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      )
    })
  }

  const handleRequestSubmit = async (data: UrgentRequestFormData) => {
    try {
      // Mock API call - in real app this would call the backend
      console.log('Submitting urgent request:', data)

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mock successful response
      const mockRequestId = `urgent-${Date.now()}`
      setCurrentRequestId(mockRequestId)
      setCurrentStep('preview')
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando solicitud urgente')
    }
  }

  const handleViewStatus = () => {
    if (currentRequestId) {
      setCurrentStep('status')
    }
  }

  const handleBackToWelcome = () => {
    setCurrentStep('welcome')
    setCurrentRequestId(null)
    setLocationData(null)
    setError('')
  }

  const renderWelcomeStep = () => (
    <div className="max-w-2xl mx-auto text-center space-y-6">
      <div className="space-y-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          Servicio Urgente
        </h1>
        <p className="text-lg text-gray-600">
          ¿Tienes una emergencia? Conecta instantáneamente con profesionales disponibles
          cerca de tu ubicación.
        </p>
      </div>

      <Card className="text-left">
        <CardHeader>
          <CardTitle className="text-lg">¿Cómo funciona?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-blue-600">1</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Describe tu necesidad</p>
              <p className="text-sm text-gray-600">Cuenta qué servicio urgente necesitas</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-blue-600">2</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Comparte tu ubicación</p>
              <p className="text-sm text-gray-600">Permite el acceso para encontrar profesionales cercanos</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-blue-600">3</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Recibe confirmación</p>
              <p className="text-sm text-gray-600">Un profesional aceptará tu solicitud en minutos</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-blue-600">4</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Servicio completado</p>
              <p className="text-sm text-gray-600">El profesional llega y resuelve tu problema</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button
          onClick={handleStartRequest}
          size="lg"
          className="w-full max-w-sm"
        >
          <AlertTriangle className="w-5 h-5 mr-2" />
          Solicitar Servicio Urgente
        </Button>

        {currentRequestId && (
          <Button
            variant="outline"
            onClick={handleViewStatus}
            className="w-full max-w-sm"
          >
            <Clock className="w-4 h-4 mr-2" />
            Ver Estado de mi Solicitud
          </Button>
        )}
      </div>
    </div>
  )

  const renderRequestStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={handleBackToWelcome}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Solicitud Urgente</h1>
          <p className="text-gray-600">Completa los detalles de tu solicitud</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <UrgentServiceRequestForm
        onSubmit={handleRequestSubmit}
        onLocationRequest={handleLocationRequest}
      />
    </div>
  )

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => setCurrentStep('request')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profesionales Disponibles</h1>
          <p className="text-gray-600">Estos son los profesionales más cercanos a tu ubicación</p>
        </div>
      </div>

      {locationData && (
        <Alert>
          <MapPin className="h-4 w-4" />
          <AlertDescription>
            Ubicación compartida: {locationData.latitude.toFixed(4)}, {locationData.longitude.toFixed(4)}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        <NearestProfessionalsPreview
          latitude={locationData?.latitude || 0}
          longitude={locationData?.longitude || 0}
          serviceCategory="Plomería" // This would come from the form
        />

        <div className="flex gap-3">
          <Button
            onClick={handleViewStatus}
            className="flex-1"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Ver Estado de la Solicitud
          </Button>
          <Button
            variant="outline"
            onClick={handleBackToWelcome}
          >
            Nueva Solicitud
          </Button>
        </div>
      </div>
    </div>
  )

  const renderStatusStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={handleBackToWelcome}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Inicio
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estado de tu Solicitud</h1>
          <p className="text-gray-600">Monitorea el progreso de tu solicitud urgente</p>
        </div>
      </div>

      {currentRequestId && (
        <UrgentStatusTracker
          requestId={currentRequestId}
          onCancel={async () => {
            // Mock cancel
            console.log('Cancelling request:', currentRequestId)
            setCurrentRequestId(null)
            setCurrentStep('welcome')
          }}
        />
      )}
    </div>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'welcome':
        return renderWelcomeStep()
      case 'request':
        return renderRequestStep()
      case 'preview':
        return renderPreviewStep()
      case 'status':
        return renderStatusStep()
      default:
        return renderWelcomeStep()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {renderCurrentStep()}
      </div>
    </div>
  )
}