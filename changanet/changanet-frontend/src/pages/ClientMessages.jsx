/**
 * @page ClientMessages - Lista de conversaciones del cliente
 * @descripción Página para que los clientes vean y gestionen sus conversaciones con profesionales
 * @sprint Sprint 2 – Dashboard y Gestión
 * @tarjeta Nueva funcionalidad: Gestión de mensajes
 * @impacto Social: Mejora la comunicación directa entre clientes y profesionales
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import LoadingSpinner from '../components/LoadingSpinner';

const ClientMessages = () => {
  const { user } = useAuth();
  const { conversations, loadConversations } = useChat();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || (user.role !== 'cliente' && user.rol !== 'cliente')) {
      navigate('/');
      return;
    }

    loadConversations();
    setLoading(false);
  }, [user, navigate, loadConversations]);

  const handleOpenChat = (professionalId) => {
    navigate(`/chat?user=${professionalId}`);
  };

  if (!user || (user.role !== 'cliente' && user.rol !== 'cliente')) {
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
            <h1 className="text-3xl font-bold text-gray-900">Mis Mensajes</h1>
            <p className="mt-2 text-gray-600">
              Comunícate directamente con los profesionales
            </p>
          </div>
        </div>

        {/* Lista de conversaciones */}
        <div className="bg-white rounded-lg shadow">
          {conversations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No tienes conversaciones aún</h3>
              <p className="text-gray-600 mb-4">
                Envía mensajes rápidos desde los perfiles de profesionales para iniciar conversaciones
              </p>
              <button
                onClick={() => navigate('/profesionales')}
                className="bg-[#E30613] text-white px-6 py-2 rounded-lg hover:bg-[#C9050F] transition-colors"
              >
                Explorar Profesionales
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {conversations.map((conversation) => (
                <div
                  key={conversation.professionalId}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleOpenChat(conversation.professionalId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-lg">👤</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {conversation.professionalName}
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

        {/* Información adicional */}
        <div className="mt-6 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">💡 Consejos para una buena comunicación</h3>
          <ul className="text-blue-800 space-y-1">
            <li>• Sé claro sobre el servicio que necesitas</li>
            <li>• Pregunta sobre disponibilidad y tarifas</li>
            <li>• Coordina detalles específicos del trabajo</li>
            <li>• Mantén un tono respetuoso y profesional</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ClientMessages;
