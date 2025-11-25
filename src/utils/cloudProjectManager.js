// Cloud-based Project Management Utility
// Syncs projects across devices using Supabase

const API_BASE = '/api/projects'
const SPACES_API = '/api/spaces'
const FILES_API = '/api/files/upload'

async function apiRequest(endpoint, options = {}, userId) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userId}`, // Using Clerk user ID as token
    ...options.headers,
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    // Check if response is JSON before trying to parse
    const contentType = response.headers.get('content-type')
    let errorMessage = `API error: ${response.status} ${response.statusText}`
    
    if (contentType && contentType.includes('application/json')) {
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || errorMessage
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError)
      }
    } else {
      // If it's HTML or other content type, try to get text
      try {
        const text = await response.text()
        console.error('Non-JSON error response:', text.substring(0, 200))
      } catch (textError) {
        console.error('Failed to read error response:', textError)
      }
    }
    
    throw new Error(errorMessage)
  }

  // Check content type before parsing JSON
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return response.json()
  } else {
    // If response is not JSON, return text or throw error
    const text = await response.text()
    throw new Error(`Expected JSON but got ${contentType || 'unknown content type'}. Response: ${text.substring(0, 100)}`)
  }
}

async function spacesApiRequest(endpoint, options = {}, userId) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userId}`,
    ...options.headers,
  }

  const response = await fetch(`${SPACES_API}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    // Check if response is JSON before trying to parse
    const contentType = response.headers.get('content-type')
    let errorMessage = `API error: ${response.status} ${response.statusText}`
    
    if (contentType && contentType.includes('application/json')) {
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || errorMessage
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError)
      }
    } else {
      // If it's HTML or other content type, try to get text
      try {
        const text = await response.text()
        console.error('Non-JSON error response:', text.substring(0, 200))
      } catch (textError) {
        console.error('Failed to read error response:', textError)
      }
    }
    
    throw new Error(errorMessage)
  }

  // Check content type before parsing JSON
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return response.json()
  } else {
    // If response is not JSON, return text or throw error
    const text = await response.text()
    throw new Error(`Expected JSON but got ${contentType || 'unknown content type'}. Response: ${text.substring(0, 100)}`)
  }
}

// Upload file to cloud storage
export async function uploadFileToCloud(file, userId) {
  try {
    // Convert file to base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        // Remove data URL prefix if present
        const base64Data = result.includes(',') ? result.split(',')[1] : result
        resolve(base64Data)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    const response = await fetch(FILES_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userId}`,
      },
      body: JSON.stringify({
        fileBase64: base64,
        fileName: file.name,
        fileType: file.type || 'image/jpeg',
      }),
    })

    if (!response.ok) {
      let errorMessage = 'Failed to upload file'
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
        if (errorData.details) {
          errorMessage += `: ${errorData.details}`
        }
      } catch (parseError) {
        // If response is not JSON, use status text
        errorMessage = `Upload failed with status ${response.status}: ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    
    if (!result.url) {
      throw new Error('Upload succeeded but no URL was returned from server')
    }
    
    return result
  } catch (error) {
    console.error('Error uploading file:', error)
    // Re-throw with more context if it's a network error
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to reach server. Please check your connection.')
    }
    throw error
  }
}

// Save project to cloud
export async function saveProjectToCloud(userId, projectName, workflowData, spaceId = null) {
  if (!userId) {
    throw new Error('User must be authenticated to save projects')
  }

  try {
    const uploadedWorkflow = { ...workflowData }

    // Upload room file if it's a File object
    if (workflowData.roomFile && workflowData.roomFile instanceof File) {
      const uploadResult = await uploadFileToCloud(workflowData.roomFile, userId)
      uploadedWorkflow.roomFile = {
        name: workflowData.roomFile.name,
        url: uploadResult.url,
      }
    }

    // Upload furniture file if it's a File object
    if (workflowData.furnitureFile && workflowData.furnitureFile instanceof File) {
      const uploadResult = await uploadFileToCloud(workflowData.furnitureFile, userId)
      uploadedWorkflow.furnitureFile = {
        name: workflowData.furnitureFile.name,
        url: uploadResult.url,
      }
    }

    // Upload result image if it's a base64 string
    if (workflowData.resultUrl && workflowData.resultUrl.startsWith('data:')) {
      // Convert base64 data URL to blob and upload
      const response = await fetch(workflowData.resultUrl)
      const blob = await response.blob()
      const file = new File([blob], `result-${Date.now()}.png`, { type: 'image/png' })
      const uploadResult = await uploadFileToCloud(file, userId)
      uploadedWorkflow.resultUrl = uploadResult.url
    }

    const project = await apiRequest(
      '',
      {
        method: 'POST',
        body: JSON.stringify({
          name: projectName,
          workflow: uploadedWorkflow,
          spaceId,
        }),
      },
      userId
    )

    return project
  } catch (error) {
    console.error('Error saving project to cloud:', error)
    throw error
  }
}

// Get projects from cloud
export async function getProjectsFromCloud(userId, spaceId = null) {
  if (!userId) {
    return []
  }

  try {
    const endpoint = spaceId ? `?spaceId=${spaceId}` : ''
    const data = await apiRequest(endpoint, { method: 'GET' }, userId)
    // Handle both { projects: [...] } and direct array responses
    if (Array.isArray(data)) {
      return data
    }
    return data.projects || []
  } catch (error) {
    console.error('Error fetching projects from cloud:', error)
    // If it's a 404 or empty response, return empty array instead of throwing
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      return []
    }
    throw error
  }
}

// Get single project from cloud
export async function getProjectFromCloud(userId, projectId) {
  if (!userId) {
    throw new Error('User must be authenticated')
  }

  try {
    const project = await apiRequest(`?projectId=${projectId}`, { method: 'GET' }, userId)
    return project
  } catch (error) {
    console.error('Error fetching project from cloud:', error)
    throw error
  }
}

// Update project in cloud
export async function updateProjectInCloud(userId, projectId, updates) {
  if (!userId) {
    throw new Error('User must be authenticated')
  }

  try {
    const project = await apiRequest(
      `?projectId=${projectId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      },
      userId
    )
    return project
  } catch (error) {
    console.error('Error updating project in cloud:', error)
    throw error
  }
}

