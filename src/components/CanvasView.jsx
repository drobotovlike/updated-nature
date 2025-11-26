import { useState, useEffect, useRef, useCallback } from 'react'
import { Stage, Layer, Image, Group, Rect, Line, Text, Circle } from 'react-konva'
import { useAuth } from '@clerk/clerk-react'
import Konva from 'konva'
import useImage from 'use-image'
import AssetLibrary from './AssetLibrary'
import ExportModal from './ExportModal'
import { getCanvasData, createCanvasItem, updateCanvasItem, deleteCanvasItem, saveCanvasState } from '../utils/canvasManager'
import { uploadFileToCloud } from '../utils/cloudProjectManager'

// Zoom constants
const MIN_ZOOM = 0.25
const MAX_ZOOM = 3

// Canvas Item Component
function CanvasItem({ item, isSelected, onSelect, onUpdate, onDelete, showMeasurements, snapToGrid, gridSize, zoom }) {
  const [image] = useImage(item.image_url)
  const [isDragging, setIsDragging] = useState(false)
  const shapeRef = useRef(null)

  const handleDragEnd = useCallback((e) => {
    const node = e.target
    let x = node.x()
    let y = node.y()

    // Snap to grid if enabled
    if (snapToGrid && gridSize) {
      x = Math.round(x / gridSize) * gridSize
      y = Math.round(y / gridSize) * gridSize
      node.position({ x, y })
    }

    onUpdate(item.id, {
      x_position: x,
      y_position: y,
    })
    setIsDragging(false)
  }, [item.id, onUpdate, snapToGrid, gridSize])

  const handleTransformEnd = useCallback(() => {
    const node = shapeRef.current
    if (!node) return

    const scaleX = node.scaleX()
    const scaleY = node.scaleY()

    // Reset scale and update width/height
    node.scaleX(1)
    node.scaleY(1)

    onUpdate(item.id, {
      x_position: node.x(),
      y_position: node.y(),
      width: Math.max(50, node.width() * scaleX),
      height: Math.max(50, node.height() * scaleY),
      rotation: node.rotation(),
    })
  }, [item.id, onUpdate])

  if (!image) return null

  return (
    <Group
      ref={shapeRef}
      x={item.x_position}
      y={item.y_position}
      draggable={!item.is_locked}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onClick={onSelect}
      onTap={onSelect}
      opacity={item.opacity || 1}
    >
      <Image
        image={image}
        width={item.width || image.width}
        height={item.height || image.height}
        rotation={item.rotation || 0}
      />
      {isSelected && (
        <>
          {/* Selection border */}
          <Rect
            x={-5}
            y={-5}
            width={(item.width || image.width) + 10}
            height={(item.height || image.height) + 10}
            stroke="#3b82f6"
            strokeWidth={2 / zoom}
            dash={[5, 5]}
            listening={false}
          />
          {/* Measurements */}
          {showMeasurements && (
            <Group listening={false}>
              <Text
                text={`${Math.round(item.width || image.width)}px × ${Math.round(item.height || image.height)}px`}
                fontSize={12 / zoom}
                fill="#3b82f6"
                x={5}
                y={-20 / zoom}
                padding={4 / zoom}
                background="#ffffff"
                cornerRadius={4 / zoom}
              />
            </Group>
          )}
          {/* Delete button */}
          <Group
            x={(item.width || image.width) - 20 / zoom}
            y={-20 / zoom}
            onClick={(e) => {
              e.cancelBubble = true
              onDelete(item.id)
            }}
            onTap={(e) => {
              e.cancelBubble = true
              onDelete(item.id)
            }}
          >
            <Rect
              width={24 / zoom}
              height={24 / zoom}
              fill="#ef4444"
              cornerRadius={12 / zoom}
              listening={false}
            />
            <Text
              text="×"
              fontSize={16 / zoom}
              fill="white"
              x={6 / zoom}
              y={2 / zoom}
              listening={false}
            />
          </Group>
        </>
      )}
    </Group>
  )
}

