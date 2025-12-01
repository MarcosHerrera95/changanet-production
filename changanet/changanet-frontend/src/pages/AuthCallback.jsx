// src/pages/AuthCallback.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Obtener parámetros de la URL (desde el callback de Google)
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const userData = urlParams.get('user');
        const error = urlParams.get('error');

        console.log('AuthCallback: Processing callback with params:', { token: !!token, userData: !!userData, error });

        if (error) {
          console.error('AuthCallback: Authentication error:', error);
          navigate('/?error=' + error);
          return;
        }

        if (token && userData) {
          try {
            // Parsear datos del usuario
            const user = JSON.parse(decodeURIComponent(userData));
            console.log('AuthCallback: Parsed user data:', user);

            // Autenticar al usuario en el contexto
            login(user, token);

            // Redirigir a /dashboard según requisitos
            console.log('AuthCallback: User role:', user.rol, 'redirecting to /dashboard');
            navigate('/dashboard');
          } catch (parseError) {
            console.error('AuthCallback: Error parsing user data:', parseError);
            navigate('/?error=parse_error');
          }
        } else {
          console.warn('AuthCallback: Missing token or user data, redirecting to home');
          navigate('/');
        }
      } catch (error) {
        console.error('AuthCallback: Unexpected error:', error);
        navigate('/?error=unexpected_error');
      }
    };

    handleAuthCallback();
  }, [navigate, login]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-turquoise-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Procesando autenticación...</h2>
        <p className="text-gray-600">Por favor espera mientras completamos tu inicio de sesión.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
