/**
 * Componente BudgetRequestForm - Formulario de creación de solicitudes de presupuesto
 * Permite a clientes crear solicitudes con descripción, zona, especialidad y fotos
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBudgetRequest } from '../services/budgetRequestService';
import PhotoUploader from './PhotoUploader';

const BudgetRequestForm = ({ onSuccess, onCancel }) => {
  const navigate = useNavigate();


  const [formData, setFormData] = useState({
    descripcion: '',
    zona_cobertura: '',
    especialidad: '',
    presupuesto_estimado: '',
    urgencia: '' // Nuevo campo urgencia
  });

  const [photos, setPhotos] = useState([]);
  const [photoErrors, setPhotoErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Lista de especialidades disponibles
  const especialidades = [
    'Plomería',
    'Electricidad',
    'Pintura',
    'Albañilería',
    'Carpintería',
    'Jardinería',
    'Limpieza',
    'Mudanzas',
    'Reparaciones Generales',
    'Instalaciones',
    'Mantenimiento',
    'Construcción',
    'Decoración',
    'Tecnología',
    'Otros'
  ];

  /**
   * Manejar cambios en los inputs del formulario
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
   * Manejar cambios en las fotos
   */
  const handlePhotosChange = (newPhotos, errors = []) => {
    setPhotos(newPhotos);
    setPhotoErrors(errors);
  };

  /**
   * Validar formulario antes del envío
   */
  const validateForm = () => {
    if (!formData.descripcion.trim()) {
      setError('La descripción del trabajo es obligatoria');
      return false;
    }
    if (formData.descripcion.trim().length < 10) {
      setError('La descripción debe tener al menos 10 caracteres');
      return false;
    }
    if (!formData.zona_cobertura.trim()) {
      setError('La zona de cobertura es obligatoria');
      return false;
    }
    if (!formData.especialidad) {
      setError('Debes seleccionar una especialidad');
      return false;
    }
    if (!formData.urgencia) {
      setError('Debes indicar el nivel de urgencia');
      return false;
    }
    if (photos.length > 5) {
      setError('Solo puedes subir hasta 5 fotos');
      return false;
    }
    if (photoErrors.length > 0) {
      setError('Corrige los errores en las fotos antes de enviar.');
      return false;
    }
    return true;
  };

  /**
   * Enviar formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const requestData = {
        ...formData,
        descripcion: formData.descripcion.trim(),
        zona_cobertura: formData.zona_cobertura.trim(),
        especialidad: formData.especialidad,
        presupuesto_estimado: formData.presupuesto_estimado || null,
        urgencia: formData.urgencia,
        fotos: photos
      };

      const result = await createBudgetRequest(requestData);

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(result);
        } else {
          navigate('/mi-cuenta/presupuestos');
        }
      }, 1800);

    } catch (err) {
      console.error('Error creating budget request:', err);
      setError(err.message || 'Error al crear la solicitud. Por favor, inténtalo de nuevo.');
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
    } else {
      navigate(-1);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            ¡Solicitud enviada exitosamente!
          </h3>
          <p className="text-green-700">
            Tu solicitud de presupuesto ha sido creada y enviada a profesionales calificados.<br/>
            Serás redirigido automáticamente a la vista de estado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Solicitar Presupuesto
        </h2>
        <p className="text-gray-600">
          Describe tu trabajo y recibe ofertas de profesionales calificados
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Error message */}
        {error && (
          <div className="p-4 bg-[var(--error-bg)] border border-[var(--error-border)] rounded-lg" role="alert" aria-live="assertive">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-[var(--error)] mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-[var(--error)]">{error}</span>
            </div>
          </div>
        )}

        {/* Descripción del trabajo */}
        <div>
          <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-2">
            ¿Qué trabajo necesitas? <span className="text-red-500">*</span>
          </label>
          <textarea
            id="descripcion"
            name="descripcion"
            value={formData.descripcion}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Describe detalladamente el trabajo que necesitas realizar. Incluye medidas, materiales, urgencia, etc."
            required
            disabled={loading}
          />
          <p className="text-sm text-gray-500 mt-1">
            Mínimo 10 caracteres. Sé lo más específico posible para recibir mejores ofertas.
          </p>
        </div>

        {/* Zona de cobertura */}
        <div>
          <label htmlFor="zona_cobertura" className="block text-sm font-medium text-gray-700 mb-2">
            ¿Dónde lo necesitas? <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="zona_cobertura"
            name="zona_cobertura"
            value={formData.zona_cobertura}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ej: Palermo, Buenos Aires"
            required
            disabled={loading}
          />
          <p className="text-sm text-gray-500 mt-1">
            Ciudad, barrio o zona específica donde se realizará el trabajo.
          </p>
        </div>

        {/* Especialidad */}
        <div>
          <label htmlFor="especialidad" className="block text-sm font-medium text-gray-700 mb-2">
            Especialidad requerida <span className="text-red-500">*</span>
          </label>
          <select
            id="especialidad"
            name="especialidad"
            value={formData.especialidad}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={loading}
          >
            <option value="">Seleccionar especialidad...</option>
            {especialidades.map(especialidad => (
              <option key={especialidad} value={especialidad}>
                {especialidad}
              </option>
            ))}
          </select>
        </div>

        {/* Presupuesto estimado */}
        <div>
          <label htmlFor="presupuesto_estimado" className="block text-sm font-medium text-gray-700 mb-2">
            Presupuesto estimado (opcional)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              type="number"
              id="presupuesto_estimado"
              name="presupuesto_estimado"
              value={formData.presupuesto_estimado}
              onChange={handleInputChange}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
              min="0"
              disabled={loading}
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Ayuda a los profesionales a evaluar si tu proyecto está dentro de su alcance.
          </p>
        </div>

        {/* Fotos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fotos del trabajo (máx. 5, 5MB c/u)
          </label>
          <PhotoUploader
            onPhotosChange={handlePhotosChange}
            maxPhotos={5}
            placeholder="Sube fotos del trabajo a realizar"
            className={loading ? 'opacity-50 pointer-events-none' : ''}
          />
          {photoErrors.length > 0 && (
            <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
              {photoErrors.map((err, idx) => <li key={idx}>{err}</li>)}
            </ul>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Las fotos ayudan a los profesionales a entender mejor el trabajo y dar cotizaciones más precisas.
          </p>
        </div>

        {/* Urgencia */}
        <div>
          <label htmlFor="urgencia" className="block text-sm font-medium text-gray-700 mb-2">
            Urgencia <span className="text-red-500">*</span>
          </label>
          <select
            id="urgencia"
            name="urgencia"
            value={formData.urgencia}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={loading}
          >
            <option value="">Seleccionar urgencia...</option>
            <option value="alta">Alta (lo antes posible)</option>
            <option value="media">Media (próximos días)</option>
            <option value="baja">Baja (sin apuro)</option>
          </select>
        </div>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[var(--primary)] text-white py-3 px-4 rounded-md hover:bg-[var(--primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            aria-label="Enviar solicitud de presupuesto"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Enviando solicitud...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Enviar Solicitud
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus:ring-offset-2 disabled:opacity-50"
            aria-label="Cancelar solicitud"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default BudgetRequestForm;
