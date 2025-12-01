/**
 * @page ProfessionalMessages - Lista de conversaciones del profesional
 * @descripción Página para que los profesionales vean y gestionen sus conversaciones con clientes
 * @sprint Sprint 2 – Dashboard y Gestión
 * @tarjeta Nueva funcionalidad: Gestión de mensajes
 * @impacto Social: Mejora la comunicación directa entre profesionales y clientes
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import LoadingSpinner from '../components/LoadingSpinner';

const ProfessionalMessages = () => {
  const { user } = useAuth();
  const { conversations, loadConversations } = useChat();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || (user.role !== 'profesional' && user.rol !== 'profesional')) {
      navigate('/');
      return;
    }

    loadConversations();
    setLoading(false);
  }, [user, navigate, loadConversations]);

  const handleOpenChat = (clientId) => {
    navigate(`/chat?user=${clientId}`);
  };

  if (!user || (user.role !== 'profesional' && user.rol !== 'profesional')) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Cargando mensajes..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <BackButton />
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900">Mensajes de Clientes</h1>
            <p className="mt-2 text-gray-600">
              Gestiona tus conversaciones con clientes interesados en tus servicios
            </p>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">💬</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Conversaciones</p>
                <p className="text-2xl font-bold text-gray-900">{conversations.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">🔔</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Mensajes no leídos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Respuestas rápidas</p>
                <p className="text-2xl font-bold text-gray-900">Recomendado</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de conversaciones */}
        <div className="bg-white rounded-lg shadow">
          {conversations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No tienes mensajes aún</h3>
              <p className="text-gray-600 mb-4">
                Los clientes te contactarán directamente desde tu perfil profesional
              </p>
              <button
                onClick={() => navigate('/mi-perfil-profesional')}
                className="bg-[#E30613] text-white px-6 py-2 rounded-lg hover:bg-[#C9050F] transition-colors"
              >
                Ver Mi Perfil
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {conversations.map((conversation) => (
                <div
                  key={conversation.clientId}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleOpenChat(conversation.clientId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-lg">👤</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {conversation.clientName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {conversation.lastMessage || 'Sin mensajes aún'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {conversation.lastMessageTime ? new Date(conversation.lastMessageTime).toLocaleString() : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {conversation.unreadCount > 0 && (
                        <span className="bg-[#E30613] text-white text-xs px-2 py-1 rounded-full">
                          {conversation.unreadCount}
                        </span>
                      )}
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Consejos para profesionales */}
        <div className="mt-6 bg-green-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-green-900 mb-2">💡 Consejos para responder mensajes</h3>
          <ul className="text-green-800 space-y-1">
            <li>• Responde lo más rápido posible para mantener el interés del cliente</li>
            <li>• Sé claro sobre tus tarifas y condiciones de servicio</li>
            <li>• Pregunta por detalles específicos del trabajo</li>
            <li>• Mantén un tono profesional y amable</li>
            <li>• Si no puedes atender, sugiere alternativas</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalMessages;
