import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Rankings from '../Rankings';
import { useFavorites } from '../../hooks/useFavorites';
import MisCotizacionesCliente from '../MisCotizacionesCliente';

const ClientDashboard = ({ user }) => {
  const navigate = useNavigate();
  const { favorites } = useFavorites();
  const [stats, setStats] = useState({
    activeServices: 0,
    pendingQuotes: 0,
    unreadNotifications: 0
  });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCotizacionesModal, setShowCotizacionesModal] = useState(false);
  const dataFetchedRef = useRef(false);

  useEffect(() => {
    console.log('ClientDashboard component (components/dashboard) - data fetching useEffect triggered');
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;

    // Fetch profile
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('changanet_token');
        if (!token) return;

        const response = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const profileData = await response.json();
          // For clients, the response is { usuario: { nombre, ... } }
          // For professionals, it's the profile object directly
          const profile = profileData.usuario || profileData;
          setProfile(profile);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch essential data only
      const token = localStorage.getItem('changanet_token');
      const [servicesRes, quotesRes, notificationsRes] = await Promise.all([
        fetch('/api/quotes/client/services', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/quotes/client', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (servicesRes.ok) {
        const services = await servicesRes.json();
        setStats(prev => ({
          ...prev,
          activeServices: services.filter(s => s.estado === 'agendado').length
        }));
      }

      if (quotesRes.ok) {
        const quotes = await quotesRes.json();
        setStats(prev => ({
          ...prev,
          pendingQuotes: quotes.filter(q => q.estado === 'pendiente').length
        }));
      }

      if (notificationsRes.ok) {
        const data = await notificationsRes.json();
        setStats(prev => ({
          ...prev,
          unreadNotifications: data.notifications ? data.notifications.filter(n => !n.esta_leido).length : 0
        }));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Simple Welcome */}
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-gray-800">
          ¡Hola, {profile?.nombre || user.nombre}!
        </h1>
        <p className="text-gray-600 mt-1">
          ¿Qué necesitas hoy?
        </p>
      </div>

      {/* Key Stats - Simplified to 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <span className="text-xl">📊</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Estadísticas</p>
              <p className="text-xl font-bold text-gray-800">{stats.activeServices}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-xl">📝</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Cotizaciones</p>
              <p className="text-xl font-bold text-gray-800">{stats.pendingQuotes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <span className="text-xl">🔔</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Notificaciones</p>
              <p className="text-xl font-bold text-gray-800">{stats.unreadNotifications}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/profesionales"
          className="bg-emerald-600 text-white p-6 rounded-xl hover:bg-emerald-700 transition-colors duration-200 text-center"
        >
          <span className="text-3xl block mb-2">🔍</span>
          <h3 className="text-lg font-semibold mb-1">Buscar Profesionales</h3>
          <p className="text-sm opacity-90">Encuentra el servicio que necesitas</p>
        </Link>

        <button
          onClick={() => {
            const token = localStorage.getItem('changanet_token');
            if (!token) {
              navigate('/login');
            } else {
              navigate('/mi-perfil-cliente');
            }
          }}
          className="bg-white text-gray-800 p-6 rounded-xl hover:bg-gray-50 transition-colors duration-200 text-center border border-gray-200 shadow-sm"
        >
          <span className="text-3xl block mb-2">👤</span>
          <h3 className="text-lg font-semibold mb-1">Mi Perfil</h3>
          <p className="text-sm text-gray-600">Gestiona tu información</p>
        </button>

        <button
          onClick={() => setShowCotizacionesModal(true)}
          className="bg-white text-gray-800 p-6 rounded-xl hover:bg-gray-50 transition-colors duration-200 text-center border border-gray-200"
        >
          <span className="text-3xl block mb-2">📋</span>
          <h3 className="text-lg font-semibold mb-1">Mis Cotizaciones</h3>
          <p className="text-sm text-gray-600">Revisa tus solicitudes</p>
        </button>
      </div>

      {/* Profesionales Favoritos */}
      {favorites.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
            Mis Profesionales Favoritos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.slice(0, 6).map((favorite) => (
              <div key={favorite.profesional_id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-3">
                  <img
                    src={favorite.profesional.url_foto_perfil || 'https://placehold.co/40x40?text=👷'}
                    alt={favorite.profesional.nombre}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{favorite.profesional.nombre}</h4>
                    <p className="text-sm text-gray-600">{favorite.profesional.perfil_profesional?.especialidad}</p>
                    <p className="text-sm text-gray-500">{favorite.profesional.perfil_profesional?.zona_cobertura}</p>
                  </div>
                  <Link
                    to={`/profesional/${favorite.profesional_id}`}
                    className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                  >
                    Ver perfil
                  </Link>
                </div>
              </div>
            ))}
          </div>
          {favorites.length > 6 && (
            <div className="text-center mt-4">
              <Link
                to="/profesionales?favoritos=true"
                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
              >
                Ver todos mis favoritos ({favorites.length})
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Rankings Section */}
      <div className="mt-8">
        <Rankings />
      </div>

      {/* Modal de Cotizaciones */}
      {showCotizacionesModal && (
        <MisCotizacionesCliente onClose={() => setShowCotizacionesModal(false)} />
      )}
    </div>
  );
};

export default ClientDashboard;
