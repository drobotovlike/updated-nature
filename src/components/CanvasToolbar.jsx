import { useCanvasStore } from '../stores/useCanvasStore'

/**
 * Miro-Style Canvas Toolbar
 * 
 * A clean, minimal floating toolbar at the bottom center.
 * Only essential tools - no clutter.
 */

// Tool button with Miro-style hover effects
function ToolButton({ active, onClick, title, children, variant = 'default', disabled = false }) {
  const baseClasses = "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200"
  
  const variantClasses = {
    default: active 
      ? "bg-[#4262FF] text-white shadow-md" 
      : "text-[#1a1a2e] hover:bg-[#f0f0f5] active:bg-[#e5e5ed]",
    ai: active
      ? "bg-gradient-to-br from-[#FF6B6B] to-[#FF8E53] text-white shadow-lg"
      : "text-[#FF6B6B] hover:bg-[#fff0ed] active:bg-[#ffe5df]",
    action: "text-[#6b7280] hover:bg-[#f0f0f5] hover:text-[#1a1a2e] active:bg-[#e5e5ed]"
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      title={title}
    >
      {children}
    </button>
  )
}

// Vertical divider
function Divider() {
  return <div className="w-px h-6 bg-[#e5e5ed] mx-1" />
}

export default function CanvasToolbar({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onUpload,
  onExport,
  onToggleAssetLibrary,
  onToggleLayersPanel,
  showAssetLibrary,
  showLayersPanel,
  hasItems,
}) {
  const interactionMode = useCanvasStore((state) => state.interactionMode)
  const setInteractionMode = useCanvasStore((state) => state.setInteractionMode)

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center gap-1 px-2 py-2 bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.08)] border border-[#e5e5ed]">
        
        {/* Select Tool */}
          <ToolButton
            active={interactionMode === 'select'}
            onClick={() => setInteractionMode('select')}
          title="Select (V)"
          >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            </svg>
          </ToolButton>

        {/* Pan Tool */}
          <ToolButton
            active={interactionMode === 'pan'}
            onClick={() => setInteractionMode('pan')}
          title="Pan (H or Space+Drag)"
          >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
              <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
              <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
            </svg>
          </ToolButton>

        <Divider />

        {/* Undo */}
        <ToolButton
          onClick={onUndo}
          title="Undo (⌘Z)"
          variant="action"
          disabled={!canUndo}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </ToolButton>

        {/* Redo */}
        <ToolButton
          onClick={onRedo}
          title="Redo (⌘⇧Z)"
          variant="action"
          disabled={!canRedo}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
          </svg>
        </ToolButton>

        <Divider />

        {/* AI Generate - The Star Feature */}
        <ToolButton
          active={interactionMode === 'generate'}
          onClick={() => setInteractionMode('generate')}
          title="AI Generate (G) - Draw area to generate"
          variant="ai"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          </svg>
        </ToolButton>

        <Divider />

        {/* Upload Image */}
          <ToolButton
          onClick={onUpload}
          title="Upload Image"
          variant="action"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </ToolButton>

        {/* Asset Library */}
        <ToolButton
          active={showAssetLibrary}
          onClick={onToggleAssetLibrary}
          title="Asset Library"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
        </ToolButton>

        {/* Layers Panel - only show if there are items */}
        {hasItems && (
          <ToolButton
            active={showLayersPanel}
            onClick={onToggleLayersPanel}
            title="Layers"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </ToolButton>
        )}
          
        {/* Export - only show if there are items */}
          {hasItems && (
          <>
            <Divider />
            <ToolButton
              onClick={onExport}
              title="Export"
              variant="action"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </ToolButton>
          </>
        )}
      </div>
    </div>
  )
}
