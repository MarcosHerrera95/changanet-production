// src/pages/AdminVerificationPage.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const AdminVerificationPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    loadPendingRequests();
  }, []);

  const loadPendingRequests = async () => {
    try {
      const response = await fetch('/api/admin/verification-requests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.data);
      } else {
        alert('Error al cargar solicitudes pendientes');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    const comentario = prompt('Comentario opcional para la aprobación:');
    setProcessing(requestId);

    try {
      const response = await fetch(`/api/admin/verification/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        },
        body: JSON.stringify({ comentario })
      });

      if (response.ok) {
        alert('Solicitud aprobada correctamente');
        loadPendingRequests();
      } else {
        alert('Error al aprobar la solicitud');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId) => {
    const comentario = prompt('Comentario obligatorio explicando el rechazo:');
    if (!comentario || comentario.trim() === '') {
      alert('Debe proporcionar un comentario explicando el rechazo');
      return;
    }

    setProcessing(requestId);

    try {
      const response = await fetch(`/api/admin/verification/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        },
        body: JSON.stringify({ comentario })
      });

      if (response.ok) {
        alert('Solicitud rechazada correctamente');
        loadPendingRequests();
      } else {
        alert('Error al rechazar la solicitud');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
    } finally {
      setProcessing(null);
    }
  };

  if (user?.rol !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 text-xl">Cargando solicitudes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-black mb-6 text-gradient">
            Panel de Verificación
          </h1>
          <p className="text-gray-600 text-xl font-medium">
            {requests.length} solicitudes pendientes de revisión
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No hay solicitudes pendientes</h2>
            <p className="text-gray-600">Todas las solicitudes han sido revisadas.</p>
          </div>
        ) : (
          <div className="grid gap-6 max-w-4xl mx-auto">
            {requests.map((request) => (
              <div key={request.id} className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <img
                        src={request.usuario.url_foto_perfil || 'https://placehold.co/60x60?text=👤'}
                        alt={`Foto de ${request.usuario.nombre}`}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{request.usuario.nombre}</h3>
                        <p className="text-gray-600">{request.usuario.email}</p>
                        <p className="text-sm text-gray-500">
                          Solicitado el: {new Date(request.creado_en).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-800 mb-2">Documento de Identidad</h4>
                      <a
                        href={request.documento_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Ver Documento
                      </a>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 mt-6 md:mt-0 md:ml-6">
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={processing === request.id}
                      className="bg-emerald-500 text-white px-6 py-3 rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {processing === request.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Procesando...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          Aprobar
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleReject(request.id)}
                      disabled={processing === request.id}
                      className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                      Rechazar
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

export default AdminVerificationPage;
