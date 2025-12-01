import { useState, useRef } from 'react';

const ImageUpload = ({
  onImageSelect,
  onImageRemove,
  maxSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  placeholder = 'Seleccionar imagen',
  className = '',
  showPreview = true,
  disabled = false
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!file) return 'No se seleccionó ningún archivo';

    if (!acceptedTypes.includes(file.type)) {
      return 'Tipo de archivo no válido. Solo se permiten imágenes JPG, PNG y WebP';
    }

    if (file.size > maxSize) {
      return `El archivo es demasiado grande. Máximo ${Math.round(maxSize / 1024 / 1024)}MB`;
    }

    return null;
  };

  const handleFileSelect = (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSelectedFile(file);

    // Crear preview
    if (showPreview && file) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    }

    // Notificar al componente padre
    if (onImageSelect) {
      onImageSelect(file);
    }
  };

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onImageRemove) {
      onImageRemove();
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Área de drop/upload */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${isDragOver ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${error ? 'border-red-300 bg-red-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        {previewUrl && showPreview ? (
          <div className="space-y-4">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-48 mx-auto rounded-lg shadow-md object-cover"
            />
            <div className="flex items-center justify-center space-x-2">
              <span className="text-sm text-gray-600">📷</span>
              <span className="text-sm text-gray-700 font-medium">{selectedFile?.name}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl">📷</div>
            <div className="text-gray-600">
              {selectedFile ? selectedFile.name : placeholder}
            </div>
            <div className="text-xs text-gray-500">
              Arrastra y suelta o haz clic para seleccionar
            </div>
          </div>
        )}
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {/* Información adicional */}
      <div className="text-xs text-gray-500 text-center">
        Máximo {Math.round(maxSize / 1024 / 1024)}MB. Formatos: JPG, PNG, WebP
      </div>

      {/* Botón de remover */}
      {selectedFile && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleRemove}
            className="text-red-500 hover:text-red-700 text-sm underline"
            disabled={disabled}
          >
            Remover imagen
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
