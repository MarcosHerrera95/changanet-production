import React, { useState } from 'react';

// Estilos en línea para el componente
const styles = {
  panelOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
  panelOverlayVisible: {
    opacity: 1,
  },
  panel: {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    maxWidth: '800px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    transform: 'scale(0.9)',
    transition: 'transform 0.3s ease',
  },
  panelVisible: {
    transform: 'scale(1)',
  },
  title: {
    color: '#009688',
    marginBottom: '10px',
    fontSize: '24px',
  },
  subtitle: {
    color: '#666',
    marginBottom: '20px',
    fontSize: '16px',
  },
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    color: '#009688',
    marginBottom: '15px',
    fontSize: '18px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '15px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#f9f9f9',
  },
  info: {
    flex: 1,
  },
  servicio: {
    fontWeight: 'bold',
    color: '#333',
  },
  clienteZona: {
    color: '#666',
    fontSize: '14px',
  },
  estado: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  estadoPendiente: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  estadoEnviada: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  button: {
    backgroundColor: '#009688',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  closeButton: {
    backgroundColor: '#ccc',
    color: '#333',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    marginTop: '20px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
  modalOverlayVisible: {
    opacity: 1,
  },
  modal: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    transform: 'scale(0.9)',
    transition: 'transform 0.3s ease',
  },
  modalVisible: {
    transform: 'scale(1)',
  },
  modalTitle: {
    color: '#009688',
    marginBottom: '20px',
    fontSize: '20px',
  },
  detailItem: {
    marginBottom: '15px',
  },
  label: {
    fontWeight: 'bold',
    color: '#333',
  },
  images: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  image: {
    width: '100px',
    height: '100px',
    objectFit: 'cover',
    borderRadius: '4px',
  },
  form: {
    marginTop: '20px',
  },
  input: {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    minHeight: '80px',
    resize: 'vertical',
  },
  submitButton: {
    backgroundColor: '#009688',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    marginRight: '10px',
  },
  modalCloseButton: {
    backgroundColor: '#ccc',
    color: '#333',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
};

const MisCotizaciones = ({ show, onClose }) => {
  // Estado para las listas de cotizaciones
  const [cotizacionesRecibidas, setCotizacionesRecibidas] = useState([
    {
      id: 1,
      cliente: { nombre: 'Diego Eduardo Euler', zona: 'QUILMES' },
      servicio: 'instalacion red electrica',
      descripcion: 'Necesito cambiar la instalación eléctrica de un baño.',
      imagenes: [],
      ubicacion: 'Buenos Aires',
      fecha: '2025-04-05',
      estado: 'PENDIENTE'
    },
    {
      id: 3,
      cliente: { nombre: 'Carlos Mendoza', zona: 'LANUS' },
      servicio: 'pintura casa',
      descripcion: 'Pintar las paredes de la sala.',
      imagenes: ['https://example.com/image1.jpg'],
      ubicacion: 'Buenos Aires',
      fecha: '2025-04-06',
      estado: 'PENDIENTE'
    },
  ]);

  const [cotizacionesRecientes, setCotizacionesRecientes] = useState([
    {
      id: 2,
      cliente: { nombre: 'María López', zona: 'PALERMO' },
      servicio: 'instalacion red electrica',
      descripcion: 'Cambiar tomas de corriente.',
      imagenes: [],
      ubicacion: 'Buenos Aires',
      fecha: '2025-04-04',
      estado: 'ENVIADA'
    },
  ]);

  // Estado para el modal de detalles
  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [formData, setFormData] = useState({
    precio: '',
    tiempo: '',
    comentarios: ''
  });

  // Función para abrir el panel (llamada desde el padre)
  // Función para cerrar el panel
  const handleClosePanel = () => {
    onClose();
    setCotizacionSeleccionada(null);
    setShowDetails(false);
  };

  // Función para abrir los detalles
  const handleOpenDetails = (cotizacion) => {
    setCotizacionSeleccionada(cotizacion);
    setShowDetails(true);
    setFormData({ precio: '', tiempo: '', comentarios: '' });
  };

  // Función para cerrar los detalles
  const handleCloseDetails = () => {
    setShowDetails(false);
    setCotizacionSeleccionada(null);
  };

  // Función para manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Función para enviar la cotización
  const handleSendQuote = (e) => {
    e.preventDefault();
    console.log("Enviando cotización:", formData);
    alert(`Oferta enviada por $${formData.precio} en ${formData.tiempo} horas.`);

    // Actualizar estado localmente
    if (cotizacionSeleccionada.estado === 'PENDIENTE') {
      setCotizacionesRecibidas(prev => prev.map(c =>
        c.id === cotizacionSeleccionada.id ? { ...c, estado: 'ENVIADA' } : c
      ));
    }

    handleCloseDetails();
  };

  if (!show) return null;

  return (
    <>
      {/* Panel principal */}
      <div
        style={{ ...styles.panelOverlay, ...(show ? styles.panelOverlayVisible : {}) }}
        onClick={handleClosePanel}
        aria-modal="true"
        role="dialog"
        aria-labelledby="panel-title"
      >
        <div
          style={{ ...styles.panel, ...(show ? styles.panelVisible : {}) }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="panel-title" style={styles.title}>Mis Cotizaciones</h2>
          <p style={styles.subtitle}>Gestiona tus solicitudes pendientes y recientes.</p>

          {/* Cotizaciones Recibidas */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Cotizaciones Recibidas</h3>
            <div style={styles.list}>
              {cotizacionesRecibidas.map(cotizacion => (
                <div key={cotizacion.id} style={styles.card}>
                  <div style={styles.info}>
                    <div style={styles.servicio}>{cotizacion.servicio}</div>
                    <div style={styles.clienteZona}>Cliente: {cotizacion.cliente.nombre} • Zona: {cotizacion.cliente.zona}</div>
                  </div>
                  <span style={{ ...styles.estado, ...(cotizacion.estado === 'PENDIENTE' ? styles.estadoPendiente : styles.estadoEnviada) }}>
                    {cotizacion.estado}
                  </span>
                  <button
                    style={styles.button}
                    onClick={() => handleOpenDetails(cotizacion)}
                    aria-label={`Ver detalles de la cotización para ${cotizacion.servicio}`}
                  >
                    Ver Detalles
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Cotizaciones Recientes */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Cotizaciones Recientes</h3>
            <div style={styles.list}>
              {cotizacionesRecientes.map(cotizacion => (
                <div key={cotizacion.id} style={styles.card}>
                  <div style={styles.info}>
                    <div style={styles.servicio}>{cotizacion.servicio}</div>
                    <div style={styles.clienteZona}>Cliente: {cotizacion.cliente.nombre} • Zona: {cotizacion.cliente.zona}</div>
                  </div>
                  <span style={{ ...styles.estado, ...(cotizacion.estado === 'PENDIENTE' ? styles.estadoPendiente : styles.estadoEnviada) }}>
                    {cotizacion.estado}
                  </span>
                  <button
                    style={styles.button}
                    onClick={() => handleOpenDetails(cotizacion)}
                    aria-label={`Ver detalles de la cotización para ${cotizacion.servicio}`}
                  >
                    Ver Detalles
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button style={styles.closeButton} onClick={handleClosePanel}>Cerrar</button>
        </div>
      </div>

      {/* Modal de detalles */}
      {showDetails && cotizacionSeleccionada && (
        <div
          style={{ ...styles.modalOverlay, ...(showDetails ? styles.modalOverlayVisible : {}) }}
          onClick={handleCloseDetails}
          aria-modal="true"
          role="dialog"
          aria-labelledby="modal-title"
        >
          <div
            style={{ ...styles.modal, ...(showDetails ? styles.modalVisible : {}) }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="modal-title" style={styles.modalTitle}>Detalles de la Cotización</h3>
            <div style={styles.detailItem}>
              <span style={styles.label}>Cliente: </span>{cotizacionSeleccionada.cliente.nombre}
            </div>
            <div style={styles.detailItem}>
              <span style={styles.label}>Zona: </span>{cotizacionSeleccionada.cliente.zona}
            </div>
            <div style={styles.detailItem}>
              <span style={styles.label}>Servicio: </span>{cotizacionSeleccionada.servicio}
            </div>
            <div style={styles.detailItem}>
              <span style={styles.label}>Descripción: </span>{cotizacionSeleccionada.descripcion}
            </div>
            <div style={styles.detailItem}>
              <span style={styles.label}>Ubicación: </span>{cotizacionSeleccionada.ubicacion}
            </div>
            <div style={styles.detailItem}>
              <span style={styles.label}>Fecha: </span>{cotizacionSeleccionada.fecha}
            </div>
            {cotizacionSeleccionada.imagenes.length > 0 && (
              <div style={styles.detailItem}>
                <span style={styles.label}>Imágenes: </span>
                <div style={styles.images}>
                  {cotizacionSeleccionada.imagenes.map((img, index) => (
                    <img key={index} src={img} alt={`Imagen ${index + 1}`} style={styles.image} />
                  ))}
                </div>
              </div>
            )}

            <form style={styles.form} onSubmit={handleSendQuote}>
              <label htmlFor="precio" style={styles.label}>Precio Final o Rango:</label>
              <input
                type="text"
                id="precio"
                name="precio"
                value={formData.precio}
                onChange={handleInputChange}
                style={styles.input}
                placeholder="Ej: $5000 - $7000"
                required
                aria-describedby="precio-help"
              />
              <small id="precio-help">Ingresa el precio o rango estimado.</small>

              <label htmlFor="tiempo" style={styles.label}>Tiempo Estimado de Ejecución:</label>
              <input
                type="text"
                id="tiempo"
                name="tiempo"
                value={formData.tiempo}
                onChange={handleInputChange}
                style={styles.input}
                placeholder="Ej: 3 días"
                required
                aria-describedby="tiempo-help"
              />
              <small id="tiempo-help">Ingresa el tiempo estimado.</small>

              <label htmlFor="comentarios" style={styles.label}>Comentarios Adicionales:</label>
              <textarea
                id="comentarios"
                name="comentarios"
                value={formData.comentarios}
                onChange={handleInputChange}
                style={styles.textarea}
                placeholder="Agrega cualquier comentario adicional..."
                aria-describedby="comentarios-help"
              />
              <small id="comentarios-help">Opcional: Comentarios sobre la cotización.</small>

              <button type="submit" style={styles.submitButton}>Enviar Oferta</button>
              <button type="button" style={styles.modalCloseButton} onClick={handleCloseDetails}>Cerrar</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default MisCotizaciones;
