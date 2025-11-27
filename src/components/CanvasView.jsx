import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Stage, Layer, Image, Group, Rect, Text, Circle, Line, Arrow } from 'react-konva'
import { useAuth } from '@clerk/clerk-react'
import Konva from 'konva'
import useImage from 'use-image'
import AssetLibrary from './AssetLibrary'
import ExportModal from './ExportModal'
import CanvasExportModal from './CanvasExportModal'
import LayersPanel from './LayersPanel'
import { getCanvasData, createCanvasItem, updateCanvasItem, deleteCanvasItem, saveCanvasState } from '../utils/canvasManager'
import { uploadFileToCloud } from '../utils/cloudProjectManager'
import { saveHistoryToDB, loadHistoryFromDB } from '../utils/historyManager'

// Zoom constants
const MIN_ZOOM = 0.25
const MAX_ZOOM = 3

// Mask Drawing Overlay Component - Returns mask layer ref and UI controls
function MaskDrawingOverlay({ item, stageRef, maskLayerRef, onMaskComplete, onCancel, zoom, brushSize, setBrushSize }) {
  const isDrawingRef = useRef(false)
  const pathRef = useRef(null)
  const pointsRef = useRef([])

  useEffect(() => {
    const stage = stageRef.current
    const maskLayer = maskLayerRef.current
    if (!stage || !maskLayer) return

    const handleMouseDown = (e) => {
      // Only draw if clicking on the stage or empty area
      if (e.target === stage || e.target.getParent()?.name() === 'mask-layer') {
        isDrawingRef.current = true
        const pos = stage.getPointerPosition()
        if (!pos) return

        // Convert to item local coordinates
        const itemX = (pos.x - stage.x()) / stage.scaleX() - item.x_position
        const itemY = (pos.y - stage.y()) / stage.scaleY() - item.y_position

        // Check if click is within item bounds
        if (itemX < 0 || itemX > (item.width || 400) || itemY < 0 || itemY > (item.height || 400)) {
          return
        }

        pointsRef.current = [[itemX, itemY]]

        // Create new line for this stroke
        const line = new Konva.Line({
          points: [itemX, itemY],
          stroke: 'rgba(255, 0, 0, 0.6)',
          strokeWidth: brushSize / zoom,
          lineCap: 'round',
          lineJoin: 'round',
          globalCompositeOperation: 'source-over',
        })

        maskLayer.add(line)
        pathRef.current = line
      }
    }

    const handleMouseMove = (e) => {
      if (!isDrawingRef.current) return

      const pos = stage.getPointerPosition()
      if (!pos || !pathRef.current) return

      const itemX = (pos.x - stage.x()) / stage.scaleX() - item.x_position
      const itemY = (pos.y - stage.y()) / stage.scaleY() - item.y_position

      // Check bounds
      if (itemX < 0 || itemX > (item.width || 400) || itemY < 0 || itemY > (item.height || 400)) {
        return
      }

      pointsRef.current.push([itemX, itemY])
      pathRef.current.points(pointsRef.current.flat())
      maskLayer.batchDraw()
    }

    const handleMouseUp = () => {
      isDrawingRef.current = false
      pathRef.current = null
      pointsRef.current = []
    }

    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && !e.repeat) {
        e.preventDefault()
        // Export mask as image
        const maskLayer = maskLayerRef.current
        if (!maskLayer) return

        // Create a temporary canvas to render the mask
        const canvas = document.createElement('canvas')
        const itemWidth = item.width || 400
        const itemHeight = item.height || 400
        canvas.width = itemWidth
        canvas.height = itemHeight
        const ctx = canvas.getContext('2d')

        // Draw white background
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, itemWidth, itemHeight)

        // Draw mask strokes in black
        const shapes = maskLayer.getChildren()
        shapes.forEach((shape) => {
          if (shape instanceof Konva.Line) {
            ctx.strokeStyle = 'black'
            ctx.lineWidth = shape.strokeWidth() * zoom
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.beginPath()
            const points = shape.points()
            for (let i = 0; i < points.length; i += 2) {
              if (i === 0) {
                ctx.moveTo(points[i], points[i + 1])
              } else {
                ctx.lineTo(points[i], points[i + 1])
              }
            }
            ctx.stroke()
          }
        })

        const maskDataUrl = canvas.toDataURL('image/png')
        onMaskComplete(maskDataUrl)
      } else if (e.key === 'Escape' && !e.repeat) {
        e.preventDefault()
        onCancel()
      }
    }

    stage.on('mousedown', handleMouseDown)
    stage.on('mousemove', handleMouseMove)
    stage.on('mouseup', handleMouseUp)
    stage.on('mouseleave', handleMouseUp)
    document.addEventListener('keydown', handleKeyPress)

    return () => {
      stage.off('mousedown', handleMouseDown)
      stage.off('mousemove', handleMouseMove)
      stage.off('mouseup', handleMouseUp)
      stage.off('mouseleave', handleMouseUp)
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [item, stageRef, maskLayerRef, onMaskComplete, onCancel, brushSize, zoom])

  return (
    <div className="fixed top-20 right-4 z-50 bg-white/95 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg border border-stone-200">
      <label className="text-xs text-stone-600 mb-2 block font-medium">Brush Size</label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min="5"
          max="100"
          value={brushSize}
          onChange={(e) => setBrushSize(parseInt(e.target.value))}
          className="flex-1"
        />
        <span className="text-sm text-stone-700 font-mono w-12 text-right">{brushSize}px</span>
      </div>
      <div className="mt-2 text-xs text-stone-500">
        Press <kbd className="px-1.5 py-0.5 bg-stone-100 border border-stone-300 rounded text-xs">Enter</kbd> to apply, <kbd className="px-1.5 py-0.5 bg-stone-100 border border-stone-300 rounded text-xs">Esc</kbd> to cancel
      </div>
    </div>
  )
}

