/**
 * Página principal (Home) de Changánet
 * Landing page que presenta la plataforma, estadísticas, triple impacto y testimonios
 * Implementa la experiencia inicial del usuario según objetivos del PRD
 */

/**
 * Componente Home - Página principal de Changánet
 * Renderiza landing page con hero, estadísticas, triple impacto y testimonios
 * Implementa experiencia inicial del usuario según objetivos de plataforma
 */

import Hero from '../components/Hero'; // Componente hero con banner principal
import { Link } from 'react-router-dom'; // Para navegación interna de React Router

const Home = () => {
  return (
    <div> {/* Contenedor principal de la página */}
      <Hero /> {/* Componente hero con título, subtítulo y call-to-action principal */}


      {/* Triple Impacto Section */}
      <div className="py-24 bg-white relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20 animate-fade-in">
            <h2 className="text-5xl md:text-6xl font-black mb-8 text-gradient">
              Nuestro Triple Impacto
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Más que una plataforma de servicios, somos agentes de cambio positivo en la sociedad, creando un futuro sostenible y equitativo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="group card-glow p-10 rounded-3xl text-center hover-lift animate-fade-in">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl group-hover:shadow-glow transition-all duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold mb-6 text-emerald-700">Social</h3>
              <p className="text-gray-700 text-lg leading-relaxed mb-6">
                Changánet dignifica el trabajo manual y promueve la inclusión laboral, conectando a profesionales con oportunidades justas y seguras.
              </p>
            </div>

            <div className="group card-glow p-10 rounded-3xl text-center hover-lift animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl group-hover:shadow-glow transition-all duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold mb-6 text-amber-700">Económico</h3>
              <p className="text-gray-700 text-lg leading-relaxed mb-6">
                Generamos ingresos dignos y fomentamos la formalización del trabajo independiente, con pagos seguros y transparentes para todos.
              </p>
            </div>

            <div className="group card-glow p-10 rounded-3xl text-center hover-lift animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl group-hover:shadow-glow transition-all duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0 9c-1.657 0-3-4.03-3-9s1.343-9 3-9m0 18c1.657 0 3-4.03 3-9s-1.343-9-3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold mb-6 text-cyan-700">Ambiental</h3>
              <p className="text-gray-700 text-lg leading-relaxed mb-6">
                Reducimos el impacto ambiental optimizando rutas y promoviendo prácticas sostenibles en cada servicio contratado.
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* Call to Action Section */}
      <div className="py-24 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-black mb-8 drop-shadow-lg">
            ¿Listo para transformar tu experiencia con servicios?
          </h2>
          <p className="text-xl mb-12 opacity-95 max-w-3xl mx-auto leading-relaxed">
            Únete a miles de usuarios que ya confían en Changánet para sus necesidades diarias y contribuyen a un futuro mejor.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
