/**
 * @component IdentityVerification - Componente de Verificación de Identidad
 * @descripción Permite a los profesionales subir documento de identidad para verificación (REQ-36)
 * @sprint Sprint 3 – Verificación de Identidad y Reputación
 * @tarjeta Tarjeta 8: [Frontend] Implementar Sistema de Verificación de Identidad
 * @impacto Seguridad: Aumenta la confianza en la plataforma mediante verificación de profesionales
 */

import { useState, useRef } from 'react';
import { useNotificationContext } from '../context/NotificationContext';

const IdentityVerification = ({ onClose, isModal = false }) => {
  const notificationContext = useNotificationContext();
  const [formData, setFormData] = useState({
    tipo_documento: '',
    numero_documento: '',
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    lugar_nacimiento: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const documentTypes = [
    { value: 'dni', label: 'DNI (Documento Nacional de Identidad)' },
    { value: 'pasaporte', label: 'Pasaporte' },
    { value: 'cedula', label: 'Cédula de Identidad' },
    { value: 'cuil_cuit', label: 'CUIT/CUIL' }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Solo se permiten archivos JPG, PNG o PDF');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo no puede ser mayor a 5MB');
      return;
    }

    setSelectedFile(file);
    setError('');

    // Crear preview para imágenes
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validaciones
      if (!selectedFile) {
        setError('Debes adjuntar una copia de tu documento de identidad');
        setLoading(false);
        return;
      }

      if (!formData.tipo_documento || !formData.numero_documento) {
        setError('Tipo y número de documento son obligatorios');
        setLoading(false);
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('tipo_documento', formData.tipo_documento);
      formDataToSend.append('numero_documento', formData.numero_documento);
      formDataToSend.append('nombres', formData.nombres || '');
      formDataToSend.append('apellidos', formData.apellidos || '');
      formDataToSend.append('fecha_nacimiento', formData.fecha_nacimiento || '');
      formDataToSend.append('lugar_nacimiento', formData.lugar_nacimiento || '');
      formDataToSend.append('documento', selectedFile);

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/verification/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        },
        body: formDataToSend
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Solicitud de verificación enviada exitosamente. Será revisada por nuestro equipo.');
        
        // Enviar notificación
        if (notificationContext) {
          notificationContext.addNotification({
            id: `verification-submitted-${Date.now()}`,
            titulo: '✅ Verificación Enviada',
            mensaje: 'Tu solicitud de verificación ha sido enviada y será revisada dentro de 24-48 horas.',
            fecha_creacion: new Date().toISOString(),
            leida: false,
            tipo: 'verification_submitted',
            datos: {
              action: 'view_verification_status'
            }
          });
        }

        if (onClose) {
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      } else {
        setError(data.error || 'Error al enviar solicitud de verificación');
      }
    } catch (err) {
      console.error('Error submitting verification:', err);
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Verificación de Identidad</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <VerificationContent 
              formData={formData}
              handleChange={handleChange}
              handleFileSelect={handleFileSelect}
              handleSubmit={handleSubmit}
              selectedFile={selectedFile}
              previewUrl={previewUrl}
              removeFile={removeFile}
              fileInputRef={fileInputRef}
              loading={loading}
              error={error}
              success={success}
              documentTypes={documentTypes}
              onClose={onClose}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <VerificationContent 
        formData={formData}
        handleChange={handleChange}
        handleFileSelect={handleFileSelect}
        handleSubmit={handleSubmit}
        selectedFile={selectedFile}
        previewUrl={previewUrl}
        removeFile={removeFile}
        fileInputRef={fileInputRef}
        loading={loading}
        error={error}
        success={success}
        documentTypes={documentTypes}
        onClose={onClose}
      />
    </div>
  );
};

// Componente interno para evitar duplicación
const VerificationContent = ({ 
  formData, 
  handleChange, 
  handleFileSelect, 
  handleSubmit, 
  selectedFile, 
  previewUrl, 
  removeFile, 
  fileInputRef, 
  loading, 
  error, 
  success, 
  documentTypes,
  onClose
}) => {
  return (
    <>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-md mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Verificación de Identidad</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Aumenta la confianza de tus clientes verificando tu identidad. Una vez aprobado, 
          aparecerás con una insignia de profesional verificado.
        </p>
      </div>

      {/* Estado actual */}
      <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-yellow-800">
            <strong>Importante:</strong> Los documentos deben ser legibles y estar vigentes. 
            La verificación suele procesarse en 24-48 horas.
          </p>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
          {success}
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos del documento */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Documento</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tipo_documento" className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Documento *
              </label>
              <select
                id="tipo_documento"
                name="tipo_documento"
                value={formData.tipo_documento}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecciona el tipo</option>
                {documentTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="numero_documento" className="block text-sm font-medium text-gray-700 mb-2">
                Número de Documento *
              </label>
              <input
                type="text"
                id="numero_documento"
                name="numero_documento"
                value={formData.numero_documento}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 12345678"
                required
              />
            </div>
          </div>
        </div>

        {/* Datos personales (opcionales pero recomendados) */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Adicional (Opcional)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nombres" className="block text-sm font-medium text-gray-700 mb-2">
                Nombres
              </label>
              <input
                type="text"
                id="nombres"
                name="nombres"
                value={formData.nombres}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tus nombres completos"
              />
            </div>

            <div>
              <label htmlFor="apellidos" className="block text-sm font-medium text-gray-700 mb-2">
                Apellidos
              </label>
              <input
                type="text"
                id="apellidos"
                name="apellidos"
                value={formData.apellidos}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tus apellidos completos"
              />
            </div>

            <div>
              <label htmlFor="fecha_nacimiento" className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                id="fecha_nacimiento"
                name="fecha_nacimiento"
                value={formData.fecha_nacimiento}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="lugar_nacimiento" className="block text-sm font-medium text-gray-700 mb-2">
                Lugar de Nacimiento
              </label>
              <input
                type="text"
                id="lugar_nacimiento"
                name="lugar_nacimiento"
                value={formData.lugar_nacimiento}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ciudad, País"
              />
            </div>
          </div>
        </div>

        {/* Subida de documento */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Documento de Identidad</h3>
          
          {!selectedFile ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="mt-4">
                <label htmlFor="document-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Haz clic para subir tu documento
                  </span>
                  <span className="mt-1 block text-sm text-gray-500">
                    JPG, PNG o PDF hasta 5MB
                  </span>
                </label>
                <input
                  id="document-upload"
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileSelect}
                />
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-8 h-8 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Eliminar
                </button>
              </div>
              
              {previewUrl && (
                <div className="mt-4">
                  <img
                    src={previewUrl}
                    alt="Vista previa"
                    className="max-w-xs max-h-48 object-contain border border-gray-200 rounded"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botón de envío */}
        <div className="flex justify-end space-x-4">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Enviando...
              </div>
            ) : (
              'Enviar Solicitud de Verificación'
            )}
          </button>
        </div>
      </form>
    </>
  );
};

export default IdentityVerification;
