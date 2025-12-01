/**
 * @page ClientQuotes - Gestión de solicitudes de cotización para clientes
 * @descripción Página que muestra todas las solicitudes de presupuesto enviadas por el cliente con sus ofertas (REQ-31 a REQ-35)
 * @sprint Sprint 2 – Solicitudes y Presupuestos
 * @tarjeta Tarjeta 6: [Frontend] Implementar Gestión de Cotizaciones Cliente
 * @impacto Económico: Transparencia en el proceso de solicitud y respuesta de presupuestos
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNotificationContext } from '../context/NotificationContext';
import BackButton from '../components/BackButton';
import { sendQuoteAcceptedNotification, sendQuoteNotification } from '../services/quoteNotificationService';

const ClientQuotes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const notificationContext = useNotificationContext();
  const [quoteRequests, setQuoteRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedOffersForCompare, setSelectedOffersForCompare] = useState([]);

  useEffect(() => {
    if (user && (user.role === 'cliente' || user.rol === 'cliente')) {
      loadQuoteRequests();
    } else {
      navigate('/');
    }
  }, [user, navigate]);

  const loadQuoteRequests = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('changanet_token');

      if (!token) {
        setError('No se encontró token de autenticación');
        return;
      }

      const response = await fetch('/api/quotes/client', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQuoteRequests(data || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al cargar solicitudes de cotización');
      }
    } catch (err) {
      console.error('Error loading quote requests:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const respondToOffer = async (quoteId, professionalId, action, precio = null, comentario = '') => {
    try {
      const token = sessionStorage.getItem('changanet_token');
      const response = await fetch('/api/quotes/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quoteId,
          action: action === 'accept' ? 'accept' : 'reject',
          precio: action === 'accept' ? precio : undefined,
          comentario: action === 'accept' ? comentario : undefined
        })
      });

      if (response.ok) {
        // Enviar notificación de respuesta
        const offerData = { 
          id: quoteId, 
          profesional: { id: professionalId, nombre: 'Profesional' }
        };
        
        if (notificationContext) {
          await sendQuoteAcceptedNotification(notificationContext, offerData, action);
        }

        loadQuoteRequests();
        setSuccess('Respuesta enviada exitosamente');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al responder oferta');
      }
    } catch (err) {
      console.error('Error responding to offer:', err);
      setError('Error de conexión');
    }
  };

  /**
   * @función toggleOfferForCompare - Toggle oferta para comparación
   * @descripción Agrega/remueve oferta de la lista de comparación (REQ-34)
   * @param {Object} offer - Oferta a agregar/remover
   */
  const toggleOfferForCompare = (offer) => {
    setSelectedOffersForCompare(prev => {
      const exists = prev.find(o => o.id === offer.id);
      if (exists) {
        return prev.filter(o => o.id !== offer.id);
      } else {
        return [...prev, offer];
      }
    });
  };

  /**
   * @función clearComparison - Limpiar selección de comparación
   * @descripción Limpia todas las ofertas seleccionadas para comparación
   */
  const clearComparison = () => {
    setSelectedOffersForCompare([]);
  };

  /**
   * @función getOffersForComparison - Obtener ofertas para comparar
   * @descripción Filtra ofertas pendientes para comparación
   * @returns {Array} Array de ofertas pendientes
   */
  const getOffersForComparison = () => {
    return quoteRequests.flatMap(request => 
      (request.ofertas || [])
        .filter(offer => offer.estado === 'PENDIENTE')
        .map(offer => ({
          ...offer,
          solicitud: {
            id: request.id,
            descripcion: request.descripcion,
            zona_cobertura: request.zona_cobertura
          }
        }))
    );
  };

  const getOfferStatusColor = (estado) => {
    switch (estado) {
      case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800';
      case 'ACEPTADO': return 'bg-green-100 text-green-800';
      case 'RECHAZADO': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOfferStatusText = (estado) => {
    switch (estado) {
      case 'PENDIENTE': return 'Pendiente';
      case 'ACEPTADO': return 'Aceptada';
      case 'RECHAZADO': return 'Rechazada';
      default: return estado;
    }
  };

  const canRespondToOffer = (offer) => {
    return offer.estado === 'PENDIENTE';
  };

  if (!user || (user.role !== 'cliente' && user.rol !== 'cliente')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mis Solicitudes de Cotización</h1>
          <p className="mt-2 text-gray-600">
            Gestiona tus solicitudes de presupuesto y revisa las ofertas de los profesionales.
          </p>
          <div className="mt-4 flex gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas las Solicitudes
            </button>
            <button
              onClick={() => setFilter('offers')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'offers' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Solo Ofertas Recibidas ({quoteRequests.reduce((total, req) => total + (req.ofertas?.length || 0), 0)})
            </button>
            <button
              onClick={() => setFilter('compare')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'compare' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Comparar Ofertas ({getOffersForComparison().length})
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
            {success}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Cargando solicitudes...</span>
          </div>
        )}

        {/* Content based on filter */}
        {!loading && (
          <div className="space-y-6">
            {filter === 'compare' ? (
              /* Vista de comparación de ofertas (REQ-34) */
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Comparar Ofertas</h2>
                {(() => {
                  const offersForComparison = getOffersForComparison();

                  return offersForComparison.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow">
                      <div className="text-6xl mb-4">⚖️</div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">
                        No hay ofertas pendientes para comparar
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Cuando recibas ofertas de profesionales, podrás compararlas aquí para tomar la mejor decisión.
                      </p>
                      <button
                        onClick={() => setFilter('all')}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Ver Todas las Solicitudes
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-4 flex justify-between items-center">
                        <p className="text-gray-600">Selecciona hasta 3 ofertas para comparar</p>
                        <button
                          onClick={clearComparison}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Limpiar Selección
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {offersForComparison.map((offer) => (
                          <div 
                            key={`${offer.solicitud.id}-${offer.id}`} 
                            className={`bg-white rounded-lg shadow border-2 transition-all duration-300 cursor-pointer ${
                              selectedOffersForCompare.find(o => o.id === offer.id)
                                ? 'border-purple-500 ring-2 ring-purple-200'
                                : 'border-gray-200 hover:border-purple-300'
                            }`}
                            onClick={() => toggleOfferForCompare(offer)}
                          >
                            {selectedOffersForCompare.find(o => o.id === offer.id) && (
                              <div className="absolute top-2 right-2">
                                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                            )}

                            <div className="p-6">
                              {/* Header del profesional */}
                              <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                                  <span className="text-white font-bold text-lg">
                                    {offer.profesional.nombre.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-gray-900">
                                    {offer.profesional.nombre}
                                  </h3>
                                  <p className="text-sm text-gray-500">Profesional</p>
                                </div>
                              </div>

                              {/* Información de la solicitud */}
                              <div className="mb-4">
                                <p className="text-sm text-gray-500 mb-1">Solicitud #{offer.solicitud.id}</p>
                                <p className="text-gray-700 text-sm">{offer.solicitud.descripcion}</p>
                                {offer.solicitud.zona_cobertura && (
                                  <p className="text-gray-500 text-xs mt-1">
                                    📍 {offer.solicitud.zona_cobertura}
                                  </p>
                                )}
                              </div>

                              {/* Precio destacado */}
                              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-4">
                                <div className="text-center">
                                  <p className="text-sm text-gray-600 mb-1">Precio Ofertado</p>
                                  <p className="text-3xl font-bold text-green-600">
                                    ${offer.precio || 'A convenir'}
                                  </p>
                                </div>
                              </div>

                              {/* Comentario */}
                              {offer.comentario && (
                                <div className="mb-4">
                                  <p className="text-sm text-gray-600 mb-1">Comentario del profesional:</p>
                                  <p className="text-gray-700 italic text-sm">"{offer.comentario}"</p>
                                </div>
                              )}

                              {/* Información adicional */}
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500">Respondido</p>
                                  <p className="font-medium">
                                    {offer.respondido_en 
                                      ? new Date(offer.respondido_en).toLocaleDateString('es-ES')
                                      : 'Hoy'
                                    }
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Estado</p>
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getOfferStatusColor(offer.estado)}`}>
                                    {getOfferStatusText(offer.estado)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Botones de acción */}
                            <div className="px-6 pb-6 pt-0">
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    respondToOffer(offer.solicitud.id, offer.profesional.id, 'accept', offer.precio, offer.comentario);
                                  }}
                                  className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                >
                                  ✅ Aceptar
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/chat?user=${offer.profesional.id}`);
                                  }}
                                  className="flex-1 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                                >
                                  💬 Chat
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Panel de comparación */}
                      {selectedOffersForCompare.length > 0 && (
                        <div className="mt-8 bg-purple-50 border border-purple-200 rounded-lg p-6">
                          <h3 className="text-lg font-bold text-purple-900 mb-4">
                            Ofertas Seleccionadas ({selectedOffersForCompare.length})
                          </h3>
                          
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr>
                                  <th className="text-left py-2 text-purple-800">Profesional</th>
                                  <th className="text-left py-2 text-purple-800">Precio</th>
                                  <th className="text-left py-2 text-purple-800">Comentario</th>
                                  <th className="text-left py-2 text-purple-800">Fecha</th>
                                  <th className="text-left py-2 text-purple-800">Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedOffersForCompare.map((offer) => (
                                  <tr key={offer.id} className="border-t border-purple-200">
                                    <td className="py-2">
                                      <div className="flex items-center">
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-2">
                                          <span className="text-white font-bold text-sm">
                                            {offer.profesional.nombre.charAt(0).toUpperCase()}
                                          </span>
                                        </div>
                                        <span className="font-medium">{offer.profesional.nombre}</span>
                                      </div>
                                    </td>
                                    <td className="py-2 font-bold text-green-600">
                                      ${offer.precio || 'A convenir'}
                                    </td>
                                    <td className="py-2 text-sm max-w-xs truncate">
                                      {offer.comentario || 'Sin comentario'}
                                    </td>
                                    <td className="py-2 text-sm">
                                      {offer.respondido_en 
                                        ? new Date(offer.respondido_en).toLocaleDateString('es-ES')
                                        : 'Hoy'
                                      }
                                    </td>
                                    <td className="py-2">
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => respondToOffer(offer.solicitud.id, offer.profesional.id, 'accept', offer.precio, offer.comentario)}
                                          className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                                        >
                                          Aceptar
                                        </button>
                                        <button
                                          onClick={() => navigate(`/profesional/${offer.profesional.id}`)}
                                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                                        >
                                          Ver Perfil
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : filter === 'offers' ? (
              /* Vista de solo ofertas */
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Cotizaciones Recibidas</h2>
                {(() => {
                  const allOffers = quoteRequests.flatMap(request =>
                    (request.ofertas || []).map(offer => ({
                      ...offer,
                      solicitud: {
                        id: request.id,
                        descripcion: request.descripcion,
                        zona_cobertura: request.zona_cobertura,
                        creado_en: request.creado_en
                      }
                    }))
                  );

                  return allOffers.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow">
                      <div className="text-6xl mb-4">📋</div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">
                        No has recibido cotizaciones aún
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Cuando los profesionales respondan a tus solicitudes, aparecerán aquí.
                      </p>
                      <button
                        onClick={() => setFilter('all')}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Ver Solicitudes
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {allOffers.map((offer) => (
                        <div key={`${offer.solicitud.id}-${offer.id}`} className="bg-white rounded-lg shadow p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center mb-3">
                                <h4 className="text-lg font-semibold text-gray-900 mr-3">
                                  {offer.profesional.nombre}
                                </h4>
                                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getOfferStatusColor(offer.estado)}`}>
                                  {getOfferStatusText(offer.estado)}
                                </span>
                              </div>

                              <div className="mb-3">
                                <p className="text-sm text-gray-500">Solicitud #{offer.solicitud.id}</p>
                                <p className="text-gray-700 text-sm">{offer.solicitud.descripcion}</p>
                                {offer.solicitud.zona_cobertura && (
                                  <p className="text-gray-500 text-sm">📍 {offer.solicitud.zona_cobertura}</p>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                {offer.precio && (
                                  <div>
                                    <p className="text-sm text-gray-500">Precio ofrecido</p>
                                    <p className="text-xl font-bold text-green-600">${offer.precio}</p>
                                  </div>
                                )}
                                {offer.respondido_en && (
                                  <div>
                                    <p className="text-sm text-gray-500">Respondido el</p>
                                    <p className="font-medium">
                                      {new Date(offer.respondido_en).toLocaleDateString('es-ES')}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm text-gray-500">Estado</p>
                                  <p className="font-medium">{getOfferStatusText(offer.estado)}</p>
                                </div>
                              </div>

                              {offer.comentario && (
                                <div className="mb-3">
                                  <p className="text-sm text-gray-500">Comentario del profesional</p>
                                  <p className="text-gray-700 italic">"{offer.comentario}"</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                            {canRespondToOffer(offer) && (
                              <>
                                <button
                                  onClick={() => respondToOffer(offer.solicitud.id, offer.profesional.id, 'accept', offer.precio, offer.comentario)}
                                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                                >
                                  ✅ Aceptar Cotización
                                </button>
                                <button
                                  onClick={() => respondToOffer(offer.solicitud.id, offer.profesional.id, 'reject')}
                                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                                >
                                  ❌ Rechazar Cotización
                                </button>
                              </>
                            )}

                            {offer.estado === 'ACEPTADO' && (
                              <button
                                onClick={() => navigate(`/servicio/crear?quoteId=${offer.solicitud.id}&professionalId=${offer.profesional.id}`)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                              >
                                📅 Agendar Servicio
                              </button>
                            )}

                            <button
                              onClick={() => navigate(`/chat?user=${offer.profesional.id}`)}
                              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                            >
                              💬 Contactar Profesional
                            </button>

                            <button
                              onClick={() => navigate(`/profesional/${offer.profesional.id}`)}
                              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                            >
                              👤 Ver Perfil
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Vista de solicitudes completas */
              <div>
                {quoteRequests.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg shadow">
                    <div className="text-6xl mb-4">💰</div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      No tienes solicitudes de cotización
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Cuando solicites presupuestos a profesionales, aparecerán aquí con sus ofertas.
                    </p>
                    <button
                      onClick={() => navigate('/profesionales')}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Solicitar Presupuesto
                    </button>
                  </div>
                ) : (
                  quoteRequests.map((request) => (
                    <div key={request.id} className="bg-white rounded-lg shadow p-6">
                      {/* Request Header */}
                      <div className="border-b border-gray-200 pb-4 mb-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">
                              Solicitud #{request.id}
                            </h3>
                            <p className="text-gray-600 mt-1">
                              Enviada el {new Date(request.creado_en).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Ofertas recibidas</p>
                            <p className="text-2xl font-bold text-blue-600">{request.ofertas?.length || 0}</p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-sm text-gray-500">Descripción del trabajo</p>
                          <p className="text-gray-700">{request.descripcion}</p>
                        </div>

                        {request.zona_cobertura && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-500">Zona de cobertura</p>
                            <p className="text-gray-700">{request.zona_cobertura}</p>
                          </div>
                        )}
                      </div>

                      {/* Offers Section */}
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-4">Ofertas Recibidas</h4>

                        {request.ofertas && request.ofertas.length > 0 ? (
                          <div className="space-y-4">
                            {request.ofertas.map((offer) => (
                              <div key={offer.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center mb-3">
                                      <h5 className="text-lg font-medium text-gray-900 mr-3">
                                        {offer.profesional.nombre}
                                      </h5>
                                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getOfferStatusColor(offer.estado)}`}>
                                        {getOfferStatusText(offer.estado)}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                      {offer.precio && (
                                        <div>
                                          <p className="text-sm text-gray-500">Precio ofrecido</p>
                                          <p className="text-xl font-bold text-green-600">${offer.precio}</p>
                                        </div>
                                      )}
                                      {offer.respondido_en && (
                                        <div>
                                          <p className="text-sm text-gray-500">Respondido el</p>
                                          <p className="font-medium">
                                            {new Date(offer.respondido_en).toLocaleDateString('es-ES')}
                                          </p>
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-sm text-gray-500">Estado</p>
                                        <p className="font-medium">{getOfferStatusText(offer.estado)}</p>
                                      </div>
                                    </div>

                                    {offer.comentario && (
                                      <div className="mb-3">
                                        <p className="text-sm text-gray-500">Comentario del profesional</p>
                                        <p className="text-gray-700 italic">"{offer.comentario}"</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                                  {canRespondToOffer(offer) && (
                                    <>
                                      <button
                                        onClick={() => respondToOffer(request.id, offer.profesional.id, 'accept', offer.precio, offer.comentario)}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                                      >
                                        ✅ Aceptar Oferta
                                      </button>
                                      <button
                                        onClick={() => respondToOffer(request.id, offer.profesional.id, 'reject')}
                                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                                      >
                                        ❌ Rechazar Oferta
                                      </button>
                                    </>
                                  )}

                                  {offer.estado === 'ACEPTADO' && (
                                    <button
                                      onClick={() => navigate(`/servicio/crear?quoteId=${request.id}&professionalId=${offer.profesional.id}`)}
                                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                    >
                                      📅 Agendar Servicio
                                    </button>
                                  )}

                                  <button
                                    onClick={() => navigate(`/chat?user=${offer.profesional.id}`)}
                                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                                  >
                                    💬 Contactar Profesional
                                  </button>

                                  <button
                                    onClick={() => navigate(`/profesional/${offer.profesional.id}`)}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                                  >
                                    👤 Ver Perfil
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <div className="text-4xl mb-2">⏳</div>
                            <p>Aún no has recibido ofertas para esta solicitud.</p>
                            <p className="text-sm mt-1">Los profesionales están evaluando tu solicitud.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientQuotes;
