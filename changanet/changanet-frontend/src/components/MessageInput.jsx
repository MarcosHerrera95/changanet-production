import { useState, useRef, useEffect } from 'react';
import ImageUploadButton from './ImageUploadButton';

const MessageInput = ({
  onSendMessage,
  disabled = false,
  placeholder = "Escribe tu mensaje...",
  maxLength = 500,
  showTypingIndicator = true,
  onTypingStart,
  onTypingStop
}) => {
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Handle typing indicator
  useEffect(() => {
    if (!showTypingIndicator || !onTypingStart || !onTypingStop) return;

    if (message.trim() && !isTyping) {
      setIsTyping(true);
      onTypingStart();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onTypingStop();
      }
    }, 2000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, isTyping, showTypingIndicator, onTypingStart, onTypingStop]);

  // Stop typing when component unmounts
  useEffect(() => {
    return () => {
      if (isTyping && onTypingStop) {
        onTypingStop();
      }
    };
  }, [isTyping, onTypingStop]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (disabled || uploadingImage) return;
    if (!message.trim() && !selectedImage) return;

    try {
      let imageUrl = null;

      // Upload image if selected
      if (selectedImage) {
        setUploadingImage(true);
        // Here you would implement the image upload logic
        // For now, we'll assume the parent component handles this
        imageUrl = await uploadImage(selectedImage);
      }

      // Send message
      const success = await onSendMessage(message.trim(), imageUrl);

      if (success) {
        setMessage('');
        setSelectedImage(null);
        // Stop typing indicator
        if (isTyping && onTypingStop) {
          setIsTyping(false);
          onTypingStop();
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleImageSelect = (file) => {
    setSelectedImage(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  // Placeholder upload function - should be implemented by parent
  const uploadImage = async (file) => {
    // This should be implemented by the parent component
    // For now, return a placeholder URL
    console.log('Uploading file:', file.name);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`uploaded-image-${Date.now()}.jpg`);
      }, 1000);
    });
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      {/* Selected image preview */}
      {selectedImage && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img
                src={URL.createObjectURL(selectedImage)}
                alt="Vista previa"
                className="w-10 h-10 object-cover rounded"
              />
              <div>
                <span className="text-sm text-gray-600 block">{selectedImage.name}</span>
                <span className="text-xs text-gray-500">
                  {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            </div>
            <button
              onClick={removeImage}
              className="text-red-500 hover:text-red-700 p-1"
              aria-label="Remover imagen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <ImageUploadButton
          onImageSelect={handleImageSelect}
          disabled={disabled}
          uploading={uploadingImage}
        />

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={disabled ? "Conectando..." : placeholder}
            disabled={disabled || uploadingImage}
            maxLength={maxLength}
            rows={1}
            className="w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            aria-label="Escribe tu mensaje"
          />

          {/* Character counter */}
          {message.length > maxLength * 0.8 && (
            <div className="absolute -top-6 right-0 text-xs text-gray-500">
              {message.length}/{maxLength}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={disabled || uploadingImage || (!message.trim() && !selectedImage)}
          className="bg-emerald-500 text-white p-3 rounded-full hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
          aria-label="Enviar mensaje"
        >
          {uploadingImage ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </form>

      {/* Typing indicator */}
      {isTyping && showTypingIndicator && (
        <div className="mt-2 text-xs text-gray-500 flex items-center">
          <div className="flex space-x-1 mr-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
          Escribiendo...
        </div>
      )}
    </div>
  );
};

export default MessageInput;
