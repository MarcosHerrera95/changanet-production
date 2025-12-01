/**
 * Servicio para integración con el módulo de Solicitudes de Presupuestos
 * Maneja todas las llamadas API relacionadas con budget requests
 */

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

/**
 * Crear una nueva solicitud de presupuesto
 * @param {Object} requestData - Datos de la solicitud
 * @param {string} requestData.descripcion - Descripción del trabajo
 * @param {string} requestData.zona_cobertura - Zona de cobertura
 * @param {string} requestData.especialidad - Especialidad requerida
 * @param {string} requestData.presupuesto_estimado - Presupuesto estimado (opcional)
 * @param {File[]} requestData.fotos - Array de archivos de imagen
 * @returns {Promise<Object>} Respuesta del servidor
 */
export const createBudgetRequest = async (requestData) => {
  try {
    const token = localStorage.getItem('changanet_token');
    if (!token) {
      throw new Error('Usuario no autenticado');
    }

    const formData = new FormData();
    formData.append('descripcion', requestData.descripcion);
    formData.append('zona_cobertura', requestData.zona_cobertura);
    formData.append('especialidad', requestData.especialidad);

    if (requestData.presupuesto_estimado) {
      formData.append('presupuesto_estimado', requestData.presupuesto_estimado);
    }

    // Agregar fotos si existen
    if (requestData.fotos && requestData.fotos.length > 0) {
      requestData.fotos.forEach((foto) => {
        formData.append('fotos', foto);
      });
    }

    const response = await fetch(`${API_BASE_URL}/api/budget-requests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // No Content-Type header for FormData
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al crear la solicitud de presupuesto');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating budget request:', error);
    throw error;
  }
};

/**
 * Obtener solicitudes de presupuesto del cliente
 * @param {string} clientId - ID del cliente
 * @returns {Promise<Object[]>} Lista de solicitudes
 */
export const getClientBudgetRequests = async (clientId) => {
  try {
    const token = localStorage.getItem('changanet_token');
    if (!token) {
      throw new Error('Usuario no autenticado');
    }

    const response = await fetch(`${API_BASE_URL}/api/budget-requests/client/${clientId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al obtener las solicitudes');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching client budget requests:', error);
    throw error;
  }
};

/**
 * Obtener ofertas para una solicitud específica
 * @param {string} requestId - ID de la solicitud
 * @returns {Promise<Object>} Solicitud con ofertas
 */
export const getBudgetRequestOffers = async (requestId) => {
  try {
    const token = localStorage.getItem('changanet_token');
    if (!token) {
      throw new Error('Usuario no autenticado');
    }

    const response = await fetch(`${API_BASE_URL}/api/budget-requests/${requestId}/offers`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al obtener las ofertas');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching budget request offers:', error);
    throw error;
  }
};

/**
 * Obtener bandeja de entrada del profesional
 * @param {string} professionalId - ID del profesional
 * @returns {Promise<Object[]>} Lista de solicitudes pendientes
 */
export const getProfessionalInbox = async (professionalId) => {
  try {
    const token = localStorage.getItem('changanet_token');
    if (!token) {
      throw new Error('Usuario no autenticado');
    }

    const response = await fetch(`${API_BASE_URL}/api/budget-requests/inbox/${professionalId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al obtener la bandeja de entrada');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching professional inbox:', error);
    throw error;
  }
};

/**
 * Enviar oferta para una solicitud
 * @param {string} requestId - ID de la solicitud
 * @param {Object} offerData - Datos de la oferta
 * @param {number} offerData.precio - Precio ofrecido
 * @param {string} offerData.comentario - Comentario (opcional)
 * @returns {Promise<Object>} Oferta creada
 */
export const submitOffer = async (requestId, offerData) => {
  try {
    const token = localStorage.getItem('changanet_token');
    if (!token) {
      throw new Error('Usuario no autenticado');
    }

    const response = await fetch(`${API_BASE_URL}/api/budget-requests/${requestId}/offers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(offerData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al enviar la oferta');
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting offer:', error);
    throw error;
  }
};

/**
 * Validar archivo de imagen
 * @param {File} file - Archivo a validar
 * @returns {Object} Resultado de validación
 */
export const validateImageFile = (file) => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Solo se permiten archivos de imagen (JPEG, PNG, WebP)'
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'La imagen no puede superar los 5MB'
    };
  }

  return { isValid: true };
};

/**
 * Comprimir imagen si es necesario
 * @param {File} file - Archivo de imagen
 * @param {number} maxWidth - Ancho máximo
 * @param {number} maxHeight - Alto máximo
 * @param {number} quality - Calidad de compresión (0-1)
 * @returns {Promise<File>} Imagen comprimida
 */
export const compressImage = async (file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calcular nuevas dimensiones manteniendo aspect ratio
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          resolve(compressedFile);
        },
        file.type,
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
};
