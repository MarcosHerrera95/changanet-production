import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

/**
 * Botón "Atrás" reutilizable para toda la plataforma Changánet
 * Cumple con WCAG 2.1 AA y respeta el patrón de diseño existente
 */
export default function BackButton({
  onClick,
  text = "Atrás",
  className = ""
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(-1);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`inline-flex items-center gap-3 bg-white border-2 border-[#2ECC71] text-[#2ECC71] px-4 py-3 rounded-lg hover:bg-[#2ECC71] hover:text-white transition-all duration-200 font-medium shadow-sm hover:shadow-md min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:ring-offset-2 ${className}`}
      aria-label="Volver a la página anterior"
      role="button"
      tabIndex={0}
    >
      <ArrowLeftIcon className="w-5 h-5" />
      {text}
    </button>
  );
}
