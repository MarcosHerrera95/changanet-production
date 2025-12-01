// src/pages/Professionals-Simple.jsx
import { useState, useEffect } from 'react';

const ProfessionalsSimple = () => {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🚀 Professionals Simple component mounted');
    fetchProfessionals();
  }, []);

  const fetchProfessionals = async () => {
    try {
      console.log('🔍 Starting fetch professionals...');
      const response = await fetch('http://localhost:3003/api/professionals?page=1&limit=5');
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 Data received:', data);
      console.log('📋 Professionals count:', data.professionals?.length || 0);
      
      setProfessionals(data.professionals || []);
      setError(null);
    } catch (err) {
      console.error('❌ Error fetching professionals:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Cargando profesionales...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
        <p className="text-red-500">{error}</p>
        <button 
          onClick={fetchProfessionals}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Profesionales Disponibles (Simple)
      </h1>
      
      <div className="mb-4">
        <p className="text-lg text-gray-600">
          Total de profesionales encontrados: {professionals.length}
        </p>
      </div>

      {professionals.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No encontramos profesionales</h2>
          <p className="text-gray-600 mb-6">Intenta recargar la página</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {professionals.map((professional, index) => {
            console.log('🎨 Rendering professional', index, professional);
            return (
              <div 
                key={professional.usuario_id} 
                className="bg-white p-6 rounded-lg shadow-md border border-gray-200"
              >
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {professional.usuario?.nombre || 'Sin nombre'}
                </h3>
                <p className="text-emerald-600 font-semibold mb-2">
                  {professional.especialidad}
                </p>
                <p className="text-gray-600 mb-2">
                  📍 {professional.zona_cobertura}
                </p>
                <p className="text-gray-600 mb-4">
                  💰 ${professional.tarifa_hora}/hora
                </p>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    professional.estado_verificacion === 'verificado' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {professional.estado_verificacion}
                  </span>
                  <span className="text-gray-500">
                    ⭐ {professional.calificacion_promedio || 'N/A'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProfessionalsSimple;
