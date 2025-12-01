// src/components/modals/LoginModal.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import GoogleLoginButton from '../GoogleLoginButton';
import { resetPassword } from '../../services/authService';

const LoginModal = ({ isOpen, onClose, onSwitchToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginWithEmail } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // INTEGRACIÓN CON BACKEND: Usar autenticación del backend
      const result = await loginWithEmail(email, password);

      if (result.success) {
        // El login ya se maneja en el AuthContext
        onClose();
        // Redirigir al dashboard correspondiente según el rol
        const dashboardPath = result.user.rol === 'admin' ? '/admin/dashboard' : '/mi-cuenta';
        navigate(dashboardPath);
      } else {
        setError(result.error || 'Email o contraseña incorrectos. Verifica tus credenciales.');

        // Si el error sugiere registro, mostrar opción adicional
        if (result.shouldRedirectToRegister) {
          setTimeout(() => {
            setError(prev => prev + ' ¿No tienes cuenta? Regístrate gratis.');
          }, 2000);
        }
      }
    } catch (err) {
      setError('Error al iniciar sesión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-emerald-500 to-turquoise-600 p-6 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative">
            <h2 className="text-3xl font-bold mb-2">¡Bienvenido de vuelta!</h2>
            <p className="text-emerald-100">Inicia sesión para continuar</p>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-emerald-500 hover:text-emerald-700 transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl mb-6 flex items-center">
              <span className="text-red-500 mr-3">⚠️</span>
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Correo electrónico</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  📧
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-700 placeholder-gray-400"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Contraseña</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  🔒
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-700 placeholder-gray-400"
                  placeholder="Tu contraseña"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="ml-2 text-sm text-gray-600">Recordarme</span>
              </label>
              <button
                type="button"
                onClick={async () => {
                  if (email) {
                    const result = await resetPassword(email);
                    if (result.success) {
                      setError('Se ha enviado un enlace de recuperación a tu correo');
                    } else {
                      setError(result.error);
                    }
                  } else {
                    setError('Ingresa tu correo electrónico primero');
                  }
                }}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors duration-200"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-4 rounded-2xl hover:bg-gray-50 hover:shadow-md hover:scale-[1.02] transition-all duration-200 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <span className="mr-2">🚀</span>
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          <div className="mt-6">
            <GoogleLoginButton text="Iniciar sesión con Google" />
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              ¿Aún no tienes cuenta?
            </p>
            <button
              onClick={onSwitchToSignup}
              className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors duration-200 underline underline-offset-2"
            >
              Regístrate gratis
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginModal;
