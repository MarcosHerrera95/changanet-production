import { useNavigate } from 'react-router-dom';

/**
 * Botón "Editar Perfil" reutilizable para la plataforma Changánet
 * Cumple con WCAG 2.1 AA y diseño responsive
 */
export default function EditProfileButton({
  userType = 'cliente',
  className = '',
  text = "Editar Perfil",
  showIcon = true
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (userType === 'cliente') {
      navigate('/mi-perfil-cliente');
    } else if (userType === 'profesional') {
      navigate('/mi-perfil-profesional');
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
      className={`
        flex items-center justify-center gap-2
        bg-[#E30613] text-white
        px-6 py-3
        rounded-lg
        hover:bg-red-700
        focus:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
        active:bg-red-800
        transition-colors duration-200
        min-h-[44px] min-w-[44px]
        font-medium text-sm
        ${className}
      `}
      aria-label="Editar perfil de usuario"
      role="button"
      tabIndex={0}
    >
      {showIcon && (
        <span className="text-lg leading-none" aria-hidden="true">
          👤
        </span>
      )}
      <span>{text}</span>
    </button>
  );
}
