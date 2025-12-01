import useSmartNavigation from '../hooks/useSmartNavigation';

const Privacy = () => {
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
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Política de Privacidad</h1>
            <p className="text-gray-600">Última actualización: 5 de octubre de 2025</p>
          </div>

          <div className="prose prose-lg max-w-none text-gray-700">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Introducción</h2>
              <p className="mb-4">
                En Changánet, nos comprometemos a proteger su privacidad y sus datos personales. Esta Política de Privacidad explica cómo recopilamos, utilizamos, almacenamos y protegemos su información cuando utiliza nuestra plataforma.
              </p>
              <p>
                Nuestra plataforma conecta clientes con profesionales de servicios técnicos, promoviendo un enfoque de triple impacto positivo que incluye inclusión social, sostenibilidad económica y protección ambiental.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Información que Recopilamos</h2>
              <h3 className="text-xl font-medium text-gray-800 mb-3">Información proporcionada por usted:</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Nombre completo y datos de contacto</li>
                <li>Información de registro (email, contraseña)</li>
                <li>Perfil profesional (especialidad, zona de cobertura, tarifas)</li>
                <li>Reseñas y calificaciones</li>
                <li>Información de pago (procesada por terceros)</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">Información recopilada automáticamente:</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Datos de uso de la plataforma</li>
                <li>Dirección IP y ubicación aproximada</li>
                <li>Información del dispositivo y navegador</li>
                <li>Cookies y tecnologías similares</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. Cómo Utilizamos su Información</h2>
              <p className="mb-4">Utilizamos su información para:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Proporcionar y mejorar nuestros servicios</li>
                <li>Conectar clientes con profesionales calificados</li>
                <li>Procesar pagos y transacciones</li>
                <li>Verificar identidades y calificaciones</li>
                <li>Enviar notificaciones importantes</li>
                <li>Mejorar la experiencia del usuario</li>
                <li>Cumplir con obligaciones legales</li>
                <li>Promover prácticas de inclusión y sostenibilidad</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Base Legal para el Tratamiento</h2>
              <p className="mb-4">
                De acuerdo con la Ley 25.326 de Protección de Datos Personales de Argentina, tratamos sus datos con las siguientes bases legales:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Consentimiento:</strong> Cuando usted nos lo proporciona explícitamente</li>
                <li><strong>Contrato:</strong> Para cumplir con los servicios solicitados</li>
                <li><strong>Interés legítimo:</strong> Para mejorar nuestros servicios y seguridad</li>
                <li><strong>Obligación legal:</strong> Para cumplir con regulaciones aplicables</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Compartir Información</h2>
              <p className="mb-4">Podemos compartir su información en las siguientes situaciones:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Con profesionales para facilitar servicios solicitados</li>
                <li>Con proveedores de servicios de pago (Stripe, MercadoPago)</li>
                <li>Con autoridades cuando lo requiera la ley</li>
                <li>Con su consentimiento explícito</li>
                <li>En caso de fusión, adquisición o venta de activos</li>
              </ul>
              <p>
                Nunca vendemos su información personal a terceros para fines comerciales.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Protección de sus Datos</h2>
              <p className="mb-4">
                Implementamos medidas de seguridad técnicas y organizativas para proteger sus datos:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Encriptación de datos en tránsito y en reposo</li>
                <li>Controles de acceso restringidos</li>
                <li>Auditorías de seguridad regulares</li>
                <li>Cumplimiento con estándares internacionales</li>
                <li>Entrenamiento del personal en protección de datos</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Sus Derechos</h2>
              <p className="mb-4">
                De acuerdo con la Ley 25.326, usted tiene derecho a:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Acceder:</strong> Conocer qué datos personales tenemos sobre usted</li>
                <li><strong>Rectificar:</strong> Corregir datos inexactos o incompletos</li>
                <li><strong>Suprimir:</strong> Solicitar la eliminación de sus datos</li>
                <li><strong>Oponerse:</strong> Negarse al tratamiento de sus datos</li>
                <li><strong>Portabilidad:</strong> Obtener sus datos en formato estructurado</li>
              </ul>
              <p>
                Para ejercer estos derechos, contáctenos en privacidad@changanet.com.ar
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Retención de Datos</h2>
              <p className="mb-4">
                Conservamos sus datos personales durante el tiempo necesario para cumplir con los fines descritos, más:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Datos de cuenta: Mientras mantenga activa su cuenta</li>
                <li>Datos de transacciones: 5 años por requisitos fiscales</li>
                <li>Datos de reseñas: Indefinidamente (con opción de eliminación)</li>
                <li>Datos anonimizados: Sin límite temporal</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. Transferencias Internacionales</h2>
              <p className="mb-4">
                Algunos de nuestros proveedores de servicios pueden estar ubicados fuera de Argentina. En estos casos, garantizamos que:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Los proveedores cumplen con estándares de protección equivalentes</li>
                <li>Existen cláusulas contractuales de protección de datos</li>
                <li>Las transferencias cumplen con la legislación argentina</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">10. Cambios a esta Política</h2>
              <p className="mb-4">
                Podemos actualizar esta política periódicamente. Le notificaremos sobre cambios significativos a través de:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Email a usuarios registrados</li>
                <li>Notificaciones en la plataforma</li>
                <li>Actualización de la fecha de "última modificación"</li>
              </ul>
              <p>
                El uso continuado de nuestros servicios después de los cambios constituye aceptación de la política actualizada.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">11. Contacto</h2>
              <p className="mb-4">
                Para consultas sobre esta política o ejercer sus derechos:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><strong>Oficial de Protección de Datos</strong></p>
                <p>Email: privacidad@changanet.com.ar</p>
                <p>Teléfono: +54 11 1234-5678</p>
                <p>Dirección: Av. Corrientes 1234, CABA, Argentina</p>
              </div>
            </section>

            <section className="mt-12 p-6 bg-emerald-50 rounded-2xl">
              <h3 className="text-xl font-semibold text-emerald-800 mb-4">Compromiso con la Privacidad y el Triple Impacto</h3>
              <p className="text-emerald-700 mb-3">
                En Changánet, la protección de sus datos es fundamental para nuestro compromiso con el triple impacto positivo.
              </p>
              <ul className="text-emerald-700">
                <li>• <strong>Social:</strong> Proporcionamos acceso seguro a oportunidades laborales inclusivas</li>
                <li>• <strong>Económico:</strong> Facilitamos transacciones seguras que promueven el crecimiento sostenible</li>
                <li>• <strong>Ambiental:</strong> Utilizamos tecnologías eficientes que minimizan nuestra huella digital</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
