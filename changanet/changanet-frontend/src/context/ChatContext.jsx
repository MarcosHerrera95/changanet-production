import { createContext, useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat debe usarse dentro de ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [typingUsers, setTypingUsers] = useState({}); // Estado para usuarios escribiendo

  useEffect(() => {
    // Habilitar Socket.IO para funcionalidad de chat en tiempo real
    let newSocket = null;
    let isMounted = true; // Flag para prevenir actualizaciones en componentes desmontados
    
    const initializeSocket = async () => {
      if (!user) {
        console.log('❌ No hay usuario autenticado, no inicializando Socket.IO');
        return;
      }

      console.log('🔄 Inicializando Socket.IO para chat en tiempo real...');

      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003';
      const token = localStorage.getItem('changanet_token');
      
      // Validar token antes de conectar
      if (!token) {
        console.warn('⚠️ No hay token de autenticación, conexión limitada');
      } else {
        console.log('🔑 Token encontrado, preparando autenticación');
      }

      // Configuración mejorada de Socket.IO con opciones de reconexión robustas
      const socketConfig = {
        auth: {
          token: token
        },
        // Configuraciones de reconexión mejoradas
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        // Timeout para handshake inicial
        timeout: 20000,
        // Configuraciones de transporte específicas
        transports: ['polling', 'websocket'], // Orden cambiado - polling primero para mayor compatibilidad
        // Configuración de CORS
        withCredentials: true,
        // Auto-conexión después del handshake
        autoConnect: true,
        // Configuraciones de debug
        debug: false // Deshabilitado para producción
      };

      console.log('🔧 Configuración Socket.IO:', {
        url: API_BASE_URL,
        reconnection: socketConfig.reconnection,
        timeout: socketConfig.timeout,
        transports: socketConfig.transports,
        hasToken: !!token
      });

      try {
        newSocket = io(API_BASE_URL, socketConfig);

        // Verificar estado inicial del socket
        if (!isMounted) {
          console.log('🧹 Componente desmontado, cancelando inicialización del socket');
          if (newSocket) {
            newSocket.disconnect();
          }
          return;
        }

        // Manejar conexión exitosa
        newSocket.on('connect', () => {
          if (!isMounted) return;
          
          console.log('✅ Socket.IO conectado exitosamente');
          console.log('🔗 ID de conexión:', newSocket.id);
          setIsConnected(true);
          
          // Unirse a la sala del usuario para recibir mensajes privados
          newSocket.emit('join', user.id);
        });

        // Manejar intento de reconexión
        newSocket.on('reconnect_attempt', (attemptNumber) => {
          if (!isMounted) return;
          console.log(`🔄 Intento de reconexión ${attemptNumber}...`);
        });

        // Manejar reconexión exitosa
        newSocket.on('reconnect', (attemptNumber) => {
          if (!isMounted) return;
          console.log(`✅ Reconectado exitosamente después de ${attemptNumber} intentos`);
          setIsConnected(true);
          
          // Re-unirse a la sala del usuario después de reconectar
          newSocket.emit('join', user.id);
        });

        // Manejar falla de reconexión
        newSocket.on('reconnect_failed', () => {
          if (!isMounted) return;
          console.error('❌ Falló la reconexión después de todos los intentos');
          setIsConnected(false);
        });

        // Manejar desconexión
        newSocket.on('disconnect', (reason) => {
          if (!isMounted) return;
          console.log('⚠️ Socket.IO desconectado:', reason);
          setIsConnected(false);
          
          // No intentar reconectar manualmente, dejar que Socket.IO maneje la reconexión
          if (reason === 'io server disconnect') {
            console.log('🔄 El servidor desconectó el socket - Socket.IO manejará la reconexión');
          } else if (reason === 'transport close') {
            console.log('📡 Conexión de transporte cerrada - puede ser temporal');
          } else if (reason === 'ping timeout') {
            console.log('⏱️ Timeout de ping - la conexión está lenta');
          }
        });

        // Manejar errores de conexión
        newSocket.on('connect_error', (error) => {
          if (!isMounted) return;
          
          console.error('❌ Error de conexión Socket.IO:', {
            message: error.message,
            description: error.description,
            context: error.context,
            type: error.type
          });
          
          // Log específico según el tipo de error
          if (error.type === 'UnauthorizedError') {
            console.warn('🔐 Error de autenticación - token puede ser inválido o expirado');
            // Limpiar token inválido
            localStorage.removeItem('changanet_token');
          } else if (error.type === 'TransportError') {
            console.warn('📡 Error de transporte - puede ser un problema de red');
          } else if (error.type === 'ParseError') {
            console.warn('📄 Error de parsing - posible problema con el servidor');
          }
          
          setIsConnected(false);
        });

        // Manejar recepción de mensajes en tiempo real
        newSocket.on('message', (messageData) => {
          if (!isMounted) return;

          console.log('Mensaje recibido via Socket.IO:', messageData);
          setMessages(prev => ({
            ...prev,
            [messageData.conversationId]: [
              ...(prev[messageData.conversationId] || []),
              messageData
            ]
          }));
        });

        // Manejar actualizaciones de estado de mensajes
        newSocket.on('messageStatusUpdate', ({ conversationId, messageId, status }) => {
          if (!isMounted) return;

          setMessages(prev => ({
            ...prev,
            [conversationId]: (prev[conversationId] || []).map(msg =>
              msg.id === messageId ? { ...msg, status } : msg
            )
          }));
        });

        // Manejar confirmación de mensajes marcados como leídos
        newSocket.on('messagesRead', ({ conversationId, userId }) => {
          if (!isMounted) return;

          // Actualizar estado de mensajes a 'read' para el usuario que los leyó
          setMessages(prev => ({
            ...prev,
            [conversationId]: (prev[conversationId] || []).map(msg =>
              msg.sender_id !== userId ? { ...msg, status: 'read' } : msg
            )
          }));
        });

        // Manejar eventos de typing (usando setTypingUsers para evitar el warning)
        newSocket.on('userTyping', ({ from, isTyping }) => {
          if (!isMounted) return;

          setTypingUsers(prev => {
            const newTypingUsers = { ...prev };
            if (isTyping) {
              newTypingUsers[from] = true;
            } else {
              delete newTypingUsers[from];
            }
            return newTypingUsers;
          });
        });

        // Manejar errores generales del socket
        newSocket.on('error', (error) => {
          if (!isMounted) return;
          console.error('❌ Error general del Socket.IO:', error);
        });

        // Verificar si el componente sigue montado antes de setear el socket
        if (isMounted) {
          setSocket(newSocket);
        }

      } catch (error) {
        console.error('❌ Error creando socket:', error);
        if (isMounted) {
          setIsConnected(false);
        }
      }
    };

    // Ejecutar inicialización
    initializeSocket();

    // Cleanup mejorado
    return () => {
      console.log('🧹 Cerrando conexión Socket.IO - cleanup');
      isMounted = false; // Marcar como desmontado
      
      if (newSocket) {
        try {
          // Remover todos los listeners primero
          newSocket.removeAllListeners();
          
          // Solo desconectar si el socket existe y está conectado
          if (newSocket.connected) {
            newSocket.disconnect();
          } else {
            console.log('ℹ️ Socket ya estaba desconectado');
          }
        } catch (error) {
          console.warn('⚠️ Error durante cleanup del socket:', error.message);
        }
      }
    };
  }, [user]); // Solo dependencia en user para evitar dependencia circular

  const sendMessage = async (conversationId, contenido, url_imagen = null) => {
    try {
      const token = localStorage.getItem('changanet_token');
      if (!token) {
        throw new Error('Usuario no autenticado');
      }

      const apiBaseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003';

      const response = await fetch(`${apiBaseUrl}/api/chat/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId,
          message: contenido,
          imageUrl: url_imagen
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.message) {
          // Emitir mensaje via Socket.IO si está conectado
          if (socket && isConnected) {
            socket.emit('message', {
              conversationId,
              senderId: user.id,
              message: contenido,
              imageUrl: url_imagen
            });
          }

          // Agregar el mensaje localmente
          setMessages(prev => ({
            ...prev,
            [conversationId]: [
              ...(prev[conversationId] || []),
              data.message
            ]
          }));
        }
        return true;
      } else {
        console.error('Error enviando mensaje:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      return false;
    }
  };

  const markAsRead = (conversationId) => {
    if (socket && isConnected && user) {
      socket.emit('markAsRead', {
        conversationId,
        userId: user.id
      });
      // Resetear contador local
      setUnreadCounts(prev => ({
        ...prev,
        [conversationId]: 0
      }));
    }
  };

  const emitTyping = (to) => {
    if (socket && isConnected && user) {
      socket.emit('typing', {
        from: user.id,
        to,
        isTyping: true
      });
    }
  };

  const stopTyping = (to) => {
    if (socket && isConnected && user) {
      socket.emit('typing', {
        from: user.id,
        to,
        isTyping: false
      });
    }
  };

  const loadMessageHistory = async (conversationId, cursor = null, limit = 20) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003';
      const params = new URLSearchParams({ limit: limit.toString() });
      if (cursor) params.append('cursor', cursor);

      const response = await fetch(`${apiBaseUrl}/api/chat/messages/${conversationId}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.messages) {
          // Reverse messages to show oldest first, then newest
          const reversedMessages = [...data.messages].reverse();

          setMessages(prev => ({
            ...prev,
            [conversationId]: cursor
              ? [...(prev[conversationId] || []), ...reversedMessages]
              : reversedMessages
          }));

          return {
            messages: data.messages,
            pagination: data.pagination
          };
        }
      }
    } catch (error) {
      console.error('Error al cargar historial de mensajes:', error);
      throw error;
    }
  };

  const value = {
    socket,
    isConnected,
    messages,
    unreadCounts,
    typingUsers,
    sendMessage,
    markAsRead,
    loadMessageHistory,
    emitTyping,
    stopTyping
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export { ChatContext };
