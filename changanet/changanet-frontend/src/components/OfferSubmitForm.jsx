/**
 * Componente OfferSubmitForm - Formulario para enviar ofertas
 * Permite a profesionales enviar ofertas con precio y comentarios
 */

import { useState } from 'react';
import { submitOffer } from '../services/budgetRequestService';

const OfferSubmitForm = ({
  requestId,
  requestData,
  onSuccess,
  onCancel,
  className = ''
}) => {
  const [formData, setFormData] = useState({
    precio: '',
    comentario: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  /**
   * Manejar cambios en los inputs
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar errores cuando el usuario empiece a escribir
    if (error) setError('');
  };

  /**
   * Validar formulario
   */
  const validateForm = () => {
    if (!formData.precio || isNaN(parseFloat(formData.precio)) || parseFloat(formData.precio) <= 0) {
      setError('Debes ingresar un precio válido mayor a 0');
      return false;
    }

    if (parseFloat(formData.precio) > 1000000) {
      setError('El precio parece demasiado alto. Verifica el valor.');
      return false;
    }

    if (formData.comentario && formData.comentario.length > 500) {
      setError('El comentario no puede superar los 500 caracteres');
      return false;
    }

    return true;
  };

  /**
   * Enviar oferta
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const offerData = {
        precio: parseFloat(formData.precio),
        comentario: formData.comentario.trim() || null
      };

      const result = await submitOffer(requestId, offerData);

      setSuccess(true);

      // Mostrar mensaje de éxito
      alert(`¡Oferta enviada exitosamente!\n\nPrecio: $${offerData.precio}\n\nEl cliente será notificado y podrá comparar tu oferta con las demás.`);

      // Llamar callback de éxito
      if (onSuccess) {
        onSuccess(result);
      }

    } catch (err) {
      console.error('Error submitting offer:', err);
      setError(err.message || 'Error al enviar la oferta. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancelar formulario
   */
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  if (success) {
    return (
      <div className={`max-w-md mx-auto p-6 bg-green-50 border border-green-200 rounded-lg ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            ¡Oferta enviada!
          </h3>
          <p className="text-green-700 text-sm">
            Tu oferta ha sido enviada al cliente. Recibirás una notificación si es aceptada.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-md mx-auto bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          Enviar Oferta
        </h2>
        <p className="text-sm text-gray-600">
          Proporciona tu precio y detalles para esta solicitud
        </p>
      </div>

      {/* Resumen de la solicitud */}
      {requestData && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Solicitud de {requestData.cliente?.nombre || 'Cliente'}
          </h3>
          <p className="text-sm text-gray-700 mb-2">
            {requestData.descripcion}
          </p>
          <div className="text-xs text-gray-500">
            📍 {requestData.zona_cobertura}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Precio */}
        <div>
          <label htmlFor="precio" className="block text-sm font-medium text-gray-700 mb-2">
            Tu precio <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500 text-lg">$</span>
            <input
              type="number"
              id="precio"
              name="precio"
              value={formData.precio}
              onChange={handleInputChange}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
              placeholder="0"
              min="0"
              step="0.01"
              required
              disabled={loading}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Ingresa el precio total por el trabajo completo
          </p>
        </div>

        {/* Comentario */}
        <div>
          <label htmlFor="comentario" className="block text-sm font-medium text-gray-700 mb-2">
            Comentarios adicionales (opcional)
          </label>
          <textarea
            id="comentario"
            name="comentario"
            value={formData.comentario}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Describe los materiales incluidos, tiempo estimado, condiciones especiales, etc."
            maxLength={500}
            disabled={loading}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Detalles que ayuden al cliente a tomar una decisión</span>
            <span>{formData.comentario.length}/500</span>
          </div>
        </div>

        {/* Información adicional */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-4 h-4 text-blue-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Recuerda:</p>
              <ul className="space-y-1 text-xs">
                <li>• Incluye todos los costos (materiales, mano de obra, etc.)</li>
                <li>• El precio debe ser competitivo pero realista</li>
                <li>• Los comentarios detallados aumentan las chances de ser elegido</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex flex-col space-y-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Enviando oferta...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Enviar Oferta
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default OfferSubmitForm;
