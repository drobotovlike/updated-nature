/**
 * Migration script to convert old timestamp-based IDs to UUIDs
 * Run once on app load for existing users
 */

import { generateUUID, isValidUUID } from './uuid'
import { syncQueue } from './syncQueue'

const STORAGE_KEY = 'ature_projects'
const SPACES_KEY = 'ature_spaces'
const MIGRATION_KEY = 'ature_projects_migrated'

/**
 * Migrate old projects with timestamp-based IDs to UUIDs
 * @param {Object} clerkInstance - Clerk instance for authentication (optional)
 */
export function migrateOldProjects(clerkInstance = null) {
  // Check if already migrated
  if (localStorage.getItem(MIGRATION_KEY) === 'true') {
    return
  }

  try {
    // Migrate projects
    const projectsStored = localStorage.getItem(STORAGE_KEY)
    if (projectsStored) {
      const projects = JSON.parse(projectsStored)
      let hasChanges = false

      const migrated = projects.map(project => {
        // Check if project has old ID format
        if (project.id && project.id.startsWith('project_')) {
          hasChanges = true
          
          // Generate new UUID
          const newId = generateUUID()
          
          // Update project
          const migratedProject = {
            ...project,
            id: newId,
            oldId: project.id, // Keep old ID for reference
            syncStatus: 'local', // Mark as needing sync
            migratedAt: new Date().toISOString()
          }

          // Queue for sync if online and clerkInstance available
          if (navigator.onLine && clerkInstance) {
            syncQueue.add(migratedProject, 'high', clerkInstance)
          }

          return migratedProject
        }
        
        // Ensure sync status exists
        if (!project.syncStatus) {
          hasChanges = true
          return {
            ...project,
            syncStatus: isValidUUID(project.id) ? 'synced' : 'local'
          }
        }

        return project
      })

      if (hasChanges) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
        console.log('Projects migrated to UUID format')
      }
    }

    // Migrate spaces
    const spacesStored = localStorage.getItem(SPACES_KEY)
    if (spacesStored) {
      const spaces = JSON.parse(spacesStored)
      let hasChanges = false

      const migrated = spaces.map(space => {
        // Check if space has old ID format
        if (space.id && space.id.startsWith('space_')) {
          hasChanges = true
          
          // Generate new UUID
          const newId = generateUUID()
          
          // Update space
          return {
            ...space,
            id: newId,
            oldId: space.id,
            syncStatus: 'local',
            migratedAt: new Date().toISOString()
          }
        }
        
        // Ensure sync status exists
        if (!space.syncStatus) {
          hasChanges = true
          return {
            ...space,
            syncStatus: isValidUUID(space.id) ? 'synced' : 'local'
          }
        }

        return space
      })

      if (hasChanges) {
        localStorage.setItem(SPACES_KEY, JSON.stringify(migrated))
        console.log('Spaces migrated to UUID format')
      }
    }

    localStorage.setItem(MIGRATION_KEY, 'true')
    console.log('Migration completed')
  } catch (error) {
    console.error('Migration error:', error)
  }
}

// Auto-run migration on import (will be called from App.jsx with clerkInstance)
// migrateOldProjects() // Don't auto-run, let App.jsx handle it

