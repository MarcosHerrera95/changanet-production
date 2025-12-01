/**
 * @component VerificationManagement - Gestión de Verificaciones para Administradores
 * @descripción Panel para que administradores aprueben/rechacen solicitudes de verificación (REQ-40)
 * @sprint Sprint 3 – Verificación de Identidad y Reputación
 * @tarjeta Tarjeta 10: [Frontend] Implementar Panel de Gestión de Verificaciones
 * @impacto Seguridad: Permite gestión administrativa del sistema de verificación
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNotificationContext } from '../context/NotificationContext';

const VerificationManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const notificationContext = useNotificationContext();
  const [verificationRequests, setVerificationRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    // Verificar si el usuario es administrador
    if (!user || (user.role !== 'admin' && user.rol !== 'admin')) {
      navigate('/');
      return;
    }
    loadVerificationRequests();
  }, [user, navigate, filter]);

  const loadVerificationRequests = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('changanet_token');

      if (!token) {
        setError('No se encontró token de autenticación');
        return;
      }

      const queryParam = filter === 'all' ? '' : `?status=${filter}`;
      const response = await fetch(`/api/verification/requests${queryParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVerificationRequests(data || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al cargar solicitudes de verificación');
      }
    } catch (err) {
      console.error('Error loading verification requests:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationAction = async (requestId, action, adminComment = '') => {
    try {
      setActionLoading(true);
      const token = sessionStorage.getItem('changanet_token');
      const response = await fetch(`/api/verification/${requestId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: action, // 'approve' o 'reject'
          adminComment: adminComment
        })
      });

      if (response.ok) {
        // Enviar notificación de resultado
        if (notificationContext) {
          const isApproved = action === 'approve';
          const request = verificationRequests.find(r => r.id === requestId);
          
          notificationContext.addNotification({
            id: `verification-${action}-${requestId}-${Date.now()}`,
            titulo: isApproved ? '✅ Verificación Aprobada' : '❌ Verificación Rechazada',
            mensaje: isApproved 
              ? `Has aprobado la verificación de ${request?.profesional?.nombre || 'un profesional'}`
              : `Has rechazado la verificación de ${request?.profesional?.nombre || 'un profesional'}`,
            fecha_creacion: new Date().toISOString(),
            leida: false,
            tipo: isApproved ? 'verification_approved' : 'verification_rejected',
            datos: {
              action: 'view_verification_history',
              professionalId: request?.profesional?.id,
              requestId: requestId
            }
          });
        }

        loadVerificationRequests();
        setSelectedRequest(null);
        alert(`Solicitud de verificación ${action === 'approve' ? 'aprobada' : 'rechazada'} exitosamente.`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || `Error al ${action === 'approve' ? 'aprobar' : 'rechazar'} la verificación`);
      }
    } catch (err) {
      console.error('Error processing verification action:', err);
      setError('Error de conexión');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'aprobado':
      case 'aprobada': return 'bg-green-100 text-green-800';
      case 'rechazado':
      case 'rechazada': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente': return 'Pendiente';
      case 'aprobado':
      case 'aprobada': return 'Aprobada';
      case 'rechazado':
      case 'rechazada': return 'Rechazada';
      default: return estado;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user || (user.role !== 'admin' && user.rol !== 'admin')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Verificaciones</h1>
          <p className="mt-2 text-gray-600">
            Administra las solicitudes de verificación de identidad de los profesionales.
          </p>
          <div className="mt-4 flex gap-4">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pendientes ({verificationRequests.filter(r => r.estado === 'PENDIENTE').length})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Aprobadas ({verificationRequests.filter(r => r.estado === 'APROBADO').length})
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Rechazadas ({verificationRequests.filter(r => r.estado === 'RECHAZADO').length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas ({verificationRequests.length})
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
            <button
              onClick={() => setError('')}
              className="ml-2 text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Cargando solicitudes...</span>
          </div>
        )}

        {/* Content */}
        {!loading && (
          <div className="space-y-6">
            {verificationRequests.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  No hay solicitudes de verificación
                </h3>
                <p className="text-gray-600">
                  {filter === 'pending' 
                    ? 'No hay solicitudes pendientes de revisión en este momento.'
                    : `No hay solicitudes con estado "${filter}" en este momento.`
                  }
                </p>
              </div>
            ) : (
              verificationRequests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow p-6">
                  {/* Request Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {request.profesional?.nombre?.charAt(0).toUpperCase() || 'P'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.profesional?.nombre || 'Profesional'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Solicitado el {formatDate(request.fecha_solicitud)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(request.estado)}`}>
                        {getStatusText(request.estado)}
                      </span>
                    </div>
                  </div>

                  {/* Document Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Tipo de Documento</p>
                      <p className="text-gray-900">{request.tipo_documento}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Número de Documento</p>
                      <p className="text-gray-900">{request.numero_documento}</p>
                    </div>
                    {request.nombres && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Nombres</p>
                        <p className="text-gray-900">{request.nombres}</p>
                      </div>
                    )}
                    {request.apellidos && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Apellidos</p>
                        <p className="text-gray-900">{request.apellidos}</p>
                      </div>
                    )}
                  </div>

                  {/* Admin Comment */}
                  {request.comentario_admin && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">Comentario del Administrador:</p>
                      <p className="text-blue-700">{request.comentario_admin}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        {request.fecha_revision && formatDate(request.fecha_revision)}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {request.estado === 'PENDIENTE' && (
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        👁️ Revisar Documento
                      </button>
                      <button
                        onClick={() => handleVerificationAction(request.id, 'approve')}
                        disabled={actionLoading}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
                      >
                        ✅ Aprobar
                      </button>
                      <button
                        onClick={() => handleVerificationAction(request.id, 'reject')}
                        disabled={actionLoading}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
                      >
                        ❌ Rechazar
                      </button>
                    </div>
                  )}

                  {request.estado !== 'PENDIENTE' && request.documento_url && (
                    <div className="pt-4 border-t border-gray-200">
                      <a
                        href={request.documento_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        📄 Ver Documento Original
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Document Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Revisar Documento - {selectedRequest.profesional?.nombre}
                </h2>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Professional Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Información del Profesional</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Nombre:</span>
                    <span className="ml-2 font-medium">{selectedRequest.profesional?.nombre}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-medium">{selectedRequest.profesional?.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Teléfono:</span>
                    <span className="ml-2 font-medium">{selectedRequest.profesional?.telefono}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Especialidad:</span>
                    <span className="ml-2 font-medium">{selectedRequest.profesional?.especialidad}</span>
                  </div>
                </div>
              </div>

              {/* Document Image/PDF */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Documento de Identidad</h3>
                {selectedRequest.documento_url?.includes('.pdf') ? (
                  <div className="border border-gray-200 rounded-lg p-4 text-center">
                    <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-600 mb-4">Documento PDF</p>
                    <a
                      href={selectedRequest.documento_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      📄 Abrir PDF
                    </a>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={selectedRequest.documento_url}
                      alt="Documento de identidad"
                      className="w-full h-auto max-h-96 object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Admin Comment Input */}
              <div className="mb-6">
                <label htmlFor="adminComment" className="block text-sm font-medium text-gray-700 mb-2">
                  Comentario del Administrador (Opcional)
                </label>
                <textarea
                  id="adminComment"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Agregar comentarios sobre la decisión..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    const comment = document.getElementById('adminComment').value;
                    handleVerificationAction(selectedRequest.id, 'approve', comment);
                  }}
                  disabled={actionLoading}
                  className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
                >
                  ✅ Aprobar Verificación
                </button>
                <button
                  onClick={() => {
                    const comment = document.getElementById('adminComment').value;
                    handleVerificationAction(selectedRequest.id, 'reject', comment);
                  }}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
                >
                  ❌ Rechazar Verificación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationManagement;
