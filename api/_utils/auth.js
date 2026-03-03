/**
 * Clerk Authentication Middleware
 *
 * Verifies Clerk session tokens using @clerk/backend with
 * signature verification against Clerk's public keys.
 */

import { verifyToken } from '@clerk/backend'
import { isDevelopment } from './env.js'

/**
 * Verifies Clerk session token with proper signature verification
 * 
 * @param {string} authHeader - Authorization header value
 * @returns {Promise<{userId: string} | null>}
 */
async function verifyClerkToken(authHeader) {
  if (!process.env.CLERK_SECRET_KEY) {
    console.error('❌ CLERK_SECRET_KEY is missing in environment variables!')
  } else if (isDevelopment()) {
    // Only log the presence of the key in development, never any part of its value
    console.log('✅ CLERK_SECRET_KEY is present in environment')
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (isDevelopment()) {
      console.log('❌ No valid Authorization header found')
    }
    return null
  }

  const token = authHeader.replace('Bearer ', '').trim()
  
  if (!token) {
    if (isDevelopment()) {
      console.log('❌ Token is empty')
    }
    return null
  }

  try {
    if (isDevelopment()) {
      console.log('🔍 Verifying token...')
    }
    // Verify the token signature using Clerk's public keys
    const verified = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      jwtKey: process.env.CLERK_JWT_KEY, // Optional performance optimization
    })
    
    // Extract user ID from verified token
    const userId = verified.sub
    
    if (!userId) {
      console.error('❌ Token verified but no user ID found')
      return null
    }

    if (isDevelopment()) {
      console.log('✅ Token verified for user')
    }
    return { userId }
  } catch (error) {
    console.error('❌ JWT verification failed:', error.message)
    if (error.reason) console.error('Reason:', error.reason)
    return null
  }
}

/**
 * Middleware wrapper that requires authentication
 * @param {Function} handler - Your API handler function
 * @param {Object} options - Options for rate limiting
 * @returns {Function} Wrapped handler with authentication
 */
export function requireAuth(handler, options = {}) {
  return async (req, res) => {
    // Set CORS headers (configured for specific origins in production)
    const allowedOrigins = [
      'https://ature.studio',
      'https://www.ature.studio',
      'https://ature.ru',
      'https://www.ature.ru',
      'http://localhost:5173',  // Development
      'http://localhost:3000'   // Development
    ]
    
    const origin = req.headers.origin
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Credentials', 'true')

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end()
    }

    // Verify authentication
    const authHeader = req.headers.authorization
    const authResult = await verifyClerkToken(authHeader)

    if (!authResult) {
      return res.status(401).json({ 
        error: 'Unauthorized - Invalid or missing authentication token',
        code: 'AUTH_REQUIRED'
      })
    }

    // Call the handler with verified userId
    return handler(req, res, authResult.userId)
  }
}

/**
 * Optional authentication - doesn't fail if no token, but verifies if provided
 * @param {Function} handler - Your API handler function
 * @returns {Function} Wrapped handler with optional authentication
 */
export function optionalAuth(handler) {
  return async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end()
    }

    // Try to verify authentication, but don't fail if missing
    const authHeader = req.headers.authorization
    const authResult = await verifyClerkToken(authHeader)

    // Call handler with userId (may be null)
    return handler(req, res, authResult?.userId || null)
  }
}

/**
 * Export verify function for direct use if needed
 */
export { verifyClerkToken }

