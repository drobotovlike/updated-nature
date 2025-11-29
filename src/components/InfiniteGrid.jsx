import { useMemo } from 'react'
import { Circle } from 'react-konva' // Changed from Line to Circle
import { useCanvasStore } from '../stores/useCanvasStore'
import { toScreen } from '../utils/coordinateSystem'

/**
 * Infinite Grid Component (Dot Pattern)
 * 
 * Renders a dot grid that scales with zoom.
 * Used by Miro, Figma, etc. for a cleaner look.
 */
export function InfiniteGrid() {
  const camera = useCanvasStore((state) => state.camera)
  const dimensions = useCanvasStore((state) => state.dimensions)
  const settings = useCanvasStore((state) => state.settings)

  if (!settings.gridEnabled || !dimensions.width || !dimensions.height) {
    return null
  }

  const gridSize = settings.gridSize || 20

  // Calculate grid dots in world space
  const gridDots = useMemo(() => {
    const dots = []

    // Get viewport bounds in world space
    const topLeft = { x: -camera.x / camera.zoom, y: -camera.y / camera.zoom }
    const bottomRight = {
      x: (dimensions.width - camera.x) / camera.zoom,
      y: (dimensions.height - camera.y) / camera.zoom,
    }

    // Calculate grid start positions (snap to grid)
    const startX = Math.floor(topLeft.x / gridSize) * gridSize
    const startY = Math.floor(topLeft.y / gridSize) * gridSize
    const endX = Math.ceil(bottomRight.x / gridSize) * gridSize
    const endY = Math.ceil(bottomRight.y / gridSize) * gridSize

    // Generate dots
    for (let x = startX; x <= endX; x += gridSize) {
      for (let y = startY; y <= endY; y += gridSize) {
        const screenPos = toScreen({ x, y }, camera)
        
        dots.push({
          key: `${x}-${y}`,
          x: screenPos.x,
          y: screenPos.y,
          radius: 1, // Small dot size
          fill: '#C7C7C7', // Subtle gray (Miro-like)
          listening: false,
        })
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
          listening={dot.listening}
        />
      ))}
    </>
  )
}

