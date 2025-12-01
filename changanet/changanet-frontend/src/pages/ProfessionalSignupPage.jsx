/**
 * @page ProfessionalSignupPage - Página de registro para profesionales
 * @descripción Formulario completo para registro de profesionales con asistente virtual (REQ-06 a REQ-10)
 * @sprint Sprint 1 – Autenticación y Perfiles
 * @tarjeta Tarjeta 2: [Frontend] Implementar Registro Profesional
 * @optimización Asistente virtual para mejorar onboarding
 * @impacto Social: Simplifica el acceso de profesionales al sistema
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import VirtualAssistantWizard from '../components/VirtualAssistantWizard';

const ProfessionalSignupPage = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [basicInfo, setBasicInfo] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signup, user } = useAuth();
  const navigate = useNavigate();

  // Verificar si el usuario ya está autenticado
  useEffect(() => {
    if (user) {
      // Usuario ya autenticado, redirigir al dashboard correspondiente
      if (user.rol === 'cliente' || user.role === 'cliente') {
        navigate('/cliente/dashboard');
      } else if (user.rol === 'profesional' || user.role === 'profesional') {
        navigate('/profesional/dashboard');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  const handleBasicInfoChange = (e) => {
    const { name, value } = e.target;
    setBasicInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStartWizard = (e) => {
    e.preventDefault();
    if (!basicInfo.name || !basicInfo.email || !basicInfo.password) {
      setError('Completa todos los campos básicos');
      return;
    }
    setShowWizard(true);
    setError('');
  };

  const handleWizardComplete = async (wizardData) => {
    setLoading(true);
    setError('');

    try {
      // Combinar datos básicos con datos del wizard
      const professionalData = {
        nombre: basicInfo.name,
        email: basicInfo.email,
        password: basicInfo.password,
        especialidad: wizardData.specialty,
        anos_experiencia: wizardData.yearsExperience ? parseInt(wizardData.yearsExperience) : null,
        zona_cobertura: wizardData.coverageArea,
        tarifa_hora: wizardData.hourlyRate ? parseFloat(wizardData.hourlyRate) : 0,
        descripcion: wizardData.description || `Profesional en ${wizardData.specialty} con ${wizardData.yearsExperience || 0} años de experiencia. Zona: ${wizardData.coverageArea}.`
      };

      const response = await fetch('/api/auth/register-professional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(professionalData)
      });
      const data = await response.json();

      if (response.ok) {
        // Login automático después del registro exitoso
        if (data.token && data.user) {
          const { login } = useAuth();
          login(data.user, data.token);
        }
        navigate('/dashboard-profesional');
      } else {
        setError(data.error || 'Error al registrar profesional');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (showWizard) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <VirtualAssistantWizard
          onComplete={handleWizardComplete}
          initialData={{
            name: basicInfo.name,
            email: basicInfo.email
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Únete como Profesional</h2>
          <p className="mt-2 text-gray-600">
            Crea tu perfil profesional con nuestra guía inteligente
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleStartWizard} className="space-y-6">
          {/* Datos básicos */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Datos Básicos</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nombre completo *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={basicInfo.name}
                  onChange={handleBasicInfoChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={basicInfo.email}
                  onChange={handleBasicInfoChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Contraseña *
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={basicInfo.password}
                  onChange={handleBasicInfoChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🤖</div>
              <div>
                <h4 className="font-semibold text-blue-800">Asistente Virtual</h4>
                <p className="text-sm text-blue-700">
                  Te guiaremos paso a paso para configurar tu perfil profesional de manera óptima
                </p>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#E30613] hover:bg-[#C9050F] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : 'Comenzar Configuración Asistida'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-medium text-[#E30613] hover:text-[#C9050F]"
            >
              Inicia sesión
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalSignupPage;
