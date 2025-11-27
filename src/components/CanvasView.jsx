import { useState, useEffect, useRef, useCallback } from 'react'
import { Stage, Layer, Image, Group, Rect, Text, Circle } from 'react-konva'
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
  const [chatInput, setChatInput] = useState('')
  const [popupMenuPosition, setPopupMenuPosition] = useState({ x: 0, y: 0, visible: false })
  
  // Calculate selectedItem - must be defined before useEffects
  const selectedItem = items.find((item) => item.id === selectedItemId)
  const selectedItems = items.filter((item) => selectedItemIds.has(item.id) || item.id === selectedItemId)
  
  // Show popup menu when item is selected and update position on pan/zoom
  useEffect(() => {
    if (selectedItem && stageRef.current) {
      const updateMenuPosition = () => {
        const stage = stageRef.current
        if (!stage) return
        
        // Calculate item position in screen coordinates
        const itemX = selectedItem.x_position * stage.scaleX() + stage.x()
        const itemY = selectedItem.y_position * stage.scaleY() + stage.y()
        const itemWidth = (selectedItem.width || 200) * stage.scaleX()
        
        // Position menu above the item, centered horizontally
        setPopupMenuPosition(prev => ({
          x: itemX + itemWidth / 2,
          y: itemY - 10, // Above the item
          visible: prev.visible || true,
        }))
      }
      
      updateMenuPosition()
      
      // Update position when canvas state changes (pan/zoom)
      const interval = setInterval(updateMenuPosition, 100)
      return () => clearInterval(interval)
    } else {
      setPopupMenuPosition({ x: 0, y: 0, visible: false })
    }
  }, [selectedItem, canvasState.panX, canvasState.panY, canvasState.zoom])

  // Close popup menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupMenuPosition.visible && !e.target.closest('.popup-menu')) {
        // Don't close if clicking on canvas items
        if (e.target.closest('canvas')) {
          return
        }
        setPopupMenuPosition({ x: 0, y: 0, visible: false })
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [popupMenuPosition.visible])

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
      const toolbarHeight = 120 // Account for bottom toolbar
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - toolbarHeight,
      })
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Initialize stage position to center of 4x canvas (only if not already loaded from database)
  useEffect(() => {
    if (stageRef.current && dimensions.width > 0 && dimensions.height > 0 && !loading) {
      // Only initialize if stage is at default position (0,0) and scale (1,1)
      const currentPos = stageRef.current.position()
      const currentScale = stageRef.current.scaleX()
      
      if (currentPos.x === 0 && currentPos.y === 0 && currentScale === 1) {
        // Center the viewport on the canvas (4x larger)
        const canvasWidth = dimensions.width * 4
        const canvasHeight = dimensions.height * 4
        const initialX = (canvasWidth - dimensions.width) / 2
        const initialY = (canvasHeight - dimensions.height) / 2
        stageRef.current.position({ x: initialX, y: initialY })
        stageRef.current.scale({ x: 1, y: 1 })
        setCanvasState((prev) => ({
          ...prev,
          panX: initialX,
          panY: initialY,
          zoom: 1,
        }))
      }
    }
  }, [dimensions.width, dimensions.height, loading])

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

        // Restore stage position and zoom
        setTimeout(() => {
          if (stageRef.current && dimensions.width > 0 && dimensions.height > 0) {
            // Clamp pan to canvas bounds (canvas is 4x larger than viewport)
            const currentCanvasWidth = dimensions.width * 4
            const currentCanvasHeight = dimensions.height * 4
            const maxX = currentCanvasWidth - dimensions.width
            const maxY = currentCanvasHeight - dimensions.height
            const clampedX = Math.max(0, Math.min(maxX, restoredState.panX))
            const clampedY = Math.max(0, Math.min(maxY, restoredState.panY))
            
            stageRef.current.position({ x: clampedX, y: clampedY })
            stageRef.current.scale({ x: restoredState.zoom, y: restoredState.zoom })
            
            setCanvasState((prev) => ({
              ...prev,
              panX: clampedX,
              panY: clampedY,
            }))
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
      setPopupMenuPosition({ x: 0, y: 0, visible: false })
    } catch (error) {
      console.error('Error deleting item:', error)
      setError('Failed to delete item. Please try again.')
    }
  }, [userId, selectedItemId])

  const moveToFront = useCallback(async () => {
    if (!selectedItemId) return
    
    const maxZIndex = Math.max(...items.map(item => item.z_index || 0), 0)
    await handleItemUpdate(selectedItemId, { z_index: maxZIndex + 1 })
  }, [selectedItemId, items, handleItemUpdate])

  const moveToBack = useCallback(async () => {
    if (!selectedItemId) return
    
    const minZIndex = Math.min(...items.map(item => item.z_index || 0), 0)
    await handleItemUpdate(selectedItemId, { z_index: minZIndex - 1 })
  }, [selectedItemId, items, handleItemUpdate])

  const handleEdit = useCallback(() => {
    // Open edit modal - use regenerate functionality as "edit"
    setShowGenerateModal(true)
    if (selectedItem) {
      setGeneratePrompt(selectedItem.prompt || '')
    }
  }, [selectedItem])

  const handleStageDragEnd = useCallback(() => {
    const stage = stageRef.current
    if (!stage || dimensions.width === 0 || dimensions.height === 0) return

    const position = stage.position()
    const scale = stage.scaleX()
    
    // Clamp pan to canvas bounds (4x larger than viewport)
    const canvasWidth = dimensions.width * 4
    const canvasHeight = dimensions.height * 4
    const maxX = canvasWidth - dimensions.width
    const maxY = canvasHeight - dimensions.height
    const clampedX = Math.max(0, Math.min(maxX, position.x))
    const clampedY = Math.max(0, Math.min(maxY, position.y))
    
    stage.position({ x: clampedX, y: clampedY })
    
    setCanvasState((prev) => ({
      ...prev,
      panX: clampedX,
      panY: clampedY,
      zoom: scale,
    }))
    saveCanvasStateToServer()
  }, [dimensions.width, dimensions.height, saveCanvasStateToServer])

  const handleStageDrag = useCallback(() => {
    const stage = stageRef.current
    if (!stage || dimensions.width === 0 || dimensions.height === 0) return

    const position = stage.position()
    const scale = stage.scaleX()
    
    // Clamp pan to canvas bounds during drag
    const canvasWidth = dimensions.width * 4
    const canvasHeight = dimensions.height * 4
    const maxX = canvasWidth - dimensions.width
    const maxY = canvasHeight - dimensions.height
    const clampedX = Math.max(0, Math.min(maxX, position.x))
    const clampedY = Math.max(0, Math.min(maxY, position.y))
    
    if (clampedX !== position.x || clampedY !== position.y) {
      stage.position({ x: clampedX, y: clampedY })
    }
    
    // Update state in real-time during drag for grid to update
    setCanvasState((prev) => ({
      ...prev,
      panX: clampedX,
      panY: clampedY,
      zoom: scale,
    }))
  }, [dimensions.width, dimensions.height])

  const handleWheel = useCallback((e) => {
    e.evt.preventDefault()

    const stage = stageRef.current
    if (!stage || dimensions.width === 0 || dimensions.height === 0) return

    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    // Use device-native scroll sensitivity
    const deltaY = e.evt.deltaY
    const absDelta = Math.abs(deltaY)
    
    // Calculate zoom factor based on scroll amount
    const baseZoomFactor = 1.001
    const sensitivity = Math.min(absDelta / 10, 50)
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

    // Clamp pan to canvas bounds
    const canvasWidth = dimensions.width * 4
    const canvasHeight = dimensions.height * 4
    const maxX = canvasWidth - dimensions.width
    const maxY = canvasHeight - dimensions.height
    const clampedX = Math.max(0, Math.min(maxX, newPos.x))
    const clampedY = Math.max(0, Math.min(maxY, newPos.y))

    stage.scale({ x: clampedScale, y: clampedScale })
    stage.position({ x: clampedX, y: clampedY })

    setCanvasState((prev) => ({
      ...prev,
      zoom: clampedScale,
      panX: clampedX,
      panY: clampedY,
    }))
  }, [dimensions.width, dimensions.height])

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
        // Calculate center in world coordinates (accounting for pan/zoom)
        const width = dimensions?.width || window.innerWidth
        const height = dimensions?.height || window.innerHeight
        const stage = stageRef.current
        const canvasWidth = width * 4
        const canvasHeight = height * 4
        const centerX = stage && width > 0 ? (width / 2 - stage.x()) / stage.scaleX() : canvasWidth / 2
        const centerY = stage && height > 0 ? (height / 2 - stage.y()) / stage.scaleY() : canvasHeight / 2

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
      // Calculate center in world coordinates (accounting for pan/zoom)
      const stage = stageRef.current
      const width = dimensions?.width || window.innerWidth
      const height = dimensions?.height || window.innerHeight
      const canvasWidth = width * 4
      const canvasHeight = height * 4
      const centerX = stage && width > 0 ? (width / 2 - stage.x()) / stage.scaleX() : canvasWidth / 2
      const centerY = stage && height > 0 ? (height / 2 - stage.y()) / stage.scaleY() : canvasHeight / 2

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
      {/* Popup Menu - Appears when item is selected */}
      {popupMenuPosition.visible && selectedItem && (
        <div
          className="popup-menu fixed z-50 bg-white rounded-lg shadow-lg border border-stone-200 py-1 min-w-[140px]"
          style={{
            left: `${popupMenuPosition.x}px`,
            top: `${popupMenuPosition.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleEdit}
            className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
          <button
            onClick={moveToFront}
            className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Move to Front
          </button>
          <button
            onClick={moveToBack}
            className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Move to Back
          </button>
          <div className="border-t border-stone-200 my-1" />
          <button
            onClick={() => handleItemDelete(selectedItemId)}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            Delete
          </button>
        </div>
      )}

      {/* Main Canvas Area - Full Screen */}
      <div 
        className="flex-1 flex flex-col w-full h-full"
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
          {/* Grid Background - CSS-based, fixed to viewport, behind Stage */}
          {canvasState.gridEnabled && dimensions.width > 0 && dimensions.height > 0 && (() => {
            // Calculate grid spacing in screen pixels (scales with zoom)
            const screenGridSize = canvasState.gridSize * canvasState.zoom
            const effectiveGridSize = Math.max(10, screenGridSize)
            
            // Calculate grid offset based on pan position
            const offsetX = canvasState.panX % effectiveGridSize
            const offsetY = canvasState.panY % effectiveGridSize
            const normalizedOffsetX = offsetX < 0 ? offsetX + effectiveGridSize : offsetX
            const normalizedOffsetY = offsetY < 0 ? offsetY + effectiveGridSize : offsetY
            
            return (
              <div
                className="absolute inset-0 pointer-events-none z-0"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                    linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                  `,
                  backgroundSize: `${effectiveGridSize}px ${effectiveGridSize}px`,
                  backgroundPosition: `${normalizedOffsetX}px ${normalizedOffsetY}px`,
                }}
              />
            )
          })()}
          
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-stone-500">Loading canvas...</p>
              </div>
            </div>
          ) : dimensions.width > 0 && dimensions.height > 0 && (() => {
            const canvasWidth = dimensions.width * 4
            const canvasHeight = dimensions.height * 4
            return (
            <Stage
              ref={stageRef}
              width={canvasWidth}
              height={canvasHeight}
              draggable
              onDrag={handleStageDrag}
              onDragEnd={handleStageDragEnd}
              onWheel={handleWheel}
              onClick={(e) => {
                if (e.target === e.target.getStage()) {
                  setSelectedItemId(null)
                  setPopupMenuPosition({ x: 0, y: 0, visible: false })
                }
              }}
              style={{ position: 'relative', zIndex: 1 }}
            >

              {/* Canvas Items Layer - Virtual Rendering */}
              <Layer>
                {(() => {
                  // Virtual rendering: only render items visible in viewport
                  // Account for pan and zoom
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
            )
          })()}
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

                  // Calculate center in world coordinates (accounting for pan/zoom)
                  const stage = stageRef.current
                  const canvasWidth = dimensions.width * 4
                  const canvasHeight = dimensions.height * 4
                  const centerX = stage ? (dimensions.width / 2 - stage.x()) / stage.scaleX() : canvasWidth / 2
                  const centerY = stage ? (dimensions.height / 2 - stage.y()) / stage.scaleY() : canvasHeight / 2

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
