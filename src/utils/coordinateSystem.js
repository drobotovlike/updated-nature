/**
 * Coordinate System Utility
 * 
 * The "Holy Grail" of Canvas Engines: Strict separation between Screen and World coordinates.
 * 
 * Screen Coordinates: (clientX, clientY) from DOM events - where the mouse is on the viewport
 * World Coordinates: (x, y) in the infinite canvas space - where things actually exist
 * 
 * This utility handles all transformations between these two coordinate systems,
 * accounting for camera position (pan) and zoom level.
 */

/**
 * Convert screen coordinates to world coordinates
 * 
 * @param {Object} screenPoint - { x: number, y: number } in screen pixels
 * @param {Object} camera - { x: number, y: number, zoom: number }
 * @returns {Object} - { x: number, y: number } in world space
 * 
 * Math: worldX = (screenX - camera.x) / camera.zoom
 *       worldY = (screenY - camera.y) / camera.zoom
 */
export function toWorld(screenPoint, camera) {
  const { x: screenX, y: screenY } = screenPoint
  const { x: cameraX, y: cameraY, zoom } = camera
  
  return {
    x: (screenX - cameraX) / zoom,
    y: (screenY - cameraY) / zoom,
  }
}

/**
 * Convert world coordinates to screen coordinates
 * 
 * @param {Object} worldPoint - { x: number, y: number } in world space
 * @param {Object} camera - { x: number, y: number, zoom: number }
 * @returns {Object} - { x: number, y: number } in screen pixels
 * 
 * Math: screenX = worldX * camera.zoom + camera.x
 *       screenY = worldY * camera.zoom + camera.y
 */
export function toScreen(worldPoint, camera) {
  const { x: worldX, y: worldY } = worldPoint
  const { x: cameraX, y: cameraY, zoom } = camera
  
  return {
    x: worldX * zoom + cameraX,
    y: worldY * zoom + cameraY,
  }
}

/**
 * Convert a Konva stage pointer position to world coordinates
 * 
 * @param {Object} stage - Konva Stage instance
 * @returns {Object|null} - { x: number, y: number } in world space, or null if stage unavailable
 */
export function getWorldPointerPosition(stage) {
  if (!stage) return null
  
  const pointerPos = stage.getPointerPosition()
  if (!pointerPos) return null
  
  const camera = {
    x: stage.x(),
    y: stage.y(),
    zoom: stage.scaleX(), // Assuming uniform scaling
  }
  
  return toWorld(pointerPos, camera)
}

/**
 * Get the viewport bounds in world coordinates
 * 
 * @param {Object} stage - Konva Stage instance
 * @param {Object} dimensions - { width: number, height: number } of the stage
 * @returns {Object} - { left: number, right: number, top: number, bottom: number } in world space
 */
export function getWorldViewport(stage, dimensions) {
  if (!stage || !dimensions) {
    return { left: 0, right: 0, top: 0, bottom: 0 }
  }
  
  const camera = {
    x: stage.x(),
    y: stage.y(),
    zoom: stage.scaleX(),
  }
  
  const topLeft = toWorld({ x: 0, y: 0 }, camera)
  const bottomRight = toWorld({ x: dimensions.width, y: dimensions.height }, camera)
  
  return {
    left: topLeft.x,
    right: bottomRight.x,
    top: topLeft.y,
    bottom: bottomRight.y,
  }
}

/**
 * Check if a world rectangle intersects with the viewport
 * Used for viewport culling (performance optimization)
 * 
 * @param {Object} bounds - { x: number, y: number, width: number, height: number } in world space
 * @param {Object} viewport - { left: number, right: number, top: number, bottom: number } in world space
 * @param {number} padding - Optional padding in world units
 * @returns {boolean} - True if the bounds intersect the viewport
 */
export function intersectsViewport(bounds, viewport, padding = 0) {
  const { x, y, width, height } = bounds
  const { left, right, top, bottom } = viewport
  
  return !(
    x + width < left - padding ||
    x > right + padding ||
    y + height < top - padding ||
    y > bottom + padding
  )
}

/**
 * Calculate zoom-to-cursor transformation
 * 
 * When zooming, we want to zoom towards the mouse cursor, not the center.
 * This calculates the new camera position after a zoom change.
 * 
 * @param {Object} mousePoint - { x: number, y: number } in screen coordinates
 * @param {Object} oldCamera - { x: number, y: number, zoom: number }
 * @param {number} newZoom - The new zoom level
 * @returns {Object} - { x: number, y: number } new camera position
 * 
 * Math: newPos = mousePoint - (mousePoint - oldPos) * (newZoom / oldZoom)
 */
export function zoomToCursor(mousePoint, oldCamera, newZoom) {
  const { x: mouseX, y: mouseY } = mousePoint
  const { x: oldX, y: oldY, zoom: oldZoom } = oldCamera
  
  const zoomRatio = newZoom / oldZoom
  
  return {
    x: mouseX - (mouseX - oldX) * zoomRatio,
    y: mouseY - (mouseY - oldY) * zoomRatio,
  }
}

