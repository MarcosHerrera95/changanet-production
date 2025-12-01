import BackToAccountButton from '../components/ui/BackToAccountButton';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Quotes = () => {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotes();
  }, [user]);

  const fetchQuotes = async () => {
    if (!user) return;
    try {
      const userRole = user.rol || user.role;
      const endpoint = userRole === 'cliente' ? '/api/quotes/client' : '/api/quotes/professional';
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('changanet_token')}` }
      });
      const data = await response.json();
      if (response.ok) {
        setQuotes(data);
      }
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToQuote = async (quoteId, action, precio = null, comentario = '') => {
    try {
      const response = await fetch('/api/quotes/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        },
        body: JSON.stringify({ quoteId, action, precio, comentario })
      });

      if (response.ok) {
        alert(`Cotización ${action === 'accept' ? 'aceptada' : 'rechazada'} exitosamente`);
        fetchQuotes(); // Recargar lista
      }
    } catch (error) {
      console.error('Error responding to quote:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="container mx-auto px-4 py-8">
        <BackToAccountButton />

        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          {(user.rol || user.role) === 'cliente' ? 'Mis Cotizaciones' : 'Cotizaciones Recibidas'}
        </h1>

        {quotes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No tienes cotizaciones aún.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {quotes.map(quote => (
              <div key={quote.id} className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      {(user.rol || user.role) === 'cliente'
                        ? `Profesional: ${quote.profesional?.nombre || 'Nombre no disponible'}`
                        : `Cliente: ${quote.cliente?.nombre || 'Nombre no disponible'}`}
                    </h3>
                    <p className="text-gray-600 mb-2">{quote.descripción}</p>
                    <p className="text-sm text-gray-500">Zona: {quote.zona_cobertura}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        quote.estado === 'pendiente'
                          ? 'bg-amber-100 text-amber-800'
                          : quote.estado === 'aceptado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {quote.estado}
                    </span>
                    {quote.precio && (
                      <p className="text-lg font-bold text-emerald-600 mt-2">${quote.precio}</p>
                    )}
                  </div>
                </div>

                {(user.rol || user.role) === 'profesional' && quote.estado === 'pendiente' && (
                  <div className="flex space-x-4">
                    <button
                      onClick={() => {
                        const precio = prompt('Ingresa el precio:');
                        const comentario = prompt('Comentario (opcional):');
                        if (precio) handleRespondToQuote(quote.id, 'accept', parseFloat(precio), comentario);
                      }}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Aceptar
                    </button>
                    <button
                      onClick={() => handleRespondToQuote(quote.id, 'reject')}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Quotes;

