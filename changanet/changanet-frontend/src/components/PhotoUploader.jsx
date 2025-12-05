/**
 * Componente PhotoUploader - Subida de fotos con validación
 * Permite subir múltiples fotos con validación de tipo y tamaño
 */

import { useState, useRef } from 'react';
import { validateImageFile, compressImage } from '../services/budgetRequestService';

const PhotoUploader = ({
  onPhotosChange,
  maxPhotos = 5,
  placeholder = "Haz clic para subir fotos o arrastra y suelta",
  className = ""
}) => {
  const [photos, setPhotos] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  /**
   * Manejar selección de archivos desde input
   */
  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    await processFiles(files);
  };

  /**
   * Manejar drag and drop
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  /**
   * Procesar archivos seleccionados
   */
  const processFiles = async (files) => {
    let newErrors = [];
    if (photos.length + files.length > maxPhotos) {
      newErrors = [`Máximo ${maxPhotos} fotos permitidas`];
      setErrors(newErrors);
      onPhotosChange && onPhotosChange(photos.map(p => p.file), newErrors);
      return;
    }

    setUploading(true);
    setErrors([]);

    const validFiles = [];
    newErrors = [];

    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        newErrors.push(`${file.name}: ${validation.error}`);
        continue;
      }
      try {
        // Comprimir imagen si es necesario
        const compressedFile = await compressImage(file);
        validFiles.push({
          file: compressedFile,
          preview: URL.createObjectURL(compressedFile),
          name: file.name,
          size: compressedFile.size
        });
      } catch (compressionError) {
        console.warn(`Error compressing image ${file.name}:`, compressionError);
        newErrors.push(`${file.name}: Error al procesar la imagen`);
      }
    }

    setErrors(newErrors);
    let newPhotos = photos;
    if (validFiles.length > 0) {
      newPhotos = [...photos, ...validFiles];
      setPhotos(newPhotos);
    }
    onPhotosChange && onPhotosChange(newPhotos.map(p => p.file), newErrors);
    setUploading(false);
  };

  /**
   * Remover foto
   */
  const removePhoto = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setErrors([]);
    onPhotosChange && onPhotosChange(newPhotos.map(p => p.file), []);
    // Limpiar URLs de preview para liberar memoria
    URL.revokeObjectURL(photos[index].preview);
  };

  /**
   * Abrir selector de archivos
   */
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  /**
   * Formatear tamaño de archivo
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`photo-uploader ${className}`}>
      {/* Área de drop */}
      <div
        className={`upload-area border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileSelector}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            openFileSelector();
          }
        }}
        aria-label="Subir fotos del trabajo"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Seleccionar fotos"
        />

        {uploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
            <p className="text-gray-600">Procesando imágenes...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <svg
              className="w-12 h-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-gray-600 mb-2">{placeholder}</p>
            <p className="text-sm text-gray-500">
              Máximo {maxPhotos} fotos • JPG, PNG, WebP • Hasta 5MB cada una
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {photos.length}/{maxPhotos} fotos seleccionadas
            </p>
          </div>
        )}
      </div>

      {/* Errores */}
      {errors.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800 font-medium">Errores en la subida:</span>
          </div>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview de fotos */}
      {photos.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Fotos seleccionadas ({photos.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={photo.preview}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(index);
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  aria-label={`Remover foto ${index + 1}`}
                >
                  ×
                </button>
                <div className="mt-1 text-xs text-gray-500 truncate" title={photo.name}>
                  {photo.name}
                </div>
                <div className="text-xs text-gray-400">
                  {formatFileSize(photo.size)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
