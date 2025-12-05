import React from 'react';
import { setUserContext } from '../config/sentryConfig';
import { AuthContext } from './AuthContextConstants';

// Disable hot reload for this file to prevent React hooks issues during hot reload
if (import.meta.hot) {
  import.meta.hot.decline();
}

export class AuthProvider extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null,
      loading: true
    };
  }

  componentDidMount() {
    // Recupera datos de usuario del localStorage al inicializar
    const token = localStorage.getItem('changanet_token');
    if (token) {
      try {
        const userData = JSON.parse(localStorage.getItem('changanet_user'));
        console.log('AuthContext - Loaded user from localStorage:', userData);
        console.log('AuthContext - User name:', userData?.nombre || 'NO NAME');
        console.log('AuthContext - User role:', userData?.rol || userData?.role || 'NO ROLE');

        // Validar que el usuario existe en el backend
        this.validateUserToken(userData, token);
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
        // Limpiar datos corruptos
        localStorage.removeItem('changanet_token');
        localStorage.removeItem('changanet_user');
        this.setState({ loading: false });
      }
    } else {
      console.log('AuthContext - No token found in localStorage');
      this.setState({ loading: false });
    }
  }

  // Función para validar que el token y usuario son válidos
  validateUserToken = async (userData, token) => {
    try {
      const apiBaseUrl = import.meta.env.PROD ?
        'https://changanet-production-backend.onrender.com' :
        (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003');
      const response = await fetch(`${apiBaseUrl}/api/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Usuario válido, establecer en estado
        this.setState({ user: userData, loading: false });
      } else if (response.status === 401 || response.status === 403) {
        // Token inválido o usuario no encontrado, limpiar storage
        console.warn('AuthContext - Token inválido o usuario no encontrado, limpiando localStorage');
        localStorage.removeItem('changanet_token');
        localStorage.removeItem('changanet_user');
        this.setState({ user: null, loading: false });
      } else {
        // Otro error, mantener usuario por ahora
        console.warn('AuthContext - Error validando token, manteniendo usuario:', response.status);
        this.setState({ user: userData, loading: false });
      }
    } catch (error) {
      console.error('AuthContext - Error validando token:', error);
      // En caso de error de red, mantener usuario
      this.setState({ user: userData, loading: false });
    }
  };

  // Función para obtener datos actualizados del usuario desde el backend
  fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('changanet_token');
      if (!token) return;

      const apiBaseUrl = import.meta.env.PROD ?
        'https://changanet-production-backend.onrender.com' :
        (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003');
      console.log("🟡 fetchCurrentUser: Making request to /api/auth/me");
      const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🟡 AuthContext - Fetched current user:', data.user);
        console.log('🟡 fetchCurrentUser - url_foto_perfil from server:', data.user?.url_foto_perfil);
        this.setState({ user: data.user });
        localStorage.setItem('changanet_user', JSON.stringify(data.user));
        console.log('🟡 Updated localStorage with user data including photo');
      } else {
        console.log('🟡 fetchCurrentUser failed with status:', response.status);
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  };

  login = (userData, token) => {
    console.log('Login called with userData:', userData);
    console.log('User role:', userData.rol || userData.role);
    console.log('User name:', userData.nombre || userData.name);

    // Asegurar que el nombre esté disponible
    const userWithName = {
      ...userData,
      nombre: userData.nombre || userData.name || 'Usuario'
    };

    localStorage.setItem('changanet_token', token);
    localStorage.setItem('changanet_user', JSON.stringify(userWithName));
    this.setState({ user: userWithName });

    // CONFIGURAR CONTEXTO DE USUARIO EN SENTRY (solo si está disponible)
    setUserContext(userWithName);
  };

  // Método para manejar login con Google (puede ser usado por el GoogleLoginButton)
  loginWithGoogle = async (userData, token) => {
    console.log("🟡 loginWithGoogle called with:", userData);
    console.log("🟡 userData.url_foto_perfil:", userData.url_foto_perfil);
    
    // El login con Google funciona igual que el login regular
    this.login(userData, token);

    console.log("🟡 After this.login, fetching current user data...");
    // Después del login, obtener datos actualizados del usuario
    this.fetchCurrentUser();
  };

  loginWithEmail = async (email, password) => {
    try {
      const apiBaseUrl = import.meta.env.PROD ?
        'https://changanet-production-backend.onrender.com' :
        (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003');
      console.log('AuthContext - loginWithEmail: Starting fetch to:', `${apiBaseUrl}/api/auth/login`);
      console.log('AuthContext - loginWithEmail: Request body:', { email, password });

      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        cache: 'no-cache',
        credentials: 'include' // Incluir cookies en la respuesta
      });

      console.log('AuthContext - loginWithEmail: Response status:', response.status);
      console.log('AuthContext - loginWithEmail: Response ok:', response.ok);

      if (!response.ok) {
        let errorMessage = 'Error al iniciar sesión';
        try {
          const errorData = await response.json();
          console.log('AuthContext - loginWithEmail: Error response data:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.warn('AuthContext - loginWithEmail: No se pudo parsear respuesta de error:', parseError);
        }
        return { success: false, error: errorMessage };
      }

      const data = await response.json();
      console.log('AuthContext - loginWithEmail: Success response data:', data);

      // El token viene en la respuesta (almacenado en cookies httpOnly en el backend)
      if (data.token && data.user) {
        this.login(data.user, data.token);
      }

      return { success: true, user: data.user, token: data.token, message: data.message };
    } catch (error) {
      console.error('AuthContext - loginWithEmail: Fetch error:', error);
      console.error('AuthContext - loginWithEmail: Error type:', error.constructor.name);
      console.error('AuthContext - loginWithEmail: Error message:', error.message);

      // Distinguish between network errors and other errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('AuthContext - loginWithEmail: Network error - check if backend server is running');
        return { success: false, error: 'Error de conexión. Verifica que el servidor esté funcionando.' };
      } else {
        console.error('AuthContext - loginWithEmail: Unexpected error');
        return { success: false, error: 'Error inesperado. Inténtalo de nuevo.' };
      }
    }
  };

  signup = async (name, email, password, role) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003';
      const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, rol: role }),
        credentials: 'include' // Incluir cookies en la respuesta
      });

      // Verificar que la respuesta sea válida antes de parsear JSON
      if (!response.ok) {
        let errorMessage = 'Error al registrar usuario';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // Si no se puede parsear el JSON, usar mensaje genérico
          console.warn('No se pudo parsear respuesta de error:', parseError);
        }
        return { success: false, error: errorMessage };
      }

      // Solo parsear JSON si la respuesta es exitosa
      const data = await response.json();

      // Si el registro es exitoso, hacer login automático
      if (data.token && data.user) {
        this.login(data.user, data.token);

        // Registrar métrica de registro en frontend (solo si Sentry está disponible)
        try {
          // Verificar si Sentry está disponible antes de intentar usarlo
          if (typeof window !== 'undefined' && window.Sentry && window.Sentry.captureMessage) {
            window.Sentry.captureMessage('Usuario registrado desde frontend', 'info', {
              tags: {
                event: 'user_registration_frontend',
                user_role: data.user.rol,
                source: 'frontend_signup',
                business_metric: 'user_acquisition'
              },
              extra: {
                user_id: data.user.id,
                email: data.user.email,
                role: data.user.rol,
                timestamp: new Date().toISOString(),
                business_impact: 'social_economic_environmental'
              }
            });
          }
        } catch (error) {
          // Sentry no está disponible, continuar sin problemas
        }
      }
      return { success: true, message: data.message || 'Usuario creado exitosamente.' };
    } catch (error) {
      console.error('Error en signup:', error);
      return { success: false, error: 'No pudimos crear tu cuenta. Inténtalo de nuevo.' };
    }
  };

  logout = () => {
    localStorage.removeItem('changanet_token');
    localStorage.removeItem('changanet_user');
    this.setState({ user: null });
  };

  render() {
    const { user, loading } = this.state;
    return (
      <AuthContext.Provider value={{ user, login: this.login, logout: this.logout, signup: this.signup, loginWithEmail: this.loginWithEmail, loginWithGoogle: this.loginWithGoogle, fetchCurrentUser: this.fetchCurrentUser, loading }}>
        {this.props.children}
      </AuthContext.Provider>
    );
  }
}
