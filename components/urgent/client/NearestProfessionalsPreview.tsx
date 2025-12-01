'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MapPin, Star, Clock, User, Phone, MessageSquare } from 'lucide-react'
import { GeoScanResult } from '@/types/urgent'

interface NearestProfessionalsPreviewProps {
  latitude: number
  longitude: number
  serviceCategory?: string
  onContactProfessional?: (professionalId: string) => void
}

export function NearestProfessionalsPreview({
  latitude,
  longitude,
  serviceCategory,
  onContactProfessional
}: NearestProfessionalsPreviewProps) {
  const [scanResult, setScanResult] = useState<GeoScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // Mock data for demonstration - in real app this would come from API
  useEffect(() => {
    const mockResult: GeoScanResult = {
      professionals_found: 3,
      radius_searched: 5,
      service_category: serviceCategory,
      professionals: [
        {
          id: 'prof-1',
          nombre: 'María González',
          especialidad: 'Plomería',
          distance: 2.3,
          estimated_arrival: 15,
          rating: 4.8
        },
        {
          id: 'prof-2',
          nombre: 'Carlos Rodríguez',
          especialidad: 'Plomería',
          distance: 3.1,
          estimated_arrival: 25,
          rating: 4.6
        },
        {
          id: 'prof-3',
          nombre: 'Ana López',
          especialidad: 'Plomería',
          distance: 4.2,
          estimated_arrival: 35,
          rating: 4.9
        }
      ]
    }

    setTimeout(() => {
      setScanResult(mockResult)
      setLoading(false)
    }, 1500)
  }, [latitude, longitude, serviceCategory])

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-2"></div>
            <span>Buscando profesionales cercanos...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!scanResult || scanResult.professionals.length === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-500" />
            Profesionales Cercanos
          </CardTitle>
          <CardDescription>
            No se encontraron profesionales disponibles en tu área
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Estamos expandiendo nuestra búsqueda. Intenta nuevamente en unos minutos o
              considera una ubicación diferente.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green-600" />
          Profesionales Cercanos
        </CardTitle>
        <CardDescription>
          {scanResult.professionals_found} profesionales encontrados en {scanResult.radius_searched}km
          {serviceCategory && ` especializados en ${serviceCategory}`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {scanResult.professionals.map((professional) => (
          <div
            key={professional.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{professional.nombre}</h3>
                  <p className="text-sm text-gray-600">{professional.especialidad}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm text-gray-600">{professional.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {professional.distance}km
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {professional.estimated_arrival}min
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onContactProfessional?.(professional.id)}
                >
                  <Phone className="w-4 h-4 mr-1" />
                  Llamar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onContactProfessional?.(professional.id)}
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Mensaje
                </Button>
              </div>
            </div>
          </div>
        ))}

        <div className="text-center text-sm text-gray-500 mt-4">
          Los profesionales se actualizan en tiempo real según disponibilidad
        </div>
      </CardContent>
    </Card>
  )
}