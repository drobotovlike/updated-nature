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

  // Wait for Clerk to be loaded if it has a loaded property
  if (clerkInstance.loaded === false) {
    console.warn('Clerk is not loaded yet, waiting...')
    // Wait up to 5 seconds for Clerk to load
    let attempts = 0
    while (clerkInstance.loaded === false && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    if (clerkInstance.loaded === false) {
      console.error('Clerk failed to load after waiting')
      return null
    }
  }

  // Check if getToken method exists
  if (typeof clerkInstance.getToken !== 'function') {
    // Try alternative methods for getting token
    if (clerkInstance.session && typeof clerkInstance.session.getToken === 'function') {
      try {
        const token = await clerkInstance.session.getToken()
        return token
      } catch (error) {
        console.error('Error getting token from session:', error)
        return null
      }
    }
    
    console.error('Clerk instance does not have getToken method. Clerk may not be fully initialized.')
    console.error('Clerk instance type:', typeof clerkInstance, 'Keys:', Object.keys(clerkInstance || {}))
    console.error('Clerk loaded:', clerkInstance.loaded, 'Has session:', !!clerkInstance.session)
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

