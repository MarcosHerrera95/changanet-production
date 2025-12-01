/**
 * Pruebas unitarias para GoogleLoginButton.jsx
 * Cubre: REQ-02 (Login con Google OAuth)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GoogleLoginButton from '../../src/components/GoogleLoginButton';
import { AuthContext } from '../../src/context/AuthContext';

// Mock del contexto de autenticación
const mockLogin = jest.fn();
const mockNavigate = jest.fn();

const mockAuthContext = {
  login: mockLogin
};

// Mock de react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock del servicio de autenticación
jest.mock('../../src/services/authService', () => ({
  loginWithGoogle: jest.fn()
}));

const renderWithContext = (component) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('GoogleLoginButton - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('debe renderizar correctamente con texto por defecto', () => {
    renderWithContext(<GoogleLoginButton />);

    expect(screen.getByText('Iniciar sesión con Google')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByAltText('Foto de perfil de undefined')).toBeInTheDocument();
  });

  test('debe renderizar con texto personalizado', () => {
    renderWithContext(<GoogleLoginButton text="Acceder con Google" />);

    expect(screen.getByText('Acceder con Google')).toBeInTheDocument();
  });

  test('debe aplicar clases CSS personalizadas', () => {
    renderWithContext(<GoogleLoginButton className="custom-class" />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  test('debe mostrar icono de Google', () => {
    renderWithContext(<GoogleLoginButton />);

    const svgIcon = document.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();
  });

  test('debe tener atributos de accesibilidad', () => {
    renderWithContext(<GoogleLoginButton />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Iniciar sesión con Google');
  });

  test('debe manejar login exitoso correctamente', async () => {
    const mockAuthResult = {
      success: true,
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        accessToken: 'mock-token'
      }
    };

    const { loginWithGoogle } = require('../../src/services/authService');
    loginWithGoogle.mockResolvedValue(mockAuthResult);

    renderWithContext(<GoogleLoginButton />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(loginWithGoogle).toHaveBeenCalled();
    });

    expect(mockLogin).toHaveBeenCalledWith(
      mockAuthResult.user,
      mockAuthResult.user.accessToken
    );

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('debe mostrar estado de carga durante el proceso', async () => {
    const { loginWithGoogle } = require('../../src/services/authService');
    loginWithGoogle.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderWithContext(<GoogleLoginButton />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Debe mostrar "Conectando..." durante la carga
    await waitFor(() => {
      expect(screen.getByText('Conectando...')).toBeInTheDocument();
    });

    // El botón debe estar deshabilitado durante la carga
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  test('debe manejar errores de autenticación', async () => {
    const mockError = { error: 'Authentication failed' };
    const { loginWithGoogle } = require('../../src/services/authService');
    loginWithGoogle.mockResolvedValue({
      success: false,
      error: 'Authentication failed'
    });

    // Mock de alert
    global.alert = jest.fn();

    renderWithContext(<GoogleLoginButton />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Error al iniciar sesión con Google: Authentication failed');
    });

    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('debe manejar errores de red', async () => {
    const { loginWithGoogle } = require('../../src/services/authService');
    loginWithGoogle.mockRejectedValue(new Error('Network error'));

    global.alert = jest.fn();

    renderWithContext(<GoogleLoginButton />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Error al iniciar sesión con Google. Inténtalo de nuevo.');
    });
  });

  test('debe prevenir múltiples clicks durante el proceso', async () => {
    const { loginWithGoogle } = require('../../src/services/authService');
    loginWithGoogle.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderWithContext(<GoogleLoginButton />);

    const button = screen.getByRole('button');

    // Primer click
    fireEvent.click(button);
    expect(button).toBeDisabled();

    // Segundo click (debe ser ignorado)
    fireEvent.click(button);

    // Solo debe llamar al servicio una vez
    await waitFor(() => {
      expect(loginWithGoogle).toHaveBeenCalledTimes(1);
    });
  });

  test('debe restablecer estado después de completar', async () => {
    const mockAuthResult = {
      success: true,
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        accessToken: 'mock-token'
      }
    };

    const { loginWithGoogle } = require('../../src/services/authService');
    loginWithGoogle.mockResolvedValue(mockAuthResult);

    renderWithContext(<GoogleLoginButton />);

    const button = screen.getByRole('button');

    // Iniciar proceso
    fireEvent.click(button);
    expect(button).toBeDisabled();

    // Completar proceso
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });

    expect(screen.getByText('Iniciar sesión con Google')).toBeInTheDocument();
  });
});
