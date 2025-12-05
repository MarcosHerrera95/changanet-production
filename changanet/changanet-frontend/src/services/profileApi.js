/**
 * Servicio API para gestión de perfiles profesionales
 * Centraliza todas las llamadas HTTP relacionadas con perfiles
 */

const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://changanet-production-backend.onrender.com/api'
  : '/api';

class ProfileApi {
  constructor() {
    this.token = null;
    this.updateToken();
  }

  // Actualizar token de autenticación
  updateToken() {
    this.token = localStorage.getItem('changanet_token');
  }

  // Headers por defecto con autenticación
  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`
    };
  }

  // GET /api/profile - Obtener perfil propio
  async getProfile() {
    this.updateToken();
    const response = await fetch(`${API_BASE}/profile`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Perfil no encontrado');
      }
      throw new Error('Error obteniendo perfil');
    }

    return response.json();
  }

  // PUT /api/profile - Actualizar perfil propio
  async updateProfile(profileData) {
    this.updateToken();

    const formData = new FormData();

    // Agregar datos del perfil
    Object.keys(profileData).forEach(key => {
      if (profileData[key] !== null && profileData[key] !== undefined && profileData[key] !== '') {
        if (typeof profileData[key] === 'object' && !(profileData[key] instanceof File)) {
          formData.append(key, JSON.stringify(profileData[key]));
        } else {
          formData.append(key, profileData[key]);
        }
      }
    });

    const response = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error actualizando perfil');
    }

    return response.json();
  }

  // POST /api/professionals - Crear perfil profesional
  async createProfile(profileData) {
    this.updateToken();

    const response = await fetch(`${API_BASE}/professionals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error creando perfil');
    }

    return response.json();
  }

  // GET /api/professionals/:id - Obtener perfil público
  async getPublicProfile(professionalId) {
    const response = await fetch(`${API_BASE}/professionals/${professionalId}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Profesional no encontrado');
      }
      throw new Error('Error obteniendo perfil público');
    }

    return response.json();
  }

  // GET /api/professionals - Buscar profesionales
  async searchProfessionals(filters = {}) {
    const params = new URLSearchParams();

    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });

    const response = await fetch(`${API_BASE}/professionals?${params}`);

    if (!response.ok) {
      throw new Error('Error buscando profesionales');
    }

    return response.json();
  }

  // POST /api/professionals/upload-photo - Subir foto
  async uploadPhoto(file, type) {
    this.updateToken();

    const formData = new FormData();
    formData.append('foto', file);
    formData.append('foto_tipo', type);

    const response = await fetch(`${API_BASE}/professionals/upload-photo`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error subiendo foto');
    }

    return response.json();
  }

  // GET /api/specialties - Obtener especialidades disponibles
  async getSpecialties() {
    const response = await fetch(`${API_BASE}/specialties`);

    if (!response.ok) {
      throw new Error('Error obteniendo especialidades');
    }

    return response.json();
  }

  // GET /api/coverage-areas - Obtener zonas de cobertura
  async getCoverageAreas() {
    const response = await fetch(`${API_BASE}/coverage-areas`);

    if (!response.ok) {
      throw new Error('Error obteniendo zonas');
    }

    return response.json();
  }

  // GET /api/rates/suggestions - Obtener sugerencias de tarifas
  async getRateSuggestions(specialty, zone) {
    const params = new URLSearchParams();
    if (specialty) params.append('especialidad', specialty);
    if (zone) params.append('zona', zone);

    const response = await fetch(`${API_BASE}/rates/suggestions?${params}`);

    if (!response.ok) {
      throw new Error('Error obteniendo sugerencias de tarifas');
    }

    return response.json();
  }
}

// Exportar instancia singleton
export const profileApi = new ProfileApi();
