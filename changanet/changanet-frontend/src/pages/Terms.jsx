import useSmartNavigation from '../hooks/useSmartNavigation';

const Terms = () => {
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
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Términos y Condiciones de Uso</h1>
            <p className="text-gray-600">Última actualización: 5 de octubre de 2025</p>
          </div>

          <div className="prose prose-lg max-w-none text-gray-700">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Aceptación de los Términos</h2>
              <p className="mb-4">
                Al acceder y utilizar la plataforma Changánet, usted acepta y se compromete a cumplir con estos Términos y Condiciones de Uso. Si no está de acuerdo con estos términos, no debe utilizar nuestros servicios.
              </p>
              <p>
                Changánet es una plataforma digital que conecta a clientes con profesionales de servicios técnicos, promoviendo un enfoque de triple impacto positivo: social, económico y ambiental.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Descripción del Servicio</h2>
              <p className="mb-4">
                Changánet proporciona una plataforma en línea que permite:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>La conexión entre clientes y profesionales calificados en servicios técnicos</li>
                <li>La gestión de presupuestos y contrataciones de servicios</li>
                <li>La evaluación y reseñas de servicios prestados</li>
                <li>La promoción de prácticas sostenibles y de inclusión laboral</li>
              </ul>
              <p>
                Nuestra plataforma se enfoca en generar triple impacto positivo: inclusión social para personas en situación de vulnerabilidad, crecimiento económico sostenible y reducción de la huella ambiental.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. Registro de Cuenta</h2>
              <p className="mb-4">
                Para utilizar ciertos servicios de Changánet, debe registrarse y crear una cuenta. Al registrarse, usted declara que:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Proporciona información veraz, precisa y completa</li>
                <li>Mantiene actualizada su información de contacto</li>
                <li>Es mayor de 18 años o cuenta con autorización parental</li>
                <li>No ha sido suspendido previamente de nuestra plataforma</li>
              </ul>
              <p>
                Los profesionales deben verificar su identidad y calificaciones antes de ofrecer servicios en la plataforma.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Conducta del Usuario</h2>
              <p className="mb-4">
                Al utilizar Changánet, usted se compromete a:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Utilizar la plataforma de manera ética y responsable</li>
                <li>No publicar contenido falso, engañoso o discriminatorio</li>
                <li>Respetar los derechos de propiedad intelectual</li>
                <li>No interferir con el funcionamiento técnico de la plataforma</li>
                <li>Cumplir con las leyes y regulaciones aplicables</li>
                <li>Promover prácticas de inclusión y sostenibilidad</li>
              </ul>
              <p>
                El incumplimiento de estas normas puede resultar en la suspensión o eliminación de su cuenta.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Pagos y Transacciones</h2>
              <p className="mb-4">
                Changánet facilita las transacciones entre clientes y profesionales, pero no actúa como intermediario financiero. Los pagos se procesan a través de proveedores externos autorizados.
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Los precios son determinados por los profesionales</li>
                <li>Changánet puede cobrar una comisión por facilitar la conexión</li>
                <li>Los pagos están protegidos por medidas de seguridad estándar</li>
                <li>Las disputas se resuelven directamente entre las partes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Propiedad Intelectual</h2>
              <p className="mb-4">
                Todo el contenido de Changánet, incluyendo pero no limitado a textos, gráficos, logos, iconos, imágenes y software, está protegido por derechos de propiedad intelectual.
              </p>
              <p>
                Usted retiene los derechos sobre el contenido que publique, pero otorga a Changánet una licencia limitada para utilizarlo en la plataforma.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Limitación de Responsabilidad</h2>
              <p className="mb-4">
                Changánet actúa como intermediario entre clientes y profesionales. No somos responsables por:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>La calidad de los servicios prestados por profesionales</li>
                <li>Disputas entre usuarios</li>
                <li>Daños indirectos o consecuentes</li>
                <li>Interrupciones del servicio por causas ajenas a nuestro control</li>
              </ul>
              <p>
                Nuestra responsabilidad máxima se limita al monto pagado por el servicio facilitado.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Modificaciones a los Términos</h2>
              <p className="mb-4">
                Changánet se reserva el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor 30 días después de su publicación.
              </p>
              <p>
                Le notificaremos sobre cambios significativos a través de email o notificaciones en la plataforma.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. Ley Aplicable y Jurisdicción</h2>
              <p className="mb-4">
                Estos términos se rigen por las leyes de la República Argentina. Cualquier disputa será resuelta en los tribunales competentes de la Ciudad Autónoma de Buenos Aires.
              </p>
              <p>
                Para consultas sobre estos términos, contáctenos en legal@changanet.com.ar
              </p>
            </section>

            <section className="mt-12 p-6 bg-emerald-50 rounded-2xl">
              <h3 className="text-xl font-semibold text-emerald-800 mb-4">Compromiso con el Triple Impacto</h3>
              <p className="text-emerald-700">
                Changánet se compromete a promover servicios que generen impacto positivo en tres dimensiones:
                inclusión social para personas en situación de vulnerabilidad, crecimiento económico sostenible
                y reducción de la huella ambiental a través de prácticas eco-friendly.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
