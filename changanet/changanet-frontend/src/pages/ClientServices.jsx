/**
 * @page ClientServices - Gestión completa de servicios para clientes
 * @descripción Página que muestra todos los servicios contratados por el cliente (REQ-26 a REQ-30)
 * @sprint Sprint 3 – Gestión de Servicios
 * @tarjeta Tarjeta 7: [Frontend] Implementar Gestión de Servicios Cliente
 * @impacto Social: Transparencia total en el seguimiento de servicios contratados
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import UrgentServiceIndicator from '../components/UrgentServiceIndicator';
import UrgentServiceToggle from '../components/UrgentServiceToggle';

const ClientServices = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, in_progress, completed, cancelled
  const [urgentFilter, setUrgentFilter] = useState('all'); // all, urgent, normal
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && (user.role === 'cliente' || user.rol === 'cliente')) {
      loadServices();
    } else {
      navigate('/');
    }
  }, [user, navigate]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('changanet_token');

      if (!token) {
        setError('No se encontró token de autenticación');
        return;
      }

      const response = await fetch('/api/services/client', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al cargar servicios');
      }
    } catch (err) {
      console.error('Error loading services:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const updateServiceStatus = async (serviceId, newStatus) => {
    try {
      const token = sessionStorage.getItem('changanet_token');
      const response = await fetch(`/api/services/${serviceId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Reload services to reflect changes
        loadServices();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al actualizar servicio');
      }
    } catch (err) {
      console.error('Error updating service:', err);
      setError('Error de conexión');
    }
  };

  const filteredServices = services.filter(service => {
    // Primero filtrar por estado
    if (filter !== 'all' && service.estado !== filter) {
      return false;
    }
    
    // Luego filtrar por urgencia
    if (urgentFilter === 'urgent' && !service.es_urgente) {
      return false;
    }
    if (urgentFilter === 'normal' && service.es_urgente) {
      return false;
    }
    
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'agendado': return 'bg-blue-100 text-blue-800';
      case 'completado': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pendiente': return 'Pendiente';
      case 'agendado': return 'Agendado';
      case 'completado': return 'Completado';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const canLeaveReview = (service) => {
    return service.estado === 'completado' && !service.resena;
  };

  const canUpdateStatus = (service) => {
    return service.estado === 'agendado';
  };

  if (!user || (user.role !== 'cliente' && user.rol !== 'cliente')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mis Servicios</h1>
          <p className="mt-2 text-gray-600">
            Gestiona todos tus servicios contratados y su estado actual.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-3">Filtros</h3>
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Estado</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos ({services.length})
              </button>
              <button
                onClick={() => setFilter('pendiente')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'pendiente'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pendientes ({services.filter(s => s.estado === 'pendiente').length})
              </button>
              <button
                onClick={() => setFilter('agendado')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'agendado'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Agendados ({services.filter(s => s.estado === 'agendado').length})
              </button>
              <button
                onClick={() => setFilter('completado')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'completado'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Completados ({services.filter(s => s.estado === 'completado').length})
              </button>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Prioridad</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setUrgentFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  urgentFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setUrgentFilter('urgent')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  urgentFilter === 'urgent'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Urgentes ({services.filter(s => s.es_urgente).length})
              </button>
              <button
                onClick={() => setUrgentFilter('normal')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  urgentFilter === 'normal'
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Normales ({services.filter(s => !s.es_urgente).length})
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Cargando servicios...</span>
          </div>
        )}

        {/* Services List */}
        {!loading && (
          <div className="space-y-6">
            {filteredServices.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <div className="text-6xl mb-4">🔧</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {filter === 'all' ? 'No tienes servicios contratados' : `No hay servicios ${getStatusText(filter).toLowerCase()}`}
                </h3>
                <p className="text-gray-600 mb-6">
                  {filter === 'all'
                    ? 'Cuando contrates servicios, aparecerán aquí para que puedas gestionarlos.'
                    : `No tienes servicios en estado "${getStatusText(filter).toLowerCase()}".`
                  }
                </p>
                <button
                  onClick={() => navigate('/profesionales')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Buscar Profesionales
                </button>
              </div>
            ) : (
              filteredServices.map((service) => (
                <div key={service.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 mr-4">
                          Servicio #{service.id}
                        </h3>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(service.estado)}`}>
                          {getStatusText(service.estado)}
                        </span>
                        <div className="ml-2">
                          <UrgentServiceIndicator isUrgent={service.es_urgente} size="small" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Profesional</p>
                          <p className="font-medium">{service.profesional?.nombre || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Especialidad</p>
                          <p className="font-medium">{service.profesional?.perfil_profesional?.especialidad || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Fecha de creación</p>
                          <p className="font-medium">
                            {new Date(service.creado_en).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        {service.fecha_agendada && (
                          <div>
                            <p className="text-sm text-gray-500">Fecha agendada</p>
                            <p className="font-medium">
                              {new Date(service.fecha_agendada).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                        )}
                        {service.completado_en && (
                          <div>
                            <p className="text-sm text-gray-500">Completado el</p>
                            <p className="font-medium">
                              {new Date(service.completado_en).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-500">Descripción</p>
                        <p className="text-gray-700">{service.descripcion}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                    {/* Solo mostrar botón de marcar como urgente para servicios pendientes o agendados */}
                    {(service.estado === 'pendiente' || service.estado === 'agendado') && (
                      <UrgentServiceToggle 
                        serviceId={service.id} 
                        isUrgent={service.es_urgente} 
                        onToggle={(newUrgentState) => {
                          // Actualizar el estado local sin recargar toda la lista
                          setServices(prevServices => 
                            prevServices.map(s => 
                              s.id === service.id ? {...s, es_urgente: newUrgentState} : s
                            )
                          );
                        }} 
                      />
                    )}

                    {canUpdateStatus(service) && (
                      <button
                        onClick={() => updateServiceStatus(service.id, 'completado')}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Marcar como Completado
                      </button>
                    )}

                    {canLeaveReview(service) && (
                      <button
                        onClick={() => navigate(`/servicio/${service.id}/resena`)}
                        className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                      >
                        Dejar Reseña
                      </button>
                    )}

                    <button
                      onClick={() => navigate(`/chat?user=${service.profesional?.id}`)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Contactar Profesional
                    </button>

                    {service.estado === 'pendiente' && (
                      <button
                        onClick={() => updateServiceStatus(service.id, 'cancelado')}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        Cancelar Servicio
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientServices;
