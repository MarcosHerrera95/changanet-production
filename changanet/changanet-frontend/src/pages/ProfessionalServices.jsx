/**
 * @page ProfessionalServices - Gestión de servicios para profesionales
 * @descripción Gestión completa de servicios contratados por el profesional (REQ-26 a REQ-30)
 * @sprint Sprint 3 – Gestión Profesional
 * @tarjeta Tarjeta 7: [Frontend] Implementar Gestión de Servicios Profesionales
 * @impacto Social: Transparencia en la gestión de servicios profesionales
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { quotesAPI } from '../services/apiService';

const ProfessionalServices = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, completed, cancelled

  useEffect(() => {
    if (user && (user.role === 'profesional' || user.rol === 'profesional')) {
      loadServices();
    } else {
      navigate('/');
    }
  }, [user, navigate]);

  const loadServices = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await quotesAPI.getProfessionalServices();
      setServices(data);
    } catch (err) {
      console.error('Error loading services:', err);
      setError(err.message || 'Error al cargar los servicios');
    } finally {
      setLoading(false);
    }
  };

  const updateServiceStatus = async (serviceId, newStatus) => {
    try {
      setError('');

      // Usar api.put directamente para este endpoint específico
      const { api } = await import('../services/apiService');
      await api.put(`/api/services/${serviceId}/status`, { status: newStatus });

      // Recargar servicios después de actualizar
      await loadServices();
    } catch (err) {
      console.error('Error updating service status:', err);
      setError(err.message || 'Error al actualizar el estado del servicio');
    }
  };

  const filteredServices = services.filter(service => {
    if (filter === 'all') return true;
    return service.estado === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completado': return 'bg-green-100 text-green-800';
      case 'agendado': return 'bg-blue-100 text-blue-800';
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completado': return 'Completado';
      case 'agendado': return 'Agendado';
      case 'pendiente': return 'Pendiente';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  if (!user || (user.role !== 'profesional' && user.rol !== 'profesional')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <BackButton />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mis Servicios</h1>
          <p className="mt-2 text-gray-600">
            Gestiona todos los servicios que has realizado o tienes agendados.
          </p>
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <div className="flex space-x-2">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'pendiente', label: 'Pendientes' },
              { key: 'agendado', label: 'Agendados' },
              { key: 'completado', label: 'Completados' },
              { key: 'cancelado', label: 'Cancelados' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === key
                    ? 'bg-[#E30613] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E30613]"></div>
          </div>
        ) : (
          /* Lista de servicios */
          <div className="space-y-6">
            {filteredServices.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔧</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  {filter === 'all' ? 'No tienes servicios aún' : `No hay servicios ${filter}`}
                </h3>
                <p className="text-gray-600">
                  {filter === 'all'
                    ? 'Los servicios aparecerán aquí cuando los clientes te contraten.'
                    : 'No hay servicios con este estado.'
                  }
                </p>
              </div>
            ) : (
              filteredServices.map((service) => (
                <div key={service.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Servicio #{service.id}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Cliente: {service.cliente?.nombre || 'Cliente desconocido'}
                      </p>
                      {service.fecha_agendada && (
                        <p className="text-sm text-gray-600">
                          Fecha agendada: {new Date(service.fecha_agendada).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(service.estado)}`}>
                      {getStatusText(service.estado)}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-700">{service.descripcion}</p>
                  </div>

                  {/* Acciones según estado */}
                  <div className="flex space-x-3">
                    {service.estado === 'pendiente' && (
                      <>
                        <button
                          onClick={() => updateServiceStatus(service.id, 'agendado')}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          Agendar Servicio
                        </button>
                        <button
                          onClick={() => updateServiceStatus(service.id, 'cancelado')}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                        >
                          Cancelar
                        </button>
                      </>
                    )}

                    {service.estado === 'agendado' && (
                      <>
                        <button
                          onClick={() => updateServiceStatus(service.id, 'completado')}
                          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                        >
                          Marcar como Completado
                        </button>
                        <button
                          onClick={() => updateServiceStatus(service.id, 'cancelado')}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                        >
                          Cancelar
                        </button>
                      </>
                    )}

                    {service.estado === 'completado' && service.resena && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm text-green-800">
                          ✅ Servicio completado y reseñado por el cliente
                        </p>
                      </div>
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

export default ProfessionalServices;
