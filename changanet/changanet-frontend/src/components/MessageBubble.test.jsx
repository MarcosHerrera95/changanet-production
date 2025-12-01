/**
 * Tests para MessageBubble component
 * Cubre: renderizado de mensajes, timestamps, estados, imágenes
 */

import { render, screen } from '@testing-library/react';
import MessageBubble from './MessageBubble';

// Mock de window.open para tests de imágenes
global.window.open = jest.fn();

describe('MessageBubble', () => {
  const mockMessage = {
    id: 'msg-1',
    message: 'Hola mundo',
    image_url: null,
    status: 'sent',
    created_at: '2023-01-01T12:00:00Z',
    sender: {
      id: 'user-1',
      nombre: 'Juan Pérez',
    },
  };

  const mockOwnMessage = {
    ...mockMessage,
    sender: { id: 'current-user', nombre: 'Yo' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Renderizado básico', () => {
    it('debe renderizar mensaje recibido correctamente', () => {
      render(<MessageBubble message={mockMessage} isOwn={false} />);

      expect(screen.getByText('Hola mundo')).toBeInTheDocument();
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      // El timestamp se formatea según la locale del navegador
      expect(screen.getByText(/^\d{1,2}:\d{2}/)).toBeInTheDocument();
    });

    it('debe renderizar mensaje propio correctamente', () => {
      render(<MessageBubble message={mockOwnMessage} isOwn={true} />);

      expect(screen.getByText('Hola mundo')).toBeInTheDocument();
      // El timestamp se formatea según la locale del navegador
      expect(screen.getByText(/^\d{1,2}:\d{2}/)).toBeInTheDocument();
      // No debería mostrar el nombre del remitente para mensajes propios
      expect(screen.queryByText('Yo')).not.toBeInTheDocument();
    });

    it('debe aplicar estilos correctos para mensajes recibidos', () => {
      const { container } = render(<MessageBubble message={mockMessage} isOwn={false} />);

      const bubble = container.querySelector('[role="article"]');
      expect(bubble).toHaveClass('bg-white', 'text-gray-800', 'border', 'border-gray-200', 'rounded-bl-sm');
    });

    it('debe aplicar estilos correctos para mensajes propios', () => {
      const { container } = render(<MessageBubble message={mockOwnMessage} isOwn={true} />);

      const bubble = container.querySelector('[role="article"]');
      expect(bubble).toHaveClass('bg-emerald-500', 'text-white', 'rounded-br-sm');
    });
  });

  describe('Timestamps', () => {
    it('debe formatear timestamp correctamente', () => {
      // Los timestamps se formatean según la locale del navegador
      // Solo verificamos que se muestre algún formato de hora
      const messageWithTime = { ...mockMessage, created_at: '2023-01-01T12:00:00Z' };
      render(<MessageBubble message={messageWithTime} isOwn={false} />);

      expect(screen.getByText(/^\d{1,2}:\d{2}/)).toBeInTheDocument();
    });

    it('debe mostrar timestamp en mensajes propios', () => {
      render(<MessageBubble message={mockOwnMessage} isOwn={true} />);

      expect(screen.getByText(/^\d{1,2}:\d{2}/)).toBeInTheDocument();
    });
  });

  describe('Estados de mensaje', () => {
    it('debe mostrar íconos de estado correctos', () => {
      const statusCases = [
        { status: 'sent', expected: '✓' },
        { status: 'delivered', expected: '✓✓' },
        { status: 'read', expected: '✓✓' },
      ];

      statusCases.forEach(({ status, expected }) => {
        const { container } = render(<MessageBubble message={{ ...mockOwnMessage, status }} isOwn={true} />);

        const statusIcon = container.querySelector('.text-emerald-100 span:last-child');
        expect(statusIcon).toHaveTextContent(expected);
      });
    });

    it('debe aplicar colores correctos a los estados', () => {
      const { container } = render(
        <MessageBubble message={{ ...mockOwnMessage, status: 'read' }} isOwn={true} />
      );

      const statusElement = container.querySelector('.text-blue-500');
      expect(statusElement).toBeInTheDocument();
      expect(statusElement).toHaveTextContent('✓✓');
    });

    it('no debe mostrar estado en mensajes recibidos', () => {
      render(<MessageBubble message={mockMessage} isOwn={false} />);

      expect(screen.queryByText('✓')).not.toBeInTheDocument();
      expect(screen.queryByText('✓✓')).not.toBeInTheDocument();
    });

    it('debe ocultar estado cuando showStatus es false', () => {
      render(<MessageBubble message={mockOwnMessage} isOwn={true} showStatus={false} />);

      expect(screen.queryByText('✓')).not.toBeInTheDocument();
    });
  });

  describe('Contenido de imágenes', () => {
    it('debe renderizar imagen cuando image_url existe', () => {
      const messageWithImage = {
        ...mockMessage,
        image_url: 'https://example.com/image.jpg',
      };

      render(<MessageBubble message={messageWithImage} isOwn={false} />);

      const img = screen.getByAltText('Imagen del mensaje');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    it('debe abrir imagen en nueva pestaña al hacer clic', () => {
      const messageWithImage = {
        ...mockMessage,
        image_url: 'https://example.com/image.jpg',
      };

      render(<MessageBubble message={messageWithImage} isOwn={false} />);

      const img = screen.getByAltText('Imagen del mensaje');
      img.click();

      expect(window.open).toHaveBeenCalledWith('https://example.com/image.jpg', '_blank');
    });

    it('debe manejar URLs de imágenes', () => {
      const messageWithImage = {
        ...mockMessage,
        image_url: 'https://example.com/image.jpg',
      };

      render(<MessageBubble message={messageWithImage} isOwn={false} />);

      const img = screen.getByAltText('Imagen del mensaje');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    it('debe mostrar imagen con mensaje de texto', () => {
      const messageWithImageAndText = {
        ...mockMessage,
        message: 'Mira esta foto',
        image_url: 'https://example.com/image.jpg',
      };

      render(<MessageBubble message={messageWithImageAndText} isOwn={false} />);

      expect(screen.getByText('Mira esta foto')).toBeInTheDocument();
      expect(screen.getByAltText('Imagen del mensaje')).toBeInTheDocument();
    });
  });

  describe('Accesibilidad', () => {
    it('debe tener atributos de accesibilidad correctos', () => {
      render(<MessageBubble message={mockMessage} isOwn={false} />);

      const article = screen.getByRole('article');
      expect(article).toHaveAttribute('aria-label', 'Mensaje de Juan Pérez');
    });

    it('debe incluir información de estado para lectores de pantalla', () => {
      render(<MessageBubble message={mockOwnMessage} isOwn={true} />);

      const srStatus = screen.getByText('Estado del mensaje: sent');
      expect(srStatus).toHaveClass('sr-only');
    });

    it('debe mostrar iniciales del usuario en avatar', () => {
      render(<MessageBubble message={mockMessage} isOwn={false} />);

      expect(screen.getByText('J')).toBeInTheDocument();
    });
  });

  describe('Avatares', () => {
    it('debe mostrar avatar cuando url_foto_perfil existe', () => {
      const messageWithAvatar = {
        ...mockMessage,
        sender: {
          ...mockMessage.sender,
          url_foto_perfil: 'https://example.com/avatar.jpg',
        },
      };

      render(<MessageBubble message={messageWithAvatar} isOwn={false} />);

      const avatar = screen.getByAltText('Avatar de Juan Pérez');
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('debe mostrar iniciales cuando no hay avatar', () => {
      render(<MessageBubble message={mockMessage} isOwn={false} />);

      expect(screen.getByText('J')).toBeInTheDocument(); // Inicial de "Juan"
    });

    it('debe mostrar "?" para usuarios sin nombre', () => {
      const messageWithoutName = {
        ...mockMessage,
        sender: { id: 'user-1', nombre: null },
      };

      render(<MessageBubble message={messageWithoutName} isOwn={false} />);

      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('no debe mostrar avatar en mensajes propios', () => {
      render(<MessageBubble message={mockOwnMessage} isOwn={true} />);

      expect(screen.queryByAltText(/Avatar/)).not.toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('debe manejar mensajes sin contenido de texto', () => {
      const imageOnlyMessage = {
        ...mockMessage,
        message: '',
        image_url: 'https://example.com/image.jpg',
      };

      render(<MessageBubble message={imageOnlyMessage} isOwn={false} />);

      expect(screen.getByAltText('Imagen del mensaje')).toBeInTheDocument();
      // No debería renderizar el elemento p de texto si el mensaje está vacío
      const textElement = document.querySelector('p.break-words');
      expect(textElement).not.toBeInTheDocument();
    });

    it('debe manejar mensajes muy largos', () => {
      const longMessage = {
        ...mockMessage,
        message: 'A'.repeat(1000),
      };

      render(<MessageBubble message={longMessage} isOwn={false} />);

      const messageElement = screen.getByText('A'.repeat(1000));
      expect(messageElement).toHaveClass('break-words');
    });

    it('debe manejar timestamps inválidos', () => {
      const messageWithInvalidTime = {
        ...mockMessage,
        created_at: 'invalid-date',
      };

      // No debería romper el componente
      expect(() => {
        render(<MessageBubble message={messageWithInvalidTime} isOwn={false} />);
      }).not.toThrow();
    });
  });
});
