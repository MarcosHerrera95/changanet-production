// src/components/modals/ProfessionalDetailModal.jsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import RatingDisplay from '../RatingDisplay';
import VerifiedBadge from '../VerifiedBadge';
import ProfilePicture from '../ProfilePicture';

const ProfessionalDetailModal = ({ isOpen, onClose, professional }) => {
  const [gallery, setGallery] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState('about');


  useEffect(() => {
    if (isOpen && professional) {
      fetchProfessionalDetails();
    }
  }, [isOpen, professional]);

  const fetchProfessionalDetails = async () => {
    if (!professional) return;

    try {
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
      console.error('Error fetching professional details:', error);
    }
  };


  if (!isOpen || !professional) return null;

  const nombreProfesional = professional.usuario?.nombre || 'Profesional';
  const fotoPerfilOriginal = professional.usuario?.url_foto_perfil;

  // Get animation class - simplified to just expand in center
  const getAnimationClass = () => {
    return 'animate-modal-expand';
  };

  const animationClass = getAnimationClass();

  // Create portal to render modal at document body level
  const modalContent = (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 animate-fade-in p-4">
      <div
        className={`absolute bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border-4 border-white/20 ${animationClass}`}
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(1)',
          transformOrigin: 'center center'
        }}
      >
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <ProfilePicture 
                size="w-12 h-12"
                profileImageUrl={fotoPerfilOriginal}
                className="border-2 border-emerald-200"
              />
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {nombreProfesional}
                </h2>
                <p className="text-sm text-gray-600">
                  {professional.especialidad}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
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
          {/* Professional Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-600 mb-1">
                ⭐ {professional.calificacion_promedio || '4.8'}
              </div>
              <div className="text-sm text-gray-600">Calificación</div>
            </div>
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600 mb-1">
                ${professional.tarifa_hora || '0'}
              </div>
              <div className="text-sm text-gray-600">Por hora</div>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                📍
              </div>
              <div className="text-sm text-gray-600 truncate">{professional.zona_cobertura || 'Zona'}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex flex-wrap">
              {[
                { id: 'about', label: 'Sobre Mí', icon: '👤' },
                { id: 'gallery', label: 'Trabajos', icon: '🖼️' },
                { id: 'reviews', label: 'Reseñas', icon: '⭐' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 font-semibold transition-all duration-300 flex-1 min-w-0 ${
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

          {/* Tab Content */}
          <div className="min-h-[200px]">
            {activeTab === 'about' && (
              <div className="animate-fade-in">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Sobre Mí</h3>
                <div className="prose prose-lg max-w-none text-gray-600 mb-6">
                  {professional.descripcion || 'Soy un profesional dedicado con experiencia en mi especialidad. Me comprometo a brindar servicios de calidad con atención personalizada.'}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold mb-3 text-gray-800">Servicios que Ofrezco</h4>
                    <ul className="space-y-2">
                      {['Reparaciones', 'Instalaciones', 'Mantenimiento', 'Consultoría'].map((service, index) => (
                        <li key={index} className="flex items-center text-gray-600">
                          <span className="text-emerald-500 mr-3">✓</span>
                          {service}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-3 text-gray-800">Mi Experiencia</h4>
                    <div className="space-y-3">
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
                <h3 className="text-xl font-bold mb-4 text-gray-800">Galería de Trabajos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gallery.map(photo => (
                    <div key={photo.id} className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                      <img
                        src={photo.url}
                        alt={photo.title}
                        className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm font-medium text-center px-2">
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
                <h3 className="text-xl font-bold mb-4 text-gray-800">Reseñas de Clientes</h3>

                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 mb-6">
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

                <div className="space-y-4">
                  {reviews.map(review => (
                    <div key={review.id} className="border-b border-gray-200 pb-4 last:border-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-emerald-600 font-bold text-sm">
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

        {/* Modal Footer */}
        <div className="px-8 py-4 border-t border-gray-100 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render modal using portal to document body - completely independent of parent containers
  return createPortal(modalContent, document.body);
};

export default ProfessionalDetailModal;
