import React from 'react';

/**
 * Componente OrderBySelector - Selector de criterio de ordenamiento
 * @param {String} value - Valor seleccionado
 * @param {Function} onChange - Callback para cambios
 */
const OrderBySelector = ({ value, onChange }) => {
  // Opciones de ordenamiento disponibles
  const orderOptions = [
    {
      value: 'relevancia',
      label: 'Más relevante',
      description: 'Ordena por coincidencia con tu búsqueda',
      icon: '🎯'
    },
    {
      value: 'rating',
      label: 'Mejor calificación',
      description: 'Profesionales con mejores reseñas primero',
      icon: '⭐'
    },
    {
      value: 'distance',
      label: 'Más cercano',
      description: 'Profesionales más cerca de tu ubicación',
      icon: '📍'
    },
    {
      value: 'price',
      label: 'Precio más bajo',
      description: 'De menor a mayor precio por hora',
      icon: '💰'
    },
    {
      value: 'availability',
      label: 'Disponibilidad',
      description: 'Profesionales disponibles primero',
      icon: '✅'
    }
  ];

  const handleOptionChange = (optionValue) => {
    onChange(optionValue);
  };

  return (
    <div className="order-by-selector">
      <fieldset className="order-options">
        <legend className="order-legend">Ordenar resultados por:</legend>

        {orderOptions.map((option) => (
          <label
            key={option.value}
            className={`order-option ${
              value === option.value ? 'selected' : ''
            }`}
          >
            <input
              type="radio"
              name="orderBy"
              value={option.value}
              checked={value === option.value}
              onChange={() => handleOptionChange(option.value)}
              className="order-radio"
              aria-describedby={`desc-${option.value}`}
            />

            <div className="option-content">
              <div className="option-header">
                <span className="option-icon">{option.icon}</span>
                <span className="option-label">{option.label}</span>
              </div>
              <div
                id={`desc-${option.value}`}
                className="option-description"
              >
                {option.description}
              </div>
            </div>
          </label>
        ))}
      </fieldset>

      {/* Información adicional */}
      <div className="order-info">
        <small className="order-hint">
          El orden puede afectar los resultados mostrados
        </small>
      </div>
    </div>
  );
};

export default OrderBySelector;
