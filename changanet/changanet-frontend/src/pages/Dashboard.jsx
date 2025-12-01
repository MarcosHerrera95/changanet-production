import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ClientDashboard from '../components/dashboard/ClientDashboard';
import ProfessionalDashboard from '../components/dashboard/ProfessionalDashboard';
import Quotes from './Quotes';
import VerifyIdentity from './VerifyIdentity';
import Profile from './Profile';
import Availability from './Availability';
import ClientSettings from './ClientSettings';

const Dashboard = () => {
  console.log('Dashboard component rendering, pathname:', window.location.pathname);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    } else if (!loading && user && user.rol === 'admin') {
      navigate('/admin/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Cargando...</div>;
  }

  if (!user) {
    return null;
  }

  const currentPath = window.location.pathname;

  switch (currentPath) {
    // /mis-cotizaciones ya no es una ruta separada - ahora se maneja como modal en ClientDashboard
    case '/mis-presupuestos':
      return <Quotes />;
    case '/mi-perfil':
      return user.rol === 'cliente' ? <ClientSettings /> : <Profile />;
    case '/disponibilidad':
      return <Availability />;
    case '/configuracion':
      return <ClientSettings />;
    case '/mi-cuenta/verificar-identidad':
      return <VerifyIdentity />;
    default:
      return (
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Mi Cuenta</h1>

          {user.rol === 'cliente' ? (
            <ClientDashboard user={user} />
          ) : (
            <ProfessionalDashboard user={user} />
          )}
        </div>
      );
  }
};

export default Dashboard;
