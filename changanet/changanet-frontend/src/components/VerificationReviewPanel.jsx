/**
 * @component VerificationReviewPanel - Panel admin para revisar solicitudes de verificación
 * @descripción Lista de solicitudes pendientes con botones aprobar/rechazar y notas
 * @sprint Sprint 3 – Verificación de Identidad y Reputación
 * @tarjeta Implementar Panel de Administración de Verificaciones
 * @impacto Seguridad: Permite revisión manual de documentos de identidad
 */

import { useState, useEffect } from 'react';
import { adminVerificationAPI } from '../services/apiService';
import { useApiState } from '../hooks/useApi';

const VerificationReviewPanel = () => {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState(''); // 'approve' or 'reject'

  const { execute: loadRequests, loading: loadingRequests } = useApiState();
  const { execute: reviewRequest, loading: reviewing } = useApiState();

  useEffect(() => {
    fetchRequests();
  }, [currentPage]);

  const fetchRequests = async () => {
    try {
      const data = await loadRequests(() => adminVerificationAPI.getPendingRequests(currentPage, 10));
      setRequests(data.requests || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error loading verification requests:', error);
    }
  };

  const handleReview = async (requestId, action) => {
    try {
      await reviewRequest(() => adminVerificationAPI.reviewRequest(requestId, action, reviewNotes));

      // Actualizar la lista local
      setRequests(prev => prev.filter(req => req.id !== requestId));

      // Cerrar modal y limpiar
      setShowModal(false);
      setSelectedRequest(null);
      setReviewNotes('');
      setModalAction('');

      // Mostrar mensaje de éxito
      alert(`Solicitud ${action === 'approve' ? 'aprobada' : 'rechazada'} exitosamente`);

    } catch (error) {
      console.error('Error reviewing request:', error);
      alert('Error al procesar la solicitud. Intenta nuevamente.');
    }
  };

  const openReviewModal = (request, action) => {
    setSelectedRequest(request);
    setModalAction(action);
    setReviewNotes('');
    setShowModal(true);
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

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Panel de Revisión de Verificaciones</h1>
        <p className="text-gray-600 mt-2">
          Revisa y aprueba solicitudes de verificación de identidad de profesionales
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Aprobadas Hoy</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rechazadas Hoy</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de solicitudes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Solicitudes Pendientes</h2>
        </div>

        {loadingRequests ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 00-2 2v10a2 2 0 002 2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 001.414 0l5.414-5.414a1 1 0 01.707-.293H33a2 2 0 002-2V13a2 2 0 00-2-2h-5M9 12V9a3 3 0 013-3h6a3 3 0 013 3v3" />
            </svg>
            <p className="mt-4 text-gray-600">No hay solicitudes pendientes de revisión</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {requests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-lg font-medium text-gray-700">
                          {request.professional?.nombre?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {request.professional?.nombre || 'Nombre no disponible'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {request.professional?.especialidad || 'Especialidad no disponible'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Solicitado el {formatDate(request.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Ver documentos */}
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      Ver Documentos
                    </button>

                    {/* Aprobar */}
                    <button
                      onClick={() => openReviewModal(request, 'approve')}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                    >
                      ✅ Aprobar
                    </button>

                    {/* Rechazar */}
                    <button
                      onClick={() => openReviewModal(request, 'reject')}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                    >
                      ❌ Rechazar
                    </button>
                  </div>
                </div>

                {/* Documentos preview (si está seleccionado) */}
                {selectedRequest?.id === request.id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Documentos Adjuntos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {request.documentos?.map((doc, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-700">
                            {doc.tipo === 'frontal' ? 'Documento Frontal' : 'Documento Reverso'}
                          </p>
                          <div className="mt-2">
                            <img
                              src={doc.url}
                              alt={`Documento ${doc.tipo}`}
                              className="max-w-full max-h-32 object-contain border border-gray-200 rounded"
                            />
                          </div>
                          <div className="mt-2 flex space-x-2">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              Ver completo
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-700">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmación */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {modalAction === 'approve' ? 'Aprobar' : 'Rechazar'} Verificación
            </h3>

            <p className="text-gray-600 mb-4">
              ¿Estás seguro de que deseas {modalAction === 'approve' ? 'aprobar' : 'rechazar'} la solicitud de verificación de{' '}
              <strong>{selectedRequest.professional?.nombre}</strong>?
            </p>

            {modalAction === 'reject' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas del administrador (obligatorio para rechazos)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Explica el motivo del rechazo..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                  required
                />
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleReview(selectedRequest.id, modalAction)}
                disabled={reviewing || (modalAction === 'reject' && !reviewNotes.trim())}
                className={`px-4 py-2 text-white rounded-lg ${
                  modalAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {reviewing ? 'Procesando...' : (modalAction === 'approve' ? 'Aprobar' : 'Rechazar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationReviewPanel;
