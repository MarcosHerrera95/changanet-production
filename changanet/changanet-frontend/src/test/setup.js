import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'

// Limpiar después de cada test
afterEach(() => {
  cleanup()
})

// Mock para fetch global
global.fetch = jest.fn()

// Mock para alert global
global.alert = jest.fn()

// Mock para console.warn y console.error en tests
const originalWarn = console.warn
const originalError = console.error

beforeAll(() => {
  console.warn = jest.fn()
  console.error = jest.fn()
})

afterAll(() => {
  console.warn = originalWarn
  console.error = originalError
})

// Mock para Sentry
jest.mock('../config/sentryConfig.js', () => ({
  setUserContext: jest.fn(),
  captureMessage: jest.fn()
}))
