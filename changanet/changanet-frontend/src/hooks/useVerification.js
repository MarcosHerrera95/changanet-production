/**
 * Hook personalizado para manejar el estado de verificación de identidad
 * Incluye estados de carga, errores y notificaciones
 */

import { useState, useEffect, useCallback } from 'react';
import { useNotificationContext } from '../context/NotificationContext';
import { verificationAPI } from '../services/apiService';
import { useApiState } from './useApi';

export const useVerification = () => {
  const notificationContext = useNotificationContext();
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const { execute: executeAPI, error: apiError } = useApiState({
    showErrorToast: true,
    logErrors: true
  });

  // Cargar estado de verificación
  const loadVerificationStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await executeAPI(verificationAPI.getStatus);
      setVerificationStatus(data);
    } catch (err) {
      console.error('Error loading verification status:', err);
    } finally {
      setLoading(false);
    }
  }, [executeAPI]);

  // Enviar solicitud de verificación
  const submitVerification = useCallback(async (formData) => {
    try {
      const data = await executeAPI(() => verificationAPI.submit(formData));

      // Actualizar estado local
      setVerificationStatus({
        ...verificationStatus,
        status: 'pending',
        submittedAt: new Date().toISOString()
      });

      // Enviar notificación
      if (notificationContext) {
        notificationContext.addNotification({
          id: `verification-submitted-${Date.now()}`,
          titulo: '✅ Verificación Enviada',
          mensaje: 'Tu solicitud de verificación ha sido enviada y será revisada dentro de 24-48 horas.',
          fecha_creacion: new Date().toISOString(),
          leida: false,
          tipo: 'verification_submitted',
          datos: {
            action: 'view_verification_status'
          }
        });
      }

      return data;
    } catch (err) {
      throw err;
    }
  }, [executeAPI, verificationStatus, notificationContext]);

  // Obtener URL presigned para subida
  const getPresignedUrl = useCallback(async (fileName, fileType) => {
    try {
      const data = await executeAPI(() => verificationAPI.getPresignedUrl(fileName, fileType));
      return data.presignedUrl;
    } catch (err) {
      throw err;
    }
  }, [executeAPI]);

  // Subir documento con URL presigned
  const uploadDocument = useCallback(async (presignedUrl, file) => {
    try {
      const response = await executeAPI(() => verificationAPI.uploadDocument(presignedUrl, file));
      return response;
    } catch (err) {
      throw err;
    }
  }, [executeAPI]);

  useEffect(() => {
    loadVerificationStatus();
  }, [loadVerificationStatus]);

  return {
    verificationStatus,
    loading,
    error: apiError,
    submitVerification,
    getPresignedUrl,
    uploadDocument,
    refreshStatus: loadVerificationStatus,
    isPending: verificationStatus?.status === 'pending',
    isApproved: verificationStatus?.status === 'approved',
    isRejected: verificationStatus?.status === 'rejected'
  };
};
