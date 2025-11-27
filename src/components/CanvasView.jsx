import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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

// Dynamic Grid Component - Fixed to viewport borders (screen space, not world space)
function GridLayer({ gridSize, width, height, panX, panY, zoom }) {
  const lines = useMemo(() => {
    const gridLines = []
    
    // Grid is rendered in SCREEN SPACE (viewport coordinates), not world space
    // This ensures it always stays fixed to the viewport borders
    
    // Calculate grid spacing in screen pixels
    // As you zoom in, grid gets denser (more lines visible)
    // As you zoom out, grid gets sparser (fewer lines visible)
    const screenGridSize = gridSize * zoom
    
    // Ensure minimum grid size for visibility (at least 10px spacing)
    const effectiveGridSize = Math.max(10, screenGridSize)
    
    // Calculate grid offset based on pan position
    // This makes the grid appear to move as you pan, but it's actually just offset
    // The modulo operation creates a repeating pattern that shifts with pan
    const offsetX = panX % effectiveGridSize
    const offsetY = panY % effectiveGridSize
    
    // Ensure offset is positive for proper rendering
    const normalizedOffsetX = offsetX < 0 ? offsetX + effectiveGridSize : offsetX
    const normalizedOffsetY = offsetY < 0 ? offsetY + effectiveGridSize : offsetY
    
    // Draw vertical lines - always from top to bottom of viewport (0 to height)
    for (let x = normalizedOffsetX - effectiveGridSize; x <= width + effectiveGridSize; x += effectiveGridSize) {
      gridLines.push(
        <Line
          key={`v-${x}`}
          points={[x, 0, x, height]}
          stroke="#e5e7eb"
          strokeWidth={1}
          listening={false}
          perfect={false}
        />
      )
    }

    // Draw horizontal lines - always from left to right of viewport (0 to width)
    for (let y = normalizedOffsetY - effectiveGridSize; y <= height + effectiveGridSize; y += effectiveGridSize) {
      gridLines.push(
        <Line
          key={`h-${y}`}
          points={[0, y, width, y]}
          stroke="#e5e7eb"
          strokeWidth={1}
          listening={false}
          perfect={false}
        />
      )
    }

    return gridLines
  }, [gridSize, width, height, panX, panY, zoom])

  return <Group>{lines}</Group>
}

