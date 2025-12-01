import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ImageUpload from '../ImageUpload';

const ProfileModal = ({ isOpen, onClose, onProfileUpdated }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    especialidad: '',
    anos_experiencia: '',
    zona_cobertura: '',
    tarifa_hora: '',
    descripcion: ''
  });
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchProfile();
    }
  }, [isOpen, user]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/profile/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('changanet_token')}`
        }
      });

      if (response.ok) {
        const profile = await response.json();
        setFormData({
          especialidad: profile.especialidad || '',
          anos_experiencia: profile.anos_experiencia || '',
          zona_cobertura: profile.zona_cobertura || '',
          tarifa_hora: profile.tarifa_hora || '',
          descripcion: profile.descripcion || ''
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageSelect = (file) => {
    setProfileImage(file);
  };

  const handleImageRemove = () => {
    setProfileImage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formDataToSend = new FormData();

      // Agregar datos del formulario
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });

      // Agregar imagen si existe
      if (profileImage) {
        formDataToSend.append('url_foto_perfil', profileImage);
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('changanet_token')}`
        },
        body: formDataToSend
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setSuccess('Perfil actualizado exitosamente');
        if (onProfileUpdated) {
          onProfileUpdated(updatedProfile);
        }
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.error || 'Error al actualizar el perfil');
      }
    } catch (err) {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Editar Perfil Profesional</h2>
            <button
              onClick={onClose}
              className="text-emerald-500 hover:text-emerald-700 text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl mb-6">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Foto de Perfil */}
            <div>
              <label className="block text-[#1F2937] font-medium mb-3">
                Foto de Perfil (opcional)
              </label>
              <ImageUpload
                onImageSelect={handleImageSelect}
                onImageRemove={handleImageRemove}
                placeholder="Seleccionar foto de perfil"
                className="mb-4"
              />
            </div>

            {/* Especialidad */}
            <div>
              <label className="block text-[#1F2937] font-medium mb-2">
                Especialidad
              </label>
              <input
                type="text"
                name="especialidad"
                value={formData.especialidad}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-[#F9FBFD] border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent transition-all duration-200 text-[#1F2937] placeholder-[#6B7280]"
                placeholder="Ej: Plomero, Electricista, Pintor..."
                required
              />
            </div>

            {/* Años de Experiencia */}
            <div>
              <label className="block text-[#1F2937] font-medium mb-2">
                Años de Experiencia
              </label>
              <input
                type="number"
                name="anos_experiencia"
                value={formData.anos_experiencia}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-[#F9FBFD] border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent transition-all duration-200 text-[#1F2937] placeholder-[#6B7280]"
                placeholder="Ej: 5"
                min="0"
                required
              />
            </div>

            {/* Zona de Cobertura */}
            <div>
              <label className="block text-[#1F2937] font-medium mb-2">
                Zona de Cobertura
              </label>
              <input
                type="text"
                name="zona_cobertura"
                value={formData.zona_cobertura}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-[#F9FBFD] border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent transition-all duration-200 text-[#1F2937] placeholder-[#6B7280]"
                placeholder="Ej: Ciudad de Buenos Aires, Zona Norte..."
                required
              />
            </div>

            {/* Tarifa por Hora */}
            <div>
              <label className="block text-[#1F2937] font-medium mb-2">
                Tarifa por Hora ($)
              </label>
              <input
                type="number"
                name="tarifa_hora"
                value={formData.tarifa_hora}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-[#F9FBFD] border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent transition-all duration-200 text-[#1F2937] placeholder-[#6B7280]"
                placeholder="Ej: 1500"
                min="0"
                step="0.01"
                required
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-[#1F2937] font-medium mb-2">
                Descripción
              </label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-[#F9FBFD] border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent transition-all duration-200 resize-none text-[#1F2937] placeholder-[#6B7280]"
                rows={4}
                placeholder="Describe tus servicios, experiencia y especialidades..."
                required
              />
            </div>

            {/* Botones */}
            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-2xl hover:bg-gray-300 transition-all duration-200 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#E30613] text-white py-3 rounded-2xl hover:bg-[#E30613] transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
              >
                {loading ? (
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
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