// Grid Component - Fixed in world space, always fills full viewport
function GridLayer({ gridSize, width, height, panX, panY, zoom }) {
  const lines = []
  
  // Grid stays fixed in world space - calculate visible world area
  const worldLeft = -panX / zoom
  const worldRight = (width - panX) / zoom
  const worldTop = -panY / zoom
  const worldBottom = (height - panY) / zoom

  // Adaptive padding based on zoom - less padding at low zoom to prevent artifacts
  const basePadding = 100
  const adaptivePadding = Math.min(basePadding / zoom, 500) // Cap padding at low zoom

  // Calculate grid line positions in world space
  const gridStartX = Math.floor(worldLeft / gridSize) * gridSize
  const gridEndX = Math.ceil(worldRight / gridSize) * gridSize
  const gridStartY = Math.floor(worldTop / gridSize) * gridSize
  const gridEndY = Math.ceil(worldBottom / gridSize) * gridSize

  // At very low zoom, use larger grid spacing to reduce line count
  const effectiveGridSize = zoom < 0.5 ? gridSize * 2 : gridSize

  // Draw vertical lines - full viewport height
  for (let worldX = gridStartX; worldX <= gridEndX; worldX += effectiveGridSize) {
    const screenX = worldX * zoom + panX
    // Only draw if line is within viewport bounds (with small padding)
    if (screenX >= -50 && screenX <= width + 50) {
      lines.push(
        <Line
          key={`v-${worldX}`}
          points={[screenX, 0, screenX, height]}
          stroke="#e5e7eb"
          strokeWidth={Math.max(0.3, 0.5 / Math.max(0.25, zoom))}
          listening={false}
          perfect={false}
        />
      )
    }
  }

  // Draw horizontal lines - full viewport width
  for (let worldY = gridStartY; worldY <= gridEndY; worldY += effectiveGridSize) {
    const screenY = worldY * zoom + panY
    // Only draw if line is within viewport bounds (with small padding)
    if (screenY >= -50 && screenY <= height + 50) {
      lines.push(
        <Line
          key={`h-${worldY}`}
          points={[0, screenY, width, screenY]}
          stroke="#e5e7eb"
          strokeWidth={Math.max(0.3, 0.5 / Math.max(0.25, zoom))}
          listening={false}
          perfect={false}
        />
      )
    }
  }

  return <Group>{lines}</Group>
}

