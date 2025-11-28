import { useState, useEffect } from 'react'
import { useClerk } from '@clerk/clerk-react'
import { syncQueue } from '../utils/syncQueue'

export default function ProjectSyncStatus({ projectId }) {
  const clerk = useClerk()
  const [status, setStatus] = useState('local')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!projectId) return

    // Get project from localStorage
    const updateStatus = () => {
      try {
        const projects = JSON.parse(localStorage.getItem('ature_projects') || '[]')
        const project = projects.find(p => p.id === projectId)
        
        if (project) {
          setStatus(project.syncStatus || 'local')
          setError(project.syncError || null)
        }
      } catch (err) {
        console.error('Error reading project status:', err)
      }
    }

    // Initial status
    updateStatus()

    // Listen for sync status changes
    const interval = setInterval(updateStatus, 1000)

    return () => clearInterval(interval)
  }, [projectId])

  const handleManualSync = async () => {
    if (!clerk) return
    
    try {
      await syncQueue.syncProject(projectId, clerk)
    } catch (error) {
      console.error('Error syncing project:', error)
      setError(error.message)
    }
  }

  if (status === 'synced') {
    return (
      <div className="flex items-center gap-2 text-xs text-green-600">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>Synced</span>
      </div>
    )
  }

  if (status === 'syncing') {
    return (
      <div className="flex items-center gap-2 text-xs text-blue-600">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span>Syncing...</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 text-xs text-red-600">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <span>Sync failed</span>
        {navigator.onLine && (
          <button 
            onClick={handleManualSync}
            className="underline hover:no-underline"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V7z" clipRule="evenodd" />
      </svg>
      <span>Local only</span>
      {navigator.onLine && clerk && (
        <button 
          onClick={handleManualSync}
          className="underline hover:no-underline"
        >
          Sync now
        </button>
      )}
    </div>
  )
}

