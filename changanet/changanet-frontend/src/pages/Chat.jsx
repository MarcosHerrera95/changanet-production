/**
 * @page Chat - Sistema completo de mensajería interna
 * @descripción Chat con lista de conversaciones y ventana de chat integrada
 * @sprint Chat completo con ConversationList y ChatWindow
 * @tarjeta Sistema de mensajería completo con conversaciones
 * @impacto Social: Comunicación completa entre profesionales y clientes
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChatWidget from '../components/ChatWidget';
import BackButton from '../components/BackButton';
import LoadingSpinner from '../components/LoadingSpinner';

const Chat = () => {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Verificar permisos
    if (!user) {
      navigate('/');
      return;
    }

    // Si no hay conversationId, mostrar el chat general con lista de conversaciones
    if (!conversationId) {
      setLoading(false);
      return;
    }

    // Validar formato del conversationId si está presente
    if (conversationId && !isValidConversationId(conversationId)) {
      setError('Formato de conversationId inválido');
      setLoading(false);
      return;
    }

    setLoading(false);
  }, [user, conversationId, navigate]);

  const isValidConversationId = (id) => {
    // Validar formato UUID-UUID
    const parts = id.split('-');
    if (parts.length !== 10) return false;

    const uuid1 = `${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}-${parts[4]}`;
    const uuid2 = `${parts[5]}-${parts[6]}-${parts[7]}-${parts[8]}-${parts[9]}`;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid1) && uuidRegex.test(uuid2);
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Cargando chat..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Volver
            </button>
            <button
              onClick={() => navigate('/chat')}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Ir al Chat General
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <BackButton />
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900">
              {conversationId ? 'Chat Privado' : 'Mensajería Interna'}
            </h1>
            <p className="mt-2 text-gray-600">
              {conversationId
                ? 'Conversación privada con otro usuario'
                : 'Sistema completo de mensajería entre profesionales y clientes'
              }
            </p>
          </div>
        </div>

        {/* Chat Widget */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          <ChatWidget conversationId={conversationId} />
        </div>

        {/* Información del sistema */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Características del Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <span className="text-emerald-600">💬</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Mensajes en Tiempo Real</p>
                <p className="text-sm text-gray-600">WebSocket/Socket.IO</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600">📷</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Imágenes y Archivos</p>
                <p className="text-sm text-gray-600">Subida a Firebase Storage</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600">🔒</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Accesible y Seguro</p>
                <p className="text-sm text-gray-600">WCAG 2.1 y Autenticación</p>
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-emerald-50 rounded-lg">
            <p className="text-sm text-emerald-800">
              🚀 <strong>Sistema Completo:</strong> Conversaciones organizadas, mensajes con estado,
              indicadores de escritura, paginación de historial y reconexión automática.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
