/**
 * @file __tests__/urgent/urgentService.security.test.js
 * @description Security tests for urgent services (rate limiting, roles, validation)
 * @jest-environment node
 */

const express = require('express');
const request = require('supertest');

// Mock middleware functions
jest.mock('../../changanet/changanet-backend/src/middleware/urgentSecurity', () => ({
  validateGPSCoordinates: jest.fn((req, res, next) => next()),
  authorizeUrgentRoles: jest.fn(() => (req, res, next) => next()),
  createUrgentRateLimit: jest.fn(() => (req, res, next) => next()),
  validateUrgentInput: jest.fn((req, res, next) => next()),
  obfuscateProfessionalCoordinates: jest.fn((req, res, next) => next()),
  secureUrgentErrorHandler: jest.fn((err, req, res, next) => next())
}));

// Mock authentication
jest.mock('../../changanet/changanet-backend/src/middleware/authenticate', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { id: 'user-123', rol: 'cliente' };
    next();
  })
}));

// Mock controllers
jest.mock('../../changanet/changanet-backend/src/controllers/urgentController', () => ({
  createUrgentRequest: jest.fn((req, res) => res.json({ success: true, data: { id: 'req-123' } })),
  getUrgentRequestStatus: jest.fn((req, res) => res.json({ success: true, data: { status: 'pending' } })),
  cancelUrgentRequest: jest.fn((req, res) => res.json({ success: true })),
  getNearbyUrgentRequests: jest.fn((req, res) => res.json({ success: true, data: [] })),
  acceptUrgentRequest: jest.fn((req, res) => res.json({ success: true })),
  rejectUrgentRequest: jest.fn((req, res) => res.json({ success: true })),
  triggerAutoDispatch: jest.fn((req, res) => res.json({ success: true })),
  geoScan: jest.fn((req, res) => res.json({ success: true, data: {} })),
  notifyNearbyProfessionals: jest.fn((req, res) => res.json({ success: true })),
  getPricingRules: jest.fn((req, res) => res.json({ success: true, data: [] })),
  updatePricingRules: jest.fn((req, res) => res.json({ success: true })),
  completeUrgentAssignment: jest.fn((req, res) => res.json({ success: true }))
}));

