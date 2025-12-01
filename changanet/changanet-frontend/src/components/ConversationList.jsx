import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import ErrorAlert from './ErrorAlert';

const ConversationList = ({ onSelectConversation, selectedConversationId }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('changanet_token');
      const apiBaseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003';

      const response = await fetch(`${apiBaseUrl}/api/chat/conversations/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error al cargar conversaciones: ${response.status}`);
      }

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Error al cargar las conversaciones');
    } finally {
      setLoading(false);
    }
  };

  const formatLastMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const truncateMessage = (message, maxLength = 50) => {
    if (!message) return '';
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <LoadingSpinner size="sm" />
        <span className="ml-2 text-gray-600">Cargando conversaciones...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorAlert message={error} />
        <button
          onClick={loadConversations}
          className="mt-2 w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 bg-emerald-500 text-white">
        <h2 className="text-lg font-semibold">Conversaciones</h2>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="text-4xl mb-2">💬</div>
            <p>No tienes conversaciones aún</p>
            <p className="text-sm mt-1">Inicia una conversación contactando a un profesional</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onSelectConversation(conversation)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedConversationId === conversation.id ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''
              }`}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectConversation(conversation);
                }
              }}
              aria-label={`Conversación con ${conversation.otherUser.nombre}`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {conversation.otherUser.url_foto_perfil ? (
                    <img
                      src={conversation.otherUser.url_foto_perfil}
                      alt={`Foto de ${conversation.otherUser.nombre}`}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        {conversation.otherUser.nombre.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {conversation.otherUser.nombre}
                    </h3>
                    {conversation.lastMessage && (
                      <span className="text-xs text-gray-500">
                        {formatLastMessageTime(conversation.lastMessage.created_at)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.lastMessage ? (
                        <>
                          {conversation.lastMessage.image_url && (
                            <span className="text-emerald-600">📷 </span>
                          )}
                          {truncateMessage(conversation.lastMessage.message)}
                        </>
                      ) : (
                        <span className="text-gray-400 italic">Sin mensajes</span>
                      )}
                    </p>

                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      conversation.otherUser.rol === 'profesional'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {conversation.otherUser.rol === 'profesional' ? 'Pro' : 'Cliente'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;
