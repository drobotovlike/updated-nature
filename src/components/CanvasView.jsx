import { useState, useEffect, useRef, useCallback } from 'react'
import { Stage, Layer, Image, Group, Rect, Line, Text, Circle } from 'react-konva'
import { useAuth } from '@clerk/clerk-react'
import Konva from 'konva'
import useImage from 'use-image'
import AssetLibrary from './AssetLibrary'
import ExportModal from './ExportModal'
import { getCanvasData, createCanvasItem, updateCanvasItem, deleteCanvasItem, saveCanvasState } from '../utils/canvasManager'
import { uploadFileToCloud } from '../utils/cloudProjectManager'

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
      const adjustedGridSize = gridSize * zoom
      x = Math.round(x / adjustedGridSize) * adjustedGridSize
      y = Math.round(y / adjustedGridSize) * adjustedGridSize
      node.position({ x, y })
    }

    onUpdate(item.id, {
      x_position: x,
      y_position: y,
    })
    setIsDragging(false)
  }, [item.id, onUpdate, snapToGrid, gridSize, zoom])

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
            strokeWidth={2}
            dash={[5, 5]}
            listening={false}
          />
          {/* Measurements */}
          {showMeasurements && (
            <Group listening={false}>
              <Text
                text={`${Math.round(item.width || image.width)}px × ${Math.round(item.height || image.height)}px`}
                fontSize={12}
                fill="#3b82f6"
                x={5}
                y={-20}
                padding={4}
                background="#ffffff"
                cornerRadius={4}
              />
            </Group>
          )}
          {/* Delete button */}
          <Group
            x={(item.width || image.width) - 20}
            y={-20}
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
              width={24}
              height={24}
              fill="#ef4444"
              cornerRadius={12}
              listening={false}
            />
            <Text
              text="×"
              fontSize={16}
              fill="white"
              x={6}
              y={2}
              listening={false}
            />
          </Group>
        </>
      )}
    </Group>
  )
}

// Grid Component
function GridLayer({ gridSize, width, height, offsetX, offsetY, zoom }) {
  const lines = []
  const adjustedGridSize = gridSize * zoom

  // Vertical lines
  const startX = Math.floor(offsetX / adjustedGridSize) * adjustedGridSize
  for (let x = startX; x < width + offsetX; x += adjustedGridSize) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x - offsetX, 0, x - offsetX, height]}
        stroke="#e5e7eb"
        strokeWidth={0.5}
        listening={false}
      />
    )
  }

  // Horizontal lines
  const startY = Math.floor(offsetY / adjustedGridSize) * adjustedGridSize
  for (let y = startY; y < height + offsetY; y += adjustedGridSize) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[0, y - offsetY, width, y - offsetY]}
        stroke="#e5e7eb"
        strokeWidth={0.5}
        listening={false}
      />
    )
  }

  return <Group>{lines}</Group>
}

