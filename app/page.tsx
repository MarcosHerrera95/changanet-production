import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to payments dashboard or login based on auth status
  // For now, redirect to client payments
  redirect('/payments/client')
}