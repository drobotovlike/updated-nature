import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

/**
 * Canvas Item Interface (TypeScript-like documentation)
 * @typedef {Object} CanvasItem
 * @property {string} id - Unique identifier
 * @property {number} x_position - X position in world coordinates
 * @property {number} y_position - Y position in world coordinates
 * @property {number} width - Width in world units
 * @property {number} height - Height in world units
 * @property {string} image_url - URL of the image
 * @property {number} [rotation] - Rotation in degrees
 * @property {number} [opacity] - Opacity 0-1
 * @property {string} [type] - Item type (e.g., 'image', 'text', 'shape', 'sticky', 'arrow')
 * @property {Object} [metadata] - Additional metadata
 * @property {number} [z_index] - Layer order
 */

/**
 * Camera Interface
 * @typedef {Object} Camera
 * @property {number} x - X position in screen coordinates (pan)
 * @property {number} y - Y position in screen coordinates (pan)
 * @property {number} zoom - Zoom level (1.0 = 100%)
 */

/**
 * Interaction Mode - Updated with new tools
 * @typedef {'select' | 'pan' | 'generate' | 'rectangle' | 'arrow' | 'text' | 'sticky' | 'measure'} InteractionMode
 */

/**
 * Canvas Store
 * 
 * Centralized state management for the infinite canvas engine.
 * All canvas state lives here - no prop drilling, no useState chains.
 * 
 * Architecture: Single source of truth (Zustand) → REST API → Supabase
 */
