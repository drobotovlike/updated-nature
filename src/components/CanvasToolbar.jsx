import { useCanvasStore } from '../stores/useCanvasStore'

/**
 * Professional Canvas Toolbar
 * 
 * A clean, Figma/Miro-inspired toolbar with organized tool groups:
 * - Navigation: Select, Pan
 * - AI: Generate (the core differentiator)
 * - Drawing: Shapes, Arrow
 * - Annotation: Text, Sticky Note
 * - Measurement: Dimension tool
 * - Panels: Asset Library, Layers (right side)
 */

// Tool button component with consistent styling
function ToolButton({ active, onClick, title, hotkey, children, variant = 'default' }) {
  const baseClasses = "relative p-2.5 rounded-lg transition-all duration-150 group"
  const variantClasses = {
    default: active 
      ? "bg-stone-900 text-white shadow-sm" 
      : "text-stone-500 hover:bg-stone-100 hover:text-stone-700",
    ai: active
      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-200"
      : "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-600 hover:from-amber-100 hover:to-orange-100 border border-amber-200",
    panel: active
      ? "bg-stone-100 text-stone-900"
      : "text-stone-400 hover:bg-stone-50 hover:text-stone-600"
  }

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]}`}
      title={`${title}${hotkey ? ` (${hotkey})` : ''}`}
    >
      {children}
      {/* Hotkey badge */}
      {hotkey && (
        <span className="absolute -bottom-1 -right-1 text-[9px] font-bold bg-stone-200 text-stone-500 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          {hotkey}
        </span>
      )}
    </button>
  )
}

// Divider between tool groups
function ToolDivider() {
  return <div className="w-px h-8 bg-stone-200 mx-1" />
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
  isSyncing,
  lastSyncedAt
}) {
  const interactionMode = useCanvasStore((state) => state.interactionMode)
  const setInteractionMode = useCanvasStore((state) => state.setInteractionMode)

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center gap-1 px-3 py-2 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-stone-200/50">
        
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5 pr-2">
          <ToolButton
            onClick={onUndo}
            title="Undo"
            hotkey="⌘Z"
            variant="panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={!canUndo ? 'opacity-30' : ''}>
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </ToolButton>
          <ToolButton
            onClick={onRedo}
            title="Redo"
            hotkey="⌘⇧Z"
            variant="panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={!canRedo ? 'opacity-30' : ''}>
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
            </svg>
          </ToolButton>
        </div>

        <ToolDivider />

        {/* Navigation Tools */}
        <div className="flex items-center gap-0.5">
          <ToolButton
            active={interactionMode === 'select'}
            onClick={() => setInteractionMode('select')}
            title="Select & Move"
            hotkey="V"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
              <path d="M13 13l6 6" />
            </svg>
          </ToolButton>
          <ToolButton
            active={interactionMode === 'pan'}
            onClick={() => setInteractionMode('pan')}
            title="Pan Canvas"
            hotkey="H"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
              <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
              <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
            </svg>
          </ToolButton>
        </div>

        <ToolDivider />

        {/* AI Generate Tool - The Star */}
        <ToolButton
          active={interactionMode === 'generate'}
          onClick={() => setInteractionMode('generate')}
          title="AI Generate"
          hotkey="G"
          variant="ai"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          </svg>
        </ToolButton>

        <ToolDivider />

        {/* Drawing Tools */}
        <div className="flex items-center gap-0.5">
          <ToolButton
            active={interactionMode === 'rectangle'}
            onClick={() => setInteractionMode('rectangle')}
            title="Rectangle"
            hotkey="R"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </ToolButton>
          <ToolButton
            active={interactionMode === 'arrow'}
            onClick={() => setInteractionMode('arrow')}
            title="Arrow"
            hotkey="A"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </ToolButton>
        </div>

        <ToolDivider />

        {/* Annotation Tools */}
        <div className="flex items-center gap-0.5">
          <ToolButton
            active={interactionMode === 'text'}
            onClick={() => setInteractionMode('text')}
            title="Text"
            hotkey="T"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
          </ToolButton>
          <ToolButton
            active={interactionMode === 'sticky'}
            onClick={() => setInteractionMode('sticky')}
            title="Sticky Note"
            hotkey="N"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
              <path d="M15 3v6h6" />
            </svg>
          </ToolButton>
        </div>

        <ToolDivider />

        {/* Measurement Tool */}
        <ToolButton
          active={interactionMode === 'measure'}
          onClick={() => setInteractionMode('measure')}
          title="Measure"
          hotkey="M"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4Z" />
            <path d="m7.5 10.5 2 2" />
            <path d="m10.5 7.5 2 2" />
            <path d="m13.5 4.5 2 2" />
            <path d="m4.5 13.5 2 2" />
          </svg>
        </ToolButton>

        <ToolDivider />

        {/* Upload & Actions */}
        <div className="flex items-center gap-0.5">
          <ToolButton
            onClick={onUpload}
            title="Upload Image"
            variant="panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </ToolButton>
          
          {hasItems && (
            <ToolButton
              onClick={onExport}
              title="Export"
              variant="panel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </ToolButton>
          )}
        </div>

        <ToolDivider />

        {/* Panel Toggles */}
        <div className="flex items-center gap-0.5">
          <ToolButton
            active={showAssetLibrary}
            onClick={onToggleAssetLibrary}
            title="Asset Library"
            variant="panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </ToolButton>
          
          {hasItems && (
            <ToolButton
              active={showLayersPanel}
              onClick={onToggleLayersPanel}
              title="Layers"
              variant="panel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2 2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </ToolButton>
          )}
        </div>

        {/* Sync Status */}
        {isSyncing && (
          <>
            <ToolDivider />
            <div className="flex items-center gap-2 px-2">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-xs text-stone-400">Saving...</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

