'use client'

import { useState } from 'react'
import { AdminPaymentsTable } from '@/components/admin/AdminPaymentsTable'
import { AdminPayoutsManager } from '@/components/admin/AdminPayoutsManager'
import { CommissionSettingsForm } from '@/components/admin/CommissionSettingsForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, Wallet, Settings, BarChart3 } from 'lucide-react'

type AdminViewType = 'payments' | 'payouts' | 'commissions'

export default function AdminPaymentsPage() {
  const [currentView, setCurrentView] = useState<AdminViewType>('payments')

  const views = [
    {
      id: 'payments' as AdminViewType,
      label: 'Gestión de Pagos',
      icon: Table,
      description: 'Supervisa y administra todos los pagos del sistema'
    },
    {
      id: 'payouts' as AdminViewType,
      label: 'Gestión de Payouts',
      icon: Wallet,
      description: 'Administra los pagos a profesionales'
    },
    {
      id: 'commissions' as AdminViewType,
      label: 'Configuración de Comisiones',
      icon: Settings,
      description: 'Configura las tasas de comisión de la plataforma'
    }
  ]

  const renderViewContent = () => {
    switch (currentView) {
      case 'payments':
        return <AdminPaymentsTable />
      case 'payouts':
        return <AdminPayoutsManager />
      case 'commissions':
        return <CommissionSettingsForm />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Panel de Administración - Pagos</h1>
              <p className="text-gray-600 mt-2">
                Gestiona pagos, comisiones y payouts del sistema
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <BarChart3 className="w-4 h-4" />
                <span>Estado del Sistema: Operativo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm">
            {views.map((view) => {
              const Icon = view.icon
              const isActive = currentView === view.id

              return (
                <Button
                  key={view.id}
                  variant={isActive ? 'default' : 'ghost'}
                  onClick={() => setCurrentView(view.id)}
                  className="flex-1 justify-start"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {view.label}
                </Button>
              )
            })}
          </div>
        </div>

        {/* View Description */}
        <div className="mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                {(() => {
                  const currentViewData = views.find(v => v.id === currentView)
                  const Icon = currentViewData?.icon || Table
                  return <Icon className="w-6 h-6 text-primary-600" />
                })()}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {views.find(v => v.id === currentView)?.label}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {views.find(v => v.id === currentView)?.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {renderViewContent()}
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>
                Operaciones comunes de administración
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="justify-start">
                  <Table className="w-4 h-4 mr-2" />
                  Ver Reporte de Pagos
                </Button>
                <Button variant="outline" className="justify-start">
                  <Wallet className="w-4 h-4 mr-2" />
                  Procesar Payouts Pendientes
                </Button>
                <Button variant="outline" className="justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Ajustes Globales
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}