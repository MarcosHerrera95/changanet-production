import { useState, useEffect } from 'react';
import SpecialtySelector from './SpecialtySelector';
import ZoneSelector from './ZoneSelector';
import RateSelector from './RateSelector';
import ImageUploader from './ImageUploader';
import { useProfile } from '../hooks/useProfile';

/**
 * ProfessionalProfileForm - Formulario completo para perfiles profesionales
 * Cumple con REQ-06 a REQ-10 del PRD
 */
const ProfessionalProfileForm = ({ onSuccess, onError, initialData = {} }) => {
  const { updateProfile } = useProfile();
  const [formData, setFormData] = useState({
    especialidades: Array.isArray(initialData.especialidades) ? initialData.especialidades : [],
    anos_experiencia: initialData.anos_experiencia || '',
    zona_cobertura: initialData.zona_cobertura || '',
    latitud: initialData.latitud || null,
    longitud: initialData.longitud || null,
    tipo_tarifa: initialData.tipo_tarifa || 'hora',
    tarifa_hora: initialData.tarifa_hora || '',
    tarifa_servicio: initialData.tarifa_servicio || '',
    tarifa_convenio: initialData.tarifa_convenio || '',

    // Descripción general
    descripcion: initialData.descripcion || '',

    // REQ-06: Fotos de perfil y portada
    url_foto_perfil: initialData.url_foto_perfil || '',
    url_foto_portada: initialData.url_foto_portada || '',

    // Archivos de fotos para subir
    file_foto_perfil: null,
    file_foto_portada: null,

    // Disponibilidad
    esta_disponible: initialData.esta_disponible ?? true
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Actualizar formData cuando cambien los datos iniciales
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData(prev => ({
        ...prev,
        especialidades: Array.isArray(initialData.especialidades) ? initialData.especialidades : [],
        anos_experiencia: initialData.anos_experiencia || '',
        zona_cobertura: initialData.zona_cobertura || '',
        latitud: initialData.latitud || null,
        longitud: initialData.longitud || null,
        tipo_tarifa: initialData.tipo_tarifa || 'hora',
        tarifa_hora: initialData.tarifa_hora || '',
        tarifa_servicio: initialData.tarifa_servicio || '',
        tarifa_convenio: initialData.tarifa_convenio || '',
        descripcion: initialData.descripcion || '',
        url_foto_perfil: initialData.url_foto_perfil || '',
        url_foto_portada: initialData.url_foto_portada || '',
        esta_disponible: initialData.esta_disponible ?? true
      }));
    }
  }, [initialData]);

  // Validación del formulario
  const validateForm = () => {
    const newErrors = {};

    // REQ-07: Al menos una especialidad
    if (!formData.especialidades || formData.especialidades.length === 0) {
      newErrors.especialidades = 'Debe seleccionar al menos una especialidad';
    }

    // REQ-08: Años de experiencia
    if (!formData.anos_experiencia || formData.anos_experiencia < 0) {
      newErrors.anos_experiencia = 'Los años de experiencia son requeridos';
    }

    // REQ-09: Zona de cobertura
    if (!formData.zona_cobertura.trim()) {
      newErrors.zona_cobertura = 'La zona de cobertura es requerida';
    }

    // REQ-10: Validación de tarifas según tipo
    if (formData.tipo_tarifa === 'hora' && (!formData.tarifa_hora || formData.tarifa_hora <= 0)) {
      newErrors.tarifa_hora = 'La tarifa por hora es requerida y debe ser mayor a 0';
    }

    if (formData.tipo_tarifa === 'servicio' && (!formData.tarifa_servicio || formData.tarifa_servicio <= 0)) {
      newErrors.tarifa_servicio = 'La tarifa por servicio es requerida y debe ser mayor a 0';
    }

    if (formData.tipo_tarifa === 'convenio' && !formData.tarifa_convenio.trim()) {
      newErrors.tarifa_convenio = 'La descripción para tarifa a convenir es requerida';
    }

    // Descripción
    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'La descripción es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar cambios en campos simples
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      onError('Por favor, corrige los errores en el formulario');
      return;
    }

    setLoading(true);

    try {
      // Preparar datos para envío
      const submitData = {
        especialidades: formData.especialidades,
        anos_experiencia: parseInt(formData.anos_experiencia),
        zona_cobertura: formData.zona_cobertura.trim(),
        latitud: formData.latitud ? parseFloat(formData.latitud) : null,
        longitud: formData.longitud ? parseFloat(formData.longitud) : null,
        tipo_tarifa: formData.tipo_tarifa,
        tarifa_hora: formData.tipo_tarifa === 'hora' ? parseFloat(formData.tarifa_hora) : null,
        tarifa_servicio: formData.tipo_tarifa === 'servicio' ? parseFloat(formData.tarifa_servicio) : null,
        tarifa_convenio: formData.tipo_tarifa === 'convenio' ? formData.tarifa_convenio.trim() : null,
        descripcion: formData.descripcion.trim(),
        esta_disponible: formData.esta_disponible
      };

      // Adjuntar archivos reales si existen
      if (formData.file_foto_perfil instanceof File) {
        submitData.foto = formData.file_foto_perfil;
        submitData.foto_tipo = 'perfil';
      }
      if (formData.file_foto_portada instanceof File) {
        submitData.foto = formData.file_foto_portada;
        submitData.foto_tipo = 'portada';
      }

      // Llamar a la API para actualizar el perfil
      await updateProfile(submitData);

      onSuccess('Perfil profesional actualizado exitosamente');
    } catch (error) {
      console.error('Error updating profile:', error);
      onError(error.message || 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* REQ-06: Subida de fotos */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Fotos del Perfil</h3>
        <ImageUploader
          profilePhoto={formData.url_foto_perfil}
          coverPhoto={formData.url_foto_portada}
          onProfilePhotoChange={(file, url) => {
            handleChange('file_foto_perfil', file);
            handleChange('url_foto_perfil', url);
          }}
          onCoverPhotoChange={(file, url) => {
            handleChange('file_foto_portada', file);
            handleChange('url_foto_portada', url);
          }}
        />
      </div>

      {/* REQ-07: Selector de especialidades */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg">
        <SpecialtySelector
          value={formData.especialidades}
          onChange={(specialties) => handleChange('especialidades', specialties)}
          error={errors.especialidades}
        />
      </div>

      {/* REQ-08: Años de experiencia */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Años de Experiencia *
        </label>
        <input
          type="number"
          value={formData.anos_experiencia}
          onChange={(e) => handleChange('anos_experiencia', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.anos_experiencia ? 'border-red-500' : 'border-gray-300'
          }`}
          min="0"
          max="50"
          required
        />
        {errors.anos_experiencia && (
          <p className="mt-1 text-sm text-red-600">{errors.anos_experiencia}</p>
        )}
      </div>

      {/* REQ-09: Zona de cobertura */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg">
        <ZoneSelector
          zona_cobertura={formData.zona_cobertura}
          latitud={formData.latitud}
          longitud={formData.longitud}
          onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
          error={errors.zona_cobertura}
        />
      </div>

      {/* REQ-10: Selector de tarifas */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg">
        <RateSelector
          tipo_tarifa={formData.tipo_tarifa}
          tarifa_hora={formData.tarifa_hora}
          tarifa_servicio={formData.tarifa_servicio}
          tarifa_convenio={formData.tarifa_convenio}
          onChange={(rates) => setFormData(prev => ({ ...prev, ...rates }))}
          errors={errors}
        />
      </div>

      {/* Descripción */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Descripción de Servicios *
        </label>
        <textarea
          value={formData.descripcion}
          onChange={(e) => handleChange('descripcion', e.target.value)}
          rows={4}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.descripcion ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Describe tus servicios, experiencia y especialidades..."
          required
        />
        {errors.descripcion && (
          <p className="mt-1 text-sm text-red-600">{errors.descripcion}</p>
        )}
      </div>

      {/* Disponibilidad */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={formData.esta_disponible}
            onChange={(e) => handleChange('esta_disponible', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Estoy disponible para nuevos trabajos
          </span>
        </label>
      </div>

      {/* Botón de envío */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          )}
          <span>{loading ? 'Guardando...' : 'Guardar Perfil'}</span>
        </button>
      </div>
    </form>
  );
};

export default ProfessionalProfileForm;
