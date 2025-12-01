/**
 * @file __tests__/urgent/urgentService.unit.test.js
 * @description Unit tests for urgent service functions
 * @jest-environment node
 */

const {
  calculateDistance,
  checkSpecialtyCompatibility,
  calculateProfessionalScore,
  calculateEstimatedArrival,
  calculateDynamicPrice,
  calculateMedalBonus
} = require('../../changanet/changanet-backend/src/services/urgentService');

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    urgent_pricing_rules: {
      findFirst: jest.fn()
    }
  }))
}));

describe('Urgent Service Unit Tests', () => {
  describe('calculateDistance', () => {
    test('should calculate distance between two points correctly', () => {
      // Test case: Buenos Aires to Córdoba (approximate)
      const lat1 = -34.6037; // Buenos Aires
      const lon1 = -58.3816;
      const lat2 = -31.4201; // Córdoba
      const lon2 = -64.1888;

      const distance = calculateDistance(lat1, lon1, lat2, lon2);

      // Expected distance is approximately 646 km
      expect(distance).toBeGreaterThan(640);
      expect(distance).toBeLessThan(660);
    });

    test('should return 0 for same coordinates', () => {
      const lat = -34.6037;
      const lon = -58.3816;

      const distance = calculateDistance(lat, lon, lat, lon);

      expect(distance).toBe(0);
    });

    test('should handle edge cases', () => {
      // North Pole to South Pole
      const distance = calculateDistance(90, 0, -90, 0);
      expect(distance).toBeGreaterThan(20000); // Should be around 20037 km
    });
  });

  describe('checkSpecialtyCompatibility', () => {
    test('should return true for matching specialties', () => {
      const professionalProfile = {
        especialidades: ['plomero', 'electricista']
      };
      const serviceCategory = 'plomeria';

      const result = checkSpecialtyCompatibility(professionalProfile, serviceCategory);

      expect(result).toBe(true);
    });

    test('should return false for non-matching specialties', () => {
      const professionalProfile = {
        especialidades: ['jardinero', 'pintor']
      };
      const serviceCategory = 'plomeria';

      const result = checkSpecialtyCompatibility(professionalProfile, serviceCategory);

      expect(result).toBe(false);
    });

    test('should return true when no category specified', () => {
      const professionalProfile = {
        especialidades: ['plomero']
      };

      const result = checkSpecialtyCompatibility(professionalProfile, null);

      expect(result).toBe(true);
    });

    test('should handle array of specialties correctly', () => {
      const professionalProfile = {
        especialidad: 'plomero' // Single specialty
      };
      const serviceCategory = 'plomeria';

      const result = checkSpecialtyCompatibility(professionalProfile, serviceCategory);

      expect(result).toBe(true);
    });
  });

  describe('calculateProfessionalScore', () => {
    test('should calculate score for high-rated professional nearby', () => {
      const professional = {
        usuario: {
          reputation_score: { ranking_score: 95 },
          user_medals: [
            { medal_type: 'puntualidad', medal_name: 'Puntual' },
            { medal_type: 'trabajos_completados', medal_name: 'Experto' }
          ]
        },
        descripcion: 'Profesional experimentado',
        url_foto_perfil: 'photo.jpg',
        anos_experiencia: 10,
        estado_verificacion: 'verificado'
      };
      const distance = 2; // 2km

      const score = calculateProfessionalScore(professional, distance);

      expect(score).toBeGreaterThan(80);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('should penalize distance correctly', () => {
      const professional = {
        usuario: {
          reputation_score: { ranking_score: 80 },
          user_medals: []
        }
      };

      const closeScore = calculateProfessionalScore(professional, 1);
      const farScore = calculateProfessionalScore(professional, 10);

      expect(closeScore).toBeGreaterThan(farScore);
    });

    test('should handle missing reputation score', () => {
      const professional = {
        usuario: {
          user_medals: []
        }
      };
      const distance = 5;

      const score = calculateProfessionalScore(professional, distance);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateMedalBonus', () => {
    test('should calculate bonus for multiple medals', () => {
      const medals = [
        { medal_type: 'puntualidad' },
        { medal_type: 'calificaciones' },
        { medal_type: 'trabajos_completados' },
        { medal_type: 'verificado' }
      ];

      const bonus = calculateMedalBonus(medals);

      expect(bonus).toBe(5); // 2 + 2 + 1 + 3 = 8, capped at 5
    });

    test('should return 0 for no medals', () => {
      const bonus = calculateMedalBonus([]);

      expect(bonus).toBe(0);
    });

    test('should handle unknown medal types', () => {
      const medals = [
        { medal_type: 'unknown' }
      ];

      const bonus = calculateMedalBonus(medals);

      expect(bonus).toBe(1); // Default bonus
    });
  });

  describe('calculateEstimatedArrival', () => {
    test('should calculate arrival time correctly', () => {
      const distance = 10; // 10km

      const arrivalTime = calculateEstimatedArrival(distance);

      // 15 min base + 2 min per km = 35 min
      expect(arrivalTime).toBe(35);
    });

    test('should handle zero distance', () => {
      const arrivalTime = calculateEstimatedArrival(0);

      expect(arrivalTime).toBe(15); // Base time only
    });

    test('should round to nearest minute', () => {
      const arrivalTime = calculateEstimatedArrival(2.7);

      expect(arrivalTime).toBe(20); // 15 + 5.4 = 20.4, rounded to 20
    });
  });

  describe('calculateDynamicPrice', () => {
    let mockPrisma;

    beforeEach(() => {
      mockPrisma = require('@prisma/client').PrismaClient.mock.results[0].value;
    });

    test('should return price from database rule', async () => {
      mockPrisma.urgent_pricing_rules.findFirst.mockResolvedValue({
        base_price: 500,
        urgency_multiplier: 1.5
      });

      const price = await calculateDynamicPrice('plomeria', 'medium');

      expect(price).toBe(750); // 500 * 1.5
    });

    test('should fallback to default calculation when no rule found', async () => {
      mockPrisma.urgent_pricing_rules.findFirst.mockResolvedValue(null);

      const price = await calculateDynamicPrice('plomeria', 'high');

      expect(price).toBe(900); // 500 * 1.8
    });

    test('should handle low urgency multiplier', async () => {
      mockPrisma.urgent_pricing_rules.findFirst.mockResolvedValue(null);

      const price = await calculateDynamicPrice('plomeria', 'low');

      expect(price).toBe(500); // 500 * 1.0
    });

    test('should use provided base price', async () => {
      mockPrisma.urgent_pricing_rules.findFirst.mockResolvedValue(null);

      const price = await calculateDynamicPrice('plomeria', 'high', 1000);

      expect(price).toBe(1800); // 1000 * 1.8
    });

    test('should handle database errors gracefully', async () => {
      mockPrisma.urgent_pricing_rules.findFirst.mockRejectedValue(new Error('DB Error'));

      const price = await calculateDynamicPrice('plomeria', 'medium', 600);

      expect(price).toBe(600); // Fallback to provided base price
    });
  });
});