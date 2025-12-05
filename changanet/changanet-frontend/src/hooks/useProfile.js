import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Hook personalizado para gestión de perfiles profesionales
 * Maneja estado, carga y operaciones CRUD del perfil
 */
export const useProfile = () => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar perfil del usuario
  const fetchProfile = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NODE_ENV === 'production'
        ? 'https://changanet-production-backend.onrender.com/api/profile'
        : '/api/profile';
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else if (response.status === 404) {
        // Perfil no existe aún, es normal para nuevos profesionales
        setProfile(null);
      } else {
        throw new Error('Error al cargar el perfil');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Actualizar perfil profesional
  const updateProfile = async (profileData) => {
    setLoading(true);
    setError(null);

    try {
      // Preparar FormData para incluir archivos si existen
      const formData = new FormData();

      // Agregar datos del perfil
      Object.keys(profileData).forEach(key => {
        if (profileData[key] !== null && profileData[key] !== undefined && profileData[key] !== '') {
          if (typeof profileData[key] === 'object' && !(profileData[key] instanceof File)) {
            // Para arrays y objetos, convertir a JSON
            formData.append(key, JSON.stringify(profileData[key]));
          } else {
            formData.append(key, profileData[key]);
          }
        }
      });

      const apiUrl = process.env.NODE_ENV === 'production'
        ? 'https://changanet-production-backend.onrender.com/api/profile'
        : '/api/profile';
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
          // No incluir Content-Type para que el navegador lo setee automáticamente con boundary
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar el perfil');
      }

      const data = await response.json();
      setProfile(data.profile || data);
      return data;
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Crear perfil profesional (para nuevos profesionales)
  const createProfile = async (profileData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/professionals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear el perfil');
      }

      const data = await response.json();
      setProfile(data.profile);
      return data;
    } catch (err) {
      console.error('Error creating profile:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Subir foto de perfil o portada
  const uploadPhoto = async (file, type) => {
    const formData = new FormData();
    formData.append('foto', file);
    formData.append('foto_tipo', type);

    try {
      const response = await fetch('/api/professionals/upload-photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al subir la foto');
      }

      const data = await response.json();
      return data.data.url;
    } catch (err) {
      console.error('Error uploading photo:', err);
      throw err;
    }
  };

  // Limpiar error
  const clearError = () => {
    setError(null);
  };

  // Cargar perfil cuando el usuario cambie
  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setError(null);
    }
  }, [user]);

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    createProfile,
    uploadPhoto,
    clearError
  };
};
