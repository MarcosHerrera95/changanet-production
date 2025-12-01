import React, { useState, useEffect } from 'react';
import { searchAPI } from '../services/apiService';

/**
 * Componente SpecialtyFilter - Selector de especialidad con búsqueda
 * @param {String} selectedSpecialty - Especialidad seleccionada
 * @param {Function} onChange - Callback para cambios
 */
const SpecialtyFilter = ({ selectedSpecialty, onChange }) => {
  const [specialties, setSpecialties] = useState([]);
  const [filteredSpecialties, setFilteredSpecialties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Lista de especialidades comunes (fallback)
  const commonSpecialties = [
    'Plomero', 'Electricista', 'Albañil', 'Pintor', 'Carpintero',
    'Jardinero', 'Cerrajero', 'Gasista', 'Techista', 'Herrero',
    'Mecánico', 'Soldador', 'Flete', 'Mudanzas', 'Limpieza'
  ];

  useEffect(() => {
    // Cargar especialidades desde la API
    loadSpecialties();
  }, []);

  useEffect(() => {
    // Filtrar especialidades basado en el término de búsqueda
    if (searchTerm) {
      const filtered = specialties.filter(specialty =>
        specialty.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSpecialties(filtered.slice(0, 10)); // Limitar a 10 resultados
    } else {
      setFilteredSpecialties(specialties.slice(0, 10));
    }
  }, [searchTerm, specialties]);

  const loadSpecialties = async () => {
    try {
      setLoading(true);
      // Intentar cargar desde API
      const response = await searchAPI.autocomplete('', 'specialties');
      if (response.specialties && response.specialties.length > 0) {
        const specialtyNames = response.specialties.map(s => s.value);
        setSpecialties(specialtyNames);
      } else {
        // Fallback a especialidades comunes
        setSpecialties(commonSpecialties);
      }
    } catch (error) {
      console.error('Error loading specialties:', error);
      // Fallback a especialidades comunes
      setSpecialties(commonSpecialties);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowDropdown(true);

    // Si el usuario escribe algo que no está en la lista, permitirlo
    if (value && !specialties.includes(value)) {
      onChange(value);
    }
  };

  const handleSelectSpecialty = (specialty) => {
    setSearchTerm(specialty);
    setShowDropdown(false);
    onChange(specialty);
  };

  const handleClear = () => {
    setSearchTerm('');
    setShowDropdown(false);
    onChange('');
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
  };

  const handleInputBlur = () => {
    // Delay para permitir clics en las opciones
    setTimeout(() => setShowDropdown(false), 200);
  };

  return (
    <div className="specialty-filter">
      <div className="specialty-input-wrapper">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder="Buscar especialidad..."
          className="specialty-input"
          aria-label="Seleccionar especialidad"
          autoComplete="off"
        />

        {searchTerm && (
          <button
            onClick={handleClear}
            className="clear-specialty-btn"
            aria-label="Limpiar especialidad"
          >
            ✕
          </button>
        )}

        {loading && (
          <div className="specialty-loading">
            <div className="loading-spinner"></div>
          </div>
        )}
      </div>

      {showDropdown && (
        <div className="specialty-dropdown">
          {filteredSpecialties.length > 0 ? (
            filteredSpecialties.map((specialty, index) => (
              <button
                key={index}
                onClick={() => handleSelectSpecialty(specialty)}
                className={`specialty-option ${
                  specialty === selectedSpecialty ? 'selected' : ''
                }`}
              >
                {specialty}
              </button>
            ))
          ) : (
            <div className="no-specialties">
              {searchTerm ? 'No se encontraron especialidades' : 'Cargando especialidades...'}
            </div>
          )}

          {searchTerm && !filteredSpecialties.includes(searchTerm) && (
            <button
              onClick={() => handleSelectSpecialty(searchTerm)}
              className="specialty-option custom"
            >
              Usar "{searchTerm}"
            </button>
          )}
        </div>
      )}

      {/* Especialidades populares como sugerencias */}
      {!searchTerm && !selectedSpecialty && (
        <div className="popular-specialties">
          <span className="popular-label">Populares:</span>
          <div className="popular-tags">
            {commonSpecialties.slice(0, 6).map((specialty, index) => (
              <button
                key={index}
                onClick={() => handleSelectSpecialty(specialty)}
                className="popular-tag"
              >
                {specialty}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecialtyFilter;
