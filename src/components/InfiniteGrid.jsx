import { useMemo, useRef, useEffect, useState } from 'react'
import { Rect, Image as KonvaImage } from 'react-konva'
import { useCanvasStore } from '../stores/useCanvasStore'

/**
 * Infinite Grid Component (Miro-style Dot Pattern)
 * 
 * PERFORMANCE OPTIMIZED: Uses a single pattern fill instead of
 * thousands of individual Circle components.
 * 
 * The grid is rendered as a single Rect with a repeating pattern,
 * which is orders of magnitude faster than rendering individual dots.
 */
export function InfiniteGrid() {
  const camera = useCanvasStore((state) => state.camera)
  const dimensions = useCanvasStore((state) => state.dimensions)
  const settings = useCanvasStore((state) => state.settings)
  const isPanning = useCanvasStore((state) => state.isPanning)
  
  const [patternImage, setPatternImage] = useState(null)
  const gridSize = settings.gridSize || 24

  // Create the pattern image once (or when gridSize changes)
  useEffect(() => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    // Pattern tile size
    canvas.width = gridSize
    canvas.height = gridSize
    
    // Draw a single dot in the center of the tile
    ctx.fillStyle = 'rgba(180, 180, 180, 0.4)'
    ctx.beginPath()
    ctx.arc(gridSize / 2, gridSize / 2, 1.5, 0, Math.PI * 2)
    ctx.fill()
    
    // Create an Image from the canvas
    const img = new window.Image()
    img.onload = () => {
      setPatternImage(img)
    }
    img.src = canvas.toDataURL()
  }, [gridSize])

  // Don't render grid if disabled, no dimensions, or while actively panning (perf optimization)
  if (!settings.gridEnabled || !dimensions.width || !dimensions.height) {
    return null
  }

  // Calculate viewport bounds in world space
  const viewLeft = -camera.x / camera.zoom
  const viewTop = -camera.y / camera.zoom
  const viewRight = (dimensions.width - camera.x) / camera.zoom
  const viewBottom = (dimensions.height - camera.y) / camera.zoom

  // Add padding to prevent edge popping
  const padding = gridSize * 4

  // Snap bounds to grid for clean pattern alignment
  const x = Math.floor((viewLeft - padding) / gridSize) * gridSize
  const y = Math.floor((viewTop - padding) / gridSize) * gridSize
  const width = Math.ceil((viewRight - viewLeft + padding * 2) / gridSize) * gridSize
  const height = Math.ceil((viewBottom - viewTop + padding * 2) / gridSize) * gridSize

  if (!patternImage) {
    return null
  }

  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fillPatternImage={patternImage}
      fillPatternRepeat="repeat"
      fillPatternOffset={{ x: -x, y: -y }}
      listening={false}
      perfectDrawEnabled={false}
    />
  )
}
