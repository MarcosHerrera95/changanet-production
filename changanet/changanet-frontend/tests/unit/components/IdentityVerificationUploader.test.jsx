/**
 * Pruebas unitarias para IdentityVerificationUploader component
 * Usa React Testing Library para testing de componentes
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import IdentityVerificationUploader from '../../../src/components/IdentityVerificationUploader';

// Mock de hooks
jest.mock('../../../src/hooks/useFileUpload');
jest.mock('../../../src/hooks/useVerification');

const mockUseFileUpload = require('../../../src/hooks/useFileUpload').useFileUpload;
const mockUseVerification = require('../../../src/hooks/useVerification').useVerification;

describe('IdentityVerificationUploader', () => {
  const mockOnSuccess = jest.fn();
  const mockOnClose = jest.fn();

  const mockFileUploadHook = {
    files: null,
    previews: null,
    uploading: false,
    error: '',
    handleDrop: jest.fn(),
    handleFileInput: jest.fn(),
    removeFile: jest.fn(),
    hasFiles: false
  };

  const mockVerificationHook = {
    submitVerification: jest.fn(),
    getPresignedUrl: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFileUpload.mockReturnValue(mockFileUploadHook);
    mockUseVerification.mockReturnValue(mockVerificationHook);
  });

  test('debe renderizar correctamente el componente inicial', () => {
    render(<IdentityVerificationUploader onSuccess={mockOnSuccess} onClose={mockOnClose} />);

    expect(screen.getByText('Subir Documentos de Identidad')).toBeInTheDocument();
    expect(screen.getByText('Documento Frontal')).toBeInTheDocument();
    expect(screen.getByText('Documento Reverso')).toBeInTheDocument();
    expect(screen.getByText('Enviar para Verificación')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  test('debe mostrar áreas de drag & drop para ambos documentos', () => {
    render(<IdentityVerificationUploader onSuccess={mockOnSuccess} onClose={mockOnClose} />);

    const dropAreas = screen.getAllByText('Arrastra y suelta tu documento aquí');
    expect(dropAreas).toHaveLength(2);

    expect(screen.getAllByText('JPG, PNG o PDF hasta 5MB')).toHaveLength(2);
  });

  test('debe mostrar información de requisitos', () => {
    render(<IdentityVerificationUploader onSuccess={mockOnSuccess} onClose={mockOnClose} />);

    expect(screen.getByText('Requisitos para la verificación')).toBeInTheDocument();
    expect(screen.getByText('Documento debe estar vigente')).toBeInTheDocument();
    expect(screen.getByText('Fotos nítidas y legibles')).toBeInTheDocument();
    expect(screen.getByText('Procesamiento en 24-48 horas')).toBeInTheDocument();
  });

  test('debe deshabilitar botón de envío cuando no hay documento frontal', () => {
    render(<IdentityVerificationUploader onSuccess={mockOnSuccess} onClose={mockOnClose} />);

    const submitButton = screen.getByText('Enviar para Verificación');
    expect(submitButton).toBeDisabled();
  });

  test('debe mostrar documento seleccionado correctamente', () => {
    const mockFile = new File(['test'], 'documento.pdf', { type: 'application/pdf' });
    mockUseFileUpload.mockReturnValue({
      ...mockFileUploadHook,
      files: mockFile,
      hasFiles: true
    });

    render(<IdentityVerificationUploader onSuccess={mockOnSuccess} onClose={mockOnClose} />);

    expect(screen.getByText('documento.pdf')).toBeInTheDocument();
    expect(screen.getByText('Eliminar')).toBeInTheDocument();
  });

  test('debe mostrar preview de imagen cuando está disponible', () => {
    const mockFile = new File(['test'], 'documento.jpg', { type: 'image/jpeg' });
    mockUseFileUpload.mockReturnValue({
      ...mockFileUploadHook,
      files: mockFile,
      previews: 'data:image/jpeg;base64,test',
      hasFiles: true
    });

    render(<IdentityVerificationUploader onSuccess={mockOnSuccess} onClose={mockOnClose} />);

    const previewImage = screen.getByAltText('Vista previa');
    expect(previewImage).toBeInTheDocument();
    expect(previewImage).toHaveAttribute('src', 'data:image/jpeg;base64,test');
  });

  test('debe mostrar errores de validación', () => {
    mockUseFileUpload.mockReturnValue({
      ...mockFileUploadHook,
      error: 'Tipo de archivo no permitido'
    });

    render(<IdentityVerificationUploader onSuccess={mockOnSuccess} onClose={mockOnClose} />);

    expect(screen.getByText('Tipo de archivo no permitido')).toBeInTheDocument();
  });

  test('debe manejar envío exitoso de verificación', async () => {
    const mockFile = new File(['test'], 'documento.pdf', { type: 'application/pdf' });
    const mockPresignedUrl = 'https://presigned-url.com/upload';

    mockUseFileUpload.mockReturnValue({
      ...mockFileUploadHook,
      files: mockFile,
      hasFiles: true,
      uploadWithPresignedUrl: jest.fn().mockResolvedValue({ ok: true })
    });

    mockVerificationHook.getPresignedUrl.mockResolvedValue(mockPresignedUrl);
    mockVerificationHook.submitVerification.mockResolvedValue({ success: true });

    render(<IdentityVerificationUploader onSuccess={mockOnSuccess} onClose={mockOnClose} />);

    const submitButton = screen.getByText('Enviar para Verificación');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockVerificationHook.getPresignedUrl).toHaveBeenCalledWith(
        expect.stringContaining('frontal-'),
        'application/pdf'
      );
      expect(mockVerificationHook.submitVerification).toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  test('debe manejar envío con documento reverso opcional', async () => {
    const mockFrontalFile = new File(['test'], 'frontal.pdf', { type: 'application/pdf' });
    const mockReversoFile = new File(['test'], 'reverso.pdf', { type: 'application/pdf' });

    const mockFrontalHook = {
      ...mockFileUploadHook,
      files: mockFrontalFile,
      hasFiles: true,
      uploadWithPresignedUrl: jest.fn().mockResolvedValue({ ok: true })
    };

    const mockReversoHook = {
      ...mockFileUploadHook,
      files: mockReversoFile,
      hasFiles: true,
      uploadWithPresignedUrl: jest.fn().mockResolvedValue({ ok: true })
    };

    // Mock para retornar diferentes hooks para frontal y reverso
    let callCount = 0;
    mockUseFileUpload.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? mockFrontalHook : mockReversoHook;
    });

    mockVerificationHook.getPresignedUrl.mockResolvedValue('https://presigned-url.com/upload');
    mockVerificationHook.submitVerification.mockResolvedValue({ success: true });

    render(<IdentityVerificationUploader onSuccess={mockOnSuccess} onClose={mockOnClose} />);

    const submitButton = screen.getByText('Enviar para Verificación');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockVerificationHook.getPresignedUrl).toHaveBeenCalledTimes(2);
      expect(mockVerificationHook.submitVerification).toHaveBeenCalled();
    });
  });

  test('debe mostrar estado de carga durante el envío', async () => {
    const mockFile = new File(['test'], 'documento.pdf', { type: 'application/pdf' });

    mockUseFileUpload.mockReturnValue({
      ...mockFileUploadHook,
      files: mockFile,
      hasFiles: true,
      uploadWithPresignedUrl: jest.fn().mockResolvedValue({ ok: true })
    });

    mockVerificationHook.getPresignedUrl.mockResolvedValue('https://presigned-url.com/upload');
    mockVerificationHook.submitVerification.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );

    render(<IdentityVerificationUploader onSuccess={mockOnSuccess} onClose={mockOnClose} />);

    const submitButton = screen.getByText('Enviar para Verificación');
    fireEvent.click(submitButton);

    // Debería mostrar "Subiendo..." durante la carga
    await waitFor(() => {
      expect(screen.getByText('Subiendo...')).toBeInTheDocument();
    });

    // Después de completar, debería volver al texto original
    await waitFor(() => {
      expect(screen.queryByText('Subiendo...')).not.toBeInTheDocument();
    });
  });

  test('debe manejar errores durante el envío', async () => {
    const mockFile = new File(['test'], 'documento.pdf', { type: 'application/pdf' });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    mockUseFileUpload.mockReturnValue({
      ...mockFileUploadHook,
      files: mockFile,
      hasFiles: true,
      uploadWithPresignedUrl: jest.fn().mockRejectedValue(new Error('Upload failed'))
    });

    render(<IdentityVerificationUploader onSuccess={mockOnSuccess} onClose={mockOnClose} />);

    const submitButton = screen.getByText('Enviar para Verificación');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error al subir documentos:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  test('debe requerir documento frontal para envío', () => {
    const mockReversoFile = new File(['test'], 'reverso.pdf', { type: 'application/pdf' });

    // Solo mock para reverso
    mockUseFileUpload.mockImplementation((options, index) => {
      if (index === 1) { // Reverso
        return {
          ...mockFileUploadHook,
          files: mockReversoFile,
          hasFiles: true
        };
      }
      return mockFileUploadHook; // Frontal vacío
    });

    render(<IdentityVerificationUploader onSuccess={mockOnSuccess} onClose={mockOnClose} />);

    const submitButton = screen.getByText('Enviar para Verificación');
    expect(submitButton).toBeDisabled();

    // Alert debería aparecer si se intenta hacer click
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation();
    fireEvent.click(submitButton);

    expect(alertSpy).toHaveBeenCalledWith('Debes subir el documento frontal');
    alertSpy.mockRestore();
  });

  test('debe llamar onClose cuando se hace click en Cancelar', () => {
    render(<IdentityVerificationUploader onSuccess={mockOnSuccess} onClose={mockOnClose} />);

    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('debe manejar drag and drop events', () => {
    render(<IdentityVerificationUploader onSuccess={mockOnSuccess} onClose={mockOnClose} />);

    const dropArea = screen.getAllByText('Arrastra y suelta tu documento aquí')[0].closest('div');

    const mockDragEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      dataTransfer: {
        files: [new File(['test'], 'dropped.pdf', { type: 'application/pdf' })]
      }
    };

    fireEvent.drop(dropArea, mockDragEvent);

    expect(mockFileUploadHook.handleDrop).toHaveBeenCalledWith(mockDragEvent);
  });

  test('debe manejar selección de archivo via input', () => {
    render(<IdentityVerificationUploader onSuccess={mockOnClose} onClose={mockOnClose} />);

    const fileInput = screen.getAllByDisplayValue('')[0]; // Input type file
    const mockFile = new File(['test'], 'selected.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    expect(mockFileUploadHook.handleFileInput).toHaveBeenCalled();
  });
});
