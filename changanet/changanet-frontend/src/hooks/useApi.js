/**
 * Hook personalizado para manejar estados de API de forma consistente
 * Proporciona loading, error y data states automáticamente
 * Incluye manejo de errores estandarizado y feedback visual
 */

import { useState, useCallback } from 'react';
import * as Sentry from '@sentry/react';

export const useApiState = (options = {}) => {
  const {
    showErrorToast = true,
    logErrors = true,
    retryOnError = false,
    maxRetries = 2
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleError = useCallback((err, context = {}) => {
    const errorMessage = err.message || err.error || 'Error desconocido';

    // Log error to Sentry if enabled
    if (logErrors && Sentry) {
      Sentry.captureException(err, {
        contexts: {
          api: {
            endpoint: context.endpoint,
            method: context.method,
            retryCount
          }
        },
        tags: {
          component: 'useApiState',
          type: 'api_error'
        }
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', err, context);
    }

    setError(errorMessage);
    return errorMessage;
  }, [logErrors, retryCount]);

  const execute = useCallback(async (apiCall, ...args) => {
    try {
      setLoading(true);
      setError('');

      const result = await apiCall(...args);
      setData(result);
      setRetryCount(0); // Reset retry count on success

      return result;
    } catch (err) {
      const errorMessage = handleError(err, {
        endpoint: apiCall?.name || 'unknown',
        method: 'API_CALL'
      });

      // Auto-retry logic if enabled
      if (retryOnError && retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        console.warn(`Reintentando operación (${retryCount + 1}/${maxRetries})...`);

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));

        return execute(apiCall, ...args);
      }

      throw err; // Re-throw para que el componente pueda manejar si es necesario
    } finally {
      setLoading(false);
    }
  }, [handleError, retryOnError, maxRetries, retryCount]);

  const reset = useCallback(() => {
    setLoading(false);
    setError('');
    setData(null);
    setRetryCount(0);
  }, []);

  const refetch = useCallback(async (apiCall, ...args) => {
    reset();
    return execute(apiCall, ...args);
  }, [reset, execute]);

  return {
    loading,
    error,
    data,
    execute,
    reset,
    refetch,
    retryCount,
    hasError: !!error,
    isRetrying: retryOnError && retryCount > 0
  };
};
