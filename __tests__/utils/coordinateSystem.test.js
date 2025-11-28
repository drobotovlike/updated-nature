import { toWorld, toScreen, zoomToCursor } from '../../src/utils/coordinateSystem'

describe('Coordinate System', () => {
  const camera = { x: 100, y: 100, zoom: 2 }

  describe('toWorld', () => {
    test('converts screen coordinates to world coordinates', () => {
      const screenPoint = { x: 200, y: 200 }
      const result = toWorld(screenPoint, camera)
      
      // (200 - 100) / 2 = 50
      expect(result).toEqual({ x: 50, y: 50 })
    })

    test('handles different zoom levels', () => {
      const screenPoint = { x: 200, y: 200 }
      const zoomedCamera = { x: 100, y: 100, zoom: 4 }
      const result = toWorld(screenPoint, zoomedCamera)
      
      // (200 - 100) / 4 = 25
      expect(result).toEqual({ x: 25, y: 25 })
    })

    test('handles negative coordinates', () => {
      const screenPoint = { x: 50, y: 50 }
      const result = toWorld(screenPoint, camera)
      
      // (50 - 100) / 2 = -25
      expect(result).toEqual({ x: -25, y: -25 })
    })
  })

  describe('toScreen', () => {
    test('converts world coordinates to screen coordinates', () => {
      const worldPoint = { x: 50, y: 50 }
      const result = toScreen(worldPoint, camera)
      
      // 50 * 2 + 100 = 200
      expect(result).toEqual({ x: 200, y: 200 })
    })

    test('is inverse of toWorld', () => {
      const worldPoint = { x: 42, y: 84 }
      const screenPoint = toScreen(worldPoint, camera)
      const backToWorld = toWorld(screenPoint, camera)
      
      expect(backToWorld.x).toBeCloseTo(worldPoint.x)
      expect(backToWorld.y).toBeCloseTo(worldPoint.y)
    })
  })

  describe('zoomToCursor', () => {
    test('calculates new camera position for zoom', () => {
      const mousePoint = { x: 300, y: 300 }
      const oldCamera = { x: 100, y: 100, zoom: 2 }
      const newZoom = 4
      
      const result = zoomToCursor(mousePoint, oldCamera, newZoom)
      
      // New position should maintain cursor's world position
      const oldWorldPos = toWorld(mousePoint, oldCamera)
      const newCamera = { ...result, zoom: newZoom }
      const newWorldPos = toWorld(mousePoint, newCamera)
      
      expect(newWorldPos.x).toBeCloseTo(oldWorldPos.x)
      expect(newWorldPos.y).toBeCloseTo(oldWorldPos.y)
    })
  })
})

