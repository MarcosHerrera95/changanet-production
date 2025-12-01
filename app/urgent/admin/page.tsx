'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Settings, Monitor, TrendingUp, RefreshCw, AlertTriangle } from 'lucide-react'
import { UrgentPricingConfig } from '@/components/urgent/admin/UrgentPricingConfig'
import { UrgentRequestsMonitor } from '@/components/urgent/admin/UrgentRequestsMonitor'
import { PricingRuleFormData } from '@/types/urgent'

export default function UrgentAdminPage() {
  const [activeTab, setActiveTab] = useState<'monitor' | 'pricing'>('monitor')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSavePricing = async (data: PricingRuleFormData) => {
    try {
      setIsLoading(true)
      setError('')
      setSuccess('')

      // Mock API call
      console.log('Saving pricing rule:', data)
      await new Promise(resolve => setTimeout(resolve, 1000))

      setSuccess('Regla de precios guardada exitosamente')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar regla de precios')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshPricing = async () => {
    try {
      setIsLoading(true)
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (err) {
      setError('Error al actualizar reglas de precios')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshMonitor = async () => {
    try {
      setIsLoading(true)
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (err) {
      setError('Error al actualizar datos de monitoreo')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTriggerDispatch = async (requestId: string) => {
    try {
      setIsLoading(true)
      setError('')
      setSuccess('')

      // Mock API call
      console.log('Triggering auto dispatch for:', requestId)
      await new Promise(resolve => setTimeout(resolve, 1500))

      setSuccess('Asignación automática ejecutada exitosamente')
    } catch (err) {
      setError('Error al ejecutar asignación automática')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Administración de Servicios Urgentes
              </h1>
              <p className="text-gray-600 mt-1">
                Gestiona precios dinámicos, monitorea solicitudes y supervisa el sistema de asignación automática
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Monitor className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">24</p>
                    <p className="text-sm text-gray-600">Solicitudes hoy</p>
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
                    <p className="text-2xl font-bold text-gray-900">92%</p>
                    <p className="text-sm text-gray-600">Tasa de éxito</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <RefreshCw className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">8.5min</p>
                    <p className="text-sm text-gray-600">Tiempo respuesta</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Settings className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">12</p>
                    <p className="text-sm text-gray-600">Reglas activas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Navigation */}
        <div className="flex gap-4 mb-6">
          <Button
            variant={activeTab === 'monitor' ? 'default' : 'outline'}
            onClick={() => setActiveTab('monitor')}
            className="flex items-center gap-2"
          >
            <Monitor className="w-4 h-4" />
            Monitoreo de Solicitudes
          </Button>
          <Button
            variant={activeTab === 'pricing' ? 'default' : 'outline'}
            onClick={() => setActiveTab('pricing')}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Configuración de Precios
          </Button>
        </div>

        {/* Main Content */}
        {activeTab === 'monitor' && (
          <UrgentRequestsMonitor
            onRefresh={handleRefreshMonitor}
            onTriggerDispatch={handleTriggerDispatch}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'pricing' && (
          <UrgentPricingConfig
            onSave={handleSavePricing}
            onRefresh={handleRefreshPricing}
            isLoading={isLoading}
          />
        )}

        {/* System Status */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              Estado del Sistema
            </CardTitle>
            <CardDescription>
              Información en tiempo real sobre el funcionamiento del sistema de servicios urgentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Asignación Automática</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600">Activa</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  El sistema está asignando automáticamente profesionales a solicitudes urgentes
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Notificaciones Push</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600">Operativas</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  Las notificaciones en tiempo real están funcionando correctamente
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Geolocalización</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600">Disponible</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  Los servicios de ubicación están funcionando correctamente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}