import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const location = useLocation();
  const navigate = useNavigate();

  const handleLinkClick = (path) => {
    if (location.pathname === path) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(path);
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  const handleSubscribe = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage('Por favor, ingresa un correo electrónico válido.');
      setMessageType('error');
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 5000);
      return;
    }

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('¡Suscripción exitosa! Te mantendremos informado.');
        setMessageType('success');
        setEmail('');
      } else {
        setMessage(data.error || 'Error al suscribirse. Inténtalo de nuevo.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error al suscribirse:', error);
      setMessage('Error de conexión. Inténtalo de nuevo.');
      setMessageType('error');
    }

    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-20 h-20 bg-emerald-400 rounded-full"></div>
        <div className="absolute top-32 right-20 w-16 h-16 bg-turquoise-400 rounded-full"></div>
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-amber-400 rounded-full"></div>
      </div>

      <div className="relative container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div className="lg:col-span-2">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mr-3">
                <svg className="w-8 h-8" fill="none" stroke="white" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="20" fill="#E30613" />
                  <path d="M12 20L15 23L20 20L25 23L28 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 17L12 20" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <path d="M32 17L28 20" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-turquoise-400 bg-clip-text text-transparent">
                Changánet
              </h2>
            </div>
            <p className="text-gray-300 mb-6 max-w-md leading-relaxed">
              Conectamos profesionales de confianza con quienes necesitan sus servicios.
              Juntos construimos un futuro mejor con triple impacto positivo.
            </p>
            <div className="flex space-x-4"></div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-6 text-emerald-400">Enlaces Rápidos</h3>
            <ul className="space-y-3">
              <li>
                <button onClick={() => handleLinkClick('/')} className="text-gray-300 hover:text-emerald-400 transition-colors duration-200 flex items-center">
                  <span className="mr-2">🏠</span>
                  Inicio
                </button>
              </li>
              <li>
                <button onClick={() => handleLinkClick('/contacto')} className="text-gray-300 hover:text-emerald-400 transition-colors duration-200 flex items-center">
                  <span className="mr-2">📞</span>
                  Contacto
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-6 text-amber-400">Triple Impacto</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-emerald-400 mr-2 mt-1">🤝</span>
                <div>
                  <div className="text-gray-300 font-medium">Social</div>
                  <div className="text-gray-400 text-sm">Inclusión laboral</div>
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-amber-400 mr-2 mt-1">💰</span>
                <div>
                  <div className="text-gray-300 font-medium">Económico</div>
                  <div className="text-gray-400 text-sm">Pagos seguros</div>
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-turquoise-400 mr-2 mt-1">🌱</span>
                <div>
                  <div className="text-gray-300 font-medium">Ambiental</div>
                  <div className="text-gray-400 text-sm">-25% CO2</div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl p-8 mb-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4 text-emerald-400">Mantente Conectado</h3>
            <p className="text-gray-300 mb-6 max-w-md mx-auto">
              Suscríbete para recibir las últimas novedades y ofertas exclusivas
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Tu correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <button
                onClick={handleSubscribe}
                className="bg-gradient-to-r from-emerald-500 to-turquoise-600 text-white px-6 py-3 rounded-xl hover:from-emerald-600 hover:to-turquoise-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Suscribirse
              </button>
            </div>
            {message && (
              <div className={`mt-4 text-center ${messageType === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {message}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} Changánet. Todos los derechos reservados.
            </div>
            <div className="flex space-x-6 text-sm">
              <button onClick={() => handleLinkClick('/terminos')} className="text-gray-400 hover:text-emerald-400 hover:scale-105 hover:shadow-sm transition-all duration-300">
                Términos y Condiciones
              </button>
              <button onClick={() => handleLinkClick('/privacidad')} className="text-gray-400 hover:text-emerald-400 hover:scale-105 hover:shadow-sm transition-all duration-300">
              Política de Privacidad
              </button>
              <button onClick={() => handleLinkClick('/cookies')} className="text-gray-400 hover:text-emerald-400 hover:scale-105 hover:shadow-sm transition-all duration-300">
              Cookies
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
