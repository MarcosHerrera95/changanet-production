/**
 * Basic setup test to verify Jest and Testing Library configuration
 */

describe('Testing Setup', () => {
  test('Jest is configured correctly', () => {
    expect(true).toBe(true)
  })

  test('Testing Library is available', () => {
    expect(typeof describe).toBe('function')
    expect(typeof test).toBe('function')
    expect(typeof expect).toBe('function')
  })
})