'use client'

import { useState } from 'react'
import { PayoutDashboard } from '@/components/professional/PayoutDashboard'
import { EarningsSummary } from '@/components/professional/EarningsSummary'
import { TransactionsList } from '@/components/professional/TransactionsList'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, TrendingUp, List, Wallet } from 'lucide-react'

type ViewType = 'dashboard' | 'earnings' | 'transactions'

export default function ProfessionalPaymentsPage() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard')

  const views = [
    {
      id: 'dashboard' as ViewType,
      label: 'Dashboard',
      icon: Wallet,
      description: 'Vista general de tus ingresos y payouts'
    },
    {
      id: 'earnings' as ViewType,
      label: 'Resumen de Ganancias',
      icon: TrendingUp,
      description: 'Análisis detallado de tus ganancias'
    },
    {
      id: 'transactions' as ViewType,
      label: 'Transacciones',
      icon: List,
      description: 'Lista completa de tus pagos y transacciones'
    }
  ]

  const renderViewContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <PayoutDashboard professionalId="prof-1" />
      case 'earnings':
        return <EarningsSummary professionalId="prof-1" />
      case 'transactions':
        return <TransactionsList professionalId="prof-1" />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pagos - Profesional</h1>
          <p className="text-gray-600 mt-2">
            Gestiona tus ingresos, comisiones y retiros
          </p>
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
                  const Icon = currentViewData?.icon || BarChart3
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
      </div>
    </div>
  )
}