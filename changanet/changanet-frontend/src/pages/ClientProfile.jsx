import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';

const ClientProfile = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    preferencias_servicio: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('changanet_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        // For clients, backend returns { usuario: userData }
        const userData = data.usuario || data;

        setProfile({
          nombre: userData.nombre || user?.nombre || '',
          email: userData.email || user?.email || '',
          telefono: userData.telefono || '',
          direccion: userData.direccion || '',
          preferencias_servicio: userData.preferencias_servicio || ''
        });
        setPreview(userData.url_foto_perfil || '');
      } else {
        console.error('Failed to fetch profile:', response.status);
        // Fallback to user context data
        if (user) {
          setProfile({
            nombre: user.nombre || '',
            email: user.email || '',
            telefono: user.telefono || '',
            direccion: '',
            preferencias_servicio: ''
          });
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Fallback to user context data
      if (user) {
        setProfile({
          nombre: user.nombre || '',
          email: user.email || '',
          telefono: user.telefono || '',
          direccion: '',
          preferencias_servicio: ''
        });
      }
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      let response;

      if (selectedFile) {
        // If there's a file to upload, use FormData
        const formData = new FormData();
        formData.append('foto', selectedFile);
        formData.append('nombre', profile.nombre);
        formData.append('email', profile.email);
        formData.append('telefono', profile.telefono);
        formData.append('direccion', profile.direccion);
        formData.append('preferencias_servicio', profile.preferencias_servicio);

        response = await fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
            // Don't set Content-Type for FormData, let browser set it with boundary
          },
          body: formData
        });
      } else {
        // No file, use JSON
        const updateData = {
          nombre: profile.nombre,
          email: profile.email,
          telefono: profile.telefono,
          direccion: profile.direccion,
          preferencias_servicio: profile.preferencias_servicio
        };

        response = await fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
          },
          body: JSON.stringify(updateData)
        });
      }

      if (response.ok) {
        const data = await response.json();

        // Update AuthContext with new user data to reflect changes immediately
        if (data.usuario) {
          const updatedUser = {
            ...user,
            nombre: data.usuario.nombre,
            email: data.usuario.email,
            telefono: data.usuario.telefono
          };
          login(updatedUser, localStorage.getItem('changanet_token'));
        }

        // Update local profile state with all saved data
        if (data.usuario) {
          setProfile({
            nombre: data.usuario.nombre || '',
            email: data.usuario.email || '',
            telefono: data.usuario.telefono || '',
            direccion: data.usuario.direccion || '',
            preferencias_servicio: data.usuario.preferencias_servicio || ''
          });
        }

        setSuccess('Perfil cliente actualizado con éxito.');
        setSelectedFile(null);

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Error al actualizar el perfil.');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // Redirect if not logged in
  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <BackButton />
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Mi Perfil</h1>
            <p className="text-gray-600">Actualiza tu información personal</p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8">
            {/* Photo Upload Section - Always Visible */}
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
                className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 hover:shadow-md hover:scale-105 transition-all duration-300"
                disabled={loading}
              >
                Subir Foto
              </button>
            </div>

            {/* Status Messages - Always Visible */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl mb-6">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl mb-6">
                {success}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-6 mb-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 text-sm">Actualizando perfil...</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {user && user.esta_verificado && (
                <div className="mt-8 p-6 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mr-4">
                      <span className="text-2xl">✅</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-emerald-800">Identidad Verificada</h3>
                      <p className="text-emerald-700 text-sm">Tu identidad ha sido verificada exitosamente</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Nombre</label>
                    <input
                      type="text"
                      name="nombre"
                      value={profile.nombre}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={profile.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    value={profile.telefono}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Dirección</label>
                  <input
                    type="text"
                    name="direccion"
                    value={profile.direccion}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="Ej: Av. Corrientes 1234, Buenos Aires"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Preferencias de Servicio</label>
                  <textarea
                    name="preferencias_servicio"
                    value={profile.preferencias_servicio}
                    onChange={handleChange}
                    rows="4"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="Ej: Prefiero profesionales verificados, horarios flexibles..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-2xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientProfile;
