/**
 * Página AdminVerification - Panel de administración para gestionar verificaciones de identidad
 * Solo accesible para usuarios con rol 'admin'
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const AdminVerification = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState(null);

  // Verificar permisos de administrador
  useEffect(() => {
    if (user && user.rol !== 'admin') {
      setError('Acceso denegado. Se requieren permisos de administrador.');
      setLoading(false);
      return;
    }
    loadPendingRequests();
  }, [user]);

  const loadPendingRequests = async () => {
    try {
      const response = await fetch('/api/verification/pending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.data);
      } else {
        setError('Error al cargar solicitudes pendientes');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    await processRequest(requestId, 'approve', 'Solicitud aprobada correctamente');
  };

  const handleReject = async (requestId, comentario) => {
    if (!comentario || comentario.trim() === '') {
      alert('Debe proporcionar un comentario explicando el rechazo');
      return;
    }
    await processRequest(requestId, 'reject', 'Solicitud rechazada correctamente', comentario);
  };

  const processRequest = async (requestId, action, successMessage, comentario = null) => {
    setProcessing(requestId);
    setError(null);

    try {
      const body = comentario ? { comentario } : {};
      const response = await fetch(`/api/verification/${requestId}/${action}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        alert(successMessage);
        // Recargar la lista
        await loadPendingRequests();
      } else {
        setError(data.error || `Error al ${action === 'approve' ? 'aprobar' : 'rechazar'} la solicitud`);
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    } finally {
      setProcessing(null);
    }
  };

  const viewDocument = (documentUrl) => {
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando solicitudes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Panel de Verificación de Identidad</h1>
          <p className="mt-2 text-gray-600">
            Gestiona las solicitudes de verificación de identidad de los profesionales
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay solicitudes pendientes</h3>
            <p className="text-gray-600">Todas las solicitudes han sido procesadas.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {requests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {request.usuario.nombre}
                      </h3>
                      <span className="bg-yellow-100 text-yellow-800 text-sm px-2 py-1 rounded-full">
                        Pendiente
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium">{request.usuario.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Especialidad</p>
                        <p className="font-medium">{request.usuario.perfil_profesional?.especialidad || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Zona de cobertura</p>
                        <p className="font-medium">{request.usuario.perfil_profesional?.zona_cobertura || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Fecha de solicitud</p>
                        <p className="font-medium">
                          {new Date(request.creado_en).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => viewDocument(request.documento_url)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Ver Documento
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-6">
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={processing === request.id}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing === request.id ? 'Procesando...' : 'Aprobar'}
                    </button>

                    <button
                      onClick={() => {
                        const comentario = prompt('Comentario explicando el rechazo:');
                        if (comentario) handleReject(request.id, comentario);
                      }}
                      disabled={processing === request.id}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing === request.id ? 'Procesando...' : 'Rechazar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminVerification;
