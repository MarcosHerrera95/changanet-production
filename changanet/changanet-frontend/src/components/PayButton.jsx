import { useState } from 'react';

const PayButton = ({ amount, description, professionalId, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async () => {
    setLoading(true);
    setError('');

    try {
      // Simulate payment processing
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        },
        body: JSON.stringify({
          amount,
          description,
          professionalId
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to payment gateway or show success
        alert(`Pago procesado exitosamente. Monto: $${amount}. Tu dinero está seguro en custodia.`);
        if (onSuccess) onSuccess(data);
      } else {
        setError(data.error || 'Error al procesar el pago');
        if (onError) onError(data.error);
      }
    } catch (err) {
      setError('Error de conexión. Inténtalo de nuevo.');
      if (onError) onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl" role="alert" aria-live="polite">
          {error}
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 px-8 rounded-2xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center min-h-[44px] touch-manipulation"
        aria-label={`Pagar $${amount} por ${description}`}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
            Procesando pago...
          </>
        ) : (
          <>
            <span className="mr-3">🔒</span>
            Pagar con Custodia Segura - ${amount}
          </>
        )}
      </button>

      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
        <div className="flex items-center mb-2">
          <span className="text-emerald-600 text-xl mr-2">🛡️</span>
          <h4 className="font-semibold text-emerald-800">Pago Seguro con Custodia</h4>
        </div>
        <p className="text-emerald-700 text-sm">
          Tu dinero queda protegido hasta que confirmes que el trabajo está completo. Pagas solo cuando estés 100% satisfecho.
        </p>
      </div>
    </div>
  );
};

export default PayButton;
