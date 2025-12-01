'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { commissionsApi } from '@/lib/api'
import { CommissionSetting } from '@/types/payments'
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Percent
} from 'lucide-react'

const commissionSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  porcentaje: z.number().min(5, 'Mínimo 5%').max(10, 'Máximo 10%'),
  tipo_servicio: z.string().optional(),
  descripcion: z.string().optional(),
})

type CommissionFormData = z.infer<typeof commissionSchema>

interface CommissionSettingsFormProps {
  onSuccess?: () => void
}

export function CommissionSettingsForm({ onSuccess }: CommissionSettingsFormProps) {
  const [settings, setSettings] = useState<CommissionSetting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CommissionFormData>({
    resolver: zodResolver(commissionSchema),
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const response = await commissionsApi.getSettings()

      if (response.data.success) {
        setSettings(response.data.data)
        setError(null)
      } else {
        setError(response.data.error || 'Error al cargar configuraciones')
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error interno del servidor')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: CommissionFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      let response
      if (editingId) {
        response = await commissionsApi.updateSetting(editingId, data)
      } else {
        response = await commissionsApi.createSetting(data)
      }

      if (response.data.success) {
        await loadSettings()
        reset()
        setEditingId(null)
        setShowCreateForm(false)
        if (onSuccess) onSuccess()
      } else {
        setError(response.data.error || 'Error al guardar configuración')
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error interno del servidor')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (setting: CommissionSetting) => {
    setEditingId(setting.id)
    setValue('nombre', setting.nombre)
    setValue('porcentaje', setting.porcentaje)
    setValue('tipo_servicio', setting.tipo_servicio || '')
    setValue('descripcion', setting.descripcion || '')
    setShowCreateForm(true)
  }

  const handleDelete = async (settingId: string) => {
    if (!confirm('¿Está seguro de desactivar esta configuración de comisión?')) return

    try {
      const response = await commissionsApi.deactivateSetting(settingId)

      if (response.data.success) {
        await loadSettings()
        if (onSuccess) onSuccess()
      } else {
        setError(response.data.error || 'Error al desactivar configuración')
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error al desactivar configuración')
    }
  }

  const handleCancel = () => {
    reset()
    setEditingId(null)
    setShowCreateForm(false)
    setError(null)
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Cargando configuraciones...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Configuración de Comisiones
              </CardTitle>
              <CardDescription>
                Gestiona las tasas de comisión de la plataforma (5-10%)
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              variant={showCreateForm ? 'secondary' : 'default'}
            >
              {showCreateForm ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Configuración
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Create/Edit Form */}
          {showCreateForm && (
            <Card className="mb-6 border-primary-200">
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingId ? 'Editar Configuración' : 'Nueva Configuración'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="nombre" className="text-sm font-medium">
                        Nombre *
                      </label>
                      <Input
                        id="nombre"
                        placeholder="Ej: Comisión General"
                        {...register('nombre')}
                        className={errors.nombre ? 'border-danger-500' : ''}
                      />
                      {errors.nombre && (
                        <p className="text-sm text-danger-600">{errors.nombre.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="porcentaje" className="text-sm font-medium">
                        Porcentaje (%) *
                      </label>
                      <Input
                        id="porcentaje"
                        type="number"
                        step="0.1"
                        min="5"
                        max="10"
                        placeholder="5.0 - 10.0"
                        {...register('porcentaje', { valueAsNumber: true })}
                        className={errors.porcentaje ? 'border-danger-500' : ''}
                      />
                      {errors.porcentaje && (
                        <p className="text-sm text-danger-600">{errors.porcentaje.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="tipo_servicio" className="text-sm font-medium">
                        Tipo de Servicio
                      </label>
                      <Input
                        id="tipo_servicio"
                        placeholder="Ej: limpieza, jardineria (opcional)"
                        {...register('tipo_servicio')}
                      />
                      <p className="text-xs text-gray-600">
                        Dejar vacío para configuración global
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="descripcion" className="text-sm font-medium">
                        Descripción
                      </label>
                      <Input
                        id="descripcion"
                        placeholder="Descripción opcional"
                        {...register('descripcion')}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg">
                      <p className="text-sm text-danger-800 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {error}
                      </p>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {editingId ? 'Actualizar' : 'Crear'}
                        </>
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Settings List */}
          <div className="space-y-4">
            {settings.length === 0 ? (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay configuraciones</h3>
                <p className="text-gray-600 mb-4">
                  Crea tu primera configuración de comisión
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Configuración
                </Button>
              </div>
            ) : (
              settings.map((setting) => (
                <Card key={setting.id} className="border-l-4 border-l-primary-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                          <Percent className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {setting.nombre}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {setting.tipo_servicio
                              ? `Tipo: ${setting.tipo_servicio}`
                              : 'Configuración Global'
                            }
                          </p>
                          {setting.descripcion && (
                            <p className="text-sm text-gray-500 mt-1">
                              {setting.descripcion}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary-600 mb-1">
                          {setting.porcentaje}%
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleEdit(setting)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(setting.id)}
                            variant="outline"
                            size="sm"
                            className="text-danger-600 hover:text-danger-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-600">
                      <span>
                        Creado: {new Date(setting.fecha_creacion).toLocaleDateString('es-AR')}
                      </span>
                      <span className={`flex items-center ${
                        setting.activo ? 'text-success-600' : 'text-gray-500'
                      }`}>
                        {setting.activo ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Activa
                          </>
                        ) : (
                          'Inactiva'
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}