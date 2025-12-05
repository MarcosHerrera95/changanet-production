/**
 * @page ProfessionalQuotes - Gestión de cotizaciones para profesionales
 * @descripción Gestión de solicitudes de presupuesto recibidas (REQ-31 a REQ-35)
 * @sprint Sprint 3 – Gestión Profesional
 * @tarjeta Tarjeta 8: [Frontend] Implementar Sistema de Cotizaciones Profesionales
 * @impacto Económico: Eficiencia en la respuesta a solicitudes de presupuesto
 */

import { useState, useEffect } from 'react';
import socketService from '../services/socketService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import LoadingSpinner from '../components/LoadingSpinner';
import { quotesAPI } from '../services/apiService';
import { useApiState } from '../hooks/useApi';

const ProfessionalQuotes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [filter, setFilter] = useState('all'); // all, pending, accepted, rejected, nearby
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseData, setResponseData] = useState({ precio: '', comentario: '' });
  const [successMsg, setSuccessMsg] = useState('');

  // Hook para manejar estados de API de forma consistente
  const { loading, error, execute: apiExecute } = useApiState({
    showErrorToast: true,
    logErrors: true,
    retryOnError: true,
    maxRetries: 2
  });

  useEffect(() => {
    if (user && (user.role === 'profesional' || user.rol === 'profesional')) {
      loadQuotes();
      // Conectar socket y escuchar eventos de ofertas
      socketService.connect();
      const refreshHandler = () => {
        loadQuotes();
      };
      socketService.addMessageListener('offerCreated', refreshHandler);
      socketService.addMessageListener('offerUpdated', refreshHandler);
      socketService.addMessageListener('offerStatusChanged', refreshHandler);
      return () => {
        socketService.removeMessageListener('offerCreated', refreshHandler);
        socketService.removeMessageListener('offerUpdated', refreshHandler);
        socketService.removeMessageListener('offerStatusChanged', refreshHandler);
      };
    } else {
      navigate('/');
    }
  }, [user, navigate]);

  const loadQuotes = async () => {
    try {
      const data = await apiExecute(quotesAPI.getProfessionalQuotes);
      setQuotes(data);
    } catch (err) {
      // Error ya manejado por useApiState
      console.error('Error loading quotes:', err);
    }
  };

  const respondToQuote = async (quoteId, action) => {
    try {
      const data = action === 'accept'
        ? { precio: responseData.precio, comentario: responseData.comentario }
        : {};

      await apiExecute(() => quotesAPI.respond(quoteId, action, data));

      // Recargar cotizaciones después de responder
      await loadQuotes();
      setRespondingTo(null);
      setResponseData({ precio: '', comentario: '' });
      setSuccessMsg(action === 'accept' ? '¡Oferta enviada exitosamente!' : 'Oferta rechazada.');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err) {
      // Error ya manejado por useApiState
      console.error('Error responding to quote:', err);
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    if (filter === 'all') return true;
    if (filter === 'nearby') return quote.cercana === true;
    return quote.estado === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'aceptado': return 'bg-green-100 text-green-800';
      case 'rechazado': return 'bg-red-100 text-red-800';
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'expirada': return 'bg-gray-300 text-gray-700';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'aceptado': return 'Aceptada';
      case 'rechazado': return 'Rechazada';
      case 'pendiente': return 'Pendiente';
      case 'expirada': return 'Expirada';
      default: return status;
    }
  };

  if (!user || (user.role !== 'profesional' && user.rol !== 'profesional')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <BackButton />
        </div>

        <div className="mb-8">
          {successMsg && (
            <div className="mb-6 bg-[var(--success-bg)] border border-[var(--success-border)] text-[var(--success)] px-4 py-3 rounded-lg animate-fade-in" role="status" aria-live="polite">
              {successMsg}
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900">Cotizaciones Recibidas</h1>
          <p className="mt-2 text-gray-600">
            Gestiona las solicitudes de presupuesto de tus potenciales clientes.
          </p>
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <div className="flex space-x-2">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'pendiente', label: 'Pendientes' },
              { key: 'aceptado', label: 'Aceptadas' },
              { key: 'rechazado', label: 'Rechazadas' },
              { key: 'nearby', label: 'Cercanas' } // Para futuro
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === key
                    ? 'bg-[#E30613] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="mb-6 bg-[var(--error-bg)] border border-[var(--error-border)] text-[var(--error)] px-4 py-3 rounded-lg" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <LoadingSpinner size="lg" message="Cargando cotizaciones..." />
        )}

        {!loading && (
          /* Lista de cotizaciones */
          <div className="space-y-6">
            {filteredQuotes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💰</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  {filter === 'all' ? 'No tienes cotizaciones aún' : `No hay cotizaciones ${filter}`}
                </h3>
                <p className="text-gray-600">
                  {filter === 'all'
                    ? 'Las cotizaciones aparecerán aquí cuando los clientes te soliciten presupuestos.'
                    : 'No hay cotizaciones con este estado.'
                  }
                </p>
              </div>
            ) : (
              filteredQuotes.map((quote) => (
                <div key={quote.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Cotización #{quote.id}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Cliente: {quote.cliente?.nombre || 'Cliente desconocido'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Fecha: {new Date(quote.creado_en).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quote.estado)}`}>
                      {getStatusText(quote.estado)}
                    </span>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Descripción del trabajo:</h4>
                    <p className="text-gray-700">{quote.descripcion}</p>
                    {quote.zona_cobertura && (
                      <p className="text-sm text-gray-600 mt-2">
                        Zona: {quote.zona_cobertura}
                      </p>
                    )}
                  </div>

                  {/* Mostrar respuesta si fue aceptada */}
                  {quote.estado === 'aceptado' && quote.precio && (
                    <div className="bg-green-50 p-4 rounded-lg mb-4">
                      <h4 className="font-medium text-green-800 mb-2">Cotización Aceptada</h4>
                      <p className="text-green-700">
                        Precio acordado: <strong>${quote.precio}</strong>
                      </p>
                      {quote.comentario && (
                        <p className="text-green-700 mt-1">
                          Comentario: {quote.comentario}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Formulario de respuesta para cotizaciones pendientes */}
                  {respondingTo === quote.id && quote.estado === 'pendiente' && (
                    <div className="bg-blue-50 p-4 rounded-lg mb-4">
                      <h4 className="font-medium text-blue-800 mb-3">Responder Cotización</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-blue-700 mb-1">
                            Precio ($)
                          </label>
                          <input
                            type="number"
                            value={responseData.precio}
                            onChange={(e) => setResponseData({...responseData, precio: e.target.value})}
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ingresa tu precio"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-700 mb-1">
                            Comentario (opcional)
                          </label>
                          <textarea
                            value={responseData.comentario}
                            onChange={(e) => setResponseData({...responseData, comentario: e.target.value})}
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows="3"
                            placeholder="Agrega detalles sobre tu cotización..."
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => respondToQuote(quote.id, 'accept')}
                            disabled={!responseData.precio}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Aceptar Cotización
                          </button>
                          <button
                            onClick={() => setRespondingTo(null)}
                            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Acciones según estado */}
                  <div className="flex space-x-3">
                    {quote.estado === 'pendiente' && (
                      <>
                        <button
                          onClick={() => setRespondingTo(quote.id)}
                          className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--primary-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                          aria-label="Responder cotización"
                        >
                          Responder
                        </button>
                        <button
                          onClick={() => respondToQuote(quote.id, 'reject')}
                          className="bg-[var(--error)] text-white px-4 py-2 rounded-lg hover:bg-[var(--error-bg)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                          aria-label="Rechazar cotización"
                        >
                          Rechazar
                        </button>
                      </>
                    )}

                    {quote.estado === 'aceptado' && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm text-green-800">
                          ✅ Cotización aceptada - El cliente puede agendar el servicio
                        </p>
                      </div>
                    )}

                    {quote.estado === 'rechazado' && (
                      <div className="bg-red-50 p-3 rounded-lg">
                        <p className="text-sm text-red-800">
                          ❌ Cotización rechazada
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessionalQuotes;
