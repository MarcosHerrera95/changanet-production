import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Achievements = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAchievements();
      loadUserAchievements();
    }
  }, [user]);

  const loadAchievements = async () => {
    try {
      const response = await fetch('/api/achievements');
      if (response.ok) {
        const data = await response.json();
        setAchievements(data.data);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const loadUserAchievements = async () => {
    try {
      const response = await fetch(`/api/achievements/user/${user.id}/achievements`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUserAchievements(data.data);
      }
    } catch (error) {
      console.error('Error loading user achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAchievementStatus = (achievement) => {
    const userAchievement = userAchievements.find(ua => ua.logro.id === achievement.id);
    return userAchievement ? 'obtained' : 'pending';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">🏆 Mis Logros</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement) => {
          const status = getAchievementStatus(achievement);
          const userAchievement = userAchievements.find(ua => ua.logro.id === achievement.id);

          return (
            <div
              key={achievement.id}
              className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                status === 'obtained'
                  ? 'border-emerald-200 bg-emerald-50 shadow-md'
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`text-3xl ${status === 'obtained' ? '' : 'grayscale'}`}>
                  {achievement.icono}
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${status === 'obtained' ? 'text-emerald-800' : 'text-gray-600'}`}>
                    {achievement.nombre}
                  </h3>
                  <p className={`text-sm ${status === 'obtained' ? 'text-emerald-700' : 'text-gray-500'}`}>
                    {achievement.descripcion}
                  </p>
                  {status === 'obtained' && userAchievement && (
                    <p className="text-xs text-emerald-600 mt-1">
                      Obtenido: {new Date(userAchievement.obtenido_en).toLocaleDateString()}
                    </p>
                  )}
                  <div className="flex items-center mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      status === 'obtained'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {status === 'obtained' ? '🏆 Completado' : '⏳ Pendiente'}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      +{achievement.puntos} puntos
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {achievements.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🏆</div>
          <p className="text-gray-600">No hay logros disponibles aún.</p>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">💡 ¿Cómo funcionan los logros?</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Completa acciones específicas para desbloquear logros</li>
          <li>• Cada logro otorga puntos que mejoran tu reputación</li>
          <li>• Los logros verificados aparecen en tu perfil profesional</li>
          <li>• ¡Sigue completando servicios para ganar más reconocimientos!</li>
        </ul>
      </div>
    </div>
  );
};

export default Achievements;
