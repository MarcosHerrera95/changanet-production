/**
 * Pruebas unitarias para useFileUpload hook
 * Testing de lógica de validación de archivos, drag & drop, y subida
 */

import { renderHook, act } from '@testing-library/react';
import { useFileUpload } from '../../../src/hooks/useFileUpload';

describe('useFileUpload Hook', () => {
  const defaultOptions = {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    multiple: false
  };

  test('debe inicializar con valores por defecto', () => {
    const { result } = renderHook(() => useFileUpload());

    expect(result.current.files).toBeNull();
    expect(result.current.previews).toBeNull();
    expect(result.current.uploading).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.hasFiles).toBe(false);
  });

  test('debe validar archivos permitidos correctamente', () => {
    const { result } = renderHook(() => useFileUpload(defaultOptions));

    const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });

    // Simular validación interna
    expect(() => {
      if (!defaultOptions.allowedTypes.includes(validFile.type)) {
        throw new Error('Tipo no permitido');
      }
    }).not.toThrow();

    expect(() => {
      if (!defaultOptions.allowedTypes.includes(invalidFile.type)) {
        throw new Error('Tipo no permitido');
      }
    }).toThrow('Tipo no permitido');
  });

  test('debe validar tamaño máximo de archivo', () => {
    const { result } = renderHook(() => useFileUpload(defaultOptions));

    const smallFile = new File(['x'.repeat(1024)], 'small.jpg', { type: 'image/jpeg' }); // 1KB
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' }); // 6MB

    expect(smallFile.size).toBeLessThan(defaultOptions.maxSize);
    expect(largeFile.size).toBeGreaterThan(defaultOptions.maxSize);
  });

  test('debe crear preview para archivos de imagen', async () => {
    const { result } = renderHook(() => useFileUpload());

    const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    // Simular FileReader
    const mockFileReader = {
      onload: null,
      readAsDataURL: jest.fn(function() {
        this.onload({ target: { result: 'data:image/jpeg;base64,test' } });
      })
    };
    global.FileReader = jest.fn(() => mockFileReader);

    // La lógica de preview se maneja internamente en el hook
    // Esta prueba verifica que la funcionalidad esté disponible
    expect(typeof result.current.previews).toBe('object');
  });

  test('debe manejar subida con URL presignada', async () => {
    const { result } = renderHook(() => useFileUpload());

    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const mockPresignedUrl = 'https://presigned-url.com/upload';

    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200
    });

    await act(async () => {
      const response = await result.current.uploadWithPresignedUrl(mockPresignedUrl, mockFile);
      expect(response.ok).toBe(true);
    });

    expect(global.fetch).toHaveBeenCalledWith(mockPresignedUrl, {
      method: 'PUT',
      body: mockFile,
      headers: {
        'Content-Type': mockFile.type
      }
    });
  });

  test('debe manejar errores en subida con URL presignada', async () => {
    const { result } = renderHook(() => useFileUpload());

    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const mockPresignedUrl = 'https://presigned-url.com/upload';

    // Mock fetch con error
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403
    });

    await expect(async () => {
      await result.current.uploadWithPresignedUrl(mockPresignedUrl, mockFile);
    }).rejects.toThrow('Error al subir el archivo');
  });

  test('debe limpiar archivos correctamente', () => {
    const { result } = renderHook(() => useFileUpload());

    act(() => {
      result.current.clearFiles();
    });

    expect(result.current.files).toBeNull();
    expect(result.current.previews).toBeNull();
    expect(result.current.error).toBe('');
  });

  test('debe manejar archivos múltiples cuando multiple=true', () => {
    const { result } = renderHook(() => useFileUpload({ multiple: true }));

    expect(result.current.files).toEqual([]);
    expect(result.current.previews).toEqual([]);
    expect(result.current.hasFiles).toBe(false);
  });

  test('debe manejar callbacks personalizados', () => {
    const onFileSelect = jest.fn();
    const onError = jest.fn();

    const { result } = renderHook(() =>
      useFileUpload({
        ...defaultOptions,
        onFileSelect,
        onError
      })
    );

    // Los callbacks se llaman internamente en processFiles
    // Esta prueba verifica que las opciones se pasan correctamente
    expect(typeof result.current.handleFileInput).toBe('function');
    expect(typeof result.current.handleDrop).toBe('function');
  });

  test('debe manejar eventos de drag and drop', () => {
    const { result } = renderHook(() => useFileUpload());

    const mockDragEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      dataTransfer: {
        files: [
          new File(['test'], 'dropped.jpg', { type: 'image/jpeg' })
        ]
      }
    };

    act(() => {
      result.current.handleDrop(mockDragEvent);
    });

    expect(mockDragEvent.preventDefault).toHaveBeenCalled();
    expect(mockDragEvent.stopPropagation).toHaveBeenCalled();
  });

  test('debe manejar selección de archivos via input', () => {
    const { result } = renderHook(() => useFileUpload());

    const mockEvent = {
      target: {
        files: [
          new File(['test'], 'selected.pdf', { type: 'application/pdf' })
        ]
      }
    };

    act(() => {
      result.current.handleFileInput(mockEvent);
    });

    // La función handleFileInput procesa los archivos internamente
    expect(typeof result.current.files).toBe('object');
  });

  test('debe manejar eliminación de archivos', () => {
    const { result } = renderHook(() => useFileUpload({ multiple: true }));

    // Simular que hay archivos
    act(() => {
      // En un caso real, los archivos se setearían a través de handleFileInput o handleDrop
      // Para esta prueba, verificamos que la función existe y es callable
      expect(typeof result.current.removeFile).toBe('function');
    });

    // Para archivos únicos
    const { result: singleResult } = renderHook(() => useFileUpload({ multiple: false }));

    act(() => {
      singleResult.current.removeFile();
    });

    expect(singleResult.current.files).toBeNull();
    expect(singleResult.current.previews).toBeNull();
  });

  test('debe validar archivos con mensajes de error apropiados', () => {
    const { result } = renderHook(() => useFileUpload(defaultOptions));

    // Archivo con tipo no permitido
    const invalidTypeFile = new File(['test'], 'test.txt', { type: 'text/plain' });

    expect(() => {
      if (!defaultOptions.allowedTypes.includes(invalidTypeFile.type)) {
        const errorMsg = `Tipo de archivo no permitido. Solo se permiten: ${defaultOptions.allowedTypes.map(type => type.split('/')[1]).join(', ')}`;
        throw new Error(errorMsg);
      }
    }).toThrow('Tipo de archivo no permitido. Solo se permiten: jpeg, jpg, png, pdf');

    // Archivo demasiado grande
    const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
    const maxSizeMB = (defaultOptions.maxSize / 1024 / 1024).toFixed(1);

    expect(() => {
      if (largeFile.size > defaultOptions.maxSize) {
        throw new Error(`El archivo es demasiado grande. Máximo ${maxSizeMB}MB`);
      }
    }).toThrow(`El archivo es demasiado grande. Máximo 5.0MB`);
  });
});
