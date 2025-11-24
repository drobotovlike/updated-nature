// Project Management Utility
// Stores projects in localStorage with user-specific access

const STORAGE_KEY = 'ature_projects'
const SPACES_KEY = 'ature_spaces'
const TRASH_KEY = 'ature_trash'
export const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

export function saveProject(userId, projectName, workflowData, spaceId = null) {
  if (!userId) {
    throw new Error('User must be authenticated to save projects')
  }

  const projects = getProjects(userId)
  const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const project = {
    id: projectId,
    name: projectName,
    userId,
    spaceId, // Link project to a space/folder
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    workflow: {
      mode: workflowData.mode || '',
      furnitureFile: workflowData.furnitureFile ? {
        name: workflowData.furnitureFileName || '',
        url: workflowData.furniturePreviewUrl || '',
        base64: workflowData.furnitureBase64 || null,
      } : null,
      roomFile: workflowData.roomFile ? {
        name: workflowData.roomFileName || '',
        url: workflowData.roomPreviewUrl || '',
        base64: workflowData.roomBase64 || null,
      } : null,
      model3d: workflowData.model3dUrl ? {
        url: workflowData.model3dUrl,
      } : null,
      result: workflowData.resultUrl ? {
        url: workflowData.resultUrl,
        description: workflowData.description || '',
        useAIDesigner: workflowData.useAIDesigner || false,
      } : null,
    },
  }

  projects.push(project)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  
  return project
}

export function getProjects(userId, spaceId = null) {
  if (!userId) return []
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    
    const allProjects = JSON.parse(stored)
    // Filter projects by userId for security and exclude deleted projects
    let projects = allProjects.filter(p => p.userId === userId && !p.deleted)
    
    // Filter by spaceId if provided
    if (spaceId) {
      projects = projects.filter(p => p.spaceId === spaceId)
    }
    
    return projects
  } catch (error) {
    console.error('Error reading projects:', error)
    return []
  }
}

export function getProject(userId, projectId) {
  const projects = getProjects(userId)
  const project = projects.find(p => p.id === projectId)
  
  if (!project) {
    throw new Error('Project not found')
  }
  
  // Double-check user access
  if (project.userId !== userId) {
    throw new Error('Access denied: This project belongs to another user')
  }
  
  return project
}

export function updateProject(userId, projectId, updates) {
  const projects = getProjects(userId)
  const index = projects.findIndex(p => p.id === projectId)
  
  if (index === -1) {
    throw new Error('Project not found')
  }
  
  if (projects[index].userId !== userId) {
    throw new Error('Access denied: This project belongs to another user')
  }
  
  projects[index] = {
    ...projects[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  return projects[index]
}

export function deleteProject(userId, projectId) {
  if (!userId) {
    throw new Error('User must be authenticated to delete projects')
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      throw new Error('Project not found')
    }
    
    const allProjects = JSON.parse(stored)
    const index = allProjects.findIndex(p => p.id === projectId && p.userId === userId)
    
    if (index === -1) {
      throw new Error('Project not found')
    }
    
    // Soft delete: mark as deleted and add timestamp
    allProjects[index] = {
      ...allProjects[index],
      deleted: true,
      deletedAt: new Date().toISOString(),
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allProjects))
    
    // Clean up old trashed projects (auto-delete after 1 week)
    cleanupTrash(userId)
    
    return getProjects(userId)
  } catch (error) {
    console.error('Error deleting project:', error)
    throw error
  }
}

export function deleteAllProjects(userId) {
  if (!userId) {
    throw new Error('User must be authenticated to delete projects')
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const allProjects = JSON.parse(stored)
      // Keep only projects that don't belong to this user
      const updatedAll = allProjects.filter(p => p.userId !== userId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAll))
    }
    return []
  } catch (error) {
    console.error('Error deleting all projects:', error)
    throw error
  }
}

export function addFileToProject(userId, projectId, fileData) {
  const project = getProject(userId, projectId)
  
  if (!project.workflow.files) {
    project.workflow.files = []
  }
  
  project.workflow.files.push({
    id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: fileData.name || 'Generated File',
    url: fileData.url,
    type: fileData.type || 'image',
    createdAt: new Date().toISOString(),
  })
  
  return updateProject(userId, projectId, { workflow: project.workflow })
}

