import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFavorites, addFavorite, removeFavorite } from '../services/favoritesService';

/**
 * Hook para gestión de favoritos de profesionales
 */
export const useFavorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar favoritos al montar o cambiar usuario
  useEffect(() => {
    if (user && user.rol === 'cliente') {
      loadFavorites();
    } else {
      setFavorites([]);
    }
  }, [user]);

  /**
   * Cargar lista de favoritos
   */
  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const favoritesList = await getFavorites();
      setFavorites(favoritesList);
    } catch (err) {
      setError(err.message);
      console.error('Error loading favorites:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Agregar profesional a favoritos
   */
  const addToFavorites = useCallback(async (profesionalId) => {
    try {
      setError(null);
      await addFavorite(profesionalId);
      // Recargar lista completa
      await loadFavorites();
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Error adding favorite:', err);
      return false;
    }
  }, [loadFavorites]);

  /**
   * Remover profesional de favoritos
   */
  const removeFromFavorites = useCallback(async (profesionalId) => {
    try {
      setError(null);
      await removeFavorite(profesionalId);
      // Recargar lista completa
      await loadFavorites();
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Error removing favorite:', err);
      return false;
    }
  }, [loadFavorites]);

  /**
   * Verificar si un profesional está en favoritos
   */
  const isFavorite = useCallback((profesionalId) => {
    return favorites.some(fav => fav.profesional_id === profesionalId);
  }, [favorites]);

  /**
   * Toggle favorito (agregar/quitar)
   */
  const toggleFavorite = useCallback(async (profesionalId) => {
    if (isFavorite(profesionalId)) {
      return await removeFromFavorites(profesionalId);
    } else {
      return await addToFavorites(profesionalId);
    }
  }, [isFavorite, addToFavorites, removeFromFavorites]);

  return {
    favorites,
    loading,
    error,
    loadFavorites,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    toggleFavorite
  };
};

export default useFavorites;