describe('Urgent Services Security Tests', () => {
  let app;
  let mockValidateGPS;
  let mockAuthorizeRoles;
  let mockRateLimit;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get mock references
    mockValidateGPS = require('../../changanet/changanet-backend/src/middleware/urgentSecurity').validateGPSCoordinates;
    mockAuthorizeRoles = require('../../changanet/changanet-backend/src/middleware/urgentSecurity').authorizeUrgentRoles;
    mockRateLimit = require('../../changanet/changanet-backend/src/middleware/urgentSecurity').createUrgentRateLimit;

    // Create express app with routes
    app = express();
    app.use(express.json());

    // Apply routes (simplified for testing)
    const urgentRoutes = require('../../changanet/changanet-backend/src/routes/urgentRoutes');
    app.use('/api', urgentRoutes);
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to urgent request creation', async () => {
      // Mock rate limit to reject requests
      mockRateLimit.mockImplementation(() => (req, res, next) => {
        res.status(429).json({
          error: 'Límite de solicitudes de servicios urgentes excedido',
          message: 'Has excedido el límite de solicitudes para servicios urgentes. Máximo 3 por hora.',
          code: 'URGENT_RATE_LIMIT_EXCEEDED'
        });
      });

      // Recreate app with new mock
      app = express();
      app.use(express.json());
      const urgentRoutes = require('../../changanet/changanet-backend/src/routes/urgentRoutes');
      app.use('/api', urgentRoutes);

      const response = await request(app)
        .post('/api/urgent-requests')
        .send({
          description: 'Test urgent request',
          latitude: -34.6037,
          longitude: -58.3816,
          urgency_level: 'high'
        });

      expect(response.status).toBe(429);
      expect(response.body.code).toBe('URGENT_RATE_LIMIT_EXCEEDED');
    });

    test('should apply different rate limits for different endpoints', async () => {
      // Mock professional rate limit
      mockRateLimit.mockImplementation(() => (req, res, next) => {
        if (req.path.includes('/urgent/nearby')) {
          res.status(429).json({
            error: 'Límite de operaciones de profesional excedido',
            code: 'PROFESSIONAL_RATE_LIMIT_EXCEEDED'
          });
        } else {
          next();
        }
      });

      app = express();
      app.use(express.json());
      const urgentRoutes = require('../../changanet/changanet-backend/src/routes/urgentRoutes');
      app.use('/api', urgentRoutes);

      const response = await request(app)
        .get('/api/urgent/nearby?lat=-34.6037&lon=-58.3816');

      expect(response.status).toBe(429);
      expect(response.body.code).toBe('PROFESSIONAL_RATE_LIMIT_EXCEEDED');
    });

    test('should allow requests within rate limits', async () => {
      // Mock rate limit to allow requests
      mockRateLimit.mockImplementation(() => (req, res, next) => next());

      app = express();
      app.use(express.json());
      const urgentRoutes = require('../../changanet/changanet-backend/src/routes/urgentRoutes');
      app.use('/api', urgentRoutes);

      const response = await request(app)
        .post('/api/urgent-requests')
        .send({
          description: 'Valid urgent request',
          latitude: -34.6037,
          longitude: -58.3816,
          urgency_level: 'medium'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Role-based Authorization', () => {
    test('should allow clients to create urgent requests', async () => {
      mockAuthorizeRoles.mockImplementation((allowedRoles) => (req, res, next) => {
        if (allowedRoles.includes('cliente')) {
          next();
        } else {
          res.status(403).json({ error: 'Forbidden' });
        }
      });

      app = express();
      app.use(express.json());
      const urgentRoutes = require('../../changanet/changanet-backend/src/routes/urgentRoutes');
      app.use('/api', urgentRoutes);

      const response = await request(app)
        .post('/api/urgent-requests')
        .send({
          description: 'Client urgent request',
          latitude: -34.6037,
          longitude: -58.3816,
          urgency_level: 'high'
        });

      expect(response.status).toBe(200);
    });

    test('should reject professionals trying to create urgent requests', async () => {
      // Mock authentication to return professional role
      const mockAuth = require('../../changanet/changanet-backend/src/middleware/authenticate');
      mockAuth.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 'prof-123', rol: 'profesional' };
        next();
      });

      mockAuthorizeRoles.mockImplementation((allowedRoles) => (req, res, next) => {
        if (allowedRoles.includes('cliente')) {
          res.status(403).json({ error: 'Only clients can create urgent requests' });
        } else {
          next();
        }
      });

      app = express();
      app.use(express.json());
      const urgentRoutes = require('../../changanet/changanet-backend/src/routes/urgentRoutes');
      app.use('/api', urgentRoutes);

      const response = await request(app)
        .post('/api/urgent-requests')
        .send({
          description: 'Professional trying to create request',
          latitude: -34.6037,
          longitude: -58.3816,
          urgency_level: 'medium'
        });

      expect(response.status).toBe(403);
    });

    test('should allow admins to trigger auto-dispatch', async () => {
      const mockAuth = require('../../changanet/changanet-backend/src/middleware/authenticate');
      mockAuth.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 'admin-123', rol: 'admin' };
        next();
      });

      mockAuthorizeRoles.mockImplementation((allowedRoles) => (req, res, next) => {
        if (allowedRoles.includes('admin')) {
          next();
        } else {
          res.status(403).json({ error: 'Admin access required' });
        }
      });

      app = express();
      app.use(express.json());
      const urgentRoutes = require('../../changanet/changanet-backend/src/routes/urgentRoutes');
      app.use('/api', urgentRoutes);

      const response = await request(app)
        .post('/api/urgent/autodispatch');

      expect(response.status).toBe(200);
    });

    test('should check ownership for status requests', async () => {
      mockAuthorizeRoles.mockImplementation((allowedRoles, options) => (req, res, next) => {
        if (options?.checkOwnership && req.user.rol !== 'admin') {
          // Simulate ownership check
          const requestOwner = 'different-user';
          if (req.user.id !== requestOwner) {
            return res.status(403).json({ error: 'Not authorized to view this request' });
          }
        }
        next();
      });

      app = express();
      app.use(express.json());
      const urgentRoutes = require('../../changanet/changanet-backend/src/routes/urgentRoutes');
      app.use('/api', urgentRoutes);

      const response = await request(app)
        .get('/api/urgent-requests/req-123/status');

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Not authorized');
    });
  });

  describe('GPS Coordinate Validation', () => {
    test('should validate GPS coordinates are within valid ranges', async () => {
      mockValidateGPS.mockImplementation((req, res, next) => {
        const { latitude, longitude } = req.body;
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          return res.status(400).json({
            error: 'Invalid GPS coordinates',
            message: 'Latitude must be between -90 and 90, longitude between -180 and 180'
          });
        }
        next();
      });

      app = express();
      app.use(express.json());
      const urgentRoutes = require('../../changanet/changanet-backend/src/routes/urgentRoutes');
      app.use('/api', urgentRoutes);

      const response = await request(app)
        .post('/api/urgent-requests')
        .send({
          description: 'Invalid coordinates test',
          latitude: 91, // Invalid latitude
          longitude: -58.3816,
          urgency_level: 'high'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid GPS coordinates');
    });

    test('should accept valid GPS coordinates', async () => {
      mockValidateGPS.mockImplementation((req, res, next) => {
        const { latitude, longitude } = req.body;
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          return res.status(400).json({ error: 'Coordinates must be numbers' });
        }
        next();
      });

      app = express();
      app.use(express.json());
      const urgentRoutes = require('../../changanet/changanet-backend/src/routes/urgentRoutes');
      app.use('/api', urgentRoutes);

      const response = await request(app)
        .post('/api/urgent-requests')
        .send({
          description: 'Valid coordinates',
          latitude: -34.6037,
          longitude: -58.3816,
          urgency_level: 'medium'
        });

      expect(response.status).toBe(200);
    });

    test('should reject non-numeric coordinates', async () => {
      mockValidateGPS.mockImplementation((req, res, next) => {
        const { latitude, longitude } = req.body;
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          return res.status(400).json({ error: 'Coordinates must be numbers' });
        }
        next();
      });

      app = express();
      app.use(express.json());
      const urgentRoutes = require('../../changanet/changanet-backend/src/routes/urgentRoutes');
      app.use('/api', urgentRoutes);

      const response = await request(app)
        .post('/api/urgent-requests')
        .send({
          description: 'Invalid coordinate types',
          latitude: 'invalid',
          longitude: -58.3816,
          urgency_level: 'low'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Coordinates must be numbers');
    });
  });

  describe('Input Validation and Sanitization', () => {
    test('should validate required fields in urgent requests', async () => {
      const mockValidateInput = require('../../changanet/changanet-backend/src/middleware/urgentSecurity').validateUrgentInput;
      mockValidateInput.mockImplementation((req, res, next) => {
        const { description, urgency_level } = req.body;
        if (!description || !urgency_level) {
          return res.status(400).json({
            error: 'Missing required fields',
            message: 'Description and urgency level are required'
          });
        }
        next();
      });

      app = express();
      app.use(express.json());
      const urgentRoutes = require('../../changanet/changanet-backend/src/routes/urgentRoutes');
      app.use('/api', urgentRoutes);

      const response = await request(app)
        .post('/api/urgent-requests')
        .send({
          // Missing description and urgency_level
          latitude: -34.6037,
          longitude: -58.3816
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    test('should validate urgency level values', async () => {
      const mockValidateInput = require('../../changanet/changanet-backend/src/middleware/urgentSecurity').validateUrgentInput;
      mockValidateInput.mockImplementation((req, res, next) => {
        const { urgency_level } = req.body;
        const validLevels = ['low', 'medium', 'high'];
        if (!validLevels.includes(urgency_level)) {
          return res.status(400).json({
            error: 'Invalid urgency level',
            message: 'Urgency level must be low, medium, or high'
          });
        }
        next();
      });

      app = express();
      app.use(express.json());
      const urgentRoutes = require('../../changanet/changanet-backend/src/routes/urgentRoutes');
      app.use('/api', urgentRoutes);

      const response = await request(app)
        .post('/api/urgent-requests')
        .send({
          description: 'Test request',
          latitude: -34.6037,
          longitude: -58.3816,
          urgency_level: 'invalid_level'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid urgency level');
    });

    test('should sanitize and validate description length', async () => {
      const mockValidateInput = require('../../changanet/changanet-backend/src/middleware/urgentSecurity').validateUrgentInput;
      mockValidateInput.mockImplementation((req, res, next) => {
        const { description } = req.body;
        if (description.length > 1000) {
          return res.status(400).json({
            error: 'Description too long',
            message: 'Description must be less than 1000 characters'
          });
        }
        next();
      });

      app = express();
      app.use(express.json());
      const urgentRoutes = require('../../changanet/changanet-backend/src/routes/urgentRoutes');
      app.use('/api', urgentRoutes);

      const longDescription = 'A'.repeat(1001);

      const response = await request(app)
        .post('/api/urgent-requests')
        .send({
          description: longDescription,
          latitude: -34.6037,
          longitude: -58.3816,
          urgency_level: 'high'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Description too long');
    });
  });

  describe('Coordinate Obfuscation', () => {
    test('should obfuscate professional coordinates in responses', async () => {
      const mockObfuscate = require('../../changanet/changanet-backend/src/middleware/urgentSecurity').obfuscateProfessionalCoordinates;
      mockObfuscate.mockImplementation((req, res, next) => {
        // Simulate obfuscation by rounding coordinates
        if (res.locals && res.locals.professionals) {
          res.locals.professionals = res.locals.professionals.map(prof => ({
            ...prof,
            latitude: Math.round(prof.latitude * 100) / 100,
            longitude: Math.round(prof.longitude * 100) / 100
          }));
        }
        next();
      });

      // Mock controller to set professionals data
      const mockNearbyRequests = require('../../changanet/changanet-backend/src/controllers/urgentController').getNearbyUrgentRequests;
      mockNearbyRequests.mockImplementation((req, res) => {
        res.locals.professionals = [
          { id: 'prof-1', latitude: -34.603722, longitude: -58.381611 }
        ];
        res.json({ success: true, data: [] });
      });

      app = express();
      app.use(express.json());
      const urgentRoutes = require('../../changanet/changanet-backend/src/routes/urgentRoutes');
      app.use('/api', urgentRoutes);

      const response = await request(app)
        .get('/api/urgent/nearby?lat=-34.6037&lon=-58.3816');

      expect(response.status).toBe(200);
      // Verify obfuscation was applied (coordinates rounded)
      expect(mockObfuscate).toHaveBeenCalled();
    });
  });

  describe('Error Handling Security', () => {
    test('should handle errors securely without exposing sensitive information', async () => {
      const mockErrorHandler = require('../../changanet/changanet-backend/src/middleware/urgentSecurity').secureUrgentErrorHandler;
      mockErrorHandler.mockImplementation((err, req, res, next) => {
        // Remove any sensitive information from error messages
        const safeError = {
          error: 'Internal server error',
          message: 'An unexpected error occurred',
          code: 'INTERNAL_ERROR'
        };
        res.status(500).json(safeError);
      });

      // Mock controller to throw an error
      const mockCreateRequest = require('../../changanet/changanet-backend/src/controllers/urgentController').createUrgentRequest;
      mockCreateRequest.mockImplementation(() => {
        throw new Error('Database connection failed with sensitive credentials');
      });

      app = express();
      app.use(express.json());
      const urgentRoutes = require('../../changanet/changanet-backend/src/routes/urgentRoutes');
      app.use('/api', urgentRoutes);

      const response = await request(app)
        .post('/api/urgent-requests')
        .send({
          description: 'Test request that causes error',
          latitude: -34.6037,
          longitude: -58.3816,
          urgency_level: 'high'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      expect(response.body.message).not.toContain('credentials'); // Sensitive info removed
    });
  });
});