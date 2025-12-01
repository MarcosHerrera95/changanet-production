import { useState, useEffect, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { debounce } from '../utils/performance';
import reviewService from '../services/reviewService';
import ReviewCard from './ReviewCard';
import LoadingSpinner from './ui/LoadingSpinner';

/**
 * ReviewList - Componente para mostrar lista paginada de reseñas
 * Incluye filtros, paginación y estadísticas
 */
const ReviewList = ({
  professionalId,
  showServiceInfo = true,
  initialPage = 1,
  itemsPerPage = 5,
  showStats = true,
  className = ''
}) => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, highest, lowest

  // Cargar reseñas y estadísticas
  useEffect(() => {
    loadReviews();
  }, [professionalId, currentPage, sortBy]);

  useEffect(() => {
    if (showStats && professionalId) {
      loadStats();

      // Suscribirse a actualizaciones en vivo de estadísticas
      const unsubscribe = reviewService.subscribeToStats(professionalId, (newStats) => {
        setStats(newStats);
      });

      return unsubscribe; // Cleanup al desmontar
    }
  }, [professionalId]);

  const loadReviews = async () => {
    if (!professionalId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await reviewService.getProfessionalReviews(
        professionalId,
        currentPage,
        itemsPerPage,
        sortBy
      );

      setReviews(response.reviews || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Error cargando reseñas:', err);
      setError('Error al cargar las reseñas. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await reviewService.getProfessionalStats(professionalId);
      setStats(statsData);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  };

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  // Debounced sort change to avoid excessive API calls
  const debouncedSortChange = useMemo(
    () => debounce((newSort) => {
      setSortBy(newSort);
      setCurrentPage(1); // Reset to first page when sorting changes
    }, 300),
    []
  );

  const handleSortChange = useCallback((newSort) => {
    debouncedSortChange(newSort);
  }, [debouncedSortChange]);

  // Componente de paginación memoizado
  const Pagination = useMemo(() => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-center space-x-2 mt-8">
        {/* Anterior */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Anterior
        </button>

        {/* Páginas */}
        {startPage > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              1
            </button>
            {startPage > 2 && <span className="px-2 text-gray-500">...</span>}
          </>
        )}

        {pages.map(page => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`px-3 py-2 text-sm font-medium rounded-lg ${
              page === currentPage
                ? 'text-white bg-emerald-500 border border-emerald-500'
                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-2 text-gray-500">...</span>}
            <button
              onClick={() => handlePageChange(totalPages)}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {totalPages}
            </button>
          </>
        )}

        {/* Siguiente */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Siguiente →
        </button>
      </div>
    );
  }, [totalPages, currentPage, handlePageChange]);

  if (loading && reviews.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
        <span className="ml-3 text-gray-600">Cargando reseñas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">⚠️ {error}</div>
        <button
          onClick={loadReviews}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Estadísticas */}
      {showStats && stats && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Valoraciones</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{stats.averageRating?.toFixed(1) || '0.0'}</div>
              <div className="text-sm text-gray-600">Calificación Promedio</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600">{stats.totalReviews || 0}</div>
              <div className="text-sm text-gray-600">Total de Reseñas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.positivePercentage || 0}%</div>
              <div className="text-sm text-gray-600">Reseñas Positivas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.lastReviewDate ? new Date(stats.lastReviewDate).toLocaleDateString('es-AR') : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Última Reseña</div>
            </div>
          </div>
        </div>
      )}

      {/* Controles de ordenamiento */}
      {reviews.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Mostrando {reviews.length} reseña{reviews.length !== 1 ? 's' : ''}
            {totalPages > 1 && ` (página ${currentPage} de ${totalPages})`}
          </div>

          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="newest">Más recientes</option>
            <option value="oldest">Más antiguas</option>
            <option value="highest">Mejor calificación</option>
            <option value="lowest">Peor calificación</option>
          </select>
        </div>
      )}

      {/* Lista de reseñas */}
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⭐</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay reseñas aún</h3>
          <p className="text-gray-600">Este profesional aún no tiene reseñas de clientes.</p>
        </div>
      ) : reviews.length > 20 ? (
        // Virtualización para listas grandes (>20 reseñas)
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <List
            height={600} // Altura del contenedor
            itemCount={reviews.length}
            itemSize={200} // Altura aproximada de cada ReviewCard
            className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          >
            {({ index, style }) => (
              <div style={style} className="px-4 py-2">
                <ReviewCard
                  review={reviews[index]}
                  showServiceInfo={showServiceInfo}
                />
              </div>
            )}
          </List>
        </div>
      ) : (
        // Render normal para listas pequeñas
        <div className="space-y-4">
          {reviews.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              showServiceInfo={showServiceInfo}
            />
          ))}
        </div>
      )}

      {/* Paginación */}
      <Pagination />
    </div>
  );
};

export default ReviewList;
