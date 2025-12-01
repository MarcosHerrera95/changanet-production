import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import LoadingSpinner from './LoadingSpinner';
import ErrorAlert from './ErrorAlert';

const ChatWindow = ({
  conversation,
  messages = [],
  onSendMessage,
  isLoading = false,
  error = null,
  isConnected = false,
  typingUsers = [],
  onMarkAsRead,
  onLoadMoreMessages,
  hasMoreMessages = false,
  isLoadingMore = false
}) => {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldScrollToBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldScrollToBottom]);

  // Mark messages as read when conversation changes
  useEffect(() => {
    if (conversation && onMarkAsRead) {
      onMarkAsRead();
    }
  }, [conversation, onMarkAsRead]);

  // Handle scroll to detect if user is at bottom
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setShouldScrollToBottom(isAtBottom);
    }
  };

  // Load more messages when scrolling to top
  const handleLoadMore = () => {
    if (hasMoreMessages && !isLoadingMore && onLoadMoreMessages) {
      onLoadMoreMessages();
    }
  };

  const handleSendMessage = async (content, imageUrl) => {
    if (!conversation || !onSendMessage) return false;

    try {
      const success = await onSendMessage(conversation.id, content, imageUrl);
      if (success) {
        setShouldScrollToBottom(true); // Scroll to bottom after sending
      }
      return success;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  };

  const handleTypingStart = () => {
    // This would be handled by the parent component via Socket.IO
  };

  const handleTypingStop = () => {
    // This would be handled by the parent component via Socket.IO
  };

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Selecciona una conversación
          </h3>
          <p className="text-gray-500">
            Elige una conversación de la lista para comenzar a chatear
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-emerald-500 text-white p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center">
          {conversation.otherUser?.url_foto_perfil ? (
            <img
              src={conversation.otherUser.url_foto_perfil}
              alt={`Foto de ${conversation.otherUser.nombre}`}
              className="w-10 h-10 rounded-full mr-3"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
              <span className="text-white font-medium">
                {conversation.otherUser?.nombre?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold">
              {conversation.otherUser?.nombre || 'Usuario'}
            </h2>
            <p className="text-sm opacity-90">
              {conversation.otherUser?.rol === 'profesional' ? 'Profesional' : 'Cliente'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-300' : 'bg-red-300'}`}></div>
          <span className="text-sm">
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-50 min-h-0"
        onScroll={handleScroll}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size="lg" message="Cargando mensajes..." />
          </div>
        ) : error ? (
          <div className="p-4">
            <ErrorAlert message={error} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No hay mensajes aún
              </h3>
              <p className="text-gray-500">
                ¡Inicia la conversación enviando el primer mensaje!
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Load More Button */}
            {hasMoreMessages && (
              <div className="text-center mb-4">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="bg-white text-emerald-600 px-4 py-2 rounded-lg border border-emerald-200 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? 'Cargando...' : 'Cargar mensajes anteriores'}
                </button>
              </div>
            )}

            {/* Messages List */}
            <div className="space-y-2">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.sender_id === user?.id}
                />
              ))}
            </div>

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex justify-start mt-4">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2 text-sm text-gray-500 flex items-center">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="ml-2 italic">
                    {typingUsers.length === 1
                      ? `${conversation.otherUser?.nombre} está escribiendo...`
                      : 'Varios usuarios están escribiendo...'
                    }
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0">
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={!isConnected || isLoading}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
        />
      </div>
    </div>
  );
};

export default ChatWindow;
