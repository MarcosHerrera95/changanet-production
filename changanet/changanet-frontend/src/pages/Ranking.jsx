// src/pages/Ranking.jsx
import { useState, useEffect } from 'react';
import RankingDisplay from '../components/RankingDisplay';

const Ranking = () => {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRanking();
  }, []);

  const loadRanking = async () => {
    try {
      const response = await fetch('/api/ranking', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRanking(data);
      } else {
        console.error('Error en respuesta del ranking:', response.status);
      }
    } catch (error) {
      console.error('Error cargando ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center animate-fade-in">
          <h1 className="text-5xl font-black mb-6 text-gradient">
            Ranking de Profesionales
          </h1>
          <p className="text-gray-600 text-xl font-medium">
            Descubre a los mejores profesionales de Changánet
          </p>
        </div>

        {/* Ranking Display */}
        <div className="max-w-4xl mx-auto">
          <RankingDisplay ranking={ranking} loading={loading} />
        </div>

        {/* Info Section */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-3xl font-bold mb-6 text-gray-800 text-center">
            ¿Cómo se calcula el ranking?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">⭐</div>
              <h3 className="text-xl font-semibold mb-2">Calificación Promedio</h3>
              <p className="text-gray-600">Basado en las reseñas de clientes satisfechos.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl font-semibold mb-2">Verificación</h3>
              <p className="text-gray-600">Profesionales verificados tienen mayor prioridad.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Actividad</h3>
              <p className="text-gray-600">Profesionales activos y con más servicios completados.</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">
              ¿Quieres aparecer en el ranking?
            </h2>
            <p className="text-xl mb-6 opacity-90">
              Regístrate como profesional y comienza a construir tu reputación
            </p>
            <button className="bg-white text-emerald-600 px-8 py-3 rounded-xl hover:bg-gray-50 hover:scale-105 transition-all duration-300 font-semibold">
              Registrarme como Profesional
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ranking;
