import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import useSmartNavigation from '../../hooks/useSmartNavigation';

const BackToAccountButton = () => {
  const smartNavigate = useSmartNavigation();

  return (
    <button
      onClick={() => smartNavigate('/mi-cuenta')}
      className="inline-flex items-center gap-3 bg-white border-2 border-[#2ECC71] text-[#2ECC71] px-4 py-3 rounded-lg hover:bg-[#2ECC71] hover:text-white transition-all duration-200 font-medium shadow-sm hover:shadow-md min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:ring-offset-2"
      aria-label="Volver a la página anterior"
      role="button"
    >
      <ArrowLeftIcon className="w-5 h-5" />
      Atrás
    </button>
  );
};

export default BackToAccountButton;