// Canvas Item Component
function CanvasItem({ item, isSelected, isMultiSelected, onSelect, onUpdate, onDelete, onContextMenu, showMeasurements, zoom, blendMode }) {
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
  const hue = (adjustments.hue || 0) / 180 // Konva HSL expects -1 to 1 (0-360 degrees -> -1 to 1)

  // Create filter array
  const filters = []
  if (brightness !== 0) filters.push(Konva.Filters.Brighten)
  if (contrast !== 0) filters.push(Konva.Filters.Contrast)
  if (saturation !== 0 || hue !== 0) filters.push(Konva.Filters.HSL)

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
      onContextMenu={(e) => {
        e.evt.preventDefault()
        if (onContextMenu) {
          onContextMenu(e, item.id)
        }
      }}
      onTransformEnd={handleTransformEnd}
      visible={item.is_visible !== false}
      opacity={item.opacity || 1}
      style={{ cursor: blendMode ? 'crosshair' : 'default' }}
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
        hue={hue}
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
  const [showLayersPanel, setShowLayersPanel] = useState(false)
  
  // UI State
  const [chatInput, setChatInput] = useState('')
  const [popupMenuPosition, setPopupMenuPosition] = useState({ x: 0, y: 0, visible: false, showAdjustments: false })
  const [blendMode, setBlendMode] = useState(false) // Track if we're in blend mode
  const [blendSourceId, setBlendSourceId] = useState(null) // First image to blend
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0, visible: false, itemId: null })
  
  // Eraser/Inpaint State
  const [eraserMode, setEraserMode] = useState(false)
  const [eraserTargetId, setEraserTargetId] = useState(null)
  const [maskCanvas, setMaskCanvas] = useState(null) // Canvas for drawing mask
  const [isDrawingMask, setIsDrawingMask] = useState(false)
  const [maskPath, setMaskPath] = useState([]) // Store brush strokes
  
  // Calculate selectedItem - memoized to prevent unnecessary recalculations
  // Use useMemo to ensure it's always either null or an object, never undefined
  const selectedItem = useMemo(() => {
    if (!selectedItemId || !items || !Array.isArray(items) || items.length === 0) return null
    return items.find((item) => item.id === selectedItemId) || null
  }, [selectedItemId, items])
  
  const selectedItems = useMemo(() => {
    if (!items || !Array.isArray(items)) return []
    return items.filter((item) => selectedItemIds.has(item.id) || item.id === selectedItemId)
  }, [items, selectedItemIds, selectedItemId])
  
  // Show popup menu when item is selected and update position on pan/zoom
  useEffect(() => {
    if (selectedItem && stageRef.current && selectedItemId) {
      const updateMenuPosition = () => {
        const stage = stageRef.current
        if (!stage || !selectedItem) return
        
        // Calculate item position in screen coordinates
        const itemX = (selectedItem.x_position || 0) * stage.scaleX() + stage.x()
        const itemY = (selectedItem.y_position || 0) * stage.scaleY() + stage.y()
        const itemWidth = (selectedItem.width || 200) * stage.scaleX()
        
        // Position menu above the item, centered horizontally
        setPopupMenuPosition(prev => ({
          x: itemX + itemWidth / 2,
          y: itemY - 10, // Above the item
          visible: true,
        }))
      }
      
      updateMenuPosition()
      
      // Update position when canvas state changes (pan/zoom)
      const interval = setInterval(updateMenuPosition, 100)
      return () => clearInterval(interval)
    } else {
      setPopupMenuPosition({ x: 0, y: 0, visible: false })
    }
  }, [selectedItemId, canvasState.panX, canvasState.panY, canvasState.zoom, selectedItem])

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

  // Handle file upload and add to canvas
  const handleFileUpload = useCallback(async (file, dropPosition) => {
    if (!userId || !projectId) {
      setError('Missing user or project information. Please refresh the page.')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please drop or paste an image file.')
      return
    }

    try {
      setIsGenerating(true)
      
      // Upload file to cloud
      const uploadResult = await uploadFileToCloud(file, userId)
      const imageUrl = uploadResult.url

      // Calculate position - use drop position or center of viewport
      const stage = stageRef.current
      let x, y
      
      if (dropPosition) {
        // Convert screen coordinates to world coordinates
        x = (dropPosition.x - stage.x()) / stage.scaleX()
        y = (dropPosition.y - stage.y()) / stage.scaleY()
      } else {
        // Center of viewport
        const width = dimensions?.width || window.innerWidth
        const height = dimensions?.height || window.innerHeight
        const canvasWidth = width * 4
        const canvasHeight = height * 4
        x = stage && width > 0 ? (width / 2 - stage.x()) / stage.scaleX() : canvasWidth / 2
        y = stage && height > 0 ? (height / 2 - stage.y()) / stage.scaleY() : canvasHeight / 2
      }

      // Get image dimensions
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })

      // Create canvas item
      // Get max z_index for new items
      const maxZIndex = items.length > 0 ? Math.max(...items.map(item => item.z_index || 0), 0) : 0
      
      const newItem = await createCanvasItem(userId, projectId, {
        image_url: imageUrl,
        x_position: x - img.width / 2,
        y_position: y - img.height / 2,
        width: img.width,
        height: img.height,
        z_index: maxZIndex + 1,
        is_visible: true,
      })

      setItems((prev) => [...prev, newItem])
    } catch (error) {
      console.error('Error uploading file:', error)
      setError('Failed to upload image. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [userId, projectId, dimensions])

  // Handle drag and drop
  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()

    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))

    if (imageFiles.length === 0) {
      setError('Please drop image files only.')
      return
    }

    // Get drop position in screen coordinates
    const stage = stageRef.current
    if (!stage) return

    const pointer = stage.getPointerPosition()
    if (!pointer) return

    // Upload all dropped images
    for (const file of imageFiles) {
      await handleFileUpload(file, pointer)
    }
  }, [handleFileUpload])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = async (e) => {
      // Don't handle paste if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }

      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            await handleFileUpload(file, null) // null = use center position
          }
          break
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handleFileUpload])

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
        const response = await fetch('/api/generate?action=styles', {
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
        // Don't show error for missing tables - canvas will work with local state
        // Tables will be created automatically when first item is saved
        console.log('Canvas tables not found yet - working with local state. Tables will be created on first save.')
        setError('') // Clear error - canvas can work without tables initially
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
      // Save current state to history before delete
      saveToHistory(items)
      
      await deleteCanvasItem(userId, itemId)
      const newItems = items.filter((item) => item.id !== itemId)
      setItems(newItems)
      if (selectedItemId === itemId) {
        setSelectedItemId(null)
      }
      setPopupMenuPosition({ x: 0, y: 0, visible: false })
    } catch (error) {
      console.error('Error deleting item:', error)
      setError('Failed to delete item. Please try again.')
    }
  }, [userId, selectedItemId, items, saveToHistory])

  // Layer panel handlers
  const handleReorderLayers = useCallback(async (reorderedItems) => {
    try {
      // Update all items with new z_index values
      const updatePromises = reorderedItems.map((item) =>
        updateCanvasItem(userId, item.id, { z_index: item.z_index })
      )
      await Promise.all(updatePromises)
      setItems(reorderedItems)
    } catch (error) {
      console.error('Error reordering layers:', error)
      setError('Failed to reorder layers. Please try again.')
    }
  }, [userId])

  const handleToggleVisibility = useCallback(async (itemId) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    
    const newVisibility = item.is_visible === false ? true : false
    await handleItemUpdate(itemId, { is_visible: newVisibility })
  }, [items, handleItemUpdate])

  const handleToggleLock = useCallback(async (itemId) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    
    const newLockState = !item.is_locked
    await handleItemUpdate(itemId, { is_locked: newLockState })
  }, [items, handleItemUpdate])

  const handleOpacityChange = useCallback(async (itemId, opacity) => {
    await handleItemUpdate(itemId, { opacity })
  }, [handleItemUpdate])

  // Upscale handler
  const handleUpscale = useCallback(async (itemId, scale) => {
    if (!userId || !projectId || !itemId) return

    const targetItem = items.find(item => item.id === itemId)
    if (!targetItem) {
      setError('Could not find image to upscale.')
      return
    }

    try {
      setIsGenerating(true)
      setPopupMenuPosition({ x: 0, y: 0, visible: false })
      
      // Call upscale API
      const response = await fetch('/api/image-editing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify({
          operation: 'upscale',
          image_url: targetItem.image_url,
          scale: scale,
        }),
      })

      if (!response.ok) throw new Error('Upscale failed')

      const data = await response.json()
      if (!data.image_url) throw new Error('No image returned from upscale')

      // Upload if needed
      let imageUrl = data.image_url
      if (imageUrl.startsWith('data:')) {
        const imgResponse = await fetch(imageUrl)
        const blob = await imgResponse.blob()
        const file = new File([blob], `upscale-${scale}x-${Date.now()}.png`, { type: 'image/png' })
        const uploadResult = await uploadFileToCloud(file, userId)
        imageUrl = uploadResult.url
      }

      // Get image dimensions
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })

      // Update the item with the upscaled result
      await handleItemUpdate(itemId, {
        image_url: imageUrl,
        width: img.width,
        height: img.height,
        name: `${targetItem.name || 'Image'} (${scale}x)`,
        metadata: {
          ...(targetItem.metadata || {}),
          original_image_url: targetItem.image_url, // Backup original
          upscaled_at: new Date().toISOString(),
          upscale_factor: scale,
        },
      })

      setError('')
    } catch (error) {
      console.error('Error upscaling:', error)
      setError(`Failed to upscale image ${scale}x. Please try again.`)
    } finally {
      setIsGenerating(false)
    }
  }, [userId, projectId, items, handleItemUpdate])

  const moveToFront = useCallback(async () => {
    if (!selectedItemId || !items || !Array.isArray(items) || items.length === 0) return
    
    const maxZIndex = Math.max(...items.map(item => item.z_index || 0), 0)
    await handleItemUpdate(selectedItemId, { z_index: maxZIndex + 1 })
  }, [selectedItemId, items, handleItemUpdate])

  const moveToBack = useCallback(async () => {
    if (!selectedItemId || !items || !Array.isArray(items) || items.length === 0) return
    
    const minZIndex = Math.min(...items.map(item => item.z_index || 0), 0)
    await handleItemUpdate(selectedItemId, { z_index: minZIndex - 1 })
  }, [selectedItemId, items, handleItemUpdate])

  const handleEdit = useCallback(() => {
    // Open edit modal - use regenerate functionality as "edit"
    setShowGenerateModal(true)
    if (selectedItem && selectedItem.prompt) {
      setGeneratePrompt(selectedItem.prompt)
    }
  }, [selectedItem])

  // Handle blend two images
  const handleBlend = useCallback(async (sourceId, targetId) => {
    if (!userId || !projectId || !sourceId || !targetId) return

    const sourceItem = items.find(item => item.id === sourceId)
    const targetItem = items.find(item => item.id === targetId)

    if (!sourceItem || !targetItem) {
      setError('Could not find images to blend.')
      return
    }

    try {
      setIsGenerating(true)
      
      // Call blend API
      const response = await fetch('/api/image-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify({
          operation: 'blend',
          image1_url: sourceItem.image_url,
          image2_url: targetItem.image_url,
          mask_strength: 0.5, // 50% blend
        }),
      })

      if (!response.ok) throw new Error('Blend failed')

      const data = await response.json()
      if (!data.image_url) throw new Error('No image returned from blend')

      // Upload if needed
      let imageUrl = data.image_url
      if (imageUrl.startsWith('data:')) {
        const imgResponse = await fetch(imageUrl)
        const blob = await imgResponse.blob()
        const file = new File([blob], `blend-${Date.now()}.png`, { type: 'image/png' })
        const uploadResult = await uploadFileToCloud(file, userId)
        imageUrl = uploadResult.url
      }

      // Get image dimensions
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })

      // Calculate position (center between the two images)
      const centerX = (sourceItem.x_position + targetItem.x_position + (sourceItem.width || 0) + (targetItem.width || 0)) / 2
      const centerY = (sourceItem.y_position + targetItem.y_position + (sourceItem.height || 0) + (targetItem.height || 0)) / 2

      // Create new blended item
      const maxZIndex = items.length > 0 ? Math.max(...items.map(item => item.z_index || 0), 0) : 0
      const newItem = await createCanvasItem(userId, projectId, {
        image_url: imageUrl,
        x_position: centerX - img.width / 2,
        y_position: centerY - img.height / 2,
        width: img.width,
        height: img.height,
        name: `Blend: ${sourceItem.name || 'Image 1'} + ${targetItem.name || 'Image 2'}`,
        z_index: maxZIndex + 1,
        is_visible: true,
      })

      // Delete both original items
      await deleteCanvasItem(userId, sourceId)
      await deleteCanvasItem(userId, targetId)

      // Update items list
      setItems((prev) => prev.filter(item => item.id !== sourceId && item.id !== targetId).concat(newItem))
      
      // Clear selection and blend mode
      setSelectedItemId(null)
      setBlendMode(false)
      setBlendSourceId(null)
      setContextMenuPosition({ x: 0, y: 0, visible: false, itemId: null })
    } catch (error) {
      console.error('Error blending images:', error)
      setError('Failed to blend images. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [userId, projectId, items])

  // Compare mode state
  const [compareMode, setCompareMode] = useState(false)
  const [compareItems, setCompareItems] = useState([])
  const [compareSplitPosition, setCompareSplitPosition] = useState(50) // Percentage

  // Style transfer state
  const [showStyleTransfer, setShowStyleTransfer] = useState(false)
  const [styleTransferTargetId, setStyleTransferTargetId] = useState(null)

  // Handle context menu actions
  const handleContextMenuAction = useCallback((action, itemId) => {
    if (action === 'blend') {
      setBlendMode(true)
      setBlendSourceId(itemId)
      setContextMenuPosition({ x: 0, y: 0, visible: false, itemId: null })
      setError('Blend mode: Click on another image to blend with this one')
    } else if (action === 'erase') {
      setEraserMode(true)
      setEraserTargetId(itemId)
      setContextMenuPosition({ x: 0, y: 0, visible: false, itemId: null })
      setError('Eraser mode: Paint over the area you want to erase/fill. Press Enter when done.')
    } else if (action === 'removeBg') {
      handleRemoveBackground(itemId)
      setContextMenuPosition({ x: 0, y: 0, visible: false, itemId: null })
    } else if (action === 'loop') {
      handleCreateLoop(itemId)
      setContextMenuPosition({ x: 0, y: 0, visible: false, itemId: null })
    } else if (action === 'extractPalette') {
      handleExtractPalette(itemId)
      setContextMenuPosition({ x: 0, y: 0, visible: false, itemId: null })
    } else if (action === 'compare') {
      // Get selected items for comparison
      const itemsToCompare = selectedItemIds.size > 0
        ? items.filter(item => selectedItemIds.has(item.id))
        : [items.find(item => item.id === itemId)].filter(Boolean)
      
      if (itemsToCompare.length >= 2) {
        setCompareItems(itemsToCompare.slice(0, 2))
        setCompareMode(true)
        setContextMenuPosition({ x: 0, y: 0, visible: false, itemId: null })
      } else {
        setError('Please select two images to compare. Use Shift+Click to select multiple.')
      }
    }
  }, [selectedItemIds, items])

  // Style transfer handler
  const handleStyleTransfer = useCallback(async (itemId, styleName) => {
    if (!userId || !projectId || !itemId) return

    const targetItem = items.find(item => item.id === itemId)
    if (!targetItem) {
      setError('Could not find image to process.')
      return
    }

    try {
      setIsGenerating(true)
      setShowStyleTransfer(false)
      
      // Call style transfer API
      const response = await fetch('/api/image-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify({
          operation: 'style-transfer',
          image_url: targetItem.image_url,
          style: styleName,
        }),
      })

      if (!response.ok) throw new Error('Style transfer failed')

      const data = await response.json()
      if (!data.image_url) throw new Error('No image returned from style transfer')

      // Upload if needed
      let imageUrl = data.image_url
      if (imageUrl.startsWith('data:')) {
        const imgResponse = await fetch(imageUrl)
        const blob = await imgResponse.blob()
        const file = new File([blob], `style-transfer-${styleName}-${Date.now()}.png`, { type: 'image/png' })
        const uploadResult = await uploadFileToCloud(file, userId)
        imageUrl = uploadResult.url
      }

      // Get image dimensions
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })

      // Update the item with the styled result
      await handleItemUpdate(itemId, {
        image_url: imageUrl,
        width: img.width,
        height: img.height,
        name: `${targetItem.name || 'Image'} (${styleName})`,
        metadata: {
          ...(targetItem.metadata || {}),
          original_image_url: targetItem.image_url,
          style_transferred_at: new Date().toISOString(),
          style_name: styleName,
        },
      })

      setError('')
    } catch (error) {
      console.error('Error applying style transfer:', error)
      setError('Failed to apply style transfer. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [userId, projectId, items, handleItemUpdate])

  // Style transfer keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 't' && !e.shiftKey && selectedItemId) {
        e.preventDefault()
        setStyleTransferTargetId(selectedItemId)
        setShowStyleTransfer(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedItemId])

  // Remove background handler
  const handleRemoveBackground = useCallback(async (itemId) => {
    if (!userId || !projectId || !itemId) return

    const targetItem = items.find(item => item.id === itemId)
    if (!targetItem) {
      setError('Could not find image to process.')
      return
    }

    try {
      setIsGenerating(true)
      
      // Call remove background API
      const response = await fetch('/api/image-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify({
          operation: 'remove-bg',
          image_url: targetItem.image_url,
        }),
      })

      if (!response.ok) throw new Error('Remove background failed')

      const data = await response.json()
      if (!data.image_url) throw new Error('No image returned from remove background')

      // Upload if needed
      let imageUrl = data.image_url
      if (imageUrl.startsWith('data:')) {
        const imgResponse = await fetch(imageUrl)
        const blob = await imgResponse.blob()
        const file = new File([blob], `remove-bg-${Date.now()}.png`, { type: 'image/png' })
        const uploadResult = await uploadFileToCloud(file, userId)
        imageUrl = uploadResult.url
      }

      // Get image dimensions
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })

      // Update the item with the result
      await handleItemUpdate(itemId, {
        image_url: imageUrl,
        width: img.width,
        height: img.height,
        metadata: {
          ...(targetItem.metadata || {}),
          original_image_url: targetItem.image_url, // Backup original
          background_removed_at: new Date().toISOString(),
        },
      })

      setError('')
    } catch (error) {
      console.error('Error removing background:', error)
      setError('Failed to remove background. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [userId, projectId, items, handleItemUpdate])

  // Handle inpainting with mask
  const handleInpaint = useCallback(async (itemId, maskDataUrl) => {
    if (!userId || !projectId || !itemId) return

    const targetItem = items.find(item => item.id === itemId)
    if (!targetItem) {
      setError('Could not find image to inpaint.')
      return
    }

    try {
      setIsGenerating(true)
      
      // Call inpainting API
      const response = await fetch('/api/image-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify({
          operation: 'inpaint',
          base_image_url: targetItem.image_url,
          mask_image_url: maskDataUrl, // Base64 data URL of the mask
          prompt: 'fill the erased area seamlessly', // Optional prompt for generation
        }),
      })

      if (!response.ok) throw new Error('Inpaint failed')

      // Stream the result (for now, just get the final image)
      const data = await response.json()
      if (!data.image_url) throw new Error('No image returned from inpaint')

      // Upload if needed
      let imageUrl = data.image_url
      if (imageUrl.startsWith('data:')) {
        const imgResponse = await fetch(imageUrl)
        const blob = await imgResponse.blob()
        const file = new File([blob], `inpaint-${Date.now()}.png`, { type: 'image/png' })
        const uploadResult = await uploadFileToCloud(file, userId)
        imageUrl = uploadResult.url
      }

      // Get image dimensions
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })

      // Update the item with the inpainted result
      // Keep original as backup in metadata
      await handleItemUpdate(itemId, {
        image_url: imageUrl,
        width: img.width,
        height: img.height,
        metadata: {
          ...(targetItem.metadata || {}),
          original_image_url: targetItem.image_url, // Backup original
          inpainted_at: new Date().toISOString(),
        },
      })

      // Clear eraser mode
      setEraserMode(false)
      setEraserTargetId(null)
      setMaskCanvas(null)
      setMaskPath([])
      setError('')
    } catch (error) {
      console.error('Error inpainting:', error)
      setError('Failed to inpaint image. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [userId, projectId, items, handleItemUpdate])

  // Create loop handler
  const handleCreateLoop = useCallback(async (itemId) => {
    if (!userId || !projectId || !itemId) return

    const targetItem = items.find(item => item.id === itemId)
    if (!targetItem) {
      setError('Could not find image to process.')
      return
    }

    try {
      setIsGenerating(true)
      
      const response = await fetch('/api/image-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify({
          operation: 'loop',
          image_url: targetItem.image_url,
          motion_direction: 'zoom',
        }),
      })

      if (!response.ok) throw new Error('Loop creation failed')

      const data = await response.json()
      if (!data.image_url) throw new Error('No image returned from loop')

      // Upload if needed
      let imageUrl = data.image_url
      if (imageUrl.startsWith('data:')) {
        const imgResponse = await fetch(imageUrl)
        const blob = await imgResponse.blob()
        const file = new File([blob], `loop-${Date.now()}.gif`, { type: 'image/gif' })
        const uploadResult = await uploadFileToCloud(file, userId)
        imageUrl = uploadResult.url
      }

      // Update the item with the loop result
      await handleItemUpdate(itemId, {
        image_url: imageUrl,
        name: `${targetItem.name || 'Image'} (Loop)`,
      })

      setError('')
    } catch (error) {
      console.error('Error creating loop:', error)
      setError('Failed to create loop. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [userId, projectId, items, handleItemUpdate])

  // Text-to-vector handler
  const handleTextToVector = useCallback(async (text, position) => {
    if (!text.trim() || !userId || !projectId || !position) return

    try {
      setIsGenerating(true)
      
      const response = await fetch('/api/image-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify({
          operation: 'text2svg',
          text: text.trim(),
        }),
      })

      if (!response.ok) throw new Error('Text-to-vector failed')

      const data = await response.json()
      if (!data.svg) throw new Error('No SVG returned from text-to-vector')

      // Create canvas item with SVG
      const maxZIndex = items.length > 0 ? Math.max(...items.map(item => item.z_index || 0), 0) : 0
      const newItem = await createCanvasItem(userId, projectId, {
        image_url: `data:image/svg+xml,${encodeURIComponent(data.svg)}`,
        x_position: position.x,
        y_position: position.y,
        width: 200,
        height: 100,
        name: `Text: ${text.substring(0, 30)}`,
        metadata: {
          is_text_vector: true,
          original_text: text,
        },
        z_index: maxZIndex + 1,
        is_visible: true,
      })

      const newItems = [...items, newItem]
      setItems(newItems)
      saveToHistory(items)
      setTextMode(false)
      setTextInput('')
      setTextPosition(null)
      setError('')
    } catch (error) {
      console.error('Error converting text to vector:', error)
      setError('Failed to convert text to vector. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [userId, projectId, items, saveToHistory])

  // Extract palette handler
  const handleExtractPalette = useCallback(async (itemId) => {
    if (!userId || !projectId || !itemId) return

    const targetItem = items.find(item => item.id === itemId)
    if (!targetItem) {
      setError('Could not find image to process.')
      return
    }

    try {
      setIsGenerating(true)
      
      // Load image and extract colors
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = targetItem.image_url
      })

      // Create canvas to analyze image
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)

      // Get image data and extract dominant colors
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const pixels = imageData.data
      const colorMap = new Map()

      // Sample pixels (every 10th pixel for performance)
      for (let i = 0; i < pixels.length; i += 40) {
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]
        const a = pixels[i + 3]
        
        if (a < 128) continue // Skip transparent pixels

        // Quantize colors to reduce palette size
        const qr = Math.floor(r / 32) * 32
        const qg = Math.floor(g / 32) * 32
        const qb = Math.floor(b / 32) * 32
        const key = `${qr},${qg},${qb}`
        
        colorMap.set(key, (colorMap.get(key) || 0) + 1)
      }

      // Get top 5 colors
      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([key]) => {
          const [r, g, b] = key.split(',').map(Number)
          return `rgb(${r},${g},${b})`
        })

      // Create color swatches as canvas items
      const maxZIndex = items.length > 0 ? Math.max(...items.map(item => item.z_index || 0), 0) : 0
      const newItems = []

      for (let i = 0; i < sortedColors.length; i++) {
        const color = sortedColors[i]
        const svg = `
          <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="${color}" />
          </svg>
        `

        const swatchItem = await createCanvasItem(userId, projectId, {
          image_url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
          x_position: targetItem.x_position + (targetItem.width || 400) + 20,
          y_position: targetItem.y_position + i * 110,
          width: 100,
          height: 100,
          name: `Color ${i + 1}`,
          metadata: {
            is_color_swatch: true,
            color: color,
          },
          z_index: maxZIndex + i + 1,
          is_visible: true,
        })
        newItems.push(swatchItem)
      }

      const updatedItems = [...items, ...newItems]
      setItems(updatedItems)
      saveToHistory(items)
      setError('')
    } catch (error) {
      console.error('Error extracting palette:', error)
      setError('Failed to extract color palette. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [userId, projectId, items, saveToHistory])

  // Outpaint handler
  const handleOutpaintGenerate = useCallback(async (rect, prompt) => {
    if (!userId || !projectId || !rect || !prompt) return

    try {
      setIsGenerating(true)
      
      // Get the base image (use selected item or first item)
      const baseItem = selectedItem || items[0]
      if (!baseItem) {
        setError('No image found for outpainting.')
        return
      }

      const response = await fetch('/api/image-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify({
          operation: 'outpaint',
          image_url: baseItem.image_url,
          prompt: prompt,
          crop_x: rect.x,
          crop_y: rect.y,
          crop_width: rect.width,
          crop_height: rect.height,
        }),
      })

      if (!response.ok) throw new Error('Outpaint failed')

      const data = await response.json()
      if (!data.image_url) throw new Error('No image returned from outpaint')

      // Upload if needed
      let imageUrl = data.image_url
      if (imageUrl.startsWith('data:')) {
        const imgResponse = await fetch(imageUrl)
        const blob = await imgResponse.blob()
        const file = new File([blob], `outpaint-${Date.now()}.png`, { type: 'image/png' })
        const uploadResult = await uploadFileToCloud(file, userId)
        imageUrl = uploadResult.url
      }

      // Get image dimensions
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })

      // Create new outpainted item
      const maxZIndex = items.length > 0 ? Math.max(...items.map(item => item.z_index || 0), 0) : 0
      const newItem = await createCanvasItem(userId, projectId, {
        image_url: imageUrl,
        x_position: rect.x,
        y_position: rect.y,
        width: img.width,
        height: img.height,
        name: `Outpaint: ${prompt.substring(0, 30)}`,
        metadata: {
          is_outpaint: true,
          prompt: prompt,
        },
        z_index: maxZIndex + 1,
        is_visible: true,
      })

      const newItems = [...items, newItem]
      setItems(newItems)
      saveToHistory(items)
      setOutpaintMode(false)
      setOutpaintRect(null)
      setError('')
    } catch (error) {
      console.error('Error outpainting:', error)
      setError('Failed to outpaint image. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [userId, projectId, items, selectedItem, saveToHistory])

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuPosition.visible && !e.target.closest('.context-menu')) {
        setContextMenuPosition({ x: 0, y: 0, visible: false, itemId: null })
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [contextMenuPosition.visible])

  // Handle click in blend mode
  useEffect(() => {
    if (!blendMode || !blendSourceId) return

    // When an item is selected in blend mode, blend it with the source
    if (selectedItemId && selectedItemId !== blendSourceId) {
      handleBlend(blendSourceId, selectedItemId)
    } else if (selectedItemId === blendSourceId) {
      setError('Cannot blend an image with itself. Click on a different image.')
      setBlendMode(false)
      setBlendSourceId(null)
    }
  }, [blendMode, blendSourceId, selectedItemId, handleBlend])

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

        const maxZIndex = items.length > 0 ? Math.max(...items.map(item => item.z_index || 0), 0) : 0
        const newItem = await createCanvasItem(userId, projectId, {
          image_url: imageUrl,
          x_position: centerX - 200,
          y_position: centerY - 200,
          width: 400,
          height: 400,
          name: `Generated: ${prompt.substring(0, 30)}`,
          prompt: finalPrompt,
          description: `Model: ${selectedModel}${selectedStyle ? `, Style: ${selectedStyle.name}` : ''}`,
          z_index: maxZIndex + 1,
          is_visible: true,
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
    if (!selectedItemId || !items || !Array.isArray(items)) return
    const selectedItem = items.find((item) => item.id === selectedItemId)
    if (!selectedItem) return

    setIsGenerating(true)
    try {
      const basePrompt = selectedItem.prompt || 'interior design'
      let prompt = newPrompt || `${basePrompt}${newPrompt ? ' with modifications' : ''}`
      
      // Apply style if selected
      if (selectedStyle) {
        prompt = `${prompt}, ${selectedStyle.prompt_suffix}`
      }

      // Use selected item as reference if no reference image set
      let refImage = referenceImage || (selectedItem?.image_url || null)
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

          const maxZIndex = items.length > 0 ? Math.max(...items.map(item => item.z_index || 0), 0) : 0
          const newItem = await createCanvasItem(userId, projectId, {
            image_url: imageUrl,
            x_position: x,
            y_position: y,
            width: 400,
            height: 400,
            name: `Variation ${i + 1}: ${prompt.substring(0, 30)}`,
            prompt: variationPrompt,
            z_index: maxZIndex + i + 1,
            is_visible: true,
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
    if (!items || !Array.isArray(items)) return

    const itemsToAlign = selectedItemIds.size > 0
      ? items.filter(item => selectedItemIds.has(item.id))
      : [items.find(item => item.id === selectedItemId)].filter(Boolean)

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
      {/* Context Menu - Right-click menu */}
      {contextMenuPosition.visible && (
        <div
          className="context-menu fixed z-50 bg-white rounded-lg shadow-lg border border-stone-200 py-1 min-w-[160px]"
          style={{
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              handleContextMenuAction('blend', contextMenuPosition.itemId)
            }}
            className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Blend with...
          </button>
          <div className="border-t border-stone-200 my-1" />
          <button
            onClick={() => {
              handleContextMenuAction('erase', contextMenuPosition.itemId)
            }}
            className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
              <path d="M22 21H7" />
              <path d="m5 11 6 6" />
            </svg>
            Erase / Fill
          </button>
          <div className="border-t border-stone-200 my-1" />
          <button
            onClick={() => {
              handleContextMenuAction('removeBg', contextMenuPosition.itemId)
            }}
            className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <path d="M12 8v8" />
              <path d="M8 12h8" />
            </svg>
            Remove Background
          </button>
          <div className="border-t border-stone-200 my-1" />
          <button
            onClick={() => {
              handleContextMenuAction('extractPalette', contextMenuPosition.itemId)
            }}
            className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.074 2.26-.21" />
            </svg>
            Extract Color Palette
          </button>
          <button
            onClick={() => {
              handleContextMenuAction('loop', contextMenuPosition.itemId)
            }}
            className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4" />
              <path d="M12 18v4" />
              <path d="M4.93 4.93l2.83 2.83" />
              <path d="M16.24 16.24l2.83 2.83" />
              <path d="M2 12h4" />
              <path d="M18 12h4" />
              <path d="M4.93 19.07l2.83-2.83" />
              <path d="M16.24 7.76l2.83-2.83" />
            </svg>
            Create Loop (GIF)
          </button>
          {selectedItemIds.size >= 1 && (
            <>
              <div className="border-t border-stone-200 my-1" />
              <button
                onClick={() => {
                  handleContextMenuAction('compare', contextMenuPosition.itemId)
                }}
                className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="12" y1="3" x2="12" y2="21" />
                </svg>
                Compare Mode
              </button>
            </>
          )}
        </div>
      )}

      {/* Blend Mode Indicator */}
      {blendMode && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 shadow-lg">
          <p className="text-sm text-blue-700">
            Blend mode active: Click on another image to blend with the selected one
            <button
              onClick={() => {
                setBlendMode(false)
                setBlendSourceId(null)
                setError('')
              }}
              className="ml-2 text-blue-500 hover:text-blue-700"
            >
              Cancel
            </button>
          </p>
        </div>
      )}

      {/* Eraser Mode Indicator */}
      {eraserMode && eraserTargetId && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 shadow-lg">
          <p className="text-sm text-orange-700">
            Eraser mode: Paint over the area to erase/fill. Press <kbd className="px-1.5 py-0.5 bg-white border border-orange-300 rounded text-xs">Enter</kbd> to apply, <kbd className="px-1.5 py-0.5 bg-white border border-orange-300 rounded text-xs">Esc</kbd> to cancel
            <button
              onClick={() => {
                setEraserMode(false)
                setEraserTargetId(null)
                setMaskCanvas(null)
                setMaskPath([])
                setError('')
              }}
              className="ml-2 text-orange-500 hover:text-orange-700"
            >
              Cancel
            </button>
          </p>
        </div>
      )}

      {/* Outpaint Mode Indicator */}
      {outpaintMode && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 shadow-lg">
          <p className="text-sm text-purple-700">
            Outpaint mode: Draw a rectangle and describe the area. Press <kbd className="px-1.5 py-0.5 bg-white border border-purple-300 rounded text-xs">Esc</kbd> to cancel
            <button
              onClick={() => {
                setOutpaintMode(false)
                setOutpaintRect(null)
                setError('')
              }}
              className="ml-2 text-purple-500 hover:text-purple-700"
            >
              Cancel
            </button>
          </p>
        </div>
      )}

      {/* Dimension Mode Indicator */}
      {dimensionMode && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-50 border border-green-200 rounded-lg px-4 py-2 shadow-lg">
          <p className="text-sm text-green-700">
            Dimension mode: Click two points to measure distance. Press <kbd className="px-1.5 py-0.5 bg-white border border-green-300 rounded text-xs">M</kbd> to start, <kbd className="px-1.5 py-0.5 bg-white border border-green-300 rounded text-xs">Esc</kbd> to cancel
            {dimensionLines.length > 0 && (
              <button
                onClick={saveDimensionLines}
                className="ml-3 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                Save {dimensionLines.length} measurement{dimensionLines.length > 1 ? 's' : ''}
              </button>
            )}
            <button
              onClick={() => {
                setDimensionMode(false)
                setDimensionStartPos(null)
                setDimensionEndPos(null)
                setDimensionLines([])
                setError('')
              }}
              className="ml-2 text-green-500 hover:text-green-700"
            >
              Cancel
            </button>
          </p>
        </div>
      )}

      {/* Text Mode Indicator */}
      {textMode && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 shadow-lg">
          <p className="text-sm text-purple-700">
            Text mode: Click on canvas to place text, then type and press Enter. Press <kbd className="px-1.5 py-0.5 bg-white border border-purple-300 rounded text-xs">T</kbd> to start, <kbd className="px-1.5 py-0.5 bg-white border border-purple-300 rounded text-xs">Esc</kbd> to cancel
            {textPosition && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && textInput.trim()) {
                      handleTextToVector(textInput, textPosition)
                    }
                  }}
                  placeholder="Enter text..."
                  className="flex-1 px-3 py-1.5 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (textInput.trim()) {
                      handleTextToVector(textInput, textPosition)
                    }
                  }}
                  disabled={!textInput.trim() || isGenerating}
                  className="px-4 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            )}
            <button
              onClick={() => {
                setTextMode(false)
                setTextInput('')
                setTextPosition(null)
                setError('')
              }}
              className="ml-2 text-purple-500 hover:text-purple-700"
            >
              Cancel
            </button>
          </p>
        </div>
      )}

      {/* Budget Mode Indicator */}
      {budgetStickers.length > 0 && (
        <div className="fixed top-4 right-4 z-50 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 shadow-lg">
          <p className="text-sm text-yellow-700">
            Budget stickers: {budgetStickers.length} active
          </p>
        </div>
      )}

      {/* Mask Drawing Overlay UI Controls */}
      {eraserMode && eraserTargetId && (() => {
        const targetItem = items.find(item => item.id === eraserTargetId)
        if (!targetItem) return null

        return (
          <MaskDrawingOverlay
            item={targetItem}
            stageRef={stageRef}
            maskLayerRef={maskLayerRef}
            onMaskComplete={(maskDataUrl) => handleInpaint(eraserTargetId, maskDataUrl)}
            onCancel={() => {
              setEraserMode(false)
              setEraserTargetId(null)
              setMaskCanvas(null)
              setMaskPath([])
              // Clear mask layer
              if (maskLayerRef.current) {
                maskLayerRef.current.destroyChildren()
                maskLayerRef.current.draw()
              }
            }}
            zoom={canvasState.zoom}
            brushSize={eraserBrushSize}
            setBrushSize={setEraserBrushSize}
          />
        )
      })()}

      {/* Popup Menu - Appears when item is selected */}
      {popupMenuPosition.visible && selectedItem && (
        <div
          className="popup-menu fixed z-50 bg-white rounded-lg shadow-lg border border-stone-200 py-1 min-w-[200px]"
          style={{
            left: `${popupMenuPosition.x}px`,
            top: `${popupMenuPosition.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {popupMenuPosition.showAdjustments ? (
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-stone-700">Color Adjustments</h3>
                <button
                  onClick={() => setPopupMenuPosition({ ...popupMenuPosition, showAdjustments: false })}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
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
                    handleItemUpdate(selectedItem.id, { adjustments })
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
                    handleItemUpdate(selectedItem.id, { adjustments })
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
                    handleItemUpdate(selectedItem.id, { adjustments })
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-stone-600 mb-1 block">Hue</label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={selectedItem.adjustments?.hue || 0}
                  onChange={(e) => {
                    const adjustments = { ...(selectedItem.adjustments || {}), hue: parseInt(e.target.value) }
                    handleItemUpdate(selectedItem.id, { adjustments })
                  }}
                  className="w-full"
                />
                <div className="text-xs text-stone-400 mt-1">{selectedItem.adjustments?.hue || 0}°</div>
              </div>
            </div>
          ) : (
            <>
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
                onClick={() => {
                  setPopupMenuPosition({ ...popupMenuPosition, showAdjustments: true })
                }}
                className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                  <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                  <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                  <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.074 2.26-.21" />
                  <path d="M19.79 10.27c.69-.38 1.21-1.12 1.21-2.02 0-1.24-1.01-2.25-2.25-2.25-.9 0-1.64.52-2.02 1.21" />
                  <path d="M19.79 10.27c.69.38 1.21 1.12 1.21 2.02 0 1.24-1.01 2.25-2.25 2.25-.9 0-1.64-.52-2.02-1.21" />
                </svg>
                Color Adjustments
              </button>
              <button
                onClick={async () => {
                  if (!selectedItem) return
                  await handleUpscale(selectedItem.id, 2)
                }}
                className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upscale 2×
              </button>
              <button
                onClick={async () => {
                  if (!selectedItem) return
                  await handleUpscale(selectedItem.id, 4)
                }}
                className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upscale 4×
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
            </>
          )}
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
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {/* Grid Background - CSS-based, fixed to viewport, behind Stage */}
          {canvasState.gridEnabled && dimensions.width > 0 && dimensions.height > 0 && (() => {
            // Convert grid size based on unit
            let baseGridSize = canvasState.gridSize || 20
            if (canvasState.gridUnit === 'in') {
              baseGridSize = baseGridSize * 96 // 1 inch = 96px at 96 DPI
            } else if (canvasState.gridUnit === 'cm') {
              baseGridSize = baseGridSize * 37.8 // 1 cm ≈ 37.8px at 96 DPI
            }
            
            // Calculate grid spacing in screen pixels (scales with zoom)
            const screenGridSize = baseGridSize * canvasState.zoom
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
              draggable={!outpaintMode && !dimensionMode && !textMode}
              onDrag={handleStageDrag}
              onDragEnd={handleStageDragEnd}
              onWheel={handleWheel}
              onMouseDown={outpaintMode ? handleOutpaintMouseDown : dimensionMode ? handleDimensionClick : undefined}
              onMouseMove={outpaintMode ? handleOutpaintMouseMove : undefined}
              onMouseUp={outpaintMode ? handleOutpaintMouseUp : undefined}
              onClick={(e) => {
                if (e.target === e.target.getStage()) {
                  if (blendMode) {
                    // Cancel blend mode if clicking on empty canvas
                    setBlendMode(false)
                    setBlendSourceId(null)
                    setError('')
                  }
                  if (textMode) {
                    const pos = stageRef.current?.getPointerPosition()
                    if (pos) {
                      const stage = stageRef.current
                      const worldX = (pos.x - stage.x()) / stage.scaleX()
                      const worldY = (pos.y - stage.y()) / stage.scaleY()
                      setTextPosition({ x: worldX, y: worldY })
                      setError('Enter text and press Enter to create vector text')
                    }
                  }
                  if (!outpaintMode && !dimensionMode && !textMode) {
                    setSelectedItemId(null)
                    setPopupMenuPosition({ x: 0, y: 0, visible: false })
                  }
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
                  if (!stage || !items || !Array.isArray(items)) return items || []

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
                        if (blendMode && blendSourceId && !isMulti) {
                          // In blend mode, clicking an item triggers blend
                          if (item.id !== blendSourceId) {
                            handleBlend(blendSourceId, item.id)
                          } else {
                            setError('Cannot blend an image with itself. Click on a different image.')
                            setBlendMode(false)
                            setBlendSourceId(null)
                          }
                          return
                        }
                        
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
                      onContextMenu={(e, itemId) => {
                        e.evt.preventDefault()
                        const stage = stageRef.current
                        if (!stage) return
                        const pointer = stage.getPointerPosition()
                        if (pointer) {
                          setContextMenuPosition({
                            x: pointer.x,
                            y: pointer.y,
                            visible: true,
                            itemId: itemId,
                          })
                        }
                      }}
                      showMeasurements={canvasState.showMeasurements}
                      zoom={canvasState.zoom}
                      blendMode={blendMode}
                    />
                  ))
                })()}
              </Layer>

              {/* Mask Drawing Layer - Only visible in eraser mode */}
              {eraserMode && eraserTargetId && (
                <Layer ref={maskLayerRef} name="mask-layer" listening={false} />
              )}

              {/* Dimension Lines Layer */}
              {dimensionMode && (
                <Layer>
                  {dimensionStartPos && (
                    <Circle
                      x={dimensionStartPos.x}
                      y={dimensionStartPos.y}
                      radius={5}
                      fill="#3b82f6"
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  )}
                  {dimensionLines.map((line) => {
                    const dx = line.endX - line.startX
                    const dy = line.endY - line.startY
                    const length = Math.sqrt(dx * dx + dy * dy)
                    const angle = Math.atan2(dy, dx) * (180 / Math.PI)

                    return (
                      <Group key={line.id} x={line.startX} y={line.startY} rotation={angle}>
                        <Line
                          points={[0, 0, length, 0]}
                          stroke="#3b82f6"
                          strokeWidth={2}
                          lineCap="round"
                        />
                        <Text
                          x={length / 2}
                          y={-20}
                          text={line.distance}
                          fontSize={12}
                          fill="#1f2937"
                          fontStyle="bold"
                          align="center"
                          offsetX={line.distance.length * 3}
                        />
                        {/* Arrow heads */}
                        <Line points={[0, 0, 10, -5]} stroke="#3b82f6" strokeWidth={2} lineCap="round" />
                        <Line points={[0, 0, 10, 5]} stroke="#3b82f6" strokeWidth={2} lineCap="round" />
                        <Line points={[length, 0, length - 10, -5]} stroke="#3b82f6" strokeWidth={2} lineCap="round" />
                        <Line points={[length, 0, length - 10, 5]} stroke="#3b82f6" strokeWidth={2} lineCap="round" />
                      </Group>
                    )
                  })}
                </Layer>
              )}

              {/* Text Position Indicator */}
              {textMode && textPosition && (
                <Layer>
                  <Circle
                    x={textPosition.x}
                    y={textPosition.y}
                    radius={5}
                    fill="#8b5cf6"
                    stroke="#fff"
                    strokeWidth={2}
                  />
                </Layer>
              )}
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

            {/* Undo/Redo Buttons */}
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo (Cmd/Ctrl+Z)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-600">
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
              </svg>
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo (Cmd/Ctrl+Shift+Z)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-600">
                <path d="M21 7v6h-6" />
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
              </svg>
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-stone-200" />

            {/* Tool Buttons */}
            <button
              onClick={() => {
                setDimensionMode(true)
                setError('Dimension mode: Click two points to measure distance. Press M to start.')
              }}
              className={`p-2 rounded-full hover:bg-stone-100 text-stone-600 hover:text-stone-800 transition-colors ${
                dimensionMode ? 'bg-stone-100' : ''
              }`}
              title="Dimension Tool (M)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <path d="M3 12l4-4" />
                <path d="M3 12l4 4" />
                <path d="M21 12l-4-4" />
                <path d="M21 12l-4 4" />
                <line x1="12" y1="3" x2="12" y2="21" />
              </svg>
            </button>
            <button
              onClick={() => {
                setTextMode(true)
                setError('Text mode: Click on canvas to place text, then type and press Enter')
              }}
              className={`p-2 rounded-full hover:bg-stone-100 text-stone-600 hover:text-stone-800 transition-colors ${
                textMode ? 'bg-stone-100' : ''
              }`}
              title="Text Tool (T)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20h16" />
                <path d="M6 4v8a6 6 0 0 0 12 0V4" />
                <line x1="6" y1="4" x2="6" y2="20" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                const stage = stageRef.current
                if (stage) {
                  const pos = stage.getPointerPosition()
                  if (pos) {
                    const worldX = (pos.x - stage.x()) / stage.scaleX()
                    const worldY = (pos.y - stage.y()) / stage.scaleY()
                    createBudgetSticker({ x: worldX, y: worldY })
                  } else {
                    // Fallback to center
                    const canvasWidth = dimensions.width * 4
                    const canvasHeight = dimensions.height * 4
                    createBudgetSticker({ x: canvasWidth / 2, y: canvasHeight / 2 })
                  }
                }
              }}
              className="p-2 rounded-full hover:bg-stone-100 text-stone-600 hover:text-stone-800 transition-colors"
              title="Budget Sticker (B)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
            </button>

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
              <>
                <button
                  onClick={() => setShowLayersPanel(!showLayersPanel)}
                  className="p-2 rounded-full hover:bg-stone-100 text-stone-600 hover:text-stone-800 transition-colors"
                  title="Layers"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </button>
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
              </>
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
                    const maxZIndex = items.length > 0 ? Math.max(...items.map(item => item.z_index || 0), 0) : 0
                    const newItem = await createCanvasItem(userId, projectId, {
                      image_url: asset.url,
                      x_position: centerX - 200,
                      y_position: centerY - 200,
                      width: 400,
                      height: 400,
                      name: asset.name || 'Asset',
                      description: asset.description,
                      z_index: maxZIndex + 1,
                      is_visible: true,
                    })
                    console.log('Asset added successfully:', newItem)
                    const newItems = [...items, newItem]
                    setItems(newItems)
                    saveToHistory(items) // Save state before adding asset
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

      {/* Canvas Export Modal */}
      {showExportModal && (
        <CanvasExportModal
          items={items}
          selectedItemIds={selectedItemIds}
          stageRef={stageRef}
          dimensions={dimensions}
          canvasState={canvasState}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Layers Panel */}
      <LayersPanel
        items={items}
        selectedItemId={selectedItemId}
        onSelectItem={(itemId) => setSelectedItemId(itemId)}
        onReorderItems={handleReorderLayers}
        onToggleVisibility={handleToggleVisibility}
        onToggleLock={handleToggleLock}
        onOpacityChange={handleOpacityChange}
        onDeleteItem={handleItemDelete}
        isOpen={showLayersPanel}
        onClose={() => setShowLayersPanel(false)}
      />

      {/* Mini-map */}
      {showMinimap && dimensions.width > 0 && (
        <div className="fixed bottom-4 right-4 z-40 bg-white/95 backdrop-blur-sm rounded-lg border border-stone-200 shadow-lg p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-stone-600">Mini-map</span>
            <button
              onClick={() => setShowMinimap(false)}
              className="text-stone-400 hover:text-stone-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <canvas
            ref={minimapCanvasRef}
            onClick={handleMinimapClick}
            className="cursor-pointer border border-stone-200 rounded"
            style={{ width: '150px', height: '150px' }}
          />
        </div>
      )}

      {/* Prompt History Drawer */}
      {showPromptHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPromptHistory(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-stone-200">
              <h2 className="text-xl font-semibold text-stone-800">Prompt History</h2>
              <p className="text-sm text-stone-500 mt-1">Press Cmd/Ctrl + P to open</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {promptHistory.length === 0 ? (
                <div className="text-center py-12 text-stone-500">
                  <p className="text-sm">No prompt history yet</p>
                  <p className="text-xs mt-1">Your prompts will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {promptHistory.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setGeneratePrompt(prompt)
                        setChatInput(prompt)
                        setShowPromptHistory(false)
                        setShowGenerateModal(true)
                      }}
                      className="w-full text-left px-4 py-3 rounded-lg border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-colors"
                    >
                      <p className="text-sm text-stone-700 line-clamp-2">{prompt}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-stone-200 flex items-center justify-end">
              <button
                onClick={() => {
                  setPromptHistory([])
                  localStorage.removeItem('ature-prompt-history')
                }}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                disabled={promptHistory.length === 0}
              >
                Clear History
              </button>
              <button
                onClick={() => setShowPromptHistory(false)}
                className="ml-3 px-4 py-2 text-sm bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
