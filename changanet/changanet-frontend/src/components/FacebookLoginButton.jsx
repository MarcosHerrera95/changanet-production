import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const FacebookLoginButton = ({ text = "Facebook", className = "" }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { loginWithFacebook } = useAuth();

  const handleFacebookLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await loginWithFacebook();

      if (!result.success) {
        setError(result.error || 'Error al iniciar sesión con Facebook');
      }
      // If successful, the redirect will happen
    } catch (err) {
      console.error('Error en login con Facebook:', err);
      setError('Ocurrió un error durante el inicio de sesión con Facebook.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleFacebookLogin}
        disabled={isLoading}
        className={`w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
        ) : (
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        )}
        {isLoading ? 'Conectando...' : text}
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default FacebookLoginButton;
