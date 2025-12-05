import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Stage, Layer, Image as KonvaImage, Group, Rect, Text, Circle, Line, Arrow, Transformer } from 'react-konva'
import { useAuth, useClerk } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import Konva from 'konva'
import useImage from 'use-image'
import AssetLibrary from './AssetLibrary'
import ExportModal from './ExportModal'
import CanvasExportModal from './CanvasExportModal'
import LayersPanel from './LayersPanel'
import { getCanvasData, saveCanvasState, createCanvasItem as apiCreateCanvasItem, updateCanvasItem as apiUpdateCanvasItem, deleteCanvasItem as apiDeleteCanvasItem } from '../utils/canvasManager'
import { getProject, saveProject, getProjects, getAssets, addAssetToLibrary } from '../utils/projectManager'
import { uploadFileToCloud } from '../utils/cloudProjectManager'
import { saveHistoryToDB, loadHistoryFromDB } from '../utils/historyManager'
import Folder from './Folder'
import ShareModal from './ShareModal'
import ProjectMetadataForm from './ProjectMetadataForm'
import VariationsView from './VariationsView'
import VariationsComparisonView from './VariationsComparisonView'
import { useCanvasHotkeys } from '../hooks/useCanvasHotkeys'
import { useCanvasSelection } from '../hooks/useCanvasSelection'
import { useCanvasHistory } from '../hooks/useCanvasHistory'
// Canvas Engine imports
import { useCanvasStore } from '../stores/useCanvasStore'
import { useCanvasSync } from '../hooks/useCanvasSync'
import { useCanvasRealtime } from '../hooks/useCanvasRealtime'
import { toWorld, getWorldPointerPosition } from '../utils/coordinateSystem'
import { useViewportCulling } from '../hooks/useViewportCulling'
import { useCanvasInteractions } from '../hooks/useCanvasInteractions'
import { useSmartSnapping } from '../hooks/useSmartSnapping'
import { InfiniteGrid } from './InfiniteGrid'
import { isValidUUID, generateUUID } from '../utils/uuid'
import { getAuthToken } from '../utils/authToken'
import AIChatBar from './AIChatBar'
import ZoomControls from './ZoomControls'
import PresenceIndicator from './PresenceIndicator'

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

// Canvas Item Component - PERFORMANCE OPTIMIZED
function CanvasItem({ item, isSelected, isMultiSelected, onSelect, onUpdate, onDelete, onContextMenu, onItemClick, showMeasurements, zoom, blendMode, transformerRef }) {
  const [image] = useImage(item.image_url)
  const [isDragging, setIsDragging] = useState(false)
  const shapeRef = useRef(null)
  const imageRef = useRef(null)
  const lastCacheKeyRef = useRef(null)

  // Memoize filter calculations to avoid recalculating every render
  const { filters, brightness, contrast, saturation, hue, cacheKey } = useMemo(() => {
    const adjustments = item.adjustments || {}
    const b = (adjustments.brightness || 1) - 1
    const c = (adjustments.contrast || 1) - 1
    const s = (adjustments.saturation || 1) - 1
    const h = (adjustments.hue || 0) / 180

    const f = []
    if (b !== 0) f.push(Konva.Filters.Brighten)
    if (c !== 0) f.push(Konva.Filters.Contrast)
    if (s !== 0 || h !== 0) f.push(Konva.Filters.HSL)

    // Create a cache key to detect when we need to re-cache
    const key = `${b}-${c}-${s}-${h}`

    return { filters: f, brightness: b, contrast: c, saturation: s, hue: h, cacheKey: key }
  }, [item.adjustments])

  // PERFORMANCE: Cache image with filters only when filters change
  useEffect(() => {
    const imageNode = imageRef.current
    if (!imageNode || !image) return

    // Only re-cache if filters changed
    if (filters.length > 0 && lastCacheKeyRef.current !== cacheKey) {
      // Apply cache after a short delay to batch multiple updates
      const timeoutId = setTimeout(() => {
        imageNode.cache()
        imageNode.getLayer()?.batchDraw()
        lastCacheKeyRef.current = cacheKey
      }, 16) // ~1 frame

      return () => clearTimeout(timeoutId)
    } else if (filters.length === 0 && lastCacheKeyRef.current !== null) {
      // Clear cache if no filters
      imageNode.clearCache()
      lastCacheKeyRef.current = null
    }
  }, [image, filters.length, cacheKey])

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

  // Transform is handled by the Transformer component in the parent
  if (!image) return null

  return (
    <Group
      ref={shapeRef}
      id={`item-${item.id}`}
      x={item.x_position}
      y={item.y_position}
      draggable={!item.is_locked}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        onSelect(e, e.evt.shiftKey)
        // Show context menu on click
        if (onItemClick) {
          onItemClick(e, item.id)
        }
      }}
      onTap={(e) => {
        onSelect(e, e.evt.shiftKey)
        // Show context menu on tap
        if (onItemClick) {
          onItemClick(e, item.id)
        }
      }}
      onContextMenu={(e) => {
        e.evt.preventDefault()
        if (onContextMenu) {
          onContextMenu(e, item.id)
        }
      }}
      // Transform is handled by the Transformer component, not here
      visible={item.is_visible !== false}
      opacity={item.opacity || 1}
      perfectDrawEnabled={false}
    >
      <KonvaImage
        ref={imageRef}
        image={image}
        width={item.width || image.width}
        height={item.height || image.height}
        rotation={item.rotation || 0}
        filters={filters.length > 0 ? filters : undefined}
        brightness={brightness}
        contrast={contrast}
        saturation={saturation}
        hue={hue}
        perfectDrawEnabled={false}
      />
      {/* Visual selection indicator - Transformer handles will show the resize controls */}
    </Group>
  )
}


// UUID validation is now imported from utils/uuid

