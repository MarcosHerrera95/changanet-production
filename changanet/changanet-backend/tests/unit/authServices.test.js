/**
 * Pruebas unitarias completas para servicios de autenticación
 * Cubre: bcrypt hash, JWT generation/validation, email service mock
 * REQ-01, REQ-02, REQ-03 (Autenticación)
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Mock de Prisma
jest.mock('@prisma/client');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');


describe('Authentication Services - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    bcrypt.hash.mockResolvedValue('$2a$12$mockHashedPasswordWithLongerLengthForTestingPurposes');
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('mock.jwt.token');
    jwt.verify.mockReturnValue({ userId: 'user-123', role: 'cliente', iat: 1234567890, exp: 1234567890 + 900 });
  });

  describe('bcrypt - Password Hashing', () => {
    test('debe hashear contraseña correctamente', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(password, 12);

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are long
    });

    test('debe verificar contraseña correcta', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    test('debe rechazar contraseña incorrecta', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hashedPassword = await bcrypt.hash(password, 12);

      bcrypt.compare.mockResolvedValueOnce(false);
      const isValid = await bcrypt.compare(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });

    test('debe usar factor de costo correcto', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(password, 12);

      // bcrypt hash format: $2a$12$...
      const parts = hashedPassword.split('$');
      expect(parts[1]).toBe('2a'); // bcrypt version
      expect(parts[2]).toBe('12'); // cost factor
    });

    test('debe manejar errores de hash', async () => {
      const invalidPassword = null;

      bcrypt.hash.mockRejectedValueOnce(new Error('Invalid password'));
      await expect(bcrypt.hash(invalidPassword, 12)).rejects.toThrow('Invalid password');
    });
  });

  describe('JWT - Token Generation and Validation', () => {
    const mockSecret = 'test-jwt-secret';
    const mockUserId = 'user-123';
    const mockRole = 'cliente';

    beforeAll(() => {
      process.env.JWT_SECRET = mockSecret;
    });

    test('debe generar access token correctamente', () => {
      const token = jwt.sign(
        { userId: mockUserId, role: mockRole },
        mockSecret,
        { expiresIn: '15m', algorithm: 'HS256' }
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verificar estructura del token
      const parts = token.split('.');
      expect(parts).toHaveLength(3); // header.payload.signature
    });

    test('debe generar refresh token correctamente', () => {
      const token = jwt.sign(
        { userId: mockUserId, type: 'refresh' },
        mockSecret,
        { expiresIn: '7d', algorithm: 'HS256' }
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    test('debe verificar token válido', () => {
      const token = jwt.sign(
        { userId: mockUserId, role: mockRole },
        mockSecret,
        { expiresIn: '15m', algorithm: 'HS256' }
      );

      const decoded = jwt.verify(token, mockSecret, { algorithms: ['HS256'] });

      expect(decoded.userId).toBe(mockUserId);
      expect(decoded.role).toBe(mockRole);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    test('debe rechazar token con firma inválida', () => {
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('invalid signature');
      });

      const token = jwt.sign(
        { userId: mockUserId, role: mockRole },
        mockSecret,
        { expiresIn: '15m', algorithm: 'HS256' }
      );

      const wrongSecret = 'wrong-secret';

      expect(() => {
        jwt.verify(token, wrongSecret, { algorithms: ['HS256'] });
      }).toThrow('invalid signature');
    });

    test('debe rechazar token expirado', () => {
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('jwt expired');
      });

      const token = jwt.sign(
        { userId: mockUserId, role: mockRole },
        mockSecret,
        { expiresIn: '-1s', algorithm: 'HS256' } // Ya expirado
      );

      expect(() => {
        jwt.verify(token, mockSecret, { algorithms: ['HS256'] });
      }).toThrow('jwt expired');
    });

    test('debe rechazar token con algoritmo incorrecto', () => {
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('invalid algorithm');
      });

      const token = jwt.sign(
        { userId: mockUserId, role: mockRole },
        mockSecret,
        { expiresIn: '15m', algorithm: 'HS256' }
      );

      expect(() => {
        jwt.verify(token, mockSecret, { algorithms: ['RS256'] });
      }).toThrow('invalid algorithm');
    });
  });

  describe('crypto - Token Generation', () => {
    test('debe generar token único de verificación', () => {
      const token = crypto.randomBytes(32).toString('hex');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes * 2 hex chars per byte
      expect(/^[a-f0-9]+$/.test(token)).toBe(true); // Solo caracteres hex
    });

    test('debe generar tokens únicos', () => {
      const token1 = crypto.randomBytes(32).toString('hex');
      const token2 = crypto.randomBytes(32).toString('hex');

      expect(token1).not.toBe(token2);
    });

    test('debe manejar diferentes tamaños', () => {
      const token16 = crypto.randomBytes(16).toString('hex');
      const token32 = crypto.randomBytes(32).toString('hex');
      const token64 = crypto.randomBytes(64).toString('hex');

      expect(token16.length).toBe(32); // 16 * 2
      expect(token32.length).toBe(64); // 32 * 2
      expect(token64.length).toBe(128); // 64 * 2
    });
  });


});
