import { useState } from 'react';

const QuickMessageModal = ({ isOpen, onClose, professionalName, onSendMessage }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;

    setSending(true);
    try {
      // Simulate sending message
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      if (onSendMessage) {
        onSendMessage(message);
      }

      alert('Mensaje enviado exitosamente. El profesional te responderá pronto.');
      setMessage('');
      onClose();
    } catch (error) {
      alert('Error al enviar mensaje. Inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">
              Mensaje Rápido a {professionalName}
            </h2>
            <button
              onClick={onClose}
              className="text-emerald-500 hover:text-emerald-700 text-2xl min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Cerrar modal de mensaje rápido"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <label htmlFor="quick-message" className="block text-gray-700 font-medium mb-2 text-lg">
              ¿Qué necesitas?
            </label>
            <textarea
              id="quick-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 text-gray-700 text-lg min-h-[120px]"
              placeholder="Hola, necesito ayuda con..."
              maxLength={500}
              aria-describedby="message-help"
            />
            <div id="message-help" className="sr-only">
              Escribe un mensaje breve al profesional explicando qué necesitas
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {message.length}/500 caracteres
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
            <div className="flex items-start">
              <span className="text-blue-600 text-xl mr-3">💬</span>
              <div>
                <h4 className="font-semibold text-blue-800 mb-1">Mensaje directo</h4>
                <p className="text-blue-700 text-sm">
                  El profesional recibirá tu mensaje inmediatamente y podrá responderte.
                  Es más rápido que un presupuesto formal.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-2xl hover:bg-gray-300 transition-all duration-300 font-semibold min-h-[44px]"
              disabled={sending}
            >
              Cancelar
            </button>
            <button
              onClick={handleSend}
              disabled={!message.trim() || sending}
              className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl hover:bg-emerald-600 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
              aria-label="Enviar mensaje rápido"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <span className="mr-2">📤</span>
                  Enviar Mensaje
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickMessageModal;
