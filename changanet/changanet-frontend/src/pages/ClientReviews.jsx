/**
 * @page ClientReviews - Gestión de reseñas para clientes
 * @descripción Página que muestra todas las reseñas escritas por el cliente (REQ-21 a REQ-25)
 * @sprint Sprint 2 – Sistema de Reseñas
 * @tarjeta Tarjeta 8: [Frontend] Implementar Sistema de Reseñas Cliente
 * @impacto Social: Fomenta la transparencia y calidad en los servicios profesionales
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';

const ClientReviews = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    fiveStarReviews: 0,
    recentReviews: 0
  });

  useEffect(() => {
    if (user && (user.role === 'cliente' || user.rol === 'cliente')) {
      loadReviews();
    } else {
      navigate('/');
    }
  }, [user, navigate]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('changanet_token');

      if (!token) {
        setError('No se encontró token de autenticación');
        return;
      }

      // Load reviews written by this client
      const reviewsResponse = await fetch('/api/reviews/client', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        const reviewsList = reviewsData.reviews || [];
        setReviews(reviewsList);

        // Calculate stats
        const totalReviews = reviewsList.length;
        const averageRating = totalReviews > 0
          ? reviewsList.reduce((sum, review) => sum + review.calificacion, 0) / totalReviews
          : 0;
        const fiveStarReviews = reviewsList.filter(review => review.calificacion === 5).length;
        const recentReviews = reviewsList.filter(review => {
          const reviewDate = new Date(review.creado_en);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return reviewDate >= thirtyDaysAgo;
        }).length;

        setStats({
          totalReviews,
          averageRating: Math.round(averageRating * 10) / 10,
          fiveStarReviews,
          recentReviews
        });
      } else {
        const errorData = await reviewsResponse.json();
        setError(errorData.error || 'Error al cargar reseñas');
      }
    } catch (err) {
      console.error('Error loading reviews:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-lg ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          >
            ★
          </span>
        ))}
        <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>
      </div>
    );
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'hace 1 día';
    if (diffDays < 7) return `hace ${diffDays} días`;
    if (diffDays < 30) return `hace ${Math.ceil(diffDays / 7)} semanas`;
    return `hace ${Math.ceil(diffDays / 30)} meses`;
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
          <h1 className="text-3xl font-bold text-gray-900">Mis Reseñas</h1>
          <p className="mt-2 text-gray-600">
            Gestiona todas las reseñas que has escrito sobre servicios completados.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-2xl">📝</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total de Reseñas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalReviews}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <span className="text-2xl">⭐</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Calificación Promedio</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.averageRating}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-2xl">🏆</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Reseñas de 5⭐</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.fiveStarReviews}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <span className="text-2xl">🕒</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Reseñas Recientes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.recentReviews}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Cargando reseñas...</span>
          </div>
        )}

        {/* Reviews List */}
        {!loading && (
          <div className="space-y-6">
            {reviews.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <div className="text-6xl mb-4">⭐</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Aún no has escrito reseñas
                </h3>
                <p className="text-gray-600 mb-6">
                  Cuando completes servicios, podrás dejar reseñas para ayudar a otros clientes.
                </p>
                <button
                  onClick={() => navigate('/cliente/servicios')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ver Mis Servicios
                </button>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 mr-4">
                          Servicio #{review.servicio?.id}
                        </h3>
                        {renderStars(review.calificacion)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Profesional</p>
                          <p className="font-medium">{review.servicio?.profesional?.nombre || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Especialidad</p>
                          <p className="font-medium">
                            {review.servicio?.profesional?.perfil_profesional?.especialidad || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Fecha del servicio</p>
                          <p className="font-medium">
                            {review.servicio?.completado_en
                              ? new Date(review.servicio.completado_en).toLocaleDateString('es-ES')
                              : 'N/A'
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Reseña escrita</p>
                          <p className="font-medium">{getTimeAgo(review.creado_en)}</p>
                        </div>
                      </div>

                      {review.comentario && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-500 mb-2">Tu comentario</p>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-gray-700 italic">"{review.comentario}"</p>
                          </div>
                        </div>
                      )}

                      {review.url_foto && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-500 mb-2">Foto adjunta</p>
                          <img
                            src={review.url_foto}
                            alt="Foto del servicio"
                            className="w-32 h-32 object-cover rounded-lg border"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => navigate(`/profesional/${review.servicio?.profesional?.id}`)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Ver Perfil del Profesional
                    </button>

                    <button
                      onClick={() => navigate(`/chat?user=${review.servicio?.profesional?.id}`)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Contactar de Nuevo
                    </button>

                    <button
                      onClick={() => navigate('/cliente/servicios')}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                    >
                      Ver Todos los Servicios
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Help Section */}
        {!loading && reviews.length > 0 && (
          <div className="mt-12 bg-blue-50 border border-blue-200 p-6 rounded-lg">
            <div className="flex items-start">
              <span className="text-blue-500 mr-3 text-2xl">💡</span>
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">¿Sabías que?</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Tus reseñas ayudan a otros clientes a elegir profesionales de calidad</li>
                  <li>• Los profesionales con mejores reseñas aparecen primero en las búsquedas</li>
                  <li>• Solo puedes reseñar servicios que han sido marcados como completados</li>
                  <li>• Puedes editar o actualizar tus reseñas en cualquier momento</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientReviews;
