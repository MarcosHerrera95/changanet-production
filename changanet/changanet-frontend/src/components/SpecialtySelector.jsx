import { useState, useEffect } from 'react';

/**
 * SpecialtySelector - Componente para selección múltiple de especialidades
 * Cumple con REQ-07: Seleccionar especialidades múltiples
 */
const SpecialtySelector = ({ value = [], onChange, error, maxSelections = 5 }) => {
  const [selectedSpecialties, setSelectedSpecialties] = useState(value);
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Lista de especialidades predefinidas (podría venir de API)
  const predefinedSpecialties = [
    'Plomero',
    'Electricista',
    'Pintor',
    'Carpintero',
    'Jardinero',
    'Gasista',
    'Cerrajero',
    'Albañil',
    'Techista',
    'Mecánico',
    'Soldador',
    'Herrero',
    'Vidriero',
    'Fumigador',
    'Limpieza',
    'Mudanzas',
    'Reparaciones Domésticas',
    'Instalaciones',
    'Mantenimiento',
    'Construcción'
  ];

  // Actualizar estado local cuando cambie el valor externo
  useEffect(() => {
    // Solo actualizar si value es diferente al estado local
    if (Array.isArray(value) && JSON.stringify(value) !== JSON.stringify(selectedSpecialties)) {
      setSelectedSpecialties(value);
    }
  }, [value]);



  const handleToggleSpecialty = (specialty) => {
    if (selectedSpecialties.includes(specialty)) {
      // Remover especialidad
      const updated = selectedSpecialties.filter(s => s !== specialty);
      setSelectedSpecialties(updated);
      onChange(updated);
    } else {
      // Agregar especialidad (con límite)
      if (selectedSpecialties.length < maxSelections) {
        const updated = [...selectedSpecialties, specialty];
        setSelectedSpecialties(updated);
        onChange(updated);
      }
    }
  };

  const handleAddCustomSpecialty = () => {
    if (customSpecialty.trim() && !selectedSpecialties.includes(customSpecialty.trim())) {
      if (selectedSpecialties.length < maxSelections) {
        const updated = [...selectedSpecialties, customSpecialty.trim()];
        setSelectedSpecialties(updated);
        onChange(updated);
        setCustomSpecialty('');
        setShowCustomInput(false);
      }
    }
  };

  const handleRemoveSpecialty = (specialty) => {
    const updated = selectedSpecialties.filter(s => s !== specialty);
    setSelectedSpecialties(updated);
    onChange(updated);
  };

  const isSelected = (specialty) => selectedSpecialties.includes(specialty);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Especialidades ({selectedSpecialties.length}/{maxSelections}) *
        </label>
        <button
          type="button"
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          {showCustomInput ? 'Cancelar' : 'Agregar otra'}
        </button>
      </div>

      {/* Especialidades seleccionadas */}
      {selectedSpecialties.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedSpecialties.map(specialty => (
            <span
              key={specialty}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
            >
              {specialty}
              <button
                type="button"
                onClick={() => handleRemoveSpecialty(specialty)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input para especialidad personalizada */}
      {showCustomInput && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={customSpecialty}
            onChange={(e) => setCustomSpecialty(e.target.value)}
            placeholder="Ej: Especialista en domótica"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomSpecialty();
              }
            }}
          />
          <button
            type="button"
            onClick={handleAddCustomSpecialty}
            disabled={!customSpecialty.trim() || selectedSpecialties.length >= maxSelections}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Agregar
          </button>
        </div>
      )}

      {/* Grid de especialidades predefinidas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {predefinedSpecialties.map(specialty => (
          <button
            key={specialty}
            type="button"
            onClick={() => handleToggleSpecialty(specialty)}
            disabled={!isSelected(specialty) && selectedSpecialties.length >= maxSelections}
            className={`p-3 text-sm border rounded-lg transition-all ${
              isSelected(specialty)
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : selectedSpecialties.length >= maxSelections
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            {specialty}
          </button>
        ))}
      </div>

      {/* Mensaje de límite alcanzado */}
      {selectedSpecialties.length >= maxSelections && (
        <p className="text-sm text-amber-600">
          Has alcanzado el límite máximo de {maxSelections} especialidades.
          Puedes remover alguna para seleccionar otras.
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Información adicional */}
      <p className="text-xs text-gray-500">
        Selecciona las especialidades que mejor describan tus servicios.
        Puedes seleccionar hasta {maxSelections} especialidades.
      </p>
    </div>
  );
};

export default SpecialtySelector;
