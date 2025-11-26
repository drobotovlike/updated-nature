import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { getProject, getProjects, getAssets, addAssetToLibrary } from '../utils/projectManager'
import { uploadFileToCloud } from '../utils/cloudProjectManager'
import Folder from './Folder'
import ShareModal from './ShareModal'
import ExportModal from './ExportModal'
import ProjectMetadataForm from './ProjectMetadataForm'
import VariationsView from './VariationsView'
import VariationsComparisonView from './VariationsComparisonView'
import AssetLibrary from './AssetLibrary'

export default function ProjectView({ projectId, onEdit, onBack }) {
  const { userId } = useAuth()
  const [project, setProject] = useState(null)
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'assets', 'creations'
  const [hoveredCreation, setHoveredCreation] = useState(null)
  const [sharedAssets, setSharedAssets] = useState([])
  const [loadingAssets, setLoadingAssets] = useState(true)
  const [uploadingAsset, setUploadingAsset] = useState(false)
  const assetUploadInputRef = useRef(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)

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

  // Load user's private assets from asset library
  const loadAssets = async () => {
    if (userId) {
      setLoadingAssets(true)
      try {
        const assets = await getAssets(userId)
        setSharedAssets(assets)
      } catch (error) {
        console.error('Error loading assets:', error)
      } finally {
        setLoadingAssets(false)
      }
    }
  }

  useEffect(() => {
    loadAssets()
  }, [userId])

  // Handle asset upload - saves to cloud storage and database
  const handleAssetUpload = async (file) => {
    if (!file || !userId) return

    setUploadingAsset(true)
    try {
      console.log('📤 Uploading asset to cloud storage...', file.name)
      
      // Step 1: Upload file to Supabase Storage (cloud)
      const uploadResult = await uploadFileToCloud(file, userId)
      const permanentUrl = uploadResult.url

      if (!permanentUrl) {
        throw new Error('Upload succeeded but no URL returned from server')
      }

      console.log('✅ File uploaded to cloud storage:', permanentUrl)

      // Step 2: Save asset metadata to Supabase database (cloud)
      try {
        const assetResult = await addAssetToLibrary(
          userId,
          file.name,
          permanentUrl,
          'image',
          `Uploaded from project: ${project?.name || 'Asset Library'}`
        )
        console.log('✅ Asset saved to cloud database:', assetResult)
      } catch (assetError) {
        console.error('❌ Failed to add asset to library:', assetError)
        const errorMessage = assetError.message || 'Unknown error'
        
        // Provide more specific error message
        let userMessage = 'File uploaded to cloud but failed to save metadata.'
        if (errorMessage.includes('row-level security') || errorMessage.includes('RLS')) {
          userMessage = 'File uploaded but RLS policy blocked saving metadata. Please check Supabase RLS policies on assets table.'
        } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
          userMessage = 'File uploaded but authentication failed when saving metadata. Please refresh and try again.'
        } else {
          userMessage = `File uploaded but failed to save metadata: ${errorMessage}`
        }
        
        alert(userMessage)
        setUploadingAsset(false)
        return
      }

      // Step 3: Refresh assets list from cloud
      await loadAssets()
      console.log('✅ Assets refreshed from cloud')
      
      // Show success message
      // (You can add a toast notification here if you have one)
    } catch (error) {
      console.error('❌ Error uploading asset:', error)
      const errorMessage = error.message || 'Unknown error'
      
      // Provide more specific error message
      let userMessage = 'Failed to upload asset. Please try again.'
      if (errorMessage.includes('Bucket not found') || errorMessage.includes('Storage bucket')) {
        userMessage = 'Storage bucket not configured. Please contact support.'
      } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
        userMessage = 'Authentication failed. Please refresh the page and try again.'
      } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        userMessage = 'Network error. Please check your connection and try again.'
      } else if (errorMessage.includes('no URL')) {
        userMessage = 'Upload completed but server did not return a valid URL. Please try again.'
      } else {
        userMessage = `Upload failed: ${errorMessage}`
      }
      
      alert(userMessage)
    } finally {
      setUploadingAsset(false)
    }
  }

  // Get user's private assets from asset library
  const getProjectAssets = () => {
    // Return user's private assets from the asset library
    return sharedAssets.map(asset => ({
      id: asset.id,
      name: asset.name,
      url: asset.url,
      type: asset.type || 'image',
      description: asset.description,
      createdAt: asset.created_at || asset.createdAt,
    }))
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

  const assets = getProjectAssets()
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
              onClick={() => setShowShareModal(true)}
              className="px-4 py-2.5 border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-full text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Share
            </button>
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
            Asset Library ({assets.length})
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
          <button
            onClick={() => setActiveTab('variations')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              activeTab === 'variations'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            Variations
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              activeTab === 'metadata'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            Details
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Empty state for new projects */}
            {assets.length === 0 && creations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-stone-900 mb-2">Ready to create something amazing?</h2>
                <p className="text-stone-500 mb-6 max-w-md">
                  This project is empty. Click "Start Creating" above to upload images and generate your first design.
                </p>
                <button
                  onClick={() => {
                    if (onEdit) {
                      onEdit(null)
                    }
                  }}
                  className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-sm font-semibold transition-colors shadow-lg"
                >
                  Start Creating
                </button>
              </div>
            ) : (
              <>
            {/* Folders Section */}
            <div>
              <h2 className="text-lg font-semibold text-stone-900 mb-4">Folders</h2>
              <div className="grid grid-cols-3 gap-6 mb-8">
                <Folder
                  name="Designs"
                  color="#9333ea"
                  itemCount={creations.length}
                  lastUpdated={creations.length > 0 ? creations[0]?.createdAt : null}
                  onNameChange={(newName) => {
                    console.log('Folder name changed to:', newName)
                    // You can save this to your database/state here
                  }}
                  onColorChange={(newColor) => {
                    console.log('Folder color changed to:', newColor)
                    // You can save this to your database/state here
                  }}
                  onClick={() => {
                    setActiveTab('creations')
                  }}
                />
                <Folder
                  name="Assets"
                  color="#3b82f6"
                  itemCount={assets.length}
                  lastUpdated={assets.length > 0 ? assets[0]?.createdAt : null}
                  onNameChange={(newName) => {
                    console.log('Folder name changed to:', newName)
                    // You can save this to your database/state here
                  }}
                  onColorChange={(newColor) => {
                    console.log('Folder color changed to:', newColor)
                    // You can save this to your database/state here
                  }}
                  onClick={() => {
                    setActiveTab('assets')
                  }}
                />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-stone-900 mb-4">Project Overview</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-stone-50 rounded-xl p-6 border border-stone-200">
                  <h3 className="text-sm font-semibold text-stone-700 mb-2">Asset Library</h3>
                  <p className="text-2xl font-bold text-stone-900">{assets.length}</p>
                  <p className="text-xs text-stone-500 mt-1">Your private assets</p>
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
                  {assets.slice(0, 8).map((asset) => (
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
              </>
            )}
          </div>
        )}

        {activeTab === 'assets' && (
          <AssetLibrary projectId={projectId} />
        )}

        {activeTab === 'creations' && (
          <div>
            <h2 className="text-lg font-semibold text-stone-900 mb-6">My Creations</h2>
            <p className="text-sm text-stone-500 mb-6">Generated designs for this project</p>
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
                        <button
                          onClick={() => setShowExportModal(true)}
                          className="px-4 py-2 bg-white text-stone-900 rounded-full text-xs font-semibold hover:bg-stone-100 transition-colors"
                        >
                          Export
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

        {activeTab === 'variations' && (
          <VariationsComparisonView projectId={projectId} />
        )}

        {activeTab === 'metadata' && (
          <ProjectMetadataForm projectId={projectId} />
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          projectId={projectId}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          projectId={projectId}
          projectName={project?.name || 'Project'}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  )
}

