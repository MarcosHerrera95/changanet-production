import useSmartNavigation from '../hooks/useSmartNavigation';

const Cookies = () => {
  const smartNavigate = useSmartNavigation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-turquoise-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-8 md:p-12">
          <div className="mb-8">
            <button
              onClick={() => smartNavigate('/')}
              type="button"
              className="inline-flex items-center text-emerald-600 hover:text-emerald-700 transition-colors duration-200 mb-6">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver al inicio
            </button>
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Política de Cookies</h1>
            <p className="text-gray-600">Última actualización: 5 de octubre de 2025</p>
          </div>

          <div className="prose prose-lg max-w-none text-gray-700">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. ¿Qué son las Cookies?</h2>
              <p className="mb-4">
                Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita nuestro sitio web. Nos permiten recordar sus preferencias, mejorar su experiencia de navegación y proporcionar funcionalidades personalizadas.
              </p>
              <p>
                En Changánet, utilizamos cookies para optimizar nuestros servicios de conexión entre clientes y profesionales, manteniendo siempre el enfoque en nuestro triple impacto positivo.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Tipos de Cookies que Utilizamos</h2>

              <h3 className="text-xl font-medium text-gray-800 mb-3">Cookies Esenciales</h3>
              <p className="mb-3">
                Estas cookies son necesarias para el funcionamiento básico de nuestra plataforma:
              </p>
              <ul className="list-disc pl-6 mb-6">
                <li>Sesión de usuario y autenticación</li>
                <li>Recordar preferencias de idioma e interfaz</li>
                <li>Seguridad y prevención de fraudes</li>
                <li>Duración: Sesión o 30 días</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">Cookies de Rendimiento</h3>
              <p className="mb-3">
                Nos ayudan a entender cómo interactúa con nuestra plataforma para mejorar nuestros servicios:
              </p>
              <ul className="list-disc pl-6 mb-6">
                <li>Análisis de uso de páginas y funcionalidades</li>
                <li>Tiempo de carga y rendimiento del sitio</li>
                <li>Identificación de errores técnicos</li>
                <li>Duración: 2 años</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">Cookies de Funcionalidad</h3>
              <p className="mb-3">
                Permiten personalizar su experiencia y recordar sus elecciones:
              </p>
              <ul className="list-disc pl-6 mb-6">
                <li>Recordar ubicación para búsquedas locales</li>
                <li>Preferencias de notificaciones</li>
                <li>Historial de búsquedas recientes</li>
                <li>Duración: 1 año</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. Cookies de Terceros</h2>
              <p className="mb-4">
                Utilizamos servicios de terceros que pueden instalar sus propias cookies:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Google Analytics:</strong> Para análisis de uso (puede optar por no participar)</li>
                <li><strong>Proveedores de pago:</strong> Para procesar transacciones de forma segura</li>
                <li><strong>Redes sociales:</strong> Para compartir contenido (solo cuando interactúa)</li>
                <li><strong>Servicios de mapas:</strong> Para mostrar ubicaciones de profesionales</li>
              </ul>
              <p>
                Estos terceros tienen sus propias políticas de cookies y privacidad.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Cómo Controlar las Cookies</h2>
              <p className="mb-4">
                Usted tiene control sobre el uso de cookies. Puede:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Aceptar o rechazar cookies no esenciales</li>
                <li>Eliminar cookies existentes</li>
                <li>Configurar su navegador para bloquear cookies</li>
                <li>Utilizar el modo de navegación privada</li>
              </ul>
              <p className="mb-4">
                <strong>Nota:</strong> Desactivar cookies esenciales puede afectar el funcionamiento de la plataforma.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Configuración del Navegador</h2>
              <p className="mb-4">
                La mayoría de los navegadores web permiten controlar las cookies a través de sus configuraciones:
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Google Chrome</h4>
                  <p className="text-sm text-gray-600">Configuración → Privacidad → Cookies</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Mozilla Firefox</h4>
                  <p className="text-sm text-gray-600">Preferencias → Privacidad → Cookies</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Safari</h4>
                  <p className="text-sm text-gray-600">Preferencias → Privacidad → Gestionar datos</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Microsoft Edge</h4>
                  <p className="text-sm text-gray-600">Configuración → Cookies y permisos</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Impacto en el Triple Impacto</h2>
              <p className="mb-4">
                Nuestras cookies contribuyen a nuestro compromiso con el triple impacto:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Social:</strong> Facilitan conexiones inclusivas entre usuarios</li>
                <li><strong>Económico:</strong> Optimizan transacciones y reducen costos operativos</li>
                <li><strong>Ambiental:</strong> Mejoran la eficiencia del sitio, reduciendo el consumo de recursos</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Cambios a esta Política</h2>
              <p className="mb-4">
                Podemos actualizar esta política de cookies periódicamente para reflejar cambios en nuestras prácticas o en la legislación aplicable.
              </p>
              <p className="mb-4">
                Le informaremos sobre cambios significativos a través de notificaciones en la plataforma o por email.
              </p>
              <p>
                El uso continuado de nuestros servicios después de los cambios constituye aceptación de la política actualizada.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Contacto</h2>
              <p className="mb-4">
                Para consultas sobre cookies o ejercer sus derechos:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><strong>Equipo de Soporte Técnico</strong></p>
                <p>Email: soporte@changanet.com.ar</p>
                <p>Teléfono: +54 11 1234-5678</p>
              </div>
            </section>

            <section className="mt-12 p-6 bg-amber-50 rounded-2xl">
              <h3 className="text-xl font-semibold text-amber-800 mb-4">Herramientas de Control de Cookies</h3>
              <p className="text-amber-700 mb-3">
                Changánet respeta su privacidad. Puede gestionar sus preferencias de cookies en cualquier momento.
              </p>
              <div className="flex flex-wrap gap-3">
                <button className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors duration-200 text-sm">
                  Aceptar Todas
                </button>
                <button className="border border-amber-600 text-amber-600 px-4 py-2 rounded-lg hover:bg-amber-50 transition-colors duration-200 text-sm">
                  Solo Esenciales
                </button>
                <button className="border border-amber-600 text-amber-600 px-4 py-2 rounded-lg hover:bg-amber-50 transition-colors duration-200 text-sm">
                  Configurar
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cookies;
