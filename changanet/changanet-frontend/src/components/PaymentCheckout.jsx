import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePayment } from '../hooks/usePayment';
import { usePaymentAPI } from '../hooks/usePaymentAPI';
import LoadingSpinner from './ui/LoadingSpinner';
import ErrorAlert from './ui/ErrorAlert';
import FormField from './ui/FormField';

/**
 * PaymentCheckout - Componente para procesar pagos de servicios
 *
 * @param {Object} serviceData - Datos del servicio a pagar
 * @param {Function} onSuccess - Callback cuando el pago es exitoso
 * @param {Function} onCancel - Callback cuando se cancela el pago
 */
const PaymentCheckout = ({ serviceData, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const { loading, error, clearError } = usePayment();
  const { createPaymentPreference, isProcessing } = usePaymentAPI();

  const [formData, setFormData] = useState({
    amount: serviceData?.amount || 0,
    description: serviceData?.description || '',
    serviceId: serviceData?.serviceId || '',
    professionalId: serviceData?.professionalId || '',
    clientNotes: ''
  });

  const [mercadoPagoLoaded, setMercadoPagoLoaded] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState(null);

  // Load MercadoPago SDK
  useEffect(() => {
    const loadMercadoPago = async () => {
      if (window.MercadoPago) {
        setMercadoPagoLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.onload = () => setMercadoPagoLoaded(true);
      document.head.appendChild(script);
    };

    loadMercadoPago();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.amount || formData.amount <= 0) {
      errors.amount = 'El monto debe ser mayor a 0';
    }

    if (!formData.description.trim()) {
      errors.description = 'La descripción es requerida';
    }

    if (!formData.serviceId) {
      errors.serviceId = 'ID del servicio es requerido';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      // You could set form errors here if needed
      return;
    }

    try {
      const paymentData = {
        amount: parseFloat(formData.amount),
        description: formData.description,
        serviceId: formData.serviceId,
        professionalId: formData.professionalId,
        clientId: user.id,
        clientNotes: formData.clientNotes,
        currency: 'ARS' // Assuming Argentine Peso
      };

      const response = await createPaymentPreference(paymentData);

      if (response.checkoutUrl) {
        setCheckoutUrl(response.checkoutUrl);
        // Optionally redirect to MercadoPago
        // window.location.href = response.checkoutUrl;
      }

      if (onSuccess) {
        onSuccess(response);
      }
    } catch {
      // Error is handled by the hook
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Debes iniciar sesión para realizar pagos.</p>
      </div>
    );
  }

  if (checkoutUrl) {
    return (
      <div className="text-center py-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-green-800 mb-2">
            ¡Preferencia de pago creada exitosamente!
          </h3>
          <p className="text-green-700 mb-4">
            Haz clic en el botón para completar tu pago de forma segura.
          </p>
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 bg-[#E30613] text-white font-medium rounded-lg hover:bg-[#C9050F] transition-colors"
          >
            Pagar con MercadoPago
            <svg className="ml-2 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-600 hover:text-gray-800 underline"
        >
          Cancelar y volver
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Procesar Pago</h2>
        <p className="text-gray-600 mt-1">
          Completa los detalles para procesar tu pago de forma segura.
        </p>
      </div>

      <ErrorAlert message={error} onClose={clearError} className="mb-6" />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <FormField
              label="Monto a pagar"
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="0.00"
              required
              min="0"
              step="0.01"
            />
            <p className="text-sm text-gray-600 mt-1">
              Monto total: {formatCurrency(formData.amount)}
            </p>
          </div>

          <div>
            <FormField
              label="ID del Servicio"
              type="text"
              name="serviceId"
              value={formData.serviceId}
              onChange={handleInputChange}
              placeholder="SRV-001"
              required
              readOnly={!!serviceData?.serviceId}
            />
          </div>
        </div>

        <FormField
          label="Descripción del servicio"
          type="textarea"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Describe brevemente el servicio que estás pagando..."
          required
          rows={3}
        />

        <FormField
          label="Notas adicionales (opcional)"
          type="textarea"
          name="clientNotes"
          value={formData.clientNotes}
          onChange={handleInputChange}
          placeholder="Agrega cualquier información adicional..."
          rows={2}
        />

        {/* Payment Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Resumen del Pago</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Servicio:</span>
              <span className="font-medium">{formData.description || 'No especificado'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(formData.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Comisión de plataforma:</span>
              <span className="font-medium text-[#E30613]">
                {formatCurrency(formData.amount * 0.05)} (5%)
              </span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total a pagar:</span>
              <span className="text-[#E30613]">
                {formatCurrency(formData.amount * 1.05)}
              </span>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <span className="text-blue-500 mr-2">🔒</span>
            <div>
              <h4 className="text-blue-800 font-medium">Pago seguro</h4>
              <p className="text-blue-700 text-sm mt-1">
                Tus datos están protegidos. El pago se procesa a través de MercadoPago,
                una plataforma segura y confiable. Los fondos quedan en custodia hasta
                la confirmación del servicio.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            disabled={loading || isProcessing || !mercadoPagoLoaded}
            className="flex-1 bg-[#E30613] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#C9050F] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading || isProcessing ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Procesando...
              </>
            ) : (
              <>
                <span className="mr-2">💳</span>
                Crear Preferencia de Pago
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-medium hover:bg-gray-300"
          >
            Cancelar
          </button>
        </div>
      </form>

      {!mercadoPagoLoaded && (
        <div className="mt-4 text-center">
          <LoadingSpinner size="sm" message="Cargando sistema de pagos..." />
        </div>
      )}
    </div>
  );
};

export default PaymentCheckout;
