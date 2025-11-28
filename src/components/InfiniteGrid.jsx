import { useMemo } from 'react'
import { Line } from 'react-konva'
import { useCanvasStore } from '../stores/useCanvasStore'
import { toScreen } from '../utils/coordinateSystem'

/**
 * Infinite Grid Component
 * 
 * Renders a grid that scales with zoom and extends infinitely.
 * Uses Konva Lines for crisp rendering at any zoom level.
 */
export function InfiniteGrid() {
  const camera = useCanvasStore((state) => state.camera)
  const dimensions = useCanvasStore((state) => state.dimensions)
  const settings = useCanvasStore((state) => state.settings)

  if (!settings.gridEnabled || !dimensions.width || !dimensions.height) {
    return null
  }

  const gridSize = settings.gridSize || 20

  // Calculate grid lines in world space
  const gridLines = useMemo(() => {
    const lines = []

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

    // Generate vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
      const topScreen = toScreen({ x, y: topLeft.y }, camera)
      const bottomScreen = toScreen({ x, y: bottomRight.y }, camera)

      lines.push({
        key: `v-${x}`,
        points: [topScreen.x, topScreen.y, bottomScreen.x, bottomScreen.y],
        stroke: '#e5e7eb',
        strokeWidth: 1 / camera.zoom, // Scale stroke width inversely with zoom
        listening: false,
      })
    }

    // Generate horizontal lines
    for (let y = startY; y <= endY; y += gridSize) {
      const leftScreen = toScreen({ x: topLeft.x, y }, camera)
      const rightScreen = toScreen({ x: bottomRight.x, y }, camera)

      lines.push({
        key: `h-${y}`,
        points: [leftScreen.x, leftScreen.y, rightScreen.x, rightScreen.y],
        stroke: '#e5e7eb',
        strokeWidth: 1 / camera.zoom,
        listening: false,
      })
    }

    return lines
  }, [camera, dimensions, gridSize])

  return (
    <>
      {gridLines.map((line) => (
        <Line
          key={line.key}
          points={line.points}
          stroke={line.stroke}
          strokeWidth={line.strokeWidth}
          listening={line.listening}
        />
      ))}
    </>
  )
}

