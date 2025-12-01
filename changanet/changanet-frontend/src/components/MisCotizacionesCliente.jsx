import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getClientBudgetRequests } from '../services/budgetRequestService';

// Estilos CSS integrados para el modal
const styles = `
/* Overlay principal del modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease-out;
}

/* Contenido principal del modal */
.modal-content {
  background-color: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  width: 800px;
  position: relative;
  animation: slideIn 0.3s ease-out;
}

/* Animaciones */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { 
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Encabezado del modal */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-title {
  color: #2c3e50;
  font-size: 1.8rem;
  margin: 0;
  font-weight: 600;
}

.modal-subtitle {
  color: #7f8c8d;
  font-size: 1rem;
  margin-bottom: 25px;
  margin-top: 5px;
}

/* Botón de cerrar */
.btn-close {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #ecf0f1;
  color: #7f8c8d;
  font-size: 1.5rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
}

.btn-close:hover {
  background-color: #e74c3c;
  color: white;
  transform: rotate(90deg) scale(1.1);
}

/* Contenido del modal */
.modal-body {
  padding: 20px 0;
}

.quotes-container {
  max-height: 60vh;
  overflow-y: auto;
}

.quote-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  background-color: #fafafa;
  transition: all 0.3s ease;
}

.quote-card:hover {
  border-color: #3498db;
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.1);
}

.quote-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.quote-title {
  color: #2c3e50;
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
}

.quote-date {
  color: #7f8c8d;
  font-size: 0.9rem;
}

.quote-description {
  color: #34495e;
  margin-bottom: 15px;
  line-height: 1.5;
}

.quote-location {
  color: #7f8c8d;
  font-size: 0.9rem;
  margin-bottom: 15px;
}

.photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
  margin-bottom: 15px;
}

.photo-item {
  width: 100px;
  height: 100px;
  border-radius: 6px;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.photo-item:hover {
  transform: scale(1.05);
}

.offers-section {
  background-color: white;
  border-radius: 6px;
  padding: 15px;
  margin-top: 15px;
}

.offers-title {
  color: #2c3e50;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 15px;
}

.offer-card {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 10px;
  background-color: #f8f9fa;
}

.offer-professional {
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 10px;
}

.offer-price {
  color: #27ae60;
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 5px;
}

.offer-comment {
  color: #7f8c8d;
  font-style: italic;
  margin-bottom: 10px;
}

.offer-status {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.offer-status.accepted {
  background-color: #d4edda;
  color: #155724;
}

.offer-status.pending {
  background-color: #fff3cd;
  color: #856404;
}

.offer-status.rejected {
  background-color: #f8d7da;
  color: #721c24;
}

.offer-actions {
  margin-top: 10px;
  display: flex;
  gap: 10px;
}

.btn-accept {
  background-color: #27ae60;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.3s ease;
}

.btn-accept:hover {
  background-color: #219a52;
}

.btn-chat {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.3s ease;
}

.btn-chat:hover {
  background-color: #2980b9;
}

.loading-state {
  text-align: center;
  padding: 40px 20px;
  color: #7f8c8d;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #7f8c8d;
}

.empty-state-icon {
  font-size: 3rem;
  margin-bottom: 15px;
  opacity: 0.6;
}

.empty-state-text {
  font-size: 1.1rem;
  margin: 0;
}

.error-state {
  text-align: center;
  padding: 40px 20px;
  color: #e74c3c;
}

.stats-section {
  background-color: #ecf0f1;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2c3e50;
}

.stat-label {
  font-size: 0.9rem;
  color: #7f8c8d;
  margin-top: 5px;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    padding: 20px;
    margin: 10px;
  }
  
  .modal-title {
    font-size: 1.5rem;
  }
  
  .quotes-container {
    max-height: 50vh;
  }
}

/* Accesibilidad */
.btn-close:focus {
  outline: 2px solid #3498db;
  outline-offset: 2px;
}
`;

