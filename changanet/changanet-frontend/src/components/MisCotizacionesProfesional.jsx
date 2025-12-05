import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProfessionalInbox } from '../services/budgetRequestService';
import OfferSubmitForm from './OfferSubmitForm';
import './MisCotizacionesProfesional.css';

const MisCotizacionesProfesional = ({ onClose }) => {
   const navigate = useNavigate();
   const { user } = useAuth();

   // Estados para manejar detalles y sub-modales
   const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState(null);
   const [showDetails, setShowDetails] = useState(false);
   const [tipoSeccion, setTipoSeccion] = useState(''); // 'recibidas' o 'enviadas'
   const [loading, setLoading] = useState(false);
   const [requests, setRequests] = useState([]);
   const [error, setError] = useState('');
   const [showOfferForm, setShowOfferForm] = useState(false);

   // Cargar solicitudes del profesional
   useEffect(() => {
     loadProfessionalRequests();
   }, []);

   // Función para cargar solicitudes desde la API
   const loadProfessionalRequests = async () => {
     try {
       setLoading(true);
       setError('');

       const data = await getProfessionalInbox(user.id);
       setRequests(data);
       console.log('✅ Solicitudes del profesional cargadas:', data.length);
     } catch (err) {
       console.error('❌ Error cargando solicitudes del profesional:', err);
       setError(err.message);
     } finally {
       setLoading(false);
     }
   };

   // Función para abrir el sub-modal con la cotización específica
  const handleOpenDetails = (cotizacion, tipo) => {
    setCotizacionSeleccionada(cotizacion);
    setShowDetails(true);
    setTipoSeccion(tipo);
  };

  // Función para cerrar el sub-modal
  const handleCloseDetails = () => {
    setShowDetails(false);
    setCotizacionSeleccionada(null);
    setTipoSeccion('');
  };

  // Función para procesar la aceptación de la cotización (enviar respuesta)
  const handleEnviarRespuesta = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const precio = formData.get('precio');
    const tiempo = formData.get('tiempo');
    const comentarios = formData.get('comentarios');

    console.log("Enviando respuesta:", {
      ...cotizacionSeleccionada,
      respuesta: {
        precio: parseFloat(precio),
        tiempo: parseInt(tiempo),
        comentarios
      }
    });

    alert(`¡Respuesta enviada! Precio: $${precio}, Tiempo: ${tiempo} horas`);
    handleCloseDetails();
  };

  // Función para simular la finalización de un trabajo
  const handleFinalizarTrabajo = (e) => {
    e.preventDefault();
    console.log("Finalizando trabajo:", cotizacionSeleccionada);
    alert(`¡Trabajo marcado como completado!`);
    handleCloseDetails();
  };

  // Función para validar formato JWT básico
  // eslint-disable-next-line no-unused-vars
  const IS_VALID_JWT_TOKEN = (token) => {
    if (!token) return false;
    
    // Verificar formato básico JWT (3 partes separadas por .)
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('❌ Token JWT inválido: no tiene 3 partes');
      return false;
    }
    
    // Verificar que cada parte tenga contenido
    const [header, payload, signature] = parts;
    if (!header || !payload || !signature) {
      console.log('❌ Token JWT inválido: alguna parte está vacía');
      return false;
    }
    
    try {
      // Intentar decodificar el payload para verificar que es JSON válido
      JSON.parse(atob(payload));
      console.log('✅ Token JWT tiene formato válido');
      return true;
    } catch {
      console.log('❌ Token JWT inválido: payload no es JSON válido');
      return false;
    }
  };

  // Función para limpiar token corrupto
  // eslint-disable-next-line no-unused-vars
  const CLEAR_CORRUPTED_TOKEN = () => {
    console.warn('🧹 Limpiando token JWT corrupto');
    localStorage.removeItem('changanet_token');
    localStorage.removeItem('changanet_user');
    // Forzar logout del contexto de auth si está disponible
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  };

  // Función para abrir chat con el cliente usando UUIDs reales de la BD
  const handleOpenChat = async (clientData, clientName) => {
    try {
      setLoading(true);
      
      // Validar que tenemos datos válidos del cliente
      if (!clientData || !clientData.id) {
        throw new Error('Datos de cliente no válidos');
      }
      
      // Obtener token de autenticación
      const token = localStorage.getItem('changanet_token');
      if (!token) {
        throw new Error('Usuario no autenticado');
      }
      
      console.log('Abriendo chat con cliente:', clientData.id, clientData.nombre || clientName);
      
      // ✅ CORRECCIÓN: Usar UUIDs reales de la base de datos
      let clientId, professionalId;
      
      if (user.rol === 'profesional') {
        // Soy profesional, necesito el UUID del cliente
        clientId = clientData.id; // UUID del cliente
        professionalId = user.id; // Mi UUID profesional
      } else if (user.rol === 'cliente') {
        // Soy cliente, necesito el UUID del profesional
        clientId = user.id; // Mi UUID cliente
        professionalId = clientData.id; // UUID del profesional
      } else {
        throw new Error('Rol de usuario no reconocido');
      }
      
      // ✅ VALIDACIÓN: Verificar que los IDs son UUIDs válidos
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      if (!uuidRegex.test(clientId) || !uuidRegex.test(professionalId)) {
        throw new Error(`IDs deben ser UUIDs válidos. clientId: ${clientId}, professionalId: ${professionalId}`);
      }
      
      console.log('UUIDs validados:', { clientId, professionalId });
      
      // ✅ GENERAR conversationId correcto: UUID1-UUID2 (orden lexicográfico)
      const ids = [clientId, professionalId].sort();
      const conversationId = `${ids[0]}-${ids[1]}`;
      
      console.log('ConversationId generado:', conversationId);
      
      // Llamar al endpoint para crear o abrir conversación
      const apiBaseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003';
      const response = await fetch(`${apiBaseUrl}/api/chat/open-or-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId: clientId,
          professionalId: professionalId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear la conversación');
      }
      
      const data = await response.json();
      console.log('Conversación creada/abierta:', data);
      
      // Navegar al chat usando el conversationId
      if (data.conversationId) {
        navigate(`/chat/${data.conversationId}`);
      } else {
        throw new Error('No se pudo obtener el ID de conversación');
      }
      
      // Cerrar el modal de cotizaciones
      onClose();
      
    } catch (error) {
      console.error('Error al abrir el chat:', error);
      alert(`Error al abrir el chat: ${error.message}. Inténtalo de nuevo.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Mis Cotizaciones</h2>
          <button 
            onClick={onClose} 
            className="close-button"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>
        
        <div className="modal-body">
          <p className="modal-subtitle">Gestiona las solicitudes de presupuesto de tus clientes y tus ofertas.</p>

          {error && (
            <div className="error-message" style={{
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              color: '#c33',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          {/* Sección de Solicitudes Recibidas */}
          <div className="quote-section">
            <h4>Solicitudes Recibidas</h4>
            <p className="section-description">Solicitudes de clientes que necesitan tus servicios</p>

            {loading ? (
              <div className="loading-state" style={{ textAlign: 'center', padding: '40px' }}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p>Cargando solicitudes...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.6 }}>📋</div>
                <p>No tienes solicitudes pendientes aún</p>
                <p style={{ fontSize: '0.9rem', marginTop: '10px', opacity: 0.8 }}>
                  Las nuevas solicitudes aparecerán aquí automáticamente
                </p>
              </div>
            ) : (
              <div className="quotes-list">
                {requests.map((request) => (
                  <div key={request.id} className="quote-item pending">
                    <div className="quote-info">
                      <h5>{request.descripcion.substring(0, 50)}...</h5>
                      <p className="client-info">
                        <strong>Cliente:</strong> {request.cliente.nombre}<br/>
                        <strong>Zona:</strong> {request.zona_cobertura}<br/>
                        <strong>Fecha:</strong> {new Date(request.creado_en).toLocaleDateString('es-ES')}
                      </p>
                      <p className="quote-description">
                        <strong>Descripción:</strong> {request.descripcion}
                      </p>
                      {request.fotos_urls && request.fotos_urls.length > 0 && (
                        <div style={{ marginTop: '10px' }}>
                          <strong>Fotos adjuntas:</strong> {request.fotos_urls.length}
                        </div>
                      )}
                    </div>
                    <div className="quote-actions">
                      <span className="status-badge pending">
                        {request.mi_respuesta ? 'RESPONDIDA' : 'PENDIENTE'}
                      </span>
                      <div className="action-buttons-group">
                        <button
                          onClick={() => {
                            if (request.mi_respuesta) {
                              // Mostrar respuesta existente
                              handleOpenDetails({
                                id: request.id,
                                titulo: request.descripcion.substring(0, 30) + '...',
                                cliente: request.cliente,
                                descripcion: request.descripcion,
                                zona_cobertura: request.zona_cobertura,
                                fecha: new Date(request.creado_en).toLocaleDateString('es-ES'),
                                estado: 'RESPONDIDA',
                                mi_respuesta: {
                                  precio: request.mi_respuesta.precio,
                                  comentario: request.mi_respuesta.comentario,
                                  fecha_respuesta: request.mi_respuesta.respondido_en
                                }
                              }, 'enviadas');
                            } else {
                              // Mostrar formulario para responder
                              setCotizacionSeleccionada(request);
                              setShowOfferForm(true);
                            }
                          }}
                          className="btn-details"
                        >
                          {request.mi_respuesta ? 'Ver Mi Oferta' : 'Enviar Oferta'}
                        </button>
                        <button
                          onClick={() => handleOpenChat(request.cliente, request.cliente.nombre)}
                          disabled={loading}
                          className="btn-chat"
                          style={{
                            backgroundColor: '#009688',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            marginLeft: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>💬</span>
                          Chat con el Cliente
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Sub-modal para detalles y respuesta */}
        {showDetails && cotizacionSeleccionada && (
          <div className="modal-overlay-details" onClick={handleCloseDetails}>
            <div className="modal-content-details" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  {tipoSeccion === 'recibidas' && cotizacionSeleccionada.estado === 'PENDIENTE' 
                    ? 'Responder Solicitud' 
                    : 'Detalles de la Solicitud'}
                </h3>
                <button 
                  onClick={handleCloseDetails} 
                  className="close-button"
                  aria-label="Cerrar detalles"
                >
                  ✕
                </button>
              </div>
              
              <div className="modal-body">
                <div className="request-details">
                  <h4>{cotizacionSeleccionada.titulo}</h4>
                  <div className="detail-group">
                    <p><strong>Cliente:</strong> {cotizacionSeleccionada.cliente.nombre}</p>
                    <p><strong>Zona:</strong> {cotizacionSeleccionada.cliente.zona}</p>
                    <p><strong>Ubicación:</strong> {cotizacionSeleccionada.ubicacion}</p>
                    <p><strong>Fecha de solicitud:</strong> {cotizacionSeleccionada.fecha}</p>
                  </div>
                  
                  <div className="detail-group">
                    <p><strong>Descripción del trabajo:</strong></p>
                    <p className="description-text">{cotizacionSeleccionada.descripcion}</p>
                  </div>

                  {/* Mostrar mi respuesta si ya fue enviada */}
                  {cotizacionSeleccionada.mi_respuesta && (
                    <div className="detail-group">
                      <p><strong>Mi Respuesta:</strong></p>
                      <div className="my-response">
                        <p>💰 <strong>Precio:</strong> ${cotizacionSeleccionada.mi_respuesta.precio != null ? cotizacionSeleccionada.mi_respuesta.precio.toLocaleString() : '-'}</p>
                        <p>⏰ <strong>Tiempo estimado:</strong> {cotizacionSeleccionada.mi_respuesta.tiempo} horas</p>
                        <p>💬 <strong>Comentarios:</strong> {cotizacionSeleccionada.mi_respuesta.comentarios}</p>
                        <p><small>Respondido el: {cotizacionSeleccionada.mi_respuesta.fecha_respuesta}</small></p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Formulario de respuesta para solicitudes pendientes */}
                {tipoSeccion === 'recibidas' && cotizacionSeleccionada.estado === 'PENDIENTE' && (
                  <form className="response-form" onSubmit={handleEnviarRespuesta}>
                    <h4>Enviar Mi Respuesta</h4>
                    
                    <div className="form-group">
                      <label htmlFor="precio">Precio Total ($):</label>
                      <input
                        type="number"
                        id="precio"
                        name="precio"
                        required
                        min="1"
                        placeholder="Ej: 15000"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="tiempo">Tiempo Estimado (horas):</label>
                      <input
                        type="number"
                        id="tiempo"
                        name="tiempo"
                        required
                        min="1"
                        max="100"
                        placeholder="Ej: 2"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="comentarios">Comentarios Adicionales:</label>
                      <textarea
                        id="comentarios"
                        name="comentarios"
                        rows="3"
                        placeholder="Ej: Disponible este fin de semana. Tengo experiencia con..."
                      ></textarea>
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn-submit">
                        📤 Enviar Respuesta
                      </button>
                      <button type="button" onClick={handleCloseDetails} className="btn-cancel">
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}

                {/* Botón para trabajos aceptados */}
                {tipoSeccion === 'enviadas' && cotizacionSeleccionada.estado === 'ACEPTADA' && (
                  <div className="accepted-work-actions">
                    <div className="form-actions">
                      <button 
                        onClick={handleFinalizarTrabajo}
                        className="btn-complete"
                      >
                        ✅ Marcar como Completado
                      </button>
                      <button onClick={handleCloseDetails} className="btn-cancel">
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}

                {/* Solo botón cerrar para otros estados */}
                {((tipoSeccion === 'enviadas' && cotizacionSeleccionada.estado !== 'ACEPTADA') || 
                  (tipoSeccion === 'recibidas' && cotizacionSeleccionada.estado !== 'PENDIENTE')) && (
                  <div className="form-actions">
                    <button onClick={handleCloseDetails} className="btn-cancel">
                      Cerrar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal para enviar oferta */}
        {showOfferForm && cotizacionSeleccionada && (
          <div className="modal-overlay-details" onClick={() => setShowOfferForm(false)}>
            <div className="modal-content-details" onClick={(e) => e.stopPropagation()}>
              <OfferSubmitForm
                requestId={cotizacionSeleccionada.id}
                requestData={cotizacionSeleccionada}
                onSuccess={() => {
                  setShowOfferForm(false);
                  loadProfessionalRequests(); // Recargar la lista
                }}
                onCancel={() => setShowOfferForm(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MisCotizacionesProfesional;
