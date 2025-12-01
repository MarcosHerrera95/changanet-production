/**
 * Componente de ayuda contextual para Changánet
 * Proporciona ayuda inmediata y accesible en toda la plataforma
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHelpContent } from '../data/helpContent';

const ContextualHelp = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const location = useLocation();
  const { user } = useAuth();

  // Obtener contenido de ayuda basado en la ruta actual
  const helpData = getHelpContent(location.pathname, user?.rol || user?.role);

  // Cerrar panel al cambiar de ruta
  useEffect(() => {
    setIsOpen(false);
    setExpandedQuestion(null);
  }, [location.pathname]);

  // Cerrar panel con tecla Escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setExpandedQuestion(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Prevenir scroll del body cuando el panel está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const toggleQuestion = (index) => {
    setExpandedQuestion(expandedQuestion === index ? null : index);
  };

  const handleClose = () => {
    setIsOpen(false);
    setExpandedQuestion(null);
  };

  return (
    <>
      {/* Botón flotante de ayuda */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-11 h-11 bg-[#E30613] hover:bg-[#C9050F] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-red-300"
        aria-label="Ayuda contextual - Abrir panel de ayuda"
        role="button"
        tabIndex={0}
      >
        <span className="text-xl font-bold" aria-hidden="true">?</span>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-200"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Panel lateral/modal */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        aria-describedby="help-description"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-[#E30613] text-white">
          <div>
            <h2 id="help-title" className="text-xl font-bold">
              💡 Ayuda
            </h2>
            <p id="help-description" className="text-sm opacity-90">
              {helpData.title}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:bg-opacity-20 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
            aria-label="Cerrar panel de ayuda"
          >
            <span className="text-xl font-bold" aria-hidden="true">×</span>
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {helpData.questions.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleQuestion(index)}
                  className="w-full text-left p-4 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 focus:ring-2 focus:ring-[#E30613] focus:ring-opacity-50 transition-colors"
                  aria-expanded={expandedQuestion === index}
                  aria-controls={`answer-${index}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 pr-4">
                      {item.question}
                    </span>
                    <span
                      className={`text-[#E30613] font-bold transition-transform duration-200 ${
                        expandedQuestion === index ? 'rotate-45' : ''
                      }`}
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </div>
                </button>

                {expandedQuestion === index && (
                  <div
                    id={`answer-${index}`}
                    className="px-4 pb-4 text-gray-700 leading-relaxed animate-fade-in"
                  >
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Información adicional */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              ¿Necesitas más ayuda?
            </h3>
            <p className="text-sm text-blue-800 mb-3">
              Nuestro equipo está aquí para ayudarte. No dudes en contactarnos.
            </p>
            <button
              onClick={() => {
                handleClose();
                // Aquí podrías navegar a la página de contacto
                window.location.href = '/contacto';
              }}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Contactar Soporte
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <p className="text-xs text-gray-600 text-center">
            Presiona <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Esc</kbd> para cerrar
          </p>
        </div>
      </div>
    </>
  );
};

export default ContextualHelp;
