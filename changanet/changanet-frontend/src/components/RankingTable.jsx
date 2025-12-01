/**
 * @component RankingTable - Tabla paginada de ranking global, filtrable por especialidad
 * @descripción Muestra ranking de profesionales con filtros y paginación
 * @sprint Sprint 3 – Verificación de Identidad y Reputación
 * @tarjeta Implementar Sistema de Rankings
 * @impacto Competencia: Motiva a profesionales a mejorar su posicionamiento
 */

import { useState, useEffect } from 'react';
import { reputationAPI } from '../services/apiService';
import { useApiState } from '../hooks/useApi';

const RankingTable = ({
  initialFilters = {},
  showFilters = true,
  showPagination = true,
  itemsPerPage = 20
}) => {
  const [rankings, setRankings] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState({
    specialty: '',
    verified: '',
    minRating: '',
    sortBy: 'score',
    sortOrder: 'desc',
    ...initialFilters
  });

  const { execute: loadRankings, loading } = useApiState();

  useEffect(() => {
    fetchRankings();
  }, [currentPage, filters]);

  const fetchRankings = async () => {
    try {
      const queryParams = {
        page: currentPage,
        limit: itemsPerPage,
        ...filters
      };

      // Limpiar parámetros vacíos
      Object.keys(queryParams).forEach(key => {
        if (queryParams[key] === '') {
          delete queryParams[key];
        }
      });

      const data = await loadRankings(() => reputationAPI.getRanking(queryParams));

      setRankings(data.rankings || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.totalItems || 0);
    } catch (error) {
      console.error('Error loading rankings:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

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

  const specialties = [
    'Plomería', 'Electricidad', 'Pintura', 'Jardinería', 'Carpintería',
    'Mecánica', 'Electrónica', 'Limpieza', 'Mudanzas', 'Otros'
  ];

  if (loading && rankings.length === 0) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">🏆 Ranking Global de Profesionales</h2>
          <div className="text-sm text-gray-600">
            {totalItems} profesionales registrados
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Especialidad
              </label>
              <select
                value={filters.specialty}
                onChange={(e) => handleFilterChange('specialty', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las especialidades</option>
                {specialties.map(specialty => (
                  <option key={specialty} value={specialty}>{specialty}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Verificación
              </label>
              <select
                value={filters.verified}
                onChange={(e) => handleFilterChange('verified', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="true">Verificados</option>
                <option value="false">No verificados</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calificación mínima
              </label>
              <select
                value={filters.minRating}
                onChange={(e) => handleFilterChange('minRating', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                <option value="4.5">⭐⭐⭐⭐⭐ 4.5+</option>
                <option value="4.0">⭐⭐⭐⭐ 4.0+</option>
                <option value="3.5">⭐⭐⭐ 3.5+</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ordenar por
              </label>
              <select
                value={`${filters.sortBy}_${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('_');
                  handleFilterChange('sortBy', sortBy);
                  handleFilterChange('sortOrder', sortOrder);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="score_desc">Puntuación (Mayor a menor)</option>
                <option value="score_asc">Puntuación (Menor a mayor)</option>
                <option value="rating_desc">Calificación (Mayor a menor)</option>
                <option value="services_desc">Servicios completados</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Posición
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Profesional
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Especialidad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Puntuación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Calificación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Servicios
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rankings.map((professional, index) => (
              <tr
                key={professional.id}
                className={`hover:bg-gray-50 transition-colors ${
                  (currentPage - 1) * itemsPerPage + index + 1 <= 3
                    ? 'bg-yellow-50'
                    : ''
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-lg font-bold mr-2">
                      {getRankingBadge((currentPage - 1) * itemsPerPage + index + 1)}
                    </span>
                    <span className={`text-sm font-medium ${getScoreColor(professional.score)}`}>
                      #{(currentPage - 1) * itemsPerPage + index + 1}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {professional.nombre?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 flex items-center">
                        {professional.nombre}
                        {professional.verified && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✅ Verificado
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{professional.zona_cobertura}</div>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {professional.especialidad}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-lg font-bold ${getScoreColor(professional.score)}`}>
                    {professional.score} pts
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-yellow-500 mr-1">⭐</span>
                    <span className="text-sm font-medium text-gray-900">
                      {professional.calificacion_promedio?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {professional.servicios_completados || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {showPagination && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} resultados
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Anterior
            </button>

            {/* Números de página */}
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              if (pageNum > totalPages) return null;

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1 border rounded-md text-sm ${
                    pageNum === currentPage
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {rankings.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🏆</div>
          <p className="text-gray-600">No se encontraron profesionales con los filtros seleccionados.</p>
        </div>
      )}
    </div>
  );
};

export default RankingTable;