export default function CanvasView({ projectId, onBack, onSave }) {
  const { userId } = useAuth()
  const stageRef = useRef(null)
  const containerRef = useRef(null)

  // Canvas state
  const [items, setItems] = useState([])
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [canvasState, setCanvasState] = useState({
    zoom: 1,
    panX: 0,
    panY: 0,
    gridEnabled: true,
    gridSize: 20,
    rulerEnabled: false,
    snapToGrid: true,
    showMeasurements: true,
    backgroundColor: '#fafaf9',
  })
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [isGenerating, setIsGenerating] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generatePrompt, setGeneratePrompt] = useState('')
  const [showAssetLibrary, setShowAssetLibrary] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [generatingVariations, setGeneratingVariations] = useState(false)
  const [variationCount, setVariationCount] = useState(3)
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  
  // Calculate selectedItem - must be defined before useEffects
  const selectedItem = items.find((item) => item.id === selectedItemId)
  
  // Auto-open sidebar when item is selected
  useEffect(() => {
    if (selectedItem) {
      setSidebarOpen(true)
    }
  }, [selectedItem])

  // Load canvas data
  useEffect(() => {
    if (projectId && userId) {
      loadCanvas()
    }
  }, [projectId, userId])

  // Update dimensions on resize - fixed size, always full screen
  useEffect(() => {
    const updateDimensions = () => {
      // Always use full viewport size, not container size
      const sidebarWidth = (sidebarOpen && selectedItem) ? 320 : 0
      const toolbarHeight = 120 // Account for bottom toolbar
      setDimensions({
        width: window.innerWidth - sidebarWidth,
        height: window.innerHeight - toolbarHeight,
      })
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [sidebarOpen, selectedItem])
  
  // Update dimensions when sidebar toggles or item selection changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const sidebarWidth = (sidebarOpen && selectedItem) ? 320 : 0
      const toolbarHeight = 120
      setDimensions({
        width: window.innerWidth - sidebarWidth,
        height: window.innerHeight - toolbarHeight,
      })
    }, 300) // Wait for animation
    return () => clearTimeout(timer)
  }, [sidebarOpen, selectedItem])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadCanvas = async () => {
    if (!projectId || !userId) {
      console.warn('Cannot load canvas: missing projectId or userId', { projectId, userId })
      setError('Missing project or user information. Please refresh the page.')
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError('')
    try {
      console.log('Loading canvas for project:', projectId, 'user:', userId)
      const data = await getCanvasData(userId, projectId)
      console.log('Canvas data received:', { itemsCount: data.items?.length || 0, hasState: !!data.state })
      
      setItems(data.items || [])
      
      if (data.state) {
        const restoredState = {
          zoom: data.state.zoom_level || 1,
          panX: data.state.pan_x || 0,
          panY: data.state.pan_y || 0,
          gridEnabled: data.state.grid_enabled !== false,
          gridSize: data.state.grid_size || 20,
          rulerEnabled: data.state.ruler_enabled || false,
          snapToGrid: data.state.snap_to_grid !== false,
          showMeasurements: data.state.show_measurements !== false,
          backgroundColor: data.state.background_color || '#fafaf9',
        }
        setCanvasState(restoredState)

        // Restore stage position after a brief delay to ensure stage is ready
        setTimeout(() => {
          if (stageRef.current) {
            stageRef.current.position({ x: restoredState.panX, y: restoredState.panY })
            stageRef.current.scale({ x: restoredState.zoom, y: restoredState.zoom })
          }
        }, 100)
      }
      console.log('Canvas loaded successfully')
    } catch (error) {
      console.error('Error loading canvas:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        projectId,
        userId,
      })
      
      // For new projects or if API fails, allow canvas to load with empty state
      console.warn('Canvas API error, loading with empty state. This is normal for new projects.')
      setItems([])
      
      // Only show error if it's a critical issue
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        setError('Authentication failed. Please refresh the page and sign in again.')
      } else if (error.message?.includes('Network') || error.message?.includes('fetch')) {
        setError('Network error. Please check your connection and try again.')
      } else if (error.message?.includes('does not exist') || error.message?.includes('42P01')) {
        setError('Canvas database tables not found. Please run database-canvas-migration-safe.sql in Supabase.')
      } else {
        console.log('Non-critical error, continuing with empty canvas state')
      }
    } finally {
      setLoading(false)
    }
  }

  const saveCanvasStateToServer = useCallback(async () => {
    if (!projectId || !userId) return

    try {
      const stage = stageRef.current
      if (!stage) return

      const position = stage.position()
      const scale = stage.scaleX()

      await saveCanvasState(userId, projectId, {
        zoom_level: scale,
        pan_x: position.x,
        pan_y: position.y,
        grid_enabled: canvasState.gridEnabled,
        grid_size: canvasState.gridSize,
        ruler_enabled: canvasState.rulerEnabled,
        snap_to_grid: canvasState.snapToGrid,
        show_measurements: canvasState.showMeasurements,
        background_color: canvasState.backgroundColor,
      })
    } catch (error) {
      console.error('Error saving canvas state:', error)
    }
  }, [projectId, userId, canvasState])

  // Debounced save
  useEffect(() => {
    const timer = setTimeout(() => {
      saveCanvasStateToServer()
    }, 1000)
    return () => clearTimeout(timer)
  }, [canvasState, saveCanvasStateToServer])

  const handleItemUpdate = useCallback(async (itemId, updates) => {
    try {
      const updatedItem = await updateCanvasItem(userId, itemId, updates)
      setItems((prev) => prev.map((item) => (item.id === itemId ? updatedItem : item)))
    } catch (error) {
      console.error('Error updating item:', error)
      setError('Failed to update item. Please try again.')
    }
  }, [userId])

  const handleItemDelete = useCallback(async (itemId) => {
    try {
      await deleteCanvasItem(userId, itemId)
      setItems((prev) => prev.filter((item) => item.id !== itemId))
      if (selectedItemId === itemId) {
        setSelectedItemId(null)
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      setError('Failed to delete item. Please try again.')
    }
  }, [userId, selectedItemId])

  const handleStageDragEnd = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return

    const position = stage.position()
    const scale = stage.scaleX()
    
    setCanvasState((prev) => ({
      ...prev,
      panX: position.x,
      panY: position.y,
      zoom: scale,
    }))
    saveCanvasStateToServer()
  }, [saveCanvasStateToServer])

  const handleStageDrag = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return

    const position = stage.position()
    const scale = stage.scaleX()
    
    // Update state in real-time during drag for grid to update
    setCanvasState((prev) => ({
      ...prev,
      panX: position.x,
      panY: position.y,
      zoom: scale,
    }))
  }, [])

  const handleWheel = useCallback((e) => {
    e.evt.preventDefault()

    const stage = stageRef.current
    if (!stage) return

    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    // Use device-native scroll sensitivity
    // deltaY is typically -100 to 100 for mouse wheels, but can be much larger for trackpads
    // Normalize to a reasonable zoom factor based on actual scroll amount
    const deltaY = e.evt.deltaY
    const absDelta = Math.abs(deltaY)
    
    // Calculate zoom factor based on scroll amount
    // For small deltas (mouse wheel), use smaller steps
    // For large deltas (trackpad), use proportionally larger steps
    // This makes zoom feel natural on both input devices
    const baseZoomFactor = 1.001 // Very small base increment
    const sensitivity = Math.min(absDelta / 10, 50) // Cap sensitivity to prevent extreme zoom
    const zoomFactor = 1 + (baseZoomFactor * sensitivity)
    
    // Apply zoom in the correct direction
    const proposedScale = deltaY > 0 
      ? oldScale / zoomFactor  // Zoom out
      : oldScale * zoomFactor  // Zoom in
    
    const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, proposedScale))

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    }

    stage.scale({ x: clampedScale, y: clampedScale })
    stage.position(newPos)

    setCanvasState((prev) => ({
      ...prev,
      zoom: clampedScale,
      panX: newPos.x,
      panY: newPos.y,
    }))
  }, [])

  const generateToCanvas = async (prompt) => {
    if (!prompt.trim()) return
    
    if (!userId || !projectId) {
      setError('Missing user or project information. Please refresh the page.')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/nano-banana/visualize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: prompt,
          useAIDesigner: false,
        }),
      })

      if (!response.ok) throw new Error('Generation failed')

      const data = await response.json()
      if (data.imageUrl) {
        // Upload to cloud if needed
        let imageUrl = data.imageUrl
        if (imageUrl.startsWith('data:')) {
          const imgResponse = await fetch(imageUrl)
          const blob = await imgResponse.blob()
          const file = new File([blob], `canvas-${Date.now()}.png`, { type: 'image/png' })
          
          const uploadResult = await uploadFileToCloud(file, userId)
          imageUrl = uploadResult.url
        }

        // Add to canvas - use safe defaults if dimensions not ready
        const stage = stageRef.current
        const width = dimensions?.width || window.innerWidth
        const height = dimensions?.height || window.innerHeight
        const centerX = stage && width > 0 ? (width / 2 - stage.x()) / stage.scaleX() : 0
        const centerY = stage && height > 0 ? (height / 2 - stage.y()) / stage.scaleY() : 0

        const newItem = await createCanvasItem(userId, projectId, {
          image_url: imageUrl,
          x_position: centerX - 200,
          y_position: centerY - 200,
          width: 400,
          height: 400,
          name: `Generated: ${prompt.substring(0, 30)}`,
          prompt: prompt,
        })

        setItems((prev) => [...prev, newItem])
        setShowGenerateModal(false)
        setGeneratePrompt('')
        setChatInput('')
      }
    } catch (error) {
      console.error('Error generating to canvas:', error)
      setError(error.message || 'Failed to generate image. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const regenerateSelected = async (newPrompt) => {
    const selectedItem = items.find((item) => item.id === selectedItemId)
    if (!selectedItem) return

    setIsGenerating(true)
    try {
      const prompt = newPrompt || `${selectedItem.prompt || 'interior design'} ${newPrompt || 'with modifications'}`
      
      const response = await fetch('/api/nano-banana/visualize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: prompt,
          useAIDesigner: false,
        }),
      })

      if (!response.ok) throw new Error('Generation failed')

      const data = await response.json()
      if (data.imageUrl) {
        // Upload to cloud if needed
        let imageUrl = data.imageUrl
        if (imageUrl.startsWith('data:')) {
          const imgResponse = await fetch(imageUrl)
          const blob = await imgResponse.blob()
          const file = new File([blob], `regenerated-${Date.now()}.png`, { type: 'image/png' })
          
          const uploadResult = await uploadFileToCloud(file, userId)
          imageUrl = uploadResult.url
        }

        // Update the selected item
        await handleItemUpdate(selectedItemId, {
          image_url: imageUrl,
          prompt: prompt,
        })
      }
    } catch (error) {
      console.error('Error regenerating:', error)
      setError(error.message || 'Failed to regenerate image. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const generateBatchVariations = async (prompt, count) => {
    if (!prompt.trim() || !userId || !projectId) return

    setGeneratingVariations(true)
    setShowGenerateModal(false)
    
    try {
      const stage = stageRef.current
      const width = dimensions?.width || window.innerWidth
      const height = dimensions?.height || window.innerHeight
      const centerX = stage && width > 0 ? (width / 2 - stage.x()) / stage.scaleX() : 0
      const centerY = stage && height > 0 ? (height / 2 - stage.y()) / stage.scaleY() : 0

      const newItems = []
      
      for (let i = 0; i < count; i++) {
        const variationPrompt = `${prompt} (variation ${i + 1}, different style and composition)`
        
        const response = await fetch('/api/nano-banana/visualize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description: variationPrompt,
            useAIDesigner: false,
          }),
        })

        if (!response.ok) continue

        const data = await response.json()
        if (data.imageUrl) {
          let imageUrl = data.imageUrl
          if (imageUrl.startsWith('data:')) {
            const imgResponse = await fetch(imageUrl)
            const blob = await imgResponse.blob()
            const file = new File([blob], `canvas-variation-${i + 1}-${Date.now()}.png`, { type: 'image/png' })
            
            const uploadResult = await uploadFileToCloud(file, userId)
            imageUrl = uploadResult.url
          }

          // Add to canvas with spacing
          const spacing = 450
          const x = centerX - 200 + (i % 2) * spacing
          const y = centerY - 200 + Math.floor(i / 2) * spacing

          const newItem = await createCanvasItem(userId, projectId, {
            image_url: imageUrl,
            x_position: x,
            y_position: y,
            width: 400,
            height: 400,
            name: `Variation ${i + 1}: ${prompt.substring(0, 30)}`,
            prompt: variationPrompt,
          })
          
          newItems.push(newItem)
        }
      }

      if (newItems.length > 0) {
        setItems((prev) => [...prev, ...newItems])
        setGeneratePrompt('')
        setChatInput('')
      }
    } catch (error) {
      console.error('Error generating batch variations:', error)
      setError(error.message || 'Failed to generate some variations. Please try again.')
    } finally {
      setGeneratingVariations(false)
    }
  }

  const handleChatSubmit = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || !userId || !projectId) return
    
    const prompt = chatInput.trim()
    setChatInput('')
    await generateToCanvas(prompt)
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ backgroundColor: canvasState.backgroundColor }}>
      {/* Collapsible Left Sidebar - Only show when item is selected */}
      {selectedItem && (
        <div className={`fixed left-0 top-0 h-full bg-white border-r border-stone-200 z-30 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`} style={{ width: '320px' }}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-stone-900 mb-1">Selected Item</h3>
                <p className="text-sm text-stone-600 truncate">{selectedItem.name || 'Untitled'}</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m18 6-12 12" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Art Director Mode */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 tracking-wider uppercase mb-2">
                  Art Director
                </label>
                <textarea
                  value={generatePrompt}
                  onChange={(e) => setGeneratePrompt(e.target.value)}
                  placeholder="Describe changes to regenerate..."
                  className="w-full p-3 bg-stone-50 rounded-lg border border-stone-100 text-xs text-stone-600 resize-none focus:outline-none focus:ring-2 focus:ring-stone-200 min-h-[60px]"
                />
                <button
                  onClick={() => regenerateSelected(generatePrompt)}
                  disabled={isGenerating}
                  className="w-full mt-2 px-4 py-2.5 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50"
                >
                  {isGenerating ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>

              {/* Transform Controls */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 tracking-wider uppercase mb-2">
                  Transform
                </label>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-stone-600 mb-1 block">Opacity</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={selectedItem.opacity || 1}
                      onChange={(e) => handleItemUpdate(selectedItemId, { opacity: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-600 mb-1 block">Rotation</label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      value={selectedItem.rotation || 0}
                      onChange={(e) => handleItemUpdate(selectedItemId, { rotation: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 tracking-wider uppercase mb-2">
                  Actions
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleItemUpdate(selectedItemId, { is_locked: !selectedItem.is_locked })}
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium transition-colors"
                  >
                    {selectedItem.is_locked ? 'Unlock' : 'Lock'}
                  </button>
                  <button
                    onClick={() => handleItemDelete(selectedItemId)}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Toggle Button (when closed and item selected) */}
      {!sidebarOpen && selectedItem && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-white border border-stone-200 rounded-lg shadow-lg hover:bg-stone-50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      )}

      {/* Main Canvas Area - Full Screen */}
      <div 
        className="flex-1 flex flex-col w-full h-full" 
        style={{ 
          marginLeft: (sidebarOpen && selectedItem) ? '320px' : '0', 
          transition: 'margin-left 300ms',
          width: (sidebarOpen && selectedItem) ? 'calc(100% - 320px)' : '100%'
        }}
      >
        {/* Error Message */}
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={() => setError('')}
              className="text-red-400 hover:text-red-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Canvas Area - Full Screen */}
        <div 
          ref={containerRef} 
          className="flex-1 relative w-full h-full overflow-hidden" 
          style={{ backgroundColor: canvasState.backgroundColor }}
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-stone-500">Loading canvas...</p>
              </div>
            </div>
          ) : dimensions.width > 0 && dimensions.height > 0 && (
            <Stage
              ref={stageRef}
              width={dimensions.width}
              height={dimensions.height}
              draggable
              onDrag={handleStageDrag}
              onDragEnd={handleStageDragEnd}
              onWheel={handleWheel}
              onClick={(e) => {
                if (e.target === e.target.getStage()) {
                  setSelectedItemId(null)
                }
              }}
            >
              {/* Grid Layer - Must be first layer (behind items) */}
              {canvasState.gridEnabled && (
                <Layer>
                  <GridLayer
                    gridSize={canvasState.gridSize}
                    width={dimensions.width}
                    height={dimensions.height}
                    panX={canvasState.panX}
                    panY={canvasState.panY}
                    zoom={canvasState.zoom}
                  />
                </Layer>
              )}

              {/* Canvas Items Layer - Above grid */}
              <Layer>
                {items.map((item) => (
                  <CanvasItem
                    key={item.id}
                    item={item}
                    isSelected={item.id === selectedItemId}
                    onSelect={() => setSelectedItemId(item.id)}
                    onUpdate={handleItemUpdate}
                    onDelete={handleItemDelete}
                    showMeasurements={canvasState.showMeasurements}
                    snapToGrid={canvasState.snapToGrid}
                    gridSize={canvasState.gridSize}
                    zoom={canvasState.zoom}
                  />
                ))}
              </Layer>
            </Stage>
          )}
        </div>

        {/* Bottom Toolbar - Compact Design */}
        <div className="absolute bottom-0 left-0 right-0 z-40 flex flex-col items-center pb-4">
          {/* Toolbar Controls */}
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-stone-200">
            {/* Back Button */}
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                title="Back"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-600">
                  <path d="m12 19-7-7 7-7" />
                  <path d="M19 12H5" />
                </svg>
              </button>
            )}

            {/* Canvas Controls */}
            <div className="flex items-center gap-1 bg-stone-100 rounded-full p-1">
              <button
                onClick={() => setCanvasState((prev) => ({ ...prev, gridEnabled: !prev.gridEnabled }))}
                className={`p-1.5 rounded-full transition-colors ${
                  canvasState.gridEnabled ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:bg-stone-50'
                }`}
                title="Toggle Grid"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>
              <button
                onClick={() => setCanvasState((prev) => ({ ...prev, rulerEnabled: !prev.rulerEnabled }))}
                className={`p-1.5 rounded-full transition-colors ${
                  canvasState.rulerEnabled ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:bg-stone-50'
                }`}
                title="Toggle Ruler"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              </button>
              <button
                onClick={() => setCanvasState((prev) => ({ ...prev, snapToGrid: !prev.snapToGrid }))}
                className={`p-1.5 rounded-full transition-colors ${
                  canvasState.snapToGrid ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:bg-stone-50'
                }`}
                title="Toggle Snap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </button>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-stone-200" />

            {/* Action Buttons */}
            <button
              onClick={() => setShowAssetLibrary(true)}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors"
              title="Asset Library"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-600">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </button>
            
            {items.length > 0 && (
              <button
                onClick={() => setShowExportModal(true)}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                title="Export"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-600">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            )}

            {/* Zoom Display */}
            <div className="px-3 py-1 text-xs text-stone-500 font-medium">
              {Math.round(canvasState.zoom * 100)}%
            </div>
          </div>

          {/* Chat Input Area */}
          <form onSubmit={handleChatSubmit} className="mt-3 w-full max-w-2xl mx-auto">
            <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-full px-4 py-3 shadow-lg border border-stone-200">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="What would you like to create?"
                className="flex-1 bg-transparent border-none outline-none text-sm text-stone-900 placeholder:text-stone-400"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowAssetLibrary(true)}
                  className="p-1.5 hover:bg-stone-100 rounded-full transition-colors"
                  title="Add Asset"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-600">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </button>
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isGenerating || generatingVariations}
                  className="p-2 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Generate"
                >
                  {isGenerating || generatingVariations ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Asset Library Modal */}
      {showAssetLibrary && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAssetLibrary(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-xl font-semibold">Asset Library</h2>
              <button
                onClick={() => setShowAssetLibrary(false)}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-600">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AssetLibrary
                onSelectAsset={async (asset) => {
                  if (!asset || !asset.url) {
                    setError('Invalid asset selected. Please try again.')
                    return
                  }

                  if (!userId || !projectId) {
                    setError('Missing user or project information. Please refresh the page.')
                    return
                  }

                  const stage = stageRef.current
                  const centerX = stage ? (dimensions.width / 2 - stage.x()) / stage.scaleX() : 0
                  const centerY = stage ? (dimensions.height / 2 - stage.y()) / stage.scaleY() : 0

                  try {
                    console.log('Adding asset to canvas:', { assetUrl: asset.url, projectId, userId })
                    const newItem = await createCanvasItem(userId, projectId, {
                      image_url: asset.url,
                      x_position: centerX - 200,
                      y_position: centerY - 200,
                      width: 400,
                      height: 400,
                      name: asset.name || 'Asset',
                      description: asset.description,
                    })
                    console.log('Asset added successfully:', newItem)
                    setItems((prev) => [...prev, newItem])
                    setShowAssetLibrary(false)
                    setError('')
                  } catch (error) {
                    console.error('Error adding asset to canvas:', error)
                    let errorMessage = 'Failed to add asset to canvas. Please try again.'
                    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
                      errorMessage = 'Authentication failed. Please refresh the page and sign in again.'
                    } else if (error.message?.includes('does not exist') || error.message?.includes('42P01')) {
                      errorMessage = 'Canvas database tables not found. Please run database-canvas-migration-safe.sql in Supabase.'
                    } else if (error.message?.includes('Network') || error.message?.includes('fetch')) {
                      errorMessage = 'Network error. Please check your connection and try again.'
                    } else if (error.message) {
                      errorMessage = `Failed to add asset: ${error.message}`
                    }
                    setError(errorMessage)
                  }
                }}
                projectId={projectId}
              />
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          projectId={projectId}
          projectName="Canvas"
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  )
}
