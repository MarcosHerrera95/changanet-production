'use client'

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'

// Lazy load the PaymentCheckout component
const PaymentCheckout = dynamic(() => import('./PaymentCheckout').then(mod => ({ default: mod.PaymentCheckout })), {
  loading: () => (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="h-32 bg-gray-200 rounded mb-4"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    </div>
  ),
  ssr: false // Disable SSR for payment components
})

// Re-export with the same interface
export const LazyPaymentCheckout: ComponentType<any> = PaymentCheckout
export default LazyPaymentCheckout