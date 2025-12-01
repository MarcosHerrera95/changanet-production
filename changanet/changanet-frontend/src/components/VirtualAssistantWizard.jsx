/**
 * @component VirtualAssistantWizard - Asistente virtual para completar perfil profesional
 * @descripción Guía paso a paso para nuevos profesionales en la configuración inicial
 * @optimización Mejora la experiencia de onboarding y reduce abandono
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const VirtualAssistantWizard = ({ onComplete, initialData = {} }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    specialty: initialData.specialty || '',
    yearsExperience: initialData.yearsExperience || '',
    coverageArea: initialData.coverageArea || '',
    hourlyRate: initialData.hourlyRate || '',
    services: initialData.services || [],
    availability: initialData.availability || [],
    description: initialData.description || ''
  });
  const [suggestions, setSuggestions] = useState({});
  const navigate = useNavigate();

  const steps = [
    {
      id: 'welcome',
      title: '¡Bienvenido a Changánet! 👋',
      description: 'Vamos a configurar tu perfil profesional paso a paso. Esto tomará solo 3 minutos.',
      type: 'info'
    },
    {
      id: 'specialty',
      title: '¿Cuál es tu especialidad? 🔧',
      description: 'Selecciona tu área de expertise principal',
      type: 'selection',
      field: 'specialty',
      options: [
        'Plomero', 'Electricista', 'Pintor', 'Carpintero',
        'Jardinero', 'Mecánico', 'Técnico', 'Otro'
      ]
    },
    {
      id: 'experience',
      title: '¿Cuántos años de experiencia tienes? 📅',
      description: 'Esto ayuda a los clientes a confiar en tu expertise',
      type: 'input',
      field: 'yearsExperience',
      inputType: 'number',
      min: 0,
      max: 50,
      placeholder: 'Ej: 5'
    },
    {
      id: 'location',
      title: '¿Dónde ofreces tus servicios? 📍',
      description: 'Define tu zona de cobertura para aparecer en búsquedas locales',
      type: 'input',
      field: 'coverageArea',
      inputType: 'text',
      placeholder: 'Ej: Buenos Aires, Palermo'
    },
    {
      id: 'pricing',
      title: '¿Cuál es tu tarifa por hora? 💰',
      description: 'Establece un precio competitivo basado en el mercado',
      type: 'pricing',
      field: 'hourlyRate'
    },
    {
      id: 'services',
      title: '¿Qué servicios específicos ofreces? 📋',
      description: 'Selecciona los servicios que realizas con frecuencia',
      type: 'multiselect',
      field: 'services'
    },
    {
      id: 'availability',
      title: '¿Cuándo estás disponible? 📅',
      description: 'Configura tus horarios para recibir más solicitudes',
      type: 'availability',
      field: 'availability'
    },
    {
      id: 'description',
      title: 'Cuéntanos sobre ti ✍️',
      description: 'Una breve descripción de tu trabajo y experiencia',
      type: 'textarea',
      field: 'description',
      placeholder: 'Ej: Especialista en reparaciones de plomería residencial con 8 años de experiencia...'
    },
    {
      id: 'complete',
      title: '¡Perfil completado! 🎉',
      description: 'Tu perfil está listo. ¡Comienza a recibir solicitudes!',
      type: 'complete'
    }
  ];

  // Generar sugerencias inteligentes basadas en especialidad y zona
  useEffect(() => {
    if (formData.specialty && formData.coverageArea) {
      fetchPricingSuggestions();
    }
  }, [formData.specialty, formData.coverageArea, formData.yearsExperience]);

  const fetchPricingSuggestions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('/api/market-analysis/pricing-suggestions', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          specialty: formData.specialty,
          zone: formData.coverageArea,
          experience: formData.yearsExperience || 0
        }
      });

      if (response.data.success) {
        const data = response.data.data;
        setSuggestions({
          services: getServicesBySpecialty(formData.specialty),
          avgPrice: data.finalSuggestions?.recommended || data.marketStats?.suggestions?.recommended || 2000,
          description: generateDescription(formData.specialty),
          marketData: data
        });
      }
    } catch (error) {
      console.error('Error fetching pricing suggestions:', error);
      // Fallback to default suggestions
      setSuggestions({
        services: getServicesBySpecialty(formData.specialty),
        avgPrice: 2000,
        description: generateDescription(formData.specialty)
      });
    }
  };

  const getServicesBySpecialty = (specialty) => {
    const servicesData = {
      'Plomero': ['Reparación de caños', 'Instalación de grifería', 'Desobstrucción', 'Instalación de calefones'],
      'Electricista': ['Instalación eléctrica', 'Reparación de tomacorrientes', 'Instalación de luces', 'Certificación eléctrica'],
      'Pintor': ['Pintura interior', 'Pintura exterior', 'Pintura decorativa', 'Preparación de superficies'],
      'Carpintero': ['Muebles a medida', 'Reparaciones', 'Instalación de puertas', 'Trabajos en madera']
    };
    return servicesData[specialty] || [];
  };

  const generateDescription = (specialty) => {
    const descriptions = {
      'Plomero': 'Especialista en plomería residencial y comercial',
      'Electricista': 'Técnico electricista certificado con experiencia en instalaciones',
      'Pintor': 'Pintor profesional con atención al detalle',
      'Carpintero': 'Carpintero especializado en muebles y reparaciones'
    };
    return descriptions[specialty] || 'Profesional calificado en servicios técnicos';
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Completar wizard
      onComplete(formData);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.type) {
      case 'info':
        return (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎯</div>
            <p className="text-gray-600">{step.description}</p>
          </div>
        );

      case 'selection':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {step.options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleInputChange(step.field, option)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    formData[step.field] === option
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );

      case 'input':
        return (
          <div className="space-y-4">
            <input
              type={step.inputType}
              placeholder={step.placeholder}
              value={formData[step.field]}
              onChange={(e) => handleInputChange(step.field, e.target.value)}
              min={step.min}
              max={step.max}
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-4">
            {suggestions.marketData && (
              <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                <h4 className="font-semibold text-blue-800">📊 Análisis de Mercado</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600">Precio Competitivo:</span>
                    <span className="font-semibold ml-2">${suggestions.marketData.finalSuggestions?.competitive}/hora</span>
                  </div>
                  <div>
                    <span className="text-blue-600">Precio de Mercado:</span>
                    <span className="font-semibold ml-2">${suggestions.marketData.finalSuggestions?.market}/hora</span>
                  </div>
                  <div>
                    <span className="text-blue-600">Precio Premium:</span>
                    <span className="font-semibold ml-2">${suggestions.marketData.finalSuggestions?.premium}/hora</span>
                  </div>
                  <div>
                    <span className="text-blue-600">Recomendado:</span>
                    <span className="font-bold text-blue-700 ml-2">${suggestions.marketData.finalSuggestions?.recommended}/hora</span>
                  </div>
                </div>
                <div className="text-xs text-blue-600 mt-2">
                  💡 {suggestions.marketData.reasoning}
                </div>
              </div>
            )}
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-700">
                💡 Precio sugerido para {formData.specialty?.toLowerCase()}: ${suggestions.avgPrice}/hora
              </p>
            </div>
            <input
              type="number"
              placeholder={`Ej: ${suggestions.avgPrice}`}
              value={formData[step.field]}
              onChange={(e) => handleInputChange(step.field, e.target.value)}
              min="500"
              step="100"
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        );

      case 'multiselect':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-700">
                💡 Servicios sugeridos para {formData.specialty?.toLowerCase()}:
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {suggestions.services?.map((service) => (
                <label key={service} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.services.includes(service)}
                    onChange={(e) => {
                      const updatedServices = e.target.checked
                        ? [...formData.services, service]
                        : formData.services.filter(s => s !== service);
                      handleInputChange('services', updatedServices);
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700">{service}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'availability':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-700">
                💡 Configura al menos 3 días a la semana para maximizar oportunidades
              </p>
            </div>
            <div className="text-center py-8">
              <p className="text-gray-500">Configuración de disponibilidad disponible en tu perfil</p>
              <button
                onClick={() => handleInputChange('availability', ['configured'])}
                className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Configurar más tarde
              </button>
            </div>
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-700">
                💡 Sugerencia: {suggestions.description}
              </p>
            </div>
            <textarea
              placeholder={step.placeholder}
              value={formData[step.field]}
              onChange={(e) => handleInputChange(step.field, e.target.value)}
              rows={4}
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-gray-600 mb-6">{step.description}</p>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Tu perfil incluye:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>✅ Especialidad: {formData.specialty}</li>
                <li>✅ Experiencia: {formData.yearsExperience} años</li>
                <li>✅ Zona: {formData.coverageArea}</li>
                <li>✅ Tarifa: ${formData.hourlyRate}/hora</li>
                <li>✅ Servicios: {formData.services.length} configurados</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Progress Bar */}
      <div className="bg-gray-200 h-2">
        <div
          className="bg-blue-600 h-2 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">
            Paso {currentStep + 1} de {steps.length}
          </span>
          <button
            onClick={() => navigate('/dashboard-profesional')}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Omitir
          </button>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{currentStepData.title}</h2>
        <p className="text-gray-600 mt-1">{currentStepData.description}</p>
      </div>

      {/* Content */}
      <div className="p-6">
        {renderStepContent()}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Anterior
        </button>
        <button
          onClick={handleNext}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {currentStep === steps.length - 1 ? '¡Completar!' : 'Siguiente'}
        </button>
      </div>
    </div>
  );
};

export default VirtualAssistantWizard;
