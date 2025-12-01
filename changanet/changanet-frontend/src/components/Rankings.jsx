import { useState, useEffect } from 'react';

const Rankings = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ranking/professionals');
      if (response.ok) {
        const data = await response.json();
        setRankings(data.data);
      }
    } catch (error) {
      console.error('Error loading rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRankings = rankings.filter(prof => {
    if (filter === 'all') return true;
    if (filter === 'verified') return prof.esta_verificado;
    if (filter === 'top-rated') return prof.calificacion_promedio >= 4.5;
    return true;
  });

  const getRankingBadge = (position) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `#${position}`;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">🏆 Ranking de Profesionales</h2>

        <div className="flex space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todos</option>
            <option value="verified">Verificados</option>
            <option value="top-rated">⭐ Top Calificados</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredRankings.map((professional) => (
          <div
            key={professional.id}
            className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
              professional.ranking <= 3
                ? 'border-yellow-200 bg-yellow-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`text-2xl font-bold ${getScoreColor(professional.score)}`}>
                  {getRankingBadge(professional.ranking)}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {professional.nombre}
                    </h3>
                    {professional.esta_verificado && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        ✅ Verificado
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600">{professional.especialidad}</p>
                  <p className="text-sm text-gray-500">{professional.zona_cobertura}</p>
                </div>
              </div>

              <div className="text-right">
                <div className={`text-2xl font-bold ${getScoreColor(professional.score)}`}>
                  {professional.score} pts
                </div>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <span>⭐</span>
                    <span>{professional.calificacion_promedio.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>🔧</span>
                    <span>{professional.servicios_completados}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Barra de progreso del score */}
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    professional.score >= 80 ? 'bg-green-500' :
                    professional.score >= 60 ? 'bg-blue-500' :
                    professional.score >= 40 ? 'bg-yellow-500' : 'bg-gray-500'
                  }`}
                  style={{ width: `${Math.min(professional.score, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRankings.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🏆</div>
          <p className="text-gray-600">No hay profesionales en esta categoría aún.</p>
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-200 p-6 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-3">📊 ¿Cómo se calcula el ranking?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <strong>40%</strong> Calificación promedio<br/>
            <strong>20%</strong> Servicios completados<br/>
            <strong>15%</strong> Verificación de identidad<br/>
            <strong>10%</strong> Años de experiencia
          </div>
          <div>
            <strong>10%</strong> Logros obtenidos<br/>
            <strong>5%</strong> Reseñas positivas<br/>
            <em>Máximo score: 100 puntos</em>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rankings;