// Space/Folder Management Functions
export function createSpace(userId, spaceName) {
  if (!userId) {
    throw new Error('User must be authenticated to create spaces')
  }

  const spaces = getSpaces(userId)
  const spaceId = `space_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const space = {
    id: spaceId,
    name: spaceName,
    userId,
    createdAt: new Date().toISOString(),
  }

  spaces.push(space)
  localStorage.setItem(SPACES_KEY, JSON.stringify(spaces))
  
  return space
}

export function getSpaces(userId) {
  if (!userId) return []
  
  try {
    const stored = localStorage.getItem(SPACES_KEY)
    if (!stored) return []
    
    const allSpaces = JSON.parse(stored)
    // Filter spaces by userId and exclude deleted ones
    return allSpaces.filter(s => s.userId === userId && !s.deleted)
  } catch (error) {
    console.error('Error reading spaces:', error)
    return []
  }
}

export function deleteSpace(userId, spaceId) {
  if (!userId) {
    throw new Error('User must be authenticated to delete spaces')
  }

  // Move space to trash instead of permanently deleting
  const spaces = getSpaces(userId)
  const space = spaces.find(s => s.id === spaceId)
  
  if (!space) {
    throw new Error('Space not found')
  }
  
  if (space.userId !== userId) {
    throw new Error('Access denied: This space belongs to another user')
  }
  
  // Mark space as deleted with timestamp
  const updatedSpace = {
    ...space,
    deleted: true,
    deletedAt: new Date().toISOString(),
  }
  
  // Update storage - mark as deleted instead of removing
  try {
    const stored = localStorage.getItem(SPACES_KEY)
    if (stored) {
      const allSpaces = JSON.parse(stored)
      const index = allSpaces.findIndex(s => s.id === spaceId && s.userId === userId)
      if (index !== -1) {
        allSpaces[index] = updatedSpace
        localStorage.setItem(SPACES_KEY, JSON.stringify(allSpaces))
      }
    }
    
    // Also remove spaceId from all projects in this space
    const projects = getProjects(userId)
    projects.forEach(project => {
      if (project.spaceId === spaceId) {
        updateProject(userId, project.id, { spaceId: null })
      }
    })
  } catch (error) {
    console.error('Error moving space to trash:', error)
    throw error
  }
  
  // Clean up old trashed spaces (auto-delete after 1 week)
  cleanupTrash(userId)
  
  return spaces.filter(s => s.id !== spaceId)
}

// Get trashed spaces
export function getTrashedSpaces(userId) {
  if (!userId) return []
  
  try {
    const stored = localStorage.getItem(SPACES_KEY)
    if (!stored) return []
    
    const allSpaces = JSON.parse(stored)
    // Filter spaces by userId and only get deleted ones
    const trashed = allSpaces.filter(s => s.userId === userId && s.deleted)
    
    // Filter out spaces older than 1 week (they should be auto-deleted, but check anyway)
    const now = Date.now()
    return trashed.filter(space => {
      if (!space.deletedAt) return false
      const deletedAt = new Date(space.deletedAt).getTime()
      // Check if deletedAt is a valid date
      if (isNaN(deletedAt)) return false
      // Keep spaces that are less than or equal to 1 week old
      return (now - deletedAt) <= ONE_WEEK_MS
    })
  } catch (error) {
    console.error('Error reading trashed spaces:', error)
    return []
  }
}

// Restore space from trash
export function restoreSpace(userId, spaceId) {
  if (!userId) {
    throw new Error('User must be authenticated to restore spaces')
  }
  
  try {
    const stored = localStorage.getItem(SPACES_KEY)
    if (!stored) {
      throw new Error('Space not found')
    }
    
    const allSpaces = JSON.parse(stored)
    const index = allSpaces.findIndex(s => s.id === spaceId && s.userId === userId)
    
    if (index === -1) {
      throw new Error('Space not found')
    }
    
    // Remove deleted flag and timestamp
    const { deleted, deletedAt, ...restoredSpace } = allSpaces[index]
    allSpaces[index] = restoredSpace
    localStorage.setItem(SPACES_KEY, JSON.stringify(allSpaces))
    
    return restoredSpace
  } catch (error) {
    console.error('Error restoring space:', error)
    throw error
  }
}

// Permanently delete space from trash
export function permanentlyDeleteSpace(userId, spaceId) {
  if (!userId) {
    throw new Error('User must be authenticated to delete spaces')
  }
  
  try {
    const stored = localStorage.getItem(SPACES_KEY)
    if (!stored) {
      throw new Error('Space not found')
    }
    
    const allSpaces = JSON.parse(stored)
    const updatedAll = allSpaces.filter(s => !(s.id === spaceId && s.userId === userId))
    localStorage.setItem(SPACES_KEY, JSON.stringify(updatedAll))
    
    return updatedAll.filter(s => s.userId === userId && !s.deleted)
  } catch (error) {
    console.error('Error permanently deleting space:', error)
    throw error
  }
}

// Get trashed projects
export function getTrashedProjects(userId) {
  if (!userId) return []
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    
    const allProjects = JSON.parse(stored)
    // Filter projects by userId and only get deleted ones
    const trashed = allProjects.filter(p => p.userId === userId && p.deleted)
    
    // Filter out projects older than 1 week (they should be auto-deleted, but check anyway)
    const now = Date.now()
    return trashed.filter(project => {
      if (!project.deletedAt) return false
      const deletedAt = new Date(project.deletedAt).getTime()
      // Check if deletedAt is a valid date
      if (isNaN(deletedAt)) return false
      // Keep projects that are less than or equal to 1 week old
      return (now - deletedAt) <= ONE_WEEK_MS
    })
  } catch (error) {
    console.error('Error reading trashed projects:', error)
    return []
  }
}

// Restore project from trash
export function restoreProject(userId, projectId) {
  if (!userId) {
    throw new Error('User must be authenticated to restore projects')
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      throw new Error('Project not found')
    }
    
    const allProjects = JSON.parse(stored)
    const index = allProjects.findIndex(p => p.id === projectId && p.userId === userId)
    
    if (index === -1) {
      throw new Error('Project not found')
    }
    
    // Remove deleted flag and timestamp
    const { deleted, deletedAt, ...restoredProject } = allProjects[index]
    allProjects[index] = restoredProject
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allProjects))
    
    return restoredProject
  } catch (error) {
    console.error('Error restoring project:', error)
    throw error
  }
}

// Permanently delete project from trash
export function permanentlyDeleteProject(userId, projectId) {
  if (!userId) {
    throw new Error('User must be authenticated to delete projects')
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      throw new Error('Project not found')
    }
    
    const allProjects = JSON.parse(stored)
    const updatedAll = allProjects.filter(p => !(p.id === projectId && p.userId === userId))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAll))
    
    return getTrashedProjects(userId)
  } catch (error) {
    console.error('Error permanently deleting project:', error)
    throw error
  }
}

// Auto-cleanup: Delete spaces and projects that have been in trash for more than 1 week
// Each item is checked independently - deleted when its own 1-week period expires
export function cleanupTrash(userId) {
  if (!userId) return
  
  try {
    // Clean up spaces
    const spacesStored = localStorage.getItem(SPACES_KEY)
    if (spacesStored) {
      const allSpaces = JSON.parse(spacesStored)
      const now = Date.now()
      
      const cleanedSpaces = allSpaces.filter(space => {
        // Keep non-deleted spaces
        if (!space.deleted || !space.deletedAt) return true
        
        // Keep spaces that belong to other users
        if (space.userId !== userId) return true
        
        // Check each item independently - delete only if its own 1 week has passed
        const deletedAt = new Date(space.deletedAt).getTime()
        // Check if deletedAt is a valid date
        if (isNaN(deletedAt)) return true // Keep if invalid date
        
        const timeInTrash = now - deletedAt
        // Delete this specific item only if it's been MORE than 1 week since it was deleted
        // Each item is evaluated independently based on its own deletedAt timestamp
        return timeInTrash <= ONE_WEEK_MS
      })
      
      localStorage.setItem(SPACES_KEY, JSON.stringify(cleanedSpaces))
    }
    
    // Clean up projects
    const projectsStored = localStorage.getItem(STORAGE_KEY)
    if (projectsStored) {
      const allProjects = JSON.parse(projectsStored)
      const now = Date.now()
      
      const cleanedProjects = allProjects.filter(project => {
        // Keep non-deleted projects
        if (!project.deleted || !project.deletedAt) return true
        
        // Keep projects that belong to other users
        if (project.userId !== userId) return true
        
        // Check each item independently - delete only if its own 1 week has passed
        const deletedAt = new Date(project.deletedAt).getTime()
        // Check if deletedAt is a valid date
        if (isNaN(deletedAt)) return true // Keep if invalid date
        
        const timeInTrash = now - deletedAt
        // Delete this specific item only if it's been MORE than 1 week since it was deleted
        // Each item is evaluated independently based on its own deletedAt timestamp
        return timeInTrash <= ONE_WEEK_MS
      })
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedProjects))
    }
  } catch (error) {
    console.error('Error cleaning up trash:', error)
  }
}

export function updateSpace(userId, spaceId, updates) {
  const spaces = getSpaces(userId)
  const index = spaces.findIndex(s => s.id === spaceId)
  
  if (index === -1) {
    throw new Error('Space not found')
  }
  
  if (spaces[index].userId !== userId) {
    throw new Error('Access denied: This space belongs to another user')
  }
  
  spaces[index] = {
    ...spaces[index],
    ...updates,
  }
  
  localStorage.setItem(SPACES_KEY, JSON.stringify(spaces))
  return spaces[index]
}

