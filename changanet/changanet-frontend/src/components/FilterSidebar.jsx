import React, { useState } from 'react';
import PriceRangeSlider from './PriceRangeSlider';
import SpecialtyFilter from './SpecialtyFilter';
import DistanceSelector from './DistanceSelector';
import OrderBySelector from './OrderBySelector';

/**
 * Componente FilterSidebar - Panel lateral con todos los filtros de búsqueda
 * @param {Object} filters - Filtros actuales
 * @param {Function} onFiltersChange - Callback para cambios en filtros
 * @param {Function} onClearFilters - Callback para limpiar filtros
 * @param {Number} activeFiltersCount - Cantidad de filtros activos
 * @param {Boolean} isOpen - Si el sidebar está abierto (para móviles)
 * @param {Function} onClose - Callback para cerrar el sidebar
 */
const FilterSidebar = ({
  filters,
  onFiltersChange,
  onClearFilters,
  activeFiltersCount,
  isOpen = true,
  onClose
}) => {
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    specialty: true,
    location: true,
    verification: true,
    order: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleFilterChange = (filterKey, value) => {
    onFiltersChange({ [filterKey]: value });
  };

  return (
    <>
      {/* Overlay para móviles */}
      {isOpen && (
        <div
          className="filter-sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div className={`filter-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="filter-sidebar-header">
          <div className="filter-header-content">
            <h3 className="filter-title">Filtros</h3>
            {activeFiltersCount > 0 && (
              <span className="active-filters-badge">
                {activeFiltersCount} activo{activeFiltersCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="filter-header-actions">
            {activeFiltersCount > 0 && (
              <button
                onClick={onClearFilters}
                className="clear-filters-btn"
                aria-label="Limpiar todos los filtros"
              >
                Limpiar
              </button>
            )}
            <button
              onClick={onClose}
              className="close-sidebar-btn"
              aria-label="Cerrar filtros"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Contenido de filtros */}
        <div className="filter-sidebar-content">
          {/* Filtro de Precio */}
          <div className="filter-section">
            <button
              className="filter-section-header"
              onClick={() => toggleSection('price')}
              aria-expanded={expandedSections.price}
            >
              <span className="section-title">Rango de Precio</span>
              <span className="section-icon">
                {expandedSections.price ? '−' : '+'}
              </span>
            </button>
            {expandedSections.price && (
              <div className="filter-section-content">
                <PriceRangeSlider
                  minPrice={filters.precio_min || ''}
                  maxPrice={filters.precio_max || ''}
                  onChange={(min, max) => {
                    onFiltersChange({
                      precio_min: min,
                      precio_max: max
                    });
                  }}
                />
              </div>
            )}
          </div>

          {/* Filtro de Especialidad */}
          <div className="filter-section">
            <button
              className="filter-section-header"
              onClick={() => toggleSection('specialty')}
              aria-expanded={expandedSections.specialty}
            >
              <span className="section-title">Especialidad</span>
              <span className="section-icon">
                {expandedSections.specialty ? '−' : '+'}
              </span>
            </button>
            {expandedSections.specialty && (
              <div className="filter-section-content">
                <SpecialtyFilter
                  selectedSpecialty={filters.especialidad || ''}
                  onChange={(value) => handleFilterChange('especialidad', value)}
                />
              </div>
            )}
          </div>

          {/* Filtro de Ubicación y Distancia */}
          <div className="filter-section">
            <button
              className="filter-section-header"
              onClick={() => toggleSection('location')}
              aria-expanded={expandedSections.location}
            >
              <span className="section-title">Ubicación</span>
              <span className="section-icon">
                {expandedSections.location ? '−' : '+'}
              </span>
            </button>
            {expandedSections.location && (
              <div className="filter-section-content">
                <div className="location-filters">
                  <div className="filter-group">
                    <label htmlFor="ciudad-filter" className="filter-label">
                      Ciudad
                    </label>
                    <input
                      id="ciudad-filter"
                      type="text"
                      value={filters.ciudad || ''}
                      onChange={(e) => handleFilterChange('ciudad', e.target.value)}
                      placeholder="Ej: Buenos Aires"
                      className="filter-input"
                    />
                  </div>

                  <div className="filter-group">
                    <label htmlFor="barrio-filter" className="filter-label">
                      Barrio
                    </label>
                    <input
                      id="barrio-filter"
                      type="text"
                      value={filters.barrio || ''}
                      onChange={(e) => handleFilterChange('barrio', e.target.value)}
                      placeholder="Ej: Palermo"
                      className="filter-input"
                    />
                  </div>

                  <DistanceSelector
                    radius={filters.radio || 10}
                    onChange={(value) => handleFilterChange('radio', value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Filtro de Verificación */}
          <div className="filter-section">
            <button
              className="filter-section-header"
              onClick={() => toggleSection('verification')}
              aria-expanded={expandedSections.verification}
            >
              <span className="section-title">Verificación</span>
              <span className="section-icon">
                {expandedSections.verification ? '−' : '+'}
              </span>
            </button>
            {expandedSections.verification && (
              <div className="filter-section-content">
                <div className="verification-filter">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.verificado || false}
                      onChange={(e) => handleFilterChange('verificado', e.target.checked)}
                      className="filter-checkbox"
                    />
                    <span className="checkmark"></span>
                    Solo profesionales verificados
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Ordenamiento */}
          <div className="filter-section">
            <button
              className="filter-section-header"
              onClick={() => toggleSection('order')}
              aria-expanded={expandedSections.order}
            >
              <span className="section-title">Ordenar por</span>
              <span className="section-icon">
                {expandedSections.order ? '−' : '+'}
              </span>
            </button>
            {expandedSections.order && (
              <div className="filter-section-content">
                <OrderBySelector
                  value={filters.ordenar_por || 'relevancia'}
                  onChange={(value) => handleFilterChange('ordenar_por', value)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default FilterSidebar;
