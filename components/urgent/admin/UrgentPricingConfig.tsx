'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DollarSign, Settings, Save, RefreshCw } from 'lucide-react'
import { UrgentPricingRule, PricingRuleFormData } from '@/types/urgent'

interface UrgentPricingConfigProps {
  onSave: (data: PricingRuleFormData) => Promise<void>
  onRefresh?: () => Promise<void>
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
  { value: 'low', label: 'Baja', description: 'Servicio en horas' },
  { value: 'medium', label: 'Media', description: 'Servicio en 1 hora' },
  { value: 'high', label: 'Alta', description: 'Servicio inmediato' }
]

export function UrgentPricingConfig({
  onSave,
  onRefresh,
  isLoading = false
}: UrgentPricingConfigProps) {
  const [pricingRules, setPricingRules] = useState<UrgentPricingRule[]>([])
  const [formData, setFormData] = useState<PricingRuleFormData>({
    service_category: '',
    urgency_level: 'medium',
    base_price: 0,
    urgency_multiplier: 1.0
  })
  const [editingRule, setEditingRule] = useState<UrgentPricingRule | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Mock data for demonstration
  useEffect(() => {
    const mockRules: UrgentPricingRule[] = [
      {
        id: '1',
        service_category: 'Plomería',
        urgency_level: 'high',
        base_price: 2000,
        urgency_multiplier: 1.5,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        service_category: 'Electricidad',
        urgency_level: 'high',
        base_price: 2500,
        urgency_multiplier: 1.8,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
    setPricingRules(mockRules)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.service_category || !formData.urgency_level || formData.base_price <= 0) {
      setError('Todos los campos son requeridos y el precio base debe ser mayor a 0')
      return
    }

    try {
      await onSave(formData)
      setSuccess('Regla de precios guardada exitosamente')

      // Reset form
      setFormData({
        service_category: '',
        urgency_level: 'medium',
        base_price: 0,
        urgency_multiplier: 1.0
      })
      setEditingRule(null)

      // Refresh rules
      if (onRefresh) {
        await onRefresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la regla de precios')
    }
  }

  const handleEdit = (rule: UrgentPricingRule) => {
    setFormData({
      service_category: rule.service_category,
      urgency_level: rule.urgency_level,
      base_price: rule.base_price,
      urgency_multiplier: rule.urgency_multiplier
    })
    setEditingRule(rule)
  }

  const calculateFinalPrice = (basePrice: number, multiplier: number) => {
    return Math.round(basePrice * multiplier)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuración de Precios Dinámicos
          </CardTitle>
          <CardDescription>
            Configura los precios base y multiplicadores de urgencia para diferentes categorías de servicio
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Categoría de servicio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría de servicio *
                </label>
                <select
                  value={formData.service_category}
                  onChange={(e) => setFormData(prev => ({ ...prev, service_category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar categoría</option>
                  {SERVICE_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Nivel de urgencia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nivel de urgencia *
                </label>
                <select
                  value={formData.urgency_level}
                  onChange={(e) => setFormData(prev => ({ ...prev, urgency_level: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {URGENCY_LEVELS.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label} - {level.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Precio base */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio base ($) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="number"
                    value={formData.base_price}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      base_price: parseFloat(e.target.value) || 0
                    }))}
                    className="pl-10"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              {/* Multiplicador de urgencia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Multiplicador de urgencia
                </label>
                <Input
                  type="number"
                  value={formData.urgency_multiplier}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    urgency_multiplier: parseFloat(e.target.value) || 1.0
                  }))}
                  min="1.0"
                  step="0.1"
                  placeholder="1.0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Precio final: ${calculateFinalPrice(formData.base_price, formData.urgency_multiplier || 1.0)}
                </p>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <Button type="submit" disabled={isLoading}>
                <Save className="w-4 h-4 mr-2" />
                {editingRule ? 'Actualizar' : 'Guardar'} Regla
              </Button>
              {editingRule && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingRule(null)
                    setFormData({
                      service_category: '',
                      urgency_level: 'medium',
                      base_price: 0,
                      urgency_multiplier: 1.0
                    })
                  }}
                >
                  Cancelar Edición
                </Button>
              )}
            </div>
          </form>

          {/* Mensajes */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Lista de reglas existentes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Reglas de Precios Actuales</CardTitle>
            <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {pricingRules.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No hay reglas de precios configuradas
            </p>
          ) : (
            <div className="space-y-3">
              {pricingRules.map(rule => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <span className="font-medium">{rule.service_category}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        rule.urgency_level === 'high' ? 'bg-red-100 text-red-800' :
                        rule.urgency_level === 'medium' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {rule.urgency_level.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Base: ${rule.base_price} × {rule.urgency_multiplier} = ${calculateFinalPrice(rule.base_price, rule.urgency_multiplier)}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(rule)}
                  >
                    Editar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}