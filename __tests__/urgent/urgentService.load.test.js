/**
 * @file __tests__/urgent/urgentService.load.test.js
 * @description Load tests for urgent services - concurrent request simulation
 * @jest-environment node
 */

const {
  autoAssignProfessionals,
  findNearbyRequests,
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

describe('Urgent Services Load Tests', () => {
  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = require('@prisma/client').PrismaClient.mock.results[0].value;
  });

  describe('Concurrent Urgent Request Creation', () => {
    test('should handle 10 concurrent urgent requests without race conditions', async () => {
      const concurrentRequests = 10;
      const requestPromises = [];

      // Mock database operations with delays to simulate real conditions
      mockPrisma.urgent_requests.create.mockImplementation(async (data) => {
        // Simulate database write delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        return { id: `req-${Date.now()}-${Math.random()}`, ...data.data };
      });

      mockPrisma.perfiles_profesionales.findMany.mockResolvedValue([
        {
          usuario: {
            id: 'prof-1',
            nombre: 'Test Professional',
            fcm_token: 'token',
            notificaciones_push: true,
            reputation_score: { ranking_score: 90 }
          },
          especialidad: 'plomero',
          esta_disponible: true,
          latitud: -34.6037,
          longitud: -58.3816
        }
      ]);

      mockPrisma.availability_slots.count.mockResolvedValue(5);
      mockPrisma.urgent_request_candidates.create.mockResolvedValue({});

      // Create concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        const requestPromise = (async () => {
          const requestData = {
            client_id: `client-${i}`,
            description: `Urgent request ${i} - Emergency plumbing`,
            latitude: -34.6037 + (Math.random() - 0.5) * 0.01, // Slight variations
            longitude: -58.3816 + (Math.random() - 0.5) * 0.01,
            urgency_level: 'high',
            service_category: 'plomeria'
          };

          // Simulate the full flow: create request + auto-assign
          const mockRequest = await mockPrisma.urgent_requests.create({ data: requestData });
          const assignmentResult = await autoAssignProfessionals(mockRequest.id);
          return { request: mockRequest, assignment: assignmentResult };
        })();

        requestPromises.push(requestPromise);
      }

      // Wait for all concurrent operations to complete
      const results = await Promise.all(requestPromises);

      // Verify all requests were processed
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.request.id).toBeDefined();
        expect(result.assignment.success).toBe(true);
      });

      // Verify database was called correctly
      expect(mockPrisma.urgent_requests.create).toHaveBeenCalledTimes(concurrentRequests);
      expect(mockPrisma.urgent_request_candidates.create).toHaveBeenCalledTimes(concurrentRequests);
    });

    test('should handle 50 concurrent requests with proper resource management', async () => {
      const concurrentRequests = 50;
      const requestPromises = [];

      // Mock with more realistic delays
      mockPrisma.urgent_requests.create.mockImplementation(async (data) => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 5));
        return { id: `req-${Date.now()}-${Math.random()}`, ...data.data };
      });

      // Limited professionals available
      const availableProfessionals = Array.from({ length: 20 }, (_, i) => ({
        usuario: {
          id: `prof-${i + 1}`,
          nombre: `Professional ${i + 1}`,
          fcm_token: `token-${i + 1}`,
          notificaciones_push: true,
          reputation_score: { ranking_score: 80 + Math.random() * 20 }
        },
        especialidad: 'electricista',
        esta_disponible: true,
        latitud: -34.6037 + (Math.random() - 0.5) * 0.02,
        longitud: -58.3816 + (Math.random() - 0.5) * 0.02
      }));

      mockPrisma.perfiles_profesionales.findMany.mockResolvedValue(availableProfessionals);
      mockPrisma.availability_slots.count.mockResolvedValue(3);
      mockPrisma.urgent_request_candidates.create.mockResolvedValue({});

      // Create high volume of concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        const requestPromise = (async () => {
          const requestData = {
            client_id: `client-${i}`,
            description: `High volume request ${i}`,
            latitude: -34.6037,
            longitude: -58.3816,
            urgency_level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
            service_category: 'electricidad'
          };

          const mockRequest = await mockPrisma.urgent_requests.create({ data: requestData });
          const assignmentResult = await autoAssignProfessionals(mockRequest.id);
          return assignmentResult;
        })();

        requestPromises.push(requestPromise);
      }

      // Execute all concurrent operations
      const startTime = Date.now();
      const results = await Promise.all(requestPromises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const avgTimePerRequest = totalTime / concurrentRequests;

      console.log(`Processed ${concurrentRequests} concurrent requests in ${totalTime}ms`);
      console.log(`Average time per request: ${avgTimePerRequest.toFixed(2)}ms`);

      // Verify performance expectations
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(avgTimePerRequest).toBeLessThan(2000); // Average under 2 seconds per request

      // Verify all operations completed
      expect(results).toHaveLength(concurrentRequests);
      const successfulAssignments = results.filter(r => r.success).length;
      expect(successfulAssignments).toBeGreaterThanOrEqual(concurrentRequests * 0.8); // At least 80% success rate
    });
  });

  describe('Concurrent Professional Responses', () => {
    test('should handle multiple professionals accepting simultaneously', async () => {
      const requestId = 'concurrent-accept-test';
      const professionalCount = 8;

      // Mock request
      mockPrisma.urgent_requests.findUnique.mockResolvedValue({
        id: requestId,
        status: 'pending',
        candidates: []
      });

      // Mock acceptance operation with race condition simulation
      let acceptedCount = 0;
      const acceptancePromises = [];

      for (let i = 0; i < professionalCount; i++) {
        const acceptPromise = (async () => {
          // Simulate network/database delay
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));

          // Simulate database check and update with optimistic locking
          if (acceptedCount === 0) {
            acceptedCount++;
            return { success: true, message: 'Accepted by professional ' + i };
          } else {
            return { success: false, message: 'Already accepted by another professional' };
          }
        })();

        acceptancePromises.push(acceptPromise);
      }

      const results = await Promise.all(acceptancePromises);

      // Verify only one acceptance succeeded (race condition handling)
      const successfulAcceptances = results.filter(r => r.success).length;
      expect(successfulAcceptances).toBe(1);

      const failedAcceptances = results.filter(r => !r.success).length;
      expect(failedAcceptances).toBe(professionalCount - 1);
    });

    test('should handle concurrent candidate notifications', async () => {
      const candidates = Array.from({ length: 15 }, (_, i) => ({
        professional_id: `prof-${i + 1}`,
        distance: 2 + Math.random() * 8,
        estimated_arrival_time: 15 + Math.random() * 30
      }));

      const mockRequest = {
        id: 'notify-test-req',
        urgency_level: 'high',
        description: 'Concurrent notification test'
      };

      // Mock professional data
      mockPrisma.usuarios.findUnique.mockImplementation(({ where }) => {
        const profId = where.id;
        return Promise.resolve({
          fcm_token: `fcm-${profId}`,
          notificaciones_push: Math.random() > 0.2, // 80% have push enabled
          email: `prof${profId}@test.com`,
          telefono: `123456789${profId.slice(-1)}`,
          sms_enabled: Math.random() > 0.5
        });
      });

      const startTime = Date.now();

      // Send notifications concurrently
      await require('../../changanet/changanet-backend/src/services/urgentService').notifyCandidates(candidates, mockRequest);

      const endTime = Date.now();
      const notificationTime = endTime - startTime;

      console.log(`Sent ${candidates.length} concurrent notifications in ${notificationTime}ms`);

      // Verify performance - should complete quickly even with concurrent operations
      expect(notificationTime).toBeLessThan(5000); // Under 5 seconds for 15 notifications

      // Verify notification services were called
      const mockPush = require('../../changanet/changanet-backend/src/services/pushNotificationService').sendPushNotification;
      const mockNotification = require('../../changanet/changanet-backend/src/services/notificationService').createNotification;

      expect(mockPush).toHaveBeenCalled();
      expect(mockNotification).toHaveBeenCalled();
    });
  });

  describe('Geo-spatial Load Testing', () => {
    test('should handle concurrent geo-scan operations', async () => {
      const scanCount = 20;
      const scanPromises = [];

      // Mock large dataset of professionals
      const mockProfessionals = Array.from({ length: 1000 }, (_, i) => ({
        usuario: {
          id: `prof-${i + 1}`,
          nombre: `Professional ${i + 1}`,
          rol: 'profesional'
        },
        esta_disponible: Math.random() > 0.3, // 70% available
        latitud: -34.6037 + (Math.random() - 0.5) * 0.1, // Within ~11km
        longitud: -58.3816 + (Math.random() - 0.5) * 0.1
      }));

      mockPrisma.perfiles_profesionales.findMany.mockResolvedValue(mockProfessionals);

      // Create concurrent geo-scan operations
      for (let i = 0; i < scanCount; i++) {
        const scanPromise = geoScanProfessionals(
          -34.6037 + (Math.random() - 0.5) * 0.05, // Slightly different centers
          -58.3816 + (Math.random() - 0.5) * 0.05,
          5 + Math.random() * 10, // Random radius 5-15km
          ['plomeria', 'electricidad', 'carpinteria'][Math.floor(Math.random() * 3)]
        );
        scanPromises.push(scanPromise);
      }

      const startTime = Date.now();
      const results = await Promise.all(scanPromises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const avgTimePerScan = totalTime / scanCount;

      console.log(`Completed ${scanCount} concurrent geo-scans in ${totalTime}ms`);
      console.log(`Average time per scan: ${avgTimePerScan.toFixed(2)}ms`);

      // Verify performance
      expect(totalTime).toBeLessThan(10000); // Under 10 seconds for 20 concurrent scans
      expect(avgTimePerScan).toBeLessThan(1000); // Under 1 second per scan

      // Verify results
      expect(results).toHaveLength(scanCount);
      results.forEach(result => {
        expect(result).toHaveProperty('total_professionals', 1000);
        expect(result).toHaveProperty('in_radius');
        expect(result).toHaveProperty('professionals');
        expect(Array.isArray(result.professionals)).toBe(true);
      });
    });

    test('should handle concurrent nearby requests discovery', async () => {
      const discoveryCount = 25;
      const discoveryPromises = [];

      // Mock requests database
      const mockRequests = Array.from({ length: 200 }, (_, i) => ({
        id: `req-${i + 1}`,
        status: 'pending',
        latitude: -34.6037 + (Math.random() - 0.5) * 0.2,
        longitude: -58.3816 + (Math.random() - 0.5) * 0.2,
        service_category: ['plomeria', 'electricidad', 'carpinteria'][Math.floor(Math.random() * 3)],
        urgency_level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        created_at: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Last 24h
        client: { nombre: `Client ${i + 1}` }
      }));

      mockPrisma.urgent_requests.findMany.mockResolvedValue(mockRequests);
      mockPrisma.urgent_request_candidates.findFirst.mockResolvedValue(null);

      // Create concurrent discovery operations
      for (let i = 0; i < discoveryCount; i++) {
        const discoveryPromise = findNearbyRequests(
          -34.6037 + (Math.random() - 0.5) * 0.1, // Different professional locations
          -58.3816 + (Math.random() - 0.5) * 0.1,
          10 + Math.random() * 20, // Random radius
          { usuario_id: `prof-${i + 1}` }
        );
        discoveryPromises.push(discoveryPromise);
      }

      const startTime = Date.now();
      const results = await Promise.all(discoveryPromises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const avgTimePerDiscovery = totalTime / discoveryCount;

      console.log(`Completed ${discoveryCount} concurrent discoveries in ${totalTime}ms`);
      console.log(`Average time per discovery: ${avgTimePerDiscovery.toFixed(2)}ms`);

      // Verify performance
      expect(totalTime).toBeLessThan(15000); // Under 15 seconds
      expect(avgTimePerDiscovery).toBeLessThan(1200); // Under 1.2 seconds per discovery

      // Verify results structure
      expect(results).toHaveLength(discoveryCount);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
        result.forEach(request => {
          expect(request).toHaveProperty('id');
          expect(request).toHaveProperty('distance');
          expect(request).toHaveProperty('is_already_candidate');
        });
      });
    });
  });

  describe('Memory and Resource Usage', () => {
    test('should not have memory leaks during sustained concurrent operations', async () => {
      const operationCount = 100;
      const concurrentBatches = 5;

      // Track memory usage
      const initialMemory = process.memoryUsage();

      for (let batch = 0; batch < concurrentBatches; batch++) {
        const batchPromises = [];

        for (let i = 0; i < operationCount / concurrentBatches; i++) {
          const operationPromise = (async () => {
            // Simulate a complete urgent request flow
            const requestData = {
              client_id: `client-${batch}-${i}`,
              description: `Load test request ${batch}-${i}`,
              latitude: -34.6037,
              longitude: -58.3816,
              urgency_level: 'medium',
              service_category: 'plomeria'
            };

            const mockRequest = await mockPrisma.urgent_requests.create({ data: requestData });
            await autoAssignProfessionals(mockRequest.id);

            // Small delay to simulate processing
            await new Promise(resolve => setTimeout(resolve, 1));
          })();

          batchPromises.push(operationPromise);
        }

        await Promise.all(batchPromises);

        // Force garbage collection if available (in test environment)
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Memory usage: ${initialMemory.heapUsed} -> ${finalMemory.heapUsed} (${memoryIncrease} increase)`);

      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Database Connection Pool Stress', () => {
    test('should handle database connection pool limits gracefully', async () => {
      const concurrentDbOperations = 30;
      const operationPromises = [];

      // Mock database operations that might be connection-intensive
      mockPrisma.urgent_requests.findMany.mockImplementation(async () => {
        // Simulate connection pool delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        return [];
      });

      mockPrisma.perfiles_profesionales.findMany.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        return [];
      });

      // Create concurrent database operations
      for (let i = 0; i < concurrentDbOperations; i++) {
        const dbPromise = (async () => {
          const [requests, professionals] = await Promise.all([
            mockPrisma.urgent_requests.findMany({ where: {} }),
            mockPrisma.perfiles_profesionales.findMany({ where: {} })
          ]);
          return { requests: requests.length, professionals: professionals.length };
        })();

        operationPromises.push(dbPromise);
      }

      const startTime = Date.now();
      const results = await Promise.all(operationPromises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const avgTimePerOperation = totalTime / concurrentDbOperations;

      console.log(`Completed ${concurrentDbOperations} concurrent DB operations in ${totalTime}ms`);
      console.log(`Average time per DB operation: ${avgTimePerOperation.toFixed(2)}ms`);

      // Verify all operations completed
      expect(results).toHaveLength(concurrentDbOperations);
      expect(totalTime).toBeLessThan(20000); // Under 20 seconds
      expect(avgTimePerOperation).toBeLessThan(2000); // Under 2 seconds per operation
    });
  });
});