// Ruler Component
function Ruler({ position, length, isVertical, zoom, offset }) {
  const marks = []
  const markInterval = 50 * zoom
  const numMarks = Math.floor(length / markInterval)

  for (let i = 0; i <= numMarks; i++) {
    const value = i * 50
    const pos = i * markInterval

    if (isVertical) {
      marks.push(
        <Group key={i}>
          <Line
            points={[0, pos, 10, pos]}
            stroke="#78716c"
            strokeWidth={1}
            listening={false}
          />
          <Text
            text={value.toString()}
            fontSize={10}
            fill="#78716c"
            x={12}
            y={pos - 6}
            listening={false}
          />
        </Group>
      )
    } else {
      marks.push(
        <Group key={i}>
          <Line
            points={[pos, 0, pos, 10]}
            stroke="#78716c"
            strokeWidth={1}
            listening={false}
          />
          <Text
            text={value.toString()}
            fontSize={10}
            fill="#78716c"
            x={pos - 10}
            y={12}
            listening={false}
          />
        </Group>
      )
    }
  }

  return (
    <Group x={position.x} y={position.y}>
      <Rect
        width={isVertical ? 30 : length}
        height={isVertical ? length : 30}
        fill="#fafaf9"
        stroke="#d6d3d1"
        strokeWidth={1}
        listening={false}
      />
      {marks}
    </Group>
  )
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

  // Load canvas data
  useEffect(() => {
    if (projectId && userId) {
      loadCanvas()
    }
  }, [projectId, userId])

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

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
      // This is better UX than blocking the user
      console.warn('Canvas API error, loading with empty state. This is normal for new projects.')
      setItems([])
      
      // Only show error if it's a critical issue (auth, network)
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        setError('Authentication failed. Please refresh the page and sign in again.')
      } else if (error.message?.includes('Network') || error.message?.includes('fetch')) {
        setError('Network error. Please check your connection and try again.')
      } else {
        // For other errors (like 404 or database issues), silently continue
        // The canvas will work fine with an empty state
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
      // Don't show error to user for background saves
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
    setCanvasState((prev) => ({
      ...prev,
      panX: position.x,
      panY: position.y,
    }))
    saveCanvasStateToServer()
  }, [saveCanvasStateToServer])

  const handleWheel = useCallback((e) => {
    e.evt.preventDefault()

    const stage = stageRef.current
    if (!stage) return

    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()

    const scaleBy = 1.1
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
    const clampedScale = Math.max(0.1, Math.min(5, newScale))

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

        // Add to canvas
        const stage = stageRef.current
        const centerX = stage ? (dimensions.width / 2 - stage.x()) / stage.scaleX() : 0
        const centerY = stage ? (dimensions.height / 2 - stage.y()) / stage.scaleY() : 0

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
    if (!prompt.trim()) return

    setGeneratingVariations(true)
    setShowGenerateModal(false)
    
    try {
      const stage = stageRef.current
      const centerX = stage ? (dimensions.width / 2 - stage.x()) / stage.scaleX() : 0
      const centerY = stage ? (dimensions.height / 2 - stage.y()) / stage.scaleY() : 0

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
      }
    } catch (error) {
      console.error('Error generating batch variations:', error)
      setError(error.message || 'Failed to generate some variations. Please try again.')
    } finally {
      setGeneratingVariations(false)
    }
  }

  const selectedItem = items.find((item) => item.id === selectedItemId)

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-stone-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
              Back
            </button>
          )}
          <h1 className="text-xl font-semibold text-stone-900 font-serif-ature">Canvas</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Canvas Controls */}
          <div className="flex items-center gap-2 bg-stone-100 rounded-lg p-1">
            <button
              onClick={() => setCanvasState((prev) => ({ ...prev, gridEnabled: !prev.gridEnabled }))}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                canvasState.gridEnabled ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setCanvasState((prev) => ({ ...prev, rulerEnabled: !prev.rulerEnabled }))}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                canvasState.rulerEnabled ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
              }`}
            >
              Ruler
            </button>
            <button
              onClick={() => setCanvasState((prev) => ({ ...prev, snapToGrid: !prev.snapToGrid }))}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                canvasState.snapToGrid ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
              }`}
            >
              Snap
            </button>
          </div>

          <button
            onClick={() => setShowAssetLibrary(true)}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            Assets
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Generate
          </button>
          {items.length > 0 && (
            <button
              onClick={() => setShowExportModal(true)}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
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

      {/* Canvas Area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ backgroundColor: canvasState.backgroundColor }}>
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
            onDragEnd={handleStageDragEnd}
            onWheel={handleWheel}
            onClick={(e) => {
              if (e.target === e.target.getStage()) {
                setSelectedItemId(null)
              }
            }}
          >
            {/* Grid Layer */}
            {canvasState.gridEnabled && (
              <Layer>
                <GridLayer
                  gridSize={canvasState.gridSize}
                  width={dimensions.width}
                  height={dimensions.height}
                  offsetX={-canvasState.panX}
                  offsetY={-canvasState.panY}
                  zoom={canvasState.zoom}
                />
              </Layer>
            )}

            {/* Rulers */}
            {canvasState.rulerEnabled && (
              <Layer>
                <Ruler
                  position={{ x: 0, y: 0 }}
                  length={dimensions.width}
                  isVertical={false}
                  zoom={canvasState.zoom}
                  offset={canvasState.panX}
                />
                <Ruler
                  position={{ x: 0, y: 0 }}
                  length={dimensions.height}
                  isVertical={true}
                  zoom={canvasState.zoom}
                  offset={canvasState.panY}
                />
              </Layer>
            )}

            {/* Canvas Items Layer */}
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

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-white rounded-lg shadow-lg border border-stone-200 p-2">
          <button
            onClick={() => {
              const stage = stageRef.current
              if (stage) {
                const newScale = Math.min(5, stage.scaleX() * 1.2)
                stage.scale({ x: newScale, y: newScale })
                setCanvasState((prev) => ({ ...prev, zoom: newScale }))
              }
            }}
            className="px-3 py-2 hover:bg-stone-100 rounded text-sm font-medium text-stone-700"
          >
            +
          </button>
          <div className="px-3 py-1 text-xs text-stone-500 text-center border-t border-b border-stone-200">
            {Math.round(canvasState.zoom * 100)}%
          </div>
          <button
            onClick={() => {
              const stage = stageRef.current
              if (stage) {
                const newScale = Math.max(0.1, stage.scaleX() / 1.2)
                stage.scale({ x: newScale, y: newScale })
                setCanvasState((prev) => ({ ...prev, zoom: newScale }))
              }
            }}
            className="px-3 py-2 hover:bg-stone-100 rounded text-sm font-medium text-stone-700"
          >
            −
          </button>
          <button
            onClick={() => {
              const stage = stageRef.current
              if (stage) {
                stage.scale({ x: 1, y: 1 })
                stage.position({ x: 0, y: 0 })
                setCanvasState((prev) => ({ ...prev, zoom: 1, panX: 0, panY: 0 }))
              }
            }}
            className="px-3 py-2 hover:bg-stone-100 rounded text-sm font-medium text-stone-700 border-t border-stone-200"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Sidebar - Selected Item Controls */}
      {selectedItem && (
        <div className="w-80 border-l border-stone-200 bg-white flex flex-col">
          <div className="p-4 border-b border-stone-200">
            <h3 className="font-semibold text-stone-900 mb-2">Selected Item</h3>
            <p className="text-sm text-stone-600">{selectedItem.name || 'Untitled'}</p>
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
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowGenerateModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-stone-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-stone-900 font-serif-ature">Generate to Canvas</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-600">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <textarea
              value={generatePrompt}
              onChange={(e) => setGeneratePrompt(e.target.value)}
              placeholder="Describe the interior design you want to create..."
              className="w-full p-3 bg-stone-50 rounded-lg border border-stone-100 text-sm text-stone-600 resize-none focus:outline-none focus:ring-2 focus:ring-stone-200 min-h-[100px] mb-4"
            />
            <div className="flex items-center gap-2 mb-4">
              <label className="text-xs text-stone-600">Variations:</label>
              <select
                value={variationCount}
                onChange={(e) => setVariationCount(parseInt(e.target.value))}
                className="px-2 py-1 border border-stone-200 rounded-lg bg-white text-xs text-stone-700 focus:outline-none"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg hover:bg-stone-50 text-stone-700 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (variationCount === 1) {
                    generateToCanvas(generatePrompt)
                  } else {
                    generateBatchVariations(generatePrompt, variationCount)
                  }
                }}
                disabled={isGenerating || generatingVariations || !generatePrompt.trim()}
                className="flex-1 px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                {isGenerating || generatingVariations ? `Generating ${variationCount}...` : variationCount > 1 ? `Generate ${variationCount} Variations` : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  // Add asset to canvas
                  const stage = stageRef.current
                  const centerX = stage ? (dimensions.width / 2 - stage.x()) / stage.scaleX() : 0
                  const centerY = stage ? (dimensions.height / 2 - stage.y()) / stage.scaleY() : 0

                  try {
                    const newItem = await createCanvasItem(userId, projectId, {
                      image_url: asset.url,
                      x_position: centerX - 200,
                      y_position: centerY - 200,
                      width: 400,
                      height: 400,
                      name: asset.name,
                      description: asset.description,
                    })
                    setItems((prev) => [...prev, newItem])
                    setShowAssetLibrary(false)
                  } catch (error) {
                    console.error('Error adding asset to canvas:', error)
                    setError('Failed to add asset to canvas. Please try again.')
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

