/**
 * Hook personalizado para manejo de subida de archivos con drag & drop
 * Incluye validación MIME, límites de tamaño y preview
 */

import { useState, useCallback } from 'react';

export const useFileUpload = (options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB por defecto
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    multiple = false,
    onFileSelect = () => {},
    onError = () => {}
  } = options;

  const [files, setFiles] = useState(multiple ? [] : null);
  const [previews, setPreviews] = useState(multiple ? [] : null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const validateFile = useCallback((file) => {
    // Validar tipo MIME
    if (!allowedTypes.includes(file.type)) {
      const errorMsg = `Tipo de archivo no permitido. Solo se permiten: ${allowedTypes.map(type => type.split('/')[1]).join(', ')}`;
      setError(errorMsg);
      onError(errorMsg);
      return false;
    }

    // Validar tamaño
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1);
      const errorMsg = `El archivo es demasiado grande. Máximo ${maxSizeMB}MB`;
      setError(errorMsg);
      onError(errorMsg);
      return false;
    }

    return true;
  }, [allowedTypes, maxSize, onError]);

  const createPreview = useCallback((file) => {
    if (file.type.startsWith('image/')) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    }
    return Promise.resolve(null);
  }, []);

  const processFiles = useCallback(async (fileList) => {
    const validFiles = [];
    const validPreviews = [];

    for (const file of fileList) {
      if (validateFile(file)) {
        validFiles.push(file);
        const preview = await createPreview(file);
        validPreviews.push(preview);
      }
    }

    if (validFiles.length > 0) {
      setError('');
      if (multiple) {
        setFiles(prev => [...(prev || []), ...validFiles]);
        setPreviews(prev => [...(prev || []), ...validPreviews]);
      } else {
        setFiles(validFiles[0]);
        setPreviews(validPreviews[0]);
      }
      onFileSelect(multiple ? validFiles : validFiles[0]);
    }
  }, [validateFile, createPreview, multiple, onFileSelect]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, [processFiles]);

  const handleFileInput = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    processFiles(selectedFiles);
  }, [processFiles]);

  const removeFile = useCallback((index = 0) => {
    if (multiple) {
      setFiles(prev => prev.filter((_, i) => i !== index));
      setPreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      setFiles(null);
      setPreviews(null);
    }
  }, [multiple]);

  const clearFiles = useCallback(() => {
    setFiles(multiple ? [] : null);
    setPreviews(multiple ? [] : null);
    setError('');
  }, [multiple]);

  const uploadWithPresignedUrl = useCallback(async (presignedUrl, file) => {
    setUploading(true);
    try {
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      if (!response.ok) {
        throw new Error('Error al subir el archivo');
      }

      return response;
    } finally {
      setUploading(false);
    }
  }, []);

  return {
    files,
    previews,
    uploading,
    error,
    handleDrop,
    handleFileInput,
    removeFile,
    clearFiles,
    uploadWithPresignedUrl,
    hasFiles: multiple ? (files?.length > 0) : !!files
  };
};