export default function CanvasView({ projectId, onBack, onSave }) {
  const { userId, isSignedIn, isLoaded: authLoaded } = useAuth()
  const clerk = useClerk()
  const navigate = useNavigate()

  // Wait for Clerk to be fully loaded before using it
  // Note: clerk.getToken doesn't exist directly - it's on clerk.session
  const isClerkReady = authLoaded && clerk && clerk.loaded !== false && clerk.session

  // Import syncQueue for project syncing
  const syncQueueRef = useRef(null)
  useEffect(() => {
    import('../utils/syncQueue').then(module => {
      syncQueueRef.current = module.syncQueue
    })
  }, [])
  const stageRef = useRef(null)
  const containerRef = useRef(null)
  const maskLayerRef = useRef(null)
  const minimapCanvasRef = useRef(null)
  const transformerRef = useRef(null)
  const transformUpdateTimeoutRef = useRef(null)

  // Early return if essential props are missing
  if (!projectId || !userId || !isSignedIn) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-stone-600">Loading canvas...</p>
        </div>
      </div>
    )
  }

  // Canvas state - Using Zustand store (single source of truth)
  const items = useCanvasStore((state) => state.items)
  const setItems = useCanvasStore((state) => state.setItems)
  const addItem = useCanvasStore((state) => state.addItem)
  const updateItem = useCanvasStore((state) => state.updateItem)
  const deleteItem = useCanvasStore((state) => state.deleteItem)
  const camera = useCanvasStore((state) => state.camera)
  const setCamera = useCanvasStore((state) => state.setCamera)
  const dimensions = useCanvasStore((state) => state.dimensions)
  const setDimensions = useCanvasStore((state) => state.setDimensions)
  const settings = useCanvasStore((state) => state.settings)
  const updateSettings = useCanvasStore((state) => state.updateSettings)
  const selection = useCanvasStore((state) => state.selection)
  const setSelection = useCanvasStore((state) => state.setSelection)
  const clearSelection = useCanvasStore((state) => state.clearSelection)
  const interactionMode = useCanvasStore((state) => state.interactionMode)
  const setInteractionMode = useCanvasStore((state) => state.setInteractionMode)
  const showAIPrompt = useCanvasStore((state) => state.ui.showAIPrompt)
  const aiPrompt = useCanvasStore((state) => state.aiPrompt)
  const setAIPrompt = useCanvasStore((state) => state.setAIPrompt)
  const openAIPrompt = useCanvasStore((state) => state.openAIPrompt)
  const closeAIPrompt = useCanvasStore((state) => state.closeAIPrompt)
  const aiSelectionBounds = useCanvasStore((state) => state.aiSelectionBounds)
  
  // Canvas sync hook - handles loading/saving to Supabase
  const { isLoading: isSyncing, syncError } = useCanvasSync(projectId)
  
  // Real-time collaboration hook - enables instant sync and presence
  const { isConnected, onlineUsers } = useCanvasRealtime(projectId)
  
  // Adapter functions that update both local state and sync to database
  const createCanvasItem = useCallback(async (userId, projectId, data, clerk) => {
    // Create item in database first to get proper ID and ensure it's persisted
    // The real-time sync will add it to the store automatically, but we also add it
    // optimistically for immediate UI feedback. The real-time sync will handle deduplication.
    try {
      const newItem = await apiCreateCanvasItem(userId, projectId, data, clerk)
      // Add to store immediately for UI feedback (real-time sync will handle duplicates)
      setItems((prev) => {
        // Check if item already exists (from real-time sync)
        const exists = prev.some((item) => item.id === newItem.id)
        if (exists) return prev
        return [...prev, newItem]
      })
      return newItem
    } catch (error) {
      console.error('Failed to create item in database:', error)
      throw error // Re-throw so caller can handle the error
    }
  }, [setItems])

  const updateCanvasItem = useCallback(async (userId, itemId, updates, clerk) => {
    updateItem(itemId, updates)
    // Sync to database in background
    try {
      await apiUpdateCanvasItem(userId, itemId, updates, clerk)
    } catch (error) {
      console.error('Failed to sync item update to database:', error)
    }
    return { id: itemId, ...updates }
  }, [updateItem])

  const deleteCanvasItem = useCallback(async (userId, itemId, clerk) => {
    deleteItem(itemId)
    // Sync to database in background
    try {
      await apiDeleteCanvasItem(userId, itemId, clerk)
    } catch (error) {
      console.error('Failed to sync item deletion to database:', error)
    }
    return true
  }, [deleteItem])

  // Legacy selection hooks (keeping for compatibility during migration)
  const { selectedItemId, selectedItemIds, setSelectedItemId, setSelectedItemIds, handleSelect } = useCanvasSelection()
  const { history, historyIndex, addToHistory, undo, redo, canUndo, canRedo } = useCanvasHistory(items)
  const [clipboard, setClipboard] = useState(null) // For copy/paste

  // Dimensions are managed in the store, but we need to sync them from containerRef
  const [isGenerating, setIsGenerating] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generatePrompt, setGeneratePrompt] = useState('')
  const [showAssetLibrary, setShowAssetLibrary] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showHistoryPanel, setShowHistoryPanel] = useState(false)
  const [assetHistory, setAssetHistory] = useState([]) // Last 10 assets (uploaded or generated)
  const [generatingVariations, setGeneratingVariations] = useState(false)
  const [variationCount, setVariationCount] = useState(3)
  const uploadingFilesRef = useRef(new Set()) // Track files being uploaded to prevent duplicates

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

  // Outpaint/Dimension/Text Mode State
  const [outpaintMode, setOutpaintMode] = useState(false)
  const [outpaintRect, setOutpaintRect] = useState(null)
  const [dimensionMode, setDimensionMode] = useState(false)
  const [dimensionStartPos, setDimensionStartPos] = useState(null)
  const [dimensionEndPos, setDimensionEndPos] = useState(null)
  const [textMode, setTextMode] = useState(false)
  const [textPosition, setTextPosition] = useState(null)
  const [textInput, setTextInput] = useState('')

  // Budget stickers state
  const [budgetStickers, setBudgetStickers] = useState([])

  // Dimension lines state (for measurements)
  const [dimensionLines, setDimensionLines] = useState([])

  // History state (for undo/redo)
  // History state (for undo/redo) managed by useCanvasHistory hook

  // Compare mode state
  const [compareMode, setCompareMode] = useState(false)
  const [compareItems, setCompareItems] = useState([])
  const [compareSplitPosition, setCompareSplitPosition] = useState(50) // Percentage

  // Style transfer state
  const [showStyleTransfer, setShowStyleTransfer] = useState(false)
  const [styleTransferTargetId, setStyleTransferTargetId] = useState(null)

  // Minimap and prompt history state
  const [showMinimap, setShowMinimap] = useState(false)
  const [showPromptHistory, setShowPromptHistory] = useState(false)
  const [promptHistory, setPromptHistory] = useState([])

  // Project state (keep project and showShareModal as they're used elsewhere)
  const [project, setProject] = useState(null)
  const [showShareModal, setShowShareModal] = useState(false)

  // Initialize loading and error states early to prevent TDZ issues
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [projectNotFound, setProjectNotFound] = useState(false)

  // All projects now use UUIDs - no need for auto-save logic
  // Canvas will work immediately for all projects

  // Undo/Redo handlers - Define early to prevent scope issues
  // Undo/Redo handlers
  const handleUndo = useCallback(() => {
    const prevItems = undo()
    if (prevItems) setItems(prevItems)
  }, [undo, setItems])

  const handleRedo = useCallback(() => {
    const nextItems = redo()
    if (nextItems) setItems(nextItems)
  }, [redo, setItems])

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

  // Calculate visible items count for performance indicator
  const visibleItemsCount = useMemo(() => {
    if (!items || !Array.isArray(items) || !stageRef.current || dimensions.width === 0 || dimensions.height === 0) {
      return items?.length || 0
    }

    const stage = stageRef.current
    const viewport = {
      left: -stage.x() / stage.scaleX(),
      right: (dimensions.width - stage.x()) / stage.scaleX(),
      top: -stage.y() / stage.scaleY(),
      bottom: (dimensions.height - stage.y()) / stage.scaleY(),
    }

    const padding = 200
    return items.filter((item) => {
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
    }).length
  }, [items, dimensions.width, dimensions.height, camera.x, camera.y, camera.zoom])

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
  }, [selectedItemId, camera.x, camera.y, camera.zoom, selectedItem])

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

    // Prevent duplicate uploads - create a unique key for this file upload
    const uploadKey = `${file.name}-${file.size}-${file.lastModified}`
    if (uploadingFilesRef.current.has(uploadKey)) {
      console.log('Upload already in progress for this file, skipping duplicate')
      return
    }

    // Mark file as uploading
    uploadingFilesRef.current.add(uploadKey)

    // CRITICAL: Verify project exists in database before uploading
    try {
      // First, try to verify project exists in database
      // Only verify if clerk is available and ready
      if (isClerkReady && clerk) {
        const { getProject } = await import('../utils/projectManager')
        try {
          const dbProject = await getProject(userId, projectId, clerk)
          console.log('✅ Project verified in database:', projectId)
        } catch (dbError) {
          console.warn('Project not in database, attempting sync...', dbError.message)

          // Project doesn't exist in database - sync it
          const projects = JSON.parse(localStorage.getItem('ature_projects') || '[]')
          const project = projects.find(p => p.id === projectId)

          if (!project) {
            setError('Project not found. Please refresh the page.')
            return
          }

          if (navigator.onLine && clerk && syncQueueRef.current) {
            setError('Syncing project to cloud...')

            // Sync the project
            await syncQueueRef.current.syncProject(projectId, clerk)

            // Wait for sync to complete and verify in database
            let attempts = 0
            const maxAttempts = 20 // 6 seconds total
            let synced = false

            while (attempts < maxAttempts && !synced) {
              await new Promise(resolve => setTimeout(resolve, 300))

              // Try to fetch project from database
              try {
                const { getProject: getProjectCheck } = await import('../utils/projectManager')
                const verifiedProject = await getProjectCheck(userId, projectId, clerk)
                if (verifiedProject && verifiedProject.id === projectId) {
                  synced = true
                  setError('')
                  console.log('✅ Project synced and verified in database')
                  break
                }
              } catch (verifyError) {
                // Project still not in database, keep waiting
                if (attempts === maxAttempts - 1) {
                  console.error('Project sync timeout - project still not in database')
                }
              }

              attempts++
            }

            if (!synced) {
              setError('Project sync is taking longer than expected. Please wait a moment and try again, or refresh the page.')
              return
            }
          } else if (!navigator.onLine) {
            setError('Project needs to be synced to cloud, but you are offline. Please connect to the internet and try again.')
            return
          } else {
            setError('Unable to sync project. Please refresh the page and try again.')
            return
          }
        }
      } else {
        // Clerk not ready - skip verification and try to proceed (will fail at upload if needed)
        console.warn('Clerk not ready, skipping project verification')
      }
    } catch (syncCheckError) {
      console.error('Error checking project sync status:', syncCheckError)
      setError('Error verifying project. Please refresh the page and try again.')
      return
    }

    try {
      setIsGenerating(true)

      // Upload file to cloud - requires clerk instance for authentication
      if (!clerk) {
        setError('Authentication required. Please refresh the page and sign in again.')
        return
      }

      // Verify authentication is ready - use getAuthToken helper
      try {
        const token = await getAuthToken(clerk)
        if (!token) {
          setError('Authentication is not ready. Please wait a moment and try again.')
          return
        }
      } catch (authError) {
        console.error('Auth check error:', authError)
        setError('Authentication error. Please refresh the page and sign in again.')
        return
      }

      const uploadResult = await uploadFileToCloud(file, clerk)
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
      // DEFENSIVE: Ensure items is an array before calling .map()
      const safeItems = Array.isArray(items) ? items : []
      const maxZIndex = safeItems.length > 0 ? Math.max(...safeItems.map(item => item.z_index || 0), 0) : 0

      // Create the item - this will add it to the store and sync to database
      const newItem = await createCanvasItem(userId, projectId, {
        image_url: imageUrl,
        x_position: x - img.width / 2,
        y_position: y - img.height / 2,
        width: img.width,
        height: img.height,
        z_index: maxZIndex + 1,
        is_visible: true,
      }, clerk)

      // Note: createCanvasItem already adds the item to the store via addItem,
      // so we don't need to call setItems here - this was causing duplicates
      // Real-time sync might also add it, but that's handled by duplicate checks

      // Add to history
      setAssetHistory((prev) => {
        const newHistory = [
          { id: newItem.id, image_url: imageUrl, name: file.name || 'Uploaded asset', type: 'uploaded', timestamp: Date.now() },
          ...prev.filter(item => item.id !== newItem.id)
        ].slice(0, 10) // Keep only last 10
        return newHistory
      })

      // Also save to assets library for future reuse
      try {
        await addAssetToLibrary(
          userId,
          file.name || `Uploaded ${new Date().toLocaleDateString()}`,
          imageUrl,
          'image',
          `Uploaded to canvas from device`,
          clerk
        )
        console.log('Asset saved to library:', file.name)
      } catch (assetError) {
        // Don't fail the upload if asset library save fails
        console.warn('Failed to save asset to library:', assetError)
      }

      // Clear upload tracking after successful upload
      uploadingFilesRef.current.delete(uploadKey)
    } catch (error) {
      console.error('Error uploading file:', error)

      // Check if it's a project not found error
      if (error.message?.includes('Project not found') || error.message?.includes('foreign key constraint') || error.message?.includes('does not exist')) {
        setError('Project not synced to cloud. Syncing now... Please try again in a moment.')

        // Try to sync the project
        try {
          if (syncQueueRef.current && clerk) {
            const projects = JSON.parse(localStorage.getItem('ature_projects') || '[]')
            const project = projects.find(p => p.id === projectId)
            if (project) {
              await syncQueueRef.current.syncProject(projectId, clerk)
              // Retry after a short delay
              setTimeout(() => {
                setError('Project synced. Please try uploading again.')
              }, 2000)
            } else {
              setError('Project not found locally. Please refresh the page.')
            }
          } else {
            setError('Project needs to be saved to cloud first. Please save the project and try again.')
          }
        } catch (syncError) {
          console.error('Error syncing project:', syncError)
          setError('Project needs to be saved to cloud first. Please save the project and try again.')
        }
      } else {
        setError('Failed to upload image. Please try again.')
      }
      
      // Clear upload tracking on error as well
      uploadingFilesRef.current.delete(uploadKey)
    } finally {
      setIsGenerating(false)
    }
  }, [userId, projectId, dimensions, items, setItems, setError, setIsGenerating, stageRef, clerk])

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

  // Define loadCanvas before it's used
  const loadCanvas = useCallback(async () => {
    if (!projectId || !userId) {
      console.warn('Cannot load canvas: missing projectId or userId', { projectId, userId })
      setError('Missing project or user information. Please refresh the page.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    // First, check if project exists in database, if not, try to sync it
    if (isClerkReady && clerk) {
      try {
        const { getProject } = await import('../utils/projectManager')
        await getProject(userId, projectId, clerk)
        console.log('✅ Project exists in database')
      } catch (projectError) {
        // Project doesn't exist - try to sync it
        console.warn('Project not in database, attempting to sync...', projectError.message)
        const projects = JSON.parse(localStorage.getItem('ature_projects') || '[]')
        const localProject = projects.find(p => p.id === projectId)

        if (localProject && syncQueueRef.current) {
          try {
            console.log('Syncing project to cloud...')
            await syncQueueRef.current.syncProject(projectId, clerk)
            // Wait a bit for sync to complete
            await new Promise(resolve => setTimeout(resolve, 1000))
          } catch (syncError) {
            console.warn('Project sync failed, continuing with local project:', syncError)
          }
        }
      }
    }

    // Yjs handles data loading automatically via provider
    console.log('Canvas View Initialized with Yjs Store');
    
    // Previous error handling block is removed as it was part of the removed try-catch
    setLoading(false);
  }, [projectId, userId, dimensions.width, dimensions.height, setError, setLoading, updateSettings, setCamera, stageRef])

  // Load canvas data
  // Only reload when projectId or userId changes, not when Clerk state changes
  useEffect(() => {
    if (projectId && userId) {
      loadCanvas()
    }
  }, [projectId, userId, loadCanvas])

  // Update dimensions on resize - fixed size, always full screen
  useEffect(() => {
    const updateDimensions = () => {
      // Always use full viewport size, not container size
      const chatBarHeight = 100 // Account for bottom AI chat bar
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - chatBarHeight,
      })
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // CRITICAL: Sync stage position/scale with camera state
  // This ensures the stage always reflects the camera, regardless of how it was updated
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    // Only update if stage is out of sync (prevents feedback loops)
    const currentX = stage.x()
    const currentY = stage.y()
    const currentZoom = stage.scaleX()
    
    const threshold = 0.01 // Small threshold to avoid jitter
    
    const needsUpdate = 
      Math.abs(currentX - camera.x) > threshold ||
      Math.abs(currentY - camera.y) > threshold ||
      Math.abs(currentZoom - camera.zoom) > threshold

    if (needsUpdate) {
      stage.position({ x: camera.x, y: camera.y })
      stage.scale({ x: camera.zoom, y: camera.zoom })
    }
  }, [camera.x, camera.y, camera.zoom])

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
        setCamera({
          x: initialX,
          y: initialY,
          zoom: 1,
        })
      }
    }
  }, [dimensions.width, dimensions.height, loading])

  // Load styles on mount
  useEffect(() => {
    if (!userId || !clerk?.session) return

    const loadStyles = async () => {
      try {
        const token = await getAuthToken(clerk)
        if (!token) return
        
        const response = await fetch('/api/generate?action=styles', {
          headers: {
            'Authorization': `Bearer ${token}`,
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
  }, [userId, clerk])

  // Attach Transformer to selected item
  useEffect(() => {
    if (transformerRef.current && selectedItemId && !blendMode) {
      const stage = stageRef.current
      if (!stage) return

      // Find the shape node by ID
      const itemsLayer = stage.findOne('.items-layer') || stage.findOne('Layer')
      if (itemsLayer) {
        const shapeNode = itemsLayer.findOne(`#item-${selectedItemId}`)
        if (shapeNode) {
          transformerRef.current.nodes([shapeNode])
          transformerRef.current.getLayer().batchDraw()
        }
      }
    } else if (transformerRef.current && !selectedItemId) {
      // Clear transformer when nothing is selected
      transformerRef.current.nodes([])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [selectedItemId, items, blendMode])

  // Cleanup transform update timeout on unmount
  useEffect(() => {
    return () => {
      if (transformUpdateTimeoutRef.current) {
        clearTimeout(transformUpdateTimeoutRef.current)
      }
    }
  }, [])

  // Save history state - wrapper function for saveHistoryToDB
  const saveToHistory = useCallback(async (itemsToSave) => {
    if (!projectId || !itemsToSave) return

    try {
      // Save to IndexedDB
      await saveHistoryToDB(projectId, {
        items: itemsToSave,
        timestamp: Date.now(),
      })

      // Also update in-memory history for undo/redo
      addToHistory(itemsToSave)
    } catch (error) {
      console.error('Error saving history:', error)
      // Don't throw - history is non-critical
    }
  }, [projectId, historyIndex])

  const saveCanvasStateToServer = useCallback(async () => {
    const currentProjectId = projectId
    if (!currentProjectId || !userId) return

    // Verify project exists in database before saving state
    // Only save if project exists in database (don't save for local-only projects)
    if (isClerkReady && clerk) {
      try {
        const { getProject } = await import('../utils/projectManager')
        await getProject(userId, currentProjectId, clerk)
        // Project exists, proceed with save
      } catch (projectError) {
        // Project not in database - don't try to save state
        // This is expected for local-only projects that haven't been synced yet
        console.log('Project not in database, skipping canvas state save (this is normal for unsynced projects)')
        return
      }
    } else {
      // No clerk instance or not ready - skip save
      console.log('Clerk not ready, skipping canvas state save')
      return
    }

    try {
      const stage = stageRef.current
      if (!stage) return

      const position = stage.position()
      const scale = stage.scaleX()

      await saveCanvasState(userId, projectId, {
        zoom_level: scale,
        pan_x: position.x,
        pan_y: position.y,
        ruler_enabled: settings.rulerEnabled,
        show_measurements: settings.showMeasurements,
        background_color: settings.backgroundColor,
        grid_enabled: settings.gridEnabled,
        grid_size: settings.gridSize,
      }, clerk)
    } catch (error) {
      console.error('Error saving canvas state:', error)
      // Don't show error to user - canvas state save is non-critical
    }
  }, [projectId, userId, camera, settings])

  // Debounced save
  // Yjs handles syncing automatically
  /*
  useEffect(() => {
    const timer = setTimeout(() => {
      saveCanvasStateToServer()
    }, 1000)
    return () => clearTimeout(timer)
  }, [camera, settings, saveCanvasStateToServer])
  */

  const handleItemUpdate = useCallback(async (itemId, updates) => {
    updateItem(itemId, updates)
    // Sync to database in background
    if (userId && clerk) {
      try {
        await apiUpdateCanvasItem(userId, itemId, updates, clerk)
      } catch (error) {
        console.error('Failed to sync item update to database:', error)
      }
    }
  }, [updateItem, userId, clerk])

  const handleItemDelete = useCallback(async (itemId) => {
    // Store the item to delete for potential rollback
    const itemToDelete = items.find(item => item.id === itemId)
    if (!itemToDelete) return
    
    // Delete from store immediately for visual feedback
    deleteItem(itemId)
    
    if (selectedItemId === itemId) {
      setSelectedItemId(null)
    }
    setPopupMenuPosition({ x: 0, y: 0, visible: false })
    
    // Sync to database - ensure deletion completes
    if (userId && clerk) {
      try {
        await apiDeleteCanvasItem(userId, itemId, clerk)
        console.log('Item deleted successfully:', itemId)
        // Don't restore on success - deletion is permanent
      } catch (error) {
        console.error('Failed to sync item deletion to database:', error)
        // Only revert if it's a real error (not a not found error)
        if (error.message && !error.message.includes('not found') && !error.message.includes('404')) {
          // Revert deletion on error - restore item
          addItem(itemToDelete)
        }
      }
    }
  }, [selectedItemId, deleteItem, userId, clerk, items, addItem])

  // Layer panel handlers
  const handleReorderLayers = useCallback((reorderedItems) => {
    // Update Yjs array order and properties
    // Ideally we just update the array order
      setItems(reorderedItems)
    
    // If we rely on z_index property:
    reorderedItems.forEach(item => {
       updateItem(item.id, { z_index: item.z_index })
    })
  }, [])



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

      const token = await getAuthToken(clerk)
      if (!token) throw new Error('Authentication required')

      // Call upscale API
      const response = await fetch('/api/image-editing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
        const uploadResult = await uploadFileToCloud(file, clerk)
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
  }, [userId, projectId, items, handleItemUpdate, clerk])

  const moveToFront = useCallback(async () => {
    if (!selectedItemId || !items || !Array.isArray(items) || items.length === 0) return

    // DEFENSIVE: items is already checked above, but being extra safe
    const safeItems = Array.isArray(items) ? items : []
    const maxZIndex = safeItems.length > 0 ? Math.max(...safeItems.map(item => item.z_index || 0), 0) : 0
    await handleItemUpdate(selectedItemId, { z_index: maxZIndex + 1 })
  }, [selectedItemId, items, handleItemUpdate])

  const moveToBack = useCallback(async () => {
    if (!selectedItemId || !items || !Array.isArray(items) || items.length === 0) return

    // DEFENSIVE: items is already checked above, but being extra safe
    const safeItems = Array.isArray(items) ? items : []
    const minZIndex = safeItems.length > 0 ? Math.min(...safeItems.map(item => item.z_index || 0), 0) : 0
    await handleItemUpdate(selectedItemId, { z_index: minZIndex - 1 })
  }, [selectedItemId, items, handleItemUpdate])

  const handleEdit = useCallback(() => {
    // Open edit modal - use regenerate functionality as "edit"
    setShowGenerateModal(true)
    if (selectedItem && selectedItem.prompt) {
      setGeneratePrompt(selectedItem.prompt)
    }
  }, [selectedItem])

  // Helper: Convert image URL to base64
  const imageToBase64 = useCallback(async (imageUrl) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result
          // Remove data URL prefix if present
          const base64Data = base64.includes(',') ? base64.split(',')[1] : base64
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Error converting image to base64:', error)
      throw error
    }
  }, [])

  // Helper: Capture canvas composite with position data
  const captureCanvasComposite = useCallback(async (roomItem, furnitureItems) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Create a canvas element
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        // Set canvas size to room dimensions
        canvas.width = roomItem.width || 1920
        canvas.height = roomItem.height || 1080
        
        // Load and draw room image
        const roomImg = new Image()
        roomImg.crossOrigin = 'anonymous'
        roomImg.onload = async () => {
          ctx.drawImage(roomImg, 0, 0, canvas.width, canvas.height)
          
          // Draw each furniture piece at its position relative to room
          const furniturePromises = furnitureItems.map(async (furniture) => {
            return new Promise((resolveFurniture) => {
              const furnitureImg = new Image()
              furnitureImg.crossOrigin = 'anonymous'
              furnitureImg.onload = () => {
                // Calculate position relative to room
                const x = furniture.x_position - roomItem.x_position
                const y = furniture.y_position - roomItem.y_position
                
                // Apply rotation if needed
                if (furniture.rotation) {
                  ctx.save()
                  const centerX = x + (furniture.width || 0) / 2
                  const centerY = y + (furniture.height || 0) / 2
                  ctx.translate(centerX, centerY)
                  ctx.rotate((furniture.rotation * Math.PI) / 180)
                  ctx.translate(-centerX, -centerY)
                  ctx.drawImage(
                    furnitureImg,
                    x,
                    y,
                    furniture.width || furnitureImg.width,
                    furniture.height || furnitureImg.height
                  )
                  ctx.restore()
                } else {
                  ctx.drawImage(
                    furnitureImg,
                    x,
                    y,
                    furniture.width || furnitureImg.width,
                    furniture.height || furnitureImg.height
                  )
                }
                resolveFurniture()
              }
              furnitureImg.onerror = () => {
                console.warn('Failed to load furniture image:', furniture.image_url)
                resolveFurniture() // Continue even if one image fails
              }
              furnitureImg.src = furniture.image_url
            })
          })
          
          await Promise.all(furniturePromises)
          
          // Convert canvas to base64
          const base64 = canvas.toDataURL('image/png')
          const base64Data = base64.split(',')[1]
          resolve(base64Data)
        }
        
        roomImg.onerror = () => {
          reject(new Error('Failed to load room image'))
        }
        roomImg.src = roomItem.image_url
      } catch (error) {
        reject(error)
      }
    })
  }, [])

  // Handle blend in - Main workflow for blending furniture into room
  const handleBlendIn = useCallback(async () => {
    if (!userId || !projectId) {
      setError('Missing user or project information. Please refresh the page.')
      return
    }

    // Find room (background layer - usually the first item or largest)
    const sortedItems = [...items].sort((a, b) => (a.z_index || 0) - (b.z_index || 0))
    const roomItem = sortedItems[0] // Lowest z_index is background
    
    if (!roomItem) {
      setError('Please add a room picture first.')
      return
    }

    // Find all furniture pieces (items on top of room)
    const furnitureItems = sortedItems.filter(item => 
      item.id !== roomItem.id && 
      (item.z_index || 0) > (roomItem.z_index || 0)
    )

    if (furnitureItems.length === 0) {
      setError('Please add furniture pieces to blend into the room.')
      return
    }

    try {
      setIsGenerating(true)
      setError('')

      // Save originals to history for undo
      const originals = [roomItem, ...furnitureItems]
      await saveToHistory(originals)

      const token = await getAuthToken(clerk)
      if (!token) throw new Error('Authentication required')

      // Convert room image to base64
      const roomBase64 = await imageToBase64(roomItem.image_url)

      // Capture composite image with furniture positioned
      const compositeBase64 = await captureCanvasComposite(roomItem, furnitureItems)

      // Build position description for AI
      const positionDescriptions = furnitureItems.map((furniture, index) => {
        const x = furniture.x_position - roomItem.x_position
        const y = furniture.y_position - roomItem.y_position
        const relativeX = (x / (roomItem.width || 1920)) * 100
        const relativeY = (y / (roomItem.height || 1080)) * 100
        return `Furniture ${index + 1} is positioned at ${Math.round(relativeX)}% from left and ${Math.round(relativeY)}% from top of the room image.`
      }).join(' ')

      // Call Gemini API with room + composite + position info
      const response = await fetch('/api/nano-banana/visualize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomBase64: roomBase64,
          furnitureBase64: compositeBase64,
          description: `Blend the furniture pieces into the room image realistically. ${positionDescriptions} Maintain the exact positions shown in the composite image. Add realistic lighting, shadows, and perspective. The furniture should look naturally placed in the room with proper scale and integration.`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Blend failed' }))
        throw new Error(errorData.error?.message || errorData.error || 'Failed to blend images')
      }

      const data = await response.json()
      if (!data.imageUrl) {
        throw new Error('No image returned from blend operation')
      }

      // Upload result if it's a data URL
      let imageUrl = data.imageUrl
      if (imageUrl.startsWith('data:')) {
        const imgResponse = await fetch(imageUrl)
        const blob = await imgResponse.blob()
        const file = new File([blob], `blend-${Date.now()}.png`, { type: 'image/png' })
        const uploadResult = await uploadFileToCloud(file, clerk)
        imageUrl = uploadResult.url
      }

      // Get image dimensions
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })

      // Create new blended item at room position
      const newItem = await createCanvasItem(userId, projectId, {
        image_url: imageUrl,
        x_position: roomItem.x_position,
        y_position: roomItem.y_position,
        width: img.width,
        height: img.height,
        name: `Blended: ${roomItem.name || 'Room'} + ${furnitureItems.length} furniture piece${furnitureItems.length > 1 ? 's' : ''}`,
        z_index: roomItem.z_index || 0,
        is_visible: true,
      }, clerk)

      // Remove originals and add blended result
      const idsToRemove = originals.map(item => item.id)
      for (const id of idsToRemove) {
        await deleteCanvasItem(userId, id, clerk)
      }

      // Update items list
      setItems((prev) => {
        const filtered = prev.filter(item => !idsToRemove.includes(item.id))
        return [...filtered, newItem]
      })

      // Clear selection
      setSelectedItemId(null)
      
      // Clear any error messages - success is indicated by the result appearing on canvas
      setError('')
    } catch (error) {
      console.error('Error blending in:', error)
      setError(error.message || 'Failed to blend images. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [userId, projectId, items, clerk, imageToBase64, captureCanvasComposite, createCanvasItem, deleteCanvasItem, saveToHistory])

  // Handle blend two images (legacy - kept for backward compatibility)
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

      const token = await getAuthToken(clerk)
      if (!token) throw new Error('Authentication required')

      // Call blend API
      const response = await fetch('/api/image-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
        const uploadResult = await uploadFileToCloud(file, clerk)
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

      // Get max z_index for positioning the new blended item
      // DEFENSIVE: Ensure items is an array
      const safeItems = Array.isArray(items) ? items : []
      const maxZIndex = safeItems.length > 0 ? Math.max(...safeItems.map(item => item.z_index || 0), 0) : 0
      const newItem = await createCanvasItem(userId, projectId, {
        image_url: imageUrl,
        x_position: centerX - img.width / 2,
        y_position: centerY - img.height / 2,
        width: img.width,
        height: img.height,
        name: `Blend: ${sourceItem.name || 'Image 1'} + ${targetItem.name || 'Image 2'}`,
        z_index: maxZIndex + 1,
        is_visible: true,
      }, clerk)

      // Delete both original items (deleteCanvasItem already updates the store)
      await deleteCanvasItem(userId, sourceId, clerk)
      await deleteCanvasItem(userId, targetId, clerk)

      // Note: createCanvasItem already adds the new item to the store via addItem,
      // and deleteCanvasItem already removes items from the store,
      // so we don't need to manually update setItems here

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
  }, [userId, projectId, items, clerk])

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
    } else if (action === 'moveToTop') {
      const item = items.find(item => item.id === itemId)
      if (item) {
        const safeItems = Array.isArray(items) ? items : []
        const maxZIndex = safeItems.length > 0 ? Math.max(...safeItems.map(item => item.z_index || 0), 0) : 0
        handleItemUpdate(itemId, { z_index: maxZIndex + 1 })
      }
      setContextMenuPosition({ x: 0, y: 0, visible: false, itemId: null })
    } else if (action === 'moveToBottom') {
      const item = items.find(item => item.id === itemId)
      if (item) {
        const safeItems = Array.isArray(items) ? items : []
        const minZIndex = safeItems.length > 0 ? Math.min(...safeItems.map(item => item.z_index || 0), 0) : 0
        handleItemUpdate(itemId, { z_index: minZIndex - 1 })
      }
      setContextMenuPosition({ x: 0, y: 0, visible: false, itemId: null })
    } else if (action === 'delete') {
      handleItemDelete(itemId)
      setContextMenuPosition({ x: 0, y: 0, visible: false, itemId: null })
    } else if (action === 'download') {
      const item = items.find(item => item.id === itemId)
      if (item && item.image_url) {
        // Fetch the image and create a blob for download
        fetch(item.image_url)
          .then(response => response.blob())
          .then(blob => {
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `image-${itemId}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
          })
          .catch(error => {
            console.error('Error downloading image:', error)
            // Fallback: try direct download
            const link = document.createElement('a')
            link.href = item.image_url
            link.download = `image-${itemId}.png`
            link.target = '_blank'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          })
      }
      setContextMenuPosition({ x: 0, y: 0, visible: false, itemId: null })
    }
  }, [selectedItemIds, items, handleItemUpdate, handleItemDelete])

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

      const token = await getAuthToken(clerk)
      if (!token) throw new Error('Authentication required')

      // Call style transfer API
      const response = await fetch('/api/image-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
        const uploadResult = await uploadFileToCloud(file, clerk)
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
  }, [userId, projectId, items, handleItemUpdate, clerk])

  // Layers Panel Handlers
  const handleReorderItems = useCallback(async (reorderedItems) => {
    // Optimistic update
    setItems(reorderedItems)

    // Update all items in database
    // In a real app, we might want to batch this or only update changed items
    try {
      await Promise.all(reorderedItems.map(item =>
        updateCanvasItem(userId, item.id, { z_index: item.z_index }, clerk)
      ))
    } catch (error) {
      console.error('Error reordering items:', error)
      setError('Failed to save layer order')
      // Revert on error would go here
    }
  }, [userId, items])

  const handleToggleVisibility = useCallback(async (itemId) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const newVisibility = item.is_visible === false ? true : false

    // Optimistic update
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, is_visible: newVisibility } : i
    ))

    try {
      await updateCanvasItem(userId, itemId, { is_visible: newVisibility }, clerk)
    } catch (error) {
      console.error('Error toggling visibility:', error)
    }
  }, [userId, items])

  const handleToggleLock = useCallback(async (itemId) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const newLockState = !item.is_locked

    // Optimistic update
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, is_locked: newLockState } : i
    ))

    try {
      await updateCanvasItem(userId, itemId, { is_locked: newLockState }, clerk)
    } catch (error) {
      console.error('Error toggling lock:', error)
    }
  }, [userId, items])

  const handleOpacityChange = useCallback(async (itemId, opacity) => {
    // Optimistic update
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, opacity } : i
    ))

    // Debounce the API call would be better here, but for now direct update
    try {
      await updateCanvasItem(userId, itemId, { opacity }, clerk)
    } catch (error) {
      console.error('Error updating opacity:', error)
    }
  }, [userId])

  // Keyboard shortcuts handler
  useCanvasHotkeys({
    selectedItemId,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onDelete: (id) => handleItemDelete(id),
    onCopy: (id) => {
      const item = items.find(i => i.id === id)
      if (item) setClipboard(item)
    },
    onPaste: async () => {
      if (clipboard) {
        // Paste logic here or reuse existing handlePaste
        // For now we rely on the native paste event listener below
      }
    },
    onStyleTransfer: (id) => {
      setStyleTransferTargetId(id)
      setShowStyleTransfer(true)
    }
  })

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

      const token = await getAuthToken(clerk)
      if (!token) throw new Error('Authentication required')

      // Call remove background API
      const response = await fetch('/api/image-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
        const file = new File([blob], `remove - bg - ${Date.now()}.png`, { type: 'image/png' })
        const uploadResult = await uploadFileToCloud(file, clerk)
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
  }, [userId, projectId, items, handleItemUpdate, clerk])

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

      const token = await getAuthToken(clerk)
      if (!token) throw new Error('Authentication required')

      // Call inpainting API
      const response = await fetch('/api/image-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
        const file = new File([blob], `inpaint - ${Date.now()}.png`, { type: 'image/png' })
        const uploadResult = await uploadFileToCloud(file, clerk)
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
  }, [userId, projectId, items, handleItemUpdate, clerk])

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

      const token = await getAuthToken(clerk)
      if (!token) throw new Error('Authentication required')

      const response = await fetch('/api/image-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
        const file = new File([blob], `loop - ${Date.now()}.gif`, { type: 'image/gif' })
        const uploadResult = await uploadFileToCloud(file, clerk)
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
  }, [userId, projectId, items, handleItemUpdate, clerk])

  // Text-to-vector handler
  const handleTextToVector = useCallback(async (text, position) => {
    if (!text.trim() || !userId || !projectId || !position) return

    try {
      setIsGenerating(true)

      const token = await getAuthToken(clerk)
      if (!token) throw new Error('Authentication required')

      const response = await fetch('/api/image-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
        image_url: `data: image / svg + xml, ${encodeURIComponent(data.svg)} `,
        x_position: position.x,
        y_position: position.y,
        width: 200,
        height: 100,
        name: `Text: ${text.substring(0, 30)} `,
        metadata: {
          is_text_vector: true,
          original_text: text,
        },
        z_index: maxZIndex + 1,
        is_visible: true,
      }, clerk)

      const newItems = Array.isArray(items) ? [...items, newItem] : [newItem]
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
  }, [userId, projectId, items, saveToHistory, clerk])

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
        const key = `${qr},${qg},${qb} `

        colorMap.set(key, (colorMap.get(key) || 0) + 1)
      }

      // Get top 5 colors
      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([key]) => {
          const [r, g, b] = key.split(',').map(Number)
          return `rgb(${r}, ${g}, ${b})`
        })

      // Create color swatches as canvas items
      const maxZIndex = items.length > 0 ? Math.max(...items.map(item => item.z_index || 0), 0) : 0
      const newItems = []

      for (let i = 0; i < sortedColors.length; i++) {
        const color = sortedColors[i]
        const svg = `
        < svg width = "100" height = "100" xmlns = "http://www.w3.org/2000/svg" >
          <rect width="100" height="100" fill="${color}" />
          </svg >
    `

        const swatchItem = await createCanvasItem(userId, projectId, {
          image_url: `data: image / svg + xml, ${encodeURIComponent(svg)} `,
          x_position: targetItem.x_position + (targetItem.width || 400) + 20,
          y_position: targetItem.y_position + i * 110,
          width: 100,
          height: 100,
          name: `Color ${i + 1} `,
          metadata: {
            is_color_swatch: true,
            color: color,
          },
          z_index: maxZIndex + i + 1,
          is_visible: true,
        }, clerk)
        newItems.push(swatchItem)
      }

      const updatedItems = Array.isArray(items) ? [...items, ...newItems] : newItems
      setItems(updatedItems)
      saveToHistory(items)
      setError('')
    } catch (error) {
      console.error('Error extracting palette:', error)
      setError('Failed to extract color palette. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [userId, projectId, items, saveToHistory, clerk])

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

      const token = await getAuthToken(clerk)
      if (!token) throw new Error('Authentication required')

      const response = await fetch('/api/image-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
        const file = new File([blob], `outpaint - ${Date.now()}.png`, { type: 'image/png' })
        const uploadResult = await uploadFileToCloud(file, clerk)
        imageUrl = uploadResult.url
      }

      // Get image dimensions
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })

      // Get max z_index for new items
      // DEFENSIVE: Ensure items is an array
      const safeItems = Array.isArray(items) ? items : []
      const maxZIndex = safeItems.length > 0 ? Math.max(...safeItems.map(item => item.z_index || 0), 0) : 0
      const newItem = await createCanvasItem(userId, projectId, {
        image_url: imageUrl,
        x_position: rect.x,
        y_position: rect.y,
        width: img.width,
        height: img.height,
        name: `Outpaint: ${prompt.substring(0, 30)} `,
        metadata: {
          is_outpaint: true,
          prompt: prompt,
        },
        z_index: maxZIndex + 1,
        is_visible: true,
      }, clerk)

      const newItems = Array.isArray(items) ? [...items, newItem] : [newItem]
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

    setCamera({
      x: clampedX,
      y: clampedY,
      zoom: scale,
    })
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
    setCamera({
      x: clampedX,
      y: clampedY,
      zoom: scale,
    })
  }, [dimensions.width, dimensions.height])

  // Outpaint mode handlers
  const handleOutpaintMouseDown = useCallback((e) => {
    const stage = stageRef.current
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    const worldX = (pos.x - stage.x()) / stage.scaleX()
    const worldY = (pos.y - stage.y()) / stage.scaleY()

    setOutpaintRect({ x: worldX, y: worldY, width: 0, height: 0 })
  }, [])

  const handleOutpaintMouseMove = useCallback((e) => {
    if (!outpaintRect) return

    const stage = stageRef.current
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    const worldX = (pos.x - stage.x()) / stage.scaleX()
    const worldY = (pos.y - stage.y()) / stage.scaleY()

    setOutpaintRect(prev => ({
      ...prev,
      width: worldX - prev.x,
      height: worldY - prev.y,
    }))
  }, [outpaintRect])

  const handleOutpaintMouseUp = useCallback(() => {
    if (!outpaintRect || outpaintRect.width === 0 || outpaintRect.height === 0) {
      setOutpaintRect(null)
      return
    }
    // Outpaint will be triggered when user provides prompt
  }, [outpaintRect])

  // Dimension mode handler
  const handleDimensionClick = useCallback((e) => {
    const stage = stageRef.current
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    const worldX = (pos.x - stage.x()) / stage.scaleX()
    const worldY = (pos.y - stage.y()) / stage.scaleY()

    if (!dimensionStartPos) {
      setDimensionStartPos({ x: worldX, y: worldY })
      setDimensionEndPos(null)
    } else {
      setDimensionEndPos({ x: worldX, y: worldY })
      // Calculate and display distance
      const dx = worldX - dimensionStartPos.x
      const dy = worldY - dimensionStartPos.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      setError(`Distance: ${Math.round(distance)} px`)

      // Add dimension line to the list
      setDimensionLines(prev => [...prev, {
        id: `dimension - ${Date.now()} -${Math.random()} `,
        startX: dimensionStartPos.x,
        startY: dimensionStartPos.y,
        endX: worldX,
        endY: worldY,
        distance: Math.round(distance),
      }])

      // Reset after a delay
      setTimeout(() => {
        setDimensionStartPos(null)
        setDimensionEndPos(null)
        setDimensionMode(false)
      }, 2000)
    }
  }, [dimensionStartPos])

  // Save dimension lines handler
  const saveDimensionLines = useCallback(() => {
    // Dimension lines are already saved in state
    // This could be extended to save to database or export
    console.log('Dimension lines saved:', dimensionLines)
    setDimensionLines([])
    setDimensionMode(false)
  }, [dimensionLines])

  // Create budget sticker handler
  const createBudgetSticker = useCallback((position) => {
    // Add a budget sticker at the specified position
    // This is a placeholder - implement actual sticker creation logic
    setBudgetStickers(prev => [...prev, {
      id: `budget - ${Date.now()} `,
      x: position.x,
      y: position.y,
      amount: 0,
    }])
  }, [])

  // Minimap click handler
  const handleMinimapClick = useCallback((e) => {
    const canvas = minimapCanvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Convert minimap coordinates to canvas coordinates
    const canvasWidth = dimensions.width * 4
    const canvasHeight = dimensions.height * 4
    const minimapScaleX = canvasWidth / rect.width
    const minimapScaleY = canvasHeight / rect.height

    const canvasX = x * minimapScaleX - dimensions.width / 2
    const canvasY = y * minimapScaleY - dimensions.height / 2

    // Clamp to canvas bounds
    const maxX = canvasWidth - dimensions.width
    const maxY = canvasHeight - dimensions.height
    const clampedX = Math.max(0, Math.min(maxX, canvasX))
    const clampedY = Math.max(0, Math.min(maxY, canvasY))

    stage.position({ x: clampedX, y: clampedY })
    setCamera({
      x: clampedX,
      y: clampedY,
      zoom: camera.zoom,
    })
  }, [dimensions.width, dimensions.height, camera.zoom, setCamera])

  // Use the new canvas interactions hook for zoom-to-cursor and panning
  const {
    handleWheel,
    handleStageMouseDown: handleInteractionsMouseDown,
    handleStageMouseMove: handleInteractionsMouseMove,
    handleStageMouseUp: handleInteractionsMouseUp,
    handleKeyDown: handleInteractionsKeyDown,
    handleKeyUp: handleInteractionsKeyUp,
    isSelecting,
    selectionBox,
    isPanning, // PERFORMANCE: Used to disable listening during pan
  } = useCanvasInteractions(stageRef, dimensions)

  // Use viewport culling for performance
  const visibleItemsFromHook = useViewportCulling(stageRef, 200)

  // Add keyboard event listeners for spacebar panning
  useEffect(() => {
    document.addEventListener('keydown', handleInteractionsKeyDown)
    document.addEventListener('keyup', handleInteractionsKeyUp)
    return () => {
      document.removeEventListener('keydown', handleInteractionsKeyDown)
      document.removeEventListener('keyup', handleInteractionsKeyUp)
    }
  }, [handleInteractionsKeyDown, handleInteractionsKeyUp])

  // Handle selecting reference image from selected item
  const handleSelectReferenceImage = useCallback((imageUrl) => {
    if (imageUrl) {
      setReferenceImage(imageUrl)
    }
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
        finalPrompt = `${prompt}, ${selectedStyle.prompt_suffix} `
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Generation failed' }))
        const error = errorData.error || {}
        
        // Check for quota exceeded error (429)
        if (response.status === 429 || error.code === 'QUOTA_EXCEEDED' || error.message?.includes('quota')) {
          const retryAfter = error.retryAfter || '22'
          throw new Error(`⚠️ API Quota Exceeded: You've reached the free tier limit for Gemini API. Please wait ${retryAfter} seconds before trying again, or upgrade your Google AI Studio plan at https://ai.google.dev/pricing`)
        }
        
        throw new Error(error.message || error || 'Generation failed')
      }

      const data = await response.json()
      if (data.imageUrl) {
        // Upload to cloud if needed
        let imageUrl = data.imageUrl
        if (imageUrl.startsWith('data:')) {
          const imgResponse = await fetch(imageUrl)
          const blob = await imgResponse.blob()
          const file = new File([blob], `canvas - ${Date.now()}.png`, { type: 'image/png' })

          const uploadResult = await uploadFileToCloud(file, clerk)
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

        // DEFENSIVE: Ensure items is an array
        const safeItems = Array.isArray(items) ? items : []
        const maxZIndex = safeItems.length > 0 ? Math.max(...safeItems.map(item => item.z_index || 0), 0) : 0
        const newItem = await createCanvasItem(userId, projectId, {
          image_url: imageUrl,
          x_position: centerX - 200,
          y_position: centerY - 200,
          width: 400,
          height: 400,
          name: `Generated: ${prompt.substring(0, 30)} `,
          prompt: finalPrompt,
          description: `Model: ${selectedModel}${selectedStyle ? `, Style: ${selectedStyle.name}` : ''} `,
          z_index: maxZIndex + 1,
          is_visible: true,
        }, clerk)

        // Note: createCanvasItem already adds the item to the store via addItem,
        // so we don't need to call setItems here - this was causing duplicates
        
        // Add to history
        setAssetHistory((prev) => {
          const newHistory = [
            { id: newItem.id, image_url: imageUrl, name: `Generated: ${prompt.substring(0, 30)}`, type: 'generated', timestamp: Date.now() },
            ...prev.filter(item => item.id !== newItem.id)
          ].slice(0, 10) // Keep only last 10
          return newHistory
        })

        // Save generated image to asset library ("My assets")
        try {
          await addAssetToLibrary(
            userId,
            `Generated: ${prompt.substring(0, 50)}`,
            imageUrl,
            'image',
            `AI-generated image from canvas: ${finalPrompt.substring(0, 100)}`,
            clerk
          )
          console.log('Generated image saved to asset library')
        } catch (assetError) {
          // Don't fail generation if asset library save fails
          console.warn('Failed to save generated image to asset library:', assetError)
        }
        
        setShowGenerateModal(false)
        setGeneratePrompt('')
        setChatInput('')
      }
    } catch (error) {
      console.error('Error generating to canvas:', error)
      
      // Check for quota errors
      if (error.message?.includes('quota') || error.message?.includes('QUOTA_EXCEEDED') || error.code === 429) {
        const retryAfter = error.retryAfter || '22'
        setError(`⚠️ API Quota Exceeded: You've reached the free tier limit for Gemini API. Please wait ${retryAfter} seconds before trying again, or upgrade your Google AI Studio plan at https://ai.google.dev/pricing`)
      } else {
        setError(error.message || 'Failed to generate image. Please try again.')
      }
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
      let prompt = newPrompt || `${basePrompt}${newPrompt ? ' with modifications' : ''} `

      // Apply style if selected
      if (selectedStyle) {
        prompt = `${prompt}, ${selectedStyle.prompt_suffix} `
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Generation failed' }))
        const error = errorData.error || {}
        
        // Check for quota exceeded error (429)
        if (response.status === 429 || error.code === 'QUOTA_EXCEEDED' || error.message?.includes('quota')) {
          const retryAfter = error.retryAfter || '22'
          throw new Error(`⚠️ API Quota Exceeded: You've reached the free tier limit for Gemini API. Please wait ${retryAfter} seconds before trying again, or upgrade your Google AI Studio plan at https://ai.google.dev/pricing`)
        }
        
        throw new Error(error.message || error || 'Generation failed')
      }

      const data = await response.json()
      if (data.imageUrl) {
        // Upload to cloud if needed
        let imageUrl = data.imageUrl
        if (imageUrl.startsWith('data:')) {
          const imgResponse = await fetch(imageUrl)
          const blob = await imgResponse.blob()
          const file = new File([blob], `regenerated - ${Date.now()}.png`, { type: 'image/png' })

          const uploadResult = await uploadFileToCloud(file, clerk)
          imageUrl = uploadResult.url
        }

        // Update the selected item
        await handleItemUpdate(selectedItemId, {
          image_url: imageUrl,
          prompt: prompt,
          description: `Model: ${selectedModel}${selectedStyle ? `, Style: ${selectedStyle.name}` : ''} `,
        })

        // Save regenerated image to asset library ("My assets")
        try {
          await addAssetToLibrary(
            userId,
            `Regenerated: ${prompt.substring(0, 50)}`,
            imageUrl,
            'image',
            `AI-regenerated image from canvas: ${prompt.substring(0, 100)}`,
            clerk
          )
          console.log('Regenerated image saved to asset library')
        } catch (assetError) {
          // Don't fail regeneration if asset library save fails
          console.warn('Failed to save regenerated image to asset library:', assetError)
        }
      }
    } catch (error) {
      console.error('Error regenerating:', error)
      
      // Check for quota errors
      if (error.message?.includes('quota') || error.message?.includes('QUOTA_EXCEEDED') || error.code === 429) {
        const retryAfter = error.retryAfter || '22'
        setError(`⚠️ API Quota Exceeded: You've reached the free tier limit for Gemini API. Please wait ${retryAfter} seconds before trying again, or upgrade your Google AI Studio plan at https://ai.google.dev/pricing`)
      } else {
        setError(error.message || 'Failed to regenerate image. Please try again.')
      }
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
        basePrompt = `${prompt}, ${selectedStyle.prompt_suffix} `
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
            const file = new File([blob], `canvas - variation - ${i + 1} -${Date.now()}.png`, { type: 'image/png' })

            const uploadResult = await uploadFileToCloud(file, clerk)
            imageUrl = uploadResult.url
          }

          // Add to canvas with spacing
          const spacing = 450
          const x = centerX - 200 + (i % 2) * spacing
          const y = centerY - 200 + Math.floor(i / 2) * spacing

          // DEFENSIVE: Ensure items is an array
          const safeItems = Array.isArray(items) ? items : []
          const maxZIndex = safeItems.length > 0 ? Math.max(...safeItems.map(item => item.z_index || 0), 0) : 0
          const newItem = await createCanvasItem(userId, projectId, {
            image_url: imageUrl,
            x_position: x,
            y_position: y,
            width: 400,
            height: 400,
            name: `Variation ${i + 1}: ${prompt.substring(0, 30)} `,
            prompt: variationPrompt,
            z_index: maxZIndex + i + 1,
            is_visible: true,
          }, clerk)

          newItems.push(newItem)

          // Save each variation to asset library ("My assets")
          try {
            await addAssetToLibrary(
              userId,
              `Variation ${i + 1}: ${prompt.substring(0, 50)}`,
              imageUrl,
              'image',
              `AI-generated variation from canvas: ${variationPrompt.substring(0, 100)}`,
              clerk
            )
            console.log(`Variation ${i + 1} saved to asset library`)
          } catch (assetError) {
            // Don't fail generation if asset library save fails
            console.warn(`Failed to save variation ${i + 1} to asset library:`, assetError)
          }
        }
        }

      // Note: createCanvasItem already adds each item to the store via addItem,
      // so we don't need to call setItems here - this was causing duplicates
      if (newItems.length > 0) {
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

  // Load project data for sidebar
  useEffect(() => {
    async function loadProjectData() {
      if (projectId && userId) {
        try {
          let projectData = await getProject(userId, projectId, clerk)

          // CRITICAL FIX: Ensure project exists in cloud before proceeding
          // If we got data from localStorage but it's not in cloud, we must sync it
          if (isClerkReady && clerk) {
            try {
              const { getProjectFromCloud } = await import('../utils/cloudProjectManager')
              try {
                await getProjectFromCloud(clerk, projectId)
              } catch (cloudError) {
                if (cloudError.message?.includes('404') || cloudError.message?.includes('not found')) {
                  console.log('Project found locally but missing in cloud. Syncing now...', projectId)
                  const { saveProject } = await import('../utils/projectManager')
                  await saveProject(userId, projectData.name, projectData.workflow, projectData.spaceId, clerk)
                  // Re-fetch to ensure we have the cloud version
                  projectData = await getProject(userId, projectId, clerk)
                }
              }
            } catch (syncCheckError) {
              console.warn('Failed to check/sync cloud status:', syncCheckError)
            }
          }

          setProject(projectData)
        } catch (error) {
          console.error('Error loading project:', error)
          if (error.message?.includes('not found') || error.message?.includes('404')) {
            setProjectNotFound(true)
          }
        }
      }
    }
    loadProjectData()
  }, [projectId, userId, clerk])


  const getCreations = useCallback(() => {
    if (!project?.workflow) return []
    const creations = []

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
  }, [project])

  // Compute creations - must be defined before return
  // Ensure they always return arrays, never undefined

  const creations = useMemo(() => {
    try {
      return getCreations() || []
    } catch (error) {
      console.error('Error getting creations:', error)
      return []
    }
  }, [getCreations])

  if (projectNotFound) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#FAFAF9]">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-[#F1EBE4] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8E8B8A]">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <h2 className="text-2xl font-display font-semibold text-[#2C2C2C] mb-3">Project Not Found</h2>
          <p className="text-[#575655] mb-8">
            The project you are trying to access does not exist or has been deleted.
          </p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-[#2C2C2C] text-white rounded-lg font-medium hover:bg-[#1a1a1a] transition-colors duration-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ backgroundColor: settings.backgroundColor }}>
      {/* Vertical Toolbar - Left Side */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2">
        {/* Home Button - Back to Dashboard */}
        <button
          onClick={() => {
            if (onBack) {
              onBack()
            } else {
              navigate('/dashboard')
            }
          }}
          className="w-12 h-12 rounded-full bg-white border border-stone-200 shadow-lg hover:bg-stone-50 flex items-center justify-center transition-colors"
          title="Back to Dashboard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-700">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </button>

        <div className="w-8 h-px bg-stone-200 my-1" />

        {/* Plus Button - Create New */}
        <button
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.multiple = true
            input.onchange = async (e) => {
              const files = Array.from(e.target.files || [])
              for (const file of files) {
                await handleFileUpload(file, null)
              }
            }
            input.click()
          }}
          className="w-12 h-12 rounded-full bg-white border border-stone-200 shadow-lg hover:bg-stone-50 flex items-center justify-center transition-colors"
          title="Add new item"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-700">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        <div className="w-8 h-px bg-stone-200 my-1" />

        {/* Layers Button */}
        <button
          onClick={() => setShowLayersPanel(!showLayersPanel)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            showLayersPanel 
              ? 'bg-stone-900 text-white' 
              : 'bg-white border border-stone-200 hover:bg-stone-50 text-stone-700'
          }`}
          title="Layers"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
        </button>

        {/* Assets Button - "My assets" folder */}
        <button
          onClick={() => setShowAssetLibrary(!showAssetLibrary)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            showAssetLibrary 
              ? 'bg-stone-900 text-white' 
              : 'bg-white border border-stone-200 hover:bg-stone-50 text-stone-700'
          }`}
          title="My Assets"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        </button>

        {/* History Button */}
        <button
          onClick={() => setShowHistoryPanel(!showHistoryPanel)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            showHistoryPanel 
              ? 'bg-stone-900 text-white' 
              : 'bg-white border border-stone-200 hover:bg-stone-50 text-stone-700'
          }`}
          title="History (Last 10 assets)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>

        {/* History/Undo Button */}
        <button
          onClick={handleUndo}
          disabled={historyIndex <= 0}
          className="w-10 h-10 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-stone-700"
          title="Undo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>

        {/* Select Tool */}
        <button
          onClick={() => setInteractionMode('select')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            interactionMode === 'select'
              ? 'bg-stone-900 text-white'
              : 'bg-white border border-stone-200 hover:bg-stone-50 text-stone-700'
          }`}
          title="Select (V)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          </svg>
        </button>

        {/* Blend In Button - Only show when room + furniture exist */}
        {(() => {
          const sortedItems = [...items].sort((a, b) => (a.z_index || 0) - (b.z_index || 0))
          const roomItem = sortedItems[0]
          const furnitureItems = sortedItems.filter(item => 
            item.id !== roomItem?.id && 
            (item.z_index || 0) > (roomItem?.z_index || 0)
          )
          const canBlend = roomItem && furnitureItems.length > 0
          
          return canBlend ? (
            <button
              onClick={handleBlendIn}
              disabled={isGenerating}
              className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              title="Blend In - Blend furniture into room"
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              )}
            </button>
          ) : null
        })()}

        {/* AI/Chat Button */}
        <button
          onClick={() => setShowGenerateModal(true)}
          className="w-10 h-10 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 flex items-center justify-center transition-colors text-stone-700"
          title="AI Generate"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        {/* Help Button */}
        <button
          onClick={() => {/* Add help functionality */}}
          className="w-10 h-10 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 flex items-center justify-center transition-colors text-stone-700"
          title="Help"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </button>

        {/* Navigation/Pan Tool */}
        <button
          onClick={() => setInteractionMode(interactionMode === 'pan' ? 'select' : 'pan')}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            interactionMode === 'pan'
              ? 'bg-stone-900 text-white'
              : 'bg-white border border-stone-200 hover:bg-stone-50 text-stone-700'
          }`}
          title="Pan (H or Space+Drag)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
          </svg>
        </button>

        {/* Settings Button */}
        <button
          onClick={() => {/* Add settings functionality */}}
          className="w-10 h-10 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 flex items-center justify-center transition-colors text-stone-700"
          title="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
          </svg>
        </button>
      </div>

      {/* Context Menu - Horizontal toolbar bar */}
      {contextMenuPosition.visible && (
        <div
          className="context-menu fixed z-50 bg-white rounded-lg shadow-lg border border-stone-200 px-2 py-2 flex items-center gap-1"
          style={{
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y - 70}px`,
            transform: 'translateX(-50%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              handleContextMenuAction('moveToTop', contextMenuPosition.itemId)
            }}
            className="w-10 h-10 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 flex items-center justify-center transition-colors text-stone-700"
            title="Move on Top"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </button>
          <button
            onClick={() => {
              handleContextMenuAction('moveToBottom', contextMenuPosition.itemId)
            }}
            className="w-10 h-10 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 flex items-center justify-center transition-colors text-stone-700"
            title="Move Down"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22v-20" />
              <path d="M17 19H9.5a3.5 3.5 0 0 1 0-7h5a3.5 3.5 0 0 0 0-7H6" />
            </svg>
          </button>
          <div className="w-px h-6 bg-stone-200 mx-1" />
          <button
            onClick={() => {
              handleContextMenuAction('delete', contextMenuPosition.itemId)
            }}
            className="w-10 h-10 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 flex items-center justify-center transition-colors text-stone-700"
            title="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
          <button
            onClick={() => {
              handleContextMenuAction('download', contextMenuPosition.itemId)
            }}
            className="w-10 h-10 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 flex items-center justify-center transition-colors text-stone-700"
            title="Download"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
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
            zoom={camera.zoom}
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
            left: `${popupMenuPosition.x} px`,
            top: `${popupMenuPosition.y} px`,
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
                className="w-full px-4 py-2 text-left text-sm text-[#2C2C2C] hover:bg-[#F1EBE4] flex items-center gap-2 transition-colors font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </button>
              <button
                onClick={moveToFront}
                className="w-full px-4 py-2 text-left text-sm text-[#2C2C2C] hover:bg-[#F1EBE4] flex items-center gap-2 transition-colors font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                Move to Front
              </button>
              <button
                onClick={moveToBack}
                className="w-full px-4 py-2 text-left text-sm text-[#2C2C2C] hover:bg-[#F1EBE4] flex items-center gap-2 transition-colors font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                Move to Back
              </button>
              <div className="border-t border-[#F1EBE4] my-1" />
              <button
                onClick={() => {
                  setPopupMenuPosition({ ...popupMenuPosition, showAdjustments: true })
                }}
                className="w-full px-4 py-2 text-left text-sm text-[#2C2C2C] hover:bg-[#F1EBE4] flex items-center gap-2 transition-colors font-medium"
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
                className="w-full px-4 py-2 text-left text-sm text-[#2C2C2C] hover:bg-[#F1EBE4] flex items-center gap-2 transition-colors font-medium"
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
                className="w-full px-4 py-2 text-left text-sm text-[#2C2C2C] hover:bg-[#F1EBE4] flex items-center gap-2 transition-colors font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upscale 4×
              </button>
              <div className="border-t border-[#F1EBE4] my-1" />
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

      {/* Main Canvas Area */}
      <div
        className="flex-1 flex flex-col w-full h-full transition-all duration-macro ease-apple"
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
          style={{ backgroundColor: settings.backgroundColor }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {/* Grid is rendered inside the Konva Stage via InfiniteGrid component */}

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

                {/* Infinite Grid Background - PERFORMANCE: Uses pattern fill */}
                <Layer name="grid-layer" listening={false}>
                  <InfiniteGrid />
                </Layer>

                {/* Canvas Items Layer - PERFORMANCE OPTIMIZED:
                    - Items are pre-sorted in store (no sort on render)
                    - Listening disabled during panning for faster hit detection
                    - Viewport culling reduces rendered items
                */}
                <Layer name="items-layer" listening={!isPanning}>
                  {(() => {
                    // Use viewport-culled items from hook
                    // Items are already sorted by z_index in the store
                    const visibleItems = Array.isArray(visibleItemsFromHook) ? visibleItemsFromHook : []
                    const fallbackItems = Array.isArray(items) ? items : []
                    const itemsToRender = visibleItems.length > 0 ? visibleItems : fallbackItems

                    // No sorting needed - items are pre-sorted in store
                    return itemsToRender.map((item) => (
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
                            handleSelect(e, item.id, true)
                          } else {
                            handleSelect(e, item.id, false)
                          }
                        }}
                        onUpdate={handleItemUpdate}
                        onDelete={handleItemDelete}
                        onContextMenu={(e, itemId) => {
                          e.evt.preventDefault()
                          const stage = stageRef.current
                          if (!stage) return
                          const item = items.find(i => i.id === itemId)
                          if (item) {
                            // Calculate center of item in screen coordinates
                            const itemCenterX = (item.x_position + (item.width || 200) / 2) * camera.zoom + camera.x
                            const itemTopY = item.y_position * camera.zoom + camera.y
                            setContextMenuPosition({
                              x: itemCenterX,
                              y: itemTopY,
                              visible: true,
                              itemId: itemId,
                            })
                          }
                        }}
                        onItemClick={(e, itemId) => {
                          // Show context menu on click
                          const stage = stageRef.current
                          if (!stage) return
                          const item = items.find(i => i.id === itemId)
                          if (item) {
                            // Calculate center of item in screen coordinates
                            const itemCenterX = (item.x_position + (item.width || 200) / 2) * camera.zoom + camera.x
                            const itemTopY = item.y_position * camera.zoom + camera.y
                            setContextMenuPosition({
                              x: itemCenterX,
                              y: itemTopY,
                              visible: true,
                              itemId: itemId,
                            })
                          }
                        }}
                        showMeasurements={settings.showMeasurements}
                        zoom={camera.zoom}
                        blendMode={blendMode}
                      />
                    ))
                  })()}
                </Layer>

                {/* Transformer Layer - Resize handles for selected items (Miro-style) */}
                {/* Put transformer on separate layer that's always on top */}
                {selectedItemId && !blendMode && !isPanning && (
                  <Layer name="transformer-layer" listening={true}>
                    <Transformer
                      ref={transformerRef}
                      boundBoxFunc={(oldBox, newBox) => {
                        // Limit minimum size - prevent items from becoming too small
                        const minSize = 50
                        if (Math.abs(newBox.width) < minSize || Math.abs(newBox.height) < minSize) {
                          return oldBox
                        }
                        return newBox
                      }}
                      borderEnabled={true}
                      borderStroke="#18181B"
                      borderStrokeWidth={2}
                      borderDash={[5, 5]}
                      // Miro-style handles: white fill, dark border, easy to grab
                      // Larger handles for better visibility and easier grabbing
                      anchorFill="#FFFFFF"
                      anchorStroke="#18181B"
                      anchorStrokeWidth={2.5}
                      anchorSize={14}
                      anchorCornerRadius={3}
                      rotateEnabled={false}
                      resizeEnabled={true}
                      keepRatio={false}
                      // Enable all 8 handles like Miro (4 corners + 4 edges)
                      enabledAnchors={[
                        'top-left', 'top-center', 'top-right',
                        'middle-left', 'middle-right',
                        'bottom-left', 'bottom-center', 'bottom-right'
                      ]}
                      flipEnabled={false}
                      centeredScaling={false}
                      centeredRotation={false}
                      onTransform={(e) => {
                        // Real-time visual feedback during transform
                        const node = e.target
                        node.getLayer()?.batchDraw()
                      }}
                      onTransformEnd={(e) => {
                        // Final update after resize completes - Miro-style smooth resize
                        const node = e.target
                        const selectedItem = items.find(item => item.id === selectedItemId)
                        
                        if (!selectedItem || !node) return
                        
                        // Get the current scale values from the transform
                        const scaleX = node.scaleX()
                        const scaleY = node.scaleY()
                        
                        // Get the node's current width and height (before scale)
                        const currentWidth = node.width()
                        const currentHeight = node.height()
                        
                        // Calculate the actual new dimensions after scaling
                        // The transformer applies scale to the node's width/height
                        const newWidth = Math.max(50, Math.abs(currentWidth * scaleX))
                        const newHeight = Math.max(50, Math.abs(currentHeight * scaleY))
                        
                        // Get the new position (may have shifted during corner/edge resize)
                        const newX = node.x()
                        const newY = node.y()
                        
                        // Reset scale to 1:1 and update the actual width/height
                        // This is the standard Konva pattern for applying transforms
                        node.scaleX(1)
                        node.scaleY(1)
                        node.width(newWidth)
                        node.height(newHeight)
                        
                        // Update store immediately for instant feedback
                        updateItem(selectedItemId, {
                          x_position: newX,
                          y_position: newY,
                          width: newWidth,
                          height: newHeight,
                          rotation: node.rotation() || 0,
                        })
                        
                        // Sync to database in background (debounced for performance)
                        if (userId && clerk) {
                          if (transformUpdateTimeoutRef.current) {
                            clearTimeout(transformUpdateTimeoutRef.current)
                          }
                          
                          transformUpdateTimeoutRef.current = setTimeout(async () => {
                            try {
                              await apiUpdateCanvasItem(userId, selectedItemId, {
                                x_position: newX,
                                y_position: newY,
                                width: newWidth,
                                height: newHeight,
                                rotation: node.rotation() || 0,
                              }, clerk)
                            } catch (error) {
                              console.error('Failed to sync resize to database:', error)
                            }
                            transformUpdateTimeoutRef.current = null
                          }, 300)
                        }
                        
                        // Force transformer to update its bounds after dimension change
                        requestAnimationFrame(() => {
                          if (transformerRef.current) {
                            transformerRef.current.forceUpdate()
                            transformerRef.current.getLayer()?.batchDraw()
                          }
                        })
                      }}
                    />
                  </Layer>
                )}

                {/* Rubber Band Selection Box */}
                {isSelecting && selectionBox && (
                  <Layer name="selection-box-layer">
                    <Rect
                      x={selectionBox.x * camera.zoom + camera.x}
                      y={selectionBox.y * camera.zoom + camera.y}
                      width={selectionBox.width * camera.zoom}
                      height={selectionBox.height * camera.zoom}
                      stroke="#3b82f6"
                      strokeWidth={2 / camera.zoom}
                      fill="rgba(59, 130, 246, 0.1)"
                      dash={[5, 5]}
                      listening={false}
                    />
                  </Layer>
                )}

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
                        fill="#D97757"
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
                            stroke="#D97757"
                            strokeWidth={2}
                            lineCap="round"
                          />
                          <Text
                            x={length / 2}
                            y={-20}
                            text={`${line.distance} px`}
                            fontSize={12}
                            fill="#2C2C2C"
                            fontStyle="bold"
                            align="center"
                            offsetX={String(line.distance).length * 3}
                          />
                          {/* Arrow heads */}
                          <Line points={[0, 0, 10, -5]} stroke="#D97757" strokeWidth={2} lineCap="round" />
                          <Line points={[0, 0, 10, 5]} stroke="#D97757" strokeWidth={2} lineCap="round" />
                          <Line points={[length, 0, length - 10, -5]} stroke="#D97757" strokeWidth={2} lineCap="round" />
                          <Line points={[length, 0, length - 10, 5]} stroke="#D97757" strokeWidth={2} lineCap="round" />
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
                      fill="#D97757"
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  </Layer>
                )}
              </Stage>
            )
          })()}
        </div>

        {/* AI Chat Bar - Bottom Center */}
        <AIChatBar
          onSubmit={async (prompt) => {
            if (!prompt.trim() || !userId || !projectId) return
            await generateToCanvas(prompt.trim())
          }}
          isLoading={isGenerating || generatingVariations}
          placeholder="Ask anything"
          onSelectReferenceImage={handleSelectReferenceImage}
          onClearReferenceImage={() => setReferenceImage(null)}
          referenceImage={referenceImage}
          selectedItem={selectedItem}
        />

        {/* Presence Indicator - Top Right */}
        <PresenceIndicator />

        {/* Zoom Controls - Bottom Right */}
        <ZoomControls stageRef={stageRef} />
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
                    className={`p - 4 rounded - lg border - 2 transition - all text - left ${selectedStyle?.id === style.id
                      ? 'border-stone-900 bg-stone-50'
                      : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                      } `}
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
              <h2 className="text-xl font-semibold">My Assets</h2>
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
                    // Get max z_index
                    // DEFENSIVE: Ensure items is an array
                    const safeItems = Array.isArray(items) ? items : []
                    const maxZIndex = safeItems.length > 0 ? Math.max(...safeItems.map(item => item.z_index || 0), 0) : 0
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
                    }, clerk)
                    console.log('Asset added successfully:', newItem)
                    const newItems = Array.isArray(items) ? [...items, newItem] : [newItem]
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
                    } else if (error.message?.includes('invalid input syntax for type uuid') || error.message?.includes('Invalid project ID format') || error.message?.includes('must be saved to cloud')) {
                      errorMessage = 'This project is stored locally. Please save it to cloud first to use canvas features. Go to Projects and save the project.'
                    } else if (error.message?.includes('Network') || error.message?.includes('fetch')) {
                      errorMessage = 'Network error. Please check your connection and try again.'
                    } else if (error.message) {
                      errorMessage = `Failed to add asset: ${error.message} `
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
          camera={camera}
          settings={settings}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Layers Panel */}
      <LayersPanel
        isOpen={showLayersPanel}
        onClose={() => setShowLayersPanel(false)}
        items={items}
        selectedItemId={selectedItemId}
        onSelectItem={(id) => handleSelect(null, id, false)}
        onReorderItems={handleReorderItems}
        onToggleVisibility={handleToggleVisibility}
        onToggleLock={handleToggleLock}
        onOpacityChange={handleOpacityChange}
        onDeleteItem={handleItemDelete}
      />

      {/* History Panel */}
      {showHistoryPanel && (
        <div className="fixed left-20 top-1/2 -translate-y-1/2 z-50 bg-white rounded-lg border border-stone-200 shadow-xl w-80 max-h-[600px] flex flex-col">
          <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-900">Recent Assets</h3>
            <button
              onClick={() => setShowHistoryPanel(false)}
              className="text-stone-400 hover:text-stone-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {assetHistory.length === 0 ? (
              <div className="text-center py-12 text-stone-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-50">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <p className="text-sm">No recent assets</p>
                <p className="text-xs mt-1">Uploaded or generated assets will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {assetHistory.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={async () => {
                      // Add asset to canvas
                      const stage = stageRef.current
                      if (!stage) return
                      
                      const width = dimensions?.width || window.innerWidth
                      const height = dimensions?.height || window.innerHeight
                      const canvasWidth = width * 4
                      const canvasHeight = height * 4
                      const centerX = (width / 2 - stage.x()) / stage.scaleX()
                      const centerY = (height / 2 - stage.y()) / stage.scaleY()
                      
                      const safeItems = Array.isArray(items) ? items : []
                      const maxZIndex = safeItems.length > 0 ? Math.max(...safeItems.map(item => item.z_index || 0), 0) : 0
                      
                      const newItem = await createCanvasItem(userId, projectId, {
                        image_url: asset.image_url,
                        x_position: centerX - 200,
                        y_position: centerY - 200,
                        width: 400,
                        height: 400,
                        name: asset.name,
                        z_index: maxZIndex + 1,
                        is_visible: true,
                      }, clerk)
                      
                      // Note: createCanvasItem already adds the item to the store via addItem,
                      // so we don't need to call setItems here - this was causing duplicates
                    }}
                    className="group relative aspect-square rounded-lg border border-stone-200 overflow-hidden hover:border-stone-400 transition-colors bg-stone-50"
                    title={asset.name}
                  >
                    <img
                      src={asset.image_url}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-xs text-white truncate">{asset.name}</p>
                      <p className="text-[10px] text-white/70 mt-0.5">
                        {asset.type === 'generated' ? 'Generated' : 'Uploaded'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Share Modal */}
      {showShareModal && project && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          project={project}
        />
      )}
    </div>
  )
}
