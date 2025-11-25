import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser, useAuth, useClerk } from '@clerk/clerk-react'
import { getProjects, getSpaces, createSpace, deleteSpace, deleteAllProjects, getTrashedSpaces, restoreSpace, permanentlyDeleteSpace, cleanupTrash, ONE_WEEK_MS, saveProject, deleteProject, getTrashedProjects, restoreProject, permanentlyDeleteProject } from '../utils/projectManager'
import WorkspaceView from '../components/WorkspaceView'
import AccountView from '../components/AccountView'
import ProjectView from '../components/ProjectView'

export default function DashboardPage() {
  const { user } = useUser()
  const { userId, isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const navigate = useNavigate()
  
  // View state: 'projects' | 'workspace' | 'account' | 'project-view'
  const [currentView, setCurrentView] = useState('projects')
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [editingCreation, setEditingCreation] = useState(null)
  
  const [savedProjects, setSavedProjects] = useState([])
  const [spaces, setSpaces] = useState([])
  const [trashedSpaces, setTrashedSpaces] = useState([])
  const [trashedProjects, setTrashedProjects] = useState([])
  const [selectedSpaceId, setSelectedSpaceId] = useState(null)
  const [showCreateSpaceModal, setShowCreateSpaceModal] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState('')
  const [showTrash, setShowTrash] = useState(false)
  
  // New project creation state
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  // Load spaces and projects on mount
  useEffect(() => {
    async function loadData() {
      if (userId && isSignedIn) {
        // Clean up trash on every load - each item is checked individually
        // Items are deleted only when their own 1-week period has passed
        cleanupTrash(userId)
        
        const userSpaces = await getSpaces(userId)
        const trashed = getTrashedSpaces(userId)
        const trashedProjs = getTrashedProjects(userId)
        setSpaces(userSpaces)
        setTrashedSpaces(trashed)
        setTrashedProjects(trashedProjs)
        
        // Auto-select first space if none selected and spaces exist
        if (!selectedSpaceId && userSpaces.length > 0) {
          const firstSpaceId = userSpaces[0].id
          setSelectedSpaceId(firstSpaceId)
          // Load projects for the first space
          const projects = await getProjects(userId, firstSpaceId)
          setSavedProjects(projects)
        } else {
          // Load projects for selected space (or all projects if no space selected)
          const projects = await getProjects(userId, selectedSpaceId)
          setSavedProjects(projects)
        }
      }
    }
    loadData()
  }, [userId, isSignedIn, selectedSpaceId])
  
  // Auto-cleanup trash every 5 minutes to check individual items
  // Each item is deleted independently when its own 1-week period expires
  useEffect(() => {
    if (userId && isSignedIn) {
      const interval = setInterval(() => {
        cleanupTrash(userId)
        const trashed = getTrashedSpaces(userId)
        const trashedProjs = getTrashedProjects(userId)
        setTrashedSpaces(trashed)
        setTrashedProjects(trashedProjs)
      }, 5 * 60 * 1000) // Every 5 minutes to catch items as soon as they expire
      
      return () => clearInterval(interval)
    }
  }, [userId, isSignedIn])

  // Safeguard: Ensure ProjectView shows when a project is selected (unless explicitly in workspace or account view)
  useEffect(() => {
    if (selectedProjectId && userId && currentView !== 'workspace' && currentView !== 'account' && currentView !== 'project-view' && currentView !== 'projects') {
      console.log('🛡️ Safeguard: Switching to project-view for project:', selectedProjectId, 'Current view was:', currentView)
      setCurrentView('project-view')
      setEditingCreation(null)
    }
  }, [selectedProjectId, userId])

  const userName = user?.fullName || user?.firstName || 'User'

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim()) {
      alert('Please enter a space name')
      return
    }
    
    try {
      const newSpace = await createSpace(userId, newSpaceName.trim())
      const updatedSpaces = await getSpaces(userId)
      setSpaces(updatedSpaces)
      setNewSpaceName('')
      setShowCreateSpaceModal(false)
      // Auto-select the newly created space
      setSelectedSpaceId(newSpace.id)
      // Load projects for the new space (will be empty)
      const projects = await getProjects(userId, newSpace.id)
      setSavedProjects(projects)
    } catch (error) {
      console.error('Error creating space:', error)
      alert('Failed to create space')
    }
  }

  const handleDeleteSpace = async (spaceId, spaceName) => {
    if (!window.confirm(`Are you sure you want to delete "${spaceName}"? It will be moved to trash and can be restored within 1 week.`)) {
      return
    }
    
    try {
      await deleteSpace(userId, spaceId)
      const updatedSpaces = await getSpaces(userId)
      const trashed = getTrashedSpaces(userId)
      const trashedProjs = getTrashedProjects(userId)
      setSpaces(updatedSpaces)
      setTrashedSpaces(trashed)
      setTrashedProjects(trashedProjs)
      if (selectedSpaceId === spaceId) {
        // Select first available space or null if none
        if (updatedSpaces.length > 0) {
          const newSelectedSpaceId = updatedSpaces[0].id
          setSelectedSpaceId(newSelectedSpaceId)
          // Load projects for the newly selected space
          const projects = await getProjects(userId, newSelectedSpaceId)
          setSavedProjects(projects)
        } else {
          setSelectedSpaceId(null)
          // Load all projects if no spaces
          const allProjects = await getProjects(userId, null)
          setSavedProjects(allProjects)
        }
      }
    } catch (error) {
      console.error('Error deleting space:', error)
      alert('Failed to delete space')
    }
  }

  const handleRestoreSpace = async (spaceId) => {
    try {
      restoreSpace(userId, spaceId)
      const userSpaces = await getSpaces(userId)
      const trashed = getTrashedSpaces(userId)
      setSpaces(userSpaces)
      setTrashedSpaces(trashed)
      // Auto-select restored space
      setSelectedSpaceId(spaceId)
    } catch (error) {
      console.error('Error restoring space:', error)
      alert('Failed to restore space')
    }
  }

  const handlePermanentlyDeleteSpace = (spaceId, spaceName) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${spaceName}"? This action cannot be undone.`)) {
      return
    }
    
    try {
      permanentlyDeleteSpace(userId, spaceId)
      const trashed = getTrashedSpaces(userId)
      const trashedProjs = getTrashedProjects(userId)
      setTrashedSpaces(trashed)
      setTrashedProjects(trashedProjs)
    } catch (error) {
      console.error('Error permanently deleting space:', error)
      alert('Failed to permanently delete space')
    }
  }

  const handleRestoreProject = async (projectId) => {
    try {
      restoreProject(userId, projectId)
      const projects = await getProjects(userId, null)
      const trashedProjs = getTrashedProjects(userId)
      setSavedProjects(projects)
      setTrashedProjects(trashedProjs)
    } catch (error) {
      console.error('Error restoring project:', error)
      alert('Failed to restore project')
    }
  }

  const handlePermanentlyDeleteProject = (projectId, projectName) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${projectName}"? This action cannot be undone.`)) {
      return
    }
    
    try {
      permanentlyDeleteProject(userId, projectId)
      const trashedProjs = getTrashedProjects(userId)
      setTrashedProjects(trashedProjs)
    } catch (error) {
      console.error('Error permanently deleting project:', error)
      alert('Failed to permanently delete project')
    }
  }

  const handleDeleteAllProjects = () => {
    if (!window.confirm('Are you sure you want to delete ALL projects? This action cannot be undone. Spaces will be preserved.')) {
      return
    }
    
    if (!window.confirm('This will permanently delete all your projects. Are you absolutely sure?')) {
      return
    }
    
    try {
      deleteAllProjects(userId)
      setSavedProjects([])
    } catch (error) {
      console.error('Error deleting all projects:', error)
      alert('Failed to delete all projects')
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      alert('Please enter a project name')
      return
    }
    
    try {
      // Create a new project with empty workflow
      const project = await saveProject(userId, newProjectName.trim(), {
        mode: '',
        furnitureFile: null,
        roomFile: null,
        model3dUrl: null,
        resultUrl: null,
        description: '',
        useAIDesigner: false,
      }, selectedSpaceId)
      
      // Set as selected project and switch to project view
      // IMPORTANT: Set ALL state synchronously to avoid race conditions
      setShowCreateProjectModal(false)
      setNewProjectName('')
      setEditingCreation(null) // Clear any editing state
      setCurrentView('project-view') // Set view FIRST
      setSelectedProjectId(project.id) // Then set project ID
      
      console.log('✅ Project created, view set to project-view for project:', project.id)
      
      // Refresh projects list for the selected space
      const projects = await getProjects(userId, selectedSpaceId)
      setSavedProjects(projects)
      
      // Refresh spaces to update project counts in sidebar
      const userSpaces = await getSpaces(userId)
      setSpaces(userSpaces)
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Failed to create project')
    }
  }

  return (
    <div className="bg-stone-50 h-screen flex overflow-hidden text-stone-900 antialiased">
      {/* Sidebar */}
      <aside className="w-72 flex flex-col bg-white border-r border-stone-200 h-screen flex-shrink-0">
        {/* Logo */}
        <div className="px-6 py-8 flex items-center gap-3">
          <Link to="/" className="text-xl font-bold tracking-tight text-stone-900">
            ature studio.
          </Link>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          <button
            onClick={() => {
              setCurrentView('projects')
              setSelectedProjectId(null)
              setEditingCreation(null)
              setSelectedSpaceId(null) // Show all projects on home
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              currentView === 'projects'
                ? 'bg-stone-100 text-stone-900'
                : 'hover:text-stone-900 hover:bg-stone-50 text-stone-600'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="text-sm font-medium">Home</span>
          </button>
          <button
            onClick={async () => {
              // Show all projects (regardless of space) when "My Projects" is clicked
              setSelectedSpaceId(null) // Clear space selection
              setCurrentView('projects')
              const allProjects = await getProjects(userId, null) // null = all projects
              setSavedProjects(allProjects)
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              selectedSpaceId === null && currentView === 'projects'
                ? 'bg-stone-100 text-stone-900'
                : 'hover:text-stone-900 hover:bg-stone-50 text-stone-600'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="7" height="7" x="3" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="14" rx="1" />
              <rect width="7" height="7" x="3" y="14" rx="1" />
            </svg>
            <span className="text-sm font-medium">My Projects</span>
          </button>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2.5 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-colors text-stone-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
              <path d="M11 2v6h6" />
            </svg>
            <span className="text-sm font-medium">Templates</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2.5 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-colors text-stone-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <span className="text-sm font-medium">Assets</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2.5 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-colors text-stone-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
            <span className="text-sm font-medium">New features</span>
          </a>

          {/* My Projects Section */}
          <div className="pt-8 pb-2 px-3 flex items-center justify-between group">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 group-hover:text-stone-700 transition-colors">My Projects</span>
            <button
              onClick={() => setShowCreateProjectModal(true)}
              className="text-stone-500 hover:text-stone-900 transition-colors"
              title="Create new project"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
            </button>
          </div>
          <div className="space-y-0.5">
            {/* Show all projects directly */}
            {savedProjects.map((project) => (
                <div
                  key={project.id}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                    selectedProjectId === project.id
                      ? 'bg-stone-100 text-stone-900'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  <button
                    onClick={() => {
                      // IMPORTANT: Set view first, then project ID
                      setCurrentView('project-view')
                      setEditingCreation(null) // Clear any editing state
                      setSelectedProjectId(project.id)
                      // Set the spaceId if the project has one
                      if (project.spaceId) {
                        setSelectedSpaceId(project.spaceId)
                      }
                    }}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="7" height="7" x="3" y="3" rx="1" />
                      <rect width="7" height="7" x="14" y="3" rx="1" />
                      <rect width="7" height="7" x="14" y="14" rx="1" />
                      <rect width="7" height="7" x="3" y="14" rx="1" />
                    </svg>
                    <span className="truncate flex-1 text-xs">{project.name}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm(`Are you sure you want to delete "${project.name}"?`)) {
                        (async () => {
                          try {
                            await deleteProject(userId, project.id)
                            // Refresh projects list
                            const projects = await getProjects(userId, null)
                            const trashedProjs = getTrashedProjects(userId)
                            setSavedProjects(projects)
                            setTrashedProjects(trashedProjs)
                            // If deleted project was selected, clear selection
                            if (selectedProjectId === project.id) {
                              setSelectedProjectId(null)
                              setCurrentView('projects')
                            }
                          } catch (error) {
                            console.error('Error deleting project:', error)
                            alert('Failed to delete project')
                          }
                        })()
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-600 transition-all p-1"
                    title="Delete project"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
          </div>
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 mt-auto space-y-1 border-t border-stone-200">
          <button
            onClick={() => {
              setShowTrash(!showTrash)
              if (!showTrash) {
                cleanupTrash(userId)
                const trashed = getTrashedSpaces(userId)
                const trashedProjs = getTrashedProjects(userId)
                setTrashedSpaces(trashed)
                setTrashedProjects(trashedProjs)
              }
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-colors text-stone-600 ${
              showTrash ? 'bg-stone-100 text-stone-900' : ''
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            <span className="text-sm font-medium">Trash</span>
            {(trashedSpaces.length + trashedProjects.length) > 0 && (
              <span className="ml-auto text-xs bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full">
                {trashedSpaces.length + trashedProjects.length}
              </span>
            )}
          </button>
          
          {/* Trash contents */}
          {showTrash && (
            <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
              {(trashedSpaces.length === 0 && trashedProjects.length === 0) ? (
                <p className="text-xs text-stone-500 px-3 py-2">Trash is empty</p>
              ) : (
                <>
                  {trashedSpaces.map((space) => {
                    const deletedAt = new Date(space.deletedAt)
                    const daysLeft = Math.ceil((ONE_WEEK_MS - (Date.now() - deletedAt.getTime())) / (24 * 60 * 60 * 1000))
                    
                    return (
                      <div
                        key={space.id}
                        className="px-3 py-2 bg-stone-50 rounded-lg border border-stone-200 mb-2"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500">
                              <rect width="7" height="7" x="3" y="3" rx="1" />
                              <rect width="7" height="7" x="14" y="3" rx="1" />
                              <rect width="7" height="7" x="14" y="14" rx="1" />
                              <rect width="7" height="7" x="3" y="14" rx="1" />
                            </svg>
                            <span className="text-xs font-medium text-stone-900">Space: {space.name}</span>
                          </div>
                          <span className="text-xs text-stone-500">{daysLeft}d left</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleRestoreSpace(space.id)}
                            className="text-xs px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded transition-colors"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handlePermanentlyDeleteSpace(space.id, space.name)}
                            className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {trashedProjects.map((project) => {
                    const deletedAt = new Date(project.deletedAt)
                    const daysLeft = Math.ceil((ONE_WEEK_MS - (Date.now() - deletedAt.getTime())) / (24 * 60 * 60 * 1000))
                    
                    return (
                      <div
                        key={project.id}
                        className="px-3 py-2 bg-stone-50 rounded-lg border border-stone-200 mb-2"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500">
                              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                              <path d="M3 9h18" />
                              <path d="M9 21V9" />
                            </svg>
                            <span className="text-xs font-medium text-stone-900">Project: {project.name}</span>
                          </div>
                          <span className="text-xs text-stone-500">{daysLeft}d left</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleRestoreProject(project.id)}
                            className="text-xs px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded transition-colors"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handlePermanentlyDeleteProject(project.id, project.name)}
                            className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )}

          <button
            onClick={() => setCurrentView('account')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              currentView === 'account' 
                ? 'bg-stone-100 text-stone-900' 
                : 'hover:text-stone-900 hover:bg-stone-50 text-stone-600'
            }`}
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-stone-200 ring-1 ring-stone-300">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-stone-300 flex items-center justify-center text-stone-700 text-xs font-semibold">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-stone-900">Account</span>
            </div>
          </button>

          <button
            onClick={async () => {
              try {
                await signOut()
                navigate('/')
              } catch (error) {
                console.error('Error signing out:', error)
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-colors text-stone-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-stone-50 h-full relative overflow-hidden flex flex-col">
        {/* Top Header */}
        <header className="flex items-center justify-between px-8 py-6 flex-shrink-0 border-b border-stone-200">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 font-serif-ature">Hello, {userName}!</h1>

          <div className="flex items-center gap-4">
            <div className="relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Search"
                className="pl-10 pr-4 py-2.5 bg-white rounded-lg border border-stone-200 text-base focus:outline-none focus:ring-2 focus:ring-stone-200 w-64 placeholder:text-stone-400 shadow-sm"
              />
            </div>
            {currentView !== 'workspace' && currentView !== 'account' && currentView !== 'project-view' && (
              <button
                onClick={() => setShowCreateProjectModal(true)}
                className="bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-colors shadow-lg shadow-stone-200"
              >
                New project
              </button>
            )}
            {(currentView === 'workspace' || currentView === 'account' || currentView === 'project-view') && (
              <button
                onClick={() => setCurrentView('projects')}
                className="bg-stone-100 hover:bg-stone-200 text-stone-900 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors"
              >
                Back to Projects
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Content - Dynamic based on view */}
        <div className="flex-1 overflow-y-auto">
          {/* PRIORITY ORDER: 
              1. If we have a selected project and view is NOT workspace/account, show ProjectView
              2. If view is explicitly workspace, show WorkspaceView
              3. Otherwise show projects list or account view
          */}
          {selectedProjectId && userId && currentView !== 'workspace' && currentView !== 'account' ? (
            <div className="h-full">
              <ProjectView
                projectId={selectedProjectId}
                onBack={() => {
                  setCurrentView('projects')
                  setSelectedProjectId(null)
                  setEditingCreation(null)
                }}
                onEdit={(creation) => {
                  setEditingCreation(creation)
                  setCurrentView('workspace')
                }}
              />
            </div>
          ) : currentView === 'workspace' && selectedProjectId && userId ? (
            <div className="h-full px-8 pb-12 pt-8">
              <WorkspaceView
                projectId={selectedProjectId}
                initialCreation={editingCreation}
                onBack={() => {
                  setCurrentView('project-view')
                  setEditingCreation(null)
                }}
                onSave={async () => {
                  // Refresh projects list after save
                  const projects = await getProjects(userId, selectedSpaceId)
                  setSavedProjects(projects)
                  // Refresh spaces to update project counts in sidebar
                  const userSpaces = await getSpaces(userId)
                  setSpaces(userSpaces)
                  // Go back to project view
                  setCurrentView('project-view')
                  setEditingCreation(null)
                }}
              />
            </div>
          ) : currentView === 'projects' ? (
            <div className="px-8 pb-12">
              {/* Quick Start Section */}
              <section className="mb-10 mt-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-stone-900 tracking-tight font-serif-ature">Quick start</h2>
              <p className="text-base text-stone-500 mt-1">Essential tools to kickstart your creativity</p>
            </div>

            <div className="grid grid-cols-5 gap-4">
              {/* Card 1 - Build with AI */}
              <div
                onClick={() => setShowCreateProjectModal(true)}
                className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group h-full flex flex-col"
              >
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-700 mb-4 group-hover:scale-105 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 4V2" />
                    <path d="M15 16v-2" />
                    <path d="M8 9h2" />
                    <path d="M20 9h2" />
                    <path d="M17.8 11.8 19 13" />
                    <path d="M15 9h0" />
                    <path d="M17.8 6.2 19 5" />
                    <path d="M3 21l3-3" />
                    <path d="M21 3l-3 3" />
                    <path d="M18 12l-3 3" />
                    <path d="M6 18l-3 3" />
                    <path d="M12 3v3" />
                    <path d="M12 15v3" />
                    <path d="M6 6 3 3" />
                    <path d="M18 18l-3-3" />
                  </svg>
                </div>
                <h3 className="font-semibold text-stone-900 text-base">Build with AI</h3>
                <p className="text-sm text-stone-500 mt-1 leading-snug">Create personalized interior designs with AI</p>
              </div>

              {/* Card 2 - Upload Floor Plan */}
              <div
                onClick={() => setShowCreateProjectModal(true)}
                className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group h-full flex flex-col"
              >
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-700 mb-4 group-hover:scale-105 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <h3 className="font-semibold text-stone-900 text-base">Upload Floor Plan</h3>
                <p className="text-sm text-stone-500 mt-1 leading-snug">Upload your room or house layout</p>
              </div>

              {/* Card 3 - Browse Templates */}
              <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group h-full flex flex-col">
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-700 mb-4 group-hover:scale-105 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                  </svg>
                </div>
                <h3 className="font-semibold text-stone-900 text-base">Browse Templates</h3>
                <p className="text-sm text-stone-500 mt-1 leading-snug">Explore design templates and styles</p>
              </div>

              {/* Card 4 - Saved Objects */}
              <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group h-full flex flex-col">
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-700 mb-4 group-hover:scale-105 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </div>
                <h3 className="font-semibold text-stone-900 text-base">Saved Objects</h3>
                <p className="text-sm text-stone-500 mt-1 leading-snug">Access your saved furniture and decor</p>
              </div>

              {/* Card 5 - Tutorials */}
              <div
                onClick={() => navigate('/help')}
                className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group h-full flex flex-col"
              >
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-700 mb-4 group-hover:scale-105 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="10 8 16 12 10 16 10 8" />
                  </svg>
                </div>
                <h3 className="font-semibold text-stone-900 text-base">Tutorials</h3>
                <p className="text-sm text-stone-500 mt-1 leading-snug">Learn how to use the app effectively</p>
              </div>
            </div>
          </section>

          {/* Recent Projects Section */}
          <section className="mb-10">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-stone-900 tracking-tight font-serif-ature">Your recent projects</h2>
                <p className="text-base text-stone-500 mt-1">Projects you've been working on</p>
              </div>
              {savedProjects.length > 0 && (
                <button
                  onClick={handleDeleteAllProjects}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete All Projects"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              )}
            </div>

            {savedProjects.length > 0 ? (
              <div className="grid grid-cols-4 gap-6">
                {savedProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => {
                      // IMPORTANT: Set view first, then project ID
                      setCurrentView('project-view')
                      setEditingCreation(null) // Clear any editing state
                      setSelectedProjectId(project.id)
                    }}
                    className="group cursor-pointer"
                  >
                    <div className="aspect-[4/3] bg-white rounded-xl overflow-hidden border border-stone-200 relative shadow-sm group-hover:shadow-md transition-all">
                      {project.workflow.result?.url ? (
                        <img
                          src={project.workflow.result.url}
                          alt={project.name}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                      ) : (
                        <div className="w-full h-full bg-stone-100 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-start gap-3">
                      <div className="bg-stone-100 p-1.5 rounded text-stone-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="7" height="7" x="3" y="3" rx="1" />
                          <rect width="7" height="7" x="14" y="3" rx="1" />
                          <rect width="7" height="7" x="14" y="14" rx="1" />
                          <rect width="7" height="7" x="3" y="14" rx="1" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Project</p>
                        <h3 className="text-lg font-semibold text-stone-900 leading-tight">{project.name}</h3>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
            </div>
          ) : currentView === 'account' ? (
            <div className="px-8 pb-12 pt-8">
              <AccountView />
            </div>
          ) : null}
        </div>
      </main>

      {/* Create Space Modal */}
      {showCreateSpaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateSpaceModal(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-semibold text-stone-900 mb-4 font-serif-ature">Create New Space</h2>
            <input
              type="text"
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
              placeholder="Enter space name (e.g., Brooklyn, NY)"
              className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/20 transition-all mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateSpace()
                }
                if (e.key === 'Escape') {
                  setShowCreateSpaceModal(false)
                }
              }}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateSpaceModal(false)
                  setNewSpaceName('')
                }}
                className="flex-1 px-4 py-3 rounded-full border border-stone-200 bg-white text-stone-700 text-sm font-semibold hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSpace}
                className="flex-1 px-4 py-3 rounded-full bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateProjectModal(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-semibold text-stone-900 mb-4 font-serif-ature">Create New Project</h2>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Enter project name..."
              className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/20 transition-all mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateProject()
                }
                if (e.key === 'Escape') {
                  setShowCreateProjectModal(false)
                }
              }}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateProjectModal(false)
                  setNewProjectName('')
                }}
                className="flex-1 px-4 py-3 rounded-full border border-stone-200 bg-white text-stone-700 text-sm font-semibold hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                className="flex-1 px-4 py-3 rounded-full bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
