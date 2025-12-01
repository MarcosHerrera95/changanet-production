// src/pages/ProfessionalDetail.jsx - Página de Detalle del Profesional para Clientes
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import QuoteRequestForm from '../components/QuoteRequestForm';
import RatingDisplay from '../components/RatingDisplay';
import BackButton from '../components/BackButton';
import ProfilePicture from '../components/ProfilePicture';

const ProfessionalDetail = () => {
  const { user } = useAuth();
  const { id: professionalId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('about');
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [professional, setProfessional] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfessionalData();
  }, [professionalId]);

  const fetchProfessionalData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch professional details
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/professionals/${professionalId}`);
      if (!response.ok) {
        throw new Error('Profesional no encontrado');
      }

      const data = await response.json();
      setProfessional(data);

      // Mock gallery data (since API might not have this endpoint yet)
      setGallery([
        { id: 1, url: 'https://placehold.co/400x300?text=Trabajo+1', title: 'Trabajo de plomería residencial' },
        { id: 2, url: 'https://placehold.co/400x300?text=Trabajo+2', title: 'Instalación eléctrica' },
        { id: 3, url: 'https://placehold.co/400x300?text=Trabajo+3', title: 'Reparación de carpintería' }
      ]);

      // Mock reviews data
      setReviews([
        {
          id: 1,
          cliente: { nombre: 'María García' },
          calificacion: 5,
          comentario: 'Excelente trabajo, muy profesional y puntual.',
          creado_en: new Date().toISOString()
        },
        {
          id: 2,
          cliente: { nombre: 'Carlos López' },
          calificacion: 4,
          comentario: 'Buen servicio, recomendado.',
          creado_en: new Date().toISOString()
        }
      ]);

    } catch (error) {
      console.error('Error fetching professional data:', error);
      setError('Error al cargar la información del profesional');
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="loading-spinner mx-auto mb-6"></div>
          <p className="text-gray-600 text-xl font-medium">Cargando perfil del profesional...</p>
        </div>
      </div>
    );
  }

  if (error || !professional) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Profesional no encontrado</h2>
          <p className="text-gray-600 mb-6">{error || 'El profesional que buscas no existe o no está disponible.'}</p>
          <BackButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Header Section */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-100/30 to-turquoise-100/30 rounded-full -translate-y-48 translate-x-48"></div>

          <div className="relative flex flex-col lg:flex-row items-center lg:items-start gap-8">
            {/* Profile Photo */}
            <div className="flex-shrink-0">
              <ProfilePicture 
                size="w-40 h-40"
                profileImageUrl={professional.usuario?.url_foto_perfil}
                className="border-4 border-emerald-200 shadow-xl"
              />
            </div>

            {/* Profile Info */}
            <div className="flex-grow text-center lg:text-left">
              <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-emerald-600 to-turquoise-600 bg-clip-text text-transparent mb-2">
                {professional.usuario?.nombre || 'Profesional'}
              </h1>
              <p className="text-xl text-emerald-600 font-semibold mb-4">
                {professional.especialidad || 'Especialidad'}
              </p>

              <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-6">
                <div className="flex items-center bg-amber-50 px-4 py-2 rounded-full">
                  <span className="text-amber-500 text-xl mr-2">⭐</span>
                  <span className="font-bold text-gray-800">{professional.calificacion_promedio || '4.8'}</span>
                  <span className="text-gray-500 ml-1">({reviews.length} reseñas)</span>
                </div>
                <div className="flex items-center bg-emerald-50 px-4 py-2 rounded-full">
                  <span className="text-emerald-600 text-xl mr-2">$</span>
                  <span className="font-bold text-gray-800">{professional.tarifa_hora || '0'}/hora</span>
                </div>
                <div className="flex items-center bg-blue-50 px-4 py-2 rounded-full">
                  <span className="text-blue-600 text-xl mr-2">📍</span>
                  <span className="text-gray-800">{professional.zona_cobertura || 'Zona'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  onClick={() => setShowQuoteForm(true)}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-3 rounded-2xl hover:from-amber-600 hover:to-orange-600 hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold flex items-center justify-center min-h-[44px] touch-manipulation"
                  aria-label="Solicitar presupuesto al profesional"
                >
                  <span className="mr-2">💰</span>
                  Solicitar Presupuesto
                </button>
                {user && user.rol === 'cliente' && (
                  <button
                    onClick={() => navigate(`/chat?user=${professionalId}`)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-3 rounded-2xl hover:from-emerald-600 hover:to-teal-600 hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold flex items-center justify-center min-h-[44px] touch-manipulation"
                    aria-label="Chatear con el profesional"
                  >
                    <span className="mr-2">💬</span>
                    Enviar Mensaje
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap">
              {[
                { id: 'about', label: 'Sobre Mí', icon: '👤' },
                { id: 'gallery', label: 'Galería de Trabajos', icon: '🖼️' },
                { id: 'reviews', label: 'Reseñas', icon: '⭐' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 font-semibold transition-all duration-300 flex-1 min-w-0 ${
                    activeTab === tab.id
                      ? 'text-emerald-600 border-b-4 border-emerald-600 bg-emerald-50'
                      : 'text-gray-500 hover:text-emerald-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {activeTab === 'about' && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-bold mb-6 text-gray-800">Sobre Mí</h2>
                <div className="prose prose-lg max-w-none text-gray-600 mb-8">
                  {professional.descripcion || 'Soy un profesional dedicado con experiencia en mi especialidad. Me comprometo a brindar servicios de calidad con atención personalizada.'}
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-2xl font-semibold mb-4 text-gray-800">Servicios que Ofrezco</h3>
                    <ul className="space-y-3">
                      {['Reparaciones', 'Instalaciones', 'Mantenimiento', 'Consultoría'].map((service, index) => (
                        <li key={index} className="flex items-center text-gray-600">
                          <span className="text-emerald-500 mr-3">✓</span>
                          {service}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-2xl font-semibold mb-4 text-gray-800">Mi Experiencia</h3>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">🏆</span>
                        <div>
                          <h4 className="font-medium text-gray-800">Profesional Certificado</h4>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">🌱</span>
                        <div>
                          <h4 className="font-medium text-gray-800">Trabajo de Calidad</h4>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">🤝</span>
                        <div>
                          <h4 className="font-medium text-gray-800">Servicio Personalizado</h4>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'gallery' && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-bold mb-6 text-gray-800">Galería de Trabajos</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {gallery.map(photo => (
                    <div key={photo.id} className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                      <img
                        src={photo.url}
                        alt={photo.title}
                        className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-lg font-medium">
                          {photo.title}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-bold mb-6 text-gray-800">Reseñas de Clientes</h2>

                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 mb-8">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <RatingDisplay
                        rating={professional.calificacion_promedio || 4.8}
                        size="lg"
                        showLabel={true}
                        showPercentage={true}
                      />
                      <p className="text-gray-600 mt-2">Basado en {reviews.length} reseñas</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {reviews.map(review => (
                    <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mr-4">
                            <span className="text-emerald-600 font-bold text-lg">
                              {review.cliente.nombre.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-800">{review.cliente.nombre}</h4>
                            <RatingDisplay
                              rating={review.calificacion}
                              size="sm"
                              showLabel={false}
                            />
                          </div>
                        </div>
                        <span className="text-gray-500 text-sm">
                          {new Date(review.creado_en).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-600">{review.comentario || 'Sin comentario'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quote Request Modal */}
        {showQuoteForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-scale-in">
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-emerald-600 text-xl">💰</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">
                        Solicitar Presupuesto
                      </h2>
                      <p className="text-sm text-gray-600">
                        a {professional.usuario?.nombre}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowQuoteForm(false)}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all duration-200"
                    aria-label="Cerrar modal"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="px-8 py-6 max-h-[calc(90vh-140px)] overflow-y-auto">
                <QuoteRequestForm onClose={() => setShowQuoteForm(false)} professionalName={professional.usuario?.nombre} professionalId={professionalId} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessionalDetail;
