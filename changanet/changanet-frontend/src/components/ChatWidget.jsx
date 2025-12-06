import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import { useChatHook } from '../hooks/useChat';

const ChatWidget = ({ conversationId: initialConversationId }) => {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState(null);

  // Use the conversation ID passed as prop or the selected one
  const activeConversationId = initialConversationId || selectedConversation?.id;

  const {
    messages,
    isLoading,
    error,
    isConnected,
    typingUsers,
    hasMoreMessages,
    sendMessage,
    markAsRead,
    loadMoreMessages
  } = useChatHook(activeConversationId);

  // If initialConversationId is provided, load that specific conversation
  useEffect(() => {
    if (initialConversationId && user) {
      loadSpecificConversation(initialConversationId);
    }
  }, [initialConversationId, user]);

  const loadSpecificConversation = async (conversationId) => {
    try {
      const token = localStorage.getItem('changanet_token');
      const apiBaseUrl = import.meta.env.VITE_BACKEND_URL || 'https://changanet-production-backend.onrender.com';

      // Forzar el uso de la URL de backend proporcionada si la variable no está definida
      const backendUrl = apiBaseUrl || 'https://changanet-production-backend.onrender.com';

      const response = await fetch(`${backendUrl}/api/chat/conversation/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('La respuesta del backend no es JSON. Verifica autenticación y backend.');
          return;
        }
        setSelectedConversation({
          id: data.id,
          otherUser: data.usuario1_id === user.id ? data.usuario2 : data.usuario1,
          lastMessage: null,
          updated_at: data.updated_at
        });
      }
    } catch (error) {
      console.error('Error loading specific conversation:', error);
    }
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
  };

  const handleSendMessage = async (conversationId, content, imageUrl) => {
    return await sendMessage(content, imageUrl);
  };

  // If conversationId is provided as prop, show only the chat window
  if (initialConversationId) {
    return (
      <div className="h-full">
        <ChatWindow
          conversation={selectedConversation}
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          error={error}
          isConnected={isConnected}
          typingUsers={typingUsers}
          onMarkAsRead={markAsRead}
          onLoadMoreMessages={loadMoreMessages}
          hasMoreMessages={hasMoreMessages}
        />
      </div>
    );
  }

  // Otherwise, show the full chat interface with conversation list and chat window
  return (
    <div className="h-full flex">
      {/* Conversation List Sidebar */}
      <div className="w-80 border-r border-gray-200 flex-shrink-0">
        <ConversationList
          onSelectConversation={handleSelectConversation}
          selectedConversationId={selectedConversation?.id}
        />
      </div>

      {/* Chat Window */}
      <div className="flex-1">
        <ChatWindow
          conversation={selectedConversation}
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          error={error}
          isConnected={isConnected}
          typingUsers={typingUsers}
          onMarkAsRead={markAsRead}
          onLoadMoreMessages={loadMoreMessages}
          hasMoreMessages={hasMoreMessages}
        />
      </div>
    </div>
  );
};

export default ChatWidget;
