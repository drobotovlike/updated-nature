/**
 * Rate Limiting Middleware
 * 
 * Protects API endpoints from abuse and DDoS attacks.
 * Uses in-memory store for Vercel serverless functions.
 */

import rateLimit from 'express-rate-limit'
import { logger } from './logger.js'

/**
 * Standard rate limit for most endpoints
 * 100 requests per 15 minutes per IP
 */
export const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    })
    
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: '15 minutes'
    })
  }
})

/**
 * Strict rate limit for expensive operations
 * 10 requests per 15 minutes per IP
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  message: {
    error: 'Too many expensive requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Strict rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    })
    
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit for this expensive operation. Please try again later.',
      retryAfter: '15 minutes'
    })
  }
})

/**
 * Generous rate limit for read-only operations
 * 200 requests per 15 minutes per IP
 */
export const generousLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * Helper to wrap a handler with rate limiting
 */
export function withRateLimit(limiter, handler) {
  return async (req, res) => {
    // Apply rate limiting
    limiter(req, res, async () => {
      // If rate limit not exceeded, call handler
      await handler(req, res)
    })
  }
}

