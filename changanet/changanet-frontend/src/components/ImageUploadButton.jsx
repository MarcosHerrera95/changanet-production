import { useRef } from 'react';

const ImageUploadButton = ({
  onImageSelect,
  disabled = false,
  uploading = false,
  className = ''
}) => {
  const fileInputRef = useRef(null);

  const handleClick = () => {
    if (!disabled && !uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona solo archivos de imagen (JPG, PNG, GIF, WebP)');
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert('La imagen no puede ser mayor a 10MB');
        return;
      }

      onImageSelect(file);
    }

    // Reset input value to allow selecting the same file again
    event.target.value = '';
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        aria-label="Seleccionar imagen"
      />

      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || uploading}
        className={`p-3 rounded-full transition-all duration-200 flex items-center justify-center ${
          disabled || uploading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
        } ${className}`}
        aria-label={uploading ? 'Subiendo imagen...' : 'Adjuntar imagen'}
        title={uploading ? 'Subiendo imagen...' : 'Adjuntar imagen'}
      >
        {uploading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )}
      </button>
    </>
  );
};

export default ImageUploadButton;
