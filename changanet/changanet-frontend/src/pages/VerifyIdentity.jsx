import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const VerifyIdentity = () => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Solo se permiten archivos JPG, PNG o PDF');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('El archivo no puede superar los 5MB');
        return;
      }

      setSelectedFile(file);
      setError('');

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setPreview('📄 ' + file.name);
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!selectedFile) {
      setError('Por favor selecciona un documento');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('document', selectedFile);

      const response = await fetch('/api/verification/request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        alert('Documento enviado exitosamente. Será revisado en las próximas 24-48 horas.');
        setSelectedFile(null);
        setPreview('');
      } else {
        setError(data.error || 'Error al enviar documento');
      }
    } catch (err) {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">
            Verificar Identidad
          </h1>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">✅</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Verificación de Identidad
              </h2>
              <p className="text-gray-600">
                Para ofrecer servicios en Changánet, necesitamos verificar tu identidad.
                Sube una foto de tu DNI o documento de identidad.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">
                  Subir Documento de Identidad
                </label>

                {/* File Upload Area */}
                <div
                  onClick={handleUploadClick}
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-300 min-h-[200px] flex flex-col items-center justify-center"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleUploadClick();
                    }
                  }}
                  aria-label="Seleccionar archivo de documento"
                >
                  {preview ? (
                    <div className="space-y-4">
                      {preview.startsWith('data:') ? (
                        <img
                          src={preview}
                          alt="Vista previa del documento"
                          className="max-w-full max-h-32 mx-auto rounded-lg shadow-md"
                        />
                      ) : (
                        <div className="text-4xl">{preview.split(' ')[0]}</div>
                      )}
                      <div className="text-sm text-gray-600">
                        {selectedFile?.name} ({(selectedFile?.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                      <div className="text-emerald-600 font-medium">Haz clic para cambiar el archivo</div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-lg font-medium text-gray-700 mb-1">Arrastra tu documento aquí</div>
                        <div className="text-gray-500">o haz clic para seleccionar</div>
                      </div>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  className="hidden"
                  aria-label="Seleccionar archivo de documento"
                />

                <div className="mt-4 text-sm text-gray-600">
                  <div className="font-medium mb-2">Formatos aceptados:</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Imágenes: JPG, PNG (máx. 5MB)</li>
                    <li>Documentos: PDF (máx. 5MB)</li>
                  </ul>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-2xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <span className="mr-2">📤</span>
                    {selectedFile ? 'Enviar Documento' : 'Seleccionar Documento Primero'}
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 bg-emerald-50 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-800 mb-3">¿Qué documentos aceptamos?</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• DNI (frente y dorso)</li>
                <li>• Pasaporte</li>
                <li>• Licencia de conducir</li>
                <li>• Documento de identidad profesional</li>
              </ul>
              <p className="text-sm text-gray-600 mt-3">
                El proceso de verificación toma 24-48 horas hábiles.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyIdentity;
