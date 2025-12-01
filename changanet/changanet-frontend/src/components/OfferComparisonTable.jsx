/**
 * Componente OfferComparisonTable - Tabla comparativa de ofertas
 * Muestra ofertas ordenadas por precio con funcionalidades de comparación
 */

import { useState, useMemo } from 'react';

const OfferComparisonTable = ({
  offers = [],
  onAcceptOffer,
  onContactProfessional,
  className = ''
}) => {
  const [sortBy, setSortBy] = useState('precio'); // precio, calificacion, experiencia, tiempo
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  const [selectedOffers, setSelectedOffers] = useState([]);

  /**
   * Ofertas ordenadas
   */
  const sortedOffers = useMemo(() => {
    return [...offers].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'precio':
          aValue = a.precio || 0;
          bValue = b.precio || 0;
          break;
        case 'calificacion':
          aValue = a.profesional?.calificacion || 0;
          bValue = b.profesional?.calificacion || 0;
          break;
        case 'experiencia':
          aValue = a.profesional?.anos_experiencia || 0;
          bValue = b.profesional?.anos_experiencia || 0;
          break;
        case 'tiempo':
          aValue = a.respondido_en ? new Date(a.respondido_en).getTime() : Infinity;
          bValue = b.respondido_en ? new Date(b.respondido_en).getTime() : Infinity;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  }, [offers, sortBy, sortOrder]);

  /**
   * Cambiar ordenamiento
   */
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  /**
   * Toggle selección de oferta para comparación
   */
  const toggleOfferSelection = (offerId) => {
    setSelectedOffers(prev =>
      prev.includes(offerId)
        ? prev.filter(id => id !== offerId)
        : [...prev, offerId]
    );
  };

  /**
   * Renderizar icono de ordenamiento
   */
  const renderSortIcon = (column) => {
    if (sortBy !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortOrder === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  /**
   * Renderizar estrellas de calificación
   */
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg key={i} className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    return stars;
  };

  /**
   * Formatear fecha
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Pendiente';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Calcular estadísticas
   */
  const stats = useMemo(() => {
    const validOffers = offers.filter(o => o.precio && o.estado === 'ACEPTADO');
    if (validOffers.length === 0) return null;

    const prices = validOffers.map(o => o.precio);
    return {
      count: validOffers.length,
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((a, b) => a + b, 0) / prices.length
    };
  }, [offers]);

  if (offers.length === 0) {
    return (
      <div className={`text-center py-12 text-gray-500 ${className}`}>
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 0v6m0-6l-6 6m6-6l6 6m-6-6v12" />
        </svg>
        <h3 className="text-lg font-medium mb-2">No hay ofertas aún</h3>
        <p>Las ofertas aparecerán aquí cuando los profesionales respondan a tu solicitud.</p>
      </div>
    );
  }

  return (
    <div className={`offer-comparison-table ${className}`}>
      {/* Header con estadísticas */}
      {stats && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Resumen de ofertas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.count}</div>
              <div className="text-xs text-gray-600">Ofertas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">${stats.min.toLocaleString()}</div>
              <div className="text-xs text-gray-600">Precio más bajo</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">${stats.max.toLocaleString()}</div>
              <div className="text-xs text-gray-600">Precio más alto</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">${Math.round(stats.avg).toLocaleString()}</div>
              <div className="text-xs text-gray-600">Precio promedio</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectedOffers.length === sortedOffers.length}
                  onChange={() => {
                    if (selectedOffers.length === sortedOffers.length) {
                      setSelectedOffers([]);
                    } else {
                      setSelectedOffers(sortedOffers.map(o => o.id));
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('precio')}
              >
                <div className="flex items-center">
                  Precio
                  {renderSortIcon('precio')}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Profesional
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('calificacion')}
              >
                <div className="flex items-center">
                  Calificación
                  {renderSortIcon('calificacion')}
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('experiencia')}
              >
                <div className="flex items-center">
                  Experiencia
                  {renderSortIcon('experiencia')}
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('tiempo')}
              >
                <div className="flex items-center">
                  Respondido
                  {renderSortIcon('tiempo')}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedOffers.map((offer) => (
              <tr
                key={offer.id}
                className={`hover:bg-gray-50 ${selectedOffers.includes(offer.id) ? 'bg-blue-50' : ''}`}
              >
                <td className="px-4 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedOffers.includes(offer.id)}
                    onChange={() => toggleOfferSelection(offer.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-lg font-bold text-gray-900">
                    ${offer.precio?.toLocaleString() || 'Pendiente'}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {offer.profesional?.nombre || 'Profesional'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {offer.profesional?.especialidad || 'Sin especialidad'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {renderStars(offer.profesional?.calificacion)}
                    <span className="ml-1 text-sm text-gray-600">
                      {offer.profesional?.calificacion || 'N/A'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {offer.profesional?.anos_experiencia || 0} años
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(offer.respondido_en)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    offer.estado === 'ACEPTADO'
                      ? 'bg-green-100 text-green-800'
                      : offer.estado === 'PENDIENTE'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {offer.estado === 'ACEPTADO' ? 'Respondida' :
                     offer.estado === 'PENDIENTE' ? 'Pendiente' : offer.estado}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    {offer.estado === 'ACEPTADO' && offer.precio && (
                      <button
                        onClick={() => onAcceptOffer && onAcceptOffer(offer.id)}
                        className="text-green-600 hover:text-green-900 bg-green-100 px-2 py-1 rounded text-xs font-medium"
                      >
                        Aceptar
                      </button>
                    )}
                    <button
                      onClick={() => onContactProfessional && onContactProfessional(offer.profesional?.id)}
                      className="text-blue-600 hover:text-blue-900 bg-blue-100 px-2 py-1 rounded text-xs font-medium"
                    >
                      Contactar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ofertas seleccionadas para comparación detallada */}
      {selectedOffers.length > 1 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-3">
            Comparación detallada ({selectedOffers.length} ofertas seleccionadas)
          </h4>
          <div className="space-y-3">
            {sortedOffers
              .filter(offer => selectedOffers.includes(offer.id))
              .map(offer => (
                <div key={offer.id} className="bg-white p-3 rounded border">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-gray-900">
                      {offer.profesional?.nombre}
                    </span>
                    <span className="text-lg font-bold text-blue-600">
                      ${offer.precio?.toLocaleString()}
                    </span>
                  </div>
                  {offer.comentario && (
                    <p className="text-sm text-gray-600 italic">
                      "{offer.comentario}"
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferComparisonTable;
