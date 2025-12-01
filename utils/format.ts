import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('es-AR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('es-AR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case 'pendiente':
      return 'badge-warning'
    case 'aprobado':
      return 'badge-info'
    case 'liberado':
      return 'badge-success'
    case 'rechazado':
    case 'cancelado':
      return 'badge-danger'
    default:
      return 'badge-info'
  }
}

export function getPaymentStatusText(status: string): string {
  switch (status) {
    case 'pendiente':
      return 'Pendiente'
    case 'aprobado':
      return 'Aprobado'
    case 'liberado':
      return 'Liberado'
    case 'rechazado':
      return 'Rechazado'
    case 'cancelado':
      return 'Cancelado'
    default:
      return status
  }
}

export function getPayoutStatusColor(status: string): string {
  switch (status) {
    case 'pendiente':
      return 'badge-warning'
    case 'procesando':
      return 'badge-info'
    case 'completado':
      return 'badge-success'
    case 'fallido':
      return 'badge-danger'
    default:
      return 'badge-info'
  }
}

export function getPayoutStatusText(status: string): string {
  switch (status) {
    case 'pendiente':
      return 'Pendiente'
    case 'procesando':
      return 'Procesando'
    case 'completado':
      return 'Completado'
    case 'fallido':
      return 'Fallido'
    default:
      return status
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateAmount(amount: number): boolean {
  return amount > 0 && amount <= 1000000 // Max 1M ARS
}

export function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, '').trim()
}