// Project Management Utility
// Hybrid: Uses cloud storage (Supabase) with localStorage fallback

import * as cloudManager from './cloudProjectManager'

const STORAGE_KEY = 'ature_projects'
const SPACES_KEY = 'ature_spaces'
const TRASH_KEY = 'ature_trash'
const ASSETS_API = '/api/assets'
export const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

// Check if we should use cloud (online) or localStorage (offline)
async function useCloud() {
  try {
    // Simple online check
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return false
    }
    // Try a lightweight request to see if API is available
    return true // Assume online, will fallback on error
  } catch {
    return false
  }
}

export async function saveProject(userId, projectName, workflowData, spaceId = null) {
  if (!userId) {
    throw new Error('User must be authenticated to save projects')
  }

  try {
    // Try cloud first
    if (await useCloud()) {
      try {
        // Prepare workflow data for cloud upload
        const cloudWorkflow = {
          mode: workflowData.mode || '',
          furnitureFile: workflowData.furnitureFile instanceof File 
            ? workflowData.furnitureFile 
            : workflowData.furnitureFile 
              ? { name: workflowData.furnitureFileName || '', url: workflowData.furniturePreviewUrl || '' }
              : null,
          roomFile: workflowData.roomFile instanceof File
            ? workflowData.roomFile
            : workflowData.roomFile
              ? { name: workflowData.roomFileName || '', url: workflowData.roomPreviewUrl || '' }
              : null,
          model3d: workflowData.model3dUrl ? { url: workflowData.model3dUrl } : null,
          result: workflowData.resultUrl ? {
            url: workflowData.resultUrl,
            description: workflowData.description || '',
            useAIDesigner: workflowData.useAIDesigner || false,
          } : null,
          resultUrl: workflowData.resultUrl || null,
          description: workflowData.description || '',
          useAIDesigner: workflowData.useAIDesigner || false,
        }

        const project = await cloudManager.saveProjectToCloud(userId, projectName, cloudWorkflow, spaceId)
        
        // Also save to localStorage as backup
        saveProjectToLocalStorage(userId, project)
        
        return project
      } catch (cloudError) {
        console.warn('Cloud save failed, using localStorage:', cloudError)
        // Fall through to localStorage
      }
    }
  } catch (error) {
    console.warn('Cloud check failed, using localStorage:', error)
  }

  // Fallback to localStorage
  return saveProjectToLocalStorage(userId, projectName, workflowData, spaceId)
}

function saveProjectToLocalStorage(userId, projectNameOrProject, workflowData = null, spaceId = null) {
  const projects = getProjectsFromLocalStorage(userId)
  
  let project
  if (typeof projectNameOrProject === 'string') {
    // Creating new project
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    project = {
    id: projectId,
      name: projectNameOrProject,
    userId,
      spaceId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    workflow: {
        mode: workflowData?.mode || '',
        furnitureFile: workflowData?.furnitureFile ? {
        name: workflowData.furnitureFileName || '',
        url: workflowData.furniturePreviewUrl || '',
        base64: workflowData.furnitureBase64 || null,
      } : null,
        roomFile: workflowData?.roomFile ? {
        name: workflowData.roomFileName || '',
        url: workflowData.roomPreviewUrl || '',
        base64: workflowData.roomBase64 || null,
      } : null,
        model3d: workflowData?.model3dUrl ? { url: workflowData.model3dUrl } : null,
        result: workflowData?.resultUrl ? {
        url: workflowData.resultUrl,
        description: workflowData.description || '',
        useAIDesigner: workflowData.useAIDesigner || false,
      } : null,
    },
    }
  } else {
    // Project object passed (from cloud)
    project = projectNameOrProject
  }

  projects.push(project)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  
  return project
}

function getProjectsFromLocalStorage(userId, spaceId = null) {
  if (!userId) return []
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    
    const allProjects = JSON.parse(stored)
    let projects = allProjects.filter(p => p.userId === userId && !p.deleted)
    
    if (spaceId) {
      projects = projects.filter(p => p.spaceId === spaceId)
    }
    
    return projects
  } catch (error) {
    console.error('Error reading projects from localStorage:', error)
    return []
  }
}

