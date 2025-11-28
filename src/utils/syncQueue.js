/**
 * Background Sync Queue Manager
 * Handles syncing local projects to cloud with retry logic
 */

const SYNC_QUEUE_KEY = 'ature_sync_queue'
const MAX_RETRIES = 3
const RETRY_DELAY = 5000 // 5 seconds
const SYNC_INTERVAL = 30000 // 30 seconds

class SyncQueue {
  constructor() {
    this.isSyncing = false
    this.syncInterval = null
  }

  /**
   * Add project to sync queue
   * @param {Object} project - Project object to sync
   * @param {string} priority - 'high' | 'normal' | 'low'
   * @param {Object} clerkInstance - Clerk instance for authentication
   */
  async add(project, priority = 'normal', clerkInstance = null) {
    if (!project || !project.id) {
      console.error('Invalid project for sync queue')
      return
    }

    const queue = this.getQueue()
    const existing = queue.find(item => item.projectId === project.id)
    
    if (existing) {
      // Update existing entry
      existing.project = project
      existing.priority = priority
      existing.retries = 0
      existing.timestamp = Date.now()
      existing.clerkInstance = clerkInstance
    } else {
      // Add new entry
      queue.push({
        projectId: project.id,
        project,
        priority,
        retries: 0,
        timestamp: Date.now(),
        status: 'pending',
        clerkInstance
      })
    }
    
    this.saveQueue(queue)
    
    // Trigger sync if online
    if (navigator.onLine && !this.isSyncing && clerkInstance) {
      this.sync(clerkInstance)
    }
  }

