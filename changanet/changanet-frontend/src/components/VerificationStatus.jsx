/**
 * @component VerificationStatus - Componente para mostrar estado de verificación
 * @descripción Muestra estado (pendiente/aprobado/rechazado), barra de progreso, notas de admin si rechazado
 * @sprint Sprint 3 – Verificación de Identidad y Reputación
 * @tarjeta Implementar Sistema de Verificación de Identidad
 * @impacto Confianza: Informa al usuario sobre el estado de su verificación
 */

import { useVerification } from '../hooks/useVerification';

const VerificationStatus = ({ showDetails = true, compact = false }) => {
  const { verificationStatus, loading, refreshStatus } = useVerification();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando estado...</span>
      </div>
    );
  }

  if (!verificationStatus) {
    return (
      <div className="text-center py-8">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 00-2 2v10a2 2 0 002 2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 001.414 0l5.414-5.414a1 1 0 01.707-.293H33a2 2 0 002-2V13a2 2 0 00-2-2h-5M9 12V9a3 3 0 013-3h6a3 3 0 013 3v3" />
        </svg>
        <p className="mt-2 text-gray-600">No has solicitado verificación aún</p>
      </div>
    );
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending':
        return {
          color: 'yellow',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          icon: '⏳',
          title: 'Verificación Pendiente',
          description: 'Tu solicitud está siendo revisada por nuestro equipo.',
          progress: 50
        };
      case 'approved':
        return {
          color: 'green',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          icon: '✅',
          title: 'Verificación Aprobada',
          description: '¡Felicitaciones! Tu identidad ha sido verificada.',
          progress: 100
        };
      case 'rejected':
        return {
          color: 'red',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          icon: '❌',
          title: 'Verificación Rechazada',
          description: 'Tu solicitud fue rechazada. Revisa las notas del administrador.',
          progress: 100
        };
      default:
        return {
          color: 'gray',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          icon: '❓',
          title: 'Estado Desconocido',
          description: 'No se pudo determinar el estado de verificación.',
          progress: 0
        };
    }
  };

  const config = getStatusConfig(verificationStatus.status);

  if (compact) {
    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
        <span className="mr-2">{config.icon}</span>
        {config.title}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-6 ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">{config.icon}</div>
          <div>
            <h3 className={`text-lg font-semibold ${config.textColor}`}>
              {config.title}
            </h3>
            <p className={`text-sm ${config.textColor} opacity-75 mt-1`}>
              {config.description}
            </p>

            {verificationStatus.submittedAt && (
              <p className="text-xs text-gray-500 mt-2">
                Solicitado el {new Date(verificationStatus.submittedAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}

            {verificationStatus.reviewedAt && (
              <p className="text-xs text-gray-500">
                Revisado el {new Date(verificationStatus.reviewedAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={refreshStatus}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Actualizar estado"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Barra de progreso */}
      <div className="mt-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progreso de verificación</span>
          <span>{config.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              config.color === 'green' ? 'bg-green-500' :
              config.color === 'yellow' ? 'bg-yellow-500' :
              config.color === 'red' ? 'bg-red-500' : 'bg-gray-500'
            }`}
            style={{ width: `${config.progress}%` }}
          ></div>
        </div>
      </div>

      {/* Notas del administrador (solo si rechazado) */}
      {verificationStatus.status === 'rejected' && verificationStatus.adminNotes && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">Notas del administrador:</p>
              <p className="text-sm text-red-700 mt-1">{verificationStatus.adminNotes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Información adicional */}
      {showDetails && verificationStatus.status === 'pending' && (
        <div className="mt-4 text-sm text-gray-600">
          <p>• El proceso de verificación suele tomar 24-48 horas</p>
          <p>• Recibirás una notificación cuando se complete la revisión</p>
          <p>• Si tienes preguntas, contacta a nuestro soporte</p>
        </div>
      )}

      {showDetails && verificationStatus.status === 'approved' && (
        <div className="mt-4 text-sm text-green-700">
          <p>• Tu perfil ahora muestra la insignia de "Verificado"</p>
          <p>• Los clientes tendrán mayor confianza en tus servicios</p>
          <p>• Aparecerás destacado en los resultados de búsqueda</p>
        </div>
      )}
    </div>
  );
};

export default VerificationStatus;
