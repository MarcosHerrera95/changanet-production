import { useLocation, useNavigate } from 'react-router-dom';

const useSmartNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const smartNavigate = (to, options = {}) => {
    if (location.pathname === to) {
      // Ya estás en la misma ruta → solo scroll
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Navegación + scroll
      navigate(to, options);
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100); // Pequeño delay para que el scroll ocurra después del render
    }
  };

  return smartNavigate;
};

export default useSmartNavigation;
