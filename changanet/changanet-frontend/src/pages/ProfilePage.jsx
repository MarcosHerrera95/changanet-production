import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import ProfileForm from '../components/ProfileForm';

/**
 * Página unificada de perfil para clientes y profesionales
 * Maneja la visualización y edición de información de perfil
 */
const ProfilePage = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('changanet_token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else {
        console.error('Failed to fetch profile:', response.status);
        setError('Error al cargar el perfil. Inténtalo de nuevo.');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (formData) => {
    try {
      setError('');
      setSuccess('');

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
          // Content-Type will be set automatically for FormData
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();

        // Update AuthContext with new user data
        if (data.usuario) {
          const updatedUser = {
            ...user,
            nombre: data.usuario.nombre,
            email: data.usuario.email,
            telefono: data.usuario.telefono
          };
          login(updatedUser, localStorage.getItem('changanet_token'));
        }

        setSuccess('Perfil actualizado exitosamente.');
        setProfile(data);

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Error al actualizar el perfil.');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Error de conexión. Inténtalo de nuevo.');
    }
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
            <p className="text-gray-600">
              {user.rol === 'profesional'
                ? 'Actualiza tu información profesional'
                : 'Actualiza tu información personal'
              }
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Cargando perfil...</span>
              </div>
            ) : (
              <>
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

                <ProfileForm
                  user={user}
                  profile={profile}
                  onSubmit={handleProfileUpdate}
                  userType={user.rol}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
