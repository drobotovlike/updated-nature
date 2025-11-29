// Canvas Management Utility
// Handles all canvas-related API calls

import { getAuthToken } from './authToken.js'

const CANVAS_API = '/api/canvas'

async function canvasApiRequest(endpoint, options = {}, clerkInstance) {
  const token = await getAuthToken(clerkInstance)
  
  if (!token) {
    throw new Error('Authentication failed. Please refresh the page and sign in again.')
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  }

  const response = await fetch(`${CANVAS_API}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const contentType = response.headers.get('content-type')
    let errorMessage = `Canvas API error: ${response.status} ${response.statusText}`
    let errorDetails = null
    
    if (contentType && contentType.includes('application/json')) {
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || errorMessage
        errorDetails = error.details || error.message
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError)
      }
    }
    
    const error = new Error(errorMessage)
    if (errorDetails) {
      error.details = errorDetails
    }
    throw error
  }

  return response.json()
}

// Get all canvas items and state for a project
export async function getCanvasData(userId, projectId, clerkInstance) {
  if (!userId || !projectId) {
    throw new Error('userId and projectId are required')
  }

  try {
    console.log('Loading canvas data for project:', projectId, 'user:', userId)
    const data = await canvasApiRequest(`?projectId=${projectId}`, { method: 'GET' }, clerkInstance)
    console.log('Canvas data loaded:', { itemsCount: data.items?.length || 0, hasState: !!data.state })
    return {
      items: data.items || [],
      state: data.state || null,
    }
  } catch (error) {
    console.error('Error loading canvas data:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId,
      projectId,
    })
    throw error
  }
}

// Get single canvas item
export async function getCanvasItem(userId, itemId, clerkInstance) {
  if (!userId || !itemId) {
    throw new Error('userId and itemId are required')
  }

  try {
    return await canvasApiRequest(`?itemId=${itemId}`, { method: 'GET' }, clerkInstance)
  } catch (error) {
    console.error('Error loading canvas item:', error)
    throw error
  }
}

// Create new canvas item
export async function createCanvasItem(userId, projectId, itemData, clerkInstance) {
  if (!userId || !projectId || !itemData.image_url) {
    throw new Error('userId, projectId, and image_url are required')
  }

  try {
    console.log('Creating canvas item:', { projectId, userId, imageUrl: itemData.image_url })
    const result = await canvasApiRequest(
      `?projectId=${projectId}`,
      {
        method: 'POST',
        body: JSON.stringify({
          // Don't send project_id in body - it comes from query param
          ...itemData,
        }),
      },
      clerkInstance
    )
    console.log('Canvas item created successfully:', result)
    return result
  } catch (error) {
    console.error('Error creating canvas item:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      projectId,
      userId,
      itemData,
    })
    throw error
  }
}

// Update canvas item
export async function updateCanvasItem(userId, itemId, updates, clerkInstance) {
  if (!userId || !itemId) {
    throw new Error('userId and itemId are required')
  }

  try {
    return await canvasApiRequest(
      `?itemId=${itemId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      },
      clerkInstance
    )
  } catch (error) {
    console.error('Error updating canvas item:', error)
    throw error
  }
}

// Delete canvas item
export async function deleteCanvasItem(userId, itemId, clerkInstance) {
  if (!userId || !itemId) {
    throw new Error('userId and itemId are required')
  }

  try {
    await canvasApiRequest(`?itemId=${itemId}`, { method: 'DELETE' }, clerkInstance)
    return true
  } catch (error) {
    console.error('Error deleting canvas item:', error)
    throw error
  }
}

// Get canvas state
export async function getCanvasState(userId, projectId, clerkInstance) {
  if (!userId || !projectId) {
    throw new Error('userId and projectId are required')
  }

  try {
    return await canvasApiRequest(`?projectId=${projectId}&type=state`, { method: 'GET' }, clerkInstance)
  } catch (error) {
    console.error('Error loading canvas state:', error)
    return null
  }
}

// Save canvas state
export async function saveCanvasState(userId, projectId, stateData, clerkInstance) {
  if (!userId || !projectId) {
    throw new Error('userId and projectId are required')
  }

  try {
    return await canvasApiRequest(
      `?projectId=${projectId}&type=state`,
      {
        method: 'POST',
        body: JSON.stringify(stateData),
      },
      clerkInstance
    )
  } catch (error) {
    console.error('Error saving canvas state:', error)
    throw error
  }
}
