/**
 * @component QuoteRequestForm - Formulario de solicitud de presupuesto
 * @descripción Componente para crear solicitudes de presupuesto a múltiples profesionales (REQ-31, REQ-32, REQ-33, REQ-35)
 * @sprint Sprint 2 – Solicitudes y Presupuestos
 * @tarjeta Tarjeta 5: [Frontend] Implementar Formulario de Solicitud de Presupuesto
 * @impacto Económico: Facilita comparación de precios y acceso a servicios profesionales
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { useNotificationContext } from '../context/NotificationContext';
import QuickMessageModal from './QuickMessageModal';
import ImageUpload from './ImageUpload';
import VerificationStatus, { VerificationBadge } from './VerificationBadge';
import IdentityVerification from './IdentityVerification';
import { sendQuoteSubmittedNotification } from '../services/quoteNotificationService';

/**
 * @función QuoteRequestForm - Componente principal del formulario
 * @descripción Maneja estado del formulario y envío de solicitudes de presupuesto (REQ-31)
 * @sprint Sprint 2 – Solicitudes y Presupuestos
 * @tarjeta Tarjeta 5: [Frontend] Implementar Formulario de Solicitud de Presupuesto
 * @impacto Económico: Interfaz intuitiva para conectar demanda y oferta de servicios
 * @returns {JSX.Element} Formulario de solicitud de presupuesto
 */
