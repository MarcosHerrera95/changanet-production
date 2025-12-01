/**
 * @page ClientSignupPage - Página de registro para clientes
 * @descripción Formulario simplificado para registro de clientes (REQ-01)
 * @sprint Sprint 1 – Autenticación y Perfiles
 * @tarjeta Tarjeta 1: [Frontend] Implementar Registro Cliente
 * @impacto Social: Facilita el acceso de clientes al sistema
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleLoginButton from '../components/GoogleLoginButton';

const ClientSignupPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    telefono: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login, user } = useAuth();
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

    if (!formData.name || !formData.email || !formData.password) {
      setError('Por favor, completa todos los campos requeridos');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          rol: "cliente"
        })
      });
      const data = await response.json();

      if (response.ok) {
        // Mostrar mensaje de verificación de email en lugar de login automático
        setSuccess('¡Registro exitoso! Revisa tu email para verificar tu cuenta antes de iniciar sesión.');
        // No hacer login automático, esperar verificación de email
      } else {
        setError(data.error || 'Error al crear la cuenta');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">👤</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Únete como Cliente</h2>
          <p className="mt-2 text-gray-600">
            Encuentra los mejores profesionales para tus necesidades
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center">
            <span className="text-red-500 mr-3">⚠️</span>
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl flex items-center">
            <span className="text-green-500 mr-3">✅</span>
            <span className="text-sm">{success}</span>
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
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 text-gray-700 placeholder-gray-400"
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
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 text-gray-700 placeholder-gray-400"
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="telefono" className="block text-gray-700 font-medium mb-2">
              Teléfono
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                📱
              </div>
              <input
                id="telefono"
                name="telefono"
                type="tel"
                value={formData.telefono}
                onChange={handleInputChange}
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 text-gray-700 placeholder-gray-400"
                placeholder="+54 11 1234-5678"
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
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 text-gray-700 placeholder-gray-400"
                placeholder="Mínimo 6 caracteres"
                minLength="6"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-4 rounded-2xl hover:bg-primary-hover transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center min-h-[44px] touch-manipulation"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creando cuenta...
              </>
            ) : (
              <>
                <span className="mr-2">🎉</span>
                Crear Cuenta de Cliente
              </>
            )}
          </button>
        </form>

        {/* Social Login */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">O regístrate con</span>
            </div>
          </div>

          <div className="mt-6">
            <GoogleLoginButton text="Registrarse con Google" />
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            ¿Ya tienes cuenta?
          </p>
          <button
            onClick={() => navigate('/')}
            className="text-primary font-semibold hover:text-primary-hover transition-colors duration-200 underline underline-offset-2"
          >
            Inicia sesión aquí
          </button>
        </div>

        {/* Benefits */}
        <div className="mt-8 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-800 mb-3 text-center">Beneficios para Clientes</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center">
              <span className="text-success mr-2">✓</span>
              Acceso a miles de profesionales verificados
            </div>
            <div className="flex items-center">
              <span className="text-success mr-2">✓</span>
              Solicitudes de presupuesto gratuitas
            </div>
            <div className="flex items-center">
              <span className="text-success mr-2">✓</span>
              Pagos seguros con custodia
            </div>
            <div className="flex items-center">
              <span className="text-success mr-2">✓</span>
              Sistema de reseñas y calificaciones
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientSignupPage;
