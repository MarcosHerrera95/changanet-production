// src/tests/unit/statsController.test.js
const { PrismaClient } = require('@prisma/client');
const {
  getClientStats,
  getProfessionalStats,
  getClientActivity,
  getProfessionalActivity
} = require('../../controllers/statsController');

const prisma = new PrismaClient();

describe('Stats Controller', () => {
  let testUser;
  let testService;

  beforeEach(async () => {
    // Limpiar base de datos
    await prisma.resenas.deleteMany({});
    await prisma.cotizaciones.deleteMany({});
    await prisma.servicios.deleteMany({});
    await prisma.usuarios.deleteMany({});

    // Crear usuario de prueba
    testUser = await prisma.usuarios.create({
      data: {
        email: 'test@example.com',
        nombre: 'Test User',
        hash_contrasena: 'hashed_password',
        rol: 'cliente',
        esta_verificado: true
      }
    });

    // Crear servicio de prueba
    testService = await prisma.servicios.create({
      data: {
        cliente_id: testUser.id,
        profesional_id: testUser.id, // Para simplificar
        descripcion: 'Servicio de prueba',
        estado: 'COMPLETADO'
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('getClientStats', () => {
    it('should return client statistics', async () => {
      const mockReq = {
        user: { id: testUser.id }
      };
      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await getClientStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalServices: expect.any(Number),
            pendingQuotes: expect.any(Number),
            completedServices: expect.any(Number),
            totalSpent: expect.any(Number)
          })
        })
      );
    });
  });

  describe('getProfessionalStats', () => {
    it('should return professional statistics', async () => {
      const mockReq = {
        user: { id: testUser.id }
      };
      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await getProfessionalStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalServices: expect.any(Number),
            pendingQuotes: expect.any(Number),
            completedServices: expect.any(Number),
            totalEarnings: expect.any(Number),
            averageRating: expect.any(Number)
          })
        })
      );
    });
  });

  describe('getClientActivity', () => {
    it('should return client activity', async () => {
      const mockReq = {
        user: { id: testUser.id }
      };
      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await getClientActivity(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.any(Array)
        })
      );
    });
  });

  describe('getProfessionalActivity', () => {
    it('should return professional activity', async () => {
      const mockReq = {
        user: { id: testUser.id }
      };
      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await getProfessionalActivity(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.any(Array)
        })
      );
    });
  });
});
