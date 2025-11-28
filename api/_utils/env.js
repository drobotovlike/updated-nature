/**
 * Environment Variable Utility
 * 
 * Provides type-safe access to environment variables with validation.
 * Fails fast on startup if required variables are missing.
 */

/**
 * Get required environment variable
 * Throws error if not set
 */
export function requireEnv(key, description = '') {
  const value = process.env[key]
  
  if (!value) {
    const errorMsg = `Missing required environment variable: ${key}`
    const hint = description ? `\nHint: ${description}` : ''
    const docs = '\nSee README.md for setup instructions'
    
    throw new Error(errorMsg + hint + docs)
  }
  
  return value
}

/**
 * Get optional environment variable with default
 */
export function getEnv(key, defaultValue = '') {
  return process.env[key] || defaultValue
}

/**
 * Validate all required environment variables on startup
 * Call this once at the beginning of your API
 */
export function validateEnv() {
  const required = {
    SUPABASE_URL: 'Your Supabase project URL from https://app.supabase.com',
    SUPABASE_SERVICE_ROLE_KEY: 'Service role key from Supabase Settings > API',
    GEMINI_API_KEY: 'Google Gemini API key from https://aistudio.google.com/app/apikey',
  }
  
  const missing = []
  
  for (const [key, description] of Object.entries(required)) {
    if (!process.env[key]) {
      missing.push(`  ${key}: ${description}`)
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    console.error(missing.join('\n'))
    console.error('\nSet these in Vercel Dashboard > Settings > Environment Variables')
    console.error('Or in .env.local for local development')
    
    // In production, we want to fail fast
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing required environment variables')
    }
  }
  
  return missing.length === 0
}

/**
 * Get Supabase configuration
 * Returns null values if not set (allows functions to return proper error responses)
 */
export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  return {
    url: url || null,
    serviceKey: serviceKey || null,
    isConfigured: !!(url && serviceKey),
  }
}

/**
 * Check if we're in development mode
 */
export function isDevelopment() {
  return process.env.NODE_ENV !== 'production'
}

/**
 * Check if we're in production mode
 */
export function isProduction() {
  return process.env.NODE_ENV === 'production'
}

