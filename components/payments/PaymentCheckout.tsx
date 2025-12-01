'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { paymentsApi, commissionsApi } from '@/lib/api'
import { formatCurrency, cn } from '@/utils/format'
import { Payment, Service, CommissionCalculation } from '@/types/payments'
import { Loader2, CreditCard, AlertCircle, CheckCircle } from 'lucide-react'
import { debounce } from '@/utils/debounce'

const checkoutSchema = z.object({
  serviceId: z.string().min(1, 'Debe seleccionar un servicio'),
  amount: z.number().min(1, 'El monto debe ser mayor a 0').max(1000000, 'Monto máximo excedido'),
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

interface PaymentCheckoutProps {
  service?: Service
  onSuccess?: (payment: Payment) => void
  onCancel?: () => void
}

export function PaymentCheckout({ service, onSuccess, onCancel }: PaymentCheckoutProps) {
  // Performance optimization: This component is already optimized with debouncing
  // For even better performance, consider lazy loading this entire component
  const [isLoading, setIsLoading] = useState(false)
  const [commission, setCommission] = useState<CommissionCalculation | null>(null)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      serviceId: service?.id || '',
      amount: service?.profesional?.perfil_profesional?.tarifa_hora || 0,
    },
  })

  const watchedAmount = watch('amount')
  const watchedServiceId = watch('serviceId')

  // Calculate commission when amount changes (debounced)
  useEffect(() => {
    if (watchedAmount && watchedAmount > 0) {
      debouncedCalculateCommission(watchedAmount)
    }
  }, [watchedAmount, debouncedCalculateCommission])

  // Set service ID when service prop changes
  useEffect(() => {
    if (service?.id) {
      setValue('serviceId', service.id)
      if (service.profesional?.perfil_profesional?.tarifa_hora) {
        setValue('amount', service.profesional.perfil_profesional.tarifa_hora)
      }
    }
  }, [service, setValue])

  const calculateCommission = useCallback(async (amount: number) => {
    try {
      const response = await commissionsApi.calculateCommission(amount, service?.tipo_servicio)
      if (response.data.success) {
        setCommission(response.data.data)
      }
    } catch (error) {
      console.error('Error calculating commission:', error)
    }
  }, [service?.tipo_servicio])

  // Debounced commission calculation
  const debouncedCalculateCommission = useCallback(
    debounce(calculateCommission, 500),
    [calculateCommission]
  )

  const onSubmit = async (data: CheckoutFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await paymentsApi.createPreference(data.serviceId, data.amount)

      if (response.data.success) {
        const preference = response.data.data
        setPaymentUrl(preference.init_point)

        // Open MercadoPago checkout in new window
        window.open(preference.init_point, '_blank')

        // Call success callback with payment data
        if (onSuccess) {
          onSuccess(response.data.data.paymentId)
        }
      } else {
        setError(response.data.error || 'Error al crear la preferencia de pago')
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error interno del servidor')
    } finally {
      setIsLoading(false)
    }
  }

  if (paymentUrl) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-success-600" />
          </div>
          <CardTitle className="text-success-800">Pago Iniciado</CardTitle>
          <CardDescription>
            Se ha abierto MercadoPago en una nueva ventana para completar el pago.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => window.open(paymentUrl, '_blank')}
            className="w-full"
            variant="outline"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Reabrir MercadoPago
          </Button>
          <Button onClick={onCancel} variant="ghost" className="w-full">
            Volver
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="w-5 h-5 mr-2" />
          Checkout de Pago
        </CardTitle>
        <CardDescription>
          Complete los detalles para procesar el pago del servicio
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Service Info */}
          {service && (
            <div className="p-4 bg-secondary-50 rounded-lg">
              <h4 className="font-medium text-secondary-900">{service.descripcion}</h4>
              <p className="text-sm text-secondary-600">
                Profesional: {service.profesional.nombre}
              </p>
              {service.es_urgente && (
                <p className="text-sm text-warning-600 font-medium">
                  ⚡ Servicio urgente (+20% adicional)
                </p>
              )}
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium">
              Monto a pagar
            </label>
            <Input
              id="amount"
              type="number"
              placeholder="Ingrese el monto"
              {...register('amount', { valueAsNumber: true })}
              className={cn(errors.amount && 'border-danger-500')}
            />
            {errors.amount && (
              <p className="text-sm text-danger-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.amount.message}
              </p>
            )}
          </div>

          {/* Commission Breakdown */}
          {commission && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Desglose del pago</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Monto base:</span>
                  <span>{formatCurrency(commission.originalAmount)}</span>
                </div>
                <div className="flex justify-between text-danger-600">
                  <span>Comisión ({commission.commissionPercentage}%):</span>
                  <span>-{formatCurrency(commission.commissionAmount)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>Total a pagar:</span>
                  <span>{formatCurrency(commission.originalAmount)}</span>
                </div>
                <div className="flex justify-between text-success-600">
                  <span>Profesional recibe:</span>
                  <span>{formatCurrency(commission.professionalAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-sm text-danger-800 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pagar con MercadoPago
                </>
              )}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}