'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MapPin, AlertTriangle, Clock, DollarSign } from 'lucide-react'
import { UrgentRequestFormData, LocationData, LocationError } from '@/types/urgent'

interface UrgentServiceRequestFormProps {
  onSubmit: (data: UrgentRequestFormData) => Promise<void>
  onLocationRequest: () => Promise<LocationData>
  isLoading?: boolean
}

const SERVICE_CATEGORIES = [
  'Plomería',
  'Electricidad',
  'Carpintería',
  'Jardinería',
  'Limpieza',
  'Reparaciones',
  'Mudanzas',
  'Otros'
]

const URGENCY_LEVELS = [
  { value: 'low', label: 'Baja', description: 'En las próximas horas', icon: Clock },
  { value: 'medium', label: 'Media', description: 'En la próxima hora', icon: AlertTriangle },
  { value: 'high', label: 'Alta', description: 'Inmediatamente', icon: AlertTriangle }
]

export function UrgentServiceRequestForm({
  onSubmit,
  onLocationRequest,
  isLoading = false
}: UrgentServiceRequestFormProps) {
  const [formData, setFormData] = useState<UrgentRequestFormData>({
    description: '',
    latitude: 0,
    longitude: 0,
    urgency_level: 'medium',
    special_requirements: '',
    estimated_budget: undefined,
    service_category: ''
  })

  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [locationError, setLocationError] = useState<string>('')
  const [submitError, setSubmitError] = useState<string>('')

  const handleLocationRequest = async () => {
    setLocationStatus('loading')
    setLocationError('')

    try {
      const location = await onLocationRequest()
      setFormData(prev => ({
        ...prev,
        latitude: location.latitude,
        longitude: location.longitude
      }))
      setLocationStatus('success')
    } catch (error) {
      setLocationStatus('error')
      setLocationError(error instanceof Error ? error.message : 'Error obteniendo ubicación')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    if (!formData.description.trim()) {
      setSubmitError('La descripción es requerida')
      return
    }

    if (formData.latitude === 0 && formData.longitude === 0) {
      setSubmitError('Debes compartir tu ubicación')
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Error creando solicitud')
    }
  }

  const selectedUrgency = URGENCY_LEVELS.find(level => level.value === formData.urgency_level)

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Solicitud de Servicio Urgente
        </CardTitle>
        <CardDescription>
          Describe tu necesidad urgente y comparte tu ubicación para encontrar profesionales disponibles
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Descripción del servicio */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Descripción del problema *
            </label>
            <Textarea
              id="description"
              placeholder="Describe detalladamente el servicio que necesitas..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              required
            />
          </div>

          {/* Categoría de servicio */}
          <div className="space-y-2">
            <label htmlFor="service_category" className="text-sm font-medium">
              Categoría de servicio
            </label>
            <select
              id="service_category"
              value={formData.service_category}
              onChange={(e) => setFormData(prev => ({ ...prev, service_category: e.target.value }))}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Selecciona una categoría</option>
              {SERVICE_CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Nivel de urgencia */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Nivel de urgencia *</label>
            <div className="grid gap-3">
              {URGENCY_LEVELS.map(level => {
                const Icon = level.icon
                return (
                  <div
                    key={level.value}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.urgency_level === level.value
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, urgency_level: level.value as any }))}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${
                        level.value === 'high' ? 'text-red-500' : 'text-orange-500'
                      }`} />
                      <div>
                        <div className="font-medium">{level.label}</div>
                        <div className="text-sm text-gray-600">{level.description}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Ubicación */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Ubicación *</label>
            <Button
              type="button"
              variant="outline"
              onClick={handleLocationRequest}
              disabled={locationStatus === 'loading'}
              className="w-full"
            >
              <MapPin className="w-4 h-4 mr-2" />
              {locationStatus === 'loading' ? 'Obteniendo ubicación...' :
               locationStatus === 'success' ? 'Ubicación obtenida ✓' :
               'Compartir ubicación'}
            </Button>

            {locationStatus === 'success' && (
              <div className="text-sm text-green-600 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Ubicación compartida correctamente
              </div>
            )}

            {locationStatus === 'error' && (
              <Alert>
                <AlertDescription>{locationError}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Requisitos especiales */}
          <div className="space-y-2">
            <label htmlFor="special_requirements" className="text-sm font-medium">
              Requisitos especiales
            </label>
            <Textarea
              id="special_requirements"
              placeholder="Materiales necesarios, accesos especiales, etc."
              value={formData.special_requirements}
              onChange={(e) => setFormData(prev => ({ ...prev, special_requirements: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Presupuesto estimado */}
          <div className="space-y-2">
            <label htmlFor="estimated_budget" className="text-sm font-medium">
              Presupuesto estimado (opcional)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="estimated_budget"
                type="number"
                placeholder="0"
                value={formData.estimated_budget || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  estimated_budget: e.target.value ? parseFloat(e.target.value) : undefined
                }))}
                className="pl-10"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Error de envío */}
          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Botón de envío */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || locationStatus !== 'success'}
            size="lg"
          >
            {isLoading ? 'Creando solicitud...' : 'Enviar Solicitud Urgente'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}