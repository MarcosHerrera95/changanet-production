import React, { useState, useEffect } from 'react';

/**
 * Componente PriceRangeSlider - Selector de rango de precios con sliders
 * @param {String} minPrice - Precio mínimo
 * @param {String} maxPrice - Precio máximo
 * @param {Function} onChange - Callback para cambios (min, max)
 */
const PriceRangeSlider = ({ minPrice, maxPrice, onChange }) => {
  const [localMin, setLocalMin] = useState(minPrice || '');
  const [localMax, setLocalMax] = useState(maxPrice || '');

  // Precios sugeridos comunes
  const pricePresets = [
    { label: 'Hasta $50', min: '', max: '50' },
    { label: '$50 - $100', min: '50', max: '100' },
    { label: '$100 - $200', min: '100', max: '200' },
    { label: 'Más de $200', min: '200', max: '' }
  ];

  useEffect(() => {
    setLocalMin(minPrice || '');
    setLocalMax(maxPrice || '');
  }, [minPrice, maxPrice]);

  const handleMinChange = (e) => {
    const value = e.target.value;
    setLocalMin(value);
    onChange(value, localMax);
  };

  const handleMaxChange = (e) => {
    const value = e.target.value;
    setLocalMax(value);
    onChange(localMin, value);
  };

  const applyPreset = (preset) => {
    setLocalMin(preset.min);
    setLocalMax(preset.max);
    onChange(preset.min, preset.max);
  };

  const clearRange = () => {
    setLocalMin('');
    setLocalMax('');
    onChange('', '');
  };

  return (
    <div className="price-range-slider">
      {/* Inputs numéricos */}
      <div className="price-inputs">
        <div className="price-input-group">
          <label htmlFor="min-price" className="price-label">
            Precio mínimo
          </label>
          <div className="price-input-wrapper">
            <span className="currency-symbol">$</span>
            <input
              id="min-price"
              type="number"
              value={localMin}
              onChange={handleMinChange}
              placeholder="0"
              min="0"
              className="price-input"
              aria-label="Precio mínimo por hora"
            />
          </div>
        </div>

        <div className="price-separator">-</div>

        <div className="price-input-group">
          <label htmlFor="max-price" className="price-label">
            Precio máximo
          </label>
          <div className="price-input-wrapper">
            <span className="currency-symbol">$</span>
            <input
              id="max-price"
              type="number"
              value={localMax}
              onChange={handleMaxChange}
              placeholder="Sin límite"
              min="0"
              className="price-input"
              aria-label="Precio máximo por hora"
            />
          </div>
        </div>
      </div>

      {/* Preajustes rápidos */}
      <div className="price-presets">
        <span className="presets-label">Preajustes:</span>
        <div className="preset-buttons">
          {pricePresets.map((preset, index) => (
            <button
              key={index}
              onClick={() => applyPreset(preset)}
              className={`preset-btn ${
                localMin === preset.min && localMax === preset.max ? 'active' : ''
              }`}
              aria-label={`Aplicar rango de precio: ${preset.label}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Botón para limpiar */}
      {(localMin || localMax) && (
        <button
          onClick={clearRange}
          className="clear-price-btn"
          aria-label="Limpiar rango de precios"
        >
          Limpiar rango
        </button>
      )}

      {/* Información adicional */}
      <div className="price-info">
        <small className="price-hint">
          Los precios son por hora de trabajo
        </small>
      </div>
    </div>
  );
};

export default PriceRangeSlider;
