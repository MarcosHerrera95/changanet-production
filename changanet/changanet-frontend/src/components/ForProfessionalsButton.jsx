/**
 * @component ForProfessionalsButton - Botón de entrada para profesionales
 * @descripción Punto de entrada exclusivo para profesionales con lógica condicional
 * @sprint Sprint 1 – Autenticación y Perfiles
 * @tarjeta Tarjeta 1: [Frontend] Implementar Botón "Para Profesionales"
 * @impacto Social: Facilita el acceso de profesionales al sistema de triple impacto
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ForProfessionalsButton = ({ className = "" }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClick = () => {
    if (!user) {
      // Usuario no autenticado → registro profesional
      navigate('/registro-profesional');
    } else if (user.role === 'profesional') {
      // Usuario profesional → dashboard profesional
      navigate('/dashboard-profesional');
    } else if (user.role === 'cliente') {
      // Usuario cliente → mostrar mensaje de conversión
      const confirmConversion = window.confirm(
        '¿Quieres ofrecer servicios? Convierte tu cuenta en perfil profesional.'
      );
      if (confirmConversion) {
        // En MVP, redirigir a soporte o mostrar placeholder
        alert('Funcionalidad de conversión próximamente. Contacta a soporte@changanet.com');
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`bg-[#E30613] hover:bg-[#C9050F] text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${className}`}
      aria-label="Acceso para profesionales"
    >
      Para Profesionales
    </button>
  );
};

export default ForProfessionalsButton;
