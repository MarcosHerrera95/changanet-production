/**
 * Pruebas unitarias para VerificationForm.jsx
 * Cubre: REQ-36 (Subir documento), REQ-37 (Mostrar estado)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import VerificationForm from '../../src/components/VerificationForm';
import { AuthContext } from '../../src/context/AuthContext';

// Mock del contexto de autenticación
const mockAuthContext = {
  user: {
    id: 'user-123',
    role: 'profesional',
    email: 'professional@example.com'
  }
};

// Mock de fetch
global.fetch = jest.fn();

const renderWithContext = (component) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('VerificationForm - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock inicial para obtener estado
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: {
          estado: 'no_solicitado',
          documento_url: null
        }
      })
    });
  });

  test('debe renderizar correctamente para profesionales', async () => {
    renderWithContext(<VerificationForm />);

    await waitFor(() => {
      expect(screen.getByText('Verificación de Identidad')).toBeInTheDocument();
    });

    expect(screen.getByText('Solicitar Verificación')).toBeInTheDocument();
    expect(screen.getByText('Documento de Identidad')).toBeInTheDocument();
  });

  test('no debe renderizar para usuarios que no son profesionales', () => {
    const nonProfessionalContext = {
      user: {
        id: 'user-123',
        role: 'cliente',
        email: 'client@example.com'
      }
    };

    render(
      <BrowserRouter>
        <AuthContext.Provider value={nonProfessionalContext}>
          <VerificationForm />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.queryByText('Verificación de Identidad')).not.toBeInTheDocument();
  });

  test('debe mostrar estado pendiente correctamente', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: {
          estado: 'pendiente',
          documento_url: 'https://example.com/doc.jpg',
          creado_en: new Date().toISOString()
        }
      })
    });

    renderWithContext(<VerificationForm />);

    await waitFor(() => {
      expect(screen.getByText(/Pendiente de revisión/)).toBeInTheDocument();
    });

    expect(screen.getByText('Solicitud pendiente')).toBeInTheDocument();
  });

  test('debe mostrar estado aprobado correctamente', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: {
          estado: 'aprobado',
          documento_url: 'https://example.com/doc.jpg',
          comentario_admin: 'Documento válido',
          revisado_en: new Date().toISOString()
        }
      })
    });

    renderWithContext(<VerificationForm />);

    await waitFor(() => {
      expect(screen.getByText(/Verificado/)).toBeInTheDocument();
    });

    expect(screen.getByText('Documento válido')).toBeInTheDocument();
  });

  test('debe validar tipo de archivo permitido', async () => {
    renderWithContext(<VerificationForm />);

    await waitFor(() => {
      expect(screen.getByText('Documento de Identidad')).toBeInTheDocument();
    });

    const fileInput = screen.getByDisplayValue('');

    // Archivo con extensión no permitida
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/tipo de archivo no permitido/i)).toBeInTheDocument();
    });
  });

  test('debe validar tamaño máximo del archivo', async () => {
    renderWithContext(<VerificationForm />);

    await waitFor(() => {
      expect(screen.getByText('Documento de Identidad')).toBeInTheDocument();
    });

    const fileInput = screen.getByDisplayValue('');

    // Archivo de 6MB (excede el límite de 5MB)
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/demasiado grande/)).toBeInTheDocument();
    });
  });

  test('debe enviar solicitud correctamente', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          id: 'verification-123',
          estado: 'pendiente',
          documento_url: 'https://cloudinary.com/doc.jpg'
        }
      })
    });

    renderWithContext(<VerificationForm />);

    await waitFor(() => {
      expect(screen.getByText('Documento de Identidad')).toBeInTheDocument();
    });

    const fileInput = screen.getByDisplayValue('');
    const submitButton = screen.getByText('Solicitar Verificación');

    // Archivo válido
    const validFile = new File(['test'], 'document.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Enviar formulario
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/verification/request', expect.any(Object));
    });

    // Verificar que se mostró mensaje de éxito (usando alert mock)
    expect(global.alert).toHaveBeenCalledWith('Solicitud de verificación enviada correctamente. Recibirás una notificación cuando sea revisada.');
  });

  test('debe manejar errores de envío', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        error: 'Error al procesar la solicitud'
      })
    });

    renderWithContext(<VerificationForm />);

    await waitFor(() => {
      expect(screen.getByText('Documento de Identidad')).toBeInTheDocument();
    });

    const fileInput = screen.getByDisplayValue('');
    const submitButton = screen.getByText('Solicitar Verificación');

    // Archivo válido
    const validFile = new File(['test'], 'document.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Enviar formulario
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error al procesar la solicitud')).toBeInTheDocument();
    });
  });

  test('debe mostrar información educativa', async () => {
    renderWithContext(<VerificationForm />);

    await waitFor(() => {
      expect(screen.getByText('¿Por qué verificar mi identidad?')).toBeInTheDocument();
    });

    expect(screen.getByText(/Aumenta la confianza de los clientes/)).toBeInTheDocument();
    expect(screen.getByText(/Apareces más arriba en las búsquedas/)).toBeInTheDocument();
    expect(screen.getByText(/Proceso manual y seguro por nuestro equipo/)).toBeInTheDocument();
  });
});
