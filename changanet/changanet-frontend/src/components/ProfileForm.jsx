import { useState, useRef, useEffect } from 'react';

/**
 * Componente reutilizable para formularios de perfil
 * Maneja tanto perfiles de cliente como de profesional
 */
const ProfileForm = ({ user, profile, onSubmit, userType }) => {
  const [formData, setFormData] = useState(() => {
    if (userType === 'profesional') {
      return {
        nombre: profile?.usuario?.nombre || user?.nombre || '',
        email: profile?.usuario?.email || user?.email || '',
        telefono: profile?.usuario?.telefono || '',
        especialidad: profile?.especialidad || '',
        anos_experiencia: profile?.anos_experiencia || '',
        zona_cobertura: profile?.zona_cobertura || '',
        tarifa_hora: profile?.tarifa_hora || '',
        descripcion: profile?.descripcion || ''
      };
    } else {
      // Cliente
      return {
        nombre: profile?.usuario?.nombre || user?.nombre || '',
        email: profile?.usuario?.email || user?.email || '',
        telefono: profile?.usuario?.telefono || '',
        direccion: profile?.usuario?.direccion || '',
        preferencias_servicio: profile?.usuario?.preferencias_servicio || ''
      };
    }
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(profile?.url_foto_perfil || profile?.usuario?.url_foto_perfil || '');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Actualizar formData cuando profile cambie
  useEffect(() => {
    if (profile) {
      if (userType === 'profesional') {
        setFormData({
          nombre: profile?.usuario?.nombre || user?.nombre || '',
          email: profile?.usuario?.email || user?.email || '',
          telefono: profile?.usuario?.telefono || '',
          especialidad: profile?.especialidad || '',
          anos_experiencia: profile?.anos_experiencia || '',
          zona_cobertura: profile?.zona_cobertura || '',
          tarifa_hora: profile?.tarifa_hora || '',
          descripcion: profile?.descripcion || ''
        });
      } else {
        setFormData({
          nombre: profile?.usuario?.nombre || user?.nombre || '',
          email: profile?.usuario?.email || user?.email || '',
          telefono: profile?.usuario?.telefono || '',
          direccion: profile?.usuario?.direccion || '',
          preferencias_servicio: profile?.usuario?.preferencias_servicio || ''
        });
      }
      
      // Actualizar preview de imagen si no hay archivo seleccionado
      if (!selectedFile) {
        setPreview(profile?.url_foto_perfil || profile?.usuario?.url_foto_perfil || '');
      }
    }
  }, [profile, userType, user, selectedFile]);

  // Actualizar cuando user cambie (si no hay profile)
  useEffect(() => {
    if (user && !profile) {
      setFormData(prev => ({
        ...prev,
        nombre: user?.nombre || '',
        email: user?.email || ''
      }));
    }
  }, [user, profile]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadPhoto = () => {
    fileInputRef.current.click();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const submitData = new FormData();

      // Agregar archivo si existe
      if (selectedFile) {
        submitData.append('foto_perfil', selectedFile);
      }

      // Agregar campos del formulario
      Object.keys(formData).forEach(key => {
        if (formData[key] !== undefined && formData[key] !== '') {
          submitData.append(key, formData[key]);
        }
      });

      await onSubmit(submitData);
      
      // Limpiar archivo seleccionado después del envío exitoso
      setSelectedFile(null);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Formulario de perfil" role="form">
      {/* Photo Upload Section */}
      <div className="text-center mb-8">
        <div className="relative inline-block">
          <div className="w-40 h-40 mx-auto bg-gray-100 rounded-full border-4 border-gray-200 flex items-center justify-center overflow-hidden shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
            {preview ? (
              <img src={preview} alt="Foto de perfil" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        <button
          type="button"
          onClick={handleUploadPhoto}
          className="mt-4 bg-[var(--primary)] text-white px-6 py-2 rounded-lg hover:bg-[var(--primary-hover)] hover:shadow-md hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] transition-all duration-300"
          aria-label={preview ? 'Cambiar foto de perfil' : 'Subir foto de perfil'}
        >
          {preview ? 'Cambiar Foto' : 'Subir Foto'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Campos comunes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Nombre</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus:border-transparent transition-all duration-300"
              required
              aria-label="Nombre"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus:border-transparent transition-all duration-300"
              required
              aria-label="Email"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-2">Teléfono</label>
          <input
            type="tel"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus:border-transparent transition-all duration-300"
            aria-label="Teléfono"
          />
        </div>

        {/* Campos específicos por tipo de usuario */}
        {userType === 'profesional' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Especialidad</label>
                <input
                  type="text"
                  name="especialidad"
                  value={formData.especialidad}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus:border-transparent transition-all duration-300"
                  placeholder="Ej: Plomero, Electricista"
                  required
                  aria-label="Especialidad"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Años de Experiencia</label>
                <input
                  type="number"
                  name="anos_experiencia"
                  value={formData.anos_experiencia}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus:border-transparent transition-all duration-300"
                  min="0"
                  required
                  aria-label="Años de experiencia"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Zona de Cobertura</label>
                <input
                  type="text"
                  name="zona_cobertura"
                  value={formData.zona_cobertura}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus:border-transparent transition-all duration-300"
                  placeholder="Ej: Buenos Aires, Palermo"
                  required
                  aria-label="Zona de cobertura"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Tarifa por Hora ($)</label>
                <input
                  type="number"
                  name="tarifa_hora"
                  value={formData.tarifa_hora}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus:border-transparent transition-all duration-300"
                  min="0"
                  step="0.01"
                  required
                  aria-label="Tarifa por hora"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Descripción</label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus:border-transparent transition-all duration-300"
                placeholder="Describe tus servicios y experiencia profesional..."
                required
                aria-label="Descripción"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Dirección</label>
              <input
                type="text"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus:border-transparent transition-all duration-300"
                placeholder="Ej: Av. Corrientes 1234, Buenos Aires"
                aria-label="Dirección"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Preferencias de Servicio</label>
              <textarea
                name="preferencias_servicio"
                value={formData.preferencias_servicio}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus:border-transparent transition-all duration-300"
                placeholder="Ej: Prefiero profesionales verificados, horarios flexibles..."
                aria-label="Preferencias de servicio"
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-[var(--primary)] text-white py-4 rounded-2xl hover:bg-[var(--primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
          aria-label="Guardar cambios de perfil"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Guardando...
            </>
          ) : (
            'Guardar Cambios'
          )}
        </button>
      </div>
    </form>
  );
};

export default ProfileForm;
