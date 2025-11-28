import { useCallback, useRef, useState } from 'react'
import { useCanvasStore } from '../stores/useCanvasStore'
import { toWorld, getWorldPointerPosition, zoomToCursor } from '../utils/coordinateSystem'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 3

/**
 * Canvas Interactions Hook
 * 
 * Handles all canvas-level interactions:
 * - Zoom to cursor (wheel)
 * - Pan with spacebar + drag
 * - Rubber band selection (Shift + drag)
 * 
 * @param {Object} stageRef - Ref to the Konva Stage
 * @param {Object} dimensions - { width: number, height: number }
 */
export function useCanvasInteractions(stageRef, dimensions) {
  const camera = useCanvasStore((state) => state.camera)
  const setCamera = useCanvasStore((state) => state.setCamera)
  const zoomToCursorAction = useCanvasStore((state) => state.zoomToCursor)
  const panCamera = useCanvasStore((state) => state.panCamera)
  const setSelection = useCanvasStore((state) => state.setSelection)
  const items = useCanvasStore((state) => state.items)
  const interactionMode = useCanvasStore((state) => state.interactionMode)

  // Pan state
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0 })

  // Rubber band selection state
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionBox, setSelectionBox] = useState(null)
  const selectionStartRef = useRef(null)

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
      const baseZoomFactor = 1.001
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
   * Handle spacebar + drag for panning
   */
  const handleStageMouseDown = useCallback(
    (e) => {
      const stage = stageRef.current
      if (!stage) return

      // Check if spacebar is pressed
      const isSpacePressed = e.evt.shiftKey === false && e.evt.button === 0 // Left click without shift

      // For now, we'll use a different approach: detect spacebar keydown
      // This will be handled by keyboard event listeners
      if (interactionMode === 'pan' || e.evt.button === 1) {
        // Middle mouse button or pan mode
        setIsPanning(true)
        const pointer = stage.getPointerPosition()
        if (pointer) {
          panStartRef.current = {
            x: pointer.x - stage.x(),
            y: pointer.y - stage.y(),
          }
        }
        stage.draggable(true)
      } else if (e.evt.shiftKey && e.target === stage) {
        // Shift + click on empty space = start rubber band selection
        setIsSelecting(true)
        const pointer = stage.getPointerPosition()
        if (pointer) {
          const worldPos = getWorldPointerPosition(stage)
          selectionStartRef.current = worldPos
          setSelectionBox({
            x: worldPos.x,
            y: worldPos.y,
            width: 0,
            height: 0,
          })
        }
      }
    },
    [interactionMode]
  )

  /**
   * Handle mouse move for panning and rubber band selection
   */
  const handleStageMouseMove = useCallback(
    (e) => {
      const stage = stageRef.current
      if (!stage) return

      if (isPanning) {
        // Panning is handled by Konva's draggable
        return
      }

      if (isSelecting && selectionStartRef.current) {
        const pointer = stage.getPointerPosition()
        if (!pointer) return

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
    [isPanning, isSelecting, items, setSelection]
  )

  /**
   * Handle mouse up to end panning/selection
   */
  const handleStageMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false)
      const stage = stageRef.current
      if (stage) {
        stage.draggable(false)
      }
    }

    if (isSelecting) {
      setIsSelecting(false)
      setSelectionBox(null)
      selectionStartRef.current = null
    }
  }, [isPanning, isSelecting])

  /**
   * Handle keyboard events for spacebar panning
   */
  const handleKeyDown = useCallback(
    (e) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        const stage = stageRef.current
        if (stage) {
          stage.draggable(true)
        }
      }
    },
    []
  )

  const handleKeyUp = useCallback(
    (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        const stage = stageRef.current
        if (stage && !isPanning) {
          stage.draggable(false)
        }
      }
    },
    [isPanning]
  )

  return {
    handleWheel,
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,
    handleKeyDown,
    handleKeyUp,
    isPanning,
    isSelecting,
    selectionBox,
  }
}

