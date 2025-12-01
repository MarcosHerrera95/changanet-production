/**
 * @file __tests__/urgent/urgentService.integration.test.js
 * @description Integration tests for urgent service workflows
 * @jest-environment node
 */

const {
  autoAssignProfessionals,
  findNearbyRequests,
  findAvailableProfessionals,
  notifyNearbyProfessionals,
  geoScanProfessionals
} = require('../../changanet/changanet-backend/src/services/urgentService');

// Mock all external dependencies
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    urgent_requests: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn()
    },
    urgent_request_candidates: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn()
    },
    perfiles_profesionales: {
      findMany: jest.fn()
    },
    availability_slots: {
      count: jest.fn()
    },
    usuarios: {
      findUnique: jest.fn()
    }
  }))
}));

jest.mock('../../changanet/changanet-backend/src/services/pushNotificationService', () => ({
  sendPushNotification: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../changanet/changanet-backend/src/services/notificationService', () => ({
  createNotification: jest.fn().mockResolvedValue(true)
}));

describe('Urgent Service Integration Tests', () => {
  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = require('@prisma/client').PrismaClient.mock.results[0].value;
  });

  describe('Client → Assignment → Acceptance Flow', () => {
    test('should complete full urgent request flow successfully', async () => {
      // Mock request data
      const mockRequest = {
        id: 'req-123',
        status: 'pending',
        latitude: -34.6037,
        longitude: -58.3816,
        service_category: 'plomeria',
        urgency_level: 'high',
        description: 'Fuga de agua urgente'
      };

      // Mock available professionals
      const mockProfessionals = [
        {
          usuario: {
            id: 'prof-1',
            nombre: 'Juan Pérez',
            fcm_token: 'token123',
            notificaciones_push: true,
            reputation_score: { ranking_score: 95 },
            user_medals: [{ medal_type: 'puntualidad' }]
          },
          especialidad: 'plomero',
          esta_disponible: true,
          latitud: -34.6000,
          longitud: -58.3800,
          descripcion: 'Plomero experimentado',
          url_foto_perfil: 'photo.jpg',
          anos_experiencia: 10,
          estado_verificacion: 'verificado'
        }
      ];

      // Setup mocks
      mockPrisma.urgent_requests.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.perfiles_profesionales.findMany.mockResolvedValue(mockProfessionals);
      mockPrisma.availability_slots.count.mockResolvedValue(5); // Has available slots
      mockPrisma.urgent_request_candidates.create.mockResolvedValue({
        id: 'candidate-1',
        professional_id: 'prof-1',
        distance: 0.5,
        estimated_arrival_time: 16
      });

      // Execute auto-assignment
      const result = await autoAssignProfessionals('req-123');

      // Verify result
      expect(result.success).toBe(true);
      expect(result.candidates_count).toBe(1);
      expect(mockPrisma.urgent_request_candidates.create).toHaveBeenCalledTimes(1);

      // Verify candidate creation with correct data
      expect(mockPrisma.urgent_request_candidates.create).toHaveBeenCalledWith({
        data: {
          urgent_request_id: 'req-123',
          professional_id: 'prof-1',
          distance: expect.any(Number),
          estimated_arrival_time: expect.any(Number),
          status: 'available'
        }
      });
    });

    test('should handle no available professionals gracefully', async () => {
      const mockRequest = {
        id: 'req-456',
        status: 'pending',
        latitude: -34.6037,
        longitude: -58.3816,
        service_category: 'plomeria'
      };

      // No professionals available
      mockPrisma.urgent_requests.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.perfiles_profesionales.findMany.mockResolvedValue([]);

      const result = await autoAssignProfessionals('req-456');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No hay profesionales disponibles');
    });

    test('should skip already assigned requests', async () => {
      const mockRequest = {
        id: 'req-789',
        status: 'assigned',
        assignments: [{ id: 'assignment-1' }]
      };

      mockPrisma.urgent_requests.findUnique.mockResolvedValue(mockRequest);

      const result = await autoAssignProfessionals('req-789');

      expect(result.success).toBe(true);
      expect(result.message).toContain('ya asignada');
      expect(mockPrisma.perfiles_profesionales.findMany).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Professionals Responding Simultaneously', () => {
    test('should handle concurrent professional responses', async () => {
      const requestId = 'req-concurrent-123';
      const mockRequest = {
        id: requestId,
        latitude: -34.6037,
        longitude: -58.3816,
        service_category: 'electricidad',
        urgency_level: 'high'
      };

      // Multiple professionals available
      const mockProfessionals = [
        {
          usuario: { id: 'prof-1', nombre: 'Ana López', reputation_score: { ranking_score: 90 } },
          especialidad: 'electricista',
          esta_disponible: true,
          latitud: -34.6000,
          longitud: -58.3800
        },
        {
          usuario: { id: 'prof-2', nombre: 'Carlos Ruiz', reputation_score: { ranking_score: 85 } },
          especialidad: 'electricista',
          esta_disponible: true,
          latitud: -34.6050,
          longitud: -58.3850
        },
        {
          usuario: { id: 'prof-3', nombre: 'María González', reputation_score: { ranking_score: 95 } },
          especialidad: 'electricista',
          esta_disponible: true,
          latitud: -34.6020,
          longitud: -58.3820
        }
      ];

      mockPrisma.urgent_requests.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.perfiles_profesionales.findMany.mockResolvedValue(mockProfessionals);
      mockPrisma.availability_slots.count.mockResolvedValue(3);
      mockPrisma.urgent_request_candidates.create.mockResolvedValue({});

      const result = await autoAssignProfessionals(requestId);

      expect(result.success).toBe(true);
      expect(result.candidates_count).toBe(3); // All 3 professionals assigned
      expect(mockPrisma.urgent_request_candidates.create).toHaveBeenCalledTimes(3);
    });

    test('should limit candidates to maximum of 5', async () => {
      const mockRequest = {
        id: 'req-many-123',
        latitude: -34.6037,
        longitude: -58.3816,
        service_category: 'limpieza'
      };

      // Create 8 professionals
      const mockProfessionals = Array.from({ length: 8 }, (_, i) => ({
        usuario: {
          id: `prof-${i + 1}`,
          nombre: `Professional ${i + 1}`,
          reputation_score: { ranking_score: 80 + i }
        },
        especialidad: 'limpiador',
        esta_disponible: true,
        latitud: -34.6037 + (i * 0.001),
        longitud: -58.3816 + (i * 0.001)
      }));

      mockPrisma.urgent_requests.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.perfiles_profesionales.findMany.mockResolvedValue(mockProfessionals);
      mockPrisma.availability_slots.count.mockResolvedValue(5);
      mockPrisma.urgent_request_candidates.create.mockResolvedValue({});

      const result = await autoAssignProfessionals('req-many-123');

      expect(result.success).toBe(true);
      expect(result.candidates_count).toBe(5); // Limited to 5
      expect(mockPrisma.urgent_request_candidates.create).toHaveBeenCalledTimes(5);
    });
  });

  describe('Notifications and Communication', () => {
    test('should send notifications to all assigned candidates', async () => {
      const mockRequest = {
        id: 'req-notify-123',
        latitude: -34.6037,
        longitude: -58.3816,
        service_category: 'carpinteria',
        urgency_level: 'medium',
        description: 'Reparar puerta'
      };

      const candidates = [
        {
          professional_id: 'prof-1',
          distance: 2.5,
          estimated_arrival_time: 20
        },
        {
          professional_id: 'prof-2',
          distance: 3.1,
          estimated_arrival_time: 23
        }
      ];

      const mockProfessional = {
        fcm_token: 'fcm-token-123',
        notificaciones_push: true,
        email: 'prof@example.com',
        telefono: '123456789',
        sms_enabled: true
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockProfessional);

      // Mock notification services
      const mockPush = require('../../changanet/changanet-backend/src/services/pushNotificationService').sendPushNotification;
      const mockNotification = require('../../changanet/changanet-backend/src/services/notificationService').createNotification;

      await require('../../changanet/changanet-backend/src/services/urgentService').notifyCandidates(candidates, mockRequest);

      // Verify push notification was sent
      expect(mockPush).toHaveBeenCalledTimes(2);
      expect(mockPush).toHaveBeenCalledWith(
        'prof-1',
        '¡Solicitud Urgente Cerca!',
        expect.stringContaining('2.5km'),
        expect.objectContaining({
          type: 'urgent_request',
          requestId: 'req-notify-123'
        })
      );

      // Verify in-app notification was created
      expect(mockNotification).toHaveBeenCalledTimes(2);
    });

    test('should send email for high urgency requests', async () => {
      const mockRequest = {
        id: 'req-high-urgent',
        urgency_level: 'high',
        description: 'Emergencia eléctrica'
      };

      const candidates = [{ professional_id: 'prof-1', distance: 1.0, estimated_arrival_time: 17 }];
      const mockProfessional = {
        fcm_token: 'token',
        notificaciones_push: true,
        email: 'urgent@example.com'
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockProfessional);

      // Mock email service
      jest.mock('../../changanet/changanet-backend/src/services/emailService', () => ({
        sendEmail: jest.fn().mockResolvedValue(true)
      }));

      const mockEmail = require('../../changanet/changanet-backend/src/services/emailService').sendEmail;

      await require('../../changanet/changanet-backend/src/services/urgentService').notifyCandidates(candidates, mockRequest);

      expect(mockEmail).toHaveBeenCalledWith(
        'urgent@example.com',
        'Solicitud Urgente de Alta Prioridad',
        expect.stringContaining('Emergencia eléctrica')
      );
    });
  });

  describe('Geo-spatial Operations', () => {
    test('should perform geo-scan and return correct statistics', async () => {
      const centerLat = -34.6037;
      const centerLon = -58.3816;
      const radiusKm = 5;

      const mockProfessionals = [
        {
          usuario: { id: 'prof-1', nombre: 'Prof 1', rol: 'profesional' },
          esta_disponible: true,
          latitud: -34.6000, // ~0.5km away
          longitud: -58.3800
        },
        {
          usuario: { id: 'prof-2', nombre: 'Prof 2', rol: 'profesional' },
          esta_disponible: true,
          latitud: -34.5500, // ~6km away (outside radius)
          longitud: -58.3500
        },
        {
          usuario: { id: 'prof-3', nombre: 'Prof 3', rol: 'profesional' },
          esta_disponible: true,
          latitud: -34.6050, // ~0.3km away
          longitud: -58.3820
        }
      ];

      mockPrisma.perfiles_profesionales.findMany.mockResolvedValue(mockProfessionals);

      const result = await geoScanProfessionals(centerLat, centerLon, radiusKm, 'plomeria');

      expect(result.total_professionals).toBe(3);
      expect(result.in_radius).toBe(2); // Only 2 within 5km radius
      expect(result.professionals).toHaveLength(2);
      expect(result.professionals[0].distance).toBeDefined();
      expect(result.professionals[0].specialty_match).toBeDefined();
    });

    test('should filter by service category in geo-scan', async () => {
      const mockProfessionals = [
        {
          usuario: { id: 'prof-1', nombre: 'Electricista', rol: 'profesional' },
          esta_disponible: true,
          latitud: -34.6000,
          longitud: -58.3800,
          especialidad: 'electricista'
        },
        {
          usuario: { id: 'prof-2', nombre: 'Plomero', rol: 'profesional' },
          esta_disponible: true,
          latitud: -34.6010,
          longitud: -58.3810,
          especialidad: 'plomero'
        }
      ];

      mockPrisma.perfiles_profesionales.findMany.mockResolvedValue(mockProfessionals);

      const result = await geoScanProfessionals(-34.6037, -58.3816, 5, 'plomeria');

      expect(result.in_radius).toBe(2);
      // Should check specialty compatibility
      expect(result.professionals.some(p => p.specialty_match)).toBe(true);
    });
  });

  describe('Nearby Requests Discovery', () => {
    test('should find and filter nearby requests correctly', async () => {
      const profLat = -34.6037;
      const profLon = -58.3816;
      const radiusKm = 10;

      const mockProfessionalProfile = {
        usuario_id: 'prof-123',
        especialidad: 'plomero'
      };

      const mockRequests = [
        {
          id: 'req-1',
          status: 'pending',
          latitude: -34.6000, // ~0.5km
          longitude: -58.3800,
          service_category: 'plomeria',
          urgency_level: 'high',
          created_at: new Date(),
          client: { nombre: 'Cliente 1' }
        },
        {
          id: 'req-2',
          status: 'pending',
          latitude: -34.5000, // ~12km (outside radius)
          longitude: -58.3000,
          service_category: 'electricidad',
          urgency_level: 'medium',
          created_at: new Date(),
          client: { nombre: 'Cliente 2' }
        },
        {
          id: 'req-3',
          status: 'assigned', // Already assigned
          latitude: -34.6020,
          longitude: -58.3820,
          service_category: 'plomeria',
          urgency_level: 'low',
          created_at: new Date(),
          client: { nombre: 'Cliente 3' }
        }
      ];

      mockPrisma.urgent_requests.findMany.mockResolvedValue(mockRequests);
      mockPrisma.urgent_request_candidates.findFirst.mockResolvedValue(null); // Not already candidate

      const nearbyRequests = await findNearbyRequests(profLat, profLon, radiusKm, mockProfessionalProfile);

      expect(nearbyRequests).toHaveLength(1); // Only req-1 should match
      expect(nearbyRequests[0].id).toBe('req-1');
      expect(nearbyRequests[0].distance).toBeDefined();
      expect(nearbyRequests[0].is_already_candidate).toBe(false);
    });

    test('should sort requests by urgency and distance', async () => {
      const mockRequests = [
        {
          id: 'req-low',
          status: 'pending',
          latitude: -34.6000,
          longitude: -58.3800,
          service_category: 'plomeria',
          urgency_level: 'low',
          created_at: new Date(),
          client: { nombre: 'Low Urgency' }
        },
        {
          id: 'req-high',
          status: 'pending',
          latitude: -34.6010, // Slightly farther
          longitude: -58.3810,
          service_category: 'plomeria',
          urgency_level: 'high',
          created_at: new Date(),
          client: { nombre: 'High Urgency' }
        }
      ];

      mockPrisma.urgent_requests.findMany.mockResolvedValue(mockRequests);
      mockPrisma.urgent_request_candidates.findFirst.mockResolvedValue(null);

      const nearbyRequests = await findNearbyRequests(-34.6037, -58.3816, 10, { usuario_id: 'prof-123' });

      // High urgency should come first, then by distance
      expect(nearbyRequests[0].id).toBe('req-high');
      expect(nearbyRequests[1].id).toBe('req-low');
    });
  });
});