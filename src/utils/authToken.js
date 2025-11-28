/**
 * Authentication Token Utility
 * 
 * Gets the Clerk session token for API authentication.
 * This replaces the old pattern of using userId directly.
 */

/**
 * Get Clerk session token for API authentication
 * @param {Object} clerkInstance - Clerk instance from useClerk() hook
 * @returns {Promise<string|null>} Session token or null if not authenticated
 */
export async function getAuthToken(clerkInstance) {
  if (!clerkInstance) {
    console.warn('Clerk instance not provided')
    return null
  }

  // Check if getToken method exists
  if (typeof clerkInstance.getToken !== 'function') {
    console.error('Clerk instance does not have getToken method. Clerk may not be fully initialized.')
    console.error('Clerk instance type:', typeof clerkInstance, 'Keys:', Object.keys(clerkInstance || {}))
    return null
  }

  try {
    const token = await clerkInstance.getToken()
    return token
  } catch (error) {
    console.error('Error getting auth token:', error)
    return null
  }
}

/**
 * Get auth headers for API requests
 * @param {Object} clerkInstance - Clerk instance from useClerk() hook
 * @returns {Promise<Object>} Headers object with Authorization header
 */
export async function getAuthHeaders(clerkInstance) {
  const token = await getAuthToken(clerkInstance)
  
  if (!token) {
    throw new Error('Not authenticated. Please sign in again.')
  }

  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

