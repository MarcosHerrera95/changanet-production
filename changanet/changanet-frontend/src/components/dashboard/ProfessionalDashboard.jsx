import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useSmartNavigation from '../../hooks/useSmartNavigation';
import MisCotizaciones from './MisCotizaciones';
import MisCotizacionesProfesional from '../MisCotizacionesProfesional';

// Backend URL configuration
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003';


const ProfessionalDashboard = ({ user }) => {
  const navigate = useNavigate();
  const smartNavigate = useSmartNavigation();
  const [stats, setStats] = useState({
    activeServices: 0,
    completedServices: 0,
    pendingQuotes: 0,
    unreadNotifications: 0,
    averageRating: 0,
    especialidad: '',
    especialidades: [],
    zona_cobertura: '',
    latitud: '',
    longitud: ''
  });
  const [recentQuotes, setRecentQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showCotizacionesModal, setShowCotizacionesModal] = useState(false);
  const [showCotizacionesSimpleModal, setShowCotizacionesSimpleModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch services, quotes, notifications, profile
      const [servicesRes, quotesRes, notificationsRes, profileRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/quotes/professional/services`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('changanet_token')}` }
        }),
        fetch(`${API_BASE_URL}/api/quotes/professional`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('changanet_token')}` }
        }),
        fetch(`${API_BASE_URL}/api/notifications`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('changanet_token')}` }
        }),
        fetch(`${API_BASE_URL}/api/profile`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('changanet_token')}` }
        })
      ]);

      if (servicesRes.ok) {
        const services = await servicesRes.json();
        setStats(prev => ({
          ...prev,
          activeServices: services.filter(s => s.estado === 'agendado').length,
          completedServices: services.filter(s => s.estado === 'completado').length
        }));
      }

      if (quotesRes.ok) {
        const quotes = await quotesRes.json();
        setRecentQuotes(quotes.slice(0, 3));
        setStats(prev => ({
          ...prev,
          pendingQuotes: quotes.filter(q => q.estado === 'pendiente').length
        }));
      }

      if (notificationsRes.ok) {
        const notificationsResponse = await notificationsRes.json();
        console.log('Notifications API response:', notificationsResponse);
        const notifications = notificationsResponse.notifications || [];
        setStats(prev => ({
          ...prev,
          unreadNotifications: notifications.filter(n => !n.esta_leido).length
        }));
      }

      if (profileRes.ok) {
        const profile = await profileRes.json();
        // Soporta formato plano y formato anidado (perfil)
        const p = profile.perfil || profile;
        setStats(prev => ({
          ...prev,
          averageRating: profile.calificacion_promedio || p.calificacion_promedio || 0,
          especialidad: p.especialidad || '',
          especialidades: (() => {
            if (Array.isArray(p.especialidades)) return p.especialidades;
            if (typeof p.especialidades === 'string' && p.especialidades.length > 0) {
              try {
                const parsed = JSON.parse(p.especialidades);
                return Array.isArray(parsed) ? parsed : [];
              } catch { return []; }
            }
            return [];
          })(),
          zona_cobertura: p.zona_cobertura || '',
          latitud: p.latitud || '',
          longitud: p.longitud || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleVerifyClick = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/verification/status`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('changanet_token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.verified) {
          setMessage('¡Ya estás verificado! Tu identidad ha sido confirmada exitosamente.');
        } else {
          navigate('/verificar-identidad');
        }
      } else {
        setMessage('Error al verificar el estado. Inténtalo de nuevo.');
      }
    } catch (error) {
      setMessage('Error de conexión. Inténtalo de nuevo.');
    }

    setTimeout(() => setMessage(''), 5000);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" style={{ backgroundColor: '#009688', minHeight: '100vh', padding: '20px' }}>
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          ¡Hola, {user.nombre}!
        </h1>
        <p className="text-gray-600">
          Bienvenido a tu panel profesional. Gestiona tus servicios y cotizaciones.
        </p>
      </div>

      {/* Información profesional visual */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Información Profesional</h2>
        <div className="mb-2">
          <span className="font-semibold text-gray-700">Especialidad principal:</span>
          <span className="ml-2 text-blue-700">{stats.especialidad || '-'}</span>
        </div>
        {stats.especialidades.length > 0 && (
          <div className="mb-2">
            <span className="font-semibold text-gray-700">Especialidades:</span>
            <span className="ml-2 text-blue-700">{stats.especialidades.join(', ')}</span>
          </div>
        )}
        <div className="mb-2">
          <span className="font-semibold text-gray-700">Zona de cobertura:</span>
          <span className="ml-2 text-blue-700">{stats.zona_cobertura || '-'}</span>
        </div>
        {(stats.latitud && stats.longitud) && (
          <div className="mb-2">
            <span className="font-semibold text-gray-700">Coordenadas GPS:</span>
            <span className="ml-2 text-blue-700">{stats.latitud}, {stats.longitud}</span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <span className="text-2xl">🔧</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Servicios Activos</p>
              <p className="text-2xl font-bold text-gray-800">{stats.activeServices}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-amber-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Servicios Completados</p>
              <p className="text-2xl font-bold text-gray-800">{stats.completedServices}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <span className="text-2xl">📝</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Cotizaciones Pendientes</p>
              <p className="text-2xl font-bold text-gray-800">{stats.pendingQuotes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-amber-100 rounded-lg">
              <span className="text-2xl">⭐</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Calificación Promedio</p>
              <p className="text-2xl font-bold text-gray-800">{stats.averageRating.toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
            onClick={() => setShowCotizacionesModal(true)}
            type="button"
            className="flex items-center p-4 rounded-lg hover:bg-emerald-100 transition-colors duration-200 w-full text-left"
            style={{ backgroundColor: '#e8f5e9' }}>
            <span className="text-2xl mr-3">📋</span>
            <div>
              <h3 className="font-semibold text-gray-800">Mis Cotizaciones</h3>
              <p className="text-sm text-gray-600">Responde a solicitudes</p>
          </div>
        </button>

          <button
            onClick={() => smartNavigate('/mi-perfil-profesional')}
            type="button"
            className="flex items-center p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors duration-200 w-full text-left">
            <span className="text-2xl mr-3">👤</span>
            <div>
              <h3 className="font-semibold text-gray-800">Mi Perfil</h3>
              <p className="text-sm text-gray-600">Actualiza tu información</p>
          </div>
        </button>

          <button
            onClick={() => smartNavigate('/disponibilidad')}
            type="button"
            className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200 w-full text-left">
            <span className="text-2xl mr-3">📅</span>
            <div>
              <h3 className="font-semibold text-gray-800">Disponibilidad</h3>
              <p className="text-sm text-gray-600">Gestiona tu agenda</p>
          </div>
        </button>
        </div>
      </div>



      {/* Verification Status */}
      <div className="bg-gradient-to-r from-emerald-50 to-turquoise-50 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Estado de Verificación</h3>
            <p className="text-gray-600 text-sm">
              Completa tu verificación para aparecer en más búsquedas y ganar confianza.
            </p>
            {message && (
              <p className="text-emerald-600 text-sm mt-2 font-medium">{message}</p>
            )}
          </div>
          <button
            onClick={handleVerifyClick}
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors duration-200 font-medium"
          >
            Verificar Identidad
          </button>
        </div>
      </div>

      {/* Modal de Cotizaciones Simplificado */}
      {showCotizacionesModal && (
        <MisCotizacionesProfesional onClose={() => setShowCotizacionesModal(false)} />
      )}
    </div>
  );
};

export default ProfessionalDashboard;
