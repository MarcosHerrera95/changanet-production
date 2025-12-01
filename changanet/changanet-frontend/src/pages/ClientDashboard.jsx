/**
 * @page ClientDashboard - Dashboard principal para clientes
 * @descripción Panel de control completo para gestión de servicios y cotizaciones (REQ-01 a REQ-45)
 * @sprint Sprint 2 – Dashboard y Gestión
 * @tarjeta Tarjeta 3: [Frontend] Implementar Dashboard Cliente
 * @impacto Social: Herramientas para que clientes encuentren servicios de triple impacto
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../hooks/useOnboarding';
import BackButton from '../components/BackButton';
import EditProfileButton from '../components/EditProfileButton';
import ProfilePicture from '../components/ProfilePicture';
import ClientOnboardingWizard from '../components/ClientOnboardingWizard';
import MisCotizacionesCliente from '../components/MisCotizacionesCliente';
import '../styles/onboarding.css';

const ClientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { startOnboarding } = useOnboarding();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalServices: 0,
    pendingQuotes: 0,
    completedServices: 0,
    totalSpent: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCotizacionesModal, setShowCotizacionesModal] = useState(false);

  // Verificar permisos y mostrar onboarding
  useEffect(() => {
    console.log('ClientDashboard useEffect triggered - User:', user);
    console.log('ClientDashboard useEffect - User role:', user?.role || user?.rol);
    if (!user || (user.role !== 'cliente' && user.rol !== 'cliente')) {
      console.log('ClientDashboard - Redirecting because user is not cliente');
      navigate('/');
      return;
    }

    // Check if user has completed onboarding
    const onboardingCompleted = localStorage.getItem(`changanet_onboarding_${user.id}_cliente`);
    if (!onboardingCompleted) {
      setShowOnboarding(true);
    }

    // Don't load data immediately, wait for user to be fully set
    const timer = setTimeout(() => {
      if (user && (user.role === 'cliente' || user.rol === 'cliente')) {
        console.log('ClientDashboard - Calling loadDashboardData from setTimeout');
        loadDashboardData();
      }
    }, 100); // Small delay to ensure user state is fully updated

    return () => clearTimeout(timer);
  }, [user, navigate]);

  let loadCount = 0;

  const loadDashboardData = async () => {
    loadCount++;
    console.log(`loadDashboardData called ${loadCount} times for user:`, user);
    try {
      console.log('Loading client dashboard data for user:', user);
      const token = sessionStorage.getItem('changanet_token');
      console.log('Token from sessionStorage:', token ? 'present' : 'missing');

      if (!token) {
        console.log('No token found, skipping API calls');
        return;
      }

      // Load real stats from API
      const statsResponse = await fetch('/api/client/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Client stats response:', statsResponse.status);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('Client stats data:', statsData);
        setStats(statsData.data || {
          totalServices: 0,
          pendingQuotes: 0,
          completedServices: 0,
          totalSpent: 0
        });
      } else {
        console.error('Failed to load client stats:', statsResponse.status);
        setStats({
          totalServices: 0,
          pendingQuotes: 0,
          completedServices: 0,
          totalSpent: 0
        });
      }

      // Load recent activity
      const activityResponse = await fetch('/api/client/activity', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Client activity response:', activityResponse.status);

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        console.log('Client activity data:', activityData);
        setRecentActivity(activityData.data || []);
      } else {
        console.error('Failed to load client activity:', activityResponse.status);
        setRecentActivity([]);
      }

      // TODO: Uncomment when API endpoints are implemented
      /*
      // Cargar estadísticas del cliente
      const statsResponse = await fetch('/api/client/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Client stats response:', statsResponse.status);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('Client stats data:', statsData);
        setStats(statsData.data || stats);
      } else {
        console.error('Failed to load client stats:', statsResponse.status);
      }

      // Cargar actividad reciente
      const activityResponse = await fetch('/api/client/activity', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Client activity response:', activityResponse.status);

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        console.log('Client activity data:', activityData);
        setRecentActivity(activityData.data || []);
      } else {
        console.error('Failed to load client activity:', activityResponse.status);
      }
      */
    } catch (error) {
      console.error('Error cargando datos del dashboard cliente:', error);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Resumen', icon: '📊' },
    { id: 'profile', name: 'Mi Perfil', icon: '👤' },
    { id: 'services', name: 'Mis Servicios', icon: '🔧' },
    { id: 'quotes', name: 'Cotizaciones', icon: '💰' },
    { id: 'messages', name: 'Mensajes', icon: '💬' },
    { id: 'professionals', name: 'Profesionales', icon: '👥' },
    { id: 'reviews', name: 'Mis Reseñas', icon: '⭐' },
    { id: 'payments', name: 'Pagos', icon: '💳' }
  ];

  // Función para iniciar onboarding manualmente (para testing)
  const handleStartOnboarding = () => {
    setShowOnboarding(true);
  };

  // Handlers para el modal de cotizaciones
  const handleOpenCotizacionesModal = () => {
    setShowCotizacionesModal(true);
  };

  const handleCloseCotizacionesModal = () => {
    console.log('Cerrando modal de cotizaciones');
    setShowCotizacionesModal(false);
  };

  // Handler para completar onboarding
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    if (user) {
      localStorage.setItem(`changanet_onboarding_${user.id}_cliente`, 'completed');
    }
  };


  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Estadísticas principales */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">🔧</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Servicios Totales</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalServices}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <span className="text-2xl">⏳</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Cotizaciones Pendientes</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingQuotes}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Servicios Completados</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.completedServices}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Gastado</p>
                    <p className="text-2xl font-bold text-gray-900">${stats.totalSpent}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actividad reciente */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Actividad Reciente</h3>
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No hay actividad reciente</p>
                ) : (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm">📋</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                          <p className="text-xs text-gray-500">{activity.timestamp}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                        activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Mi Perfil de Cliente</h3>
            <EditProfileButton userType="cliente" />
          </div>
        );

      case 'services':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Mis Servicios Contratados</h3>
            <button
              onClick={() => navigate('/cliente/servicios')}
              className="bg-[#E30613] text-white px-4 py-2 rounded-lg hover:bg-[#C9050F] transition-colors"
            >
              Ver Servicios
            </button>
          </div>
        );

      case 'quotes':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Mis Cotizaciones</h3>
            <button
              onClick={handleOpenCotizacionesModal}
              className="bg-[#E30613] text-white px-4 py-2 rounded-lg hover:bg-[#C9050F] transition-colors"
            >
              Gestionar Cotizaciones
            </button>
          </div>
        );

      case 'messages':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Mis Mensajes</h3>
            <p className="text-gray-600 mb-4">Comunícate directamente con los profesionales</p>
            <button
              onClick={() => navigate('/cliente/mensajes')}
              className="bg-[#E30613] text-white px-4 py-2 rounded-lg hover:bg-[#C9050F] transition-colors"
            >
              Ver Mensajes
            </button>
          </div>
        );

      case 'professionals':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Profesionales Favoritos</h3>
            <button
              onClick={() => navigate('/profesionales')}
              className="bg-[#E30613] text-white px-4 py-2 rounded-lg hover:bg-[#C9050F] transition-colors"
            >
              Explorar Profesionales
            </button>
          </div>
        );

      case 'reviews':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Mis Reseñas</h3>
            <button
              onClick={() => navigate('/cliente/resenas')}
              className="bg-[#E30613] text-white px-4 py-2 rounded-lg hover:bg-[#C9050F] transition-colors"
            >
              Ver Reseñas
            </button>
          </div>
        );

      case 'payments':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Historial de Pagos</h3>
            <button
              onClick={() => navigate('/pagos-cliente')}
              className="bg-[#E30613] text-white px-4 py-2 rounded-lg hover:bg-[#C9050F] transition-colors"
            >
              Ver Pagos
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (!user || (user.role !== 'cliente' && user.rol !== 'cliente')) {
    console.log('ClientDashboard - Not rendering because user is not cliente:', user);
    return null; // No renderizar si no es cliente
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Header */}
        <div className="mb-8" id="client-dashboard-header">
          <div className="flex items-center space-x-4 mb-4">
            <ProfilePicture 
              user={user}
              size="w-16 h-16"
              className="border-4 border-emerald-200 shadow-lg"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard de Cliente</h1>
              <p className="mt-1 text-gray-600">
                ¡Hola, {user.nombre || user.name || 'Usuario'}! Gestiona tus servicios y encuentra los mejores profesionales.
              </p>
            </div>
          </div>
          {/* Botón para testing - remover en producción */}
          <button
            onClick={handleStartOnboarding}
            className="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            🔄 Reiniciar Onboarding
          </button>
        </div>

        {/* Estadísticas y Acciones Rápidas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Estadísticas del cliente */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Mis Estadísticas</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalServices}</div>
                  <div className="text-sm text-gray-600">Servicios Contratados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.pendingQuotes}</div>
                  <div className="text-sm text-gray-600">Cotizaciones Pendientes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.completedServices}</div>
                  <div className="text-sm text-gray-600">Servicios Completados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">${stats.totalSpent}</div>
                  <div className="text-sm text-gray-600">Total Gastado</div>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Acciones Rápidas</h2>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/profesionales')}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors text-left flex items-center"
                aria-label="Buscar profesionales"
              >
                <span className="mr-3">🔍</span>
                Buscar Profesionales
              </button>

              <button
                onClick={() => navigate('/cliente/perfil')}
                className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors text-left flex items-center"
                aria-label="Ver mi perfil"
              >
                <span className="mr-3">👤</span>
                Mi Perfil
              </button>

              <button
                onClick={handleOpenCotizacionesModal}
                className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors text-left flex items-center"
                aria-label="Abrir panel de Mis Cotizaciones"
              >
                <span className="mr-3">💰</span>
                Mis Cotizaciones
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6" id="client-dashboard-tabs">
          <nav className="flex space-x-1 bg-white p-1 rounded-lg shadow">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#E30613] text-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {renderTabContent()}
        </div>
      </div>


      {/* Modal de Cotizaciones */}
      {showCotizacionesModal && (
        <MisCotizacionesCliente onClose={handleCloseCotizacionesModal} />
      )}

      {/* Onboarding Wizard */}
      {showOnboarding && (
        <ClientOnboardingWizard onComplete={handleOnboardingComplete} />
      )}
    </div>
  );
};

export default ClientDashboard;