const QuoteRequestForm = ({ onClose, professionalName, professionalId }) => {
  const [formData, setFormData] = useState({
    descripción: '',
    zona_cobertura: '',
    es_urgente: false
  });
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedProfessionals, setSelectedProfessionals] = useState(
    professionalId ? [professionalId] : []
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuickMessage, setShowQuickMessage] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const navigate = useNavigate();
  const { sendMessage } = useChat();
  const notificationContext = useNotificationContext();

  /**
   * @función handleChange - Manejar cambios en inputs del formulario
   * @descripción Actualiza estado del formulario con valores de inputs (REQ-31)
   * @sprint Sprint 2 – Solicitudes y Presupuestos
   * @tarjeta Tarjeta 5: [Frontend] Implementar Formulario de Solicitud de Presupuesto
   * @impacto Social: Interfaz intuitiva accesible para todos los niveles técnicos
   * @param {Event} e - Evento de cambio del input
   */
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  /**
   * @función handleImageSelect - Manejar selección de imágenes
   * @descripción Agrega imágenes seleccionadas al estado (REQ-31)
   * @param {File} file - Archivo de imagen seleccionado
   */
  const handleImageSelect = (file) => {
    setSelectedImages(prev => [...prev, file]);
  };

  /**
   * @función handleImageRemove - Manejar remoción de imágenes
   * @descripción Remueve imagen del estado
   * @param {number} index - Índice de la imagen a remover
   */
  const handleImageRemove = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * @función handleProfessionalsSelect - Manejar selección de profesionales
   * @descripción Agrega/remueve profesionales de la lista seleccionada (REQ-32)
   * @param {string} professionalId - ID del profesional
   */
  const handleProfessionalsSelect = (professionalId) => {
    setSelectedProfessionals(prev => 
      prev.includes(professionalId)
        ? prev.filter(id => id !== professionalId)
        : [...prev, professionalId]
    );
  };

  /**
   * @función handleVerificationModal - Mostrar modal de verificación
   * @descripción Muestra el formulario de verificación de identidad
   */
  const handleVerificationModal = () => {
    setShowVerificationModal(true);
  };

  /**
   * @función handleSubmit - Enviar solicitud de presupuesto
   * @descripción Envía solicitud a backend y maneja respuesta con métricas (REQ-31, REQ-32, REQ-33)
   * @sprint Sprint 2 – Solicitudes y Presupuestos
   * @tarjeta Tarjeta 5: [Frontend] Implementar Formulario de Solicitud de Presupuesto
   * @impacto Económico: Conecta eficientemente demanda y oferta de servicios profesionales
   * @param {Event} e - Evento de envío del formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('Submitting quote request');
    console.log('Token exists:', !!localStorage.getItem('changanet_token'));
    console.log('Token:', localStorage.getItem('changanet_token'));

    // Validar selección de profesionales
    if (selectedProfessionals.length === 0) {
      setError('Debes seleccionar al menos un profesional');
      setLoading(false);
      return;
    }

    console.log('Sending quote request with professionalIds:', selectedProfessionals);
    console.log('Selected images:', selectedImages.length);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('descripcion', formData.descripción);
      formDataToSend.append('zona_cobertura', formData.zona_cobertura);
      formDataToSend.append('profesionales_ids', JSON.stringify(selectedProfessionals));
      formDataToSend.append('es_urgente', formData.es_urgente ? 'true' : 'false');

      // Agregar imágenes si existen
      selectedImages.forEach((image, index) => {
        formDataToSend.append(`imagen_${index}`, image);
      });

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/quotes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
          // No establecer Content-Type para FormData, el navegador lo establece automáticamente
        },
        body: formDataToSend
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        // Enviar notificación de confirmación
        if (notificationContext) {
          await sendQuoteSubmittedNotification(notificationContext, data, selectedProfessionals);
        }

        // Cerrar modal y mostrar mensaje de éxito
        if (onClose) {
          onClose();
        }
        alert(`Solicitud de cotización enviada exitosamente a ${selectedProfessionals.length} profesional(es). Recibirás notificaciones cuando respondan y podrás comparar ofertas en tu panel.`);
        navigate('/mi-cuenta/presupuestos');
      } else {
        setError(data.error || 'Error al enviar solicitud');
      }
    } catch (err) {
      console.log('Fetch error:', err);
      setError('Error de red. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header Section - Compact */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full shadow-md">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            ¿Cómo quieres contactar?
          </h1>
          <p className="text-gray-600 text-sm">Elige la opción que más te convenga</p>
        </div>
      </div>

      {/* Error Alert - Compact */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg" role="alert" aria-live="polite">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Contact Options Grid - More Compact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Quick Message Option */}
        <div className="group relative bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-lg transition-all duration-300">
          <div className="absolute -top-3 -right-3 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
            <span className="text-lg">⚡</span>
          </div>
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-bold text-emerald-800 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
                Mensaje Rápido
              </h3>
              <p className="text-emerald-700 text-sm leading-relaxed">Mensaje directo sin formularios largos</p>
            </div>
            <button
              onClick={() => setShowQuickMessage(true)}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-4 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 font-semibold shadow-md hover:shadow-lg flex items-center justify-center space-x-2 min-h-[44px] touch-manipulation text-sm"
              aria-label="Enviar mensaje rápido al profesional"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Enviar Mensaje</span>
            </button>
          </div>
        </div>

        {/* Full Quote Request Option */}
        <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-lg transition-all duration-300">
          <div className="absolute -top-3 -right-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
            <span className="text-lg">📋</span>
          </div>
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-bold text-blue-800 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                Solicitud Completa
              </h3>
              <p className="text-blue-700 text-sm leading-relaxed">Presupuesto detallado con descripción completa</p>
            </div>
            <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-md">
              <span className="font-medium">✓</span> Mejor presupuesto
            </div>
          </div>
        </div>
      </div>

      {/* Full Quote Request Form - More Compact */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-3">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Solicitud de Presupuesto</h3>
            <p className="text-gray-600 text-sm">Más detalles = Mejor presupuesto</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="descripcion" className="flex items-center text-gray-900 font-semibold text-base">
              <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              ¿Qué trabajo necesitas?
            </label>
            <textarea
              id="descripcion"
              name="descripción"
              value={formData.descripción}
              onChange={handleChange}
              className="w-full px-3 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-900 text-sm min-h-[100px] placeholder-gray-500 resize-none"
              rows="4"
              placeholder="Describe el trabajo que necesitas..."
              required
              aria-describedby="descripcion-help"
            />
            <div id="descripcion-help" className="sr-only">Describe el trabajo que necesitas, incluyendo detalles importantes como tamaño, materiales, urgencia, etc.</div>
          </div>

          <div className="space-y-2">
            <label htmlFor="zona" className="flex items-center text-gray-900 font-semibold text-base">
              <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              ¿Dónde lo necesitas?
            </label>
            <input
              id="zona"
              type="text"
              name="zona_cobertura"
              value={formData.zona_cobertura}
              onChange={handleChange}
              className="w-full px-3 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-gray-900 text-sm placeholder-gray-500"
              placeholder="Ej: Palermo, CABA"
              required
              aria-describedby="zona-help"
            />
            <div id="zona-help" className="sr-only">Ingresa la ubicación donde necesitas el servicio, incluyendo calle y barrio si es posible</div>
          </div>

          {/* Nueva sección para servicios urgentes */}
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                id="es_urgente"
                name="es_urgente"
                type="checkbox"
                checked={formData.es_urgente}
                onChange={(e) => setFormData({ ...formData, es_urgente: e.target.checked })}
                className="h-5 w-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="es_urgente" className="ml-2 flex items-center text-gray-900 font-semibold text-base">
                <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.493-1.646 1.743-2.98l-4.243-5.5a3.54 3.54 0 00-.514-1.332l-1.243-2.24a1.5 1.5 0 00-.514-1.332l-4.243-5.5A1.5 1.5 0 004.14 4.5L6.5 5.5c1.046.667 1.7 1.81 1.7 3.135 0 .88-.34 1.684-.916 2.257L4.5 7.5A1.5 1.5 0 004.5 5.5L2 4.5A1.5 1.5 0 001.5 3H1c0-1.657 1.343-3 3-3h12c1.657 0 3 1.343 3 3v6.5a3.5 3.5 0 01-3.5 3.5h-7A3.5 3.5 0 018 9.5V8" />
                </svg>
                ¿Es un servicio urgente?
              </label>
            </div>
            <p className="text-sm text-gray-500">
              Marca esta casilla si necesitas atención inmediata. Los servicios urgentes reciben prioridad de atención.
            </p>
            {formData.es_urgente && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Servicio marcado como urgente - Recibirá atención prioritaria
                </p>
              </div>
            )}
          </div>

          {/* Nueva sección para subida de imágenes */}
          <div className="space-y-2">
            <label className="flex items-center text-gray-900 font-semibold text-base">
              <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              ¿Tienes fotos del trabajo? (Opcional)
            </label>
            <ImageUpload
              onImageSelect={handleImageSelect}
              onImageRemove={handleImageRemove}
              placeholder="Sube fotos del trabajo a realizar..."
              className="max-w-md"
              showPreview={true}
            />
            <div className="text-xs text-gray-500 text-center">
              Las fotos ayudan a los profesionales a dar cotizaciones más precisas
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 min-h-[48px] touch-manipulation text-sm"
            aria-label="Enviar solicitud completa de presupuesto"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Enviar Solicitud</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Back Button - Compact */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onClose}
          className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 font-medium text-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver
        </button>
      </div>

      <QuickMessageModal
        isOpen={showQuickMessage}
        onClose={() => setShowQuickMessage(false)}
        professionalName={professionalName || 'el profesional'}
        onSendMessage={(message) => {
          // Enviar mensaje rápido usando ChatContext
          sendMessage(professionalId, message);
        }}
      />

      {/* Modal de Verificación de Identidad */}
      {showVerificationModal && (
        <IdentityVerification
          isModal={true}
          onClose={() => setShowVerificationModal(false)}
        />
      )}

      {/* Enlace de verificación */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <p className="text-blue-900 font-medium">¿Eres un profesional?</p>
              <p className="text-blue-700 text-sm">Verifica tu identidad para aumentar la confianza de tus clientes.</p>
            </div>
          </div>
          <button
            onClick={handleVerificationModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Verificar Identidad
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuoteRequestForm;
