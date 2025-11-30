import { useEffect, useRef, useCallback } from 'react'
import { useCanvasStore } from '../stores/useCanvasStore'
import { getCanvasData, saveCanvasState, createCanvasItem, updateCanvasItem, deleteCanvasItem } from '../utils/canvasManager'
import { useAuth, useClerk } from '@clerk/clerk-react'

/**
 * Canvas Sync Hook
 * 
 * Handles bidirectional sync between Zustand store and Supabase:
 * - Loads canvas data on mount
 * - Debounced save on state changes
 * - Individual item CRUD operations
 * 
 * @param {string} projectId - The project ID to sync
 */
export function useCanvasSync(projectId) {
  const { userId, isLoaded: authLoaded } = useAuth()
  const clerk = useClerk()
  
  // Check if clerk session is ready
  const isClerkReady = authLoaded && clerk?.session

  // Store selectors
  const items = useCanvasStore((state) => state.items)
  const setItems = useCanvasStore((state) => state.setItems)
  const getState = useCanvasStore.getState
  const camera = useCanvasStore((state) => state.camera)
  const setCamera = useCanvasStore((state) => state.setCamera)
  const setIsLoading = useCanvasStore((state) => state.setIsLoading)
  const setIsSyncing = useCanvasStore((state) => state.setIsSyncing)
  const setLastSyncedAt = useCanvasStore((state) => state.setLastSyncedAt)
  const setSyncError = useCanvasStore((state) => state.setSyncError)

  // Refs for tracking state
  const saveTimeoutRef = useRef(null)
  const isInitialLoad = useRef(true)
  const lastSavedItemsRef = useRef([])
  const lastSavedCameraRef = useRef({ x: 0, y: 0, zoom: 1 })

  /**
   * Load canvas data from Supabase
   */
  const loadCanvas = useCallback(async () => {
    if (!projectId || !userId || !isClerkReady) return

    setIsLoading(true)
    setSyncError(null)

    try {
      const data = await getCanvasData(userId, projectId, clerk)
      
      if (data.items && Array.isArray(data.items)) {
        setItems(data.items)
        lastSavedItemsRef.current = data.items
      }
      
      if (data.state) {
        const newCamera = {
          x: data.state.pan_x || 0,
          y: data.state.pan_y || 0,
          zoom: data.state.zoom_level || 1,
        }
        setCamera(newCamera)
        lastSavedCameraRef.current = newCamera
      }
      
      isInitialLoad.current = false
      setLastSyncedAt(new Date())
    } catch (error) {
      console.error('Failed to load canvas:', error)
      setSyncError(error.message || 'Failed to load canvas')
    } finally {
      setIsLoading(false)
    }
  }, [projectId, userId, clerk, isClerkReady, setItems, setCamera, setIsLoading, setLastSyncedAt, setSyncError])

  /**
   * Save canvas state to Supabase (debounced)
   */
  const saveCanvasDebounced = useCallback(async () => {
    if (!projectId || !userId || !isClerkReady || isInitialLoad.current) return

    setIsSyncing(true)
    setSyncError(null)

    try {
      // Save camera state
      const cameraChanged = 
        camera.x !== lastSavedCameraRef.current.x ||
        camera.y !== lastSavedCameraRef.current.y ||
        camera.zoom !== lastSavedCameraRef.current.zoom

      if (cameraChanged) {
        await saveCanvasState(userId, projectId, {
          zoom_level: camera.zoom,
          pan_x: camera.x,
          pan_y: camera.y,
        }, clerk)
        lastSavedCameraRef.current = { ...camera }
      }

      setLastSyncedAt(new Date())
    } catch (error) {
      console.error('Failed to save canvas state:', error)
      setSyncError(error.message || 'Failed to save')
    } finally {
      setIsSyncing(false)
    }
  }, [projectId, userId, clerk, isClerkReady, camera, setIsSyncing, setLastSyncedAt, setSyncError])

  /**
   * Create a new item with optimistic update
   * Updates UI immediately, syncs to database in background
   */
  const createItem = useCallback(async (itemData) => {
    if (!projectId || !userId || !isClerkReady) return null

    // Generate temporary ID for optimistic update
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const optimisticItem = {
      ...itemData,
      id: tempId,
      project_id: projectId,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Optimistic update - add to store immediately
    setItems((items) => [...items, optimisticItem])

    try {
      // Sync to database in background
      const newItem = await createCanvasItem(userId, projectId, itemData, clerk)
      
      // Replace temporary item with real item from database
      setItems((items) =>
        items.map((item) => (item.id === tempId ? newItem : item))
      )
      
      return newItem
    } catch (error) {
      console.error('Failed to create item:', error)
      // Rollback optimistic update on error
      setItems((items) => items.filter((item) => item.id !== tempId))
      setSyncError(error.message || 'Failed to create item')
      return null
    }
  }, [projectId, userId, clerk, isClerkReady, setItems, setSyncError])

  /**
   * Update an item with optimistic update
   * Updates UI immediately, syncs to database in background
   */
  const updateItemSync = useCallback(async (itemId, updates) => {
    if (!userId || !isClerkReady) return false

    // Get current item for rollback
    const currentItems = getState().items
    const currentItem = currentItems.find((item) => item.id === itemId)
    if (!currentItem) return false

    // Optimistic update - update store immediately
    setItems((items) =>
      items.map((item) =>
        item.id === itemId ? { ...item, ...updates, updated_at: new Date().toISOString() } : item
      )
    )

    try {
      // Sync to database in background
      await updateCanvasItem(userId, itemId, updates, clerk)
      return true
    } catch (error) {
      console.error('Failed to update item:', error)
      // Rollback optimistic update on error
      setItems((items) =>
        items.map((item) => (item.id === itemId ? currentItem : item))
      )
      setSyncError(error.message || 'Failed to update item')
      return false
    }
  }, [userId, clerk, isClerkReady, setItems, setSyncError, getState])

  /**
   * Delete an item with optimistic update
   * Removes from UI immediately, syncs to database in background
   */
  const deleteItemSync = useCallback(async (itemId) => {
    if (!userId || !isClerkReady) return false

    // Get current item for rollback
    const currentItems = getState().items
    const itemToDelete = currentItems.find((item) => item.id === itemId)
    if (!itemToDelete) return false

    // Optimistic update - remove from store immediately
    setItems((items) => items.filter((item) => item.id !== itemId))

    try {
      // Sync to database in background
      await deleteCanvasItem(userId, itemId, clerk)
      return true
    } catch (error) {
      console.error('Failed to delete item:', error)
      // Rollback optimistic update on error
      setItems((items) => [...items, itemToDelete])
      setSyncError(error.message || 'Failed to delete item')
      return false
    }
  }, [userId, clerk, isClerkReady, setItems, setSyncError, getState])

  // Load canvas data on mount (when clerk is ready)
  useEffect(() => {
    if (isClerkReady) {
      loadCanvas()
    }
  }, [loadCanvas, isClerkReady])

  // Debounced save on camera change
  useEffect(() => {
    if (isInitialLoad.current) return
    if (!projectId || !userId || !isClerkReady) return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Debounce save (500ms)
    saveTimeoutRef.current = setTimeout(() => {
      saveCanvasDebounced()
    }, 500)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [camera, projectId, userId, isClerkReady, saveCanvasDebounced])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    // State
    isLoading: useCanvasStore((state) => state.isLoading),
    isSyncing: useCanvasStore((state) => state.isSyncing),
    lastSyncedAt: useCanvasStore((state) => state.lastSyncedAt),
    syncError: useCanvasStore((state) => state.syncError),
    
    // Actions
    loadCanvas,
    createItem,
    updateItemSync,
    deleteItemSync,
    
    // Manual save trigger
    saveNow: saveCanvasDebounced,
  }
}

export default useCanvasSync