const MisCotizacionesCliente = ({ onClose }) => {
  const { user } = useAuth();
  
  // Estados para manejar el modal y datos
  const [isVisible, setIsVisible] = useState(true);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);

  // Función para cerrar modal con tecla Escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Cargar cotizaciones del cliente
  useEffect(() => {
    loadClientQuotes();
  }, []);

  // Función para cargar solicitudes de presupuesto desde la API
  const loadClientQuotes = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getClientBudgetRequests(user.id);
      setQuotes(data);
      console.log('✅ Solicitudes de presupuesto cargadas:', data.length);
    } catch (err) {
      console.error('❌ Error cargando solicitudes de presupuesto:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para cerrar el modal
  const handleClose = () => {
    setIsVisible(false);
    // Pequeño delay para la animación de salida
    setTimeout(() => {
      if (onClose) {
        onClose();
      }
    }, 300);
  };

  // Función para manejar click en overlay
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Función para aceptar una oferta
  const handleAcceptOffer = async (quoteId, offerId) => {
    try {
      const token = localStorage.getItem('changanet_token');
      
      // En una implementación completa, aquí iría la lógica para aceptar la oferta
      // Por ahora solo simulamos el proceso
      alert('🎉 Oferta aceptada exitosamente. Se iniciará el proceso de contacto con el profesional.');
      
      // Recargar cotizaciones para mostrar el estado actualizado
      await loadClientQuotes();
    } catch (error) {
      console.error('Error aceptando oferta:', error);
      alert('Error al aceptar la oferta. Por favor, inténtalo de nuevo.');
    }
  };

  // Función para iniciar chat con profesional
  const handleStartChat = async (professionalId, professionalName) => {
    try {
      // Redirigir al chat usando parámetro ?user= (chat simplificado)
      window.location.href = `/chat?user=${professionalId}`;
      handleClose();
    } catch (error) {
      console.error('Error iniciando chat:', error);
      alert('Error al iniciar el chat. Por favor, inténtalo de nuevo.');
    }
  };

  // Formatear fecha para mostrar
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Función para obtener el texto del estado
  const getStatusText = (estado) => {
    const statusMap = {
      'PENDIENTE': 'Pendiente',
      'ACEPTADO': 'Aceptado',
      'RECHAZADO': 'Rechazado'
    };
    return statusMap[estado] || estado;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div 
        className="modal-overlay" 
        role="presentation"
        onClick={handleOverlayClick}
      >
        <div 
          className="modal-content" 
          role="dialog" 
          aria-labelledby="modal-title" 
          aria-describedby="modal-subtitle"
        >
          <button 
            onClick={handleClose} 
            className="btn-close" 
            aria-label="Cerrar modal de cotizaciones"
          >
            ×
          </button>
          
          <div className="modal-header">
            <h2 id="modal-title" className="modal-title">
              Mis Cotizaciones
            </h2>
          </div>
          
          <p id="modal-subtitle" className="modal-subtitle">
            Gestiona tus solicitudes de presupuesto y compara ofertas.
          </p>

          <div className="modal-body">
            {loading && (
              <div className="loading-state">
                <div className="empty-state-icon">⏳</div>
                <p className="empty-state-text">Cargando cotizaciones...</p>
              </div>
            )}

            {error && (
              <div className="error-state">
                <div className="empty-state-icon">❌</div>
                <p className="empty-state-text">{error}</p>
                <button 
                  onClick={loadClientQuotes}
                  style={{
                    marginTop: '15px',
                    padding: '8px 16px',
                    backgroundColor: '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Reintentar
                </button>
              </div>
            )}

            {!loading && !error && quotes.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <p className="empty-state-text">
                  No tienes cotizaciones aún
                </p>
                <p style={{ fontSize: '0.9rem', marginTop: '10px', opacity: 0.8 }}>
                  Ve al perfil de un profesional para solicitar un presupuesto.
                </p>
              </div>
            )}

            {!loading && !error && quotes.length > 0 && (
              <>
                {/* Estadísticas */}
                <div className="stats-section">
                  <div className="stats-grid">
                    <div className="stat-item">
                      <div className="stat-value">{quotes.length}</div>
                      <div className="stat-label">Solicitudes</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">
                        {quotes.reduce((acc, q) => acc + q.ofertas.filter(o => o.estado === 'ACEPTADO').length, 0)}
                      </div>
                      <div className="stat-label">Ofertas Recibidas</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">
                        {quotes.filter(q => q.ofertas.some(o => o.estado === 'ACEPTADO')).length}
                      </div>
                      <div className="stat-label">Con Ofertas</div>
                    </div>
                  </div>
                </div>

                {/* Lista de cotizaciones */}
                <div className="quotes-container">
                  {quotes.map((quote) => (
                    <div key={quote.id} className="quote-card">
                      <div className="quote-header">
                        <h3 className="quote-title">{quote.descripcion}</h3>
                        <span className="quote-date">{formatDate(quote.creado_en)}</span>
                      </div>
                      
                      <div className="quote-description">
                        {quote.descripcion}
                      </div>
                      
                      {quote.zona_cobertura && (
                        <div className="quote-location">
                          📍 {quote.zona_cobertura}
                        </div>
                      )}

                      {/* Fotos */}
                      {quote.fotos_urls && quote.fotos_urls.length > 0 && (
                        <div className="photos-grid">
                          {quote.fotos_urls.map((foto, index) => (
                            <img
                              key={index}
                              src={foto}
                              alt={`Foto ${index + 1}`}
                              className="photo-item"
                              onClick={() => window.open(foto, '_blank')}
                            />
                          ))}
                        </div>
                      )}

                      {/* Ofertas */}
                      <div className="offers-section">
                        <h4 className="offers-title">
                          Ofertas Recibidas ({quote.ofertas.filter(o => o.estado === 'ACEPTADO').length})
                        </h4>
                        
                        {quote.ofertas.filter(o => o.estado === 'ACEPTADO').length === 0 ? (
                          <p style={{ color: '#7f8c8d', fontStyle: 'italic' }}>
                            Aún no hay ofertas para esta solicitud.
                          </p>
                        ) : (
                          quote.ofertas
                            .filter(o => o.estado === 'ACEPTADO')
                            .sort((a, b) => (a.precio || 0) - (b.precio || 0))
                            .map((offer) => (
                              <div key={offer.id} className="offer-card">
                                <div className="offer-professional">
                                  👨‍💼 {offer.profesional.nombre}
                                </div>
                                
                                {offer.precio && (
                                  <div className="offer-price">
                                    💰 ${offer.precio.toLocaleString()}
                                  </div>
                                )}
                                
                                {offer.comentario && (
                                  <div className="offer-comment">
                                    💬 "{offer.comentario}"
                                  </div>
                                )}
                                
                                <div className="offer-status accepted">
                                  {getStatusText(offer.estado)}
                                </div>
                                
                                <div className="offer-actions">
                                  <button
                                    onClick={() => handleAcceptOffer(quote.id, offer.id)}
                                    className="btn-accept"
                                  >
                                    ✅ Aceptar Oferta
                                  </button>
                                  <button
                                    onClick={() => handleStartChat(offer.profesional.id, offer.profesional.nombre)}
                                    className="btn-chat"
                                  >
                                    💬 Chat
                                  </button>
                                </div>
                              </div>
                            ))
                        )}

                        {/* Ofertas pendientes */}
                        {quote.ofertas.filter(o => o.estado === 'PENDIENTE').length > 0 && (
                          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                            <strong>⏳ Pendientes:</strong> {quote.ofertas.filter(o => o.estado === 'PENDIENTE').length} profesional(es) aún no han respondido
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MisCotizacionesCliente;