export const useCanvasStore = create(
  subscribeWithSelector((set, get) => ({
    // ============================================
    // STATE: The "Truth"
    // ============================================

    /**
     * Canvas items - THE source of truth for all objects on canvas
     * @type {CanvasItem[]}
     */
    items: [],

    /**
     * Camera/viewport state
     * @type {Camera}
     */
    camera: {
      x: 0,
      y: 0,
      zoom: 1,
    },

    /**
     * Selected item IDs (Set for O(1) lookups)
     * @type {Set<string>}
     */
    selection: new Set(),

    /**
     * Current interaction mode
     * @type {InteractionMode}
     */
    interactionMode: 'select',

    /**
     * Canvas dimensions (viewport size)
     * @type {{ width: number, height: number }}
     */
    dimensions: { width: 0, height: 0 },

    /**
     * Canvas settings
     * @type {Object}
     */
    settings: {
      // Miro uses a warm off-white: #F5F5F5 or #FAFAFA
      backgroundColor: '#FAFAFA',
      gridEnabled: true,
      gridSize: 24, // Miro-style 24px grid
      rulerEnabled: false,
      showMeasurements: true,
      snapToGrid: false,
    },

    /**
     * UI state (modals, panels, etc.)
     * @type {Object}
     */
    ui: {
      showAssetLibrary: false,
      showExportModal: false,
      showLayersPanel: false,
      showGenerateModal: false,
      showAIPrompt: false,
      sidebarOpen: true,
    },

    /**
     * Loading and sync state
     */
    isLoading: false,
    isSyncing: false,
    lastSyncedAt: null,
    syncError: null,

    /**
     * Performance optimization: track panning state
     * Used to disable expensive renders (like grid) during panning
     */
    isPanning: false,

    /**
     * Collaboration state
     */
    onlineUsers: [], // Array of { userId, online_at, ... }
    isConnected: false, // Real-time connection status

    /**
     * AI Generation state
     */
    aiPrompt: '',
    aiGenerating: false,
    aiSelectionBounds: null, // { x, y, width, height } for the AI generation area

    // ============================================
    // ITEM ACTIONS
    // ============================================

    /**
     * Helper: Sort items by z_index (ascending) for correct stacking
     * PERFORMANCE: Called only when items change, not on every render
     */
    _sortByZIndex: (items) => {
      return [...items].sort((a, b) => (a.z_index || 0) - (b.z_index || 0))
    },

    /**
     * Set all items (used for loading from database)
     * Supports both direct array and callback function pattern
     * PERFORMANCE: Items are pre-sorted to avoid sorting on every render
     * @param {CanvasItem[]|Function} itemsOrUpdater
     */
    setItems: (itemsOrUpdater) => {
      if (typeof itemsOrUpdater === 'function') {
        set((state) => {
          const newItems = itemsOrUpdater(state.items)
          return {
            items: get()._sortByZIndex(Array.isArray(newItems) ? newItems : [])
          }
        })
      } else {
        const items = Array.isArray(itemsOrUpdater) ? itemsOrUpdater : []
        set({ items: get()._sortByZIndex(items) })
      }
    },

    /**
     * Add a new item to the canvas
     * PERFORMANCE: Maintains sorted order
     * @param {CanvasItem} item
     */
    addItem: (item) => {
      set((state) => ({
        items: get()._sortByZIndex([...state.items, item]),
      }))
    },

    /**
     * Update an existing item
     * PERFORMANCE: Re-sorts only if z_index changed
     * @param {string} id - Item ID
     * @param {Partial<CanvasItem>} updates - Partial updates
     */
    updateItem: (id, updates) => {
      set((state) => {
        const newItems = state.items.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        )
        // Only re-sort if z_index was updated
        if ('z_index' in updates) {
          return { items: get()._sortByZIndex(newItems) }
        }
        return { items: newItems }
      })
    },

    /**
     * Delete a single item
     * @param {string} id - Item ID
     */
    deleteItem: (id) => {
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        selection: (() => {
          const newSelection = new Set(state.selection)
          newSelection.delete(id)
          return newSelection
        })(),
      }))
    },

    /**
     * Delete multiple items
     * @param {string[]} ids - Array of item IDs
     */
    deleteItems: (ids) => {
      const idSet = new Set(ids)
      set((state) => ({
        items: state.items.filter((item) => !idSet.has(item.id)),
        selection: new Set([...state.selection].filter((id) => !idSet.has(id))),
      }))
    },

    /**
     * Reorder items (for z-index changes)
     * PERFORMANCE: Maintains sorted order
     * @param {CanvasItem[]} reorderedItems
     */
    reorderItems: (reorderedItems) => {
      set({ items: get()._sortByZIndex(reorderedItems) })
    },

    /**
     * Bring item to front
     * PERFORMANCE: Maintains sorted order
     * @param {string} id
     */
    bringToFront: (id) => {
      set((state) => {
        const item = state.items.find((i) => i.id === id)
        if (!item) return state
        const maxZ = Math.max(...state.items.map((i) => i.z_index || 0))
        const newItems = state.items.map((i) =>
          i.id === id ? { ...i, z_index: maxZ + 1 } : i
        )
        return { items: get()._sortByZIndex(newItems) }
      })
    },

    /**
     * Send item to back
     * PERFORMANCE: Maintains sorted order
     * @param {string} id
     */
    sendToBack: (id) => {
      set((state) => {
        const item = state.items.find((i) => i.id === id)
        if (!item) return state
        const minZ = Math.min(...state.items.map((i) => i.z_index || 0))
        const newItems = state.items.map((i) =>
          i.id === id ? { ...i, z_index: minZ - 1 } : i
        )
        return { items: get()._sortByZIndex(newItems) }
      })
    },

    // ============================================
    // CAMERA ACTIONS
    // ============================================

    /**
     * Set camera position and/or zoom
     * @param {Partial<Camera>} update - Partial camera update
     */
    setCamera: (update) => {
      set((state) => ({
        camera: { ...state.camera, ...update },
      }))
    },

    /**
     * Update camera with zoom-to-cursor logic
     * @param {Object} mousePoint - { x: number, y: number } in screen coordinates
     * @param {number} newZoom - New zoom level
     */
    zoomToCursor: (mousePoint, newZoom) => {
      const state = get()
      const { camera } = state

      const zoomRatio = newZoom / camera.zoom
      const newX = mousePoint.x - (mousePoint.x - camera.x) * zoomRatio
      const newY = mousePoint.y - (mousePoint.y - camera.y) * zoomRatio

      set({
        camera: {
          x: newX,
          y: newY,
          zoom: newZoom,
        },
      })
    },

    /**
     * Pan the camera
     * @param {number} deltaX - Change in X (screen coordinates)
     * @param {number} deltaY - Change in Y (screen coordinates)
     */
    panCamera: (deltaX, deltaY) => {
      set((state) => ({
        camera: {
          ...state.camera,
          x: state.camera.x + deltaX,
          y: state.camera.y + deltaY,
        },
      }))
    },

    /**
     * Reset camera to default position
     */
    resetCamera: () => {
      set({
        camera: { x: 0, y: 0, zoom: 1 },
      })
    },

    /**
     * Fit all items in view
     */
    fitToScreen: () => {
      const state = get()
      if (state.items.length === 0) {
        set({ camera: { x: 0, y: 0, zoom: 1 } })
        return
      }

      // Calculate bounding box of all items
      const bounds = state.items.reduce(
        (acc, item) => ({
          minX: Math.min(acc.minX, item.x_position || 0),
          minY: Math.min(acc.minY, item.y_position || 0),
          maxX: Math.max(acc.maxX, (item.x_position || 0) + (item.width || 100)),
          maxY: Math.max(acc.maxY, (item.y_position || 0) + (item.height || 100)),
        }),
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
      )

      const padding = 100
      const contentWidth = bounds.maxX - bounds.minX + padding * 2
      const contentHeight = bounds.maxY - bounds.minY + padding * 2

      const zoomX = state.dimensions.width / contentWidth
      const zoomY = state.dimensions.height / contentHeight
      const zoom = Math.min(zoomX, zoomY, 1) // Don't zoom in more than 100%

      const centerX = (bounds.minX + bounds.maxX) / 2
      const centerY = (bounds.minY + bounds.maxY) / 2

      set({
        camera: {
          x: state.dimensions.width / 2 - centerX * zoom,
          y: state.dimensions.height / 2 - centerY * zoom,
          zoom,
        },
      })
    },

    // ============================================
    // SELECTION ACTIONS
    // ============================================

    /**
     * Set selection (single or multiple)
     * @param {string|string[]|null} ids - Item ID(s) to select, or null to clear
     */
    setSelection: (ids) => {
      if (ids === null) {
        set({ selection: new Set() })
      } else if (Array.isArray(ids)) {
        set({ selection: new Set(ids) })
      } else {
        set({ selection: new Set([ids]) })
      }
    },

    /**
     * Add to selection (multi-select)
     * @param {string} id - Item ID to add
     */
    addToSelection: (id) => {
      set((state) => ({
        selection: new Set([...state.selection, id]),
      }))
    },

    /**
     * Remove from selection
     * @param {string} id - Item ID to remove
     */
    removeFromSelection: (id) => {
      set((state) => {
        const newSelection = new Set(state.selection)
        newSelection.delete(id)
        return { selection: newSelection }
      })
    },

    /**
     * Toggle selection (add if not selected, remove if selected)
     * @param {string} id - Item ID to toggle
     */
    toggleSelection: (id) => {
      set((state) => {
        const newSelection = new Set(state.selection)
        if (newSelection.has(id)) {
          newSelection.delete(id)
        } else {
          newSelection.add(id)
        }
        return { selection: newSelection }
      })
    },

    /**
     * Clear selection
     */
    clearSelection: () => {
      set({ selection: new Set() })
    },

    /**
     * Select all items
     */
    selectAll: () => {
      set((state) => ({
        selection: new Set(state.items.map((item) => item.id)),
      }))
    },

    // ============================================
    // INTERACTION MODE ACTIONS
    // ============================================

    /**
     * Set interaction mode
     * @param {InteractionMode} mode - New interaction mode
     */
    setInteractionMode: (mode) => {
      set({ interactionMode: mode })
    },

    // ============================================
    // DIMENSION ACTIONS
    // ============================================

    /**
     * Set canvas dimensions
     * @param {{ width: number, height: number }} dimensions - New dimensions
     */
    setDimensions: (dimensions) => {
      set({ dimensions })
    },

    // ============================================
    // SETTINGS ACTIONS
    // ============================================

    /**
     * Update canvas settings
     * @param {Partial<typeof settings>} update - Partial settings update
     */
    updateSettings: (update) => {
      set((state) => ({
        settings: { ...state.settings, ...update },
      }))
    },

    // ============================================
    // UI ACTIONS
    // ============================================

    /**
     * Update UI state
     * @param {Partial<typeof ui>} update - Partial UI update
     */
    updateUI: (update) => {
      set((state) => ({
        ui: { ...state.ui, ...update },
      }))
    },

    /**
     * Toggle asset library panel
     */
    toggleAssetLibrary: () => {
      set((state) => ({
        ui: { ...state.ui, showAssetLibrary: !state.ui.showAssetLibrary },
      }))
    },

    /**
     * Toggle layers panel
     */
    toggleLayersPanel: () => {
      set((state) => ({
        ui: { ...state.ui, showLayersPanel: !state.ui.showLayersPanel },
      }))
    },

    // ============================================
    // SYNC STATE ACTIONS
    // ============================================

    setIsLoading: (isLoading) => set({ isLoading }),
    setIsSyncing: (isSyncing) => set({ isSyncing }),
    setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
    setSyncError: (syncError) => set({ syncError }),
    setIsPanning: (isPanning) => set({ isPanning }),
    setOnlineUsers: (onlineUsers) => set({ onlineUsers }),
    setIsConnected: (isConnected) => set({ isConnected }),

    // ============================================
    // AI GENERATION ACTIONS
    // ============================================

    setAIPrompt: (aiPrompt) => set({ aiPrompt }),
    setAIGenerating: (aiGenerating) => set({ aiGenerating }),
    setAISelectionBounds: (aiSelectionBounds) => set({ aiSelectionBounds }),

    /**
     * Open AI prompt modal with optional selection bounds
     */
    openAIPrompt: (bounds = null) => {
      set({
        ui: { ...get().ui, showAIPrompt: true },
        aiSelectionBounds: bounds,
        aiPrompt: '',
      })
    },

    /**
     * Close AI prompt modal
     */
    closeAIPrompt: () => {
      set({
        ui: { ...get().ui, showAIPrompt: false },
        aiSelectionBounds: null,
        aiPrompt: '',
      })
    },

    // ============================================
    // SELECTORS (Computed values)
    // ============================================

    /**
     * Get selected items
     * @returns {CanvasItem[]}
     */
    getSelectedItems: () => {
      const state = get()
      const selectionArray = Array.from(state.selection)
      return state.items.filter((item) => selectionArray.includes(item.id))
    },

    /**
     * Get primary selected item (first in selection)
     * @returns {CanvasItem|null}
     */
    getPrimarySelectedItem: () => {
      const state = get()
      if (state.selection.size === 0) return null
      const firstId = Array.from(state.selection)[0]
      return state.items.find((item) => item.id === firstId) || null
    },

    /**
     * Check if an item is selected
     * @param {string} id - Item ID
     * @returns {boolean}
     */
    isSelected: (id) => {
      return get().selection.has(id)
    },

    /**
     * Get items sorted by z-index
     * @returns {CanvasItem[]}
     */
    getItemsSortedByZIndex: () => {
      return [...get().items].sort((a, b) => (a.z_index || 0) - (b.z_index || 0))
    },
  }))
)
