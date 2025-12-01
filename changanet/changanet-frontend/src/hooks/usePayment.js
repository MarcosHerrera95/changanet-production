import { useContext } from 'react';
import PaymentContext from '../context/PaymentContext';

// Hook to use payment context
export function usePayment() {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
}

export default usePayment;
