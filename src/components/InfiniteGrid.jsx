import { useMemo } from 'react'
import { Circle } from 'react-konva'
import { useCanvasStore } from '../stores/useCanvasStore'

/**
 * Infinite Grid Component (Miro-style Dot Pattern)
 * 
 * Renders a subtle dot grid in world coordinates.
 * The Stage handles the camera transform, so we just need to
 * calculate which dots are visible and render them at world positions.
 */
export function InfiniteGrid() {
  const camera = useCanvasStore((state) => state.camera)
  const dimensions = useCanvasStore((state) => state.dimensions)
  const settings = useCanvasStore((state) => state.settings)

  if (!settings.gridEnabled || !dimensions.width || !dimensions.height) {
    return null
  }

  // Grid spacing in world units
  const gridSize = settings.gridSize || 24

  // Calculate grid dots in world space
  const gridDots = useMemo(() => {
    const dots = []

    // Get viewport bounds in world space
    // The stage is positioned at (camera.x, camera.y) and scaled by camera.zoom
    // So visible world area is from (-camera.x/zoom, -camera.y/zoom) to ((width-camera.x)/zoom, (height-camera.y)/zoom)
    const viewLeft = -camera.x / camera.zoom
    const viewTop = -camera.y / camera.zoom
    const viewRight = (dimensions.width - camera.x) / camera.zoom
    const viewBottom = (dimensions.height - camera.y) / camera.zoom

    // Add padding to avoid popping at edges
    const padding = gridSize * 2

    // Calculate grid start positions (snap to grid)
    const startX = Math.floor((viewLeft - padding) / gridSize) * gridSize
    const startY = Math.floor((viewTop - padding) / gridSize) * gridSize
    const endX = Math.ceil((viewRight + padding) / gridSize) * gridSize
    const endY = Math.ceil((viewBottom + padding) / gridSize) * gridSize

    // Adjust density based on zoom for performance
    // At very low zoom, skip dots to maintain performance
    let step = gridSize
    if (camera.zoom < 0.3) {
      step = gridSize * 4
    } else if (camera.zoom < 0.5) {
      step = gridSize * 2
    }

    // Limit dots for performance
    const maxDots = 10000
    let dotCount = 0

    // Generate dots in world coordinates
    for (let x = startX; x <= endX && dotCount < maxDots; x += step) {
      for (let y = startY; y <= endY && dotCount < maxDots; y += step) {
        dots.push({
          key: `${x}-${y}`,
          x: x,
          y: y,
        })
        dotCount++
      }
    }

    return dots
  }, [camera.x, camera.y, camera.zoom, dimensions.width, dimensions.height, gridSize])

  // Dot appearance - size in world units, adjusted for zoom
  // At 100% zoom, dot should be ~1.5px on screen
  const dotRadius = 1.5 / camera.zoom

  return (
    <>
      {gridDots.map((dot) => (
        <Circle
          key={dot.key}
          x={dot.x}
          y={dot.y}
          radius={dotRadius}
          fill="rgba(200, 200, 200, 0.5)"
          listening={false}
          perfectDrawEnabled={false}
        />
      ))}
    </>
  )
}
