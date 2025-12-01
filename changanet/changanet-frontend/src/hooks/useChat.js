import { useState, useEffect, useCallback } from 'react';
import { useChat as useChatContext } from '../context/ChatContext';

export const useChatHook = (conversationId) => {
  const {
    messages,
    unreadCounts,
    typingUsers,
    sendMessage: contextSendMessage,
    markAsRead: contextMarkAsRead,
    loadMessageHistory,
    isConnected,
    emitTyping: contextEmitTyping,
    stopTyping: contextStopTyping
  } = useChatContext();

  const [localMessages, setLocalMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  // Cargar historial cuando cambia la conversación
  useEffect(() => {
    if (conversationId) {
      loadMessages();
    }
  }, [conversationId]);

  // Actualizar mensajes locales cuando cambian en el contexto
  useEffect(() => {
    if (conversationId && messages[conversationId]) {
      setLocalMessages(messages[conversationId]);
    }
  }, [messages, conversationId]);

  const loadMessages = useCallback(async (cursor = null) => {
    if (!conversationId) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await loadMessageHistory(conversationId, cursor);

      if (result && result.pagination) {
        setPagination(result.pagination);
        setHasMoreMessages(result.pagination.hasMore);
      }
    } catch (err) {
      setError('Error al cargar mensajes');
      console.error('Error loading messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, loadMessageHistory]);

  const sendMessage = useCallback((content, url_imagen = null) => {
    if (!content.trim() || !conversationId || !isConnected) {
      return false;
    }

    try {
      contextSendMessage(conversationId, content.trim(), url_imagen);
      return true;
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Error al enviar mensaje');
      return false;
    }
  }, [conversationId, isConnected, contextSendMessage]);

  const markAsRead = useCallback(() => {
    if (conversationId) {
      contextMarkAsRead(conversationId);
    }
  }, [conversationId, contextMarkAsRead]);

  const loadMoreMessages = useCallback(() => {
    if (pagination && pagination.hasMore && pagination.nextCursor) {
      loadMessages(pagination.nextCursor);
    }
  }, [pagination, loadMessages]);

  const unreadCount = unreadCounts[conversationId] || 0;

  const emitTyping = useCallback(() => {
    if (conversationId && isConnected) {
      contextEmitTyping(conversationId);
    }
  }, [conversationId, isConnected, contextEmitTyping]);

  const stopTyping = useCallback(() => {
    if (conversationId && isConnected) {
      contextStopTyping(conversationId);
    }
  }, [conversationId, isConnected, contextStopTyping]);

  return {
    messages: localMessages,
    unreadCount,
    isLoading,
    error,
    isConnected,
    typingUsers: typingUsers[conversationId] || [],
    pagination,
    hasMoreMessages,
    sendMessage,
    markAsRead,
    loadMoreMessages,
    emitTyping,
    stopTyping
  };
};
