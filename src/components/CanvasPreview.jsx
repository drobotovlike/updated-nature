import { useEffect, useRef } from 'react'
import { Stage, Layer, Image as KonvaImage, Group } from 'react-konva'
import useImage from 'use-image'
import Konva from 'konva'

/**
 * Mini Canvas Preview Component
 * Renders a scaled-down preview of the canvas with all items
 */
function PreviewItem({ item, scale, bounds }) {
  const [image] = useImage(item.image_url)
  
  if (!image || item.is_visible === false) return null

  // Calculate position relative to canvas bounds
  const x = (item.x_position - bounds.minX) * scale
  const y = (item.y_position - bounds.minY) * scale
  const width = (item.width || image?.width || 200) * scale
  const height = (item.height || image?.height || 200) * scale

  return (
    <Group
      x={x}
      y={y}
      rotation={item.rotation || 0}
      opacity={item.opacity || 1}
    >
      <KonvaImage
        image={image}
        width={width}
        height={height}
        perfectDrawEnabled={false}
      />
    </Group>
  )
}

export default function CanvasPreview({ 
  items = [], 
  width = 300, 
  height = 225,
  backgroundColor = '#FAFAFA'
}) {
  const stageRef = useRef(null)

  // Filter visible items
  const visibleItems = items.filter(item => item.is_visible !== false && item.image_url)

  // If no items, show placeholder
  if (visibleItems.length === 0) {
    return (
      <div 
        className="w-full h-full flex items-center justify-center bg-background-elevated"
        style={{ backgroundColor }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      </div>
    )
  }

  // Calculate bounds to fit all items
  const bounds = visibleItems.reduce((acc, item) => {
    const itemWidth = item.width || 200
    const itemHeight = item.height || 200
    const left = item.x_position || 0
    const right = left + itemWidth
    const top = item.y_position || 0
    const bottom = top + itemHeight

    if (acc.minX === null || left < acc.minX) acc.minX = left
    if (acc.maxX === null || right > acc.maxX) acc.maxX = right
    if (acc.minY === null || top < acc.minY) acc.minY = top
    if (acc.maxY === null || bottom > acc.maxY) acc.maxY = bottom

    return acc
  }, { minX: null, maxX: null, minY: null, maxY: null })

  // Add padding around bounds
  const padding = 50
  const canvasWidth = Math.max(200, bounds.maxX - bounds.minX + padding * 2)
  const canvasHeight = Math.max(200, bounds.maxY - bounds.minY + padding * 2)

  // Calculate scale to fit preview
  const scaleX = width / canvasWidth
  const scaleY = height / canvasHeight
  const scale = Math.min(scaleX, scaleY, 1) // Don't scale up

  // Adjust bounds with padding
  const adjustedBounds = {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
  }

  return (
    <div 
      className="w-full h-full relative overflow-hidden rounded-t-lg"
      style={{ backgroundColor }}
    >
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        style={{ display: 'block' }}
      >
        <Layer>
          {/* Render all items */}
          {visibleItems.map((item) => (
            <PreviewItem
              key={item.id}
              item={item}
              scale={scale}
              bounds={adjustedBounds}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}

