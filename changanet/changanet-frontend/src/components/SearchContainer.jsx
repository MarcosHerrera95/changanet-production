import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useSearch } from '../hooks/useSearch';
import { useFilters } from '../hooks/useFilters';
import './SearchSystem.css';

// Lazy loading de componentes para mejor rendimiento
const SearchBar = lazy(() => import('./SearchBar'));
const FilterSidebar = lazy(() => import('./FilterSidebar'));
const ProfessionalCard = lazy(() => import('./ProfessionalCard'));

// Componente de carga para lazy loading
const LoadingFallback = ({ component }) => (
  <div className="lazy-loading-fallback">
    <div className="loading-spinner-small"></div>
    <span>Cargando {component}...</span>
  </div>
);

/**
 * Componente SearchContainer - Contenedor principal del sistema de búsqueda
 * Coordina la barra de búsqueda, filtros y resultados
 */
const SearchContainer = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Hooks de búsqueda y filtros
  const {
    professionals,
    loading,
    error,
    hasMore,
    total,
    isLoadingMore,
    userLocation,
    requestLocation,
    filters: searchFilters,
    updateFilters,
    clearFilters,
    loadMore
  } = useSearch();

  const {
    filters,
    activeFiltersCount,
    updateFilter,
    updateFilters: updateFilterState,
    clearFilters: clearFilterState,
    hasActiveFilters
  } = useFilters();

  // Sincronizar filtros entre hooks
  useEffect(() => {
    updateFilters(filters);
  }, [filters, updateFilters]);

  // Manejadores de eventos
  const handleSearch = (searchParams) => {
    updateFilterState(searchParams);
  };

  const handleFiltersChange = (newFilters) => {
    updateFilterState(newFilters);
  };

  const handleClearFilters = () => {
    clearFilterState();
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLoadMore = () => {
    if (!loading && !isLoadingMore && hasMore) {
      loadMore();
    }
  };

  return (
    <div className="search-container">
      {/* Barra de búsqueda superior */}
      <div className="search-header">
        <Suspense fallback={<LoadingFallback component="barra de búsqueda" />}>
          <SearchBar onSearch={handleSearch} isEmbedded={true} />
        </Suspense>
      </div>

      <div className="search-content">
        {/* Sidebar de filtros */}
        <Suspense fallback={<LoadingFallback component="filtros" />}>
          <FilterSidebar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            activeFiltersCount={activeFiltersCount}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </Suspense>

        {/* Área principal de resultados */}
        <div className="search-results">
          {/* Barra de controles */}
          <div className="results-controls">
            <div className="results-info">
              <button
                onClick={toggleSidebar}
                className="filter-toggle-btn"
                aria-label="Mostrar/ocultar filtros"
              >
                <svg className="filter-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="filter-count">{activeFiltersCount}</span>
                )}
              </button>

              <div className="results-summary">
                {loading ? (
                  <span>Cargando...</span>
                ) : (
                  <span>
                    {total > 0 ? `${total} profesional${total !== 1 ? 'es' : ''} encontrado${total !== 1 ? 's' : ''}` : 'No se encontraron resultados'}
                  </span>
                )}
              </div>
            </div>

            <div className="view-controls">
              <button
                onClick={() => setViewMode('grid')}
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                aria-label="Vista de cuadrícula"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                aria-label="Vista de lista"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Resultados */}
          <div className={`results-grid ${viewMode}`}>
            {error && (
              <div className="error-message">
                <p>Error al cargar resultados: {error}</p>
                <button onClick={() => window.location.reload()}>
                  Reintentar
                </button>
              </div>
            )}

            {loading && professionals.length === 0 && (
              <div className="loading-skeleton">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton-card">
                    <div className="skeleton-avatar"></div>
                    <div className="skeleton-content">
                      <div className="skeleton-line"></div>
                      <div className="skeleton-line short"></div>
                      <div className="skeleton-line"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {professionals.map((professional) => (
              <Suspense key={professional.id} fallback={<LoadingFallback component="tarjeta profesional" />}>
                <ProfessionalCard
                  professional={professional}
                  showRelevanceScore={searchFilters.ordenar_por === 'relevancia'}
                  relevanceScore={professional.relevance_score || 0}
                />
              </Suspense>
            ))}

            {professionals.length === 0 && !loading && !error && (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <h3>No se encontraron profesionales</h3>
                <p>Intenta ajustar tus filtros o búsqueda</p>
                {hasActiveFilters() && (
                  <button onClick={handleClearFilters} className="clear-filters-link">
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Botón "Cargar más" */}
          {hasMore && !loading && !isLoadingMore && (
            <div className="load-more-container">
              <button
                onClick={handleLoadMore}
                className="load-more-btn"
                disabled={isLoadingMore}
              >
                {isLoadingMore ? 'Cargando...' : 'Cargar más profesionales'}
              </button>
            </div>
          )}

          {isLoadingMore && (
            <div className="loading-more">
              <div className="loading-spinner"></div>
              <span>Cargando más resultados...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchContainer;
