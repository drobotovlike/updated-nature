import { logger } from '../../api/utils/logger'

describe('Logger', () => {
  let consoleSpy

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    }
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('redaction', () => {
    test('redacts sensitive data in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const sensitiveData = {
        username: 'testuser',
        password: 'secret123',
        token: 'abc123',
        apiKey: 'key123',
      }

      logger.info('Test message', sensitiveData)

      const loggedMessage = consoleSpy.log.mock.calls[0][0]
      expect(loggedMessage).toContain('[REDACTED]')
      expect(loggedMessage).not.toContain('secret123')
      expect(loggedMessage).not.toContain('abc123')
      expect(loggedMessage).not.toContain('key123')

      process.env.NODE_ENV = originalEnv
    })

    test('does not redact in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const data = {
        username: 'testuser',
        value: 'visible',
      }

      logger.info('Test message', data)

      const loggedMessage = consoleSpy.log.mock.calls[0][0]
      expect(loggedMessage).toContain('visible')

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('log levels', () => {
    test('debug logs only in development', () => {
      const originalEnv = process.env.NODE_ENV
      
      process.env.NODE_ENV = 'development'
      logger.debug('Debug message')
      expect(consoleSpy.log).toHaveBeenCalledTimes(1)

      jest.clearAllMocks()
      
      process.env.NODE_ENV = 'production'
      logger.debug('Debug message')
      expect(consoleSpy.log).not.toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })

    test('error logs always', () => {
      logger.error('Error message')
      expect(consoleSpy.error).toHaveBeenCalledTimes(1)
    })

    test('includes timestamp', () => {
      logger.info('Test message')
      const loggedMessage = consoleSpy.log.mock.calls[0][0]
      expect(loggedMessage).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })
})

