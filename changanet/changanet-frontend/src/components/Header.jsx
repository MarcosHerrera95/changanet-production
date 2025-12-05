import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginModal from './modals/LoginModal';
import SignupModal from './modals/SignupModal';
import { useModal } from '../context/ModalContext';
import NotificationBell from './NotificationBell';
import ProfilePicture from './ProfilePicture';
import useSmartNavigation from '../hooks/useSmartNavigation';
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

const Header = () => {
  const smartNavigate = useSmartNavigation();
  const { user, logout } = useAuth();
  const { showSignup, setShowSignup, showLogin, setShowLogin } = useModal();
  // Eliminados hooks de menú y accesibilidad
  const navigate = useNavigate();

  // Hook de accesibilidad
  // Eliminado hook de accesibilidad

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <header className="bg-white/80 backdrop-blur-md border-b border-emerald-200/50 shadow-lg sticky top-0 z-40 w-full">
        <div className="w-full max-w-full px-4 py-4 flex flex-wrap justify-between items-center overflow-x-auto">
            <button
              onClick={() => smartNavigate('/')}
              className="flex items-center gap-2 group"
              aria-label="Ir a Inicio"
              type="button"
            >
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-7 h-7" fill="none" stroke="white" viewBox="0 0 32 32">
                  <path d="M12 16L14 18L16 16L18 18L20 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 14L12 16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M22 14L20 16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M16 12L16 16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-2xl font-extrabold text-gradient">Changánet</span>
            </button>


          <div className="flex flex-row items-center gap-4 justify-end w-full">

            {user ? (
              <>
                <NotificationBell />
                
                {/* Foto de perfil y saludo del usuario */}
                <div className="flex items-center space-x-3">
                  <ProfilePicture 
                    user={user}
                    size="w-10 h-10"
                    className="border-2 border-emerald-200 shadow-sm"
                  />
                  <span className="text-gray-700 hidden lg:inline font-medium bg-emerald-50 px-3 py-1 rounded-full">
                    ¡Hola, {user.nombre || 'Usuario'}!
                  </span>
                </div>
                
                <button onClick={() => smartNavigate('/mi-cuenta')} type="button" data-tutorial="mi-cuenta" className="bg-white text-black font-medium transition-all duration-300 px-4 py-2 rounded-lg hover:bg-gray-50 hover:shadow-md hover:scale-[1.02] flex items-center space-x-2 min-h-[44px] touch-manipulation">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Mi Cuenta</span>
                </button>
                <button onClick={handleLogout} type="button" className="bg-red-500 text-white px-3 py-2 rounded-full hover:bg-red-700 shadow transition-all duration-200 font-semibold flex items-center gap-2 min-h-[40px]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2h-3a2 2 0 01-2-2V7a2 2 0 012-2h3a2 2 0 012 2v1" />
                  </svg>
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setShowLogin(true)} type="button" className="bg-white text-black font-bold transition-all duration-300 px-6 py-3 rounded-lg hover:bg-gray-50 hover:shadow-md hover:scale-[1.02] flex items-center space-x-2 min-h-[44px] touch-manipulation">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Iniciar Sesión</span>
                </button>
                <button
                  onClick={() => setShowSignup(true)}
                  type="button"
                  className="bg-emerald-500 text-white font-bold px-6 py-3 rounded-lg hover:bg-emerald-600 hover:shadow-md hover:scale-[1.02] hover:brightness-105 transition-all duration-300 flex items-center space-x-2 min-h-[44px] touch-manipulation">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Publicar Servicio</span>
                </button>
              </>
            )}

            {/* Botones eliminados: hamburguesa y accesibilidad */}
          </div>
        </div>

        {/* Menú móvil eliminado */}
      </header>

      {/* Modales */}
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSwitchToSignup={() => {
          setShowLogin(false);
          setShowSignup(true);
        }}
      />
      <SignupModal
        isOpen={showSignup}
        onClose={() => setShowSignup(false)}
        onSwitchToLogin={() => {
          setShowSignup(false);
          setShowLogin(true);
        }}
      />
    </>
  );
};

export default Header;
