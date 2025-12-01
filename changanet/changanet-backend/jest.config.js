// jest.config.js - Configuración de Jest para Changánet
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(jsdom|parse5|entities|whatwg-encoding|whatwg-mimetype|whatwg-url|@babel|@jest)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/docs/**',
    '!src/config/serviceAccountKey.json',
    '!src/tests/setupTestDB.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setupTestDB.js'],
  testTimeout: 30000, // Aumentado para tests de seguridad
  verbose: true
};
