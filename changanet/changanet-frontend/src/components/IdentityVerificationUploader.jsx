/**
 * @component IdentityVerificationUploader - Componente para subir documentos de verificación
 * @descripción Drag & drop para documentos (frontal + reverso), subida con presigned URL, validación MIME, límite tamaño
 * @sprint Sprint 3 – Verificación de Identidad y Reputación
 * @tarjeta Implementar Sistema de Verificación de Identidad
 * @impacto Seguridad: Aumenta la confianza mediante verificación de documentos
 */

import { useState, useRef } from 'react';
import { useFileUpload } from '../hooks/useFileUpload';
import { useVerification } from '../hooks/useVerification';

const IdentityVerificationUploader = ({ onSuccess, onClose }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const { submitVerification } = useVerification();

  // Hook para documento frontal
  const frontalUpload = useFileUpload({
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    onFileSelect: (file) => console.log('Documento frontal seleccionado:', file.name),
    onError: (error) => console.error('Error en documento frontal:', error)
  });

  // Hook para documento reverso
  const reversoUpload = useFileUpload({
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    onFileSelect: (file) => console.log('Documento reverso seleccionado:', file.name),
    onError: (error) => console.error('Error en documento reverso:', error)
  });

  const handleSubmit = async () => {
    if (!frontalUpload.files) {
      alert('Debes subir el documento frontal');
      return;
    }

    setUploading(true);
    try {
      // Subir documentos con presigned URLs
      const uploadPromises = [];

      // Documento frontal
      if (frontalUpload.files) {
        const presignedUrlFrontal = await submitVerification.getPresignedUrl(
          `frontal-${Date.now()}-${frontalUpload.files.name}`,
          frontalUpload.files.type
        );
        uploadPromises.push(
          frontalUpload.uploadWithPresignedUrl(presignedUrlFrontal, frontalUpload.files)
            .then(() => ({ type: 'frontal', url: presignedUrlFrontal.split('?')[0] }))
        );
      }

      // Documento reverso (opcional)
      if (reversoUpload.files) {
        const presignedUrlReverso = await submitVerification.getPresignedUrl(
          `reverso-${Date.now()}-${reversoUpload.files.name}`,
          reversoUpload.files.type
        );
        uploadPromises.push(
          reversoUpload.uploadWithPresignedUrl(presignedUrlReverso, reversoUpload.files)
            .then(() => ({ type: 'reverso', url: presignedUrlReverso.split('?')[0] }))
        );
      }

      const uploadResults = await Promise.all(uploadPromises);

      // Crear FormData con URLs de los documentos
      const formData = new FormData();
      uploadResults.forEach(result => {
        formData.append(`documento_${result.type}`, result.url);
      });

      // Enviar solicitud de verificación
      await submitVerification.submitVerification(formData);

      if (onSuccess) {
        onSuccess();
      }

      if (onClose) {
        setTimeout(() => onClose(), 2000);
      }

    } catch (error) {
      console.error('Error al subir documentos:', error);
      alert('Error al enviar la solicitud de verificación. Intenta nuevamente.');
    } finally {
      setUploading(false);
    }
  };

  const FileUploadArea = ({ title, uploadHook, required = false }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {title} {required && <span className="text-red-500">*</span>}
      </label>

      {!uploadHook.files ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
          onDrop={uploadHook.handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById(`file-input-${title.replace(/\s+/g, '-').toLowerCase()}`).click()}
        >
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-900">
              Arrastra y suelta tu documento aquí
            </p>
            <p className="text-sm text-gray-500">
              o <span className="text-blue-600 hover:text-blue-500">haz clic para seleccionar</span>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              JPG, PNG o PDF hasta 5MB
            </p>
          </div>
          <input
            id={`file-input-${title.replace(/\s+/g, '-').toLowerCase()}`}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={uploadHook.handleFileInput}
          />
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">{uploadHook.files.name}</p>
                <p className="text-sm text-gray-500">
                  {(uploadHook.files.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => uploadHook.removeFile()}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Eliminar
            </button>
          </div>

          {uploadHook.previews && (
            <div className="mt-4">
              <img
                src={uploadHook.previews}
                alt="Vista previa"
                className="max-w-xs max-h-32 object-contain border border-gray-200 rounded"
              />
            </div>
          )}
        </div>
      )}

      {uploadHook.error && (
        <p className="text-sm text-red-600">{uploadHook.error}</p>
      )}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Subir Documentos de Identidad</h2>
        <p className="text-gray-600 mt-2">
          Sube fotos claras de tu documento de identidad (frontal y reverso si aplica)
        </p>
      </div>

      <div className="space-y-6">
        {/* Documento Frontal */}
        <FileUploadArea
          title="Documento Frontal"
          uploadHook={frontalUpload}
          required={true}
        />

        {/* Documento Reverso */}
        <FileUploadArea
          title="Documento Reverso"
          uploadHook={reversoUpload}
          required={false}
        />

        {/* Información adicional */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-800">Requisitos para la verificación</h3>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                <li>• Documento debe estar vigente</li>
                <li>• Fotos nítidas y legibles</li>
                <li>• Sin reflejos ni sombras</li>
                <li>• Procesamiento en 24-48 horas</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-4">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={uploading}
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading || !frontalUpload.files}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            {uploading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Subiendo...
              </div>
            ) : (
              'Enviar para Verificación'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdentityVerificationUploader;
