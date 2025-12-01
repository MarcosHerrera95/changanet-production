// src/pages/Custody.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import CustodyWidget from '../components/CustodyWidget';

const Custody = () => {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchServices();
    }
  }, [user]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const endpoint = user.role === 'profesional' ? '/api/quotes/professional/services' : '/api/quotes/client/services';
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('changanet_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="loading-spinner mx-auto mb-6"></div>
          <p className="text-gray-600 text-xl font-medium">Cargando custodia de fondos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center animate-fade-in">
          <h1 className="text-5xl font-black mb-6 text-gradient">
            Custodia de Fondos
          </h1>
          <p className="text-gray-600 text-xl font-medium">
            Gestiona la custodia segura de tus pagos
          </p>
        </div>

        {/* Services with Custody */}
        <div className="max-w-4xl mx-auto">
          {services.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">No hay servicios con custodia</h2>
              <p className="text-gray-600 mb-6">Los servicios con custodia aparecerán aquí una vez que completes transacciones.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {services.map((service) => (
                <div key={service.id} className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">
                        Servicio #{service.id}
                      </h3>
                      <p className="text-gray-600 mb-2">
                        {user.role === 'profesional' ? `Cliente: ${service.cliente.nombre}` : `Profesional: ${service.profesional.nombre}`}
                      </p>
                      <p className="text-emerald-600 font-semibold">
                        Estado: {service.estado}
                      </p>
                    </div>
                    <div className="mt-4 lg:mt-0 lg:text-right">
                      <p className="text-3xl font-black text-gradient">
                        ${service.precio || 'Pendiente'}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {new Date(service.creado_en).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <CustodyWidget serviceId={service.id} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-3xl font-bold mb-6 text-gray-800 text-center">
            ¿Cómo funciona la Custodia de Fondos?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">🔐</div>
              <h3 className="text-xl font-semibold mb-2">Fondos Seguros</h3>
              <p className="text-gray-600">Tus pagos quedan retenidos hasta que el servicio se complete satisfactoriamente.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl font-semibold mb-2">Liberación Automática</h3>
              <p className="text-gray-600">Una vez completado el servicio, los fondos se liberan automáticamente al profesional.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🛡️</div>
              <h3 className="text-xl font-semibold mb-2">Protección Total</h3>
              <p className="text-gray-600">Si hay problemas, puedes disputar y recuperar tus fondos.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Custody;
