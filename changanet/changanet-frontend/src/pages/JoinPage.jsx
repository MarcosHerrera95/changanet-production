import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const JoinPage = () => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    console.log('Role selected:', role);
    setSelectedRole(role);
    setError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!selectedRole) {
      setError('Por favor, selecciona si eres cliente o profesional.');
      setLoading(false);
      return;
    }

    if (!formData.name || !formData.email || !formData.password) {
      setError('Por favor, completa todos los campos requeridos.');
      setLoading(false);
      return;
    }

    try {
      console.log('Submitting registration with role:', selectedRole);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          rol: selectedRole // Enviando explícitamente 'cliente' o 'profesional'
        })
      });
      const data = await response.json();
      console.log('Registration response:', response.status, data);

      if (response.ok) {
        // Login automático después del registro exitoso
        if (data.token && data.user) {
          console.log('Logging in user:', data.user);
          login(data.user, data.token);
        }
        console.log('Selected role:', selectedRole);
        console.log('Navigation path:', selectedRole === 'cliente' ? '/mi-cuenta' : '/dashboard-profesional');

        // Force navigation with a small delay to ensure state is updated
        setTimeout(() => {
          if (selectedRole === 'cliente') {
            console.log('Navigating to /dashboard-cliente');
            navigate('/dashboard-cliente', { replace: true });
          } else {
            console.log('Navigating to /dashboard-profesional');
            navigate('/dashboard-profesional', { replace: true });
          }
        }, 100);
      } else {
        console.error('Registration failed:', data.error);
        setError(data.error || 'Error al crear la cuenta');
      }
    } catch (error) {
      console.error('Network error:', error);
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center px-4 py-12">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          ¿Qué necesitas hoy?
        </h1>
        <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed">
          Encuentra profesionales confiables o ofrece tus servicios. Simple, seguro y con impacto positivo.
        </p>

        {!selectedRole ? (
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Cliente Section */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 cursor-pointer" onClick={() => handleRoleSelect('cliente')} key="cliente">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Soy Cliente</h2>
              <p className="text-white/90 mb-6 text-lg">Necesito contratar un servicio</p>
              <button
                className="inline-block bg-white text-emerald-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-emerald-50 hover:shadow-xl hover:scale-105 transition-all duration-300 w-full text-center min-h-[44px] touch-manipulation"
                aria-label="Registrarme como cliente"
                onClick={() => handleRoleSelect('cliente')}
              >
                Registrarme como Cliente
              </button>
            </div>

            {/* Profesional Section */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 cursor-pointer" onClick={() => handleRoleSelect('profesional')} key="profesional">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Soy Profesional</h2>
              <p className="text-white/90 mb-6 text-lg">Quiero ofrecer mis servicios</p>
              <button
                className="inline-block border-2 border-white text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white hover:text-emerald-600 hover:shadow-xl hover:scale-105 transition-all duration-300 w-full text-center min-h-[44px] touch-manipulation"
                aria-label="Registrarme como profesional"
                onClick={() => handleRoleSelect('profesional')}
              >
                Convertirse en Profesional
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">{selectedRole === 'cliente' ? '👤' : '🔧'}</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                Registrarse como {selectedRole === 'cliente' ? 'Cliente' : 'Profesional'}
              </h2>
              <p className="mt-2 text-gray-600">
                Completa tus datos para crear tu cuenta
              </p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center">
                <span className="text-red-500 mr-3">⚠️</span>
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
                  Nombre Completo *
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                    👤
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-700 placeholder-gray-400"
                    placeholder="Tu nombre completo"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
                  Correo electrónico *
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                    📧
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-700 placeholder-gray-400"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
                  Contraseña *
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                    🔒
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-700 placeholder-gray-400"
                    placeholder="Mínimo 6 caracteres"
                    minLength="6"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-2xl hover:bg-gray-300 transition-all duration-300 font-semibold"
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-2xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center min-h-[44px] touch-manipulation"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creando cuenta...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">🎉</span>
                      Crear Cuenta
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Additional Info */}
        <div className="mt-12 text-white/80 text-lg">
          <p>¿No sabes por dónde empezar? <a href="/profesionales" className="underline hover:text-white">Explora profesionales cerca tuyo</a></p>
        </div>
      </div>
    </div>
  );
};

export default JoinPage;
