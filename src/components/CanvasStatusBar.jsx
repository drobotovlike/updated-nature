import { useCanvasStore } from '../stores/useCanvasStore'

/**
 * Canvas Status Bar
 * 
 * Bottom bar showing:
 * - Zoom controls
 * - Selection info
 * - Canvas coordinates
 * - Sync status
 */
export default function CanvasStatusBar({ 
  onZoomIn, 
  onZoomOut, 
  onZoomReset, 
  onFitToScreen,
  itemCount,
  selectedCount,
  isSyncing,
  lastSyncedAt,
  projectName
}) {
  const camera = useCanvasStore((state) => state.camera)
  const zoomPercentage = Math.round(camera.zoom * 100)

  const formatTime = (date) => {
    if (!date) return ''
    const now = new Date()
    const diff = now - date
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center gap-2">
        {/* Zoom Controls */}
        <div className="flex items-center gap-1 px-2 py-1.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-stone-200/50">
          <button
            onClick={onZoomOut}
            className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors text-stone-500 hover:text-stone-700"
            title="Zoom out (-)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          
          <button
            onClick={onZoomReset}
            className="min-w-[52px] px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            title="Reset zoom (⌘0)"
          >
            {zoomPercentage}%
          </button>
          
          <button
            onClick={onZoomIn}
            className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors text-stone-500 hover:text-stone-700"
            title="Zoom in (+)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>

          <div className="w-px h-5 bg-stone-200 mx-1" />

          <button
            onClick={onFitToScreen}
            className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors text-stone-500 hover:text-stone-700"
            title="Fit to screen (⌘1)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3" />
              <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
              <path d="M3 16v3a2 2 0 0 0 2 2h3" />
              <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
          </button>
        </div>

        {/* Selection/Items Info */}
        <div className="flex items-center gap-3 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-stone-200/50">
          {selectedCount > 0 ? (
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-stone-600">
                {selectedCount} selected
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2 2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              <span>{itemCount} items</span>
            </div>
          )}

          <div className="w-px h-4 bg-stone-200" />

          {/* Sync Status */}
          <div className="flex items-center gap-2 text-xs">
            {isSyncing ? (
              <>
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                <span className="text-stone-500">Saving...</span>
              </>
            ) : lastSyncedAt ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-stone-500">{formatTime(lastSyncedAt)}</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-stone-300 rounded-full" />
                <span className="text-stone-400">Not saved</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

