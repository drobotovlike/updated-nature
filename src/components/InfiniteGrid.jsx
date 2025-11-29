import { useMemo } from 'react'
import { Circle } from 'react-konva'
import { useCanvasStore } from '../stores/useCanvasStore'
import { toScreen } from '../utils/coordinateSystem'

/**
 * Infinite Grid Component (Miro-style Dot Pattern)
 * 
 * Renders a subtle dot grid that scales with zoom.
 * Inspired by Miro's clean, minimal grid aesthetic.
 */
export function InfiniteGrid() {
  const camera = useCanvasStore((state) => state.camera)
  const dimensions = useCanvasStore((state) => state.dimensions)
  const settings = useCanvasStore((state) => state.settings)

  if (!settings.gridEnabled || !dimensions.width || !dimensions.height) {
    return null
  }

  // Miro uses ~24px grid spacing
  const baseGridSize = 24
  
  // Adjust grid density based on zoom level for performance
  const zoomFactor = camera.zoom < 0.5 ? 2 : camera.zoom < 0.25 ? 4 : 1
  const gridSize = baseGridSize * zoomFactor

  // Calculate grid dots in world space
  const gridDots = useMemo(() => {
    const dots = []

    // Get viewport bounds in world space with padding
    const padding = gridSize * 2
    const topLeft = { 
      x: -camera.x / camera.zoom - padding, 
      y: -camera.y / camera.zoom - padding 
    }
    const bottomRight = {
      x: (dimensions.width - camera.x) / camera.zoom + padding,
      y: (dimensions.height - camera.y) / camera.zoom + padding,
    }

    // Calculate grid start positions (snap to grid)
    const startX = Math.floor(topLeft.x / gridSize) * gridSize
    const startY = Math.floor(topLeft.y / gridSize) * gridSize
    const endX = Math.ceil(bottomRight.x / gridSize) * gridSize
    const endY = Math.ceil(bottomRight.y / gridSize) * gridSize

    // Limit dots for performance
    const maxDots = 5000
    let dotCount = 0

    // Generate dots
    for (let x = startX; x <= endX && dotCount < maxDots; x += gridSize) {
      for (let y = startY; y <= endY && dotCount < maxDots; y += gridSize) {
        const screenPos = toScreen({ x, y }, camera)
        
        // Only render dots that are visible on screen
        if (screenPos.x >= -10 && screenPos.x <= dimensions.width + 10 &&
            screenPos.y >= -10 && screenPos.y <= dimensions.height + 10) {
          
          // Dot size scales slightly with zoom for better visibility
          const dotRadius = Math.max(1, Math.min(1.5, camera.zoom * 1.2))
          
          dots.push({
            key: `${x}-${y}`,
            x: screenPos.x,
            y: screenPos.y,
            radius: dotRadius,
            // Miro uses a very subtle gray - #D4D4D4 or similar
            fill: 'rgba(180, 180, 180, 0.6)',
          })
          dotCount++
        }
      }
    }

    return dots
  }, [camera, dimensions, gridSize])

  return (
    <>
      {gridDots.map((dot) => (
        <Circle
          key={dot.key}
          x={dot.x}
          y={dot.y}
          radius={dot.radius}
          fill={dot.fill}
          listening={false}
          perfectDrawEnabled={false}
        />
      ))}
    </>
  )
}

