import { useState, useRef } from 'react';

/**
 * ImageUploader - Componente para subida de fotos de perfil y portada
 * Cumple con REQ-06: Subir foto de perfil y portada
 */
const ImageUploader = ({ profilePhoto, coverPhoto, onProfilePhotoChange, onCoverPhotoChange }) => {
  const [uploading, setUploading] = useState({ profile: false, cover: false });
  const [errors, setErrors] = useState({ profile: '', cover: '' });
  const profileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const validateFile = (file) => {
    if (!file) return 'Archivo requerido';

    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Solo se permiten archivos JPG, PNG y WebP';
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'El archivo no puede superar los 5MB';
    }

    return null;
  };

  const handleFileSelect = async (file, type) => {
    const error = validateFile(file);
    if (error) {
      setErrors(prev => ({ ...prev, [type]: error }));
      return;
    }

    setErrors(prev => ({ ...prev, [type]: '' }));
    setUploading(prev => ({ ...prev, [type]: true }));

    try {
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewUrl = e.target.result;
        if (type === 'profile') {
          onProfilePhotoChange(file, previewUrl);
        } else {
          onCoverPhotoChange(file, previewUrl);
        }
      };
      reader.readAsDataURL(file);

      // Simular subida exitosa
      setTimeout(() => {
        setUploading(prev => ({ ...prev, [type]: false }));
      }, 1000);

    } catch (error) {
      console.error('Error uploading image:', error);
      setErrors(prev => ({ ...prev, [type]: 'Error al subir la imagen' }));
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleProfilePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file, 'profile');
    }
  };

  const handleCoverPhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file, 'cover');
    }
  };

  const triggerFileSelect = (type) => {
    if (type === 'profile') {
      profileInputRef.current?.click();
    } else {
      coverInputRef.current?.click();
    }
  };

  const removeImage = (type) => {
    if (type === 'profile') {
      onProfilePhotoChange(null, '');
    } else {
      onCoverPhotoChange(null, '');
    }
    setErrors(prev => ({ ...prev, [type]: '' }));
  };

  return (
    <div className="space-y-6">
      {/* Foto de Perfil */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Foto de Perfil
        </label>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-24 h-24 bg-gray-100 rounded-full border-4 border-gray-200 flex items-center justify-center overflow-hidden">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt="Foto de perfil"
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            {uploading.profile && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => triggerFileSelect('profile')}
                disabled={uploading.profile}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {profilePhoto ? 'Cambiar' : 'Subir Foto'}
              </button>
              {profilePhoto && (
                <button
                  type="button"
                  onClick={() => removeImage('profile')}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                >
                  Remover
                </button>
              )}
            </div>
            <input
              ref={profileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePhotoSelect}
              className="hidden"
            />
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG o WebP. Máximo 5MB. Recomendado: 400x400px
            </p>
            {errors.profile && (
              <p className="text-sm text-red-600 mt-1">{errors.profile}</p>
            )}
          </div>
        </div>
      </div>

      {/* Foto de Portada */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Foto de Portada
        </label>
        <div className="space-y-4">
          <div className="relative">
            <div className="w-full h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
              {coverPhoto ? (
                <img
                  src={coverPhoto}
                  alt="Foto de portada"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center">
                  <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-500">Foto de portada opcional</p>
                </div>
              )}
            </div>
            {uploading.cover && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => triggerFileSelect('cover')}
              disabled={uploading.cover}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {coverPhoto ? 'Cambiar Portada' : 'Subir Portada'}
            </button>
            {coverPhoto && (
              <button
                type="button"
                onClick={() => removeImage('cover')}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
              >
                Remover
              </button>
            )}
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverPhotoSelect}
            className="hidden"
          />
          <p className="text-xs text-gray-500">
            JPG, PNG o WebP. Máximo 5MB. Recomendado: 1200x400px
          </p>
          {errors.cover && (
            <p className="text-sm text-red-600">{errors.cover}</p>
          )}
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Consejos para las fotos</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Usa fotos profesionales y bien iluminadas</li>
          <li>• La foto de perfil debe mostrar tu rostro claramente</li>
          <li>• La portada puede mostrar tu trabajo o especialidad</li>
          <li>• Las imágenes se optimizan automáticamente</li>
        </ul>
      </div>
    </div>
  );
};

export default ImageUploader;
