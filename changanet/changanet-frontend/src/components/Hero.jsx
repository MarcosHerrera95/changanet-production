import SearchBar from './SearchBar';
import { useModal } from '../context/ModalContext';

const Hero = () => {
  const { setShowSignup } = useModal();
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 text-white min-h-screen flex items-center">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl animate-float"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-amber-300/20 rounded-full blur-lg animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-32 left-1/3 w-20 h-20 bg-orange-400/15 rounded-full blur-md animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-40 right-20 w-36 h-36 bg-emerald-300/10 rounded-full blur-2xl animate-pulse-slow" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-cyan-300/20 rounded-full blur-sm animate-float" style={{ animationDelay: '3s' }}></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>

      <div className="relative container mx-auto px-4 py-20 md:py-32 text-center z-10">
        {/* Hero icon */}
        <div className="mb-10 flex justify-center animate-fade-in">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-2xl animate-glow border border-white/30">
            <svg className="w-20 h-20" fill="none" stroke="white" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="40" fill="#E30613"/>
              <path d="M25 40L32.5 47.5L40 40L47.5 47.5L55 40" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 35L25 40" stroke="white" strokeWidth="4" strokeLinecap="round"/>
              <path d="M65 35L55 40" stroke="white" strokeWidth="4" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-black mb-8 leading-tight animate-slide-up text-white drop-shadow-lg">
          Profesionales de Confianza
          <span className="block text-3xl md:text-4xl font-semibold text-amber-300 mt-4 drop-shadow-md">
            con Triple Impacto
          </span>
        </h1>

        <p className="text-xl md:text-2xl mb-8 max-w-4xl mx-auto leading-relaxed opacity-95 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Conectamos a los mejores profesionales con quienes los necesitan, creando un futuro sostenible y equitativo.
        </p>

        {/* Triple Impacto highlights */}
        <div className="flex flex-col md:flex-row justify-center items-center space-y-6 md:space-y-0 md:space-x-8 mb-16 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center space-x-3 bg-white/15 backdrop-blur-md rounded-2xl px-6 py-4 shadow-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-105 border border-white/20">
            <svg className="w-8 h-8 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="font-semibold text-lg">Social</span>
          </div>
          <div className="flex items-center space-x-3 bg-white/15 backdrop-blur-md rounded-2xl px-6 py-4 shadow-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-105 border border-white/20">
            <svg className="w-8 h-8 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold text-lg">Económico</span>
          </div>
          <div className="flex items-center space-x-3 bg-white/15 backdrop-blur-md rounded-2xl px-6 py-4 shadow-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-105 border border-white/20">
            <svg className="w-8 h-8 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0 9c-1.657 0-3-4.03-3-9s1.343-9 3-9m0 18c1.657 0 3-4.03 3-9s-1.343-9-3-9m-9 9a9 9 0 019-9" />
            </svg>
            <span className="font-semibold text-lg">Ambiental</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-5xl mx-auto bg-white rounded-3xl p-6 shadow-2xl border border-gray-300 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <SearchBar />
        </div>

        {/* Call to action */}
        <div className="mt-16 animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <p className="text-xl mb-6 opacity-90 font-medium">
          ¿Eres cliente o profesional? ¡Ambos son bienvenidos! Únete a nuestra red de impacto positivo.
          </p>
      <button
        onClick={() => setShowSignup(true)}
        type="button"
        className="bg-emerald-500 text-black px-10 py-4 rounded-2xl hover:bg-emerald-600 hover:shadow-md hover:scale-[1.02] transition-all duration-300 shadow-2xl font-bold text-lg flex items-center justify-center mx-auto">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Regístrate como cliente o profesional
          </button>
        </div>
      </div>

      {/* Bottom wave with enhanced design */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" className="w-full h-24 md:h-36">
          <defs>
            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="50%" stopColor="#f8fafc" stopOpacity="1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path fill="url(#waveGradient)" d="M0,32L48,37.3C96,43,192,53,288,58.7C384,64,480,64,576,58.7C672,53,768,43,864,48C960,53,1056,75,1152,80C1248,85,1344,75,1392,69.3L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"></path>
        </svg>
      </div>
    </div>
  );
};

export default Hero;
