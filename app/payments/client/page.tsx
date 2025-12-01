'use client'

import { useState } from 'react'
import { PaymentCheckout } from '@/components/payments/PaymentCheckout'
import { PaymentStatus } from '@/components/payments/PaymentStatus'
import { PaymentHistory } from '@/components/payments/PaymentHistory'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Service } from '@/types/payments'
import { ArrowLeft, CreditCard, History, CheckCircle } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import NotificationDropdown from '@/components/NotificationDropdown'
import NotificationCenter from '@/components/NotificationCenter'
import NotificationPreferences from '@/components/NotificationPreferences'

// Mock service data - in real app this would come from API
const mockService: Service = {
  id: 'service-1',
  descripcion: 'Limpieza general del hogar',
  cliente_id: 'client-1',
  profesional_id: 'prof-1',
  estado: 'aceptado',
  es_urgente: false,
  cliente: {
    id: 'client-1',
    nombre: 'Juan Pérez',
    email: 'juan@example.com'
  },
  profesional: {
    id: 'prof-1',
    nombre: 'María González',
    email: 'maria@example.com',
    perfil_profesional: {
      tarifa_hora: 1500
    }
  }
}

type FlowStep = 'selection' | 'checkout' | 'status' | 'history'

export default function ClientPaymentsPage() {
  const [currentStep, setCurrentStep] = useState<FlowStep>('selection')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)

  // Notification states
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false)
  const [showNotificationCenter, setShowNotificationCenter] = useState(false)
  const [showNotificationPreferences, setShowNotificationPreferences] = useState(false)

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service)
    setCurrentStep('checkout')
  }

  const handlePaymentSuccess = (paymentId: string) => {
    setPaymentId(paymentId)
    setCurrentStep('status')
  }

  const steps = [
    { id: 'selection', label: 'Seleccionar Servicio', icon: CreditCard },
    { id: 'checkout', label: 'Checkout', icon: CreditCard },
    { id: 'status', label: 'Estado del Pago', icon: CheckCircle },
    { id: 'history', label: 'Historial', icon: History },
  ]

  const renderStepContent = () => {
    switch (currentStep) {
      case 'selection':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Seleccionar Servicio para Pagar
              </h2>
              <p className="text-gray-600">
                Elige el servicio que deseas pagar
              </p>
            </div>

            <div className="grid gap-4 max-w-2xl mx-auto">
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleServiceSelect(mockService)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {mockService.descripcion}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Profesional: {mockService.profesional.nombre}
                      </p>
                      <p className="text-sm text-gray-600">
                        Tarifa: ${mockService.profesional.perfil_profesional?.tarifa_hora}/hora
                      </p>
                    </div>
                    <Button>
                      Seleccionar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case 'checkout':
        return selectedService ? (
          <PaymentCheckout
            service={selectedService}
            onSuccess={handlePaymentSuccess}
            onCancel={() => setCurrentStep('selection')}
          />
        ) : null

      case 'status':
        return paymentId ? (
          <PaymentStatus
            paymentId={paymentId}
            onStatusChange={(status) => {
              if (status.status === 'approved' || status.status === 'liberado') {
                // Could auto-redirect to history after successful payment
              }
            }}
          />
        ) : null

      case 'history':
        return <PaymentHistory clientId="client-1" />

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pagos - Cliente</h1>
              <p className="text-gray-600 mt-2">
                Gestiona tus pagos y servicios
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <div className="relative">
                <NotificationBell
                  onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                />
                <NotificationDropdown
                  isOpen={showNotificationDropdown}
                  onClose={() => setShowNotificationDropdown(false)}
                  onOpenPreferences={() => {
                    setShowNotificationDropdown(false);
                    setShowNotificationPreferences(true);
                  }}
                />
              </div>

              {currentStep !== 'selection' && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('selection')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al Inicio
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = steps.findIndex(s => s.id === currentStep) > index

              return (
                <div key={step.id} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2
                    ${isActive ? 'border-primary-500 bg-primary-50' : ''}
                    ${isCompleted ? 'border-success-500 bg-success-500' : ''}
                    ${!isActive && !isCompleted ? 'border-gray-300' : ''}
                  `}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <Icon className={`w-5 h-5 ${
                        isActive ? 'text-primary-600' : 'text-gray-400'
                      }`} />
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    isActive ? 'text-primary-600' : 'text-gray-600'
                  }`}>
                    {step.label}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-4 ${
                      isCompleted ? 'bg-success-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-center">
          <div className="flex space-x-4">
            {currentStep !== 'history' && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep('history')}
              >
                <History className="w-4 h-4 mr-2" />
                Ver Historial
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Notification Modals */}
      <NotificationCenter
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
        onOpenPreferences={() => {
          setShowNotificationCenter(false);
          setShowNotificationPreferences(true);
        }}
      />

      <NotificationPreferences
        isOpen={showNotificationPreferences}
        onClose={() => setShowNotificationPreferences(false)}
      />
    </div>
  )
}