// Canvas Item Component
function CanvasItem({ item, isSelected, isMultiSelected, onSelect, onUpdate, onDelete, showMeasurements, zoom }) {
  const [image] = useImage(item.image_url)
  const [isDragging, setIsDragging] = useState(false)
  const shapeRef = useRef(null)

  const handleDragEnd = useCallback((e) => {
    const node = e.target
    const x = node.x()
    const y = node.y()

    onUpdate(item.id, {
      x_position: x,
      y_position: y,
    })
    setIsDragging(false)
  }, [item.id, onUpdate])

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

  // Apply color adjustments using Konva filters
  const adjustments = item.adjustments || {}
  const brightness = (adjustments.brightness || 1) - 1 // Konva expects -1 to 1
  const contrast = (adjustments.contrast || 1) - 1 // Konva expects -1 to 1
  const saturation = (adjustments.saturation || 1) - 1 // Konva expects -1 to 1

  // Create filter array
  const filters = []
  if (brightness !== 0) filters.push(Konva.Filters.Brighten)
  if (contrast !== 0) filters.push(Konva.Filters.Contrast)
  if (saturation !== 0) filters.push(Konva.Filters.HSL)

  return (
    <Group
      ref={shapeRef}
      x={item.x_position}
      y={item.y_position}
      draggable={!item.is_locked}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        if (e.evt.shiftKey) {
          // Multi-select
          onSelect(e, true)
        } else {
          onSelect(e, false)
        }
      }}
      onTap={(e) => {
        if (e.evt.shiftKey) {
          onSelect(e, true)
        } else {
          onSelect(e, false)
        }
      }}
      opacity={item.opacity || 1}
    >
      <Image
        image={image}
        width={item.width || image.width}
        height={item.height || image.height}
        rotation={item.rotation || 0}
        filters={filters.length > 0 ? filters : undefined}
        brightness={brightness}
        contrast={contrast}
        saturation={saturation}
        cache
      />
      {(isSelected || isMultiSelected) && (
        <>
          {/* Selection border */}
          <Rect
            x={-5}
            y={-5}
            width={(item.width || image.width) + 10}
            height={(item.height || image.height) + 10}
            stroke={isMultiSelected ? "#10b981" : "#3b82f6"}
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


export default function CanvasView({ projectId, onBack, onSave }) {
  const { userId } = useAuth()
  const stageRef = useRef(null)
  const containerRef = useRef(null)

  // Canvas state
  const [items, setItems] = useState([])
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [selectedItemIds, setSelectedItemIds] = useState(new Set()) // Multi-select
  const [clipboard, setClipboard] = useState(null) // For copy/paste
  const [history, setHistory] = useState([]) // For undo
  const [historyIndex, setHistoryIndex] = useState(-1) // Current history position
  const [canvasState, setCanvasState] = useState({
    zoom: 1,
    panX: 0,
    panY: 0,
    rulerEnabled: false,
    showMeasurements: true,
    backgroundColor: '#fafaf9',
    gridEnabled: true,
    gridSize: 20,
  })
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [isGenerating, setIsGenerating] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generatePrompt, setGeneratePrompt] = useState('')
  const [showAssetLibrary, setShowAssetLibrary] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [generatingVariations, setGeneratingVariations] = useState(false)
  const [variationCount, setVariationCount] = useState(3)
  
  // Enhanced Generation State
  const [selectedModel, setSelectedModel] = useState('gemini')
  const [selectedStyle, setSelectedStyle] = useState(null)
  const [referenceImage, setReferenceImage] = useState(null)
  const [styles, setStyles] = useState([])
  const [showStyleLibrary, setShowStyleLibrary] = useState(false)
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  
  // Calculate selectedItem - must be defined before useEffects
  const selectedItem = items.find((item) => item.id === selectedItemId)
  const selectedItems = items.filter((item) => selectedItemIds.has(item.id) || item.id === selectedItemId)
  
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

  // Load styles on mount
  useEffect(() => {
    if (!userId) return
    
    const loadStyles = async () => {
      try {
        const response = await fetch('/api/styles', {
          headers: {
            'Authorization': `Bearer ${userId}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          setStyles(data || [])
        }
      } catch (error) {
        console.error('Error loading styles:', error)
      }
    }
    
    loadStyles()
  }, [userId])

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
          rulerEnabled: data.state.ruler_enabled || false,
          showMeasurements: data.state.show_measurements !== false,
          backgroundColor: data.state.background_color || '#fafaf9',
          gridEnabled: data.state.grid_enabled !== false,
          gridSize: data.state.grid_size || 20,
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
        ruler_enabled: canvasState.rulerEnabled,
        show_measurements: canvasState.showMeasurements,
        background_color: canvasState.backgroundColor,
        grid_enabled: canvasState.gridEnabled,
        grid_size: canvasState.gridSize,
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
      // Apply style if selected
      let finalPrompt = prompt
      if (selectedStyle) {
        finalPrompt = `${prompt}, ${selectedStyle.prompt_suffix}`
      }

      // Convert reference image to base64 if it's a URL
      let refImage = referenceImage
      if (refImage && !refImage.startsWith('data:')) {
        try {
          const imgResponse = await fetch(refImage)
          const blob = await imgResponse.blob()
          const reader = new FileReader()
          refImage = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result)
            reader.readAsDataURL(blob)
          })
        } catch (e) {
          console.warn('Failed to convert reference image to base64:', e)
        }
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          model: selectedModel,
          style_id: selectedStyle?.id,
          reference_image: refImage,
          reference_strength: 0.7,
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
          prompt: finalPrompt,
          description: `Model: ${selectedModel}${selectedStyle ? `, Style: ${selectedStyle.name}` : ''}`,
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
      let prompt = newPrompt || `${selectedItem.prompt || 'interior design'} ${newPrompt || 'with modifications'}`
      
      // Apply style if selected
      if (selectedStyle) {
        prompt = `${prompt}, ${selectedStyle.prompt_suffix}`
      }

      // Use selected item as reference if no reference image set
      let refImage = referenceImage || selectedItem.image_url
      if (refImage && !refImage.startsWith('data:')) {
        try {
          const imgResponse = await fetch(refImage)
          const blob = await imgResponse.blob()
          const reader = new FileReader()
          refImage = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result)
            reader.readAsDataURL(blob)
          })
        } catch (e) {
          console.warn('Failed to convert reference image to base64:', e)
        }
      }
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          model: selectedModel,
          style_id: selectedStyle?.id,
          reference_image: refImage,
          reference_strength: 0.7,
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
          description: `Model: ${selectedModel}${selectedStyle ? `, Style: ${selectedStyle.name}` : ''}`,
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
      
      // Apply style if selected
      let basePrompt = prompt
      if (selectedStyle) {
        basePrompt = `${prompt}, ${selectedStyle.prompt_suffix}`
      }

      for (let i = 0; i < count; i++) {
        const variationPrompt = `${basePrompt} (variation ${i + 1}, different style and composition)`
        
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: variationPrompt,
            model: selectedModel,
            style_id: selectedStyle?.id,
            reference_image: referenceImage,
            reference_strength: 0.7,
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

  // Alignment function
  const alignItems = useCallback((alignment) => {
    if (selectedItemIds.size === 0 && !selectedItemId) return

    const itemsToAlign = selectedItemIds.size > 0
      ? items.filter(item => selectedItemIds.has(item.id))
      : [items.find(item => item.id === selectedItemId)]

    if (itemsToAlign.length === 0) return

    const bounds = itemsToAlign.reduce((acc, item) => {
      const left = item.x_position
      const right = item.x_position + (item.width || 200)
      const top = item.y_position
      const bottom = item.y_position + (item.height || 200)
      
      if (acc.minLeft === null || left < acc.minLeft) acc.minLeft = left
      if (acc.maxRight === null || right > acc.maxRight) acc.maxRight = right
      if (acc.minTop === null || top < acc.minTop) acc.minTop = top
      if (acc.maxBottom === null || bottom > acc.maxBottom) acc.maxBottom = bottom
      
      return acc
    }, { minLeft: null, maxRight: null, minTop: null, maxBottom: null })

    const centerX = (bounds.minLeft + bounds.maxRight) / 2
    const centerY = (bounds.minTop + bounds.maxBottom) / 2

    itemsToAlign.forEach((item) => {
      let newX = item.x_position
      let newY = item.y_position

      switch (alignment) {
        case 'left':
          newX = bounds.minLeft
          break
        case 'center':
          newX = centerX - (item.width || 200) / 2
          break
        case 'right':
          newX = bounds.maxRight - (item.width || 200)
          break
        case 'top':
          newY = bounds.minTop
          break
        case 'middle':
          newY = centerY - (item.height || 200) / 2
          break
        case 'bottom':
          newY = bounds.maxBottom - (item.height || 200)
          break
      }

      handleItemUpdate(item.id, {
        x_position: newX,
        y_position: newY,
      })
    })
  }, [selectedItemIds, selectedItemId, items, handleItemUpdate])

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

              {/* Image Editing Tools */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 tracking-wider uppercase mb-2">
                  Edit Image
                </label>
                <div className="space-y-2">
                  <button
                    onClick={async () => {
                      if (!selectedItem) return
                      setIsGenerating(true)
                      try {
                        const response = await fetch('/api/image-editing', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            operation: 'upscale',
                            image_url: selectedItem.image_url,
                            scale: 2,
                          }),
                        })
                        const data = await response.json()
                        if (data.image_url) {
                          // Get original dimensions
                          const img = new Image()
                          img.onload = async () => {
                            await handleItemUpdate(selectedItemId, {
                              image_url: data.image_url,
                              width: img.width * 2,
                              height: img.height * 2,
                            })
                          }
                          img.src = selectedItem.image_url
                        }
                      } catch (error) {
                        console.error('Error upscaling:', error)
                        setError('Failed to upscale image. Please try again.')
                      } finally {
                        setIsGenerating(false)
                      }
                    }}
                    disabled={isGenerating}
                    className="w-full px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? 'Upscaling...' : 'Upscale 2x'}
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Open retouch tool with mask selection
                      setError('Retouch tool coming soon!')
                    }}
                    className="w-full px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium transition-colors"
                  >
                    Retouch (Coming Soon)
                  </button>
                </div>
              </div>

              {/* Color Adjustments */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 tracking-wider uppercase mb-2">
                  Adjustments
                </label>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-stone-600 mb-1 block">Brightness</label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={selectedItem.adjustments?.brightness || 1}
                      onChange={(e) => {
                        const adjustments = { ...(selectedItem.adjustments || {}), brightness: parseFloat(e.target.value) }
                        handleItemUpdate(selectedItemId, { adjustments })
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-600 mb-1 block">Contrast</label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={selectedItem.adjustments?.contrast || 1}
                      onChange={(e) => {
                        const adjustments = { ...(selectedItem.adjustments || {}), contrast: parseFloat(e.target.value) }
                        handleItemUpdate(selectedItemId, { adjustments })
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-600 mb-1 block">Saturation</label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={selectedItem.adjustments?.saturation || 1}
                      onChange={(e) => {
                        const adjustments = { ...(selectedItem.adjustments || {}), saturation: parseFloat(e.target.value) }
                        handleItemUpdate(selectedItemId, { adjustments })
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Alignment Tools */}
              {(selectedItemIds.size > 0 || selectedItemId) && (
                <div>
                  <label className="block text-xs font-semibold text-stone-400 tracking-wider uppercase mb-2">
                    Align {selectedItemIds.size > 0 ? `${selectedItemIds.size + (selectedItemId ? 1 : 0)} Items` : ''}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => alignItems('left')}
                      className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-xs font-medium transition-colors"
                      title="Align Left"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => alignItems('center')}
                      className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-xs font-medium transition-colors"
                      title="Align Center"
                    >
                      ↔
                    </button>
                    <button
                      onClick={() => alignItems('right')}
                      className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-xs font-medium transition-colors"
                      title="Align Right"
                    >
                      →
                    </button>
                    <button
                      onClick={() => alignItems('top')}
                      className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-xs font-medium transition-colors"
                      title="Align Top"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => alignItems('middle')}
                      className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-xs font-medium transition-colors"
                      title="Align Middle"
                    >
                      ↕
                    </button>
                    <button
                      onClick={() => alignItems('bottom')}
                      className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-xs font-medium transition-colors"
                      title="Align Bottom"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              )}

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
                <Layer
                  key={`grid-${canvasState.panX}-${canvasState.panY}-${canvasState.zoom}-${dimensions.width}-${dimensions.height}`}
                >
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

              {/* Canvas Items Layer - Virtual Rendering */}
              <Layer>
                {(() => {
                  // Virtual rendering: only render items visible in viewport
                  const stage = stageRef.current
                  if (!stage) return items

                  const viewport = {
                    left: -stage.x() / stage.scaleX(),
                    right: (dimensions.width - stage.x()) / stage.scaleX(),
                    top: -stage.y() / stage.scaleY(),
                    bottom: (dimensions.height - stage.y()) / stage.scaleY(),
                  }

                  // Add padding for items partially visible
                  const padding = 200
                  const visibleItems = items.filter((item) => {
                    const itemLeft = item.x_position
                    const itemRight = item.x_position + (item.width || 0)
                    const itemTop = item.y_position
                    const itemBottom = item.y_position + (item.height || 0)

                    return !(
                      itemRight < viewport.left - padding ||
                      itemLeft > viewport.right + padding ||
                      itemBottom < viewport.top - padding ||
                      itemTop > viewport.bottom + padding
                    )
                  })

                  return visibleItems.map((item) => (
                    <CanvasItem
                      key={item.id}
                      item={item}
                      isSelected={item.id === selectedItemId}
                      isMultiSelected={selectedItemIds.has(item.id)}
                      onSelect={(e, isMulti) => {
                        if (isMulti) {
                          setSelectedItemIds(prev => {
                            const newSet = new Set(prev)
                            if (newSet.has(item.id)) {
                              newSet.delete(item.id)
                            } else {
                              newSet.add(item.id)
                            }
                            return newSet
                          })
                        } else {
                          setSelectedItemId(item.id)
                          setSelectedItemIds(new Set())
                        }
                      }}
                      onUpdate={handleItemUpdate}
                      onDelete={handleItemDelete}
                      showMeasurements={canvasState.showMeasurements}
                      zoom={canvasState.zoom}
                    />
                  ))
                })()}
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
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-stone-200" />

            {/* Action Buttons */}
            <button
              onClick={() => {
                // Use selected item as reference if available
                if (selectedItem) {
                  setReferenceImage(selectedItem.image_url)
                } else {
                  // Open file picker
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.onchange = (e) => {
                    const file = e.target.files[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        setReferenceImage(reader.result)
                      }
                      reader.readAsDataURL(file)
                    }
                  }
                  input.click()
                }
              }}
              className={`p-2 hover:bg-stone-100 rounded-full transition-colors ${
                referenceImage ? 'bg-stone-100' : ''
              }`}
              title="Add Reference Image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-600">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </button>
            
            <button
              onClick={() => setShowAssetLibrary(true)}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors"
              title="Asset Library"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-600">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 9h6v6H9z" />
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

            {/* Performance Indicator (dev mode) */}
            {process.env.NODE_ENV === 'development' && items.length > 10 && (
              <div className="px-3 py-1 text-xs text-stone-400 font-medium">
                {visibleItemsCount}/{items.length} visible
              </div>
            )}
          </div>

          {/* Generation Controls Panel */}
          <div className="mt-3 w-full max-w-2xl mx-auto">
            {/* Model & Style Selection */}
            <div className="flex items-center gap-2 mb-2">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300 shadow-sm"
              >
                <option value="gemini">Gemini 2.5 Flash</option>
                <option value="gpt-image" disabled>GPT Image (Coming Soon)</option>
                <option value="flux" disabled>Flux Ultra (Coming Soon)</option>
                <option value="imagen" disabled>Imagen 4 (Coming Soon)</option>
              </select>

              <select
                value={selectedStyle?.id || ''}
                onChange={(e) => {
                  const style = styles.find(s => s.id === e.target.value)
                  setSelectedStyle(style || null)
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300 shadow-sm"
              >
                <option value="">No Style</option>
                {styles.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.name} {style.is_public ? '(Public)' : ''}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowStyleLibrary(true)}
                className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors bg-white border border-stone-200 shadow-sm"
                title="Style Library"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-600">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </button>
            </div>

            {/* Reference Image */}
            {referenceImage && (
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-stone-200 mb-2 shadow-sm">
                <img src={referenceImage} alt="Reference" className="w-10 h-10 object-cover rounded" />
                <span className="flex-1 text-xs text-stone-600 truncate">Using reference image</span>
                <button
                  onClick={() => setReferenceImage(null)}
                  className="p-1 hover:bg-stone-200 rounded transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}

            {/* Chat Input */}
            <form onSubmit={handleChatSubmit}>
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
                    onClick={() => {
                      // Use selected item as reference if available
                      if (selectedItem) {
                        setReferenceImage(selectedItem.image_url)
                      } else {
                        // Open file picker
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = 'image/*'
                        input.onchange = (e) => {
                          const file = e.target.files[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              setReferenceImage(reader.result)
                            }
                            reader.readAsDataURL(file)
                          }
                        }
                        input.click()
                      }
                    }}
                    className={`p-1.5 hover:bg-stone-100 rounded-full transition-colors ${
                      referenceImage ? 'bg-stone-100' : ''
                    }`}
                    title="Add Reference Image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-600">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAssetLibrary(true)}
                    className="p-1.5 hover:bg-stone-100 rounded-full transition-colors"
                    title="Add Asset"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-600">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M9 9h6v6H9z" />
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
      </div>

      {/* Style Library Modal */}
      {showStyleLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowStyleLibrary(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col m-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-stone-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-stone-900">Style Library</h2>
              <button
                onClick={() => setShowStyleLibrary(false)}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {styles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => {
                      setSelectedStyle(style)
                      setShowStyleLibrary(false)
                    }}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedStyle?.id === style.id
                        ? 'border-stone-900 bg-stone-50'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    {style.preview_image_url ? (
                      <img src={style.preview_image_url} alt={style.name} className="w-full h-24 object-cover rounded mb-2" />
                    ) : (
                      <div className="w-full h-24 bg-stone-100 rounded mb-2 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                      </div>
                    )}
                    <h3 className="font-semibold text-sm text-stone-900 mb-1">{style.name}</h3>
                    {style.description && (
                      <p className="text-xs text-stone-600 line-clamp-2">{style.description}</p>
                    )}
                  </button>
                ))}
              </div>
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