export async function getProjects(userId, spaceId = null) {
  if (!userId) return []
  
  try {
    // Try cloud first
    if (await useCloud()) {
      try {
        const cloudProjects = await cloudManager.getProjectsFromCloud(userId, spaceId)
        
        // Sync cloud projects to localStorage
        if (cloudProjects.length > 0) {
          const existing = getProjectsFromLocalStorage(userId, spaceId)
          const cloudIds = new Set(cloudProjects.map(p => p.id))
          
          // Merge: keep cloud projects, add any local-only projects
          const localOnly = existing.filter(p => !cloudIds.has(p.id))
          const merged = [...cloudProjects, ...localOnly]
          
          // Update localStorage
          const allProjects = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
          const otherUsersProjects = allProjects.filter(p => p.userId !== userId)
          const updated = [...otherUsersProjects, ...merged]
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
          
          return merged
        }
        
        return cloudProjects
      } catch (cloudError) {
        console.warn('Cloud fetch failed, using localStorage:', cloudError)
        // Fall through to localStorage
      }
    }
  } catch (error) {
    console.warn('Cloud check failed, using localStorage:', error)
  }

  // Fallback to localStorage
  return getProjectsFromLocalStorage(userId, spaceId)
}

export async function getProject(userId, projectId) {
  try {
    // Try cloud first
    if (await useCloud()) {
      try {
        const project = await cloudManager.getProjectFromCloud(userId, projectId)
        // Also cache in localStorage
        const projects = getProjectsFromLocalStorage(userId)
        const index = projects.findIndex(p => p.id === projectId)
        if (index >= 0) {
          projects[index] = project
        } else {
          projects.push(project)
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
        return project
      } catch (cloudError) {
        console.warn('Cloud fetch failed, using localStorage:', cloudError)
        // Fall through to localStorage
      }
    }
  } catch (error) {
    console.warn('Cloud check failed, using localStorage:', error)
  }

  // Fallback to localStorage
  const projects = await getProjects(userId)
  const project = projects.find(p => p.id === projectId)
  
  if (!project) {
    throw new Error('Project not found')
  }
  
  if (project.userId !== userId) {
    throw new Error('Access denied: This project belongs to another user')
  }
  
  return project
}

export async function updateProject(userId, projectId, updates) {
  try {
    // Try cloud first
    if (await useCloud()) {
      try {
        const updated = await cloudManager.updateProjectInCloud(userId, projectId, updates)
        // Also update localStorage
        updateProjectInLocalStorage(userId, projectId, updates)
        return updated
      } catch (cloudError) {
        console.warn('Cloud update failed, using localStorage:', cloudError)
        // Fall through to localStorage
      }
    }
  } catch (error) {
    console.warn('Cloud check failed, using localStorage:', error)
  }

  // Fallback to localStorage
  return updateProjectInLocalStorage(userId, projectId, updates)
}

function updateProjectInLocalStorage(userId, projectId, updates) {
  const projects = getProjectsFromLocalStorage(userId)
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
  
  const allProjects = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  const otherUsersProjects = allProjects.filter(p => p.userId !== userId)
  const updated = [...otherUsersProjects, ...projects]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  
  return projects[index]
}

export async function deleteProject(userId, projectId) {
  if (!userId) {
    throw new Error('User must be authenticated to delete projects')
  }
  
  try {
    // Try cloud first
    if (await useCloud()) {
      try {
        await cloudManager.deleteProjectFromCloud(userId, projectId)
        // Also update localStorage
        deleteProjectInLocalStorage(userId, projectId)
        cleanupTrash(userId)
        return await getProjects(userId)
      } catch (cloudError) {
        console.warn('Cloud delete failed, using localStorage:', cloudError)
        // Fall through to localStorage
      }
    }
  } catch (error) {
    console.warn('Cloud check failed, using localStorage:', error)
  }

  // Fallback to localStorage
  return deleteProjectInLocalStorage(userId, projectId)
}

async function deleteProjectInLocalStorage(userId, projectId) {
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
    
    allProjects[index] = {
      ...allProjects[index],
      deleted: true,
      deletedAt: new Date().toISOString(),
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allProjects))
    cleanupTrash(userId)
    
    return await getProjects(userId)
  } catch (error) {
    console.error('Error deleting project:', error)
    throw error
  }
}

