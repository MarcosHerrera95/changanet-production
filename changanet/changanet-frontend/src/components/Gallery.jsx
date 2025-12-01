import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ImageUpload from './ImageUpload';
import { uploadWorkPhoto, getFileURL, deleteFile } from '../services/storageService';

const Gallery = ({ professionalId, isOwner = false }) => {
  const { user } = useAuth();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newImageData, setNewImageData] = useState({
    titulo: '',
    descripcion: '',
    imagen: null
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchGallery();
  }, [professionalId]);

  const fetchGallery = async () => {
    try {
      setLoading(true);
      // INTEGRACIÓN CON FIREBASE: Simular carga desde Storage (en producción usarías una base de datos)
      // Por ahora, cargamos imágenes de ejemplo
      const mockImages = [
        {
          id: '1',
          titulo: 'Trabajo de pintura',
          descripcion: 'Pintura completa de sala de estar',
          url_imagen: 'https://via.placeholder.com/400x300?text=Trabajo+de+Pintura'
        },
        {
          id: '2',
          titulo: 'Instalación eléctrica',
          descripcion: 'Instalación de tomacorrientes y luces',
          url_imagen: 'https://via.placeholder.com/400x300?text=Instalacion+Electrica'
        }
      ];
      setImages(mockImages);
    } catch (err) {
      setError('Error al cargar la galería');
    } finally {
      setLoading(false);
    }
  };

  const handleAddImage = async (e) => {
    e.preventDefault();
    if (!newImageData.imagen) {
      setError('Por favor selecciona una imagen');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // INTEGRACIÓN CON FIREBASE: Subir imagen a Storage
      const result = await uploadWorkPhoto(user.uid, Date.now().toString(), newImageData.imagen);
      if (result.success) {
        const newImage = {
          id: Date.now().toString(),
          titulo: newImageData.titulo,
          descripcion: newImageData.descripcion,
          url_imagen: result.url
        };
        setImages(prev => [newImage, ...prev]);
        setShowAddForm(false);
        setNewImageData({ titulo: '', descripcion: '', imagen: null });
      } else {
        setError(result.error || 'Error al subir la imagen');
      }
    } catch (err) {
      setError('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen?')) {
      return;
    }

    try {
      // INTEGRACIÓN CON FIREBASE: Eliminar imagen de Storage
      const imageToDelete = images.find(img => img.id === imageId);
      if (imageToDelete) {
        // Extraer el path del URL de Firebase Storage
        const urlParts = imageToDelete.url_imagen.split('/o/')[1]?.split('?')[0];
        if (urlParts) {
          const decodedPath = decodeURIComponent(urlParts);
          const result = await deleteFile(decodedPath);
          if (result.success) {
            setImages(prev => prev.filter(img => img.id !== imageId));
          } else {
            setError('Error al eliminar la imagen');
          }
        }
      }
    } catch (err) {
      setError('Error al eliminar la imagen');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-800">Galería de Trabajos</h3>
        {isOwner && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors duration-200"
          >
            {showAddForm ? 'Cancelar' : 'Agregar Imagen'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Formulario para agregar imagen */}
      {showAddForm && isOwner && (
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-medium mb-4">Agregar Nueva Imagen</h4>
          <form onSubmit={handleAddImage} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Título
              </label>
              <input
                type="text"
                value={newImageData.titulo}
                onChange={(e) => setNewImageData(prev => ({ ...prev, titulo: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Título de la imagen"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Descripción
              </label>
              <textarea
                value={newImageData.descripcion}
                onChange={(e) => setNewImageData(prev => ({ ...prev, descripcion: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                rows={3}
                placeholder="Descripción del trabajo realizado"
              />
            </div>

            <ImageUpload
              onImageSelect={(file) => setNewImageData(prev => ({ ...prev, imagen: file }))}
              onImageRemove={() => setNewImageData(prev => ({ ...prev, imagen: null }))}
              placeholder="Seleccionar imagen del trabajo"
            />

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={uploading}
                className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition-colors duration-200 disabled:opacity-50 flex items-center"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Subiendo...
                  </>
                ) : (
                  'Agregar Imagen'
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors duration-200"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Galería de imágenes */}
      {images.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {isOwner ? 'Aún no has agregado imágenes a tu galería' : 'Este profesional aún no ha agregado imágenes a su galería'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              <img
                src={image.url_imagen}
                alt={image.titulo}
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />

              {/* Overlay con información */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-center p-4">
                  <h4 className="font-semibold text-sm mb-1">{image.titulo}</h4>
                  {image.descripcion && (
                    <p className="text-xs opacity-90">{image.descripcion}</p>
                  )}
                </div>
              </div>

              {/* Botón de eliminar (solo para el propietario) */}
              {isOwner && (
                <button
                  onClick={() => handleDeleteImage(image.id)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-red-600"
                  title="Eliminar imagen"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;