// Delete project from cloud
export async function deleteProjectFromCloud(userId, projectId) {
  if (!userId) {
    throw new Error('User must be authenticated')
  }

  try {
    await apiRequest(`?projectId=${projectId}`, { method: 'DELETE' }, userId)
    return true
  } catch (error) {
    console.error('Error deleting project from cloud:', error)
    throw error
  }
}

// Spaces management
export async function getSpacesFromCloud(userId) {
  if (!userId) {
    return []
  }

  try {
    const data = await spacesApiRequest('', { method: 'GET' }, userId)
    return data.spaces || []
  } catch (error) {
    console.error('Error fetching spaces from cloud:', error)
    throw error
  }
}

export async function createSpaceInCloud(userId, spaceName) {
  if (!userId) {
    throw new Error('User must be authenticated')
  }

  try {
    const space = await spacesApiRequest(
      '',
      {
        method: 'POST',
        body: JSON.stringify({ name: spaceName }),
      },
      userId
    )
    return space
  } catch (error) {
    console.error('Error creating space in cloud:', error)
    throw error
  }
}

export async function deleteSpaceFromCloud(userId, spaceId) {
  if (!userId) {
    throw new Error('User must be authenticated')
  }

  try {
    await spacesApiRequest(`?spaceId=${spaceId}`, { method: 'DELETE' }, userId)
    return true
  } catch (error) {
    console.error('Error deleting space from cloud:', error)
    throw error
  }
}