export async function deleteAllProjects(userId) {
  if (!userId) {
    throw new Error('User must be authenticated to delete projects')
  }
  
  try {
    // Get all projects for this user
    const allProjects = await getProjects(userId, null)
    
    // Delete each project (this handles both cloud and localStorage)
    for (const project of allProjects) {
      try {
        await deleteProject(userId, project.id)
      } catch (error) {
        console.warn(`Failed to delete project ${project.id}:`, error)
        // Continue deleting other projects even if one fails
      }
    }
    
    // Also clear localStorage as a backup
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const allProjectsLocal = JSON.parse(stored)
        // Keep only projects that don't belong to this user
        const updatedAll = allProjectsLocal.filter(p => p.userId !== userId)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAll))
      }
    } catch (localError) {
      console.warn('Error clearing localStorage:', localError)
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
export async function createSpace(userId, spaceName) {
  if (!userId) {
    throw new Error('User must be authenticated to create spaces')
  }

  try {
    // Try cloud first
    if (await useCloud()) {
      try {
        const space = await cloudManager.createSpaceInCloud(userId, spaceName)
        // Also save to localStorage
        createSpaceInLocalStorage(userId, space)
        return space
      } catch (cloudError) {
        console.warn('Cloud create failed, using localStorage:', cloudError)
        // Fall through to localStorage
      }
    }
  } catch (error) {
    console.warn('Cloud check failed, using localStorage:', error)
  }

  // Fallback to localStorage
  const spaceId = `space_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const space = {
    id: spaceId,
    name: spaceName,
    userId,
    createdAt: new Date().toISOString(),
  }
  createSpaceInLocalStorage(userId, space)
  return space
  }

function createSpaceInLocalStorage(userId, space) {
  const spaces = getSpacesFromLocalStorage(userId)
  spaces.push(space)
  const allSpaces = JSON.parse(localStorage.getItem(SPACES_KEY) || '[]')
  const otherUsersSpaces = allSpaces.filter(s => s.userId !== userId)
  const updated = [...otherUsersSpaces, ...spaces]
  localStorage.setItem(SPACES_KEY, JSON.stringify(updated))
  return space
}

export async function getSpaces(userId) {
  if (!userId) return []
  
  try {
    // Try cloud first
    if (await useCloud()) {
      try {
        const cloudSpaces = await cloudManager.getSpacesFromCloud(userId)
        
        // Sync to localStorage
        if (cloudSpaces.length > 0) {
          const existing = getSpacesFromLocalStorage(userId)
          const cloudIds = new Set(cloudSpaces.map(s => s.id))
          const localOnly = existing.filter(s => !cloudIds.has(s.id))
          const merged = [...cloudSpaces, ...localOnly]
          
          const allSpaces = JSON.parse(localStorage.getItem(SPACES_KEY) || '[]')
          const otherUsersSpaces = allSpaces.filter(s => s.userId !== userId)
          const updated = [...otherUsersSpaces, ...merged]
          localStorage.setItem(SPACES_KEY, JSON.stringify(updated))
          
          return merged
        }
        
        return cloudSpaces
      } catch (cloudError) {
        console.warn('Cloud fetch failed, using localStorage:', cloudError)
        // Fall through to localStorage
      }
    }
  } catch (error) {
    console.warn('Cloud check failed, using localStorage:', error)
  }

  // Fallback to localStorage
  return getSpacesFromLocalStorage(userId)
}

function getSpacesFromLocalStorage(userId) {
  try {
    const stored = localStorage.getItem(SPACES_KEY)
    if (!stored) return []
    
    const allSpaces = JSON.parse(stored)
    return allSpaces.filter(s => s.userId === userId && !s.deleted)
  } catch (error) {
    console.error('Error reading spaces from localStorage:', error)
    return []
  }
}

export async function deleteSpace(userId, spaceId) {
  if (!userId) {
    throw new Error('User must be authenticated to delete spaces')
  }

  try {
    // Try cloud first
    if (await useCloud()) {
      try {
        await cloudManager.deleteSpaceFromCloud(userId, spaceId)
        // Also update localStorage
        deleteSpaceInLocalStorage(userId, spaceId)
        
        // Remove spaceId from projects
        const projects = await getProjects(userId)
        for (const project of projects) {
          if (project.spaceId === spaceId) {
            await updateProject(userId, project.id, { spaceId: null })
          }
        }
        
        const spaces = await getSpaces(userId)
        return spaces.filter(s => s.id !== spaceId)
      } catch (cloudError) {
        console.warn('Cloud delete failed, using localStorage:', cloudError)
        // Fall through to localStorage
      }
    }
  } catch (error) {
    console.warn('Cloud check failed, using localStorage:', error)
  }

  // Fallback to localStorage
  return deleteSpaceInLocalStorage(userId, spaceId)
}

async function deleteSpaceInLocalStorage(userId, spaceId) {
  const spaces = await getSpaces(userId)
  const space = spaces.find(s => s.id === spaceId)
  
  if (!space) {
    throw new Error('Space not found')
  }
  
  if (space.userId !== userId) {
    throw new Error('Access denied: This space belongs to another user')
  }
  
  const updatedSpace = {
    ...space,
    deleted: true,
    deletedAt: new Date().toISOString(),
  }
  
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
    
    const projects = await getProjects(userId)
    for (const project of projects) {
      if (project.spaceId === spaceId) {
        await updateProject(userId, project.id, { spaceId: null })
      }
    }
  } catch (error) {
    console.error('Error moving space to trash:', error)
    throw error
  }
  
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

// Permanently delete all trashed items (spaces and projects)
export function emptyTrash(userId) {
  if (!userId) {
    throw new Error('User must be authenticated to empty trash')
  }
  
  try {
    // Get all trashed items
    const trashedSpaces = getTrashedSpaces(userId)
    const trashedProjects = getTrashedProjects(userId)
    
    // Permanently delete all trashed spaces
    const spacesStored = localStorage.getItem(SPACES_KEY)
    if (spacesStored) {
      const allSpaces = JSON.parse(spacesStored)
      const updatedSpaces = allSpaces.filter(s => !(s.userId === userId && s.deleted))
      localStorage.setItem(SPACES_KEY, JSON.stringify(updatedSpaces))
    }
    
    // Permanently delete all trashed projects
    const projectsStored = localStorage.getItem(STORAGE_KEY)
    if (projectsStored) {
      const allProjects = JSON.parse(projectsStored)
      const updatedProjects = allProjects.filter(p => !(p.userId === userId && p.deleted))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProjects))
    }
    
    return {
      deletedSpaces: trashedSpaces.length,
      deletedProjects: trashedProjects.length
    }
  } catch (error) {
    console.error('Error emptying trash:', error)
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

// Asset Library Functions (Shared across all users)
export async function getAssets(userId) {
  if (!userId) {
    return []
  }

  try {
    const response = await fetch(ASSETS_API, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userId}`,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch assets' }))
      throw new Error(error.error || 'Failed to fetch assets')
    }

    const data = await response.json()
    return data.assets || []
  } catch (error) {
    console.error('Error fetching assets:', error)
    return []
  }
}

export async function addAssetToLibrary(userId, name, url, type = 'image', description = null) {
  if (!userId) {
    throw new Error('User must be authenticated to add assets')
  }

  try {
    const response = await fetch(ASSETS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userId}`,
      },
      body: JSON.stringify({
        name,
        url,
        type,
        description,
      }),
    })

    if (!response.ok) {
      let errorMessage = 'Failed to add asset'
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
        if (errorData.details) {
          errorMessage += `: ${errorData.details}`
        }
        console.error('Assets API error response:', errorData)
      } catch (parseError) {
        errorMessage = `Failed to add asset: ${response.status} ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    return await response.json()
  } catch (error) {
    console.error('Error adding asset:', error)
    throw error
  }
}

