import { requireEnv, getEnv, getSupabaseConfig } from '../../api/utils/env'

describe('Environment Utilities', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('requireEnv', () => {
    test('returns value if environment variable is set', () => {
      process.env.TEST_VAR = 'test_value'
      expect(requireEnv('TEST_VAR')).toBe('test_value')
    })

    test('throws error if environment variable is not set', () => {
      delete process.env.TEST_VAR
      expect(() => requireEnv('TEST_VAR')).toThrow('Missing required environment variable: TEST_VAR')
    })

    test('includes description in error message', () => {
      delete process.env.TEST_VAR
      expect(() => requireEnv('TEST_VAR', 'This is a test variable'))
        .toThrow('This is a test variable')
    })
  })

  describe('getEnv', () => {
    test('returns value if set', () => {
      process.env.TEST_VAR = 'test_value'
      expect(getEnv('TEST_VAR')).toBe('test_value')
    })

    test('returns default if not set', () => {
      delete process.env.TEST_VAR
      expect(getEnv('TEST_VAR', 'default')).toBe('default')
    })

    test('returns empty string if no default provided', () => {
      delete process.env.TEST_VAR
      expect(getEnv('TEST_VAR')).toBe('')
    })
  })

  describe('getSupabaseConfig', () => {
    test('returns config when variables are set', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_key'

      const config = getSupabaseConfig()
      expect(config).toEqual({
        url: 'https://test.supabase.co',
        serviceKey: 'test_key',
      })
    })

    test('throws error when SUPABASE_URL is not set', () => {
      delete process.env.SUPABASE_URL
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_key'

      expect(() => getSupabaseConfig()).toThrow('SUPABASE_URL')
    })

    test('throws error when SUPABASE_SERVICE_ROLE_KEY is not set', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      expect(() => getSupabaseConfig()).toThrow('SUPABASE_SERVICE_ROLE_KEY')
    })
  })
})

