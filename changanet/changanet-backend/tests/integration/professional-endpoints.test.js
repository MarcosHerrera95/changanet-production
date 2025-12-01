/**
 * Tests de integración para endpoints de Gestión de Perfiles Profesionales
 * Verifica el flujo completo de request/response para REQ-06 a REQ-10
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003/api';

describe('Professional Endpoints - Integration Tests', () => {
  test('GET /api/professionals - should return professionals list', async () => {
    const response = await fetch(`${BASE_URL}/professionals?page=1&limit=5`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.professionals).toBeDefined();
    expect(Array.isArray(data.professionals)).toBe(true);
    expect(data.total).toBeDefined();
    expect(data.page).toBe(1);
    expect(data.totalPages).toBeDefined();
  });

  test('GET /api/professionals - should filter by zona_cobertura', async () => {
    const response = await fetch(`${BASE_URL}/professionals?zona_cobertura=Buenos%20Aires`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.professionals).toBeDefined();
    expect(Array.isArray(data.professionals)).toBe(true);
  });

  test('GET /api/professionals - should filter by especialidad', async () => {
    const response = await fetch(`${BASE_URL}/professionals?especialidad=plomero`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.professionals).toBeDefined();
    expect(Array.isArray(data.professionals)).toBe(true);
  });

  test('GET /api/professionals - should filter by price range', async () => {
    const response = await fetch(`${BASE_URL}/professionals?precio_min=100&precio_max=1000`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.professionals).toBeDefined();
    expect(Array.isArray(data.professionals)).toBe(true);
  });

  test('GET /api/professionals/:id - should handle non-existent professional', async () => {
    const response = await fetch(`${BASE_URL}/professionals/non-existent-id`);

    // Should return 404 for not found or 500 for invalid ID format
    expect([404, 500]).toContain(response.status);
  });

  test('POST /api/professionals - should reject without authentication', async () => {
    const profileData = {
      especialidades: ['Plomero'],
      anos_experiencia: 5,
      zona_cobertura: 'Buenos Aires',
      tipo_tarifa: 'hora',
      tarifa_hora: 1500,
      descripcion: 'Test description'
    };

    const response = await fetch(`${BASE_URL}/professionals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    });

    expect(response.status).toBe(401);
  });

  test('PUT /api/professionals/:id - should reject without authentication', async () => {
    const updateData = {
      especialidades: ['Plomero'],
      anos_experiencia: 6,
      zona_cobertura: 'Buenos Aires',
      tipo_tarifa: 'hora',
      tarifa_hora: 1500,
      descripcion: 'Updated description'
    };

    const response = await fetch(`${BASE_URL}/professionals/test-id`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    expect(response.status).toBe(401);
  });

  test('POST /api/professionals/upload-photo - should reject without authentication', async () => {
    const response = await fetch(`${BASE_URL}/professionals/upload-photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ foto_tipo: 'perfil' })
    });

    expect(response.status).toBe(401);
  });
});
