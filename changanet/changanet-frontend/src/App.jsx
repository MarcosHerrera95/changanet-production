import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { ModalProvider } from './context/ModalContext.jsx';
import { ChatProvider } from './context/ChatContext';
import { initGoogleMaps } from './services/mapService';
import Header from './components/Header';
import Footer from './components/Footer';
import OnboardingTutorial from './components/OnboardingTutorial';
import ContextualHelp from './components/ContextualHelp';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load pages for better performance (Code Splitting)
const Home = lazy(() => import('./pages/Home'));
const Professionals = lazy(() => import('./pages/Professionals'));
const ProfessionalDetail = lazy(() => import('./pages/ProfessionalDetail'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Quotes = lazy(() => import('./pages/Quotes'));
const Availability = lazy(() => import('./pages/Availability'));
const ClientProfile = lazy(() => import('./pages/ClientProfile'));
const ClientDashboard = lazy(() => import('./pages/ClientDashboard'));
const ClientServices = lazy(() => import('./pages/ClientServices'));
const ClientQuotes = lazy(() => import('./pages/ClientQuotes'));
const ClientReviews = lazy(() => import('./pages/ClientReviews'));
const ProfessionalProfile = lazy(() => import('./pages/ProfessionalProfile'));
const ProfessionalDashboard = lazy(() => import('./pages/ProfessionalDashboard'));
const ProfessionalServices = lazy(() => import('./pages/ProfessionalServices'));
const ProfessionalQuotes = lazy(() => import('./pages/ProfessionalQuotes'));
const ProfessionalPayments = lazy(() => import('./pages/ProfessionalPayments'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Cookies = lazy(() => import('./pages/Cookies'));
const Custody = lazy(() => import('./pages/Custody'));
const Ranking = lazy(() => import('./pages/Ranking'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const ProfessionalSignupPage = lazy(() => import('./pages/ProfessionalSignupPage'));
const ClientSignupPage = lazy(() => import('./pages/ClientSignupPage'));
const VerifyIdentity = lazy(() => import('./pages/VerifyIdentity'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Chat = lazy(() => import('./pages/Chat'));
const ClientMessages = lazy(() => import('./pages/ClientMessages'));
const ProfessionalMessages = lazy(() => import('./pages/ProfessionalMessages'));
import ProfessionalsSimple from './pages/Professionals-Simple';
import './index.css';

// Inicializar Firebase Messaging si está disponible (solo en producción)
if (import.meta.env.PROD && typeof window !== 'undefined') {
  import('./services/fcmService').then(({ onForegroundMessage }) => {
    onForegroundMessage();
  }).catch(error => {
    console.warn('FCM no disponible:', error.message);
  });
}

// Ejecutar diagnóstico básico en desarrollo
if (import.meta.env.DEV && typeof window !== 'undefined') {
  setTimeout(() => {
    console.log('🔍 Diagnóstico básico: App cargada correctamente');
  }, 1000);
}

// Componente temporal para registro de profesional (reemplazado por ProfessionalSignupPage)

function App() {
  console.log('🎯 App component rendering');

  // Inicializar Google Maps API una sola vez al montar la aplicación
  useEffect(() => {
    initGoogleMaps().then(() => {
      console.log('✅ Google Maps API cargado exitosamente');
    }).catch(error => {
      console.warn('⚠️ Error cargando Google Maps API:', error.message);
    });
  }, []);

  return (
    <ChatProvider>
      <ModalProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main id="main-content" className="flex-grow" role="main">
              <ErrorBoundary>
                <Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Navigate to="/" replace />} />
                    <Route path="/profesionales" element={<Professionals />} />
                    <Route path="/profesionales-simple" element={<ProfessionalsSimple />} />
                    <Route path="/profesional/:id" element={<ProfessionalDetail />} />
                    <Route path="/mi-cuenta" element={<Dashboard />} />
                    <Route path="/disponibilidad" element={<Availability />} />
                    <Route path="/cliente/dashboard" element={<ClientDashboard />} />
                    <Route path="/cliente/perfil" element={<ClientProfile />} />
                    <Route path="/cliente/servicios" element={<ClientServices />} />
                    <Route path="/cliente/cotizaciones" element={<ClientQuotes />} />
                    <Route path="/cliente/resenas" element={<ClientReviews />} />
                    <Route path="/cliente/mensajes" element={<ClientMessages />} />
                    <Route path="/profesional/dashboard" element={<ProfessionalDashboard />} />
                    <Route path="/profesional/servicios" element={<ProfessionalServices />} />
                    <Route path="/profesional/cotizaciones" element={<ProfessionalQuotes />} />
                    <Route path="/profesional/pagos" element={<ProfessionalPayments />} />
                    <Route path="/profesional/mensajes" element={<ProfessionalMessages />} />
                    <Route path="/mi-perfil-cliente" element={<ClientProfile />} />
                    <Route path="/mi-perfil-profesional" element={<ProfessionalProfile />} />
                    <Route path="/perfil" element={<ProfilePage />} />
                    <Route path="/registro-profesional" element={<ProfessionalSignupPage />} />
                    <Route path="/registro-cliente" element={<ClientSignupPage />} />
                    <Route path="/verificar-email" element={<VerifyEmail />} />
                    <Route path="/olvide-contrasena" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/terminos" element={<Terms />} />
                    <Route path="/privacidad" element={<Privacy />} />
                    <Route path="/cookies" element={<Cookies />} />
                    <Route path="/custodia" element={<Custody />} />
                    <Route path="/ranking" element={<Ranking />} />
                    <Route path="/contacto" element={<ContactPage />} />
                    <Route path="/verificar-identidad" element={<VerifyIdentity />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/chat/:conversationId" element={<Chat />} />
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </main>
            <Footer />
          </div>

          {/* Tutorial para primeros usuarios */}
          <OnboardingTutorial />

          {/* Ayuda contextual disponible en toda la app */}
          <ContextualHelp />
        </Router>
      </ModalProvider>
    </ChatProvider>
  );
}

export default App;
