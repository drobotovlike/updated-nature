/**
 * Logging Utility
 * 
 * Provides structured logging with proper log levels.
 * In production, sensitive data is redacted and logs can be sent to monitoring services.
 */

import { isProduction, isDevelopment } from './env.js'

/**
 * Redact sensitive data from objects
 */
function redactSensitive(data) {
  if (!data || typeof data !== 'object') {
    return data
  }
  
  const redacted = { ...data }
  const sensitiveKeys = [
    'password', 'token', 'apiKey', 'secret', 'authorization',
    'clerk', 'session', 'cookie', 'credential'
  ]
  
  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase()
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      redacted[key] = '[REDACTED]'
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitive(redacted[key])
    }
  }
  
  return redacted
}

/**
 * Format log message with timestamp and context
 */
function formatMessage(level, message, data) {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`
  
  if (data) {
    const safeData = isProduction() ? redactSensitive(data) : data
    return `${prefix} ${message} ${JSON.stringify(safeData, null, 2)}`
  }
  
  return `${prefix} ${message}`
}

/**
 * Logger instance
 */
export const logger = {
  /**
   * Debug logs - only in development
   */
  debug(message, data) {
    if (isDevelopment()) {
      console.log(formatMessage('debug', message, data))
    }
  },
  
  /**
   * Info logs - important events
   */
  info(message, data) {
    console.log(formatMessage('info', message, data))
  },
  
  /**
   * Warning logs - potential issues
   */
  warn(message, data) {
    console.warn(formatMessage('warn', message, data))
  },
  
  /**
   * Error logs - always logged
   */
  error(message, data) {
    const formatted = formatMessage('error', message, data)
    console.error(formatted)
    
    // In production, send to error tracking service
    if (isProduction()) {
      // TODO: Send to Sentry or similar service
      // Sentry.captureException(new Error(message), { extra: data })
    }
  },
  
  /**
   * API request logging
   */
  request(req, extra = {}) {
    const data = {
      method: req.method,
      url: req.url,
      query: req.query,
      userAgent: req.headers['user-agent'],
      ...extra
    }
    
    this.info('API Request', data)
  },
  
  /**
   * API response logging
   */
  response(req, res, duration, extra = {}) {
    const data = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ...extra
    }
    
    if (res.statusCode >= 500) {
      this.error('API Response Error', data)
    } else if (res.statusCode >= 400) {
      this.warn('API Response Warning', data)
    } else {
      this.debug('API Response', data)
    }
  }
}

/**
 * Express middleware for automatic request/response logging
 */
export function loggerMiddleware(req, res, next) {
  const startTime = Date.now()
  
  // Log request
  logger.request(req)
  
  // Intercept response
  const originalSend = res.send
  res.send = function(data) {
    const duration = Date.now() - startTime
    logger.response(req, res, duration)
    return originalSend.call(this, data)
  }
  
  next()
}

