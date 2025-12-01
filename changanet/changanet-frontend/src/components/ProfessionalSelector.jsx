/**
 * Componente ProfessionalSelector - Selector de profesionales
 * Permite buscar y seleccionar profesionales manualmente además de la distribución automática
 */

import { useState, useEffect } from 'react';

const ProfessionalSelector = ({
  selectedProfessionals = [],
  onSelectionChange,
  zona = '',
  especialidad = '',
  maxSelection = 10,
  className = ''
}) => {
  const [professionals, setProfessionals] = useState([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rating'); // rating, experience, distance

  /**
   * Cargar profesionales disponibles
   */
  useEffect(() => {
    if (especialidad && zona) {
      loadProfessionals();
    }
  }, [especialidad, zona]);

  /**
   * Filtrar profesionales según búsqueda
   */
  useEffect(() => {
    let filtered = professionals;

    if (searchTerm) {
      filtered = filtered.filter(prof =>
        prof.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prof.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prof.especialidad.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.calificacion_promedio || 0) - (a.calificacion_promedio || 0);
        case 'experience':
          return (b.anos_experiencia || 0) - (a.anos_experiencia || 0);
        case 'distance':
          // Aquí iría lógica de distancia si tuviéramos coordenadas
          return 0;
        default:
          return 0;
      }
    });

    setFilteredProfessionals(filtered);
  }, [professionals, searchTerm, sortBy]);

  /**
   * Cargar profesionales desde la API
   */
  const loadProfessionals = async () => {
    setLoading(true);
    try {
      // En una implementación real, esto vendría de una API
      // Por ahora simulamos datos
      const mockProfessionals = [
        {
          id: 1,
          nombre: 'Carlos Rodríguez',
          especialidad: especialidad,
          zona_cobertura: zona,
          calificacion_promedio: 4.8,
          anos_experiencia: 8,
          descripcion: 'Profesional con amplia experiencia en trabajos de calidad',
          esta_disponible: true,
          precio_promedio: 150
        },
        {
          id: 2,
          nombre: 'María González',
          especialidad: especialidad,
          zona_cobertura: zona,
          calificacion_promedio: 4.9,
          anos_experiencia: 12,
          descripcion: 'Especialista certificada con más de 10 años de experiencia',
          esta_disponible: true,
          precio_promedio: 200
        },
        {
          id: 3,
          nombre: 'Juan Pérez',
          especialidad: especialidad,
          zona_cobertura: zona,
          calificacion_promedio: 4.6,
          anos_experiencia: 5,
          descripcion: 'Profesional joven y dinámico, precios competitivos',
          esta_disponible: true,
          precio_promedio: 120
        }
      ];

      setProfessionals(mockProfessionals);
    } catch (error) {
      console.error('Error loading professionals:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Manejar selección/deselección de profesional
   */
  const handleProfessionalToggle = (professionalId) => {
    let newSelection;

    if (selectedProfessionals.includes(professionalId)) {
      // Deseleccionar
      newSelection = selectedProfessionals.filter(id => id !== professionalId);
    } else {
      // Seleccionar (con límite)
      if (selectedProfessionals.length >= maxSelection) {
        alert(`Máximo ${maxSelection} profesionales permitidos`);
        return;
      }
      newSelection = [...selectedProfessionals, professionalId];
    }

    onSelectionChange && onSelectionChange(newSelection);
  };

  /**
   * Renderizar estrellas de calificación
   */
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    if (hasHalfStar) {
      stars.push(
        <svg key="half" className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
          <defs>
            <linearGradient id="halfStar">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path fill="url(#halfStar)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg key={`empty-${i}`} className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    return stars;
  };

  if (!especialidad || !zona) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p>Selecciona una especialidad y zona para ver profesionales disponibles</p>
      </div>
    );
  }

  return (
    <div className={`professional-selector ${className}`}>
      {/* Header con búsqueda y filtros */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar profesionales..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Ordenar por */}
          <div className="sm:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="rating">Ordenar por calificación</option>
              <option value="experience">Ordenar por experiencia</option>
              <option value="distance">Ordenar por distancia</option>
            </select>
          </div>
        </div>

        {/* Contador de seleccionados */}
        <div className="text-sm text-gray-600">
          Seleccionados: {selectedProfessionals.length}/{maxSelection}
          {selectedProfessionals.length > 0 && (
            <span className="ml-2 text-blue-600">
              (además de la distribución automática)
            </span>
          )}
        </div>
      </div>

      {/* Lista de profesionales */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando profesionales...</p>
        </div>
      ) : filteredProfessionals.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p>No se encontraron profesionales disponibles</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProfessionals.map((professional) => (
            <div
              key={professional.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedProfessionals.includes(professional.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
              onClick={() => handleProfessionalToggle(professional.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 mr-3">
                      {professional.nombre}
                    </h3>
                    {selectedProfessionals.includes(professional.id) && (
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>

                  <div className="flex items-center mb-2">
                    <div className="flex items-center mr-4">
                      {renderStars(professional.calificacion_promedio)}
                      <span className="ml-1 text-sm text-gray-600">
                        ({professional.calificacion_promedio})
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {professional.anos_experiencia} años de experiencia
                    </span>
                  </div>

                  {professional.descripcion && (
                    <p className="text-gray-700 text-sm mb-2">
                      {professional.descripcion}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Precio promedio: ${professional.precio_promedio}
                    </span>
                    <span className="text-xs text-green-600 font-medium">
                      ✓ Disponible
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfessionalSelector;
