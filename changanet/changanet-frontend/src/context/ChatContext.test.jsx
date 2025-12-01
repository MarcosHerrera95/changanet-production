/**
 * Tests para ChatContext
 * Cubre: inicialización de Socket.IO, envío de mensajes, manejo de conexiones
 */

import { render, act } from '@testing-library/react';
import { ChatProvider, useChat } from './ChatContext';
import { AuthProvider } from './AuthContext';

// Mock de Socket.IO
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
    removeAllListeners: jest.fn(),
  })),
}));

// Mock de AuthContext
jest.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123', nombre: 'Test User' },
  }),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

// Mock de fetch
global.fetch = jest.fn();

// Mock de localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock de import.meta.env
global.import = {
  meta: {
    env: {
      VITE_BACKEND_URL: 'http://localhost:3003',
    },
  },
};

const io = require('socket.io-client').io;

describe('ChatContext', () => {
  let mockSocket;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSocket = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      connected: true,
      removeAllListeners: jest.fn(),
    };

    io.mockReturnValue(mockSocket);
    localStorageMock.getItem.mockReturnValue('mock-token');
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: { id: 'msg-123', message: 'Test message' } }),
    });
  });

  describe('Inicialización', () => {
    it('debe inicializar Socket.IO cuando hay usuario autenticado', () => {
      render(
        <AuthProvider>
          <ChatProvider>
            <TestComponent />
          </ChatProvider>
        </AuthProvider>
      );

      expect(io).toHaveBeenCalledWith('http://localhost:3003', {
        auth: { token: 'mock-token' },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ['polling', 'websocket'],
        withCredentials: true,
        autoConnect: true,
        debug: false,
      });
    });

    it('no debe inicializar Socket.IO sin usuario', () => {
      // Mock sin usuario
      jest.doMock('./AuthContext', () => ({
        useAuth: () => ({ user: null }),
      }));

      render(
        <AuthProvider>
          <ChatProvider>
            <TestComponent />
          </ChatProvider>
        </AuthProvider>
      );

      expect(io).not.toHaveBeenCalled();
    });

    it('debe unirse a la sala del usuario al conectar', () => {
      render(
        <AuthProvider>
          <ChatProvider>
            <TestComponent />
          </ChatProvider>
        </AuthProvider>
      );

      // Simular evento connect
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
      act(() => {
        connectHandler();
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('join', 'test-user-123');
    });
  });

  describe('Envío de mensajes', () => {
    it('debe enviar mensaje exitosamente', async () => {
      let contextValue;

      render(
        <AuthProvider>
          <ChatProvider>
            <TestComponent onContext={(ctx) => (contextValue = ctx)} />
          </ChatProvider>
        </AuthProvider>
      );

      await act(async () => {
        const result = await contextValue.sendMessage('conv-123', 'Hola mundo');
        expect(result).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3003/api/chat/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            conversationId: 'conv-123',
            message: 'Hola mundo',
            imageUrl: null,
          }),
        })
      );

      expect(mockSocket.emit).toHaveBeenCalledWith('message', {
        conversationId: 'conv-123',
        senderId: 'test-user-123',
        message: 'Hola mundo',
        imageUrl: null,
      });
    });

    it('debe enviar mensaje con imagen', async () => {
      let contextValue;

      render(
        <AuthProvider>
          <ChatProvider>
            <TestComponent onContext={(ctx) => (contextValue = ctx)} />
          </ChatProvider>
        </AuthProvider>
      );

      await act(async () => {
        const result = await contextValue.sendMessage('conv-123', 'Mira esta foto', 'https://example.com/image.jpg');
        expect(result).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            conversationId: 'conv-123',
            message: 'Mira esta foto',
            imageUrl: 'https://example.com/image.jpg',
          }),
        })
      );
    });

    it('debe manejar error al enviar mensaje', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      let contextValue;

      render(
        <AuthProvider>
          <ChatProvider>
            <TestComponent onContext={(ctx) => (contextValue = ctx)} />
          </ChatProvider>
        </AuthProvider>
      );

      await act(async () => {
        const result = await contextValue.sendMessage('conv-123', 'Hola mundo');
        expect(result).toBe(false);
      });
    });

    it('debe rechazar envío sin conexión', async () => {
      mockSocket.connected = false;

      let contextValue;

      render(
        <AuthProvider>
          <ChatProvider>
            <TestComponent onContext={(ctx) => (contextValue = ctx)} />
          </ChatProvider>
        </AuthProvider>
      );

      await act(async () => {
        const result = await contextValue.sendMessage('conv-123', '');
        expect(result).toBe(false);
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Recepción de mensajes', () => {
    it('debe manejar mensajes entrantes via Socket.IO', () => {
      let contextValue;

      render(
        <AuthProvider>
          <ChatProvider>
            <TestComponent onContext={(ctx) => (contextValue = ctx)} />
          </ChatProvider>
        </AuthProvider>
      );

      const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];

      const incomingMessage = {
        id: 'msg-123',
        conversationId: 'conv-123',
        message: 'Mensaje recibido',
        sender: { nombre: 'Otro Usuario' },
      };

      act(() => {
        messageHandler(incomingMessage);
      });

      expect(contextValue.messages['conv-123']).toContain(incomingMessage);
    });
  });

  describe('Marcar como leído', () => {
    it('debe emitir evento markAsRead', () => {
      let contextValue;

      render(
        <AuthProvider>
          <ChatProvider>
            <TestComponent onContext={(ctx) => (contextValue = ctx)} />
          </ChatProvider>
        </AuthProvider>
      );

      act(() => {
        contextValue.markAsRead('conv-123');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('markAsRead', {
        conversationId: 'conv-123',
        userId: 'test-user-123',
      });
    });
  });

  describe('Typing indicators', () => {
    it('debe emitir evento de typing start', () => {
      let contextValue;

      render(
        <AuthProvider>
          <ChatProvider>
            <TestComponent onContext={(ctx) => (contextValue = ctx)} />
          </ChatProvider>
        </AuthProvider>
      );

      act(() => {
        contextValue.emitTyping('user-456');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('typing', {
        from: 'test-user-123',
        to: 'user-456',
        isTyping: true,
      });
    });

    it('debe emitir evento de typing stop', () => {
      let contextValue;

      render(
        <AuthProvider>
          <ChatProvider>
            <TestComponent onContext={(ctx) => (contextValue = ctx)} />
          </ChatProvider>
        </AuthProvider>
      );

      act(() => {
        contextValue.stopTyping('user-456');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('typing', {
        from: 'test-user-123',
        to: 'user-456',
        isTyping: false,
      });
    });
  });

  describe('Carga de historial', () => {
    it('debe cargar historial de mensajes', async () => {
      const mockResponse = {
        messages: [
          { id: 'msg-1', message: 'Mensaje 1' },
          { id: 'msg-2', message: 'Mensaje 2' },
        ],
        pagination: { page: 1, limit: 20, total: 2, pages: 1 },
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      let contextValue;

      render(
        <AuthProvider>
          <ChatProvider>
            <TestComponent onContext={(ctx) => (contextValue = ctx)} />
          </ChatProvider>
        </AuthProvider>
      );

      await act(async () => {
        const result = await contextValue.loadMessageHistory('conv-123', 1, 20);
        expect(result).toEqual(mockResponse);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3003/api/chat/messages/conv-123?page=1&limit=20',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
        })
      );
    });
  });

  describe('Manejo de conexiones', () => {
    it('debe manejar reconexión exitosa', () => {
      render(
        <AuthProvider>
          <ChatProvider>
            <TestComponent />
          </ChatProvider>
        </AuthProvider>
      );

      const reconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'reconnect')[1];

      act(() => {
        reconnectHandler(2);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('join', 'test-user-123');
    });

    it('debe manejar desconexión', () => {
      render(
        <AuthProvider>
          <ChatProvider>
            <TestComponent />
          </ChatProvider>
        </AuthProvider>
      );

      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];

      act(() => {
        disconnectHandler('transport close');
      });

      // Verificar que se registra la desconexión (spy on console.log)
    });
  });

  describe('Limpieza', () => {
    it('debe limpiar conexiones al desmontar', () => {
      const { unmount } = render(
        <AuthProvider>
          <ChatProvider>
            <TestComponent />
          </ChatProvider>
        </AuthProvider>
      );

      unmount();

      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });
});

// Componente de prueba para acceder al contexto
function TestComponent({ onContext }) {
  const chatContext = useChat();

  React.useEffect(() => {
    if (onContext) {
      onContext(chatContext);
    }
  }, [chatContext, onContext]);

  return <div>Test Component</div>;
}
