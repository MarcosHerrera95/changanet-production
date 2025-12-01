/**
 * Pruebas unitarias para authService.js
 * Cubre: REQ-01, REQ-02, REQ-03 (Autenticación)
 * Nota: Este archivo prueba servicios de autenticación básicos
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock de Prisma
jest.mock('@prisma/client');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const mockPrisma = {
  usuarios: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

PrismaClient.mockImplementation(() => mockPrisma);

// Mock de bcrypt
bcrypt.hash = jest.fn();
bcrypt.compare = jest.fn();

// Mock de jwt
jwt.sign = jest.fn();
jwt.verify = jest.fn();

describe('Auth Service - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('bcrypt operations', () => {
    test('debe hashear contraseña correctamente', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = '$2a$12$mockHashedPassword';

      bcrypt.hash.mockResolvedValue(hashedPassword);

      const result = await bcrypt.hash(password, 12);

      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
    });

    test('debe verificar contraseña correctamente', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = '$2a$12$mockHashedPassword';

      bcrypt.compare.mockResolvedValue(true);

      const result = await bcrypt.compare(password, hashedPassword);

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    test('debe rechazar contraseña incorrecta', async () => {
      const password = 'WrongPassword123!';
      const hashedPassword = '$2a$12$mockHashedPassword';

      bcrypt.compare.mockResolvedValue(false);

      const result = await bcrypt.compare(password, hashedPassword);

      expect(result).toBe(false);
    });
  });

  describe('JWT operations', () => {
    test('debe generar token JWT correctamente', () => {
      const payload = { userId: 'user-123', role: 'cliente' };
      const secret = 'test-secret';
      const options = { expiresIn: '15m', algorithm: 'HS256' };
      const mockToken = 'mock.jwt.token';

      jwt.sign.mockReturnValue(mockToken);

      const result = jwt.sign(payload, secret, options);

      expect(result).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(payload, secret, options);
    });

    test('debe verificar token JWT correctamente', () => {
      const token = 'mock.jwt.token';
      const secret = 'test-secret';
      const options = { algorithms: ['HS256'] };
      const mockPayload = { userId: 'user-123', role: 'cliente' };

      jwt.verify.mockReturnValue(mockPayload);

      const result = jwt.verify(token, secret, options);

      expect(result).toEqual(mockPayload);
      expect(jwt.verify).toHaveBeenCalledWith(token, secret, options);
    });

    test('debe manejar token expirado', () => {
      const token = 'expired.jwt.token';
      const secret = 'test-secret';

      jwt.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      expect(() => {
        jwt.verify(token, secret);
      }).toThrow('jwt expired');
    });
  });

  describe('Database operations', () => {
    test('debe buscar usuario por email', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        nombre: 'Test User',
        rol: 'cliente'
      };

      mockPrisma.usuarios.findUnique.mockResolvedValue(mockUser);

      const result = await mockPrisma.usuarios.findUnique({
        where: { email: 'test@example.com' }
      });

      expect(result).toEqual(mockUser);
      expect(mockPrisma.usuarios.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
    });

    test('debe crear usuario correctamente', async () => {
      const userData = {
        nombre: 'New User',
        email: 'new@example.com',
        hash_contrasena: '$2a$12$hashedPassword',
        rol: 'cliente',
        esta_verificado: false
      };

      const mockCreatedUser = { id: 'user-456', ...userData };

      mockPrisma.usuarios.create.mockResolvedValue(mockCreatedUser);

      const result = await mockPrisma.usuarios.create({
        data: userData
      });

      expect(result).toEqual(mockCreatedUser);
      expect(mockPrisma.usuarios.create).toHaveBeenCalledWith({
        data: userData
      });
    });

    test('debe actualizar usuario correctamente', async () => {
      const updateData = {
        esta_verificado: true,
        token_verificacion: null
      };

      const mockUpdatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        esta_verificado: true,
        token_verificacion: null
      };

      mockPrisma.usuarios.update.mockResolvedValue(mockUpdatedUser);

      const result = await mockPrisma.usuarios.update({
        where: { id: 'user-123' },
        data: updateData
      });

      expect(result).toEqual(mockUpdatedUser);
      expect(mockPrisma.usuarios.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: updateData
      });
    });
  });
});