  /**
   * Get sync queue from localStorage
   */
  getQueue() {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error reading sync queue:', error)
      return []
    }
  }

  /**
   * Save sync queue to localStorage
   */
  saveQueue(queue) {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
    } catch (error) {
      console.error('Error saving sync queue:', error)
    }
  }

  /**
   * Process sync queue
   * @param {Object} clerkInstance - Clerk instance for authentication
   */
  async sync(clerkInstance = null) {
    if (this.isSyncing || !navigator.onLine) return
    if (!clerkInstance) {
      console.warn('No clerk instance provided, skipping sync')
      return
    }
    
    this.isSyncing = true
    const queue = this.getQueue()
    
    if (queue.length === 0) {
      this.isSyncing = false
      return
    }

    // Sort by priority and timestamp
    queue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      return a.timestamp - b.timestamp
    })

    for (const item of queue) {
      if (item.status === 'completed') continue
      
      if (item.retries >= MAX_RETRIES) {
        item.status = 'failed'
        this.updateProjectSyncStatus(item.projectId, 'error', 'Max retries exceeded')
        continue
      }

      try {
        // Import here to avoid circular dependencies
        const { saveProjectToCloud } = await import('./cloudProjectManager')
        
        // Update project sync status
        this.updateProjectSyncStatus(item.projectId, 'syncing')
        
        // Prepare workflow data for cloud
        const workflowData = {
          mode: item.project.workflow?.mode || '',
          furnitureFile: item.project.workflow?.furnitureFile || null,
          furnitureFileName: item.project.workflow?.furnitureFile?.name,
          furniturePreviewUrl: item.project.workflow?.furnitureFile?.url,
          roomFile: item.project.workflow?.roomFile || null,
          roomFileName: item.project.workflow?.roomFile?.name,
          roomPreviewUrl: item.project.workflow?.roomFile?.url,
          model3dUrl: item.project.workflow?.model3d?.url,
          resultUrl: item.project.workflow?.result?.url || item.project.workflow?.resultUrl,
          description: item.project.workflow?.result?.description || item.project.workflow?.description,
          useAIDesigner: item.project.workflow?.result?.useAIDesigner || item.project.workflow?.useAIDesigner || false,
        }
        
        // Sync to cloud
        const cloudProject = await saveProjectToCloud(
          clerkInstance,
          item.project.name,
          workflowData,
          item.project.spaceId
        )
        
        // Update project with cloud data
        const updatedProject = {
          ...item.project,
          ...cloudProject,
          syncStatus: 'synced',
          lastSyncedAt: new Date().toISOString()
        }
        
        // Update in localStorage
        this.updateProjectInLocalStorage(updatedProject)
        this.updateProjectSyncStatus(item.projectId, 'synced')
        
        // Remove from queue
        item.status = 'completed'
        
      } catch (error) {
        console.error('Sync error for project:', item.projectId, error)
        item.retries++
        item.status = 'retrying'
        item.lastError = error.message
        this.updateProjectSyncStatus(item.projectId, 'error', error.message)
      }
    }

    // Remove completed items
    const remaining = queue.filter(item => item.status !== 'completed')
    this.saveQueue(remaining)
    
    this.isSyncing = false

    // Schedule next sync if there are pending items
    if (remaining.length > 0) {
      setTimeout(() => {
        if (navigator.onLine && clerkInstance) {
          this.sync(clerkInstance)
        }
      }, RETRY_DELAY)
    }
  }

  /**
   * Update project sync status in localStorage
   */
  updateProjectSyncStatus(projectId, status, error = null) {
    try {
      const projects = JSON.parse(localStorage.getItem('ature_projects') || '[]')
      const project = projects.find(p => p.id === projectId)
      if (project) {
        project.syncStatus = status
        if (error) {
          project.syncError = error
        }
        if (status === 'synced') {
          project.lastSyncedAt = new Date().toISOString()
          delete project.syncError
        }
        localStorage.setItem('ature_projects', JSON.stringify(projects))
      }
    } catch (error) {
      console.error('Error updating project sync status:', error)
    }
  }

  /**
   * Update project in localStorage
   */
  updateProjectInLocalStorage(project) {
    try {
      const projects = JSON.parse(localStorage.getItem('ature_projects') || '[]')
      const index = projects.findIndex(p => p.id === project.id)
      if (index >= 0) {
        projects[index] = project
      } else {
        projects.push(project)
      }
      localStorage.setItem('ature_projects', JSON.stringify(projects))
    } catch (error) {
      console.error('Error updating project in localStorage:', error)
    }
  }

  /**
   * Start automatic syncing (call on app init)
   * @param {Object} clerkInstance - Clerk instance for authentication
   */
  start(clerkInstance = null) {
    if (!clerkInstance) {
      console.warn('No clerk instance provided to sync queue')
      return
    }

    // Sync immediately if online
    if (navigator.onLine) {
      this.sync(clerkInstance)
    }

    // Listen for online event
    const handleOnline = () => {
      this.sync(clerkInstance)
    }
    window.addEventListener('online', handleOnline)

    // Periodic sync check
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        const queue = this.getQueue()
        if (queue.length > 0) {
          this.sync(clerkInstance)
        }
      }
    }, SYNC_INTERVAL)

    // Store cleanup function
    this.cleanup = () => {
      window.removeEventListener('online', handleOnline)
      if (this.syncInterval) {
        clearInterval(this.syncInterval)
        this.syncInterval = null
      }
    }
  }

  /**
   * Stop automatic syncing
   */
  stop() {
    if (this.cleanup) {
      this.cleanup()
      this.cleanup = null
    }
  }

  /**
   * Get sync status for a project
   */
  getStatus(projectId) {
    const queue = this.getQueue()
    const item = queue.find(i => i.projectId === projectId)
    if (item) {
      return {
        status: item.status,
        retries: item.retries,
        error: item.lastError
      }
    }
    return null
  }

  /**
   * Manually trigger sync for a project
   * @param {string} projectId - Project ID to sync
   * @param {Object} clerkInstance - Clerk instance for authentication
   */
  async syncProject(projectId, clerkInstance) {
    if (!clerkInstance) {
      throw new Error('Clerk instance required for sync')
    }

    try {
      const projects = JSON.parse(localStorage.getItem('ature_projects') || '[]')
      const project = projects.find(p => p.id === projectId)
      if (project) {
        await this.add(project, 'high', clerkInstance)
        await this.sync(clerkInstance)
      }
    } catch (error) {
      console.error('Error syncing project:', error)
      throw error
    }
  }
}

// Export singleton instance
export const syncQueue = new SyncQueue()

