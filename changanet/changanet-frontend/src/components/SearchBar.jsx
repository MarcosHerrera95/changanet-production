import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAPI } from '../services/apiService';
import './SearchBar.css'; // Importar los estilos desde el archivo CSS

// Componente funcional para la barra de búsqueda principal de Changánet
const SearchBar = ({ onSearch, isEmbedded = false }) => {
  // Estados para los valores de los campos de entrada
  const [service, setService] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [barrio, setBarrio] = useState('');

  // Estados para autocompletado
  const [serviceSuggestions, setServiceSuggestions] = useState([]);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [districtSuggestions, setDistrictSuggestions] = useState([]);
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [showDistrictSuggestions, setShowDistrictSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const navigate = useNavigate();
  const serviceInputRef = useRef(null);
  const cityInputRef = useRef(null);
  const districtInputRef = useRef(null);

  // Función de búsqueda debounced para autocompletado
  const debouncedAutocomplete = useCallback(
    debounce(async (query, type) => {
      if (!query || query.length < 2) {
        if (type === 'specialties') setServiceSuggestions([]);
        if (type === 'cities') setCitySuggestions([]);
        if (type === 'districts') setDistrictSuggestions([]);
        return;
      }

      try {
        setLoadingSuggestions(true);
        const response = await searchAPI.autocomplete(query, type);

        if (type === 'specialties' || type === 'all') {
          setServiceSuggestions(response.specialties || []);
        }
        if (type === 'cities' || type === 'all') {
          setCitySuggestions(response.cities || []);
        }
        if (type === 'districts' || type === 'all') {
          setDistrictSuggestions(response.districts || []);
        }
      } catch (error) {
        console.error('Error fetching autocomplete:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300),
    []
  );

  // Efectos para autocompletado
  useEffect(() => {
    if (service) {
      debouncedAutocomplete(service, 'specialties');
      setShowServiceSuggestions(true);
    } else {
      setServiceSuggestions([]);
      setShowServiceSuggestions(false);
    }
  }, [service, debouncedAutocomplete]);

  useEffect(() => {
    if (ciudad) {
      debouncedAutocomplete(ciudad, 'cities');
      setShowCitySuggestions(true);
    } else {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
    }
  }, [ciudad, debouncedAutocomplete]);

  useEffect(() => {
    if (barrio) {
      debouncedAutocomplete(barrio, 'districts');
      setShowDistrictSuggestions(true);
    } else {
      setDistrictSuggestions([]);
      setShowDistrictSuggestions(false);
    }
  }, [barrio, debouncedAutocomplete]);

  // Función que maneja la búsqueda
  const handleSearch = (e) => {
    e.preventDefault(); // Previene el envío del formulario por defecto

    // Validar que al menos un campo tenga contenido
    if (!service.trim() && !ciudad.trim() && !barrio.trim()) {
      alert('Por favor ingresa un servicio, ciudad o barrio para buscar');
      return;
    }

    // Preparar filtros de búsqueda
    const searchFilters = {};
    if (service.trim()) {
      searchFilters.q = service.trim();
    }
    if (ciudad.trim()) {
      searchFilters.ciudad = ciudad.trim();
    }
    if (barrio.trim()) {
      searchFilters.barrio = barrio.trim();
    }

    // Si es embedded, llamar al callback, sino navegar
    if (isEmbedded && onSearch) {
      onSearch(searchFilters);
    } else {
      // Construir parámetros de búsqueda
      const params = new URLSearchParams();
      Object.entries(searchFilters).forEach(([key, value]) => {
        params.set(key, value);
      });

      // Navegar a la página de profesionales con los parámetros
      navigate(`/profesionales?${params.toString()}`);
    }
  };

  // Función para seleccionar sugerencia
  const selectSuggestion = (type, value) => {
    if (type === 'service') {
      setService(value);
      setShowServiceSuggestions(false);
    } else if (type === 'city') {
      setCiudad(value);
      setShowCitySuggestions(false);
    } else if (type === 'district') {
      setBarrio(value);
      setShowDistrictSuggestions(false);
    }
  };

  // Función debounce
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  return (
    <div className="search-bar-wrapper">
      {/* Contenedor de la barra de búsqueda directamente sobre el fondo verde */}
      <div className="search-bar-container">
        {/* Campo 1: Servicio que necesitas */}
        <div className="input-group">
          <label htmlFor="service" className="label">Servicio que necesitas</label>
          <div className="input-wrapper">
            <input
              ref={serviceInputRef}
              id="service"
              type="text"
              placeholder="Plomero, Electricista..."
              value={service}
              onChange={(e) => setService(e.target.value)}
              onFocus={() => service && setShowServiceSuggestions(true)}
              onBlur={() => setTimeout(() => setShowServiceSuggestions(false), 200)}
              className="search-input"
              aria-label="Campo para ingresar el servicio que necesitas"
              autoComplete="off"
            />
            <span className="search-icon">🔍</span>
          </div>
          {/* Dropdown de sugerencias para autocompletado del servicio */}
          {showServiceSuggestions && serviceSuggestions.length > 0 && (
            <div className="autocomplete-dropdown">
              {serviceSuggestions.slice(0, 5).map((suggestion, index) => (
                <div
                  key={index}
                  className="autocomplete-item"
                  onClick={() => selectSuggestion('service', suggestion.value)}
                >
                  {suggestion.value}
                  <span className="suggestion-count">({suggestion.count})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campo 2: Ciudad */}
        <div className="input-group location-group">
          <label htmlFor="ciudad" className="label">Ciudad</label>
          <div className="input-wrapper">
            <input
              ref={cityInputRef}
              id="ciudad"
              type="text"
              placeholder="Buenos Aires, Córdoba..."
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              onFocus={() => ciudad && setShowCitySuggestions(true)}
              onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
              className="search-input"
              aria-label="Campo para ingresar la ciudad"
              autoComplete="off"
            />
            <span className="search-icon">🏙️</span>
          </div>
          {/* Dropdown de sugerencias para autocompletado de ciudades */}
          {showCitySuggestions && citySuggestions.length > 0 && (
            <div className="autocomplete-dropdown">
              {citySuggestions.slice(0, 5).map((suggestion, index) => (
                <div
                  key={index}
                  className="autocomplete-item"
                  onClick={() => selectSuggestion('city', suggestion.value)}
                >
                  {suggestion.value}
                  <span className="suggestion-count">({suggestion.count})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campo 3: Barrio */}
        <div className="input-group location-group">
          <label htmlFor="barrio" className="label">Barrio</label>
          <div className="input-wrapper">
            <input
              ref={districtInputRef}
              id="barrio"
              type="text"
              placeholder="Palermo, Recoleta..."
              value={barrio}
              onChange={(e) => setBarrio(e.target.value)}
              onFocus={() => barrio && setShowDistrictSuggestions(true)}
              onBlur={() => setTimeout(() => setShowDistrictSuggestions(false), 200)}
              className="search-input"
              aria-label="Campo para ingresar el barrio"
              autoComplete="off"
            />
            <span className="search-icon">📍</span>
          </div>
          {/* Dropdown de sugerencias para autocompletado de barrios */}
          {showDistrictSuggestions && districtSuggestions.length > 0 && (
            <div className="autocomplete-dropdown">
              {districtSuggestions.slice(0, 5).map((suggestion, index) => (
                <div
                  key={index}
                  className="autocomplete-item"
                  onClick={() => selectSuggestion('district', suggestion.value)}
                >
                  {suggestion.value}
                  <span className="suggestion-count">({suggestion.count})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botón de búsqueda con color rojo institucional */}
        <button onClick={handleSearch} className="search-button" aria-label="Buscar servicios">
          Buscar
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
