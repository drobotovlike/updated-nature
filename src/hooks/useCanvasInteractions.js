import { useCallback, useRef, useState } from 'react'
import { useCanvasStore } from '../stores/useCanvasStore'
import { toWorld, getWorldPointerPosition, zoomToCursor } from '../utils/coordinateSystem'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5

/**
 * Canvas Interactions Hook
 * 
 * Handles all canvas-level interactions:
 * - Zoom to cursor (wheel)
 * - Pan with spacebar + drag or middle mouse
 * - Rubber band selection (Shift + drag)
 * - AI generation area selection
 * 
 * @param {Object} stageRef - Ref to the Konva Stage
 * @param {Object} dimensions - { width: number, height: number }
 */
export function useCanvasInteractions(stageRef, dimensions) {
  // Store selectors
  const camera = useCanvasStore((state) => state.camera)
  const setCamera = useCanvasStore((state) => state.setCamera)
  const panCamera = useCanvasStore((state) => state.panCamera)
  const setSelection = useCanvasStore((state) => state.setSelection)
  const interactionMode = useCanvasStore((state) => state.interactionMode)
  const items = useCanvasStore((state) => state.items)
  const openAIPrompt = useCanvasStore((state) => state.openAIPrompt)

  // Pan state
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0 })

  // Rubber band selection state
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionBox, setSelectionBox] = useState(null)
  const selectionStartRef = useRef(null)

  // AI generation area state
  const [isDrawingAIArea, setIsDrawingAIArea] = useState(false)
  const [aiAreaBox, setAIAreaBox] = useState(null)
  const aiAreaStartRef = useRef(null)

  // Spacebar state
  const [isSpacePressed, setIsSpacePressed] = useState(false)

  /**
   * Handle wheel event for zoom-to-cursor
   */
  const handleWheel = useCallback(
    (e) => {
      e.evt.preventDefault()

      const stage = stageRef.current
      if (!stage || !dimensions.width || !dimensions.height) return

      const pointer = stage.getPointerPosition()
      if (!pointer) return

      const oldScale = stage.scaleX()
      const deltaY = e.evt.deltaY
      const absDelta = Math.abs(deltaY)

      // Calculate zoom factor based on scroll amount
      const baseZoomFactor = 0.001
      const sensitivity = Math.min(absDelta / 10, 50)
      const zoomFactor = 1 + baseZoomFactor * sensitivity

      // Apply zoom in the correct direction
      const proposedScale = deltaY > 0 ? oldScale / zoomFactor : oldScale * zoomFactor
      const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, proposedScale))

      // Use zoom-to-cursor math
      const oldCamera = {
        x: stage.x(),
        y: stage.y(),
        zoom: oldScale,
      }

      const newCamera = zoomToCursor(pointer, oldCamera, clampedScale)

      // Update stage
      stage.scale({ x: clampedScale, y: clampedScale })
      stage.position({ x: newCamera.x, y: newCamera.y })

      // Update store
      setCamera({
        x: newCamera.x,
        y: newCamera.y,
        zoom: clampedScale,
      })
    },
    [stageRef, dimensions, setCamera]
  )

  /**
   * Handle mouse down on stage
   */
  const handleStageMouseDown = useCallback(
    (e) => {
      const stage = stageRef.current
      if (!stage) return

      const pointer = stage.getPointerPosition()
      if (!pointer) return

      // Middle mouse button or pan mode or spacebar pressed - start panning
      if (interactionMode === 'pan' || e.evt.button === 1 || isSpacePressed) {
        setIsPanning(true)
        panStartRef.current = {
          x: pointer.x - stage.x(),
          y: pointer.y - stage.y(),
        }
        stage.draggable(true)
        return
      }

      // AI generation mode - draw selection area
      if (interactionMode === 'generate' && e.target === stage) {
        setIsDrawingAIArea(true)
        const worldPos = getWorldPointerPosition(stage)
        aiAreaStartRef.current = worldPos
        setAIAreaBox({
          x: worldPos.x,
          y: worldPos.y,
          width: 0,
          height: 0,
        })
        return
      }

      // Shift + click on empty space = start rubber band selection
      if (e.evt.shiftKey && e.target === stage) {
        setIsSelecting(true)
        const worldPos = getWorldPointerPosition(stage)
        selectionStartRef.current = worldPos
        setSelectionBox({
          x: worldPos.x,
          y: worldPos.y,
          width: 0,
          height: 0,
        })
        return
      }

      // Click on empty canvas - clear selection
      if (e.target === stage && interactionMode === 'select') {
        setSelection(null)
      }
    },
    [interactionMode, isSpacePressed, setSelection, stageRef]
  )

  /**
   * Handle mouse move for panning, rubber band selection, and AI area
   */
  const handleStageMouseMove = useCallback(
    (e) => {
      const stage = stageRef.current
      if (!stage) return

      // Panning is handled by Konva's draggable
      if (isPanning) {
        return
      }

      // AI area drawing
      if (isDrawingAIArea && aiAreaStartRef.current) {
        const currentWorldPos = getWorldPointerPosition(stage)
        if (!currentWorldPos) return

        const start = aiAreaStartRef.current
        const x = Math.min(start.x, currentWorldPos.x)
        const y = Math.min(start.y, currentWorldPos.y)
        const width = Math.abs(currentWorldPos.x - start.x)
        const height = Math.abs(currentWorldPos.y - start.y)

        setAIAreaBox({ x, y, width, height })
        return
      }

      // Rubber band selection
      if (isSelecting && selectionStartRef.current) {
        const currentWorldPos = getWorldPointerPosition(stage)
        if (!currentWorldPos) return

        const start = selectionStartRef.current
        const x = Math.min(start.x, currentWorldPos.x)
        const y = Math.min(start.y, currentWorldPos.y)
        const width = Math.abs(currentWorldPos.x - start.x)
        const height = Math.abs(currentWorldPos.y - start.y)

        setSelectionBox({ x, y, width, height })

        // Select items intersecting the selection box
        const selectedIds = items
          .filter((item) => {
            const itemBounds = {
              x: item.x_position || 0,
              y: item.y_position || 0,
              width: item.width || 0,
              height: item.height || 0,
            }

            // Check if item bounds intersect selection box
            return !(
              itemBounds.x + itemBounds.width < x ||
              itemBounds.x > x + width ||
              itemBounds.y + itemBounds.height < y ||
              itemBounds.y > y + height
            )
          })
          .map((item) => item.id)

        setSelection(selectedIds)
      }
    },
    [isPanning, isDrawingAIArea, isSelecting, items, setSelection, stageRef]
  )

  /**
   * Handle mouse up to end interactions
   */
  const handleStageMouseUp = useCallback(() => {
    const stage = stageRef.current

    if (isPanning) {
      setIsPanning(false)
      if (stage && !isSpacePressed) {
        stage.draggable(false)
      }
    }

    if (isSelecting) {
      setIsSelecting(false)
      setSelectionBox(null)
      selectionStartRef.current = null
    }

    if (isDrawingAIArea && aiAreaBox) {
      setIsDrawingAIArea(false)
      // Only open AI prompt if area is large enough
      if (aiAreaBox.width > 20 && aiAreaBox.height > 20) {
        openAIPrompt(aiAreaBox)
      }
      setAIAreaBox(null)
      aiAreaStartRef.current = null
    }
  }, [isPanning, isSelecting, isDrawingAIArea, aiAreaBox, isSpacePressed, openAIPrompt, stageRef])

  /**
   * Handle drag end for panning
   */
  const handleStageDragEnd = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return

    // Update store with new camera position
    setCamera({
      x: stage.x(),
      y: stage.y(),
    })
  }, [setCamera, stageRef])

  /**
   * Handle keyboard events for spacebar panning
   */
  const handleKeyDown = useCallback(
    (e) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setIsSpacePressed(true)
        const stage = stageRef.current
        if (stage) {
          stage.draggable(true)
          stage.container().style.cursor = 'grab'
        }
      }
    },
    [stageRef]
  )

  const handleKeyUp = useCallback(
    (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setIsSpacePressed(false)
        const stage = stageRef.current
        if (stage && !isPanning) {
          stage.draggable(false)
          stage.container().style.cursor = 'default'
        }
      }
    },
    [isPanning, stageRef]
  )

  return {
    // Event handlers
    handleWheel,
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,
    handleStageDragEnd,
    handleKeyDown,
    handleKeyUp,
    
    // State
    isPanning,
    isSelecting,
    selectionBox,
    isDrawingAIArea,
    aiAreaBox,
    isSpacePressed,
  }
}
