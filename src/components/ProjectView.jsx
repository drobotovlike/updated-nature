import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { getProject, getProjects } from '../utils/projectManager'

export default function ProjectView({ projectId, onEdit, onBack }) {
  const { userId } = useAuth()
  const [project, setProject] = useState(null)
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'assets', 'creations'
  const [hoveredCreation, setHoveredCreation] = useState(null)

  useEffect(() => {
    async function loadProject() {
      if (projectId && userId) {
        try {
          const projectData = await getProject(userId, projectId)
          setProject(projectData)
        } catch (error) {
          console.error('Error loading project:', error)
        }
      }
    }
    loadProject()
  }, [projectId, userId])

  // Extract assets (uploaded files) from project workflow
  const getAssets = () => {
    if (!project?.workflow) return []
    const assets = []
    
    if (project.workflow.roomFile?.url) {
      assets.push({
        id: 'room-file',
        name: project.workflow.roomFile.name || 'Room Image',
        url: project.workflow.roomFile.url,
        type: 'image',
        createdAt: project.createdAt,
      })
    }
    
    if (project.workflow.furnitureFile?.url) {
      assets.push({
        id: 'furniture-file',
        name: project.workflow.furnitureFile.name || 'Furniture Image',
        url: project.workflow.furnitureFile.url,
        type: 'image',
        createdAt: project.createdAt,
      })
    }
    
    // Get all files from project_files table if available
    if (project.workflow.files && Array.isArray(project.workflow.files)) {
      project.workflow.files.forEach(file => {
        if (file.type === 'image' && file.url) {
          assets.push(file)
        }
      })
    }
    
    return assets
  }

  // Extract creations (generated images) from project
  const getCreations = () => {
    if (!project?.workflow) return []
    const creations = []
    
    // Result images are creations
    if (project.workflow.result?.url) {
      creations.push({
        id: 'result-main',
        name: project.workflow.result.description || project.name || 'Generated Design',
        url: project.workflow.result.url,
        description: project.workflow.result.description,
        createdAt: project.updatedAt || project.createdAt,
      })
    }
    
    if (project.workflow.resultUrl) {
      creations.push({
        id: 'result-url',
        name: project.name || 'Generated Design',
        url: project.workflow.resultUrl,
        description: project.workflow.description,
        createdAt: project.updatedAt || project.createdAt,
      })
    }
    
    // Get generated files from project_files if marked as generated
    if (project.workflow.files && Array.isArray(project.workflow.files)) {
      project.workflow.files.forEach(file => {
        if (file.type === 'image' && file.url && file.generated) {
          creations.push({
            id: file.id,
            name: file.name,
            url: file.url,
            description: file.description,
            createdAt: file.createdAt,
          })
        }
      })
    }
    
    return creations
  }

  const handleDownload = (url, name) => {
    const link = document.createElement('a')
    link.href = url
    link.download = `${name || 'image'}-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleEdit = (creation) => {
    if (onEdit) {
      onEdit(creation)
    }
  }

  const assets = getAssets()
  const creations = getCreations()

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-stone-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 font-serif-ature mb-1">
              {project.name}
            </h1>
            <p className="text-sm text-stone-500">
              Created {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (onEdit) {
                  onEdit(null) // Pass null to start fresh
                }
              }}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-sm font-semibold transition-colors shadow-lg"
            >
              Start Creating
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors"
              >
                ← Back
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              activeTab === 'overview'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              activeTab === 'assets'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            My Assets ({assets.length})
          </button>
          <button
            onClick={() => setActiveTab('creations')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              activeTab === 'creations'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            My Creations ({creations.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 mb-4">Project Overview</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-stone-50 rounded-xl p-6 border border-stone-200">
                  <h3 className="text-sm font-semibold text-stone-700 mb-2">Uploaded Assets</h3>
                  <p className="text-2xl font-bold text-stone-900">{assets.length}</p>
                  <p className="text-xs text-stone-500 mt-1">Images you've uploaded</p>
                </div>
                <div className="bg-stone-50 rounded-xl p-6 border border-stone-200">
                  <h3 className="text-sm font-semibold text-stone-700 mb-2">Generated Creations</h3>
                  <p className="text-2xl font-bold text-stone-900">{creations.length}</p>
                  <p className="text-xs text-stone-500 mt-1">AI-generated designs</p>
                </div>
              </div>
            </div>

            {assets.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-stone-900 mb-4">Recent Assets</h2>
                <div className="grid grid-cols-4 gap-4">
                  {assets.slice(0, 4).map((asset) => (
                    <div
                      key={asset.id}
                      className="aspect-square rounded-xl overflow-hidden border border-stone-200 bg-stone-50 group cursor-pointer hover:border-stone-300 transition-colors"
                    >
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {creations.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-stone-900 mb-4">Recent Creations</h2>
                <div className="grid grid-cols-4 gap-4">
                  {creations.slice(0, 4).map((creation) => (
                    <div
                      key={creation.id}
                      className="aspect-square rounded-xl overflow-hidden border border-stone-200 bg-stone-50 group cursor-pointer hover:border-stone-300 transition-colors relative"
                      onMouseEnter={() => setHoveredCreation(creation.id)}
                      onMouseLeave={() => setHoveredCreation(null)}
                    >
                      <img
                        src={creation.url}
                        alt={creation.name}
                        className="w-full h-full object-cover"
                      />
                      {hoveredCreation === creation.id && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDownload(creation.url, creation.name)}
                            className="px-4 py-2 bg-white text-stone-900 rounded-full text-xs font-semibold hover:bg-stone-100 transition-colors"
                          >
                            Download
                          </button>
                          <button
                            onClick={() => handleEdit(creation)}
                            className="px-4 py-2 bg-stone-900 text-white rounded-full text-xs font-semibold hover:bg-stone-800 transition-colors"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'assets' && (
          <div>
            <h2 className="text-lg font-semibold text-stone-900 mb-6">My Assets</h2>
            {assets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-stone-500">No assets uploaded yet</p>
                <p className="text-sm text-stone-400 mt-2">Upload images to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="aspect-square rounded-xl overflow-hidden border border-stone-200 bg-stone-50 group cursor-pointer hover:border-stone-300 transition-colors"
                  >
                    <img
                      src={asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs truncate">{asset.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'creations' && (
          <div>
            <h2 className="text-lg font-semibold text-stone-900 mb-6">My Creations</h2>
            {creations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-stone-500">No creations yet</p>
                <p className="text-sm text-stone-400 mt-2">Generate designs to see them here</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {creations.map((creation) => (
                  <div
                    key={creation.id}
                    className="aspect-square rounded-xl overflow-hidden border border-stone-200 bg-stone-50 group cursor-pointer hover:border-stone-300 transition-colors relative"
                    onMouseEnter={() => setHoveredCreation(creation.id)}
                    onMouseLeave={() => setHoveredCreation(null)}
                  >
                    <img
                      src={creation.url}
                      alt={creation.name}
                      className="w-full h-full object-cover"
                    />
                    {hoveredCreation === creation.id && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDownload(creation.url, creation.name)}
                          className="px-4 py-2 bg-white text-stone-900 rounded-full text-xs font-semibold hover:bg-stone-100 transition-colors"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => handleEdit(creation)}
                          className="px-4 py-2 bg-stone-900 text-white rounded-full text-xs font-semibold hover:bg-stone-800 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                    {creation.description && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs truncate">{creation.description}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

