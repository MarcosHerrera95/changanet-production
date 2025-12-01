/**
 * Tests unitarios para professionalService.js
 * Verifica la lógica de negocio para Gestión de Perfiles Profesionales
 * REQ-06 a REQ-10 según PRD
 */

const ProfessionalService = require('../../../src/services/professionalService');

describe('ProfessionalService - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('prepareProfileData', () => {
    test('should prepare data correctly for create operation', () => {
      const data = {
        especialidades: ['Plomero', 'Electricista'],
        anos_experiencia: 5,
        zona_cobertura: 'Buenos Aires',
        tipo_tarifa: 'hora',
        tarifa_hora: 1500,
        descripcion: 'Test description'
      };

      const result = ProfessionalService.prepareProfileData(data);

      expect(result).toEqual({
        especialidad: 'Plomero',
        especialidades: '["Plomero","Electricista"]',
        anos_experiencia: 5,
        zona_cobertura: 'Buenos Aires',
        tipo_tarifa: 'hora',
        tarifa_hora: 1500,
        tarifa_servicio: null,
        tarifa_convenio: null,
        descripcion: 'Test description',
        esta_disponible: true
      });
    });

    test('should handle servicio tariff type', () => {
      const data = {
        especialidades: ['Pintor'],
        tipo_tarifa: 'servicio',
        tarifa_servicio: 3000
      };

      const result = ProfessionalService.prepareProfileData(data);

      expect(result).toEqual({
        especialidad: 'Pintor',
        especialidades: '["Pintor"]',
        tipo_tarifa: 'servicio',
        tarifa_hora: null,
        tarifa_servicio: 3000,
        tarifa_convenio: null,
        esta_disponible: true
      });
    });

    test('should handle convenio tariff type', () => {
      const data = {
        especialidades: ['Arquitecto'],
        tipo_tarifa: 'convenio',
        tarifa_convenio: 'Precio a convenir según proyecto'
      };

      const result = ProfessionalService.prepareProfileData(data);

      expect(result).toEqual({
        especialidad: 'Arquitecto',
        especialidades: '["Arquitecto"]',
        tipo_tarifa: 'convenio',
        tarifa_hora: null,
        tarifa_servicio: null,
        tarifa_convenio: 'Precio a convenir según proyecto',
        esta_disponible: true
      });
    });
  });

  describe('extractPublicIdFromUrl', () => {
    test('should extract public ID from Cloudinary URL', () => {
      const url = 'https://res.cloudinary.com/demo/image/upload/v1234567890/changanet/profiles/user123_1234567890.jpg';

      const result = ProfessionalService.extractPublicIdFromUrl(url);

      expect(result).toBe('changanet/profiles/user123_1234567890');
    });

    test('should return null for invalid URL', () => {
      const url = 'invalid-url';

      const result = ProfessionalService.extractPublicIdFromUrl(url);

      expect(result).toBe('changanet/profiles/invalid-url');
    });

    test('should return null for null input', () => {
      const result = ProfessionalService.extractPublicIdFromUrl(null);

      expect(result).toBeNull();
    });
  });
});
