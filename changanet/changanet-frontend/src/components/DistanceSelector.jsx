import React from 'react';

/**
 * Componente DistanceSelector - Selector de radio de distancia
 * @param {Number} radius - Radio actual en km
 * @param {Function} onChange - Callback para cambios
 */
const DistanceSelector = ({ radius, onChange }) => {
  // Opciones de distancia predefinidas
  const distanceOptions = [
    { value: 1, label: '1 km' },
    { value: 5, label: '5 km' },
    { value: 10, label: '10 km' },
    { value: 25, label: '25 km' },
    { value: 50, label: '50 km' },
    { value: 100, label: '100 km' }
  ];

  const handleSliderChange = (e) => {
    const value = parseInt(e.target.value);
    onChange(value);
  };

  const handleOptionClick = (value) => {
    onChange(value);
  };

  const handleCustomInputChange = (e) => {
    const value = parseInt(e.target.value) || 10;
    onChange(value);
  };

  return (
    <div className="distance-selector">
      <label className="distance-label">
        Radio de búsqueda
      </label>

      {/* Opciones rápidas */}
      <div className="distance-options">
        {distanceOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleOptionClick(option.value)}
            className={`distance-option ${
              radius === option.value ? 'active' : ''
            }`}
            aria-label={`Buscar en un radio de ${option.label}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Slider personalizado */}
      <div className="distance-slider-group">
        <div className="slider-container">
          <input
            type="range"
            min="1"
            max="100"
            value={radius}
            onChange={handleSliderChange}
            className="distance-slider"
            aria-label="Seleccionar radio de búsqueda con slider"
          />
          <div className="slider-track"></div>
        </div>

        <div className="slider-value">
          <span className="current-radius">{radius} km</span>
        </div>
      </div>

      {/* Input numérico personalizado */}
      <div className="custom-distance">
        <label htmlFor="custom-radius" className="custom-label">
          Radio personalizado:
        </label>
        <div className="custom-input-wrapper">
          <input
            id="custom-radius"
            type="number"
            min="1"
            max="500"
            value={radius}
            onChange={handleCustomInputChange}
            className="custom-radius-input"
            aria-label="Ingresar radio personalizado en kilómetros"
          />
          <span className="unit-label">km</span>
        </div>
      </div>

      {/* Información adicional */}
      <div className="distance-info">
        <small className="distance-hint">
          La distancia se calcula desde tu ubicación actual
        </small>
      </div>
    </div>
  );
};

export default DistanceSelector;
