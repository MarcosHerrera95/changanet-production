import { useState, useEffect } from 'react';

/**
 * RateSelector - Componente para selección de tarifas flexibles
 * Cumple con REQ-10: Indicar tarifas flexibles (hora/servicio/convenio)
 */
const RateSelector = ({ tipo_tarifa, tarifa_hora, tarifa_servicio, tarifa_convenio, onChange, errors = {} }) => {
  const [rateType, setRateType] = useState(tipo_tarifa || 'hora');
  const [hourlyRate, setHourlyRate] = useState(tarifa_hora || '');
  const [serviceRate, setServiceRate] = useState(tarifa_servicio || '');
  const [convenioDescription, setConvenioDescription] = useState(tarifa_convenio || '');

  // Actualizar estado local cuando cambien las props
  useEffect(() => {
    setRateType(tipo_tarifa || 'hora');
    setHourlyRate(tarifa_hora || '');
    setServiceRate(tarifa_servicio || '');
    setConvenioDescription(tarifa_convenio || '');
  }, [tipo_tarifa, tarifa_hora, tarifa_servicio, tarifa_convenio]);

  // Notificar cambios al componente padre
  const notifyChange = () => {
    onChange({
      tipo_tarifa: rateType,
      tarifa_hora: rateType === 'hora' ? hourlyRate : '',
      tarifa_servicio: rateType === 'servicio' ? serviceRate : '',
      tarifa_convenio: rateType === 'convenio' ? convenioDescription : ''
    });
  };

  useEffect(() => {
    notifyChange();
  }, [rateType, hourlyRate, serviceRate, convenioDescription]);

  const handleRateTypeChange = (type) => {
    setRateType(type);
    // Limpiar valores de otros tipos cuando se cambia
    if (type !== 'hora') setHourlyRate('');
    if (type !== 'servicio') setServiceRate('');
    if (type !== 'convenio') setConvenioDescription('');
  };

  const rateTypeOptions = [
    {
      value: 'hora',
      label: 'Por Hora',
      description: 'Cobras por cada hora de trabajo',
      icon: '🕐'
    },
    {
      value: 'servicio',
      label: 'Por Servicio',
      description: 'Precio fijo por trabajo completo',
      icon: '🔧'
    },
    {
      value: 'convenio',
      label: 'A Convenir',
      description: 'Negocias el precio con cada cliente',
      icon: '🤝'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Tipo de Tarifa *
        </label>

        {/* Opciones de tipo de tarifa */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rateTypeOptions.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleRateTypeChange(option.value)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                rateType === option.value
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{option.icon}</span>
                <div>
                  <h3 className={`font-medium ${rateType === option.value ? 'text-blue-700' : 'text-gray-700'}`}>
                    {option.label}
                  </h3>
                  <p className={`text-sm ${rateType === option.value ? 'text-blue-600' : 'text-gray-500'}`}>
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Campos específicos por tipo de tarifa */}
      {rateType === 'hora' && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tarifa por Hora ($)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="1500"
              min="0"
              step="0.01"
              className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.tarifa_hora ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
          </div>
          {errors.tarifa_hora && (
            <p className="mt-1 text-sm text-red-600">{errors.tarifa_hora}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Especifica cuánto cobras por cada hora de trabajo. Incluye materiales si corresponde.
          </p>
        </div>
      )}

      {rateType === 'servicio' && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tarifa por Servicio ($)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              type="number"
              value={serviceRate}
              onChange={(e) => setServiceRate(e.target.value)}
              placeholder="5000"
              min="0"
              step="0.01"
              className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.tarifa_servicio ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
          </div>
          {errors.tarifa_servicio && (
            <p className="mt-1 text-sm text-red-600">{errors.tarifa_servicio}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Precio fijo por trabajo completo. Especifica claramente qué incluye este precio.
          </p>
        </div>
      )}

      {rateType === 'convenio' && (
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción para "A Convenir"
          </label>
          <textarea
            value={convenioDescription}
            onChange={(e) => setConvenioDescription(e.target.value)}
            rows={3}
            placeholder="Ej: Precio según complejidad del trabajo. Incluye visita previa gratuita para presupuesto. Materiales extras se cobran aparte..."
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
              errors.tarifa_convenio ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          />
          {errors.tarifa_convenio && (
            <p className="mt-1 text-sm text-red-600">{errors.tarifa_convenio}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Explica cómo determinas tus precios y qué factores influyen en el costo final.
          </p>
        </div>
      )}

      {/* Información adicional */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">💡 Consejos para definir tus tarifas</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Considera tu experiencia y especialización</li>
          <li>• Incluye costos de materiales y traslados</li>
          <li>• Revisa precios de mercado en tu zona</li>
          <li>• Ofrece descuentos por trabajos múltiples</li>
          <li>• Sé transparente sobre qué incluye el precio</li>
        </ul>
      </div>

      {/* Vista previa de tarifa */}
      <div className="bg-white border border-gray-200 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Vista Previa</h4>
        <div className="text-sm">
          {rateType === 'hora' && hourlyRate && (
            <p className="text-gray-600">
              <span className="font-medium">Tarifa por hora:</span> ${parseFloat(hourlyRate).toLocaleString('es-AR')} ARS
            </p>
          )}
          {rateType === 'servicio' && serviceRate && (
            <p className="text-gray-600">
              <span className="font-medium">Precio por servicio:</span> ${parseFloat(serviceRate).toLocaleString('es-AR')} ARS
            </p>
          )}
          {rateType === 'convenio' && convenioDescription && (
            <p className="text-gray-600">
              <span className="font-medium">A convenir:</span> {convenioDescription}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RateSelector;
