/**
 * Servicio para gestión de favoritos
 * Permite a los clientes gestionar profesionales favoritos
 */

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003';

/**
 * Agregar un profesional a favoritos
 */
export const addFavorite = async (profesionalId) => {
  try {
    const token = localStorage.getItem('changanet_token');
    if (!token) {
      throw new Error('Usuario no autenticado');
    }

    const response = await fetch(`${API_BASE_URL}/api/favorites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ profesionalId })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al agregar favorito');
    }

    return data;
  } catch (error) {
    console.error('Error adding favorite:', error);
    throw error;
  }
};

/**
 * Remover un profesional de favoritos
 */
export const removeFavorite = async (profesionalId) => {
  try {
    const token = localStorage.getItem('changanet_token');
    if (!token) {
      throw new Error('Usuario no autenticado');
    }

    const response = await fetch(`${API_BASE_URL}/api/favorites/${profesionalId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al remover favorito');
    }

    return data;
  } catch (error) {
    console.error('Error removing favorite:', error);
    throw error;
  }
};

/**
 * Obtener lista de favoritos del cliente
 */
export const getFavorites = async () => {
  try {
    const token = localStorage.getItem('changanet_token');
    if (!token) {
      throw new Error('Usuario no autenticado');
    }

    const response = await fetch(`${API_BASE_URL}/api/favorites`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al obtener favoritos');
    }

    return data.favorites;
  } catch (error) {
    console.error('Error getting favorites:', error);
    throw error;
  }
};

/**
 * Verificar si un profesional está en favoritos
 */
export const checkFavorite = async (profesionalId) => {
  try {
    const token = localStorage.getItem('changanet_token');
    if (!token) {
      throw new Error('Usuario no autenticado');
    }

    const response = await fetch(`${API_BASE_URL}/api/favorites/check/${profesionalId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al verificar favorito');
    }

    return data.isFavorite;
  } catch (error) {
    console.error('Error checking favorite:', error);
    throw error;
  }
};
