import { useCanvasStore } from '../stores/useCanvasStore'

/**
 * Miro-Style Zoom Controls
 * 
 * Positioned at bottom-right corner.
 * Shows current zoom level with +/- buttons and fit-to-screen.
 */
export default function ZoomControls({ stageRef }) {
  const camera = useCanvasStore((state) => state.camera)
  const setCamera = useCanvasStore((state) => state.setCamera)
  const dimensions = useCanvasStore((state) => state.dimensions)

  const zoomPercentage = Math.round(camera.zoom * 100)

  const handleZoomIn = () => {
    const newZoom = Math.min(camera.zoom * 1.25, 5)
    const stage = stageRef?.current
    if (stage) {
      // Zoom to center of viewport
      const centerX = dimensions.width / 2
      const centerY = dimensions.height / 2
      
      const oldScale = camera.zoom
      const newScale = newZoom
      
      const mousePointTo = {
        x: (centerX - camera.x) / oldScale,
        y: (centerY - camera.y) / oldScale,
      }
      
      const newPos = {
        x: centerX - mousePointTo.x * newScale,
        y: centerY - mousePointTo.y * newScale,
      }
      
      setCamera({ x: newPos.x, y: newPos.y, zoom: newZoom })
      stage.scale({ x: newZoom, y: newZoom })
      stage.position(newPos)
    } else {
      setCamera({ ...camera, zoom: newZoom })
    }
  }

  const handleZoomOut = () => {
    const newZoom = Math.max(camera.zoom / 1.25, 0.1)
    const stage = stageRef?.current
    if (stage) {
      const centerX = dimensions.width / 2
      const centerY = dimensions.height / 2
      
      const oldScale = camera.zoom
      const newScale = newZoom
      
      const mousePointTo = {
        x: (centerX - camera.x) / oldScale,
        y: (centerY - camera.y) / oldScale,
      }
      
      const newPos = {
        x: centerX - mousePointTo.x * newScale,
        y: centerY - mousePointTo.y * newScale,
      }
      
      setCamera({ x: newPos.x, y: newPos.y, zoom: newZoom })
      stage.scale({ x: newZoom, y: newZoom })
      stage.position(newPos)
    } else {
      setCamera({ ...camera, zoom: newZoom })
    }
  }

  const handleFitToScreen = () => {
    const stage = stageRef?.current
    if (stage) {
      // Reset to 100% zoom centered
      const newZoom = 1
      const newPos = {
        x: dimensions.width / 2 - (dimensions.width / 2),
        y: dimensions.height / 2 - (dimensions.height / 2),
      }
      
      setCamera({ x: newPos.x, y: newPos.y, zoom: newZoom })
      stage.scale({ x: newZoom, y: newZoom })
      stage.position(newPos)
    }
  }

  const handleZoomTo100 = () => {
    const stage = stageRef?.current
    if (stage) {
      const newZoom = 1
      // Keep current center point
      const centerX = dimensions.width / 2
      const centerY = dimensions.height / 2
      
      const oldScale = camera.zoom
      const newScale = newZoom
      
      const mousePointTo = {
        x: (centerX - camera.x) / oldScale,
        y: (centerY - camera.y) / oldScale,
      }
      
      const newPos = {
        x: centerX - mousePointTo.x * newScale,
        y: centerY - mousePointTo.y * newScale,
      }
      
      setCamera({ x: newPos.x, y: newPos.y, zoom: newZoom })
      stage.scale({ x: newZoom, y: newZoom })
      stage.position(newPos)
    }
  }

  return (
    <div className="absolute bottom-6 right-6 z-40 flex items-center gap-2">
      {/* Fit to screen button */}
      <button
        onClick={handleFitToScreen}
        className="flex items-center justify-center w-9 h-9 bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-[#e5e5ed] text-[#6b7280] hover:bg-[#f5f5f5] hover:text-[#1a1a2e] transition-colors"
        title="Fit to screen"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3" />
          <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
          <path d="M3 16v3a2 2 0 0 0 2 2h3" />
          <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </button>

      {/* Zoom controls group */}
      <div className="flex items-center bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-[#e5e5ed] overflow-hidden">
        {/* Zoom out */}
        <button
          onClick={handleZoomOut}
          className="flex items-center justify-center w-9 h-9 text-[#6b7280] hover:bg-[#f5f5f5] hover:text-[#1a1a2e] transition-colors border-r border-[#e5e5ed]"
          title="Zoom out"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Zoom percentage - clickable to reset to 100% */}
        <button
          onClick={handleZoomTo100}
          className="flex items-center justify-center min-w-[56px] h-9 px-2 text-sm font-medium text-[#1a1a2e] hover:bg-[#f5f5f5] transition-colors"
          title="Reset to 100%"
        >
          {zoomPercentage}%
        </button>

        {/* Zoom in */}
        <button
          onClick={handleZoomIn}
          className="flex items-center justify-center w-9 h-9 text-[#6b7280] hover:bg-[#f5f5f5] hover:text-[#1a1a2e] transition-colors border-l border-[#e5e5ed]"
          title="Zoom in"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

