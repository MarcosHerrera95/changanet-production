/**
 * @component SubscribeForm - Formulario de suscripción al newsletter
 * @descripción Componente minimalista para capturar emails de suscripción (REQ-19)
 * @sprint Sprint 1 – Comunicación y Engagement
 * @tarjeta Tarjeta 6: [Frontend] Implementar Newsletter Subscription
 * @impacto Social: Conexión con usuarios interesados en contenido educativo
 */

import { useState } from 'react';

const SubscribeForm = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación básica de email
    if (!email.includes('@')) {
      setError('Por favor ingresa un email válido');
      return;
    }

    if (!validateEmail(email)) {
      setError('El formato del email no es válido');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setEmail(''); // Limpiar el campo
      } else {
        setError(data.error || 'Error al procesar la suscripción');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {success ? (
        <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-green-600 font-medium">
            ¡Gracias por suscribirte!
          </div>
          <div className="text-green-500 text-sm mt-1">
            Revisa tu bandeja de entrada para confirmar tu suscripción.
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3" aria-label="Formulario de suscripción" role="form">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Tu correo electrónico"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus:border-[var(--primary)] text-gray-900 placeholder-gray-500"
            disabled={loading}
            required
            aria-label="Correo electrónico para suscripción"
          />
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="px-6 py-3 bg-[var(--primary)] text-white font-medium rounded-lg hover:bg-[var(--primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            aria-label="Suscribirse al newsletter"
          >
            {loading ? 'Suscribiendo...' : 'Suscribirse'}
          </button>
        </form>
      )}

      {error && (
        <div className="mt-3 text-center text-[var(--error)] text-sm" role="alert" aria-live="assertive">
          {error}
        </div>
      )}
    </div>
  );
};

export default SubscribeForm;
