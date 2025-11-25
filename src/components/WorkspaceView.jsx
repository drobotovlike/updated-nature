import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { getProject, updateProject } from '../utils/projectManager'

export default function WorkspaceView({ projectId, onBack, onSave, initialCreation = null }) {
  const { userId } = useAuth()
  const [project, setProject] = useState(null)
  const [resultUrl, setResultUrl] = useState('')
  const [roomFile, setRoomFile] = useState(null)
  const [roomPreviewUrl, setRoomPreviewUrl] = useState('')
  const [assetFile, setAssetFile] = useState(null)
  const [assetPreviewUrl, setAssetPreviewUrl] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [prompt, setPrompt] = useState('')
  const [showEditingMenu, setShowEditingMenu] = useState(false)
  const roomInputRef = useRef(null)
  const libraryInputRef = useRef(null)
  const assetInputRef = useRef(null)

  // Load project data
  useEffect(() => {
    async function loadProject() {
      if (projectId && userId) {
        if (!project) {
          setProject({ 
            id: projectId, 
            name: 'New Project', 
            workflow: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        }
        
        try {
          const projectData = await getProject(userId, projectId)
          if (projectData) {
            setProject(projectData)
            
            // Restore workflow state if exists
            if (projectData.workflow) {
              setRoomPreviewUrl(projectData.workflow.roomFile?.url || '')
              setAssetPreviewUrl(projectData.workflow.assetFile?.url || '')
              setResultUrl(projectData.workflow.result?.url || projectData.workflow.resultUrl || '')
              setPrompt(projectData.workflow.prompt || '')
              setShowEditingMenu(!!projectData.workflow.assetFile?.url)
            }
          }
        } catch (error) {
          console.error('Error loading project:', error)
        }
      }
    }
    loadProject()
  }, [projectId, userId])

  // Load initial creation if editing
  useEffect(() => {
    if (initialCreation && initialCreation.url) {
      // Load the creation image as the result
      setResultUrl(initialCreation.url)
      if (initialCreation.description) {
        setPrompt(initialCreation.description)
      }
      // Show editing menu
      setShowEditingMenu(true)
    }
  }, [initialCreation])

  // Debug: Log state changes for troubleshooting
  useEffect(() => {
    if (roomPreviewUrl) {
      console.log('Room preview URL set:', roomPreviewUrl)
    }
  }, [roomPreviewUrl])

  useEffect(() => {
    if (assetPreviewUrl) {
      console.log('Asset preview URL set:', assetPreviewUrl)
    }
  }, [assetPreviewUrl])

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleRoomUpload = async (file) => {
    try {
      if (!file) {
        console.error('No file provided')
        return
      }
      
      console.log('Uploading file:', file.name, file.type, file.size)
      const url = URL.createObjectURL(file)
      console.log('Created object URL:', url)
      setRoomFile(file)
      setRoomPreviewUrl(url)
      setShowEditingMenu(true) // Show editing menu when room is uploaded
      console.log('File uploaded successfully, preview URL set to:', url)
      
      // Force a re-render check
      setTimeout(() => {
        console.log('Current roomPreviewUrl state:', url)
      }, 100)
    } catch (error) {
      console.error('Error uploading file:', error)
      setError('Failed to upload image. Please try again.')
    }
  }

  const handleAssetUpload = async (file) => {
    const url = URL.createObjectURL(file)
    setAssetFile(file)
    setAssetPreviewUrl(url)
    setShowEditingMenu(true)
  }

  const handleCameraCapture = () => {
    // This would open device camera - for now, trigger file input
    if (roomInputRef.current) {
      roomInputRef.current.click()
    }
  }

  const callGeminiAPI = async (actionPrompt) => {
    // Allow generation with just a prompt, no images required
    if (!roomFile && !actionPrompt) {
      setError('Please provide a prompt or upload a room image')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      // Prepare request body - images are optional, prompt is required
      const requestBody = {
        description: actionPrompt || 'Create a beautiful interior design with proper lighting and realistic details.',
        useAIDesigner: false,
      }
      
      // Add room image if available
      if (roomFile) {
        const roomBase64 = await fileToBase64(roomFile)
        requestBody.roomBase64 = roomBase64
      }
      
      // Add asset if available
      if (assetFile) {
        const assetBase64 = await fileToBase64(assetFile)
        requestBody.furnitureBase64 = assetBase64
      }

      console.log('Calling Gemini API with prompt:', actionPrompt)
      console.log('Request body keys:', Object.keys(requestBody))
      
      const response = await fetch('/api/nano-banana/visualize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('Response status:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API error response:', errorText)
        try {
          const errorData = JSON.parse(errorText)
          setError(errorData.error?.message || errorData.error || `API error: ${response.status}`)
        } catch (e) {
          setError(`API error: ${response.status} - ${errorText}`)
        }
        return
      }

      const data = await response.json()
      console.log('API response data:', data)
      console.log('Has imageUrl?', !!data.imageUrl)
      console.log('Has text?', !!data.text)

      if (data.error) {
        console.error('Error in response:', data.error)
        setError(data.error.message || data.error || 'Failed to generate image')
        return
      }

      if (data.imageUrl) {
        console.log('Setting result URL, length:', data.imageUrl.length)
        setResultUrl(data.imageUrl)
        // Auto-save after generation
        await saveWorkflow()
      } else if (data.text) {
        console.log('Got text response instead of image:', data.text)
        setError(`API returned text instead of image: ${data.text.substring(0, 100)}...`)
      } else {
        console.error('Unexpected response format:', data)
        setError('No image was generated. Check console for details.')
      }
    } catch (error) {
      console.error('Error calling Gemini API:', error)
      console.error('Error stack:', error.stack)
      setError(`Failed to process image: ${error.message}. Please check console for details.`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePresetAction = async (action) => {
    let actionPrompt = ''
    
    switch (action) {
      case 'upscale':
        actionPrompt = 'Upscale this image to higher resolution while maintaining quality and details.'
        break
      case 'add-item':
        actionPrompt = prompt || 'Add the uploaded item to the room in a natural and aesthetically pleasing position with proper lighting and shadows.'
        break
      case 'change-lights':
        actionPrompt = 'Change the lighting in this room to create a different mood. Adjust brightness, shadows, and overall ambiance.'
        break
      case 'erase-object':
        actionPrompt = 'Remove any unwanted objects from the image while maintaining the overall scene composition.'
        break
      case 'change-object':
        actionPrompt = prompt || 'Modify or replace objects in the room according to the description.'
        break
      default:
        actionPrompt = prompt
    }

    await callGeminiAPI(actionPrompt)
  }

  const saveWorkflow = async () => {
    if (!projectId || !userId) return

    try {
      const workflowData = {
        roomFile: roomFile ? {
          name: roomFile.name,
          url: roomPreviewUrl,
        } : null,
        assetFile: assetFile ? {
          name: assetFile.name,
          url: assetPreviewUrl,
        } : null,
        result: resultUrl ? {
          url: resultUrl,
          prompt: prompt,
        } : null,
        resultUrl: resultUrl,
        prompt: prompt,
      }

      await updateProject(userId, projectId, { workflow: workflowData })
      if (onSave) onSave()
    } catch (error) {
      console.error('Error saving workflow:', error)
    }
  }

  const handleExport = () => {
    if (!resultUrl) {
      alert('No result to export')
      return
    }

    const link = document.createElement('a')
    link.href = resultUrl
    link.download = `${project?.name || 'export'}-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSaveToProjects = async () => {
    await saveWorkflow()
    alert('Project saved successfully!')
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center Canvas Area */}
        <section className="flex-1 bg-stone-50/50 relative flex flex-col">
          {/* Main Image Stage */}
          <div className="flex-1 p-8 flex items-center justify-center overflow-hidden relative">
            <div className="relative w-full h-full max-w-3xl max-h-[80vh] flex items-center justify-center group">
              {resultUrl ? (
                <img 
                  src={resultUrl} 
                  alt="Generated Result" 
                  className="w-full h-full object-contain drop-shadow-xl rounded-lg"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-stone-300 rounded-lg bg-stone-50">
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 mx-auto mb-3">
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                    <p className="text-stone-500 text-sm">Enter a prompt or upload images to generate</p>
                  </div>
                </div>
              )}

              {/* Zoom Controls */}
              {resultUrl && (
                <div className="absolute right-4 bottom-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button className="p-2 bg-white border border-stone-200 rounded-lg shadow-sm hover:bg-stone-50 text-stone-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                      <line x1="11" y1="8" x2="11" y2="14" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                  </button>
                  <button className="p-2 bg-white border border-stone-200 rounded-lg shadow-sm hover:bg-stone-50 text-stone-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 rounded-lg px-4 py-2 shadow-sm">
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                </div>
              )}

              {/* Processing Indicator */}
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-stone-600">Processing...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Floating Actions */}
            {resultUrl && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white border border-stone-200 shadow-lg shadow-stone-200/50 rounded-full px-2 py-2 flex items-center gap-1 z-10">
                <button 
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 rounded-full transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Export</span>
                </button>
                <div className="w-px h-4 bg-stone-200"></div>
                <button 
                  onClick={handleSaveToProjects}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 rounded-full transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  <span>Save to My Projects</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right Details Panel */}
        <aside className="w-[400px] bg-white border-l border-stone-100 overflow-hidden flex flex-col">
          {/* Panel Header */}
          <div className="p-4 flex items-center justify-between border-b border-stone-50 flex-shrink-0">
            <h2 className="font-medium text-stone-900 text-sm">Generation Details</h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Room Preview - Always show if uploaded */}
              {roomPreviewUrl ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-stone-400 tracking-wider uppercase">Room Image</label>
                    <button
                      onClick={() => {
                        setRoomPreviewUrl('')
                        setRoomFile(null)
                      }}
                      className="text-stone-400 hover:text-stone-600 text-xs"
                      title="Remove"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-stone-200 bg-stone-50 relative group min-h-[200px]">
                    <img 
                      src={roomPreviewUrl} 
                      alt="Room" 
                      className="w-full h-full object-cover"
                      style={{ display: 'block' }}
                      onError={(e) => {
                        console.error('Image failed to load:', roomPreviewUrl)
                        e.target.style.display = 'none'
                      }}
                      onLoad={() => {
                        console.log('Room image loaded successfully:', roomPreviewUrl)
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none"></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-400 tracking-wider uppercase">Upload Room</label>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (roomInputRef.current) {
                          roomInputRef.current.click()
                        }
                      }}
                      className="aspect-square flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-all group"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 group-hover:text-stone-600">
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                        <circle cx="12" cy="13" r="3" />
                      </svg>
                      <span className="text-[10px] font-medium text-stone-700 text-center leading-tight">Take picture</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (libraryInputRef.current) {
                          libraryInputRef.current.click()
                        }
                      }}
                      className="aspect-square flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-all group"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 group-hover:text-stone-600">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span className="text-[10px] font-medium text-stone-700 text-center leading-tight">Upload from library</span>
                    </button>
                  </div>

                  <input
                    ref={roomInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      console.log('File input changed, file:', file)
                      if (file) {
                        handleRoomUpload(file)
                      } else {
                        console.log('No file selected')
                      }
                      // Reset input so same file can be selected again
                      e.target.value = ''
                    }}
                    className="hidden"
                  />

                  <input
                    ref={libraryInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      console.log('File input changed, file:', file)
                      if (file) {
                        handleRoomUpload(file)
                      } else {
                        console.log('No file selected')
                      }
                      // Reset input so same file can be selected again
                      e.target.value = ''
                    }}
                    className="hidden"
                  />
                </div>
              )}

              {/* Asset Preview - Always show if uploaded */}
              {assetPreviewUrl ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-stone-400 tracking-wider uppercase">Furniture Asset</label>
                    <button
                      onClick={() => {
                        setAssetPreviewUrl('')
                        setAssetFile(null)
                      }}
                      className="text-stone-400 hover:text-stone-600 text-xs"
                      title="Remove"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-stone-200 bg-stone-50 relative group min-h-[200px]">
                    <img 
                      src={assetPreviewUrl} 
                      alt="Asset" 
                      className="w-full h-full object-cover"
                      style={{ display: 'block' }}
                      onError={(e) => {
                        console.error('Image failed to load:', assetPreviewUrl)
                        e.target.style.display = 'none'
                      }}
                      onLoad={() => {
                        console.log('Asset image loaded successfully:', assetPreviewUrl)
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none"></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-400 tracking-wider uppercase">Upload Furniture</label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (assetInputRef.current) {
                        assetInputRef.current.click()
                      }
                    }}
                    className="w-full aspect-square flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-all group"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 group-hover:text-stone-600">
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                    <span className="text-xs text-stone-500 group-hover:text-stone-700">Upload Furniture</span>
                  </button>
                </div>
              )}

              {/* Editing Menu (Shows when room is uploaded OR can be used for prompt-only generation) */}
              {(showEditingMenu || true) && (
                <>
                  {/* Prompt Section */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-stone-400 tracking-wider uppercase">Prompt</label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe how you want to modify the image..."
                      className="w-full p-3 bg-stone-50 rounded-lg border border-stone-100 text-xs text-stone-600 leading-relaxed font-normal resize-none focus:outline-none focus:border-stone-300 focus:ring-2 focus:ring-stone-200 min-h-[60px]"
                    />
                    <button
                      onClick={() => callGeminiAPI(prompt || 'Create a beautiful interior design with proper lighting and realistic details.')}
                      disabled={isProcessing}
                      className="w-full px-4 py-2.5 bg-stone-900 text-white rounded-full text-xs font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                          <span>Generate</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Preset Action Buttons */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-stone-400 tracking-wider uppercase">Actions</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handlePresetAction('upscale')}
                        disabled={isProcessing}
                        className="flex items-center gap-2 p-2 rounded-full border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 group-hover:text-stone-600 flex-shrink-0">
                          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                        </svg>
                        <span className="text-xs font-medium text-stone-700">Upscale</span>
                      </button>

                      <button
                        onClick={() => handlePresetAction('add-item')}
                        disabled={isProcessing}
                        className="flex items-center gap-2 p-2 rounded-full border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 group-hover:text-stone-600 flex-shrink-0">
                          <path d="M5 12h14" />
                          <path d="M12 5v14" />
                        </svg>
                        <span className="text-xs font-medium text-stone-700">Add your item</span>
                      </button>

                      <button
                        onClick={() => handlePresetAction('change-lights')}
                        disabled={isProcessing}
                        className="flex items-center gap-2 p-2 rounded-full border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 group-hover:text-stone-600 flex-shrink-0">
                          <path d="M9 2v3M15 2v3M12 18v3M4 12H2M6.314 6.314l-2.121 2.121M17.686 6.314l2.121 2.121M6.314 17.686l-2.121 2.121M17.686 17.686l2.121 2.121M22 12h-2M12 6a6 6 0 0 0 0 12 6 6 0 0 0 0-12Z" />
                        </svg>
                        <span className="text-xs font-medium text-stone-700">Change the lights</span>
                      </button>

                      <button
                        onClick={() => handlePresetAction('erase-object')}
                        disabled={isProcessing}
                        className="flex items-center gap-2 p-2 rounded-full border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 group-hover:text-stone-600 flex-shrink-0">
                          <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.2 5.2c1 1 1 2.5 0 3.4L13 21" />
                          <path d="M22 21H7" />
                          <path d="m5 11 9 9" />
                        </svg>
                        <span className="text-xs font-medium text-stone-700">Erase object</span>
                      </button>

                      <button
                        onClick={() => handlePresetAction('change-object')}
                        disabled={isProcessing}
                        className="flex items-center gap-2 p-2 rounded-full border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 group-hover:text-stone-600 flex-shrink-0">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                        <span className="text-xs font-medium text-stone-700">Change object</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
