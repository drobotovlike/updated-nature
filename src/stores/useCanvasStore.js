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
 * @property {string} [type] - Item type (e.g., 'image', 'text', 'shape')
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * Camera Interface
 * @typedef {Object} Camera
 * @property {number} x - X position in screen coordinates (pan)
 * @property {number} y - Y position in screen coordinates (pan)
 * @property {number} zoom - Zoom level (1.0 = 100%)
 */

/**
 * Interaction Mode
 * @typedef {'select' | 'pan' | 'draw' | 'text' | 'eraser' | 'outpaint' | 'dimension'} InteractionMode
 */

/**
 * Canvas Store
 * 
 * Centralized state management for the infinite canvas engine.
 * All canvas state lives here - no prop drilling, no useState chains.
 * 
 * Performance: Updates are instant (16ms), but database sync is debounced (500ms).
 */
export const useCanvasStore = create(
  subscribeWithSelector((set, get) => ({
    // ============================================
    // STATE: The "Truth"
    // ============================================

    /**
     * All canvas items in world coordinates
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
      backgroundColor: '#F6F2EE',
      gridEnabled: true,
      gridSize: 20,
      rulerEnabled: false,
      showMeasurements: true,
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
      sidebarOpen: true,
    },

    // ============================================
    // ACTIONS: Mutations
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

      // Calculate new camera position using zoom-to-cursor math
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
     * Set all items (used for loading/undo/redo)
     * @param {CanvasItem[]} items - New items array
     */
    setItems: (items) => {
      // DEFENSIVE: Ensure items is always an array
      if (!items) {
        console.warn('setItems called with null/undefined, defaulting to empty array')
        set({ items: [] })
        return
      }

      if (!Array.isArray(items)) {
        console.error('setItems called with non-array value:', items)
        console.trace('Stack trace for non-array setItems call')
        set({ items: [] })
        return
      }

      set({ items })
    },

    /**
     * Add a new item
     * @param {CanvasItem} item - Item to add
     */
    addItem: (item) => {
      set((state) => ({
        items: [...state.items, item],
      }))
    },

    /**
     * Update an item by ID
     * @param {string} id - Item ID
     * @param {Partial<CanvasItem>} update - Partial item update
     */
    updateItem: (id, update) => {
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, ...update } : item
        ),
      }))
    },

    /**
     * Delete an item by ID
     * @param {string} id - Item ID
     */
    deleteItem: (id) => {
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        selection: new Set([...state.selection].filter((selectedId) => selectedId !== id)),
      }))
    },

    /**
     * Delete multiple items
     * @param {string[]} ids - Array of item IDs
     */
    deleteItems: (ids) => {
      set((state) => {
        const idSet = new Set(ids)
        return {
          items: state.items.filter((item) => !idSet.has(item.id)),
          selection: new Set([...state.selection].filter((id) => !idSet.has(id))),
        }
      })
    },

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
     * Set interaction mode
     * @param {InteractionMode} mode - New interaction mode
     */
    setInteractionMode: (mode) => {
      set({ interactionMode: mode })
    },

    /**
     * Set canvas dimensions
     * @param {{ width: number, height: number }} dimensions - New dimensions
     */
    setDimensions: (dimensions) => {
      set({ dimensions })
    },

    /**
     * Update canvas settings
     * @param {Partial<typeof settings>} update - Partial settings update
     */
    updateSettings: (update) => {
      set((state) => ({
        settings: { ...state.settings, ...update },
      }))
    },

    /**
     * Update UI state
     * @param {Partial<typeof ui>} update - Partial UI update
     */
    updateUI: (update) => {
      set((state) => ({
        ui: { ...state.ui, ...update },
      }))
    },

    // ============================================
    // SELECTORS: Computed values
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
  }))
)

