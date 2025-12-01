import { useState } from 'react';

const MessageBubble = ({ message, isOwn, showStatus = true }) => {
  const [imageError, setImageError] = useState(false);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      default:
        return '';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
        return 'text-gray-400';
      case 'delivered':
        return 'text-gray-400';
      case 'read':
        return 'text-blue-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl relative ${
          isOwn
            ? 'bg-emerald-500 text-white rounded-br-sm'
            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
        }`}
        role="article"
        aria-label={`Mensaje de ${message.sender?.nombre || 'Usuario'}`}
      >
        {/* Avatar for received messages */}
        {!isOwn && (
          <div className="flex items-start mb-2">
            {message.sender?.url_foto_perfil ? (
              <img
                src={message.sender.url_foto_perfil}
                alt={`Avatar de ${message.sender.nombre}`}
                className="w-6 h-6 rounded-full mr-2 flex-shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center mr-2 flex-shrink-0">
                <span className="text-xs text-gray-600 font-medium">
                  {message.sender?.nombre?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            <span className="text-xs text-gray-500 font-medium">
              {message.sender?.nombre || 'Usuario'}
            </span>
          </div>
        )}

        {/* Image content */}
        {message.image_url && !imageError && (
          <div className="mb-2">
            <img
              src={message.image_url}
              alt="Imagen del mensaje"
              className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.image_url, '_blank')}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          </div>
        )}

        {/* Image error fallback */}
        {message.image_url && imageError && (
          <div className="mb-2 p-3 bg-gray-100 rounded-lg text-center">
            <span className="text-gray-500 text-sm">📷 Imagen no disponible</span>
          </div>
        )}

        {/* Text content */}
        {message.message && (
          <p className="break-words text-sm leading-relaxed">
            {message.message}
          </p>
        )}

        {/* Timestamp and status */}
        <div className={`flex items-center justify-end mt-1 space-x-1 ${
          isOwn ? 'text-emerald-100' : 'text-gray-500'
        }`}>
          <span className="text-xs opacity-75">
            {formatTime(message.created_at)}
          </span>
          {isOwn && showStatus && message.status && (
            <span className={`text-xs ${getStatusColor(message.status)}`}>
              {getStatusIcon(message.status)}
            </span>
          )}
        </div>

        {/* Message status indicator for screen readers */}
        {isOwn && showStatus && message.status && (
          <span className="sr-only">
            Estado del mensaje: {message.status}
          </span>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
