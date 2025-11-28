import { useMemo, useState } from 'react'
import { useCanvasStore } from '../stores/useCanvasStore'

const SNAP_THRESHOLD = 5 // pixels in screen space

/**
 * Smart Snapping Hook
 * 
 * Provides visual guidelines and snapping when dragging items.
 * Shows magenta guidelines when items align with other items (center, edges).
 * 
 * @param {Object} draggingItem - The item being dragged { id, x, y, width, height }
 * @param {Object} camera - Camera state { x, y, zoom }
 * @returns {Object} - { snapLines: Array, snapOffset: { x, y } }
 */
export function useSmartSnapping(draggingItem, camera) {
  const items = useCanvasStore((state) => state.items)
  const selection = useCanvasStore((state) => state.selection)

  const { snapLines, snapOffset } = useMemo(() => {
    if (!draggingItem) {
      return { snapLines: [], snapOffset: { x: 0, y: 0 } }
    }

    const { id: draggingId, x, y, width, height } = draggingItem
    const snapLines = []
    let snapOffsetX = 0
    let snapOffsetY = 0

    // Get all items except the one being dragged
    const otherItems = items.filter((item) => item.id !== draggingId)

    // Convert threshold to world space
    const worldThreshold = SNAP_THRESHOLD / camera.zoom

    // Check alignment with other items
    for (const item of otherItems) {
      const itemX = item.x_position || 0
      const itemY = item.y_position || 0
      const itemWidth = item.width || 0
      const itemHeight = item.height || 0

      // Check horizontal alignment (vertical lines)
      const leftDiff = Math.abs(x - itemX)
      const centerDiff = Math.abs(x + width / 2 - (itemX + itemWidth / 2))
      const rightDiff = Math.abs(x + width - (itemX + itemWidth))
      const itemRightDiff = Math.abs(x - (itemX + itemWidth))
      const itemLeftDiff = Math.abs(x + width - itemX)

      // Left edge alignment
      if (leftDiff < worldThreshold) {
        snapLines.push({
          type: 'vertical',
          x: itemX,
          from: Math.min(y, itemY),
          to: Math.max(y + height, itemY + itemHeight),
        })
        snapOffsetX = itemX - x
      }
      // Right edge alignment
      else if (rightDiff < worldThreshold) {
        snapLines.push({
          type: 'vertical',
          x: itemX + itemWidth,
          from: Math.min(y, itemY),
          to: Math.max(y + height, itemY + itemHeight),
        })
        snapOffsetX = itemX + itemWidth - (x + width)
      }
      // Center alignment
      else if (centerDiff < worldThreshold) {
        snapLines.push({
          type: 'vertical',
          x: itemX + itemWidth / 2,
          from: Math.min(y, itemY),
          to: Math.max(y + height, itemY + itemHeight),
        })
        snapOffsetX = itemX + itemWidth / 2 - (x + width / 2)
      }
      // Item's right edge to dragging item's left
      else if (itemRightDiff < worldThreshold) {
        snapLines.push({
          type: 'vertical',
          x: itemX + itemWidth,
          from: Math.min(y, itemY),
          to: Math.max(y + height, itemY + itemHeight),
        })
        snapOffsetX = itemX + itemWidth - x
      }
      // Item's left edge to dragging item's right
      else if (itemLeftDiff < worldThreshold) {
        snapLines.push({
          type: 'vertical',
          x: itemX,
          from: Math.min(y, itemY),
          to: Math.max(y + height, itemY + itemHeight),
        })
        snapOffsetX = itemX - (x + width)
      }

      // Check vertical alignment (horizontal lines)
      const topDiff = Math.abs(y - itemY)
      const middleDiff = Math.abs(y + height / 2 - (itemY + itemHeight / 2))
      const bottomDiff = Math.abs(y + height - (itemY + itemHeight))
      const itemBottomDiff = Math.abs(y - (itemY + itemHeight))
      const itemTopDiff = Math.abs(y + height - itemY)

      // Top edge alignment
      if (topDiff < worldThreshold) {
        snapLines.push({
          type: 'horizontal',
          y: itemY,
          from: Math.min(x, itemX),
          to: Math.max(x + width, itemX + itemWidth),
        })
        snapOffsetY = itemY - y
      }
      // Bottom edge alignment
      else if (bottomDiff < worldThreshold) {
        snapLines.push({
          type: 'horizontal',
          y: itemY + itemHeight,
          from: Math.min(x, itemX),
          to: Math.max(x + width, itemX + itemWidth),
        })
        snapOffsetY = itemY + itemHeight - (y + height)
      }
      // Center alignment
      else if (middleDiff < worldThreshold) {
        snapLines.push({
          type: 'horizontal',
          y: itemY + itemHeight / 2,
          from: Math.min(x, itemX),
          to: Math.max(x + width, itemX + itemWidth),
        })
        snapOffsetY = itemY + itemHeight / 2 - (y + height / 2)
      }
      // Item's bottom edge to dragging item's top
      else if (itemBottomDiff < worldThreshold) {
        snapLines.push({
          type: 'horizontal',
          y: itemY + itemHeight,
          from: Math.min(x, itemX),
          to: Math.max(x + width, itemX + itemWidth),
        })
        snapOffsetY = itemY + itemHeight - y
      }
      // Item's top edge to dragging item's bottom
      else if (itemTopDiff < worldThreshold) {
        snapLines.push({
          type: 'horizontal',
          y: itemY,
          from: Math.min(x, itemX),
          to: Math.max(x + width, itemX + itemWidth),
        })
        snapOffsetY = itemY - (y + height)
      }
    }

    return {
      snapLines,
      snapOffset: { x: snapOffsetX, y: snapOffsetY },
    }
  }, [draggingItem, items, camera])

  return { snapLines, snapOffset }
}

